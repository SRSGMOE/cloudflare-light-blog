// ==================== 认证模块（HMAC + HKDF + 恒定时间比较）====================

const TOKEN_EXPIRY = 48 * 60 * 60 * 1000; // 48小时过期
const HKDF_SALT = 'cloudflare-light-blog-auth-v1'; // HKDF 固定 salt

/**
 * 恒定时间比较（防止时序攻击）
 */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  const ua = new Uint8Array(a);
  const ub = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < ua.length; i++) {
    diff |= ua[i] ^ ub[i];
  }
  return diff === 0;
}

/**
 * 使用 HKDF 从密码派生 32 字节密钥
 */
async function deriveKey(password) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'HKDF',
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: encoder.encode(HKDF_SALT),
      info: encoder.encode('hmac-key')
    },
    keyMaterial,
    256
  );
  return crypto.subtle.importKey(
    'raw',
    derivedBits,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

// PBKDF2 迭代次数（1 万次，兼顾 Workers 免费层 10ms CPU 限制与安全）
const PBKDF2_ITERATIONS = 10000;

function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  return new Uint8Array((hex.match(/.{2}/g) || []).map((b) => parseInt(b, 16)));
}

async function derivePBKDF2(password, salt, iterations) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    keyMaterial,
    256
  );
  return new Uint8Array(derivedBits);
}

/**
 * 旧版 HMAC 哈希（仅用于向后兼容已存的旧密码）
 */
async function legacyHashPassword(password) {
  const encoder = new TextEncoder();
  const key = await deriveKey('password-salt-' + HKDF_SALT);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(password));
  return bytesToHex(new Uint8Array(sig));
}

/**
 * 哈希密码（PBKDF2-SHA256 + 随机盐，格式：盐Hex:迭代次数:哈希Hex）
 */
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await derivePBKDF2(password, salt, PBKDF2_ITERATIONS);
  return bytesToHex(salt) + ':' + PBKDF2_ITERATIONS + ':' + bytesToHex(derived);
}

/**
 * 验证密码哈希（兼容三种格式：salt:iterations:hash、旧 salt:hash(100k)、旧版纯 HMAC）
 */
export async function verifyPasswordHash(password, stored) {
  if (!stored || typeof stored !== 'string') return false;
  try {
    const parts = stored.split(':');
    if (parts.length === 3) {
      // 新格式：salt:iterations:hash
      const [saltHex, iterStr, hashHex] = parts;
      const iterations = parseInt(iterStr, 10);
      if (!saltHex || !hashHex || isNaN(iterations) || iterations <= 0) return false;
      const derived = await derivePBKDF2(password, hexToBytes(saltHex), iterations);
      return timingSafeEqual(derived, hexToBytes(hashHex));
    }
    if (parts.length === 2) {
      // 旧 v1.3.1 格式：salt:hash（按 100000 次迭代验证）
      const [saltHex, hashHex] = parts;
      if (!saltHex || !hashHex) return false;
      const derived = await derivePBKDF2(password, hexToBytes(saltHex), 100000);
      return timingSafeEqual(derived, hexToBytes(hashHex));
    }
    // 更早的 64 位十六进制 HMAC
    const legacy = await legacyHashPassword(password);
    return timingSafeEqual(hexToBytes(legacy), hexToBytes(stored));
  } catch (e) {
    console.error('[Auth] 验证密码失败:', e.message || 'Error');
    return false;
  }
}

/**
 * 生成认证令牌（带过期时间）
 * 格式: timestamp.signature
 */
export async function generateToken(password) {
  const timestamp = Date.now();
  const key = await deriveKey(password);
  const encoder = new TextEncoder();
  const data = encoder.encode(`auth:${timestamp}`);
  const signature = await crypto.subtle.sign('HMAC', key, data);
  const sigHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${timestamp}.${sigHex}`;
}

/**
 * 验证认证令牌（恒定时间比较）
 */
export async function verifyToken(token, password) {
  if (!token || !password) return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [timestampStr, sigHex] = parts;
  const timestamp = parseInt(timestampStr, 10);

  if (isNaN(timestamp)) return false;
  if (Date.now() - timestamp > TOKEN_EXPIRY) return false;

  try {
    const key = await deriveKey(password);
    const encoder = new TextEncoder();
    const data = encoder.encode(`auth:${timestamp}`);
    const expectedSig = await crypto.subtle.sign('HMAC', key, data);
    const expectedHex = Array.from(new Uint8Array(expectedSig))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    // 恒定时间比较
    return timingSafeEqual(
      new Uint8Array(sigHex.match(/.{2}/g).map(b => parseInt(b, 16))),
      new Uint8Array(expectedHex.match(/.{2}/g).map(b => parseInt(b, 16)))
    );
  } catch (e) {
    console.error('[Auth]', e.message || 'Error');
    return false;
  }
}

/**
 * 从请求中提取并验证 token
 */
export async function authenticateRequest(request, env) {
  // fail-closed：未配置 ADMIN_PASSWORD 时拒绝所有管理操作，避免生产环境误开放
  if (!env.ADMIN_PASSWORD) return false;

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;

  const token = authHeader.replace('Bearer ', '');
  return verifyToken(token, env.ADMIN_PASSWORD);
}
