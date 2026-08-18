// ==================== 前台首页（SEO 优化 + 分页）====================

import { escapeHtml, renderAdContent } from '../lib/utils.js';
import { getTheme } from '../themes/index.js';

export function getFrontendHTML(settings, requestUrl) {
  settings = settings || {};
  const siteName = settings.site_name || '我的博客';
  const siteDesc = settings.site_description || '';
  const siteAuthor = settings.site_author || siteName;
  const siteBio = settings.site_bio || '';
  const currentTheme = getTheme(settings.site_theme);
  // 表情包资源：.js 为 Symbol（多色 SVG）模式，.css 为 Font class（单色字体）模式
  const iconfontUrl = settings.iconfont_css ? (settings.iconfont_css.startsWith('//') ? 'https:' + settings.iconfont_css : settings.iconfont_css) : '';
  const iconfontTag = iconfontUrl ? (iconfontUrl.split('?')[0].endsWith('.js') ? `<script src="${iconfontUrl}"></script>` : `<link href="${iconfontUrl}" rel="stylesheet">`) : '';

  const homepageJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": siteName,
    "url": requestUrl || '/'
  });

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(siteName)}</title>
  <meta name="description" content="${escapeHtml(siteDesc || siteName + ' - 基于 Cloudflare Workers 构建的轻量级博客')}">
  <meta name="author" content="${escapeHtml(siteAuthor)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="/">
  <link rel="sitemap" href="/sitemap.xml">
  <link rel="alternate" type="application/rss+xml" title="${escapeHtml(siteName)}" href="/rss.xml">
  <link rel="icon" href="/icon/favicon.ico">
  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(siteName)}">
  <meta property="og:description" content="${escapeHtml(siteDesc || siteName + ' - 基于 Cloudflare Workers 构建的轻量级博客')}">
  <meta property="og:site_name" content="${escapeHtml(siteName)}">
  <meta property="og:url" content="${requestUrl || '/'}">
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(siteName)}">
  <meta name="twitter:description" content="${escapeHtml(siteDesc || siteName + ' - 基于 Cloudflare Workers 构建的轻量级博客')}">
  <script type="application/ld+json">${homepageJsonLd}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${currentTheme.fontUrl}" rel="stylesheet">
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
    header { background: var(--header-bg); color: #fff; padding: 40px 20px; text-align: center; position: relative; overflow: hidden; }
    header::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 40px; background: linear-gradient(transparent, rgba(0,0,0,0.05)); }
    header h1 { font-size: 2.5em; font-weight: 800; margin-bottom: 8px; letter-spacing: 0.02em; text-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    header a { color: #fff; text-decoration: none; }
    header p { opacity: 0.9; font-size: 1.1em; font-weight: 500; }
    main { max-width: 1400px; margin: 30px auto; padding: 0 20px; display: flex; gap: 24px; align-items: flex-start; justify-content: center; }
    .sidebar { width: 280px; flex-shrink: 0; }
    .sidebar-right { width: 280px; flex-shrink: 0; }
    .post-list { width: 792px; flex-shrink: 0; min-width: 0; }
    #app { display: flex; flex-direction: column; gap: 28px; }
    .post-card { background: var(--card-bg); border-radius: 20px; overflow: visible; box-shadow: 0 4px 10px rgba(107, 92, 67, 0.42); display: flex; flex-direction: row; transition: all 0.3s ease; border: 2px solid var(--card-border); word-break: break-word; }
    .post-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(114, 93, 66, 0.15); }
    .post-card .post-cover { width: 220px; flex-shrink: 0; background: var(--card-border); display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 18px 0 0 18px; }
    .post-card .post-cover img { width: 100%; height: 100%; object-fit: cover; }
    .post-card .post-content { flex: 1; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; min-width: 0; overflow: hidden; }
    .post-card h2 { font-size: 1.35em; margin-bottom: 8px; color: var(--text-primary); font-weight: 700; }
    .post-card h2 a { color: var(--text-primary); text-decoration: none; }
    .post-card .meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; color: var(--text-secondary); font-size: 0.8em; margin-top: 12px; font-weight: 600; }
    .post-card a.read-more { display: inline-block; padding: 6px 16px; background: var(--btn-bg); color: #fff; text-decoration: none; border-radius: 50px; font-size: 0.8em; font-weight: 600; box-shadow: 0 3px 0 0 var(--btn-shadow); transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); white-space: nowrap; }
    .post-card a.read-more:hover { transform: translateY(-1px); box-shadow: 0 5px 0 0 var(--btn-shadow); }
    .post-card a.read-more:active { transform: translateY(2px); box-shadow: 0 1px 0 0 var(--btn-shadow); }
    .profile-card { background: var(--card-bg); border-radius: 20px; padding: 24px; box-shadow: 0 4px 10px rgba(107, 92, 67, 0.42); border: 2px solid var(--card-border); }
    .profile-card .avatar { width: 150px; height: 150px; border-radius: 50%; object-fit: cover; margin: 0 auto 14px; display: block; border: 3px solid var(--card-border); background: var(--card-bg); }
    .profile-card .name { font-size: 1.1em; font-weight: 700; text-align: center; margin-bottom: 4px; color: var(--text-primary); }
    .profile-card .bio { color: var(--text-body); font-size: 0.85em; text-align: center; margin-bottom: 14px; font-weight: 500; }
    .profile-card .stats { display: flex; justify-content: center; gap: 16px; padding-bottom: 14px; }
    .profile-card .stat-item { text-align: center; }
    .profile-card .stat-num { font-size: 1.1em; font-weight: 800; color: var(--btn-bg); }
    .profile-card .stat-label { font-size: 0.75em; color: var(--text-secondary); font-weight: 600; }
    .profile-card h4 { font-size: 0.85em; color: var(--text-secondary); margin: 14px 0 8px; font-weight: 700; letter-spacing: 0.5px; }
    .profile-card .category-list a, .profile-card .link-list a { display: block; padding: 8px 12px; margin: 0 0 6px 0; color: var(--text-body); text-decoration: none; background: var(--body-bg); border-radius: 12px; font-size: 0.85em; font-weight: 600; transition: all 0.2s; border: 2px solid transparent; outline: none; }
    .profile-card .category-list a:hover, .profile-card .link-list a:hover { background: #e6f9f6; border-color: var(--btn-bg); color: var(--btn-shadow); }
    .ad-container img { width: 100%; aspect-ratio: 1/1; object-fit: cover; border-radius: 0; display: block; margin: 0; }
    footer { text-align: center; padding: 30px 20px; color: var(--text-secondary); font-size: 0.85em; font-weight: 500; }
    .post-card .post-content i.iconfont, #app i.iconfont { font-size: 1.8em; vertical-align: middle; line-height: 1; }
    .post-card .post-content svg.icon, #app svg.icon { width: 1.8em; height: 1.8em; vertical-align: middle; fill: currentColor; overflow: hidden; }
    .pagination { display: flex; justify-content: center; gap: 8px; margin: 24px 0; flex-wrap: wrap; }
    .pagination a, .pagination span { display: inline-block; padding: 8px 16px; border-radius: 50px; font-weight: 600; font-size: 0.85em; text-decoration: none; transition: all 0.2s; }
    .pagination a { background: var(--body-bg); color: var(--text-body); border: 2px solid var(--card-border); }
    .pagination a:hover { background: var(--btn-bg); color: #fff; border-color: var(--btn-bg); }
    .pagination .current { background: var(--btn-bg); color: #fff; border: 2px solid var(--btn-bg); }
    .pagination .disabled { opacity: 0.4; cursor: default; pointer-events: none; }
    .back-to-top { position: fixed; bottom: 30px; right: 30px; width: 44px; height: 44px; background: var(--btn-bg); color: #fff; border: none; border-radius: 50%; font-size: 20px; cursor: pointer; box-shadow: 0 4px 0 0 var(--btn-shadow); transition: all 0.25s; display: flex; align-items: center; justify-content: center; z-index: 998; opacity: 0; pointer-events: none; }
    .back-to-top.show { opacity: 1; pointer-events: auto; }
    .back-to-top:hover { transform: translateY(-2px); box-shadow: 0 6px 0 0 var(--btn-shadow); }
    .mobile-nav-toggle { display: none; position: fixed; top: 12px; left: 12px; z-index: 1004; width: 40px; height: 40px; background: var(--btn-bg); border: none; border-radius: 12px; color: #fff; font-size: 20px; cursor: pointer; box-shadow: 0 3px 0 var(--btn-shadow); transition: left 0.3s; }
    .mobile-nav-toggle.nav-open { left: 208px !important; }
    .mobile-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999; }
    .mobile-overlay.show { display: block; }
    @media (max-width: 768px) {
      header { padding: 16px; }
      header h1 { font-size: 1.4em; }
      header p { font-size: 0.85em; }
      .mobile-nav-toggle { display: flex; align-items: center; justify-content: center; }
      main { flex-direction: row; padding: 0 12px; gap: 0; margin-top: 12px; position: relative; }
      .sidebar, .sidebar-right { width: 260px; position: fixed; top: 0; left: -260px; height: 100vh; z-index: 1002; transition: left 0.3s ease; overflow-y: auto; background: var(--body-bg); padding: 16px; box-shadow: 2px 0 8px rgba(0,0,0,0.1); display: block; }
      .sidebar.open, .sidebar-right.open { left: 0; }
      .profile-card { border-radius: 16px; padding: 16px; }
      .profile-card .avatar { width: 120px; height: 120px; }
      .profile-card .name { font-size: 1em; }
      .post-list { width: 100%; min-width: 0; flex-shrink: 1; }
      #app { gap: 20px; }
      .post-card { flex-direction: column; border-radius: 16px; }
      .post-card .post-cover { display: none; }
      .post-card .post-content { padding: 14px; }
      .post-card h2 { font-size: 1em; }
      .post-card .meta { font-size: 0.75em; }
      footer { padding: 20px 16px; font-size: 0.8em; }
      .back-to-top { bottom: 20px; right: 20px; width: 40px; height: 40px; font-size: 18px; }
    }
    .tag-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      filter: brightness(0.95);
    }
  </style>
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
        ${siteBio ? `<div class="bio">${escapeHtml(siteBio)}</div>` : ''}
        <div class="stats">
          <div class="stat-item"><div id="stat-posts" class="stat-num">-</div><div class="stat-label">文章</div></div>
          <div class="stat-item"><div id="stat-cats" class="stat-num">-</div><div class="stat-label">分类</div></div>
          <div class="stat-item"><div id="stat-tags" class="stat-num">-</div><div class="stat-label">标签</div></div>
        </div>
        <div style="border-bottom:2px solid ${currentTheme.cardBorder};margin-bottom:14px"></div>
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
    <!-- 文章列表 -->
    <div class="post-list">
      <div style="margin-bottom:16px">
        <input id="search-input" type="text" placeholder="搜索文章标题或标签……" style="width:100%;padding:12px 18px;border:2px solid ${currentTheme.cardBorder};border-radius:14px;font-size:15px;background:${currentTheme.cardBg};color:${currentTheme.textBody};outline:none;transition:border-color 0.2s;box-shadow:0 2px 8px rgba(107,92,67,0.08)">
      </div>
      <div id="app">
        <p style="text-align:center;color:${currentTheme.textSecondary};">加载中...</p>
      </div>
    </div>
    <!-- 右侧边栏 -->
    ${settings.profile_position === 'right' || settings.tag_cloud_position === 'right' || settings.ad_position === 'right' ? `
    <aside class="sidebar-right">
      ${settings.profile_position === 'right' ? `
      <div class="profile-card">
        <img class="avatar" src="/icon/profile.png" alt="${escapeHtml(siteAuthor)}">
        <div class="name">${escapeHtml(siteAuthor)}</div>
        ${siteBio ? `<div class="bio">${escapeHtml(siteBio)}</div>` : ''}
        <div class="stats">
          <div class="stat-item"><div id="stat-posts" class="stat-num">-</div><div class="stat-label">文章</div></div>
          <div class="stat-item"><div id="stat-cats" class="stat-num">-</div><div class="stat-label">分类</div></div>
          <div class="stat-item"><div id="stat-tags" class="stat-num">-</div><div class="stat-label">标签</div></div>
        </div>
        <div style="border-bottom:2px solid ${currentTheme.cardBorder};margin-bottom:14px"></div>
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
  <button class="back-to-top" onclick="window.scrollTo({top:0,behavior:'smooth'})">↑</button>
  <footer>${(function(){var f=settings.site_footer || '&copy; 2026 ' + escapeHtml(siteName);if(settings.site_created_at){var d=new Date(settings.site_created_at);var now=new Date();var bjNow=new Date(now.getTime()+8*3600000);var bjCreated=new Date(d.getTime()+8*3600000);var days=Math.floor((Date.UTC(bjNow.getUTCFullYear(),bjNow.getUTCMonth(),bjNow.getUTCDate())-Date.UTC(bjCreated.getUTCFullYear(),bjCreated.getUTCMonth(),bjCreated.getUTCDate()))/86400000);var dateStr=d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日';f=f.split('{{days_running}}').join(days).split('{{site_created_at}}').join(dateStr);}return f;})()}</footer>
  <script>
    // 主题颜色
    var themeColors = {
      btnBg: '${currentTheme.btnBg}',
      btnShadow: '${currentTheme.btnShadow}',
      textPrimary: '${currentTheme.textPrimary}',
      textBody: '${currentTheme.textBody}',
      textSecondary: '${currentTheme.textSecondary}',
      cardBorder: '${currentTheme.cardBorder}'
    };
    // 客户端 HTML 转义（防存储型 XSS）
    var escHtml = function(s) { return String(s == null ? '' : s).split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split('"').join('&quot;'); };

    // 搜索框焦点效果
    var searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('focus', function() { this.style.borderColor = themeColors.btnBg; });
      searchInput.addEventListener('blur', function() { this.style.borderColor = themeColors.cardBorder; });
    }

    // 返回顶部
    window.addEventListener('scroll', function() {
      var btn = document.querySelector('.back-to-top');
      if (btn) { btn.classList.toggle('show', window.scrollY > 300); }
    });

    // 移动端导航
    function toggleNav() {
      var sidebar = document.querySelector('.sidebar') || document.querySelector('.sidebar-right');
      if (sidebar) sidebar.classList.toggle('open');
      var overlay = document.getElementById('mobileOverlay');
      if (overlay) overlay.classList.toggle('show');
      var btn = document.querySelector('.mobile-nav-toggle');
      if (btn) btn.classList.toggle('nav-open');
    }

    // 加载侧边栏数据
    fetch('/api/stats').then(function(r){return r.json()}).then(function(s){
      document.getElementById('stat-posts').textContent = s.postCount;
      document.getElementById('stat-cats').textContent = s.catCount;
      document.getElementById('stat-tags').textContent = s.tagCount || 0;
    });
    fetch('/api/categories').then(function(r){return r.json()}).then(function(cats){
      var list = document.getElementById('category-list');
      if(cats && cats.length > 0) {
        list.innerHTML = '<a href="/">全部</a>' + cats.map(function(c){return '<a href="/?category='+encodeURIComponent(c.slug)+'">'+escHtml(c.name)+'</a>'}).join('');
      }
    });
    fetch('/api/links').then(function(r){return r.json()}).then(function(links){
      var list = document.getElementById('link-list');
      if(links && links.length > 0) {
        list.innerHTML = links.map(function(l){return '<a href="'+escHtml(l.url)+'" target="_blank" rel="noopener">'+escHtml(l.name)+'</a>'}).join('');
      }
    });

    // 加载标签云（使用服务端聚合接口，避免请求全部文章）
    var tagCloudEl = document.getElementById('tag-cloud-left') || document.getElementById('tag-cloud-right');
    if (tagCloudEl) {
      fetch('/api/tags').then(function(r){return r.json()}).then(function(tags) {
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

    // 加载文章列表（支持分页）
    var currentPage = parseInt(new URLSearchParams(window.location.search).get('page')) || 1;
    var currentCategory = new URLSearchParams(window.location.search).get('category');
    var currentTag = new URLSearchParams(window.location.search).get('tag');

    function loadPosts(page) {
      page = page || 1;
      var apiUrl = '/api/posts?page=' + page + '&limit=10';
      if (currentCategory) apiUrl += '&category=' + encodeURIComponent(currentCategory);

      fetch(apiUrl).then(function(r){return r.json()}).then(function(res) {
        var posts = res.data || [];
        var pinned_post_id = res.pinned_post_id || '';
        var pagination = res.pagination || {};
        var app = document.getElementById('app');
        var html = '';

        // 将置顶文章移到列表最前面
        if (pinned_post_id && page === 1) {
          var pinnedIndex = posts.findIndex(function(p) { return String(p.id) === String(pinned_post_id); });
          if (pinnedIndex > 0) {
            var pinnedPost = posts.splice(pinnedIndex, 1)[0];
            posts.unshift(pinnedPost);
          }
        }

        if (currentCategory) {
          html += '<div style="margin-bottom:16px"><a href="/" style="display:inline-block;padding:8px 20px;background:' + themeColors.btnBg + ';color:#fff;text-decoration:none;border-radius:50px;font-weight:600;font-size:0.9em;box-shadow:0 4px 0 0 ' + themeColors.btnShadow + '">← 返回首页</a> <span id="current-cat" style="color:' + themeColors.textPrimary + ';font-weight:600;margin-left:8px"></span></div>';
          fetch('/api/categories').then(function(r){return r.json()}).then(function(cats){
            var cat = cats.find(function(c){return c.slug === currentCategory});
            var el = document.getElementById('current-cat');
            if(el && cat) el.textContent = '当前分类：' + cat.name;
          });
        }

        if (currentTag) {
          // 标签筛选：前端过滤
          posts = posts.filter(function(post) {
            if (post.has_password) return false;
            return post.tags && post.tags.split(',').map(function(t){return t.trim()}).indexOf(currentTag) >= 0;
          });
          html += '<div style="margin-bottom:16px"><a href="/" style="display:inline-block;padding:8px 20px;background:' + themeColors.btnBg + ';color:#fff;text-decoration:none;border-radius:50px;font-weight:600;font-size:0.9em;box-shadow:0 4px 0 0 ' + themeColors.btnShadow + '">← 返回首页</a> <span style="color:' + themeColors.textPrimary + ';font-weight:600;margin-left:8px">标签：' + currentTag + '</span></div>';
        }

        if (!posts || posts.length === 0) {
          app.innerHTML = html + '<p style="text-align:center;color:' + themeColors.textSecondary + ';">暂无文章</p>';
          return;
        }

        var formatDate = function(d) { var dt = new Date(d); return dt.getFullYear() + String(dt.getMonth()+1).padStart(2,'0'); };
        html += posts.map(function(post) {
          var isPinned = String(post.id) === String(pinned_post_id);
          var cover = post.cover_image ? '<img src="' + escHtml(post.cover_image) + '" alt="' + escHtml(post.title) + '" loading="lazy">' : '<span style="color:' + themeColors.textSecondary + '">封面</span>';
          var tags = post.tags ? post.tags.split(',').map(function(t) {
            return '<span style="display:inline-block;padding:3px 10px;background:#e6f9f6;color:' + themeColors.btnShadow + ';font-size:0.72em;font-weight:700;margin-right:6px;border:1.5px solid ' + themeColors.btnBg + ';border-radius:50px">' + escHtml(t.trim()) + '</span>';
          }).join('') : '';
          function stripHtml(str) {
            if (!str) return '';
            // 移除HTML标签
            str = str.replace(/<[^>]*>/g, '');
            // 移除markdown格式符号
            str = str.replace(/#{1,6}\\s/g, ''); // 标题
            str = str.replace(/\\*\\*([^*]+)\\*\\*/g, '$1'); // 粗体
            str = str.replace(/\\*([^*]+)\\*/g, '$1'); // 斜体
            str = str.replace(/__([^_]+)__/g, '$1'); // 粗体
            str = str.replace(/_([^_]+)_/g, '$1'); // 斜体
            str = str.replace(/~~([^~]+)~~/g, '$1'); // 删除线
            str = str.replace(/\\\[([^\\\]]+)\\\]\\\([^)]+\\\)/g, '$1'); // 链接
            str = str.replace(/!\\\[([^\\\]]*)\\\]\\\([^)]+\\\)/g, ''); // 图片
            str = str.replace(/^[-*+]\\s/gm, ''); // 无序列表
            str = str.replace(/^\\d+\\.\\s/gm, ''); // 有序列表
            str = str.replace(/^>\\s/gm, ''); // 引用
            str = str.replace(/---/g, ''); // 分割线
            str = str.replace(/\\n+/g, ' '); // 换行转空格
            str = str.replace(/&[a-z]+;/g, ''); // HTML实体
            str = str.trim();
            return str.substring(0, 80);
          }
          var rawText = post.excerpt || post.content || '';
          var excerpt = post.has_password ? '🔒 该文章受到密码保护' : escHtml(stripHtml(rawText)) + (rawText.length > 80 ? '...' : '');
          var pinBadge = isPinned ? '<img src="/icon/pin-post.png" style="position:absolute;top:12px;right:12px;width:28px;height:28px;z-index:1">' : '';
          return '<article class="post-card" style="position:relative' + (isPinned ? ';border:2px solid #ffd700;box-shadow:0 4px 16px rgba(255,215,0,0.3)' : '') + '">' +
            '<div class="post-cover">' + cover + '</div>' +
            pinBadge +
            '<div class="post-content">' +
              '<h2><a href="/post/' + formatDate(post.created_at) + '/' + post.id + '">' + escHtml(post.title) + '</a></h2>' +
              '<p style="color:' + themeColors.textBody + ';font-size:0.9em;line-height:1.7;margin:8px 0">' + excerpt + '</p>' +
              (tags ? '<div style="margin:8px 0 0">' + tags + '</div>' : '') +
              '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">' +
                '<div class="meta"><span><img src="/icon/category.png" style="width:16px;height:16px;vertical-align:middle;margin-right:4px">' + escHtml(post.category) + '</span><span>' + (function(d){return d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日'})(new Date(post.created_at)) + '</span></div>' +
                '<a class="read-more" href="/post/' + formatDate(post.created_at) + '/' + post.id + '">阅读更多</a>' +
              '</div>' +
            '</div>' +
          '</article>';
        }).join('');

        // 分页控件
        if (pagination.totalPages > 1) {
          html += '<div class="pagination">';
          if (page > 1) {
            html += '<a href="javascript:void(0)" onclick="loadPosts(' + (page-1) + ')">上一页</a>';
          }
          for (var i = 1; i <= pagination.totalPages; i++) {
            if (i === page) {
              html += '<span class="current">' + i + '</span>';
            } else if (Math.abs(i - page) <= 2 || i === 1 || i === pagination.totalPages) {
              html += '<a href="javascript:void(0)" onclick="loadPosts(' + i + ')">' + i + '</a>';
            } else if (Math.abs(i - page) === 3) {
              html += '<span style="padding:8px 8px">...</span>';
            }
          }
          if (page < pagination.totalPages) {
            html += '<a href="javascript:void(0)" onclick="loadPosts(' + (page+1) + ')">下一页</a>';
          }
          html += '</div>';
        }

        app.innerHTML = html;
      }).catch(function(e) {
        console.error('加载文章失败:', e);
        document.getElementById('app').innerHTML = '<p style="text-align:center;color:#e05a5a;">加载失败，请刷新重试</p>';
      });
    }

    loadPosts(currentPage);

    // 搜索功能（标题 + 标签）
    var searchTimer;
    document.getElementById('search-input').addEventListener('input', function() {
      clearTimeout(searchTimer);
      var keyword = this.value.trim().toLowerCase();
      searchTimer = setTimeout(function() {
        var cards = document.querySelectorAll('.post-card');
        cards.forEach(function(card) {
          if (!keyword) { card.style.display = ''; return; }
          var title = card.querySelector('h2 a');
          var titleText = title ? title.textContent.toLowerCase() : '';
          var tags = card.querySelectorAll('span[style*="background:#e6f9f6"]');
          var tagText = '';
          tags.forEach(function(t) { tagText += t.textContent.toLowerCase() + ' '; });
          var match = titleText.indexOf(keyword) !== -1 || tagText.indexOf(keyword) !== -1;
          card.style.display = match ? '' : 'none';
        });
      }, 200);
    });
  </script>
  <script>
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
