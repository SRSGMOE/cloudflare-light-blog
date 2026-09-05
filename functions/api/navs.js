// ============================================
// 导航数据 API - Cloudflare Functions
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

// 检查并创建导航表（支持排序字段）
async function ensureTable(env) {
    try {
        await env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS navs (
                id TEXT PRIMARY KEY,
                num_id INTEGER,
                title TEXT NOT NULL,
                url TEXT NOT NULL,
                description TEXT DEFAULT '',
                icon TEXT DEFAULT '',
                category TEXT DEFAULT '',
                category_id TEXT DEFAULT '',
                tags TEXT DEFAULT '',
                sort_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `).run();
        
        // 检查列是否存在，不存在则添加
        try {
            const columns = await env.DB.prepare("PRAGMA table_info(navs)").all();
            const hasSortOrder = columns.results.some(col => col.name === 'sort_order');
            const hasCategoryId = columns.results.some(col => col.name === 'category_id');
            const hasTags = columns.results.some(col => col.name === 'tags');
            const hasNumId = columns.results.some(col => col.name === 'num_id');
            
            if (!hasSortOrder) {
                await env.DB.prepare("ALTER TABLE navs ADD COLUMN sort_order INTEGER DEFAULT 0").run();
            }
            if (!hasCategoryId) {
                await env.DB.prepare("ALTER TABLE navs ADD COLUMN category_id TEXT DEFAULT ''").run();
            }
            if (!hasTags) {
                await env.DB.prepare("ALTER TABLE navs ADD COLUMN tags TEXT DEFAULT ''").run();
            }
            if (!hasNumId) {
                await env.DB.prepare("ALTER TABLE navs ADD COLUMN num_id INTEGER").run();
                // 为现有数据生成数字ID
                const { results: existingNavs } = await env.DB.prepare('SELECT id FROM navs ORDER BY created_at ASC').all();
                for (let i = 0; i < existingNavs.length; i++) {
                    await env.DB.prepare('UPDATE navs SET num_id = ? WHERE id = ?').bind(i + 1, existingNavs[i].id).run();
                }
            }
        } catch (e) {
            // 忽略列已存在的错误
        }
        
        return true;
    } catch (err) {
        console.error('确保表存在失败:', err);
        return false;
    }
}

// GET - 获取所有导航（按排序顺序，公开访问）
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
        const numId = url.searchParams.get('num_id');
        
        let query = 'SELECT n.*, c.name as category_name FROM navs n LEFT JOIN categories c ON n.category_id = c.id';
        let params = [];
        
        if (numId) {
            query += ' WHERE n.num_id = ?';
            params.push(parseInt(numId));
        } else if (id) {
            query += ' WHERE n.id = ?';
            params.push(id);
        }
        
        query += ' ORDER BY n.sort_order DESC, n.created_at DESC';
        
        const { results } = await env.DB.prepare(query).bind(...params).all();
        
        // 为没有num_id的记录生成数字ID
        const { results: maxNumIdResult } = await env.DB.prepare('SELECT MAX(num_id) as maxNumId FROM navs').all();
        let currentMaxNumId = maxNumIdResult[0]?.maxNumId || 0;
        
        const navs = [];
        for (const row of results) {
            let numId = row.num_id;
            
            // 如果num_id为null或0，自动生成并更新数据库
            if (!numId || numId === 0) {
                currentMaxNumId++;
                numId = currentMaxNumId;
                await env.DB.prepare('UPDATE navs SET num_id = ? WHERE id = ?').bind(numId, row.id).run();
            }
            
            navs.push({
                id: row.id,
                numId: numId,
                title: row.title,
                url: row.url,
                desc: row.description || row.desc || '',
                icon: row.icon || '',
                category: row.category_name || row.category || '',
                categoryId: row.category_id || '',
                tags: row.tags || '',
                sortOrder: row.sort_order || 0,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            });
        }
        
        return new Response(JSON.stringify({
            success: true,
            navs: navs
        }), { headers });
    } catch (err) {
        console.error('获取导航失败:', err);
        return new Response(JSON.stringify({
            success: false,
            message: '获取数据失败: ' + err.message
        }), { status: 500, headers });
    }
}

// POST - 创建新导航
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
        
        if (!body.title || !body.url) {
            return new Response(JSON.stringify({
                success: false,
                message: '标题和链接为必填项'
            }), { status: 400, headers });
        }
        
        const id = generateId();
        const now = new Date().toISOString();
        const sortOrder = body.sortOrder !== undefined ? parseInt(body.sortOrder) : 0;
        
        // 获取当前最大的num_id
        const { results: maxNumIdResult } = await env.DB.prepare('SELECT MAX(num_id) as maxNumId FROM navs').all();
        const nextNumId = (maxNumIdResult[0]?.maxNumId || 0) + 1;
        
        await env.DB.prepare(`
            INSERT INTO navs (id, num_id, title, url, description, icon, category, category_id, tags, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id,
            nextNumId,
            body.title,
            body.url,
            body.desc || '',
            body.icon || '',
            body.category || '',
            body.categoryId || '',
            body.tags || '',
            sortOrder,
            now,
            now
        ).run();
        
        const newNav = {
            id,
            numId: nextNumId,
            title: body.title,
            url: body.url,
            desc: body.desc || '',
            icon: body.icon || '',
            category: body.category || '',
            categoryId: body.categoryId || '',
            tags: body.tags || '',
            sortOrder: sortOrder,
            createdAt: now,
            updatedAt: now
        };
        
        return new Response(JSON.stringify({
            success: true,
            nav: newNav
        }), { headers });
    } catch (err) {
        console.error('创建导航失败:', err);
        return new Response(JSON.stringify({
            success: false,
            message: '创建失败: ' + err.message
        }), { status: 500, headers });
    }
}

// PUT - 更新导航
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
                message: '缺少导航 ID'
            }), { status: 400, headers });
        }
        
        const body = await request.json();
        
        const { results: existing } = await env.DB.prepare('SELECT * FROM navs WHERE id = ?').bind(id).all();
        
        if (existing.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                message: '导航不存在'
            }), { status: 404, headers });
        }
        
        const now = new Date().toISOString();
        const sortOrder = body.sortOrder !== undefined ? parseInt(body.sortOrder) : (existing[0].sort_order || 0);
        
        await env.DB.prepare(`
            UPDATE navs 
            SET title = ?, url = ?, description = ?, icon = ?, category = ?, category_id = ?, tags = ?, sort_order = ?, updated_at = ?
            WHERE id = ?
        `).bind(
            body.title || existing[0].title,
            body.url || existing[0].url,
            body.desc !== undefined ? body.desc : (existing[0].description || ''),
            body.icon !== undefined ? body.icon : existing[0].icon,
            body.category !== undefined ? body.category : existing[0].category,
            body.categoryId !== undefined ? body.categoryId : (existing[0].category_id || ''),
            body.tags !== undefined ? body.tags : (existing[0].tags || ''),
            sortOrder,
            now,
            id
        ).run();
        
        const updatedNav = {
            id,
            title: body.title || existing[0].title,
            url: body.url || existing[0].url,
            desc: body.desc !== undefined ? body.desc : (existing[0].description || ''),
            icon: body.icon !== undefined ? body.icon : existing[0].icon,
            category: body.category !== undefined ? body.category : existing[0].category,
            categoryId: body.categoryId !== undefined ? body.categoryId : (existing[0].category_id || ''),
            tags: body.tags !== undefined ? body.tags : (existing[0].tags || ''),
            sortOrder: sortOrder,
            createdAt: existing[0].created_at,
            updatedAt: now
        };
        
        return new Response(JSON.stringify({
            success: true,
            nav: updatedNav
        }), { headers });
    } catch (err) {
        console.error('更新导航失败:', err);
        return new Response(JSON.stringify({
            success: false,
            message: '更新失败: ' + err.message
        }), { status: 500, headers });
    }
}

// DELETE - 删除导航
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
                message: '缺少导航 ID'
            }), { status: 400, headers });
        }
        
        const { results: existing } = await env.DB.prepare('SELECT * FROM navs WHERE id = ?').bind(id).all();
        
        if (existing.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                message: '导航不存在'
            }), { status: 404, headers });
        }
        
        await env.DB.prepare('DELETE FROM navs WHERE id = ?').bind(id).run();
        
        return new Response(JSON.stringify({
            success: true,
            message: '删除成功'
        }), { headers });
    } catch (err) {
        console.error('删除导航失败:', err);
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
