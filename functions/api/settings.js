// ============================================
// 网站设置 API - Cloudflare Functions
// 使用 D1 数据库存储
// ============================================

// 验证 token
async function verifyToken(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }
    return true;
}

// 检查并创建设置表
async function ensureSettingsTable(env) {
    try {
        // 先检查表是否存在
        const { results } = await env.DB.prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='settings'"
        ).all();
        
        // 如果表不存在，创建它
        if (results.length === 0) {
            await env.DB.exec(`
                CREATE TABLE settings (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // 插入默认设置
            await env.DB.prepare(`
                INSERT OR IGNORE INTO settings (key, value) VALUES 
                    ('siteTitle', '"我的导航"'),
                    ('siteSubtitle', '""'),
                    ('siteLogo', '""'),
                    ('siteKeywords', '""'),
                    ('siteDescription', '""'),
                    ('footerText', '"Powered by Cloudflare Pages"'),
                    ('headCustomJs', '""'),
                    ('footerCustomJs', '""'),
                    ('sitePasswordEnabled', 'false'),
                    ('sitePassword', '""'),
                    ('siteTheme', '"light"'),
                    ('mobileColumns', '"1"')
            `).run();
            
            console.log('settings 表创建成功');
        }
        return true;
    } catch (err) {
        console.error('确保设置表存在失败:', err);
        return false;
    }
}

// 获取所有设置
async function getSettings(env) {
    try {
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

// 更新单个设置
async function updateSetting(env, key, value) {
    const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
    await env.DB.prepare(`
        INSERT INTO settings (key, value, updated_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET 
            value = excluded.value,
            updated_at = excluded.updated_at
    `).bind(key, valueStr).run();
}

// 默认设置
const DEFAULT_SETTINGS = {
    siteTitle: '我的导航',
    siteSubtitle: '',
    siteLogo: '',
    siteKeywords: '',
    siteDescription: '',
    footerText: 'Powered by Cloudflare Pages',
    headCustomJs: '',
    footerCustomJs: '',
    sitePasswordEnabled: false,
    sitePassword: '',
    siteTheme: 'light',
    mobileColumns: '1',
    friendLinks: '',
    bannerBgImage: ''
};

// GET - 获取设置（无需认证，首页需要）
export async function onRequestGet(context) {
    const { env } = context;
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };
    
    try {
        // 检查 DB 绑定
        if (!env.DB) {
            return new Response(JSON.stringify({
                success: true,
                settings: DEFAULT_SETTINGS
            }), { headers });
        }
        
        const settings = await getSettings(env);
        
        // 合并默认设置
        const mergedSettings = { ...DEFAULT_SETTINGS, ...settings };
        
        // 返回给前端时，不暴露站点密码（只返回是否启用）
        const publicSettings = {
            ...mergedSettings,
            sitePassword: undefined // 不返回密码
        };
        
        return new Response(JSON.stringify({
            success: true,
            settings: publicSettings
        }), { headers });
    } catch (err) {
        console.error('获取设置失败:', err);
        return new Response(JSON.stringify({
            success: true,
            settings: DEFAULT_SETTINGS
        }), { headers });
    }
}

// PUT - 更新设置
export async function onRequestPut(context) {
    const { request, env } = context;
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };
    
    // 验证 token
    if (!await verifyToken(request, env)) {
        return new Response(JSON.stringify({
            success: false,
            message: '未授权'
        }), { status: 401, headers });
    }
    
    try {
        // 检查 DB 绑定
        if (!env.DB) {
            return new Response(JSON.stringify({
                success: false,
                message: '数据库未配置，请在 Cloudflare Pages 绑定 D1 数据库'
            }), { status: 500, headers });
        }
        
        const tableReady = await ensureSettingsTable(env);
        if (!tableReady) {
            return new Response(JSON.stringify({
                success: false,
                message: '数据表创建失败，请检查 D1 数据库配置'
            }), { status: 500, headers });
        }
        
        const body = await request.json();
        
        // 更新各个设置项
        if (body.siteTitle !== undefined) {
            await updateSetting(env, 'siteTitle', body.siteTitle);
        }
        if (body.siteSubtitle !== undefined) {
            await updateSetting(env, 'siteSubtitle', body.siteSubtitle);
        }
        if (body.siteLogo !== undefined) {
            await updateSetting(env, 'siteLogo', body.siteLogo);
        }
        if (body.siteKeywords !== undefined) {
            await updateSetting(env, 'siteKeywords', body.siteKeywords);
        }
        if (body.siteDescription !== undefined) {
            await updateSetting(env, 'siteDescription', body.siteDescription);
        }
        if (body.footerText !== undefined) {
            await updateSetting(env, 'footerText', body.footerText);
        }
        if (body.headCustomJs !== undefined) {
            await updateSetting(env, 'headCustomJs', body.headCustomJs);
        }
        if (body.footerCustomJs !== undefined) {
            await updateSetting(env, 'footerCustomJs', body.footerCustomJs);
        }
        if (body.sitePasswordEnabled !== undefined) {
            await updateSetting(env, 'sitePasswordEnabled', body.sitePasswordEnabled);
        }
        if (body.sitePassword !== undefined) {
            await updateSetting(env, 'sitePassword', body.sitePassword);
        }
        if (body.siteTheme !== undefined) {
            await updateSetting(env, 'siteTheme', body.siteTheme);
        }
        if (body.mobileColumns !== undefined) {
            await updateSetting(env, 'mobileColumns', body.mobileColumns);
        }
        if (body.iconfontSymbol !== undefined) {
            await updateSetting(env, 'iconfontSymbol', body.iconfontSymbol);
        }
        if (body.tagsCloud !== undefined) {
            await updateSetting(env, 'tagsCloud', body.tagsCloud);
        }
        if (body.showAdsNav !== undefined) {
            await updateSetting(env, 'showAdsNav', body.showAdsNav);
        }
        if (body.announcement !== undefined) {
            await updateSetting(env, 'announcement', body.announcement);
        }
        if (body.friendLinks !== undefined) {
            await updateSetting(env, 'friendLinks', body.friendLinks);
        }
        if (body.bannerBgImage !== undefined) {
            await updateSetting(env, 'bannerBgImage', body.bannerBgImage);
        }
        
        // 获取更新后的设置
        const settings = await getSettings(env);
        
        return new Response(JSON.stringify({
            success: true,
            settings: {
                ...settings,
                sitePassword: undefined // 不返回密码
            }
        }), { headers });
    } catch (err) {
        console.error('更新设置失败:', err);
        return new Response(JSON.stringify({
            success: false,
            message: '更新失败: ' + err.message
        }), { status: 500, headers });
    }
}

// OPTIONS - CORS 预检
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    });
}