// ==================== 图片处理模块（优化内存使用）====================

import { generateRandomFilename } from './utils.js';

/**
 * 处理 R2 图片请求
 */
export async function handleImage(request, env, path) {
  const filename = path.replace('/images/', '');

  // 验证文件名（防止路径遍历 + 非法字符）
  const SAFE_FILENAME = /^[a-zA-Z0-9_-]{1,64}\.(jpg|jpeg|png|gif|webp|svg|ico|x-icon|avif|bmp|tiff)$/;
  if (!filename || !SAFE_FILENAME.test(filename)) {
    return new Response('Bad Request', { status: 400 });
  }

  if (!env.R2) {
    return new Response('Not Found', { status: 404 });
  }

  try {
    const object = await env.R2.get(filename);
    if (!object) {
      return new Response('Not Found', { status: 404 });
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (e) {
    console.error('[Image] R2 读取失败:', e);
    return new Response('Internal Error', { status: 500 });
  }
}

/**
 * 上传图片到 R2（仅处理编辑器粘贴的 data: URI）
 */
export async function uploadImage(env, data, prefix) {
  try {
    if (typeof data !== 'string' || !data.startsWith('data:')) {
      return data; // 无法处理，原样返回
    }

    const matches = data.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) return data;

    const contentType = matches[1];
    const binaryStr = atob(matches[2]);
    const arrayBuffer = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      arrayBuffer[i] = binaryStr.charCodeAt(i);
    }
    const ext = contentType.split('/')[1] || 'jpg';

    const filename = `${prefix}_${generateRandomFilename()}.${ext}`;

    if (env.R2) {
      await env.R2.put(filename, arrayBuffer, {
        httpMetadata: { contentType }
      });
      return `/images/${filename}`;
    }

    // 无 R2：返回空，不再以 base64 存库（避免 D1 膨胀）
    return '';
  } catch (e) {
    console.error('[Image] 上传失败:', e);
    return '';
  }
}

/**
 * 列出 R2 存储桶中的图片（含文章封面图；游标分页，返回单页 + 下一页游标）
 */
export async function listImages(env, limit = 50, cursor) {
  if (!env.R2) return { configured: false, images: [], cursor: undefined, hasMore: false };
  const page = await env.R2.list({ limit: Math.min(200, Math.max(1, limit)), cursor });
  const images = (page.objects || []).map((obj) => ({
    key: obj.key,
    url: '/images/' + obj.key,
    size: obj.size,
    uploaded: obj.uploaded ? new Date(obj.uploaded).toISOString() : ''
  }));
  images.sort((a, b) => (b.uploaded || '').localeCompare(a.uploaded || ''));
  return {
    configured: true,
    images,
    cursor: page.truncated ? page.cursor : undefined,
    hasMore: !!page.truncated
  };
}

/**
 * 处理文件上传请求（优化：直接传 ArrayBuffer 到 R2）
 */
export async function handleUpload(request, env) {
  try {
    const formData = await request.formData();

    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return { error: '没有文件', status: 400 };
    }

    // 文件大小限制（2MB）
    const MAX_SIZE = 2 * 1024 * 1024;
    const arrayBuffer = await file.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_SIZE) {
      return { error: '文件大小不能超过 2MB', status: 400 };
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (file.type && !allowedTypes.includes(file.type)) {
      return { error: '不支持的文件类型', status: 400 };
    }

    const ext = ({ 'image/svg+xml': 'svg' })[file.type] || (file.type?.split('/')[1] || 'jpg');
    const filename = `${generateRandomFilename()}.${ext}`;

    if (env.R2) {
      await env.R2.put(filename, arrayBuffer, {
        httpMetadata: { contentType: file.type || 'image/jpeg' }
      });
      return { url: `/images/${filename}` };
    }

    // 未配置 R2：直接报错，不再回退 base64（避免大图 base64 塞库导致页面膨胀/崩溃）
    return { error: '未配置 R2 存储桶，无法上传图片', status: 400 };
  } catch (e) {
    console.error('[Image] 上传处理失败:', e);
    return { error: '上传失败', status: 500 };
  }
}
