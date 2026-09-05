-- 创建分类表
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建广告表
CREATE TABLE IF NOT EXISTS ads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 更新导航表，添加标签字段
ALTER TABLE navs ADD COLUMN tags TEXT DEFAULT '';

-- 更新设置表，添加新的设置项
INSERT OR IGNORE INTO settings (key, value) VALUES 
    ('siteSubtitle', '"快速访问常用网站"'),
    ('siteLogo', '""'),
    ('siteKeywords', '""'),
    ('siteDescription', '""'),
    ('siteTheme', '"light"'),
    ('mobileLayout', '"single"');

-- 创建默认分类
INSERT OR IGNORE INTO categories (id, name, icon, sort_order) VALUES 
    ('default', '默认分类', '📁', 0);