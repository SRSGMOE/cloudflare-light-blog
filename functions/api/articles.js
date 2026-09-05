// ============================================
// 文章管理 API - Cloudflare Functions
// 使用 D1 数据库存储
// ============================================

// 生成唯一 ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 验证 token
async function verifyToken(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }
    return true;
}

// 检查并创建文章表
async function ensureTable(env) {
    try {
        await env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS articles (
                id TEXT PRIMARY KEY,
                num_id INTEGER,
                title TEXT NOT NULL,
                url TEXT NOT NULL,
                content TEXT DEFAULT '',
                summary TEXT DEFAULT '',
                cover TEXT DEFAULT '',
                category_id TEXT DEFAULT '',
                tags TEXT DEFAULT '',
                is_published INTEGER DEFAULT 1,
                sort_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `).run();
        
        // 检查列是否存在，不存在则添加
        try {
            const columns = await env.DB.prepare("PRAGMA table_info(articles)").all();
            const columnNames = columns.results.map(col => col.name);
            
            if (!columnNames.includes('summary')) {
                await env.DB.prepare("ALTER TABLE articles ADD COLUMN summary TEXT DEFAULT ''").run();
            }
            if (!columnNames.includes('cover')) {
                await env.DB.prepare("ALTER TABLE articles ADD COLUMN cover TEXT DEFAULT ''").run();
            }
            if (!columnNames.includes('is_published')) {
                await env.DB.prepare("ALTER TABLE articles ADD COLUMN is_published INTEGER DEFAULT 1").run();
            }
            if (!columnNames.includes('num_id')) {
                await env.DB.prepare("ALTER TABLE articles ADD COLUMN num_id INTEGER").run();
                // 为现有数据生成数字ID
                const { results: existingArticles } = await env.DB.prepare('SELECT id FROM articles ORDER BY created_at ASC').all();
                for (let i = 0; i < existingArticles.length; i++) {
                    await env.DB.prepare('UPDATE articles SET num_id = ? WHERE id = ?').bind(i + 1, existingArticles[i].id).run();
                }
            }
        } catch (e) {
            // 忽略列已存在的错误
        }
        
        return true;
    } catch (err) {
        console.error('确保文章表存在失败:', err);
        return false;
    }
}

// GET - 获取文章列表
export async function onRequestGet(context) {
    const { request, env } = context;
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };
    
    try {
        if (!env.DB) {
            return new Response(JSON.stringify({
                success: true,
                articles: []
            }), { headers });
        }
        
        await ensureTable(env);
        
        const url = new URL(request.url);
        const categoryId = url.searchParams.get('category_id');
        const published = url.searchParams.get('published');
        const numId = url.searchParams.get('num_id');
        const id = url.searchParams.get('id');
        
        let query = 'SELECT * FROM articles';
        const params = [];
        const conditions = [];
        
        if (numId) {
            conditions.push('num_id = ?');
            params.push(parseInt(numId));
        } else if (id) {
            conditions.push('id = ?');
            params.push(id);
        }
        
        if (categoryId) {
            conditions.push('category_id = ?');
            params.push(categoryId);
        }
        
        if (published !== null) {
            conditions.push('is_published = ?');
            params.push(parseInt(published));
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' ORDER BY sort_order DESC, created_at DESC';
        
        let stmt = env.DB.prepare(query);
        if (params.length > 0) {
            stmt = stmt.bind(...params);
        }
        
        const { results } = await stmt.all();
        
        // 为没有num_id的记录生成数字ID
        const { results: maxNumIdResult } = await env.DB.prepare('SELECT MAX(num_id) as maxNumId FROM articles').all();
        let currentMaxNumId = maxNumIdResult[0]?.maxNumId || 0;
        
        const articles = [];
        for (const row of results) {
            let numId = row.num_id;
            
            // 如果num_id为null或0，自动生成并更新数据库
            if (!numId || numId === 0) {
                currentMaxNumId++;
                numId = currentMaxNumId;
                await env.DB.prepare('UPDATE articles SET num_id = ? WHERE id = ?').bind(numId, row.id).run();
            }
            
            articles.push({
                id: row.id,
                numId: numId,
                title: row.title,
                url: row.url,
                content: row.content || '',
                summary: row.summary || '',
                cover: row.cover || '',
                categoryId: row.category_id || '',
                tags: row.tags || '',
                isPublished: row.is_published === 1,
                sortOrder: row.sort_order || 0,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            });
        }
        
        return new Response(JSON.stringify({
            success: true,
            articles: articles
        }), { headers });
    } catch (err) {
        console.error('获取文章失败:', err);
        return new Response(JSON.stringify({
            success: false,
            error: '获取文章失败: ' + err.message
        }), { status: 500, headers });
    }
}

// POST - 创建文章
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
                message: '数据库未配置'
            }), { status: 500, headers });
        }
        
        await ensureTable(env);
        
        const body = await request.json();
        
        if (!body.title || !body.url) {
            return new Response(JSON.stringify({
                success: false,
                message: '标题和链接不能为空'
            }), { status: 400, headers });
        }
        
        const id = generateId();
        const now = new Date().toISOString();
        const sortOrder = body.sortOrder !== undefined ? parseInt(body.sortOrder) : 0;
        
        // 获取当前最大的num_id
        const { results: maxNumIdResult } = await env.DB.prepare('SELECT MAX(num_id) as maxNumId FROM articles').all();
        const nextNumId = (maxNumIdResult[0]?.maxNumId || 0) + 1;
        
        await env.DB.prepare(`
            INSERT INTO articles (id, num_id, title, url, content, summary, cover, category_id, tags, is_published, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id,
            nextNumId,
            body.title,
            body.url,
            body.content || '',
            body.summary || '',
            body.cover || '',
            body.categoryId || '',
            body.tags || '',
            body.isPublished !== false ? 1 : 0,
            sortOrder,
            now,
            now
        ).run();
        
        const newArticle = {
            id,
            numId: nextNumId,
            title: body.title,
            url: body.url,
            content: body.content || '',
            summary: body.summary || '',
            cover: body.cover || '',
            categoryId: body.categoryId || '',
            tags: body.tags || '',
            isPublished: body.isPublished !== false,
            sortOrder: sortOrder,
            createdAt: now,
            updatedAt: now
        };
        
        return new Response(JSON.stringify({
            success: true,
            article: newArticle
        }), { headers });
    } catch (err) {
        console.error('创建文章失败:', err);
        return new Response(JSON.stringify({
            success: false,
            message: '创建失败: ' + err.message
        }), { status: 500, headers });
    }
}

// PUT - 更新文章
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
                message: '数据库未配置'
            }), { status: 500, headers });
        }
        
        await ensureTable(env);
        
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        
        if (!id) {
            return new Response(JSON.stringify({
                success: false,
                message: '缺少文章ID'
            }), { status: 400, headers });
        }
        
        const body = await request.json();
        
        // 获取现有文章
        const { results: existing } = await env.DB.prepare(
            'SELECT * FROM articles WHERE id = ?'
        ).bind(id).all();
        
        if (existing.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                message: '文章不存在'
            }), { status: 404, headers });
        }
        
        const now = new Date().toISOString();
        const sortOrder = body.sortOrder !== undefined ? parseInt(body.sortOrder) : (existing[0].sort_order || 0);
        
        await env.DB.prepare(`
            UPDATE articles 
            SET title = ?, url = ?, content = ?, summary = ?, cover = ?, category_id = ?, tags = ?, is_published = ?, sort_order = ?, updated_at = ?
            WHERE id = ?
        `).bind(
            body.title || existing[0].title,
            body.url || existing[0].url,
            body.content !== undefined ? body.content : existing[0].content,
            body.summary !== undefined ? body.summary : existing[0].summary,
            body.cover !== undefined ? body.cover : existing[0].cover,
            body.categoryId !== undefined ? body.categoryId : existing[0].category_id,
            body.tags !== undefined ? body.tags : existing[0].tags,
            body.isPublished !== undefined ? (body.isPublished ? 1 : 0) : existing[0].is_published,
            sortOrder,
            now,
            id
        ).run();
        
        const updatedArticle = {
            id,
            title: body.title || existing[0].title,
            url: body.url || existing[0].url,
            content: body.content !== undefined ? body.content : existing[0].content,
            summary: body.summary !== undefined ? body.summary : existing[0].summary,
            cover: body.cover !== undefined ? body.cover : existing[0].cover,
            categoryId: body.categoryId !== undefined ? body.categoryId : existing[0].category_id,
            tags: body.tags !== undefined ? body.tags : existing[0].tags,
            isPublished: body.isPublished !== undefined ? body.isPublished : existing[0].is_published === 1,
            sortOrder: sortOrder,
            createdAt: existing[0].created_at,
            updatedAt: now
        };
        
        return new Response(JSON.stringify({
            success: true,
            article: updatedArticle
        }), { headers });
    } catch (err) {
        console.error('更新文章失败:', err);
        return new Response(JSON.stringify({
            success: false,
            message: '更新失败: ' + err.message
        }), { status: 500, headers });
    }
}

// DELETE - 删除文章
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
                message: '数据库未配置'
            }), { status: 500, headers });
        }
        
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        
        if (!id) {
            return new Response(JSON.stringify({
                success: false,
                message: '缺少文章ID'
            }), { status: 400, headers });
        }
        
        await env.DB.prepare('DELETE FROM articles WHERE id = ?').bind(id).run();
        
        return new Response(JSON.stringify({
            success: true,
            message: '删除成功'
        }), { headers });
    } catch (err) {
        console.error('删除文章失败:', err);
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
