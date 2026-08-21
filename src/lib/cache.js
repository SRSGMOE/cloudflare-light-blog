// ==================== 缓存模块（Workers Cache API）====================

const DEFAULT_TTL = 300; // 5分钟默认缓存
const PUBLIC_CACHE_PATHS = [
  '/',
  '/api/home-data',
  '/api/home-data?v=2',
  '/api/home-data?v=3',
  '/api/posts?page=1&limit=10',
  '/api/posts?page=1&limit=10&v=2',
  '/api/posts?page=1&limit=10&v=3',
  '/api/settings',
  '/api/stats',
  '/api/links',
  '/api/tags'
];
const PUBLIC_API_CACHE_TTLS = {
  '/api/home-data': 60,
  '/api/posts': 60,
  '/api/settings': 300,
  '/api/stats': 60,
  '/api/links': 300,
  '/api/tags': 60
};

export function getPublicApiCacheTTL(path, method) {
  return method === 'GET' ? PUBLIC_API_CACHE_TTLS[path] || 0 : 0;
}

/**
 * 获取缓存的响应
 */
export async function getCachedResponse(request) {
  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (!cached) return null;

  // Cache API 返回的 Response 头部可能不可变，重新包装后才能补充 CORS 等头部。
  return new Response(cached.body, {
    status: cached.status,
    statusText: cached.statusText,
    headers: new Headers(cached.headers)
  });
}

/**
 * 删除指定请求的缓存条目
 */
export async function deleteCachedResponse(request) {
  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: 'GET' });
  await cache.delete(cacheKey);
}

/**
 * 缓存响应
 */
export async function cacheResponse(request, response, ttl = DEFAULT_TTL, ctx = null) {
  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: 'GET' });
  const cacheable = response.clone();
  const cacheControl = `public, max-age=${ttl}, stale-while-revalidate=${ttl}`;
  cacheable.headers.set('Cache-Control', cacheControl);
  // 明确 Cloudflare 边缘缓存 TTL，避免面板默认规则覆盖源站缓存策略。
  cacheable.headers.set('CDN-Cache-Control', cacheControl);
  const putPromise = cache.put(cacheKey, cacheable.clone()).catch(error => {
    console.error('[Cache] 写入失败:', error);
  });
  if (ctx?.waitUntil) {
    ctx.waitUntil(putPromise);
  } else {
    await putPromise;
  }
  return cacheable;
}

/**
 * 清除指定 URL 的缓存
 */
export async function purgeCache(url) {
  const cache = caches.default;
  await cache.delete(new Request(url));
}

/**
 * 清除首页及公开接口缓存
 */
export async function purgePublicCache(origin) {
  await Promise.all(PUBLIC_CACHE_PATHS.map(path => purgeCache(origin + path)));
}

/**
 * 带缓存的响应包装器
 */
export async function withCache(request, fetchFn, ttl = DEFAULT_TTL, ctx = null, options = {}) {
  // 只缓存 GET 请求
  if (request.method !== 'GET') {
    return fetchFn();
  }

  // 不缓存带查询参数的页面（标签、分类、分页等）
  const url = new URL(request.url);
  if (url.search && !options.cacheQuery) {
    return fetchFn();
  }

  // 尝试从缓存获取
  const cached = await getCachedResponse(request);
  if (cached?.ok) {
    return cached;
  }
  if (cached) {
    await deleteCachedResponse(request);
  }

  // 执行实际请求
  const response = await fetchFn();

  // 只缓存成功响应
  return response.ok ? cacheResponse(request, response, ttl, ctx) : response;
}
