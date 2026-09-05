// ==================== API 处理模块（分页 + 错误处理）====================

import { json, errorResponse, generateSlug, generateExcerpt, deriveHMACKey, escapeHtml } from './lib/utils.js';
import { generateToken, authenticateRequest, hashPassword, verifyPasswordHash } from './lib/auth.js';
import { getSettings, saveSettings } from './lib/db.js';
import { handleUpload, listImages } from './lib/image.js';
import { generateAgentKey } from './lib/agent-auth.js';
import { purgeCache, withCache } from './lib/cache.js';

// ==================== 常量 ====================
const RATE_MAX_5 = 5;                    // 最大尝试次数
const RATE_WINDOW_10M = 10 * 60 * 1000;  // 10分钟窗口
const RATE_WINDOW_1H = 60 * 60 * 1000;   // 1小时窗口
const COOKIE_MAX_AGE = 86400;            // Cookie 有效期 24小时（秒）

// ADMIN_PASSWORD 哈希缓存（避免每次登录重复 PBKDF2 派生）
let adminPasswordHashCache = null;
async function getAdminPasswordHash(env) {
  if (!adminPasswordHashCache) {
    adminPasswordHashCache = await hashPassword(env.ADMIN_PASSWORD);
  }
  return adminPasswordHashCache;
}

/**
 * 写操作后清除前台相关缓存（首页 HTML + 聚合接口 + 各公开接口）
 */
async function purgePublicCaches(request) {
  const origin = new URL(request.url).origin;
  await Promise.all([
    purgeCache(origin + '/'),
    purgeCache(origin + '/api/page-meta'),
    purgeCache(origin + '/api/posts?page=1&limit=10'),
    purgeCache(origin + '/api/stats'),
    purgeCache(origin + '/api/categories'),
    purgeCache(origin + '/api/links'),
    purgeCache(origin + '/api/tags')
  ]);
}

// ==================== 公共函数 ====================

/**
 * 速率限制：检查并记录（合并为单次操作减少竞态窗口）
 * @returns {boolean} true=允许, false=超限
 */
export async function checkRateLimit(env, key, maxAttempts, windowMs) {
  try {
    const now = Date.now();
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key=?").bind(key).first();
    let attempts = [];
    if (row) { try { attempts = JSON.parse(row.value); } catch (e) {} }
    // 清理过期记录
    attempts = attempts.filter(t => now - t < windowMs);
    if (attempts.length >= maxAttempts) return false;
    // 记录本次尝试
    attempts.push(now);
    await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").bind(key, JSON.stringify(attempts)).run();
    return true;
  } catch (e) { console.error('[RateLimit]', e.message || 'Error'); return true; }
}

/**
 * 清除速率限制记录
 */
async function clearRateLimit(env, key) {
  try { await env.DB.prepare("DELETE FROM settings WHERE key=?").bind(key).run(); } catch (e) {}
}



/**
 * 生成站点认证 Cookie
 */
async function generateSiteAuthCookie(password) {
  const timestamp = Date.now();
  const key = await deriveHMACKey(password, 'site-auth');
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('site_auth:' + timestamp));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return timestamp + '.' + sigHex;
}

/**
 * 生成文章认证 Cookie
 */
async function generatePostAuthCookie(postId, passwordHash) {
  const timestamp = Date.now();
  const encoder = new TextEncoder();
  const key = await deriveHMACKey(passwordHash, 'post-auth-' + postId);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode('post_auth:' + timestamp));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return timestamp + '.' + sigHex;
}

/**
 * 处理所有 API 请求
 */
export async function handleAPI(request, env, path) {
  const method = request.method;

  try {
    // ========== 文章密码认证（5次/1小时限制）==========
    if (path === '/api/post-auth' && method === 'POST') {
      try {
        const body = await request.json();
        const { postId, password } = body;
        if (!postId || !password) return json({ success: false, error: '参数错误' }, 400);
        if (!Number.isFinite(Number(postId))) return json({ success: false, error: '参数错误' }, 400);

        const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
        const rateKey = 'post_auth_rate_' + clientIP + '_' + postId;
        if (!await checkRateLimit(env, rateKey, RATE_MAX_5, RATE_WINDOW_1H)) {
          return json({ success: false, error: '密码错误次数过多，请 1 小时后再试' }, 429);
        }

        const post = await env.DB.prepare("SELECT password FROM posts WHERE id=? AND status IN ('published','publish')").bind(postId).first();
        if (!post) return json({ success: false, error: '文章不存在' }, 404);
        if (await verifyPasswordHash(password, post.password)) {
          await clearRateLimit(env, rateKey);
          const cookieValue = await generatePostAuthCookie(postId, post.password);
          const resp = json({ success: true });
          resp.headers.set('Set-Cookie', 'post_auth_' + postId + '=' + cookieValue + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + COOKIE_MAX_AGE);
          return resp;
        }
        return json({ success: false, error: '密码错误' }, 401);
      } catch (e) {
        return json({ success: false, error: '认证失败' }, 500);
      }
    }

    // ========== 全站密码认证（5次/1小时限制）==========
    if (path === '/api/site-auth' && method === 'POST') {
      try {
        const body = await request.json();
        const settings = await getSettings(env);
        if (!settings.site_password) {
          return json({ success: true, message: '未设置全站密码' });
        }

        // 速率限制检查（5次/1小时）
        const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
        const rateKey = 'site_auth_rate_' + clientIP;
        if (!await checkRateLimit(env, rateKey, RATE_MAX_5, RATE_WINDOW_1H)) {
          return json({ success: false, error: '密码错误次数过多，请 1 小时后再试' }, 429);
        }

        // 使用哈希验证密码
        if (await verifyPasswordHash(body.password, settings.site_password)) {
          await clearRateLimit(env, rateKey);
          const cookieValue = await generateSiteAuthCookie(settings.site_password);
          const resp = json({ success: true });
          resp.headers.set('Set-Cookie', 'site_auth=' + cookieValue + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + COOKIE_MAX_AGE);
          return resp;
        }
        // 记录失败尝试
        return json({ success: false, error: '密码错误' }, 401);
      } catch (e) {
        console.error((e.message || 'Error').substring(0, 100));
        return json({ success: false, error: '认证失败' }, 500);
      }
    }

    // ========== 登录接口 ==========
    if (path === '/api/login' && method === 'POST') {
      const body = await request.json();
      if (!env.ADMIN_PASSWORD) {
        return json({ success: false, error: '未配置管理员密码（ADMIN_PASSWORD），请先在 Cloudflare 后台设置后再登录' }, 503);
      }

      // 速率限制（5次/10分钟）
      const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
      const rateKey = 'login_rate_' + clientIP;
      if (!await checkRateLimit(env, rateKey, RATE_MAX_5, RATE_WINDOW_10M)) {
        return json({ success: false, error: '登录尝试次数过多，请 10 分钟后再试' }, 429);
      }

      // 验证账号
      if (env.ADMIN_USERNAME && body.username !== env.ADMIN_USERNAME) {
        return json({ success: false, error: '账号错误' }, 401);
      }

      if (body.password && await verifyPasswordHash(body.password, await getAdminPasswordHash(env))) {
        await clearRateLimit(env, rateKey);
        const token = await generateToken(env.ADMIN_PASSWORD);
        return json({ success: true, token });
      }

      return json({ success: false, error: '密码错误' }, 401);
    }

    // ========== 健康检查 ==========
  if (path === '/api/health' && method === 'GET') {
    try {
      await env.DB.prepare("SELECT 1").first();
      return json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
    } catch (e) {
      return json({ status: 'error', db: 'disconnected', timestamp: new Date().toISOString() }, 503);
    }
  }

  // ========== Sitemap ==========
    if (path === '/sitemap.xml' && method === 'GET') {
      return handleSitemap(request, env);
    }
    if (path === '/rss.xml' && method === 'GET') {
      return handleRSS(request, env);
    }

    // ========== 公开 API（不需要认证）==========
    if (path === '/api/posts' && method === 'GET') {
      // 仅缓存首页列表（第 1 页、无分类/标签筛选），60 秒
      const url = new URL(request.url);
      const page = url.searchParams.get('page') || '1';
      if (page === '1' && !url.searchParams.get('category') && !url.searchParams.get('tag')) {
        return withCache(request, () => handleGetPosts(request, env), 60, true);
      }
      return handleGetPosts(request, env);
    }
    if (path === '/api/page-meta' && method === 'GET') {
      return withCache(request, () => handleGetPageMeta(env), 60);
    }
    if (path === '/api/categories' && method === 'GET') {
      return withCache(request, () => handleGetCategories(env), 60);
    }
    if (path === '/api/settings' && method === 'GET') {
      return handleGetSettings(env);
    }
    if (path === '/api/proxy-css' && method === 'GET') {
      return handleProxyCss(request);
    }
    if (path === '/api/stats' && method === 'GET') {
      return withCache(request, () => handleGetStats(env), 60);
    }
    if (path === '/api/links' && method === 'GET') {
      return withCache(request, () => handleGetLinks(env), 60);
    }
    if (path === '/api/related-posts' && method === 'GET') {
      return withCache(request, () => handleGetRelatedPosts(request, env), 60, true);
    }
    if (path === '/api/tags' && method === 'GET') {
      return withCache(request, () => handleGetTags(env), 60);
    }

    // ========== 认证检查（以下 API 需要管理员权限）==========
    const isAuthed = await authenticateRequest(request, env);
    if (!isAuthed) {
      return errorResponse('未授权', 401);
    }

    // ========== 管理 API ==========
    if (path === '/api/upload' && method === 'POST') {
      return handleUploadAPI(request, env);
    }
    if (path === '/api/admin/posts' && method === 'GET') {
      return handleAdminGetPosts(env);
    }
    if (path === '/api/admin/settings' && method === 'GET') {
      return handleAdminGetSettings(env);
    }
    if (path === '/api/admin/post' && method === 'POST') {
      return handleCreatePost(request, env);
    }
    if (path === '/api/admin/post' && method === 'PUT') {
      return handleUpdatePost(request, env);
    }
    if (path === '/api/admin/post' && method === 'DELETE') {
      return handleDeletePost(request, env);
    }
    if (path === '/api/admin/trash' && method === 'GET') {
      return handleGetTrash(env);
    }
    if (path === '/api/admin/restore' && method === 'POST') {
      return handleRestorePost(request, env);
    }
    if (path === '/api/admin/permanent-delete' && method === 'POST') {
      return handlePermanentDelete(request, env);
    }
    if (path === '/api/admin/import-wordpress' && method === 'POST') {
      return handleImportWordPress(request, env);
    }

    // 分类管理
    if (path === '/api/category' && method === 'POST') {
      return handleSaveCategory(request, env);
    }
    if (path.startsWith('/api/category') && method === 'DELETE') {
      return handleDeleteCategory(request, env);
    }

    // 设置管理
    if (path === '/api/settings' && method === 'POST') {
      return handleSaveSettings(request, env);
    }

    // 删除图片
    if (path === '/api/delete-image' && method === 'POST') {
      return handleDeleteImage(request, env);
    }

    // 图片管理（列表：含文章封面图；删除：按 key 删除存储桶对象）
    if (path === '/api/admin/images' && method === 'GET') {
      return handleListImagesAdmin(request, env);
    }
    if (path === '/api/admin/images' && method === 'DELETE') {
      return handleDeleteImageAdmin(request, env);
    }

    // Agent 密钥管理（MCP 接入）
    if (path === '/api/admin/agent-keys' && method === 'GET') {
      return handleListAgentKeys(env);
    }
    if (path === '/api/admin/agent-keys' && method === 'POST') {
      return handleCreateAgentKey(request, env);
    }
    if (path === '/api/admin/agent-keys/reset' && method === 'POST') {
      return handleResetAgentKey(request, env);
    }
    if (path === '/api/admin/agent-keys' && method === 'DELETE') {
      return handleRevokeAgentKey(request, env);
    }

    return errorResponse('未找到接口', 404);
  } catch (e) {
    return errorResponse('服务器错误', 500, e);
  }
}

// ==================== 公开 API 实现 ====================

/**
 * 获取文章列表（支持分页 + 分类筛选）
 */
async function handleGetPosts(request, env) {
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit')) || 10));
  const offset = (page - 1) * limit;

  let where = "WHERE status IN ('published','publish')";
  const params = [];

  if (category) {
    const catResult = await env.DB.prepare(
      "SELECT name FROM categories WHERE slug=?"
    ).bind(category).first();
    const catName = catResult ? catResult.name : category;
    where += " AND category=?";
    params.push(catName);
  }

  // 获取总数
  const countResult = await env.DB.prepare(
    `SELECT COUNT(*) as total FROM posts ${where}`
  ).bind(...params).first();
  const total = countResult?.total || 0;

  // 获取分页数据（密码哈希不对外返回，受保护文章的摘要也不对外泄露）
  const { results } = await env.DB.prepare(
    `SELECT id, title, slug, excerpt, cover_image, category, tags, created_at, published_at, password FROM posts ${where} ORDER BY published_at DESC LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();
  const data = (results || []).map(p => {
    const { password, ...rest } = p;
    if (password) rest.excerpt = '';
    rest.has_password = password ? 1 : 0;
    return rest;
  });

  // 获取置顶文章 ID
  const pinnedSetting = await env.DB.prepare(
    "SELECT value FROM settings WHERE key='pinned_post_id'"
  ).first();
  const pinned_post_id = pinnedSetting?.value || '';

  const resp = json({
    data,
    pinned_post_id,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
  resp.headers.set('Cache-Control', 'public, max-age=60');
  return resp;
}

/**
 * 获取分类列表（数据层）
 */
async function getCategoriesData(env) {
  const { results } = await env.DB.prepare("SELECT * FROM categories ORDER BY name").all();
  return results || [];
}

/**
 * 获取分类列表
 */
async function handleGetCategories(env) {
  return json(await getCategoriesData(env));
}

/**
 * 获取网站设置（公开接口，仅返回前台展示所需字段，不泄露密码哈希等敏感配置）
 */
const PUBLIC_SETTING_KEYS = [
  'site_name', 'site_description', 'site_bio', 'site_author', 'site_footer',
  'site_links', 'links_title', 'site_created_at', 'site_theme',
  'enable_tag_cloud', 'profile_position', 'tag_cloud_position', 'pinned_post_id',
  'copyright_notice', 'ad_content', 'ad_position', 'iconfont_css', 'custom_js'
];

async function handleGetSettings(env) {
  const settings = await getSettings(env);
  const publicSettings = {};
  for (const key of PUBLIC_SETTING_KEYS) {
    if (settings[key] !== undefined) publicSettings[key] = settings[key];
  }
  return json(publicSettings);
}

/**
 * 获取完整设置（管理端，需鉴权；密码哈希不回传，仅告知是否已设置）
 */
async function handleAdminGetSettings(env) {
  const settings = await getSettings(env);
  settings.site_password_set = settings.site_password ? '1' : '0';
  settings.site_password = '';
  return json(settings);
}

/**
 * 代理获取 iconfont 资源（CSS/JS，解决跨域问题；仅允许 iconfont.cn 官方域名，防止被当作开放代理）
 */
async function handleProxyCss(request) {
  try {
    const url = new URL(request.url);
    const cssUrl = url.searchParams.get('url');
    if (!cssUrl) {
      return json({ error: '缺少 url 参数' }, 400);
    }
    const fullUrl = cssUrl.startsWith('//') ? 'https:' + cssUrl : cssUrl;
    let target;
    try { target = new URL(fullUrl); } catch { return json({ error: '无效的 url' }, 400); }
    if (target.protocol !== 'https:' || target.hostname !== 'at.alicdn.com') {
      return json({ error: '仅支持 iconfont.cn（at.alicdn.com）资源' }, 403);
    }
    const resp = await fetch(target.href);
    const cssText = await resp.text();
    const contentType = fullUrl.split('?')[0].endsWith('.js') ? 'application/javascript; charset=utf-8' : 'text/css; charset=utf-8';
    return new Response(cssText, {
      headers: { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e) {
    return json({ error: '获取失败: ' + e.message }, 500);
  }
}

/**
 * 获取统计信息（数据层）
 */
async function getStatsData(env) {
  const [postCount, catCount, tagCount] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) as cnt FROM posts WHERE status IN ('published','publish')").first(),
    env.DB.prepare("SELECT COUNT(*) as cnt FROM categories").first(),
    env.DB.prepare("SELECT tags FROM posts WHERE status IN ('published','publish') AND tags IS NOT NULL AND tags != ''").all()
  ]);

  const tagSet = new Set();
  if (tagCount.results) {
    tagCount.results.forEach(r => {
      if (r.tags) r.tags.split(',').forEach(t => { const s = t.trim(); if (s) tagSet.add(s); });
    });
  }

  return {
    postCount: postCount?.cnt ?? 0,
    catCount: catCount?.cnt ?? 0,
    tagCount: tagSet.size
  };
}

/**
 * 获取统计信息
 */
async function handleGetStats(env) {
  return json(await getStatsData(env));
}

/**
 * 获取友链列表（数据层）
 */
async function getLinksData(env) {
  const links = await env.DB.prepare("SELECT value FROM settings WHERE key='site_links'").first();
  const linksData = links?.value || '';
  if (!linksData) return [];

  return linksData.split('\n').reduce((acc, line) => {
    const idx = line.indexOf(',');
    if (idx > 0) {
      const name = line.substring(0, idx).trim();
      let url = line.substring(idx + 1).trim();
      if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      if (name && url) acc.push({ name, url });
    }
    return acc;
  }, []);
}

/**
 * 获取友链列表
 */
async function handleGetLinks(env) {
  return json(await getLinksData(env));
}

/**
 * 获取相关文章（相同标签，随机显示，最多4篇）
 */
async function handleGetRelatedPosts(request, env) {
  const url = new URL(request.url);
  const postId = url.searchParams.get('id');
  const tags = url.searchParams.get('tags');
  
  if (!postId || !tags) return json([]);

  const tagList = tags.split(',').map(t => t.trim()).filter(t => t);
  if (tagList.length === 0) return json([]);

  // 构建查询条件：匹配任意标签
  const conditions = tagList.map(() => "tags LIKE ?").join(' OR ');
  const params = tagList.map(t => `%${t}%`);

  try {
    // 受密码保护的文章不参与相关推荐，且不选 excerpt 避免内容泄露
    const { results } = await env.DB.prepare(
      `SELECT id, title, cover_image, category, tags, created_at
       FROM posts
       WHERE status IN ('published','publish') AND id != ? AND (password IS NULL OR password='') AND (${conditions})
       ORDER BY RANDOM()
       LIMIT 4`
    ).bind(postId, ...params).all();

    return json(results || []);
  } catch (e) {
    console.error('[API] 获取相关文章失败:', e);
    return json([]);
  }
}

/**
 * 图片上传
 */
async function handleUploadAPI(request, env) {
  const result = await handleUpload(request, env);
  if (result.error) {
    return json({ error: result.error }, result.status || 500);
  }
  return json(result);
}

/**
 * 生成 Sitemap
 */
async function handleSitemap(request, env) {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  const [postsResult, categoriesResult] = await Promise.all([
    env.DB.prepare("SELECT id, created_at, published_at, updated_at FROM posts WHERE status IN ('published','publish') ORDER BY updated_at DESC").all(),
    env.DB.prepare("SELECT slug, name FROM categories").all()
  ]);

  // 文章页
  const postUrls = (postsResult.results || []).map(p => {
    return `  <url>
    <loc>${baseUrl}/post/${p.id}</loc>
    <lastmod>${p.updated_at}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }).join('\n');

  // 分类页
  const catUrls = (categoriesResult.results || []).map(c => {
    return `  <url>
    <loc>${baseUrl}/?category=${encodeURIComponent(c.slug)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
  }).join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${postUrls}
${catUrls}
</urlset>`;

  return new Response(sitemap, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' }
  });
}

/**
 * 生成 RSS Feed
 */
async function handleRSS(request, env) {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const settings = await getSettings(env);
  const siteName = settings.site_name || '我的博客';
  const siteDesc = settings.site_description || '';

  const { results } = await env.DB.prepare(
    "SELECT id, title, excerpt, content, created_at, published_at, updated_at, cover_image FROM posts WHERE status IN ('published','publish') ORDER BY published_at DESC LIMIT 20"
  ).all();

  const items = (results || []).map(p => {
    const link = `${baseUrl}/post/${p.id}`;
    const desc = p.excerpt || generateExcerpt(p.content, 200);
    return `  <item>
    <title>${escapeHtml(p.title)}</title>
    <link>${link}</link>
    <guid isPermaLink="true">${link}</guid>
    <description>${escapeHtml(desc)}</description>
    <pubDate>${new Date(p.published_at || p.created_at).toUTCString()}</pubDate>
  </item>`;
  }).join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeHtml(siteName)}</title>
    <link>${baseUrl}</link>
    <description>${escapeHtml(siteDesc)}</description>
    <language>zh-CN</language>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' }
  });
}

// ==================== 管理 API 实现 ====================

async function handleAdminGetPosts(env) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM posts WHERE status != 'trash' ORDER BY created_at DESC"
  ).all();
  // 密码哈希不回传前端，仅告知是否已设置（避免回填后二次哈希）
  const data = (results || []).map(p => {
    const { password, ...rest } = p;
    rest.has_password = password ? 1 : 0;
    return rest;
  });
  return json(data);
}

async function handleCreatePost(request, env) {
  const body = await request.json();
  if (!body.title || !body.title.trim()) return errorResponse('标题不能为空', 400);
  if (!body.content || !body.content.trim()) return errorResponse('内容不能为空', 400);
  const slug = body.slug || generateSlug(body.title);

  let coverImage = body.cover_image;
  if (coverImage && coverImage.startsWith('data:')) {
    const { uploadImage } = await import('./lib/image.js');
    coverImage = await uploadImage(env, coverImage, slug);
  }

  const now = new Date().toISOString();
  const published_at = body.published_at ? new Date(body.published_at).toISOString() : now;

  const result = await env.DB.prepare(`
    INSERT INTO posts (title, slug, content, excerpt, cover_image, category, tags, status, password, created_at, updated_at, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    body.title,
    slug,
    body.content,
    body.excerpt || generateExcerpt(body.content, 200),
    coverImage || '',
    body.category || '未分类',
    body.tags || '',
    body.status || 'draft',
    body.password ? await hashPassword(body.password) : '',
    now,
    now,
    published_at
  ).run();

  await purgePublicCaches(request);
  return json({ success: true, id: result.meta?.last_row_id });
}

async function handleUpdatePost(request, env) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return errorResponse('缺少 id', 400);

  const body = await request.json();
  if (!body.title || !body.title.trim()) return errorResponse('标题不能为空', 400);
  if (!body.content || !body.content.trim()) return errorResponse('内容不能为空', 400);
  let coverImage = body.cover_image;
  if (coverImage && coverImage.startsWith('data:')) {
    const { uploadImage } = await import('./lib/image.js');
    coverImage = await uploadImage(env, coverImage, id);
  }

  const now = new Date().toISOString();
  const published_at = body.published_at ? new Date(body.published_at).toISOString() : now;

  // password 字段未提交时保持原密码不变；提交空字符串表示清除；提交明文则重新哈希
  if (body.password === undefined) {
    await env.DB.prepare(`
      UPDATE posts SET title=?, content=?, excerpt=?, cover_image=?, category=?, tags=?, status=?, updated_at=?, published_at=? WHERE id=?
    `).bind(
      body.title,
      body.content,
      body.excerpt || generateExcerpt(body.content, 200),
      coverImage || '',
      body.category || '未分类',
      body.tags || '',
      body.status || 'draft',
      now,
      published_at,
      id
    ).run();
  } else {
    await env.DB.prepare(`
      UPDATE posts SET title=?, content=?, excerpt=?, cover_image=?, category=?, tags=?, status=?, password=?, updated_at=?, published_at=? WHERE id=?
    `).bind(
      body.title,
      body.content,
      body.excerpt || generateExcerpt(body.content, 200),
      coverImage || '',
      body.category || '未分类',
      body.tags || '',
      body.status || 'draft',
      body.password ? await hashPassword(body.password) : '',
      now,
      published_at,
      id
    ).run();
  }

  await purgePublicCaches(request);
  return json({ success: true });
}

async function handleDeletePost(request, env) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return errorResponse('缺少 id', 400);

  await env.DB.prepare("UPDATE posts SET status='trash' WHERE id=?").bind(id).run();
  await purgePublicCaches(request);
  return json({ success: true });
}

async function handleGetTrash(env) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM posts WHERE status='trash' ORDER BY created_at DESC"
  ).all();
  return json(results || []);
}

async function handleRestorePost(request, env) {
  const body = await request.json();
  if (!body.id) return errorResponse('缺少 id', 400);
  await env.DB.prepare("UPDATE posts SET status='draft' WHERE id=?").bind(body.id).run();
  await purgePublicCaches(request);
  return json({ success: true });
}

async function handlePermanentDelete(request, env) {
  const body = await request.json();
  if (!body.id) return errorResponse('缺少 id', 400);
  await env.DB.prepare("DELETE FROM posts WHERE id=? AND status='trash'").bind(body.id).run();
  await purgePublicCaches(request);
  return json({ success: true });
}

async function handleSaveCategory(request, env) {
  const body = await request.json();
  if (body.id) {
    await env.DB.prepare("UPDATE categories SET name=?, slug=?, description=? WHERE id=?")
      .bind(body.name, body.slug, body.description || '', body.id).run();
  } else {
    await env.DB.prepare("INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)")
      .bind(body.name, body.slug, body.description || '').run();
  }
  return json({ success: true });
}

async function handleDeleteCategory(request, env) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return errorResponse('缺少 id', 400);
  await env.DB.prepare("DELETE FROM categories WHERE id=?").bind(id).run();
  return json({ success: true });
}

// 允许写入的设置键名白名单（与 db.js defaultSettings 保持一致）
const SETTINGS_WHITELIST = [
  'site_name', 'site_description', 'site_bio', 'site_author', 'site_created_at',
  'site_footer', 'custom_js', 'iconfont_css', 'site_links', 'links_title',
  'site_theme', 'enable_tag_cloud', 'enable_post_toc', 'enable_mcp', 'profile_position', 'tag_cloud_position',
  'pinned_post_id', 'copyright_notice', 'ad_content', 'ad_position',
  'allow_robots', 'enable_compression', 'allowed_origins', 'site_password'
];

async function handleSaveSettings(request, env) {
  try {
    const body = await request.json();
    // 白名单过滤，只保留合法键
    const filtered = {};
    for (const key of SETTINGS_WHITELIST) {
      if (body[key] !== undefined) filtered[key] = body[key];
    }
    await saveSettings(env, filtered);
    // 清除前台相关缓存
    await purgePublicCaches(request);
    return json({ success: true });
  } catch (e) {
    console.error('[API] 保存设置失败:', e);
    return json({ success: false, error: '保存设置失败: ' + e.message }, 500);
  }
}

async function handleDeleteImage(request, env) {
  try {
    const body = await request.json();
    const { url } = body;
    
    if (!url || !url.startsWith('/images/')) {
      return json({ success: false, error: '无效的图片地址' }, 400);
    }
    
    if (!env.R2) {
      return json({ success: true, message: '未配置存储桶，仅清除引用' });
    }
    
    const filename = url.replace('/images/', '');
    const SAFE_FILENAME = /^[a-zA-Z0-9_-]{1,64}\.(jpg|jpeg|png|gif|webp|svg|ico|x-icon|avif|bmp|tiff)$/;
    if (!SAFE_FILENAME.test(filename)) {
      return json({ success: false, error: '无效的文件名' }, 400);
    }
    await env.R2.delete(filename);
    return json({ success: true, message: '图片已从存储桶删除' });
  } catch (e) {
    console.error('[API] 删除图片失败:', e);
    return json({ success: false, error: '删除图片失败: ' + e.message }, 500);
  }
}

/**
 * 图片管理：列出 R2 存储桶中的全部图片（含文章封面图）
 */
async function handleListImagesAdmin(request, env) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit')) || 50));
    const cursor = url.searchParams.get('cursor') || undefined;
    const { configured, images, cursor: nextCursor, hasMore } = await listImages(env, limit, cursor);
    return json({ configured, images, cursor: nextCursor || '', hasMore });
  } catch (e) {
    console.error('[API] 列出图片失败:', e);
    return json({ configured: false, images: [], error: '列出图片失败' }, 500);
  }
}

/**
 * 图片管理：按存储键删除图片（?key=文件名）
 */
async function handleDeleteImageAdmin(request, env) {
  try {
    const url = new URL(request.url);
    const key = (url.searchParams.get('key') || '').trim();
    if (!key) return json({ success: false, error: '缺少图片名称' }, 400);

    if (!env.R2) return json({ success: true, message: '未配置存储桶' });

    // 校验文件名（防止路径遍历 + 非法字符）
    const SAFE_FILENAME = /^[a-zA-Z0-9_-]{1,64}\.(jpg|jpeg|png|gif|webp|svg|ico|x-icon|avif|bmp|tiff)$/;
    if (!SAFE_FILENAME.test(key)) {
      return json({ success: false, error: '无效的文件名' }, 400);
    }

    await env.R2.delete(key);
    return json({ success: true, message: '图片已删除' });
  } catch (e) {
    console.error('[API] 删除图片失败:', e);
    return json({ success: false, error: '删除图片失败: ' + e.message }, 500);
  }
}

// ==================== Agent 密钥管理（MCP 接入） ====================

const AGENT_KEY_MAX = 2; // 最多 2 个密钥

async function handleListAgentKeys(env) {
  try {
    const { results } = await env.DB.prepare(
      'SELECT id, name, permissions, key, created_at FROM agent_keys ORDER BY id'
    ).all();
    return json(results || []);
  } catch (e) {
    console.error('[API] 列出密钥失败:', e);
    return json([], 500);
  }
}

async function handleCreateAgentKey(request, env) {
  try {
    const body = await request.json();
    const perms = Array.isArray(body.permissions)
      ? body.permissions.filter((p) => p === 'read' || p === 'write')
      : [];
    if (perms.length === 0) return json({ success: false, error: '请至少勾选一项权限（读/写）' }, 400);

    const count = await env.DB.prepare('SELECT COUNT(*) as cnt FROM agent_keys').first();
    if (count && count.cnt >= AGENT_KEY_MAX) {
      return json({ success: false, error: '最多只能生成 ' + AGENT_KEY_MAX + ' 个密钥' }, 400);
    }

    const key = generateAgentKey();
    const now = new Date().toISOString();
    const name = String(body.name || '').trim() || ('密钥 ' + ((count && count.cnt) + 1));
    const r = await env.DB.prepare('INSERT INTO agent_keys (name, permissions, key, created_at) VALUES (?,?,?,?)')
      .bind(name, perms.join(','), key, now).run();

    return json({ success: true, id: r.meta && r.meta.last_row_id, key });
  } catch (e) {
    console.error('[API] 生成密钥失败:', e);
    return json({ success: false, error: '生成密钥失败: ' + e.message }, 500);
  }
}

async function handleResetAgentKey(request, env) {
  try {
    const body = await request.json();
    if (!body.id) return json({ success: false, error: '缺少 id' }, 400);

    const existing = await env.DB.prepare('SELECT id FROM agent_keys WHERE id=?').bind(body.id).first();
    if (!existing) return json({ success: false, error: '密钥不存在' }, 404);

    const key = generateAgentKey();
    await env.DB.prepare('UPDATE agent_keys SET key=?, created_at=? WHERE id=?')
      .bind(key, new Date().toISOString(), body.id).run();
    return json({ success: true, id: body.id, key });
  } catch (e) {
    console.error('[API] 重置密钥失败:', e);
    return json({ success: false, error: '重置密钥失败: ' + e.message }, 500);
  }
}

async function handleRevokeAgentKey(request, env) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return json({ success: false, error: '缺少 id' }, 400);
    await env.DB.prepare('DELETE FROM agent_keys WHERE id=?').bind(id).run();
    return json({ success: true, message: '密钥已吊销' });
  } catch (e) {
    console.error('[API] 吊销密钥失败:', e);
    return json({ success: false, error: '吊销密钥失败: ' + e.message }, 500);
  }
}

/**
 * WXR 文本解码（CDATA / 基础 XML 实体）
 */
function decodeXmlText(raw) {
  if (!raw) return '';
  const v = raw.trim();
  const cdata = v.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
  if (cdata) return cdata[1];
  return v
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * 从 XML 片段中提取标签文本（支持带命名空间的标签名，如 wp:post_type）
 */
function extractXmlTag(block, tag) {
  const m = block.match(new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + tag + '>'));
  return m ? decodeXmlText(m[1]) : '';
}

/**
 * 导入 WordPress 文章（纯字符串解析；Workers 运行时无 DOMParser）
 */
async function handleImportWordPress(request, env) {
  try {
    const { xml } = await request.json();
    if (!xml) return json({ success: false, error: '缺少 XML 数据' }, 400);

    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    if (items.length === 0) {
      return json({ success: false, error: '未解析到文章条目，请确认是 WordPress 导出的 WXR 文件' }, 400);
    }

    let success = 0;
    let failed = 0;
    const errors = [];

    for (const item of items) {
      try {
        // 只导入文章类型
        const postType = extractXmlTag(item, 'wp:post_type');
        if (postType !== 'post') continue;

        const title = extractXmlTag(item, 'title');
        const content = extractXmlTag(item, 'content:encoded');
        const excerpt = extractXmlTag(item, 'excerpt:encoded');
        const wpStatus = extractXmlTag(item, 'wp:status') || 'draft';
        const wpPostName = extractXmlTag(item, 'wp:post_name');
        const wpPostDate = extractXmlTag(item, 'wp:post_date');

        // 获取分类与标签
        const categories = [];
        const tags = [];
        const catRegex = /<category([^>]*)>([\s\S]*?)<\/category>/g;
        let cm;
        while ((cm = catRegex.exec(item)) !== null) {
          const attrs = cm[1] || '';
          const name = decodeXmlText(cm[2]);
          if (!name) continue;
          if (attrs.includes('domain="category"')) categories.push(name);
          else if (attrs.includes('domain="post_tag"')) tags.push(name);
        }

        // 生成 slug（加随机后缀防冲突）
        let slug = wpPostName || generateSlug(title);
        slug = slug + '-' + Math.random().toString(36).substring(2, 7);

        // 确定状态
        const status = wpStatus === 'publish' ? 'published' : 'draft';

        // 处理日期
        const now = new Date().toISOString();
        let publishedAt = null;
        if (wpPostDate) {
          const parsed = new Date(wpPostDate.replace(' ', 'T'));
          if (!isNaN(parsed.getTime())) publishedAt = parsed.toISOString();
        }

        // 创建文章分类（如果不存在）
        for (const catName of categories) {
          const existingCat = await env.DB.prepare(
            "SELECT id FROM categories WHERE name=?"
          ).bind(catName).first();

          if (!existingCat) {
            const catSlug = generateSlug(catName);
            await env.DB.prepare(
              "INSERT INTO categories (name, slug, description) VALUES (?, ?, '')"
            ).bind(catName, catSlug).run();
          }
        }

        // 插入文章
        await env.DB.prepare(`
          INSERT INTO posts (title, slug, content, excerpt, category, tags, status, created_at, updated_at, published_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          title,
          slug,
          content,
          excerpt || generateExcerpt(content, 200),
          categories[0] || '未分类',
          tags.join(', '),
          status,
          publishedAt || now,
          now,
          publishedAt
        ).run();

        success++;
      } catch (e) {
        failed++;
        errors.push(e.message);
        console.error('[Import] 导入文章失败:', e);
      }
    }

    return json({
      success,
      failed,
      total: items.length,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined
    });
  } catch (e) {
    console.error('[API] 导入失败:', e);
    return json({ success: false, error: '导入失败: ' + e.message }, 500);
  }
}

/**
 * 获取标签列表（服务端聚合，避免前端请求全部文章）
 */
async function getTagsData(env) {
  const { results } = await env.DB.prepare(
    "SELECT tags FROM posts WHERE status IN ('published','publish') AND (password IS NULL OR password='') AND tags IS NOT NULL AND tags != ''"
  ).all();

  const tagMap = {};
  if (results) {
    results.forEach(r => {
      if (r.tags) {
        r.tags.split(',').forEach(t => {
          const tag = t.trim();
          if (tag) tagMap[tag] = (tagMap[tag] || 0) + 1;
        });
      }
    });
  }

  return Object.entries(tagMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)
    .map(([name, count]) => ({ name, count }));
}

async function handleGetTags(env) {
  try {
    return json(await getTagsData(env));
  } catch (e) {
    console.error('[API] 获取标签失败:', e);
    return json([]);
  }
}

/**
 * 侧边栏聚合接口：一次返回统计 + 分类 + 友链 + 标签
 */
async function handleGetPageMeta(env) {
  const [stats, categories, links, tags] = await Promise.all([
    getStatsData(env),
    getCategoriesData(env),
    getLinksData(env),
    getTagsData(env)
  ]);
  return json({ stats, categories, links, tags });
}
