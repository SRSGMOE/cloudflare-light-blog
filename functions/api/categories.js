// ============================================
// 分类管理 API - Cloudflare Functions
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

// 检查并创建分类表
async function ensureTable(env) {
    try {
        await env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                category_id TEXT DEFAULT '',
                name TEXT NOT NULL,
                icon TEXT DEFAULT '',
                type TEXT DEFAULT 'link',
                sort_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `).run();
        
        // 检查列是否存在，不存在则添加
        try {
            const columns = await env.DB.prepare("PRAGMA table_info(categories)").all();
            const hasSortOrder = columns.results.some(col => col.name === 'sort_order');
            const hasCategoryId = columns.results.some(col => col.name === 'category_id');
            const hasType = columns.results.some(col => col.name === 'type');
            
            if (!hasSortOrder) {
                await env.DB.prepare("ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0").run();
            }
            if (!hasCategoryId) {
                await env.DB.prepare("ALTER TABLE categories ADD COLUMN category_id TEXT DEFAULT ''").run();
            }
            if (!hasType) {
                await env.DB.prepare("ALTER TABLE categories ADD COLUMN type TEXT DEFAULT 'link'").run();
            }
        } catch (e) {
            // 忽略列已存在的错误
        }
        
        return true;
    } catch (err) {
        console.error('确保分类表存在失败:', err);
        return false;
    }
}

// GET - 获取所有分类（公开访问）
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
        const id = url.searchParams.get('id');
        
        let query = 'SELECT * FROM categories';
        let params = [];
        
        if (id) {
            query += ' WHERE id = ?';
            params.push(id);
        }
        
        query += ' ORDER BY sort_order DESC, created_at DESC';
        
        const { results } = await env.DB.prepare(query).bind(...params).all();
        
        return new Response(JSON.stringify({
            success: true,
            categories: results
        }), { headers });
    } catch (err) {
        console.error('获取分类失败:', err);
        return new Response(JSON.stringify({
            success: false,
            message: '获取数据失败: ' + err.message
        }), { status: 500, headers });
    }
}

// POST - 创建新分类
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
        
        if (!body.name) {
            return new Response(JSON.stringify({
                success: false,
                message: '分类名称为必填项'
            }), { status: 400, headers });
        }
        
        const id = generateId();
        const now = new Date().toISOString();
        const sortOrder = body.sortOrder !== undefined ? parseInt(body.sortOrder) : 0;
        
        await env.DB.prepare(`
            INSERT INTO categories (id, category_id, name, icon, type, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id,
            body.category_id || '',
            body.name,
            body.icon || '',
            body.type || 'link',
            sortOrder,
            now,
            now
        ).run();
        
        const newCategory = {
            id,
            category_id: body.category_id || '',
            name: body.name,
            icon: body.icon || '',
            type: body.type || 'link',
            sort_order: sortOrder,
            created_at: now,
            updated_at: now
        };
        
        return new Response(JSON.stringify({
            success: true,
            category: newCategory
        }), { headers });
    } catch (err) {
        console.error('创建分类失败:', err);
        return new Response(JSON.stringify({
            success: false,
            message: '创建失败: ' + err.message
        }), { status: 500, headers });
    }
}

// PUT - 更新分类
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
                message: '缺少分类 ID'
            }), { status: 400, headers });
        }
        
        const body = await request.json();
        
        const { results: existing } = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(id).all();
        
        if (existing.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                message: '分类不存在'
            }), { status: 404, headers });
        }
        
        const now = new Date().toISOString();
        const sortOrder = body.sortOrder !== undefined ? parseInt(body.sortOrder) : (existing[0].sort_order || 0);
        
        await env.DB.prepare(`
            UPDATE categories 
            SET category_id = ?, name = ?, icon = ?, type = ?, sort_order = ?, updated_at = ?
            WHERE id = ?
        `).bind(
            body.category_id !== undefined ? body.category_id : (existing[0].category_id || ''),
            body.name || existing[0].name,
            body.icon !== undefined ? body.icon : existing[0].icon,
            body.type !== undefined ? body.type : (existing[0].type || 'link'),
            sortOrder,
            now,
            id
        ).run();
        
        const updatedCategory = {
            id,
            category_id: body.category_id !== undefined ? body.category_id : (existing[0].category_id || ''),
            name: body.name || existing[0].name,
            icon: body.icon !== undefined ? body.icon : existing[0].icon,
            type: body.type !== undefined ? body.type : (existing[0].type || 'link'),
            sort_order: sortOrder,
            created_at: existing[0].created_at,
            updated_at: now
        };
        
        return new Response(JSON.stringify({
            success: true,
            category: updatedCategory
        }), { headers });
    } catch (err) {
        console.error('更新分类失败:', err);
        return new Response(JSON.stringify({
            success: false,
            message: '更新失败: ' + err.message
        }), { status: 500, headers });
    }
}

// DELETE - 删除分类
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
                message: '缺少分类 ID'
            }), { status: 400, headers });
        }
        
        const { results: existing } = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(id).all();
        
        if (existing.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                message: '分类不存在'
            }), { status: 404, headers });
        }
        
        // 检查是否有导航使用此分类
        const { results: navsUsingCategory } = await env.DB.prepare(
            'SELECT COUNT(*) as count FROM navs WHERE category = ?'
        ).bind(existing[0].name).all();
        
        if (navsUsingCategory[0].count > 0) {
            return new Response(JSON.stringify({
                success: false,
                message: '该分类下还有导航链接，无法删除'
            }), { status: 400, headers });
        }
        
        await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
        
        return new Response(JSON.stringify({
            success: true,
            message: '删除成功'
        }), { headers });
    } catch (err) {
        console.error('删除分类失败:', err);
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