// ==================== 数据库模块（优化初始化）====================

import { hashPassword } from './auth.js';

// ==================== Settings 内存缓存 ====================
let settingsCache = null;
let settingsCacheTime = 0;
let settingsLoadPromise = null;
const SETTINGS_CACHE_TTL = 60 * 1000; // 缓存 60 秒

/**
 * 获取所有设置（带内存缓存）
 */
export async function getSettings(env) {
  // 缓存命中且未过期
  if (settingsCache && Date.now() - settingsCacheTime < SETTINGS_CACHE_TTL) {
    return settingsCache;
  }
  if (settingsLoadPromise) return settingsLoadPromise;

  settingsLoadPromise = (async () => {
    const defaults = {
      site_name: '我的博客',
      site_description: '',
      site_bio: '',
      site_author: '',
      site_created_at: '',
      site_footer: '',
      custom_js: '',
      iconfont_css: '',
      site_links: '',
      links_title: '友链',
      site_theme: 'animal-forest',
      enable_tag_cloud: '1',
      profile_position: 'left',
      tag_cloud_position: 'left',
      pinned_post_id: '',
      copyright_notice: '',
      ad_content: '',
      ad_position: 'left',
      allow_robots: '1',
      enable_compression: '0',
      allowed_origins: '*',
      site_password: ''
    };

    try {
      const { results } = await env.DB.prepare("SELECT key, value FROM settings").all();
      if (results) {
        // 过滤速率限制等内部记录，避免污染设置数据
        results.forEach(s => {
          if (s.key.includes('_rate_')) return;
          defaults[s.key] = s.value || '';
        });
      }
    } catch (e) {
      console.error('[DB] 获取设置失败:', e);
    }

    settingsCache = defaults;
    settingsCacheTime = Date.now();
    return defaults;
  })();

  try {
    return await settingsLoadPromise;
  } finally {
    settingsLoadPromise = null;
  }
}

/**
 * 清除设置缓存（保存设置后调用）
 */
function invalidateSettingsCache() {
  settingsCache = null;
  settingsCacheTime = 0;
}

/**
 * 保存设置（批量）
 */
export async function saveSettings(env, settingsObj) {
  const entries = Object.entries(settingsObj).filter(([key, value]) => value !== undefined && value !== null);
  for (const [key, value] of entries) {
    // 全站密码需要哈希存储
    if (key === 'site_password' && value && value.trim()) {
      const hashed = await hashPassword(value);
      await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").bind(key, hashed).run();
    } else if (key === 'site_password') {
      // 空密码直接存储
      await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").bind(key, '').run();
    } else {
      await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").bind(key, String(value)).run();
    }
  }
  // 保存后清除缓存
  invalidateSettingsCache();
}
