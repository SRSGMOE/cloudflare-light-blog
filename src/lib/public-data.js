import { json } from './utils.js';

export function parseLinksData(linksData) {
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

export function buildTagData(results) {
  const tagMap = {};
  results.forEach(row => {
    if (!row.tags) return;
    row.tags.split(',').forEach(value => {
      const tag = value.trim();
      if (tag) tagMap[tag] = (tagMap[tag] || 0) + 1;
    });
  });
  return {
    count: Object.keys(tagMap).length,
    tags: Object.entries(tagMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 18)
      .map(([name, count]) => ({ name, count }))
  };
}

export async function getHomeData(env) {
  const [postCount, statsTagRows, latestPost, categoryRows, linksRow, tagRows, postsRows, pinnedRow] = await env.DB.batch([
    env.DB.prepare("SELECT COUNT(*) as cnt FROM posts WHERE status='published'"),
    env.DB.prepare("SELECT tags FROM posts WHERE status='published' AND tags IS NOT NULL AND tags != ''"),
    env.DB.prepare("SELECT created_at FROM posts WHERE status='published' ORDER BY created_at DESC LIMIT 1"),
    env.DB.prepare("SELECT * FROM categories ORDER BY name"),
    env.DB.prepare("SELECT value FROM settings WHERE key='site_links'"),
    env.DB.prepare("SELECT tags FROM posts WHERE status='published' AND (password IS NULL OR password='') AND tags IS NOT NULL AND tags != ''"),
    env.DB.prepare("SELECT id, title, slug, excerpt, cover_image, category, tags, view_count, created_at, password FROM posts WHERE status='published' ORDER BY created_at DESC LIMIT 10"),
    env.DB.prepare("SELECT value FROM settings WHERE key='pinned_post_id'")
  ]);
  const categories = categoryRows.results || [];
  const statsTags = buildTagData(statsTagRows.results || []);
  const tags = buildTagData(tagRows.results || []).tags;
  const posts = (postsRows.results || []).map(post => {
    const { password, ...publicPost } = post;
    if (password) publicPost.excerpt = '';
    publicPost.has_password = password ? 1 : 0;
    return publicPost;
  });
  const total = postCount.results?.[0]?.cnt ?? 0;

  const response = json({
    stats: {
      postCount: postCount.results?.[0]?.cnt ?? 0,
      catCount: categories.length,
      tagCount: statsTags.count,
      latestDate: latestPost.results?.[0]?.created_at || ''
    },
    categories,
    links: parseLinksData(linksRow.results?.[0]?.value || ''),
    tags,
    posts,
    pinned_post_id: pinnedRow.results?.[0]?.value || '',
    pagination: { page: 1, limit: 10, total, totalPages: Math.ceil(total / 10) }
  });
  response.headers.set('Cache-Control', 'public, max-age=60');
  return response;
}
