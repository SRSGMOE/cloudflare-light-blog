// ==================== MCP Server（Streamable HTTP / JSON-RPC 2.0）====================

import { json, generateSlug, generateExcerpt } from './lib/utils.js';
import { uploadImage } from './lib/image.js';
import { getAgentKeyFromRequest, findAgentKey, hasPerm } from './lib/agent-auth.js';
import { checkRateLimit } from './api.js';

const MCP_VERSION = '2024-11-05';
const SERVER_NAME = 'cloudflare-light-blog';
const SERVER_VERSION = '1.3.1';

// 只读工具 / 写工具
const READ_TOOLS = ['list_posts', 'get_post', 'list_categories'];
const WRITE_TOOLS = ['create_post', 'update_post', 'publish_post', 'delete_post', 'upload_image'];

// 审计日志保留条数（超出后删除最旧记录，避免表无限增长）
const AGENT_LOGS_MAX = 500;

// 工具定义（JSON Schema，供 MCP 客户端展示参数）
const TOOLS = [
  {
    name: 'list_posts',
    description: '列出文章（不含回收站），返回 id/状态/标题/分类',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_post',
    description: '获取单篇文章的完整内容',
    inputSchema: { type: 'object', properties: { id: { type: 'integer', description: '文章 ID' } }, required: ['id'] }
  },
  {
    name: 'create_post',
    description: '新建文章',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '标题' },
        content: { type: 'string', description: 'Markdown 内容' },
        category: { type: 'string', description: '分类（可选）' },
        tags: { type: 'string', description: '标签，英文逗号分隔（可选）' },
        excerpt: { type: 'string', description: '摘要（可选）' },
        cover_image: { type: 'string', description: '封面图 URL 或 data:URI（可选）' },
        status: { type: 'string', enum: ['draft', 'published'], description: '状态，默认 draft' }
      },
      required: ['title', 'content']
    }
  },
  {
    name: 'update_post',
    description: '修改文章（仅更新传入的字段）',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: '文章 ID' },
        title: { type: 'string' },
        content: { type: 'string' },
        category: { type: 'string' },
        tags: { type: 'string' },
        excerpt: { type: 'string' },
        cover_image: { type: 'string' },
        status: { type: 'string', enum: ['draft', 'published'] }
      },
      required: ['id']
    }
  },
  {
    name: 'publish_post',
    description: '将文章发布（status 改为 published）',
    inputSchema: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] }
  },
  {
    name: 'delete_post',
    description: '将文章移入回收站',
    inputSchema: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] }
  },
  {
    name: 'list_categories',
    description: '列出文章分类',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'upload_image',
    description: '上传图片（base64 或 data URI），返回图片 URL',
    inputSchema: {
      type: 'object',
      properties: {
        base64: { type: 'string', description: 'base64 内容（可含 data: 前缀）' },
        mime: { type: 'string', description: 'MIME 类型，如 image/png（可选）' }
      },
      required: ['base64']
    }
  }
];

// JSON-RPC 响应
function rpcOk(id, result) {
  return json({ jsonrpc: '2.0', id, result });
}
function rpcErr(id, code, message) {
  return json({ jsonrpc: '2.0', id, error: { code, message } });
}

/**
 * MCP 请求入口（挂到 /mcp 路由）
 */
export async function handleMcpRequest(request, env, settings) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Agent-Key'
  };
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  // MCP 功能开关：未开启时拒绝访问
  if (!settings || settings.enable_mcp !== '1') {
    return new Response('MCP service disabled', { status: 403, headers: { ...cors, 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: cors });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response('Invalid JSON', { status: 400, headers: cors });
  }

  const { id, method, params } = body;
  if (!method) {
    return new Response('Invalid Request', { status: 400, headers: cors });
  }

  let response;
  switch (method) {
    case 'initialize':
      response = rpcOk(id, {
        protocolVersion: MCP_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION }
      });
      break;
    case 'notifications/initialized':
      // 通知无需响应
      return new Response(null, { status: 202, headers: cors });
    case 'tools/list':
      response = rpcOk(id, { tools: TOOLS });
      break;
    case 'tools/call':
      response = await handleToolCall(id, params, request, env);
      break;
    case 'ping':
      response = rpcOk(id, {});
      break;
    default:
      response = rpcErr(id, -32601, 'Method not found: ' + method);
  }

  Object.entries(cors).forEach(([k, v]) => response.headers.set(k, v));
  return response;
}

/**
 * 处理 tools/call：鉴权 → 权限校验 → 执行 → 审计
 */
async function handleToolCall(id, params, request, env) {
  const name = params && params.name;
  const args = (params && params.arguments) || {};
  if (!name) return rpcErr(id, -32602, '缺少工具名');

  const keyValue = getAgentKeyFromRequest(request);
  const keyRow = await findAgentKey(env, keyValue);
  if (!keyRow) return rpcErr(id, -32001, '未授权：缺少或无效的 Agent Key');

  const required = WRITE_TOOLS.includes(name) ? 'write' : 'read';
  if (!hasPerm(keyRow, required)) {
    return rpcErr(id, -32003, '该 Key 没有「' + (required === 'write' ? '写' : '读') + '」权限');
  }

  // 速率限制（折中）：读 300 次/小时，写 60 次/小时，按 key 维度
  const isWrite = WRITE_TOOLS.includes(name);
  const rateKey = 'mcp_rate_' + keyRow.id + '_' + (isWrite ? 'write' : 'read');
  if (!await checkRateLimit(env, rateKey, isWrite ? 60 : 300, 60 * 60 * 1000)) {
    return rpcErr(id, -32029, '请求过于频繁，请稍后再试');
  }

  try {
    const resultText = await executeTool(name, args, env);
    if (WRITE_TOOLS.includes(name)) {
      await logAgent(env, keyRow.id, name, args, resultText);
    }
    return rpcOk(id, { content: [{ type: 'text', text: resultText }], isError: false });
  } catch (e) {
    return rpcOk(id, { content: [{ type: 'text', text: '错误：' + (e.message || '执行失败') }], isError: true });
  }
}

/**
 * 执行工具（直接操作 D1 / R2，与后台管理逻辑等价）
 */
async function executeTool(name, args, env) {
  switch (name) {
    case 'list_posts': {
      const rows = (await env.DB.prepare(
        "SELECT id, title, status, category, published_at FROM posts WHERE status != 'trash' ORDER BY created_at DESC LIMIT 50"
      ).all()).results || [];
      if (rows.length === 0) return '暂无文章';
      return '文章列表（共 ' + rows.length + ' 篇）：\n' +
        rows.map((p) => '#' + p.id + ' [' + p.status + '] ' + p.title + '（分类：' + (p.category || '-') + '）').join('\n');
    }
    case 'get_post': {
      if (!args.id) throw new Error('缺少 id');
      const p = await env.DB.prepare(
        'SELECT id, title, slug, content, excerpt, cover_image, category, tags, status, created_at, updated_at, published_at FROM posts WHERE id=?'
      ).bind(args.id).first();
      if (!p) throw new Error('文章不存在');
      return JSON.stringify(p, null, 2);
    }
    case 'create_post': {
      if (!args.title || !String(args.title).trim()) throw new Error('标题不能为空');
      if (!args.content || !String(args.content).trim()) throw new Error('内容不能为空');
      const slug = generateSlug(args.title) + '-' + Math.random().toString(36).substring(2, 7);
      let cover = args.cover_image || '';
      if (cover && cover.startsWith('data:')) cover = await uploadImage(env, cover, slug);
      const now = new Date().toISOString();
      const status = args.status === 'published' ? 'published' : 'draft';
      const published_at = args.published_at ? new Date(args.published_at).toISOString() : now;
      const r = await env.DB.prepare(
        'INSERT INTO posts (title, slug, content, excerpt, cover_image, category, tags, status, password, created_at, updated_at, published_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
      ).bind(
        args.title,
        slug,
        args.content,
        args.excerpt || generateExcerpt(args.content, 200),
        cover,
        args.category || '未分类',
        args.tags || '',
        status,
        '',
        now,
        now,
        published_at
      ).run();
      return '创建成功，文章 ID：' + (r.meta && r.meta.last_row_id);
    }
    case 'update_post': {
      if (!args.id) throw new Error('缺少 id');
      const existing = await env.DB.prepare('SELECT * FROM posts WHERE id=?').bind(args.id).first();
      if (!existing) throw new Error('文章不存在');
      const title = args.title !== undefined ? args.title : existing.title;
      const content = args.content !== undefined ? args.content : existing.content;
      const category = args.category !== undefined ? args.category : existing.category;
      const tags = args.tags !== undefined ? args.tags : existing.tags;
      const status = args.status !== undefined ? args.status : existing.status;
      const excerpt = args.excerpt !== undefined ? args.excerpt : generateExcerpt(content, 200);
      let cover = args.cover_image !== undefined ? args.cover_image : existing.cover_image;
      if (cover && cover.startsWith('data:')) cover = await uploadImage(env, cover, String(args.id));
      const now = new Date().toISOString();
      await env.DB.prepare(
        'UPDATE posts SET title=?, content=?, excerpt=?, cover_image=?, category=?, tags=?, status=?, updated_at=? WHERE id=?'
      ).bind(title, content, excerpt, cover, category, tags, status, now, args.id).run();
      return '更新成功，文章 ID：' + args.id;
    }
    case 'publish_post': {
      if (!args.id) throw new Error('缺少 id');
      const r = await env.DB.prepare("UPDATE posts SET status='published', updated_at=? WHERE id=?").bind(new Date().toISOString(), args.id).run();
      if (!(r.meta && r.meta.changes)) throw new Error('文章不存在或状态未变更');
      return '已发布，文章 ID：' + args.id;
    }
    case 'delete_post': {
      if (!args.id) throw new Error('缺少 id');
      await env.DB.prepare("UPDATE posts SET status='trash' WHERE id=?").bind(args.id).run();
      return '已移入回收站，文章 ID：' + args.id;
    }
    case 'list_categories': {
      const rows = (await env.DB.prepare('SELECT id, name, slug FROM categories ORDER BY id').all()).results || [];
      if (rows.length === 0) return '暂无分类';
      return '分类列表（共 ' + rows.length + ' 个）：\n' + rows.map((c) => '#' + c.id + ' ' + c.name + '（slug: ' + c.slug + '）').join('\n');
    }
    case 'upload_image': {
      if (!args.base64) throw new Error('缺少 base64 数据');
      const raw = args.base64.startsWith('data:') ? args.base64.split(',')[1] : args.base64;
      const approxBytes = Math.floor(raw.length * 3 / 4);
      if (approxBytes > 2 * 1024 * 1024) throw new Error('图片大小不能超过 2MB');
      const dataUri = args.base64.startsWith('data:') ? args.base64 : ('data:' + (args.mime || 'image/png') + ';base64,' + args.base64);
      const url = await uploadImage(env, dataUri, 'mcp');
      if (!url) throw new Error('未配置 R2 存储桶或上传失败');
      return '上传成功：' + url;
    }
    default:
      throw new Error('未知工具：' + name);
  }
}

/**
 * 写操作审计
 */
async function logAgent(env, keyId, tool, args, result) {
  try {
    await env.DB.prepare('INSERT INTO agent_logs (key_id, tool, args, result, created_at) VALUES (?,?,?,?,?)')
      .bind(keyId, tool, String(JSON.stringify(args)).substring(0, 1000), String(result).substring(0, 1000), new Date().toISOString()).run();
    // 轮转清理：仅保留最近 AGENT_LOGS_MAX 条
    await env.DB.prepare(
      'DELETE FROM agent_logs WHERE id NOT IN (SELECT id FROM agent_logs ORDER BY id DESC LIMIT ?)'
    ).bind(AGENT_LOGS_MAX).run();
  } catch (e) {
    console.error('[MCP] 审计记录失败:', e.message || 'Error');
  }
}
