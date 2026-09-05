// ==================== 工具函数 ====================

/**
 * JSON 响应
 */
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

/**
 * HTML 响应（带安全头）
 */
export function html(content, status = 200) {
  return new Response(content, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  });
}

/**
 * 错误响应（不暴露内部错误信息）
 */
export function errorResponse(message, status = 500, logError = null) {
  if (logError) {
    console.error(`[Error ${status}]`, logError);
  }
  const safeMessages = {
    400: '请求参数错误',
    401: '未授权访问',
    403: '禁止访问',
    404: '资源不存在',
    500: '服务器内部错误'
  };
  return json({ error: safeMessages[status] || message }, status);
}

/**
 * 生成 URL 友好的 slug
 */
export function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

/**
 * 生成干净的文章摘要（去除 Markdown / HTML 符号，截断到指定长度）
 * 保存文章时调用，避免前端每次渲染重复解析
 */
export function generateExcerpt(content, maxLen = 200) {
  if (!content) return '';
  let str = String(content);
  // 移除代码块（三反引号 / 行内代码）
  str = str.replace(/```[\s\S]*?```/g, ' ');
  str = str.replace(/`[^`]*`/g, ' ');
  // 移除图片 ![](url)
  str = str.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ');
  // 链接 [text](url) → text
  str = str.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  // 移除 HTML 标签与实体
  str = str.replace(/<[^>]*>/g, ' ');
  str = str.replace(/&[a-z]+;/g, ' ');
  // 移除标题 / 粗体 / 斜体 / 删除线标记
  str = str.replace(/^#{1,6}\s+/gm, ' ');
  str = str.replace(/\*\*([^*]+)\*\*/g, '$1');
  str = str.replace(/\*([^*]+)\*/g, '$1');
  str = str.replace(/__([^_]+)__/g, '$1');
  str = str.replace(/~~([^~]+)~~/g, '$1');
  // 移除列表 / 引用 / 分割线标记
  str = str.replace(/^[-*+]\s+/gm, ' ');
  str = str.replace(/^\d+\.\s+/gm, ' ');
  str = str.replace(/^>\s+/gm, ' ');
  str = str.replace(/^-{3,}\s*$/gm, ' ');
  // 压缩空白并截断
  str = str.replace(/\s+/g, ' ').trim();
  return str.substring(0, maxLen);
}

/**
 * 生成随机文件名
 */
export function generateRandomFilename() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => chars[b % chars.length]).join('');
}

/**
 * HTML 转义（防 XSS）
 */
export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 渲染广告内容（支持 HTML 与常用 Markdown 语法：带链接图片、图片、链接）
 * HTML 内容原样透传；Markdown 转换顺序：带链接图片 → 图片 → 纯链接
 */
export function renderAdContent(content) {
  if (!content) return '';
  return content
    .replace(/\[!\[([^\]]*)\]\(([^)\s]+)\)\]\(([^)\s]+)\)/g, '<a href="$3" target="_blank" rel="noopener"><img src="$2" alt="$1"></a>')
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1">')
    .replace(/(^|[^!])\[([^\]]+)\]\(([^)\s]+)\)/g, '$1<a href="$3" target="_blank" rel="noopener">$2</a>');
}

/**
 * 获取 CORS 头（支持多域名，从请求头 Origin 匹配）
 * @param {Request} request - 请求对象
 * @param {string} allowedOrigins - 逗号分隔的允许来源，"*" 表示全部允许
 */
export function getCorsHeaders(request, allowedOrigins) {
  const origins = (allowedOrigins || '*').split(',').map(s => s.trim()).filter(Boolean);
  const requestOrigin = request.headers.get('Origin') || '';
  let allowOrigin = '*';
  if (origins.length === 1 && origins[0] === '*') {
    allowOrigin = '*';
  } else if (origins.includes(requestOrigin)) {
    allowOrigin = requestOrigin;
  } else {
    allowOrigin = origins[0] || '*';
  }
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
}

/**
 * 处理 OPTIONS 预检请求
 */
export function handleOptions(request, allowedOrigins) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(request, allowedOrigins) });
  }
  return null;
}

/**
 * 使用 HKDF 派生 HMAC 密钥（用于 Cookie 签名验证）
 * @param {string} password - 密码或密钥材料
 * @param {string} info - HKDF 上下文信息
 */
export async function deriveHMACKey(password, info) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'HKDF', false, ['deriveBits']);
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: encoder.encode('cloudflare-light-blog-cookie-v1'), info: encoder.encode(info) },
    keyMaterial, 256
  );
  return crypto.subtle.importKey('raw', derivedBits, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}
