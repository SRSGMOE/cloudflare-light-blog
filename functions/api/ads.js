// ============================================
// 广告管理 API - Cloudflare Functions
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

// 生成唯一 ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 检查并创建广告表
async function ensureTable(env) {
    try {
        await env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS ads (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                content TEXT NOT NULL,
                ad_type TEXT DEFAULT 'link',
                sort_order INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `).run();
        
        // 检查并添加 ad_type 字段（如果不存在）
        try {
            await env.DB.prepare('SELECT ad_type FROM ads LIMIT 1').first();
        } catch (e) {
            // 字段不存在，添加它
            await env.DB.prepare('ALTER TABLE ads ADD COLUMN ad_type TEXT DEFAULT \'link\'').run();
        }
        
        // 检查并添加 sort_order 字段（如果不存在）
        try {
            await env.DB.prepare('SELECT sort_order FROM ads LIMIT 1').first();
        } catch (e) {
            // 字段不存在，添加它
            await env.DB.prepare('ALTER TABLE ads ADD COLUMN sort_order INTEGER DEFAULT 0').run();
        }
        
        return true;
    } catch (err) {
        console.error('确保广告表存在失败:', err);
        return false;
    }
}

// GET - 获取所有广告（公开访问，只返回激活的广告）
export async function onRequestGet(context) {
    const { request, env } = context;
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };
    
    try {
        if (!env.DB) {
            return new Response(JSON.stringify({
                success: false,
                message: '数据库未配置，请在 Cloudflare Pages 绑定 D1 数据库'
            }), { status: 500, headers });
        }
        
        await ensureTable(env);
        
        const url = new URL(request.url);
        const showAll = url.searchParams.get('all') === 'true';
        
        let query = 'SELECT * FROM ads';
        if (!showAll) {
            query += ' WHERE is_active = 1';
        }
        query += ' ORDER BY sort_order DESC, created_at DESC';
        
        const { results } = await env.DB.prepare(query).all();
        
        return new Response(JSON.stringify({
            success: true,
            ads: results
        }), { headers });
    } catch (err) {
        console.error('获取广告失败:', err);
        return new Response(JSON.stringify({
            success: false,
            message: '获取数据失败: ' + err.message
        }), { status: 500, headers });
    }
}

// POST - 创建新广告
export async function onRequestPost(context) {
    const { request, env } = context;
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };
    
    if (!await verifyToken(request, env)) {
        return new Response(JSON.stringify({
            success: false,
            message: '未授权'
        }), { status: 401, headers });
    }
    
    try {
        if (!env.DB) {
            return new Response(JSON.stringify({
                success: false,
                message: '数据库未配置，请在 Cloudflare Pages 绑定 D1 数据库'
            }), { status: 500, headers });
        }
        
        const tableReady = await ensureTable(env);
        if (!tableReady) {
            return new Response(JSON.stringify({
                success: false,
                message: '数据表创建失败，请检查 D1 数据库配置'
            }), { status: 500, headers });
        }
        
        const body = await request.json();
        
        if (!body.name || !body.content) {
            return new Response(JSON.stringify({
                success: false,
                message: '广告名称和内容为必填项'
            }), { status: 400, headers });
        }
        
        const id = generateId();
        const now = new Date().toISOString();
        
        await env.DB.prepare(`
            INSERT INTO ads (id, name, content, ad_type, sort_order, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id,
            body.name,
            body.content,
            body.adType || 'link',
            body.sortOrder || 0,
            body.isActive !== undefined ? (body.isActive ? 1 : 0) : 1,
            now,
            now
        ).run();
        
        const newAd = {
            id,
            name: body.name,
            content: body.content,
            ad_type: body.adType || 'link',
            sort_order: body.sortOrder || 0,
            is_active: body.isActive !== undefined ? (body.isActive ? 1 : 0) : 1,
            created_at: now,
            updated_at: now
        };
        
        return new Response(JSON.stringify({
            success: true,
            ad: newAd
        }), { headers });
    } catch (err) {
        console.error('创建广告失败:', err);
        return new Response(JSON.stringify({
            success: false,
            message: '创建失败: ' + err.message
        }), { status: 500, headers });
    }
}

// PUT - 更新广告
export async function onRequestPut(context) {
    const { request, env } = context;
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };
    
    if (!await verifyToken(request, env)) {
        return new Response(JSON.stringify({
            success: false,
            message: '未授权'
        }), { status: 401, headers });
    }
    
    try {
        if (!env.DB) {
            return new Response(JSON.stringify({
                success: false,
                message: '数据库未配置，请在 Cloudflare Pages 绑定 D1 数据库'
            }), { status: 500, headers });
        }
        
        await ensureTable(env);
        
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        
        if (!id) {
            return new Response(JSON.stringify({
                success: false,
                message: '缺少广告 ID'
            }), { status: 400, headers });
        }
        
        const body = await request.json();
        
        const { results: existing } = await env.DB.prepare('SELECT * FROM ads WHERE id = ?').bind(id).all();
        
        if (existing.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                message: '广告不存在'
            }), { status: 404, headers });
        }
        
        const now = new Date().toISOString();
        
        await env.DB.prepare(`
            UPDATE ads 
            SET name = ?, content = ?, ad_type = ?, sort_order = ?, is_active = ?, updated_at = ?
            WHERE id = ?
        `).bind(
            body.name || existing[0].name,
            body.content !== undefined ? body.content : existing[0].content,
            body.adType || existing[0].ad_type || 'link',
            body.sortOrder !== undefined ? body.sortOrder : (existing[0].sort_order || 0),
            body.isActive !== undefined ? (body.isActive ? 1 : 0) : existing[0].is_active,
            now,
            id
        ).run();
        
        const updatedAd = {
            id,
            name: body.name || existing[0].name,
            content: body.content !== undefined ? body.content : existing[0].content,
            ad_type: body.adType || existing[0].ad_type || 'link',
            sort_order: body.sortOrder !== undefined ? body.sortOrder : (existing[0].sort_order || 0),
            is_active: body.isActive !== undefined ? (body.isActive ? 1 : 0) : existing[0].is_active,
            created_at: existing[0].created_at,
            updated_at: now
        };
        
        return new Response(JSON.stringify({
            success: true,
            ad: updatedAd
        }), { headers });
    } catch (err) {
        console.error('更新广告失败:', err);
        return new Response(JSON.stringify({
            success: false,
            message: '更新失败: ' + err.message
        }), { status: 500, headers });
    }
}

// DELETE - 删除广告
export async function onRequestDelete(context) {
    const { request, env } = context;
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };
    
    if (!await verifyToken(request, env)) {
        return new Response(JSON.stringify({
            success: false,
            message: '未授权'
        }), { status: 401, headers });
    }
    
    try {
        if (!env.DB) {
            return new Response(JSON.stringify({
                success: false,
                message: '数据库未配置，请在 Cloudflare Pages 绑定 D1 数据库'
            }), { status: 500, headers });
        }
        
        await ensureTable(env);
        
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        
        if (!id) {
            return new Response(JSON.stringify({
                success: false,
                message: '缺少广告 ID'
            }), { status: 400, headers });
        }
        
        const { results: existing } = await env.DB.prepare('SELECT * FROM ads WHERE id = ?').bind(id).all();
        
        if (existing.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                message: '广告不存在'
            }), { status: 404, headers });
        }
        
        await env.DB.prepare('DELETE FROM ads WHERE id = ?').bind(id).run();
        
        return new Response(JSON.stringify({
            success: true,
            message: '删除成功'
        }), { headers });
    } catch (err) {
        console.error('删除广告失败:', err);
        return new Response(JSON.stringify({
            success: false,
            message: '删除失败: ' + err.message
        }), { status: 500, headers });
    }
}

// OPTIONS - CORS 预检
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    });
}