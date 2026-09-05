// ============================================
// 认证 API - Cloudflare Functions
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
        await env.DB.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('headCustomJs', '""')`).run();
        await env.DB.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('footerCustomJs', '""')`).run();
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

export async function onRequestPost(context) {
    const { request, env } = context;
    
    // CORS headers
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };
    
    try {
        const { password, type } = await request.json();
        
        // type: 'site' | 'admin' (默认为 'admin')
        const authType = type || 'admin';
        
        // 获取设置
        const settings = await getSettings(env);
        
        if (authType === 'site') {
            // 访问密码验证
            if (!settings.sitePasswordEnabled) {
                // 访问密码关闭，直接通过
                const token = await generateToken('site_open_' + Date.now());
                return new Response(JSON.stringify({
                    success: true,
                    token: token,
                    type: 'site'
                }), { headers });
            }
            
            // 检查访问密码
            const sitePassword = settings.sitePassword || '';
            if (password === sitePassword) {
                const token = await generateToken('site_' + sitePassword + Date.now());
                return new Response(JSON.stringify({
                    success: true,
                    token: token,
                    type: 'site'
                }), { headers });
            } else {
                return new Response(JSON.stringify({
                    success: false,
                    message: '访问密码错误'
                }), { 
                    status: 401,
                    headers 
                });
            }
        } else {
            // 后台管理密码验证
            const adminPassword = env.ADMIN_PASSWORD || 'admin123';
            
            if (password === adminPassword) {
                const token = await generateToken(adminPassword + Date.now());
                return new Response(JSON.stringify({
                    success: true,
                    token: token,
                    type: 'admin'
                }), { headers });
            } else {
                return new Response(JSON.stringify({
                    success: false,
                    message: '管理密码错误'
                }), { 
                    status: 401,
                    headers 
                });
            }
        }
    } catch (err) {
        console.error('认证错误:', err);
        return new Response(JSON.stringify({
            success: false,
            message: '请求格式错误: ' + err.message
        }), { 
            status: 400,
            headers 
        });
    }
}

// 处理 OPTIONS 预检请求
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}

// 生成 token
async function generateToken(password) {
    const data = new TextEncoder().encode(password + Date.now());
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}