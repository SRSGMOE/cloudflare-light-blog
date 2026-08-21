CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT DEFAULT '',
  password TEXT DEFAULT '',
  cover_image TEXT DEFAULT '',
  category TEXT DEFAULT '未分类',
  tags TEXT DEFAULT '',
  status TEXT DEFAULT 'draft',
  view_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT DEFAULT '',
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_status_created_at ON posts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('site_name', '我的博客'),
  ('site_description', '一个使用 Cloudflare 构建的博客'),
  ('site_bio', '这是我的个人简介内容。'),
  ('site_links', 'Google,https://google.com'),
  ('links_title', '友链'),
  ('site_footer', '© 2026 我的博客'),
  ('custom_js', ''),
  ('iconfont_css', ''),
  ('site_author', '这是我的名字'),
  ('site_created_at', ''),
  ('site_theme', 'animal-forest'),
  ('enable_tag_cloud', '1'),
  ('profile_position', 'left'),
  ('tag_cloud_position', 'left'),
  ('pinned_post_id', ''),
  ('copyright_notice', ''),
  ('ad_content', ''),
  ('ad_position', 'left'),
  ('allow_robots', '1'),
  ('enable_compression', '0'),
  ('allowed_origins', '*');

INSERT OR IGNORE INTO posts
  (title, slug, content, excerpt, category, tags, status, view_count, created_at, updated_at, published_at)
SELECT
  '欢迎使用 cloudflare-light-blog',
  'welcome',
  '# 欢迎\n\n这是一个基于 Cloudflare Workers + D1 + R2 构建的轻量级博客系统。\n\n## 功能特点\n\n- ✅ 简洁的后台管理\n- ✅ 支持文章封面图\n- ✅ 高速部署\n- ✅ 免费额度充足\n\n开始你的博客之旅吧！',
  '这是一个基于 Cloudflare Workers 构建的轻量级博客系统...',
  '技术教程',
  'Cloudflare,博客',
  'published',
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM posts);

INSERT OR IGNORE INTO categories (name, slug, description)
SELECT '分类A', 'fenleia', ''
WHERE NOT EXISTS (SELECT 1 FROM categories);
