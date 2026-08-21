// ==================== Cloudflare Light Blog - 主入口 ====================
// 模块化架构 | HMAC 认证 | 分页 | 缓存 | SEO

import { html, json, errorResponse, handleOptions, getCorsHeaders, escapeHtml, deriveHMACKey, withAssetCache } from './lib/utils.js';
import { getSettings } from './lib/db.js';
import { authenticateRequest, verifyPasswordHash } from './lib/auth.js';
import { handleImage } from './lib/image.js';
import { getPublicApiCacheTTL, purgePublicCache, withCache } from './lib/cache.js';
import { handleAPI } from './api.js';
import { getFrontendHTML } from './views/frontend.js';
import { getPostHTML } from './views/post.js';
import { getPasswordHTML } from './views/password.js';
import { getAdminHTML } from './views/admin.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 公共静态资源不需要读取 D1，也不受全站密码页面影响。
    if (path === '/favicon.ico' || path.startsWith('/icon/') || path.startsWith('/vendor/')) {
      try {
        return path === '/favicon.ico'
          ? await handleFavicon(request, env)
          : await handleStaticAsset(request, env, path);
      } catch (e) {
        return errorResponse('静态资源加载失败', 500, e);
      }
    }

    // 数据库结构通过 migrations/ 管理，避免每个冷实例在请求中执行初始化写操作。
    const siteSettings = await getSettings(env);

    // 处理 CORS 预检请求
    const optionsResponse = handleOptions(request, siteSettings.allowed_origins || '*');
    if (optionsResponse) return optionsResponse;

    try {
      // 全站密码保护检查
      if (siteSettings.site_password && path !== '/api/site-auth') {
        const cookie = request.headers.get('Cookie') || '';
        const authMatch = cookie.match(/site_auth=([^;]+)/);
        if (authMatch) {
          // 验证 cookie 有效性（HMAC + 24小时过期）
          const valid = await verifySiteAuth(authMatch[1], siteSettings.site_password);
          if (!valid) {
            return showSitePasswordPage(siteSettings);
          }
        } else {
          // API 请求返回 401
          if (path.startsWith('/api/')) {
            return json({ error: '需要全站密码' }, 401);
          }
          return showSitePasswordPage(siteSettings);
        }
      }

      // ========== 路由分发 ==========

      // Sitemap
      if (path === '/sitemap.xml') {
        return handleAPI(request, env, path);
      }

      // RSS
      if (path === '/rss.xml') {
        return handleAPI(request, env, path);
      }

      // robots.txt
      if (path === '/robots.txt') {
        return handleRobots(request, env);
      }

      // API 路由（统一附加 CORS 头）
      if (path.startsWith('/api/')) {
        const cacheTtl = getPublicApiCacheTTL(path, request.method);
        const canUsePublicCache = !siteSettings.site_password;
        const resp = cacheTtl && canUsePublicCache
          ? await withCache(
            request,
            () => handleAPI(request, env, path),
            cacheTtl,
            ctx,
            { cacheQuery: true }
          )
          : await handleAPI(request, env, path);
        const cors = getCorsHeaders(request, siteSettings.allowed_origins || '*');
        Object.entries(cors).forEach(([k, v]) => resp.headers.set(k, v));
        if (resp.ok && request.method !== 'GET' && path !== '/api/login' && !path.endsWith('-auth')) {
          ctx.waitUntil(purgePublicCache(url.origin));
        }
        return resp;
      }

      // 后台路由
      if (path.startsWith('/admin')) {
        return handleAdmin(request, env, path);
      }

      // R2 图片
      if (path.startsWith('/images/')) {
        return handleImage(request, env, path);
      }

      // 文章详情页
      if (path.startsWith('/post/')) {
        return handlePostPage(request, env, path, ctx);
      }

      // 首页（带缓存）
      return handleFrontendPage(request, env, ctx, siteSettings);

    } catch (e) {
      console.error('[Worker] 未捕获错误:', e.message || 'Error');
      return errorResponse('服务器错误', 500, e);
    }
  }
};

// ==================== 页面处理 ====================

/**
 * 首页（带缓存）
 */
async function handleFrontendPage(request, env, ctx, siteSettings) {
  const canUsePublicCache = !siteSettings.site_password;
  const render = async () => {
    const initialData = new URL(request.url).search
      ? null
      : await getInitialFrontendData(request, env);
    return html(getFrontendHTML(siteSettings, request.url, initialData));
  };

  return canUsePublicCache
    ? withCache(request, render, 300, ctx)
    : render(); // 缓存 5 分钟
}

/**
 * 首屏数据在 Worker 端并行生成，随缓存的 HTML 一起发送。
 */
async function getInitialFrontendData(request, env) {
  try {
    const baseUrl = new URL(request.url);
    const homeResponse = await handleAPI(
      new Request(new URL('/api/home-data?v=3', baseUrl)),
      env,
      '/api/home-data'
    );
    if (!homeResponse.ok) return null;
    const homeResponseData = await homeResponse.json();
    const { posts: homePosts, ...home } = homeResponseData;
    return {
      home,
      posts: {
        data: homePosts || [],
        pinned_post_id: home.pinned_post_id || '',
        pagination: home.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }
      }
    };
  } catch (e) {
    console.error('[Worker] 首屏数据生成失败:', e.message || 'Error');
    return null;
  }
}



/**
 * 验证文章密码 cookie
 */
async function verifyPostAuth(cookieValue, passwordHash, postId) {
  try {
    const parts = cookieValue.split('.');
    if (parts.length !== 2) return false;
    const timestamp = parseInt(parts[0]);
    if (isNaN(timestamp)) return false;
    if (Date.now() - timestamp > 86400000) return false;
    const key = await deriveHMACKey(passwordHash, 'post-auth-' + postId);
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('post_auth:' + timestamp));
    const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
    return parts[1] === expected;
  } catch { return false; }
}

/**
 * 验证全站密码 cookie
 */
async function verifySiteAuth(cookieValue, password) {
  try {
    const parts = cookieValue.split('.');
    if (parts.length !== 2) return false;
    const timestamp = parseInt(parts[0]);
    if (isNaN(timestamp)) return false;
    if (Date.now() - timestamp > 86400000) return false;
    const key = await deriveHMACKey(password, 'site-auth');
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('site_auth:' + timestamp));
    const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
    return parts[1] === expected;
  } catch { return false; }
}

/**
 * 显示全站密码页面
 */
function showSitePasswordPage(settings) {
  const siteName = settings.site_name || '我的博客';
  return new Response(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>访问验证 - ${escapeHtml(siteName)}</title>
  <link rel="icon" href="/icon/favicon.ico">
  <style>
    body { font-family: ui-rounded, 'PingFang SC', 'Microsoft YaHei', sans-serif; background: #f8f8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .box { background: #f7f3df; padding: 48px; border-radius: 20px; box-shadow: 0 4px 10px rgba(107,92,67,0.42); text-align: center; border: 2px solid #e8e0cc; max-width: 400px; width: 90%; }
    h2 { margin-bottom: 8px; color: #794f27; font-weight: 700; font-size: 1.4em; }
    p { color: #9f927d; margin-bottom: 24px; font-size: 0.9em; }
    input { width: 100%; padding: 14px 20px; border: 2.5px solid #c4b89e; border-radius: 50px; font-size: 15px; margin-bottom: 16px; background: #f8f8f0; color: #725d42; box-sizing: border-box; outline: none; box-shadow: 0 3px 0 0 #d4c9b4; transition: all 0.25s; }
    input:focus { border-color: #19c8b9; box-shadow: 0 3px 0 0 #11a89b; }
    button { width: 100%; padding: 14px; background: #19c8b9; color: #fff; border: none; border-radius: 50px; font-size: 16px; font-weight: 600; cursor: pointer; box-shadow: 0 5px 0 0 #11a89b; transition: all 0.25s; }
    button:hover { transform: translateY(-1px); box-shadow: 0 6px 0 0 #11a89b; }
    button:active { transform: translateY(2px); box-shadow: 0 1px 0 0 #11a89b; }
    .error { color: #e05a5a; margin-top: 12px; font-size: 0.9em; display: none; }
  </style>
</head>
<body>
  <div class="box">
    <h2>🔒 ${escapeHtml(siteName)}</h2>
    <p>请输入访问密码</p>
    <form id="authForm">
      <input type="password" id="pwd" placeholder="请输入密码" autofocus>
      <button type="submit">进入</button>
    </form>
    <div class="error" id="error">密码错误，请重试</div>
  </div>
  <script>
    document.getElementById('authForm').onsubmit = async function(e) {
      e.preventDefault();
      var pwd = document.getElementById('pwd').value;
      if (!pwd) return;
      try {
        var r = await fetch('/api/site-auth', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({password: pwd})
        });
        var d = await r.json();
        if (d.success) {
          window.location.reload();
        } else {
          document.getElementById('error').style.display = 'block';
        }
      } catch(e) {
        document.getElementById('error').style.display = 'block';
      }
    };
  </script>
</body>
</html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

/**
 * robots.txt
 */
async function handleRobots(request, env) {
  const settings = await getSettings(env);
  const allowRobots = settings.allow_robots !== '0';
  const origin = new URL(request.url).origin;

  const content = allowRobots
    ? `User-agent: *
Allow: /
Sitemap: ${origin}/sitemap.xml
`
    : `User-agent: *
Disallow: /
`;

  return new Response(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

/**
 * favicon.ico（从静态资源读取）
 */
async function handleFavicon(request, env) {
  if (!env.ASSETS) {
    return new Response(null, { status: 204 });
  }

  const response = await env.ASSETS.fetch(new URL('/icon/favicon.ico', request.url));
  if (response && response.status !== 404) {
    return withAssetCache(response);
  }

  return new Response(null, { status: 204 });
}

/**
 * Icon 图标（从静态资源读取）
 */
async function handleIcon(request, env, path) {
  return handleStaticAsset(request, env, path, false);
}

/**
 * 公共静态资源（图标和本地化前端依赖）
 */
async function handleStaticAsset(request, env, path, immutable = path.startsWith('/vendor/')) {
  if (!env.ASSETS) {
    return new Response('Not Found', { status: 404 });
  }

  const response = await env.ASSETS.fetch(new URL(path, request.url));

  if (!response || response.status === 404) {
    return new Response('Not Found', { status: 404 });
  }

  if (!immutable) return withAssetCache(response);

  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/**
 * 文章详情页（带缓存）
 */
async function handlePostPage(request, env, path, ctx) {
  const match = path.match(/^\/post\/(\d{6})\/(\d+)$/);
  if (!match) {
    return html('无效的文章链接', 404);
  }

  const id = parseInt(match[2]);
  const url = new URL(request.url);
  const providedPassword = url.searchParams.get('password');

  // 如果带密码参数，不缓存
  if (providedPassword) {
    return renderPostPage(request, env, id, providedPassword, ctx);
  }

  // 文章详情页不缓存（编辑后立即生效）
  return renderPostPage(request, env, id, null, ctx);
}

/**
 * 渲染文章详情页
 */
async function renderPostPage(request, env, id, providedPassword, ctx) {
  const settings = await getSettings(env);

  const post = await env.DB.prepare(
    "SELECT * FROM posts WHERE id=? AND status='published'"
  ).bind(id).first();

  if (!post) {
    return html('文章不存在', 404);
  }

  // 异步累加浏览次数（不阻塞响应）
  if (ctx) {
    ctx.waitUntil(env.DB.prepare("UPDATE posts SET view_count = view_count + 1 WHERE id=?").bind(id).run());
  }

  // 检查密码保护
  if (post.password && post.password !== '') {
    // 检查 cookie
    const cookie = request.headers.get('Cookie') || '';
    const authMatch = cookie.match(new RegExp('post_auth_' + id + '=([^;]+)'));
    let authenticated = false;
    if (authMatch) {
      authenticated = await verifyPostAuth(authMatch[1], post.password, id);
    }
    // 兼容 URL 参数（旧方式，使用哈希比较）
    if (providedPassword) {
      authenticated = await verifyPasswordHash(providedPassword, post.password);
    }
    if (!authenticated) {
      return html(getPasswordHTML(post));
    }
  }

  return html(getPostHTML(post, settings, request.url));
}

/**
 * 后台管理页面
 */
async function handleAdmin(request, env, path) {
  // 登录页面不需要认证
  if (path === '/admin/' || path === '/admin') {
    return html(getAdminHTML());
  }

  // 其他后台路径需要认证
  if (env.ADMIN_PASSWORD) {
    const isAuthed = await authenticateRequest(request, env);
    if (!isAuthed) {
      return new Response(JSON.stringify({ error: '未授权' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return html(getAdminHTML());
}
