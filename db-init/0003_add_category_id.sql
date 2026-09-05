-- 添加 category_id 字段到 navs 表
ALTER TABLE navs ADD COLUMN category_id TEXT DEFAULT '';

-- 更新现有数据，将 category 名称转换为 category_id
-- 注意：这需要根据实际数据进行调整
-- UPDATE navs SET category_id = (SELECT id FROM categories WHERE categories.name = navs.category) WHERE category != '';
