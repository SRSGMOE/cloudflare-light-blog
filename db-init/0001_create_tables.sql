-- 创建设置表
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建导航表
CREATE TABLE IF NOT EXISTS navs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    desc TEXT,
    icon TEXT,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认设置（如果不存在）
INSERT OR IGNORE INTO settings (key, value) VALUES 
    ('siteTitle', '"我的导航"'),
    ('footerText', '"Powered by Cloudflare Pages"'),
    ('headCustomJs', '""'),
    ('footerCustomJs', '""'),
    ('sitePasswordEnabled', 'false'),
    ('sitePassword', '""');