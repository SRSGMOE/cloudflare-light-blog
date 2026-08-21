// ==================== 文章详情页（SEO 优化）====================

import { escapeHtml, renderAdContent } from '../lib/utils.js';
import { getTheme } from '../themes/index.js';

export function getPostHTML(post, settings, requestUrl) {
  settings = settings || {};
  const siteName = settings.site_name || '我的博客';
  const siteDesc = settings.site_description || '';
  const siteAuthor = settings.site_author || siteName;
  const postExcerpt = post.excerpt || (post.content ? post.content.substring(0, 160).split('#').join('').split('*').join('').split('\n').join(' ').trim() : '');
  const currentTheme = getTheme(settings.site_theme);
  // 表情包资源：.js 为 Symbol（多色 SVG）模式，.css 为 Font class（单色字体）模式
  const iconfontUrl = settings.iconfont_css ? (settings.iconfont_css.startsWith('//') ? 'https:' + settings.iconfont_css : settings.iconfont_css) : '';
  const iconfontTag = iconfontUrl ? (iconfontUrl.split('?')[0].endsWith('.js') ? `<script src="${iconfontUrl}"></script>` : `<link href="${iconfontUrl}" rel="stylesheet">`) : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(post.title)} - ${escapeHtml(siteName)}</title>
  <meta name="description" content="${escapeHtml(postExcerpt)}">
  <meta name="author" content="${escapeHtml(siteAuthor)}">
  <meta name="robots" content="index, follow">
  <link rel="icon" href="/icon/favicon.ico">
  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${new URL('/post/' + new Date(post.created_at).getFullYear() + String(new Date(post.created_at).getMonth()+1).padStart(2,'0') + '/' + post.id, requestUrl).href}">
  <link rel="canonical" href="/post/${new Date(post.created_at).getFullYear()}${String(new Date(post.created_at).getMonth()+1).padStart(2,'0')}/${post.id}">
  <meta property="og:title" content="${escapeHtml(post.title)}">
  <meta property="og:description" content="${escapeHtml(postExcerpt)}">
  <meta property="og:site_name" content="${escapeHtml(siteName)}">
  <meta property="article:published_time" content="${post.published_at || post.created_at}">
  <meta property="article:modified_time" content="${post.updated_at}">
  ${post.category ? `<meta property="article:section" content="${escapeHtml(post.category)}">` : ''}
  ${post.tags ? post.tags.split(',').map(t => `<meta property="article:tag" content="${escapeHtml(t.trim())}">`).join('\n  ') : ''}
  ${post.cover_image ? `<meta property="og:image" content="${escapeHtml(post.cover_image)}">` : ''}
  <!-- Twitter Card -->
  <meta name="twitter:card" content="${post.cover_image ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:title" content="${escapeHtml(post.title)}">
  <meta name="twitter:description" content="${escapeHtml(postExcerpt)}">
  ${post.cover_image ? `<meta name="twitter:image" content="${escapeHtml(post.cover_image)}">` : ''}
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": postExcerpt,
    "datePublished": post.published_at || post.created_at,
    "dateModified": post.updated_at,
    "author": { "@type": "Person", "name": settings.site_author || siteName },
    "mainEntityOfPage": { "@type": "WebPage" }
  })}</script>
  ${currentTheme.fontUrl ? `<link href="${currentTheme.fontUrl}" rel="stylesheet">` : ''}
  ${iconfontTag}
  <style>
    :root {
      --header-bg: ${currentTheme.headerBg};
      --card-bg: ${currentTheme.cardBg};
      --card-border: ${currentTheme.cardBorder};
      --body-bg: ${currentTheme.bodyBg};
      --text-primary: ${currentTheme.textPrimary};
      --text-body: ${currentTheme.textBody};
      --text-secondary: ${currentTheme.textSecondary};
      --btn-bg: ${currentTheme.btnBg};
      --btn-shadow: ${currentTheme.btnShadow};
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ${currentTheme.fontFamily}; background: var(--body-bg); color: var(--text-body); overflow-x: hidden; }
    button, input, select, textarea { font-family: inherit; }
    .content-area { width: 792px; flex-shrink: 0; min-width: 0; }
    header { background: var(--header-bg); color: #fff; padding: 40px 20px; text-align: center; position: relative; overflow: hidden; }
    header::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 40px; background: linear-gradient(transparent, rgba(0,0,0,0.05)); }
    header h1 { font-size: 2.5em; font-weight: 800; margin-bottom: 8px; }
    header a { color: #fff; text-decoration: none; }
    header p { opacity: 0.9; font-size: 1.1em; font-weight: 500; }
    main { max-width: 1400px; margin: 30px auto; padding: 0 20px; display: flex; gap: 24px; align-items: flex-start; justify-content: center; }
    .sidebar { width: 280px; flex-shrink: 0; }
    .sidebar-right { width: 280px; flex-shrink: 0; }
    .profile-card { background: var(--card-bg); border-radius: 20px; padding: 24px; box-shadow: 0 4px 10px rgba(107, 92, 67, 0.42); border: 2px solid var(--card-border); }
    .profile-card .avatar { width: 150px; height: 150px; border-radius: 50%; object-fit: cover; margin: 0 auto 14px; display: block; border: 3px solid var(--card-border); background: var(--card-bg); }
    .profile-card .name { font-size: 1.1em; font-weight: 700; text-align: center; margin-bottom: 4px; color: var(--text-primary); }
    .profile-card .bio { color: var(--text-body); font-size: 0.85em; text-align: center; margin-bottom: 14px; }
    .profile-card .stats { display: flex; justify-content: center; gap: 16px; padding-bottom: 14px; }
    .profile-card .stat-item { text-align: center; }
    .profile-card .stat-num { font-size: 1.1em; font-weight: 800; color: var(--btn-bg); }
    .profile-card .stat-label { font-size: 0.75em; color: var(--text-secondary); font-weight: 600; }
    .profile-card h4 { font-size: 0.85em; color: var(--text-secondary); margin: 14px 0 8px; font-weight: 700; }
    .profile-card .category-list a, .profile-card .link-list a { display: block; padding: 8px 12px; margin: 0 0 6px 0; color: var(--text-body); text-decoration: none; background: var(--body-bg); border-radius: 12px; font-size: 0.85em; font-weight: 600; transition: all 0.2s; border: 2px solid transparent; }
    .profile-card .category-list a:hover, .profile-card .link-list a:hover { background: #e6f9f6; border-color: var(--btn-bg); color: var(--btn-shadow); }
    .ad-container img { width: 100%; aspect-ratio: 1/1; object-fit: cover; border-radius: 0; display: block; margin: 0; }
    .post-article { background: var(--card-bg); padding: 36px; border-radius: 20px; box-shadow: 0 4px 10px rgba(107, 92, 67, 0.42); border: 2px solid var(--card-border); word-break: break-word; overflow-wrap: break-word; }
    .post-article i.iconfont { font-size: 1.8em; vertical-align: middle; line-height: 1; }
    .post-article svg.icon { width: 1.8em; height: 1.8em; vertical-align: middle; fill: currentColor; overflow: hidden; }
    .post-article h1 { font-size: 1.8em; margin-bottom: 16px; color: var(--text-primary); font-weight: 800; line-height: 1.3; }
    .post-article p { margin: 0.8em 0; line-height: 1.8; }
    .post-article img, .post-article iframe, .post-article video { max-width: 100%; height: auto; }
    .post-article img { margin: 1em 0; border-radius: 12px; cursor: zoom-in; }
    .post-article img:hover { transform: scale(1.02); transition: transform 0.2s; }
    .post-article table { display: block; width: 100%; max-width: 100%; overflow-x: auto; border-collapse: collapse; margin: 1em 0; -webkit-overflow-scrolling: touch; }
    .post-article th, .post-article td { padding: 8px 12px; border: 1px solid var(--card-border); }
    .post-article th { background: var(--body-bg); font-weight: 700; }
    .icon-img { cursor: default !important; pointer-events: none; }
    .icon-img:hover { transform: none !important; }
    .post-meta { color: var(--text-secondary); font-size: 0.85em; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid var(--card-border); font-weight: 600; display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; }
    .back-link { display: inline-block; margin-bottom: 20px; padding: 10px 24px; background: var(--btn-bg); color: #fff; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 0.9em; box-shadow: 0 4px 0 0 var(--btn-shadow); transition: all 0.25s; }
    .back-link:hover { transform: translateY(-1px); box-shadow: 0 5px 0 0 var(--btn-shadow); }
    footer { text-align: center; padding: 30px 20px; color: var(--text-secondary); font-size: 0.85em; }
    .lightbox { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.92); z-index: 2000; display: none; align-items: center; justify-content: center; cursor: zoom-out; }
    .lightbox.active { display: flex; }
    .lightbox img { max-width: 85%; max-height: 85%; border-radius: 12px; border: 4px solid rgba(255,255,255,0.3); box-shadow: 0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1); cursor: default; transition: opacity 0.2s; }
    .lightbox-close { position: absolute; top: 20px; right: 20px; width: 44px; height: 44px; background: rgba(255,255,255,0.15); border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; color: #fff; font-size: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 1; transition: all 0.2s; }
    .lightbox-close:hover { background: rgba(255,255,255,0.3); border-color: rgba(255,255,255,0.5); }
    .lightbox-bottom { position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 16px; background: rgba(0,0,0,0.5); padding: 8px 20px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.15); }
    .lightbox-nav { width: 36px; height: 36px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); border-radius: 50%; color: #fff; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; user-select: none; flex-shrink: 0; }
    .lightbox-nav:hover { background: rgba(255,255,255,0.3); border-color: rgba(255,255,255,0.5); }
    .lightbox-nav:active { transform: scale(0.9); }
    .lightbox-counter { color: rgba(255,255,255,0.8); font-size: 14px; font-weight: 600; white-space: nowrap; min-width: 50px; text-align: center; }
    .back-to-top { position: fixed; bottom: 30px; right: 30px; width: 44px; height: 44px; background: var(--btn-bg); color: #fff; border: none; border-radius: 50%; font-size: 20px; cursor: pointer; box-shadow: 0 4px 0 0 var(--btn-shadow); display: flex; align-items: center; justify-content: center; z-index: 998; opacity: 0; pointer-events: none; transition: all 0.25s; }
    .back-to-top.show { opacity: 1; pointer-events: auto; }
    .tag-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      filter: brightness(0.95);
    }
    .mobile-nav-toggle { display: none; position: fixed; top: 12px; left: 12px; z-index: 1004; width: 40px; height: 40px; background: var(--btn-bg); border: none; border-radius: 12px; color: #fff; font-size: 20px; cursor: pointer; box-shadow: 0 3px 0 var(--btn-shadow); transition: left 0.3s; }
    .mobile-nav-toggle.nav-open { left: 208px !important; }
    .mobile-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999; }
    .mobile-overlay.show { display: block; }
    @media (max-width: 768px) {
      header { padding: 16px; }
      header h1 { font-size: 1.4em; }
      header p { font-size: 0.85em; }
      .mobile-nav-toggle { display: flex; align-items: center; justify-content: center; }
      .mobile-overlay.show { display: block; }
      main { flex-direction: row; padding: 0 12px; gap: 0; margin-top: 12px; position: relative; }
      .sidebar, .sidebar-right { width: 260px; position: fixed; top: 0; left: -260px; height: 100vh; z-index: 1002; transition: left 0.3s ease; overflow-y: auto; background: var(--body-bg); padding: 16px; box-shadow: 2px 0 8px rgba(0,0,0,0.1); display: block; }
      .sidebar.open, .sidebar-right.open { left: 0; }
      .profile-card { border-radius: 16px; padding: 16px; }
      .profile-card .avatar { width: 120px; height: 120px; }
      .profile-card .name { font-size: 1em; }
      .content-area { width: 100%; min-width: 0; flex-shrink: 1; }
      .post-article { padding: 20px 16px; border-radius: 16px; }
      .post-article h1 { font-size: 1.3em; }
      .post-article img:hover { transform: none; }
      .pin-badge { top: 12px !important; right: 12px !important; width: 28px !important; height: 28px !important; }
      footer { padding: 20px 16px; font-size: 0.8em; }
      .back-to-top { bottom: 20px; right: 20px; width: 40px; height: 40px; font-size: 18px; }
    }
  </style>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/atom-one-dark.min.css">
</head>
<body>
  <button class="mobile-nav-toggle" onclick="toggleNav()">☰</button>
  <div class="mobile-overlay" id="mobileOverlay" onclick="toggleNav()"></div>
  <header>
    <h1><a href="/">${escapeHtml(siteName)}</a></h1>
    ${siteDesc ? `<p>${escapeHtml(siteDesc)}</p>` : ''}
  </header>
  <main>
    <!-- 左侧边栏 -->
    ${settings.profile_position === 'left' || settings.tag_cloud_position === 'left' || settings.ad_position === 'left' ? `
    <aside class="sidebar">
      ${settings.profile_position === 'left' ? `
      <div class="profile-card">
        <img class="avatar" src="/icon/profile.png" alt="${escapeHtml(siteAuthor)}">
        <div class="name">${escapeHtml(siteAuthor)}</div>
        ${settings.site_bio ? `<div class="bio">${escapeHtml(settings.site_bio)}</div>` : ''}
        <div class="stats">
          <div class="stat-item"><div id="stat-posts" class="stat-num">-</div><div class="stat-label">文章</div></div>
          <div class="stat-item"><div id="stat-cats" class="stat-num">-</div><div class="stat-label">分类</div></div>
          <div class="stat-item"><div id="stat-tags" class="stat-num">-</div><div class="stat-label">标签</div></div>
        </div>
        <h4><img src="/icon/category.png" style="width:22px;height:22px;vertical-align:middle;margin-right:6px">分类</h4>
        <div id="category-list" class="category-list"></div>
        <h4><img src="/icon/friend-links.png" style="width:22px;height:22px;vertical-align:middle;margin-right:6px">${escapeHtml(settings.links_title || '友链')}</h4>
        <div id="link-list" class="link-list"></div>
      </div>
      ` : ''}
      ${settings.enable_tag_cloud !== '0' && settings.tag_cloud_position === 'left' ? `
      <div class="profile-card" style="margin-top:16px">
        <div id="tag-cloud-left" class="tag-cloud" style="display:flex;flex-wrap:wrap;gap:8px;padding:8px 0"></div>
      </div>
      ` : ''}
      ${settings.ad_content && settings.ad_position === 'left' ? `
      <div class="profile-card" style="margin-top:16px;padding:0;overflow:hidden">
        <div class="ad-container" style="border-radius:0;overflow:hidden">${renderAdContent(settings.ad_content)}</div>
      </div>
      ` : ''}
    </aside>
    ` : ''}
    <!-- 文章内容 -->
    <div class="content-area">
      <a class="back-link" href="/">← 返回首页</a>
      <article class="post-article" style="position:relative">
        ${settings.pinned_post_id && String(post.id) === String(settings.pinned_post_id) ? '<img src="/icon/pin-post.png" class="icon-img pin-badge" style="position:absolute;top:24px;right:24px;width:36px;height:36px">' : ''}
        <h1>${escapeHtml(post.title)}</h1>
        <div class="post-meta">
          <span><img src="/icon/category.png" class="icon-img" style="width:18px;height:18px;vertical-align:middle;margin-right:6px">${escapeHtml(post.category)}</span>
          <span>${(function(d){return d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日'})(new Date(post.created_at))}</span>
        </div>
        <div id="post-content" style="line-height:1.8;word-break:break-word;overflow-wrap:break-word"></div>
        ${post.tags ? `<div style="margin-top:24px;padding-top:16px;border-top:2px solid #e8e0cc;display:flex;flex-wrap:wrap;gap:8px">${post.tags.split(',').map(t =>
          `<span style="display:inline-block;padding:5px 14px;background:#e6f9f6;color:${currentTheme.btnShadow};font-size:0.85em;font-weight:700;border:1.5px solid ${currentTheme.btnBg};border-radius:50px">${escapeHtml(t.trim())}</span>`
        ).join('')}</div>` : ''}
        ${settings.copyright_notice ? `
        <div style="margin-top:24px;padding:20px;background:#f5f2eb;border:1.5px solid #ddd6c6;border-radius:12px;font-size:0.9em;color:${currentTheme.textBody};line-height:1.8;word-break:break-word;overflow-wrap:break-word">
          ${settings.copyright_notice.replace(/\{\{article_url\}\}/g, escapeHtml(requestUrl || '')).replace(/\{\{publish_date\}\}/g, post.created_at ? (function(d){return d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日'})(new Date(post.created_at)) : '')}
        </div>
        ` : ''}
        <div id="related-posts" style="margin-top:24px"></div>
      </article>
    </div>
    <!-- 右侧边栏 -->
    ${settings.profile_position === 'right' || settings.tag_cloud_position === 'right' || settings.ad_position === 'right' ? `
    <aside class="sidebar-right">
      ${settings.profile_position === 'right' ? `
      <div class="profile-card">
        <img class="avatar" src="/icon/profile.png" alt="${escapeHtml(siteAuthor)}">
        <div class="name">${escapeHtml(siteAuthor)}</div>
        ${settings.site_bio ? `<div class="bio">${escapeHtml(settings.site_bio)}</div>` : ''}
        <div class="stats">
          <div class="stat-item"><div id="stat-posts" class="stat-num">-</div><div class="stat-label">文章</div></div>
          <div class="stat-item"><div id="stat-cats" class="stat-num">-</div><div class="stat-label">分类</div></div>
          <div class="stat-item"><div id="stat-tags" class="stat-num">-</div><div class="stat-label">标签</div></div>
        </div>
        <h4><img src="/icon/category.png" style="width:22px;height:22px;vertical-align:middle;margin-right:6px">分类</h4>
        <div id="category-list" class="category-list"></div>
        <h4><img src="/icon/friend-links.png" style="width:22px;height:22px;vertical-align:middle;margin-right:6px">${escapeHtml(settings.links_title || '友链')}</h4>
        <div id="link-list" class="link-list"></div>
      </div>
      ` : ''}
      ${settings.enable_tag_cloud !== '0' && settings.tag_cloud_position === 'right' ? `
      <div class="profile-card" style="margin-top:16px">
        <div id="tag-cloud-right" class="tag-cloud" style="display:flex;flex-wrap:wrap;gap:8px;padding:8px 0"></div>
      </div>
      ` : ''}
      ${settings.ad_content && settings.ad_position === 'right' ? `
      <div class="profile-card" style="margin-top:16px;padding:0;overflow:hidden">
        <div class="ad-container" style="border-radius:0;overflow:hidden">${renderAdContent(settings.ad_content)}</div>
      </div>
      ` : ''}
    </aside>
    ` : ''}
  </main>
  <div class="lightbox" id="lightbox" onclick="closeLightbox(event)">
    <button class="lightbox-close" onclick="closeLightbox(event)">×</button>
    <img id="lightbox-img" src="" alt="">
    <div class="lightbox-bottom">
      <button class="lightbox-nav" onclick="event.stopPropagation();navLightbox(-1)">‹</button>
      <div class="lightbox-counter" id="lightbox-counter"></div>
      <button class="lightbox-nav" onclick="event.stopPropagation();navLightbox(1)">›</button>
    </div>
  </div>
  <button class="back-to-top" onclick="window.scrollTo({top:0,behavior:'smooth'})">↑</button>
  <footer>${(function(){var f=settings.site_footer || '&copy; 2026 ' + escapeHtml(siteName);if(settings.site_created_at){var d=new Date(settings.site_created_at);var now=new Date();var bjNow=new Date(now.getTime()+8*3600000);var bjCreated=new Date(d.getTime()+8*3600000);var days=Math.floor((Date.UTC(bjNow.getUTCFullYear(),bjNow.getUTCMonth(),bjNow.getUTCDate())-Date.UTC(bjCreated.getUTCFullYear(),bjCreated.getUTCMonth(),bjCreated.getUTCDate()))/86400000);var dateStr=d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日';f=f.split('{{days_running}}').join(days).split('{{site_created_at}}').join(dateStr);}return f;})()}</footer>
  <script>
    // 主题颜色
    var themeColors = {
      btnBg: '${currentTheme.btnBg}',
      btnShadow: '${currentTheme.btnShadow}',
      textPrimary: '${currentTheme.textPrimary}',
      textSecondary: '${currentTheme.textSecondary}'
    };
    // 客户端 HTML 转义（防存储型 XSS）
    var escHtml = function(s) { return String(s == null ? '' : s).split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split('"').join('&quot;'); };

    var homeDataPromise = fetch('/api/home-data?v=2').then(function(r){
      if (!r.ok) throw new Error('侧栏数据加载失败');
      return r.json();
    }).catch(function(e){
      console.error(e);
      return {stats:{},categories:[],links:[],tags:[]};
    });
    homeDataPromise.then(function(data){
      var s = data.stats || {};
      document.getElementById('stat-posts').textContent = s.postCount;
      document.getElementById('stat-cats').textContent = s.catCount;
      document.getElementById('stat-tags').textContent = s.tagCount || 0;
      if (s.latestDate) { var d = new Date(s.latestDate); document.getElementById('site-updated').textContent = d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日'; }
    });
    homeDataPromise.then(function(data){
      var cats = data.categories || [];
      var list = document.getElementById('category-list');
      if(cats && cats.length > 0) list.innerHTML = '<a href="/">全部</a>' + cats.map(function(c){return '<a href="/?category='+encodeURIComponent(c.slug)+'">'+escHtml(c.name)+'</a>'}).join('');
    });
    homeDataPromise.then(function(data){
      var links = data.links || [];
      var list = document.getElementById('link-list');
      if(links && links.length > 0) list.innerHTML = links.map(function(l){return '<a href="'+escHtml(l.url)+'" target="_blank" rel="noopener">'+escHtml(l.name)+'</a>'}).join('');
    });

    // 加载标签云（使用服务端聚合接口，避免请求全部文章）
    var tagCloudEl = document.getElementById('tag-cloud-left') || document.getElementById('tag-cloud-right');
    if (tagCloudEl) {
      homeDataPromise.then(function(data) {
        var tags = data.tags || [];
        tags = tags || [];
        if (tags.length > 0) {
          var colors = [
            { bg: '#f8a6b2', color: '#fff', border: '#f8a6b2' },  // app-pink
            { bg: '#b77dee', color: '#fff', border: '#b77dee' },  // purple
            { bg: '#889df0', color: '#fff', border: '#889df0' },  // app-blue
            { bg: 'rgb(247,243,223)', color: '#725d42', border: '#e8dcc8' },  // default
            { bg: '#e59266', color: '#fff', border: '#e59266' },  // app-orange
            { bg: '#82d5bb', color: '#fff', border: '#82d5bb' },  // app-teal
            { bg: '#8ac68a', color: '#fff', border: '#8ac68a' },  // app-green
            { bg: '#fc736d', color: '#fff', border: '#fc736d' },  // app-red
            { bg: '#e18c6f', color: '#fff', border: '#e18c6f' }   // warm-peach-pink
          ];
          // 颜色分配：最多2个标签同色
          var colorCount = {};
          var shuffled = colors.slice().sort(function(){return 0.5 - Math.random()});
          var colorIndex = 0;
          tagCloudEl.innerHTML = tags.map(function(tag) {
            var tagName = tag.name || tag;
            // 找一个使用次数<2的颜色
            while (colorIndex < shuffled.length * 2) {
              var c = shuffled[colorIndex % shuffled.length];
              var key = c.bg;
              if (!colorCount[key]) colorCount[key] = 0;
              if (colorCount[key] < 2) {
                colorCount[key]++;
                colorIndex++;
                return '<a href="/?tag=' + encodeURIComponent(tagName) + '" class="tag-item" style="display:inline-block;padding:5px 14px;background:' + c.bg + ';color:' + c.color + ';border:1.5px solid ' + c.border + ';border-radius:50px;text-decoration:none;white-space:nowrap;font-size:13px;font-weight:600;transition:all 0.25s ease;cursor:pointer">' + escHtml(tagName) + '</a>';
              }
              colorIndex++;
            }
            // fallback
            var c = shuffled[0];
            return '<a href="/?tag=' + encodeURIComponent(tagName) + '" class="tag-item" style="display:inline-block;padding:5px 14px;background:' + c.bg + ';color:' + c.color + ';border:1.5px solid ' + c.border + ';border-radius:50px;text-decoration:none;white-space:nowrap;font-size:13px;font-weight:600;transition:all 0.25s ease;cursor:pointer">' + escHtml(tagName) + '</a>';
          }).join('');
        } else {
          tagCloudEl.innerHTML = '<span style="color:' + themeColors.textSecondary + ';font-size:0.85em">暂无标签</span>';
        }
      });
    }

    window.addEventListener('scroll', function() {
      var btn = document.querySelector('.back-to-top');
      if (btn) btn.classList.toggle('show', window.scrollY > 300);
    });

    function toggleNav() {
      var sidebar = document.querySelector('.sidebar') || document.querySelector('.sidebar-right');
      if (sidebar) sidebar.classList.toggle('open');
      var overlay = document.getElementById('mobileOverlay');
      if (overlay) overlay.classList.toggle('show');
      var btn = document.querySelector('.mobile-nav-toggle');
      if (btn) btn.classList.toggle('nav-open');
    }

    var lightboxImages = [];
    var lightboxIndex = 0;

    function initLightbox() {
      lightboxImages = Array.from(document.querySelectorAll('.post-article img'));
      lightboxImages.forEach(function(img, index) {
        img.addEventListener('click', function() {
          openLightbox(index);
        });
      });
    }

    function openLightbox(index) {
      lightboxIndex = index;
      updateLightbox();
      document.getElementById('lightbox').classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function updateLightbox() {
      if (!lightboxImages[lightboxIndex]) return;
      document.getElementById('lightbox-img').src = lightboxImages[lightboxIndex].src;
      var counter = document.getElementById('lightbox-counter');
      if (lightboxImages.length > 1) {
        counter.textContent = (lightboxIndex + 1) + ' / ' + lightboxImages.length;
        counter.style.display = 'block';
      } else {
        counter.style.display = 'none';
      }
    }

    function navLightbox(dir) {
      var newIndex = lightboxIndex + dir;
      if (newIndex < 0) newIndex = lightboxImages.length - 1;
      if (newIndex >= lightboxImages.length) newIndex = 0;
      lightboxIndex = newIndex;
      updateLightbox();
    }

    function closeLightbox(e) {
      if (e.target.id === 'lightbox' || e.target.classList.contains('lightbox-close')) {
        document.getElementById('lightbox').classList.remove('active');
        document.body.style.overflow = '';
      }
    }

    document.addEventListener('keydown', function(e) {
      var lb = document.getElementById('lightbox');
      if (!lb.classList.contains('active')) return;
      if (e.key === 'Escape') { lb.classList.remove('active'); document.body.style.overflow = ''; }
      else if (e.key === 'ArrowLeft') navLightbox(-1);
      else if (e.key === 'ArrowRight') navLightbox(1);
    });
  </script>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js" crossorigin="anonymous"></script>
  <style>
    pre { background: #2b2118; border-radius: 20px; padding: 20px 24px; overflow-x: auto; margin: 14px 0; border: 1px solid #3d3028; box-shadow: none; position: relative; }
    .copy-btn { position: absolute; top: 12px; right: 12px; padding: 4px 12px; background: rgba(232,213,188,0.1); border: 1px solid rgba(232,213,188,0.2); border-radius: 6px; color: rgba(232,213,188,0.6); font-size: 12px; cursor: pointer; transition: all 0.2s; z-index: 2; }
    .copy-btn:hover { background: rgba(232,213,188,0.2); color: #e8d5bc; }
    .copy-btn.copied { background: rgba(25,200,185,0.3); color: var(--btn-bg); border-color: var(--btn-bg); }
    pre code { font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace; font-size: 14px; line-height: 1.7; color: #e8d5bc; background: none; padding: 0; border: none; border-radius: 0; box-shadow: none; display: block; font-weight: 600; }
    code { font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace; background: #3d3028; color: #e8d5bc; padding: 3px 10px; border-radius: 6px; font-size: 0.88em; border: 1px solid #4d4038; font-weight: 600; }
    .hljs-keyword, .hljs-selector-tag { color: #d4a0e0; }
    .hljs-string, .hljs-attr { color: #a8d4a0; }
    .hljs-number, .hljs-literal { color: #80c0e0; }
    .hljs-comment { color: #8b8070; font-style: italic; }
    .hljs-function .hljs-title, .hljs-title.function_ { color: #e06c75; }
    .hljs-built_in { color: #f0a870; }
    .hljs-type, .hljs-class .hljs-title { color: #f0a870; }
    .hljs-params { color: #e8d5bc; }
    .hljs-meta { color: #80c0e0; }
    .hljs-punctuation { color: #d4b896; }
    .hljs-property { color: #80c0e0; }
    .hljs-title { color: #e06c75; }
    .hljs-emphasis { font-style: italic; color: #f0a870; }
    .hljs-strong { font-weight: bold; color: #f0a870; }
    .hljs-link { color: #a8d4a0; text-decoration: underline; }
    .hljs-addition { color: #a8d4a0; background: rgba(46,160,67,0.15); }
    blockquote { position: relative; background: #f0ece2; border-left: 4px solid #c4b89e; border-radius: 0 12px 12px 0; padding: 16px 20px 16px 48px; margin: 16px 0; color: #6b5d45; font-style: italic; line-height: 1.8; }
    blockquote::before { content: '\\201C'; position: absolute; left: 14px; top: 8px; font-size: 48px; color: #c4b89e; font-family: Georgia, serif; line-height: 1; font-style: normal; }
    blockquote p { margin: 0; }
    blockquote p + p { margin-top: 8px; }
    details { background: #f5f2eb; border: 1.5px solid #ddd6c6; border-radius: 12px; padding: 0; margin: 16px 0; overflow: hidden; }
    summary { padding: 14px 20px; background: #ede8dc; cursor: pointer; font-weight: 700; color: var(--text-primary); border-bottom: 1.5px solid #ddd6c6; list-style: none; display: flex; align-items: center; gap: 8px; }
    summary::before { content: '\\25B6'; font-size: 12px; transition: transform 0.2s; display: inline-block; }
    details[open] summary::before { transform: rotate(90deg); }
    summary::-webkit-details-marker { display: none; }
    details > div, details > p { padding: 16px 20px; }
    .hljs-deletion { color: #e06c75; background: rgba(224,108,117,0.15); }
    .related-title { font-size: 1.1em; font-weight: 700; color: var(--text-primary); margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    .related-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .related-card { background: var(--card-bg); border: 2px solid var(--card-border); border-radius: 16px; overflow: hidden; transition: all 0.3s ease; }
    .related-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(114, 93, 66, 0.15); }
    .related-card-cover { width: 100%; height: 140px; object-fit: cover; background: #e8e0cc; }
    .related-card-content { padding: 16px; }
    .related-card-title { font-size: 1em; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .related-card-title a { color: var(--text-primary); text-decoration: none; }
    .related-card-title a:hover { color: var(--btn-bg); }
    .related-card-meta { font-size: 0.8em; color: var(--text-secondary); }
    @media (max-width: 768px) {
      .related-grid { grid-template-columns: 1fr; }
      pre { padding: 14px 16px; border-radius: 14px; }
      pre code { font-size: 13px; }
      .copy-btn { top: 8px; right: 8px; padding: 3px 8px; font-size: 11px; }
      blockquote { padding: 12px 14px 12px 38px; }
      blockquote::before { left: 10px; top: 4px; font-size: 36px; }
      summary { padding: 12px 14px; }
      details > div, details > p { padding: 12px 14px; }
    }
  </style>
  <script>
    function escapeHtml(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
    document.addEventListener('DOMContentLoaded', function() {
      var raw = ${JSON.stringify((post.content || '').split('</script>').join('<\\/script>'))};
      var fence = String.fromCharCode(96)+String.fromCharCode(96)+String.fromCharCode(96);
      var tick = String.fromCharCode(96);
      var nl = String.fromCharCode(10);

      // 第一步：提取代码块，转义 HTML
      var codeBlocks = [];
      var content = raw;
      // 先处理三反引号代码块
      while (true) {
        var fs = content.indexOf(nl + fence);
        if (fs === -1) fs = content.indexOf(fence);
        if (fs === -1) break;
        var af = content.indexOf(fence, fs + fence.length);
        if (af === -1) break;
        var cc = content.substring(fs + fence.length, af);
        var fn = cc.indexOf(nl);
        if (fn !== -1) cc = cc.substring(fn + 1);
        var esc = cc.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;');
        var idx = codeBlocks.length;
        codeBlocks.push(esc);
        content = content.substring(0, fs) + nl + '%%CB_' + idx + '%%' + nl + content.substring(af + fence.length);
      }
      // 再处理未闭合的单反引号代码块
      while (true) {
        var si = content.indexOf(tick);
        if (si === -1) break;
        var ei = content.indexOf(tick, si + 1);
        if (ei !== -1) {
          // 有闭合的单反引号
          var sc = content.substring(si + 1, ei);
          var esc2 = sc.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;');
          var idx2 = codeBlocks.length;
          codeBlocks.push(esc2);
          content = content.substring(0, si) + '%%CB_' + idx2 + '%%' + content.substring(ei + 1);
        } else {
          // 没有闭合的反引号，取到内容结尾
          var sc2 = content.substring(si + 1);
          var esc3 = sc2.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;');
          var idx3 = codeBlocks.length;
          codeBlocks.push(esc3);
          content = content.substring(0, si) + '%%CB_' + idx3 + '%%';
        }
      }

      // 第二步：用 marked 解析（代码块已被占位符替换，不会有 HTML 问题）
      var html;
      if (typeof marked !== 'undefined' && marked.parse) {
        marked.setOptions({ breaks: true, gfm: true, headerIds: false, mangle: false });
        html = marked.parse(content);
      } else {
        html = '<p>' + content.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split(String.fromCharCode(10)).join('<br>') + '</p>';
      }

      // 第三步：还原代码块，用 <pre><code> 包裹 + 语法高亮
      for (var j = 0; j < codeBlocks.length; j++) {
        var placeholder = '%%CB_' + j + '%%';
        var highlighted = codeBlocks[j];
        try {
          if (typeof hljs !== 'undefined') {
            highlighted = hljs.highlightAuto(codeBlocks[j].split('&amp;').join('&').split('&lt;').join('<').split('&gt;').join('>')).value;
          }
        } catch(e) { highlighted = codeBlocks[j]; }
        var block = '<pre><code class="hljs">' + highlighted + '</code></pre>';
        html = html.replace(placeholder, block);
      }

      // 给所有图片添加懒加载（在插入 DOM 前）
      html = html.split('<img ').join('<img loading="lazy" ');
      document.getElementById('post-content').innerHTML = html;

      // 为代码块添加复制按钮
      var pres = document.querySelectorAll('pre');
      for (var p = 0; p < pres.length; p++) {
        var btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.textContent = '复制';
        btn.onclick = (function(pre, button) {
          return function() {
            var code = pre.querySelector('code');
            var text = code ? code.textContent : pre.textContent;
            navigator.clipboard.writeText(text).then(function() {
              button.textContent = '已复制';
              button.classList.add('copied');
              setTimeout(function() { button.textContent = '复制'; button.classList.remove('copied'); }, 2000);
            });
          };
        })(pres[p], btn);
        pres[p].appendChild(btn);
      }

      initLightbox();
      // 图片懒加载
      document.querySelectorAll('.post-article img').forEach(function(img) { img.setAttribute('loading', 'lazy'); });
    });
  </script>
  <script>
  // 加载相关文章
  (function(){
    var container = document.getElementById('related-posts');
    if (!container) return;
    var postId = ${post.id};
    var tags = ${JSON.stringify(post.tags || '')};
    if (!tags) return;
    // 客户端 HTML 转义（防存储型 XSS）
    var escHtml = function(s) { return String(s == null ? '' : s).split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split('"').join('&quot;'); };
    fetch('/api/related-posts?id=' + postId + '&tags=' + encodeURIComponent(tags))
      .then(function(r) { return r.json(); })
      .then(function(posts) {
        if (!posts || posts.length === 0) return;
        var html = '<div class="related-title"><img src="/icon/category.png" style="width:22px;height:22px">相关文章</div>';
        html += '<div class="related-grid">';
        posts.forEach(function(p) {
          var cover = p.cover_image ? '<img class="related-card-cover" src="' + escHtml(p.cover_image) + '" alt="' + escHtml(p.title) + '">' : '<div class="related-card-cover" style="display:flex;align-items:center;justify-content:center;color:${currentTheme.textSecondary};font-size:2em">📄</div>';
          var date = new Date(p.created_at);
          var dateStr = date.getFullYear() + '-' + String(date.getMonth()+1).padStart(2,'0') + '-' + String(date.getDate()).padStart(2,'0');
          // 文章路由格式为 /post/YYYYMM/id
          var ym = date.getFullYear() + String(date.getMonth()+1).padStart(2,'0');
          html += '<div class="related-card">' + cover + '<div class="related-card-content"><div class="related-card-title"><a href="/post/' + ym + '/' + p.id + '">' + escHtml(p.title) + '</a></div><div class="related-card-meta">' + escHtml(p.category) + ' · ' + dateStr + '</div></div></div>';
        });
        html += '</div>';
        container.innerHTML = html;
      })
      .catch(function() {});
  })();

  (function(){
    var s = ${(JSON.stringify(settings.custom_js || ''))};
    if(s && s.trim()){
      var d=document.createElement('div');d.innerHTML=s;
      var scripts=d.querySelectorAll('script');
      scripts.forEach(function(old){
        var n=document.createElement('script');
        for(var i=0;i<old.attributes.length;i++)n.setAttribute(old.attributes[i].name,old.attributes[i].value);
        if(old.textContent)n.textContent=old.textContent;
        document.body.appendChild(n);
      });
      if(!scripts.length)document.body.appendChild(d);
    }
  })();
  </script>
</body>
</html>`;
}
