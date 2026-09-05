// ==================== Agent Key 鉴权模块 ====================

/**
 * 生成 Agent Key（ag_ + 32 位十六进制）
 */
export function generateAgentKey() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return 'ag_' + hex;
}

/**
 * 从请求头提取 Agent Key（支持 Authorization: Bearer 与 X-Agent-Key 两种方式）
 */
export function getAgentKeyFromRequest(request) {
  const auth = request.headers.get('Authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return (request.headers.get('X-Agent-Key') || '').trim();
}

/**
 * 按 key 值查找密钥记录
 */
export async function findAgentKey(env, key) {
  if (!key) return null;
  try {
    const row = await env.DB.prepare('SELECT * FROM agent_keys WHERE key=?').bind(key).first();
    return row || null;
  } catch (e) {
    console.error('[AgentAuth] 查询密钥失败:', e.message || 'Error');
    return null;
  }
}

/**
 * 判断密钥是否具备某权限（read / write）
 */
export function hasPerm(row, perm) {
  if (!row) return false;
  return (row.permissions || '').split(',').map((s) => s.trim()).includes(perm);
}
