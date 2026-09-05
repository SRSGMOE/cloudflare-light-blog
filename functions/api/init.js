// ============================================
// 初始化 API - 强制创建数据表
// 用于修复建表问题
// ============================================

export async function onRequestGet(context) {
    const { env } = context;
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };
    
    if (!env.DB) {
        return new Response(JSON.stringify({
            success: false,
            message: '数据库未绑定'
        }), { status: 500, headers });
    }
    
    const logs = [];
    
    try {
        // 创建 navs 表（包含 sort_order 字段）
        logs.push('正在创建 navs 表...');
        await env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS navs (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                url TEXT NOT NULL,
                description TEXT DEFAULT '',
                icon TEXT DEFAULT '',
                category TEXT DEFAULT '',
                sort_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `).run();
        logs.push('✅ navs 表创建成功');
        
        // 检查并添加 sort_order 列（如果不存在）
        try {
            const columns = await env.DB.prepare("PRAGMA table_info(navs)").all();
            const hasSortOrder = columns.results.some(col => col.name === 'sort_order');
            if (!hasSortOrder) {
                logs.push('正在添加 sort_order 列...');
                await env.DB.prepare("ALTER TABLE navs ADD COLUMN sort_order INTEGER DEFAULT 0").run();
                logs.push('✅ sort_order 列添加成功');
            } else {
                logs.push('✅ sort_order 列已存在');
            }
        } catch (e) {
            logs.push('⚠️ 检查 sort_order 列: ' + e.message);
        }
        
        // 创建 settings 表
        logs.push('正在创建 settings 表...');
        await env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `).run();
        logs.push('✅ settings 表创建成功');
        
        // 插入默认设置
        logs.push('正在初始化默认设置...');
        await env.DB.prepare(`
            INSERT OR IGNORE INTO settings (key, value) VALUES ('siteTitle', '"我的导航"')
        `).run();
        await env.DB.prepare(`
            INSERT OR IGNORE INTO settings (key, value) VALUES ('footerText', '"Powered by Cloudflare Pages"')
        `).run();
        await env.DB.prepare(`
            INSERT OR IGNORE INTO settings (key, value) VALUES ('sitePasswordEnabled', 'false')
        `).run();
        await env.DB.prepare(`
            INSERT OR IGNORE INTO settings (key, value) VALUES ('sitePassword', '""')
        `).run();
        logs.push('✅ 默认设置初始化完成');
        
        // 验证表是否存在
        const { results: tables } = await env.DB.prepare(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).all();
        logs.push('当前数据表: ' + tables.map(t => t.name).join(', '));
        
        // 检查 navs 表结构
        const { results: navsInfo } = await env.DB.prepare(
            "PRAGMA table_info(navs)"
        ).all();
        logs.push('navs 表字段: ' + navsInfo.map(c => c.name + '(' + c.type + ')').join(', '));
        
        // 测试插入
        logs.push('正在测试插入...');
        const testId = 'test_' + Date.now();
        await env.DB.prepare(`
            INSERT OR REPLACE INTO navs (id, title, url, description, icon, category, sort_order) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(testId, '测试导航', 'https://example.com', '这是一个测试', '🧪', '测试分类', 99).run();
        logs.push('✅ 测试数据插入成功');
        
        // 查询验证
        const { results: testNav } = await env.DB.prepare(
            'SELECT * FROM navs WHERE id = ?'
        ).bind(testId).all();
        
        if (testNav.length > 0) {
            logs.push('✅ 测试数据查询成功: ' + JSON.stringify(testNav[0]));
        }
        
        // 删除测试数据
        await env.DB.prepare('DELETE FROM navs WHERE id = ?').bind(testId).run();
        logs.push('✅ 测试数据已清理');
        
        return new Response(JSON.stringify({
            success: true,
            message: '数据库初始化完成！（已支持排序功能）',
            logs: logs,
            tables: tables.map(t => t.name)
        }), { headers });
        
    } catch (err) {
        logs.push('❌ 错误: ' + err.message);
        logs.push('错误堆栈: ' + err.stack);
        
        return new Response(JSON.stringify({
            success: false,
            message: '初始化失败: ' + err.message,
            logs: logs
        }), { status: 500, headers });
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}
