// ============================================
// 诊断 API - Cloudflare Functions
// 用于检查 D1 数据库配置是否正确
// ============================================

export async function onRequestGet(context) {
    const { env } = context;
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
    };
    
    try {
        const result = {
            success: true,
            checks: []
        };
        
        // 检查 1: DB 绑定是否存在
        if (!env.DB) {
            result.checks.push({
                name: 'D1 数据库绑定',
                status: 'error',
                message: '未找到 DB 绑定',
                solution: '请在 Pages → Settings → Functions → D1 database bindings 中添加绑定，Variable name 填写 DB'
            });
            
            // 如果没有 DB 绑定，直接返回，不要继续检查
            return new Response(JSON.stringify(result), { headers });
        } else {
            result.checks.push({
                name: 'D1 数据库绑定',
                status: 'success',
                message: 'DB 绑定已存在'
            });
        }
        
        // 检查 2: 数据库连接是否正常
        try {
            const testResult = await env.DB.prepare('SELECT 1 as test').first();
            result.checks.push({
                name: '数据库连接',
                status: 'success',
                message: '数据库连接正常'
            });
        } catch (err) {
            result.checks.push({
                name: '数据库连接',
                status: 'error',
                message: '数据库连接失败: ' + err.message,
                solution: '请检查 D1 数据库是否已创建，以及绑定配置是否正确'
            });
        }
        
        // 检查 3: navs 表是否存在
        try {
            const tableCheck = await env.DB.prepare(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='navs'"
            ).first();
            
            if (tableCheck) {
                result.checks.push({
                    name: 'navs 表',
                    status: 'success',
                    message: 'navs 表已存在'
                });
            } else {
                result.checks.push({
                    name: 'navs 表',
                    status: 'warning',
                    message: 'navs 表不存在，请点击「🔧 初始化数据库」按钮创建'
                });
            }
        } catch (err) {
            result.checks.push({
                name: 'navs 表',
                status: 'error',
                message: '检查表失败: ' + err.message
            });
        }
        
        // 检查 4: settings 表是否存在
        try {
            const tableCheck = await env.DB.prepare(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='settings'"
            ).first();
            
            if (tableCheck) {
                result.checks.push({
                    name: 'settings 表',
                    status: 'success',
                    message: 'settings 表已存在'
                });
            } else {
                result.checks.push({
                    name: 'settings 表',
                    status: 'warning',
                    message: 'settings 表不存在，请点击「🔧 初始化数据库」按钮创建'
                });
            }
        } catch (err) {
            result.checks.push({
                name: 'settings 表',
                status: 'error',
                message: '检查表失败: ' + err.message
            });
        }
        
        // 检查 5: ADMIN_PASSWORD 环境变量
        if (env.ADMIN_PASSWORD) {
            result.checks.push({
                name: '管理密码',
                status: 'success',
                message: '已通过环境变量设置'
            });
        } else {
            result.checks.push({
                name: '管理密码',
                status: 'warning',
                message: '使用默认密码 admin123',
                solution: '建议在 Pages → Settings → Environment variables 中设置 ADMIN_PASSWORD'
            });
        }
        
        return new Response(JSON.stringify(result), { headers });
        
    } catch (err) {
        // 捕获所有未预期的错误
        return new Response(JSON.stringify({
            success: false,
            error: err.message,
            stack: err.stack,
            checks: [{
                name: '系统错误',
                status: 'error',
                message: '诊断过程中发生错误: ' + err.message,
                solution: '请检查 Cloudflare Pages 的 Functions 日志获取更多信息'
            }]
        }), { status: 500, headers });
    }
}

// OPTIONS - CORS 预检
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}
