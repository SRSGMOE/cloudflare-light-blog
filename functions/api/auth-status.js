// ============================================
// 认证状态检查 API - Cloudflare Functions
// 使用 D1 数据库存储
// ============================================

// 检查并创建设置表（如果不存在）
async function ensureSettingsTable(env) {
    try {
        if (!env.DB) return false;
        
        // 使用 CREATE TABLE IF NOT EXISTS 直接建表
        await env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `).run();
        
        // 插入默认设置
        await env.DB.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('siteTitle', '"我的导航"')`).run();
        await env.DB.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('footerText', '"Powered by Cloudflare Pages"')`).run();
        await env.DB.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('sitePasswordEnabled', 'false')`).run();
        await env.DB.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('sitePassword', '""')`).run();
        
        return true;
    } catch (err) {
        console.error('确保设置表存在失败:', err);
        return false;
    }
}

// 获取设置
async function getSettings(env) {
    try {
        if (!env.DB) return {};
        await ensureSettingsTable(env);
        
        const { results } = await env.DB.prepare('SELECT key, value FROM settings').all();
        const settings = {};
        for (const row of results) {
            try {
                settings[row.key] = JSON.parse(row.value);
            } catch {
                settings[row.key] = row.value;
            }
        }
        return settings;
    } catch (err) {
        console.error('获取设置失败:', err);
        return {};
    }
}

// 验证管理员 token
async function verifyAdminToken(token, env) {
    try {
        if (!token || !token.startsWith('Bearer ')) {
            return false;
        }
        
        // 简单验证：检查 token 是否存在且非空
        const tokenValue = token.replace('Bearer ', '');
        if (!tokenValue || tokenValue.length < 10) {
            return false;
        }
        
        // 这里可以添加更复杂的 token 验证逻辑
        // 目前简单验证 token 格式正确即可
        return true;
    } catch (err) {
        console.error('验证 token 失败:', err);
        return false;
    }
}

// GET - 获取认证状态
export async function onRequestGet(context) {
    const { request, env } = context;
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };
    
    try {
        const settings = await getSettings(env);
        
        // 检查是否有管理员 token
        const authHeader = request.headers.get('Authorization');
        const isAuthenticated = await verifyAdminToken(authHeader, env);
        
        return new Response(JSON.stringify({
            success: true,
            sitePasswordEnabled: settings.sitePasswordEnabled || false,
            authenticated: isAuthenticated
        }), { headers });
    } catch (err) {
        console.error('获取认证状态失败:', err);
        return new Response(JSON.stringify({
            success: true,
            sitePasswordEnabled: false,
            authenticated: false
        }), { headers });
    }
}

// OPTIONS - CORS 预检
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    });
}