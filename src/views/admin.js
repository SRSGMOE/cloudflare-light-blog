// ==================== 后台管理页面 ====================

import { escapeHtml } from '../lib/utils.js';

export function getAdminHTML() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>博客管理后台</title>
  <link rel="icon" href="/icon/favicon.ico">
  <script src="https://cdn.bootcdn.net/ajax/libs/vue/3.4.27/vue.global.prod.min.js" crossorigin="anonymous"><\/script>
  <script src="https://cdn.bootcdn.net/ajax/libs/axios/1.7.2/axios.min.js" crossorigin="anonymous"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ui-rounded, 'PingFang SC', 'Microsoft YaHei', sans-serif; background: var(--body-bg, #f8f8f0); color: var(--text-body, #725d42); }
    .login { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--header-bg, linear-gradient(135deg, #7DC395, #5BAF7A)); }
    .login-box { background: #f7f3df; padding: 40px; border-radius: 20px; width: 100%; max-width: 400px; text-align: center; border: 2px solid #e8e0cc; box-shadow: 0 4px 10px rgba(107, 92, 67, 0.42); }
    .login-box h1 { margin-bottom: 20px; color: #794f27; font-weight: 700; }
    .login-box input { width: 100%; padding: 12px 18px; margin-bottom: 16px; border: 2.5px solid #c4b89e; border-radius: 50px; font-size: 14px; background: #f8f8f0; color: #725d42; box-shadow: 0 3px 0 0 #d4c9b4; outline: none; }
    .login-box input:focus { border-color: #ffcc00; box-shadow: 0 3px 0 0 #e0b800; }
    .login-box button { width: 100%; padding: 14px; background: #19c8b9; color: #fff; border: none; border-radius: 50px; font-size: 16px; font-weight: 600; cursor: pointer; box-shadow: 0 5px 0 0 #11a89b; }
    .admin-layout { display: flex; min-height: 100vh; }
    .sidebar { width: 240px; background: var(--sidebar-bg, #8ac68a); color: #fff; flex-shrink: 0; }
    .sidebar-header { padding: 24px 20px; text-align: center; border-bottom: 2px solid rgba(255,255,255,0.2); }
    .sidebar-header h1 { font-size: 20px; display: flex; align-items: center; justify-content: center; }
    .sidebar-menu { padding: 16px 12px; }
    .sidebar-menu a { display: flex; align-items: center; justify-content: center; padding: 14px 16px; color: rgba(255,255,255,0.85); text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin-bottom: 6px; transition: all 0.25s ease; }
    .sidebar-menu a:hover { background: #d6dff0; color: #fff; }
    .sidebar-menu a.active { background: #B7C6E5; color: #fff; box-shadow: 0 3px 0 0 #9aaed4; }
    .sidebar-menu a .nav-icon { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; margin-right: 10px; }
    .sidebar-menu a .nav-icon img { width: 100%; height: 100%; }
    .sidebar-header-icon { width: 24px; height: 24px; margin-right: 10px; }
    .sidebar-footer-icon { width: 18px; height: 18px; margin-right: 8px; }
    .sidebar-footer { padding: 16px 20px; border-top: 2px solid rgba(255,255,255,0.2); }
    .sidebar-footer button { width: 100%; padding: 10px; background: rgba(255,255,255,0.2); color: #fff; border: none; border-radius: 50px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 15px; }
    .main-content { flex: 1; padding: 30px; }
    .page-header { margin-bottom: 24px; }
    .page-header h2 { color: #794f27; font-size: 1.5em; }
    .btn { padding: 10px 24px; background: var(--btn-bg, #19c8b9); color: #fff; border: none; border-radius: 50px; cursor: pointer; font-weight: 600; box-shadow: 0 4px 0 0 var(--btn-shadow, #11a89b); }
    .btn:hover { transform: translateY(-1px); }
    .btn-danger { background: var(--danger-bg, #e05a5a); box-shadow: 0 4px 0 0 var(--danger-shadow, #c94444); }
    .btn-cancel { background: #e8e0d0; color: #725d42; border: none; border-radius: 50px; cursor: pointer; font-weight: 600; box-shadow: 0 4px 0 0 #c4b89e; padding: 10px 24px; }
    .btn-cancel:hover { transform: translateY(-1px); box-shadow: 0 5px 0 0 #c4b89e; }
    .btn-back { background: linear-gradient(135deg, #7DC395, #5BAF7A); color: #fff; border: none; border-radius: 50px; cursor: pointer; font-weight: 600; box-shadow: 0 4px 0 0 #4a9a68; padding: 8px 20px; font-size: 14px; }
    .btn-back:hover { transform: translateY(-1px); box-shadow: 0 5px 0 0 #4a9a68; }
    .btn-import { background: #19c8b9; box-shadow: 0 4px 0 0 #11a89b; }
    .btn-import:hover { transform: translateY(-1px); box-shadow: 0 5px 0 0 #11a89b; }
    .btn-pin { background: #FFB74D; box-shadow: 0 4px 0 0 #E8A33D; color: #fff; }
    .btn-pin:hover { transform: translateY(-1px); box-shadow: 0 5px 0 0 #E8A33D; }
    /* 美化单选按钮样式 */
    .radio-item { position: relative; display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .radio-item input[type="radio"] { position: absolute; opacity: 0; width: 0; height: 0; }
    .radio-item .radio-custom { width: 20px; height: 20px; border: 2.5px solid #c4b89e; border-radius: 50%; background: #f8f8f0; transition: all 0.25s ease; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 0 0 #d4c9b4; }
    .radio-item .radio-custom::after { content: ''; width: 10px; height: 10px; border-radius: 50%; background: transparent; transition: all 0.25s ease; }
    .radio-item input[type="radio"]:checked + .radio-custom { border-color: #19c8b9; box-shadow: 0 2px 0 0 #11a89b; }
    .radio-item input[type="radio"]:checked + .radio-custom::after { background: linear-gradient(135deg, #19c8b9, #11a89b); }
    .radio-item:hover .radio-custom { border-color: #19c8b9; }
    .radio-item .radio-label { font-size: 14px; color: #725d42; font-weight: 500; user-select: none; }
    .card { background: var(--card-bg, #f7f3df); border-radius: 20px; padding: 24px; box-shadow: 0 4px 10px rgba(107,92,67,0.42); border: 2px solid var(--card-border, #e8e0cc); margin-bottom: 16px; }
    .form-group { margin-bottom: 18px; }
    .form-group > label { display: block; margin-bottom: 8px; font-weight: 600; color: #794f27; }
    .form-group input, .form-group textarea, .form-group select { width: 100%; padding: 12px 18px; border: 2.5px solid var(--input-border, #c4b89e); border-radius: 50px; font-size: 14px; background-color: #f8f8f0; color: var(--text-body, #725d42); box-shadow: 0 3px 0 0 var(--input-shadow, #d4c9b4); font-weight: 500; }
    .form-group input:focus, .form-group textarea:focus, .form-group select:focus { border-color: #ffcc00; box-shadow: 0 3px 0 0 #e0b800; outline: none; }
    .form-group textarea { border-radius: 18px; min-height: 80px; resize: vertical; }
    .custom-select { position: relative; }
    .custom-select-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 18px;
      background: #f8f8f0;
      border: 2.5px solid #c4b89e;
      border-radius: 50px;
      cursor: pointer;
      box-shadow: 0 3px 0 0 #d4c9b4;
      transition: all 0.25s;
      font-weight: 500;
      color: #725d42;
      min-height: 45px;
    }
    .custom-select-trigger:hover { border-color: #a89878; }
    .custom-select-trigger.active { border-color: #ffcc00; box-shadow: 0 3px 0 0 #e0b800; }
    .custom-select-trigger::after {
      content: '';
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 6px solid #725d42;
      transition: transform 0.2s;
    }
    .custom-select-trigger.active::after { transform: rotate(180deg); }
    .custom-select-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      background: #f8f8f0;
      border: 2px solid #c4b89e;
      border-radius: 12px;
      max-height: 200px;
      overflow-y: auto;
      z-index: 1000;
      display: none;
      box-shadow: 0 8px 24px rgba(107, 92, 67, 0.2);
    }
    .custom-select-dropdown.show { display: block; }
    .custom-select-option {
      padding: 10px 16px;
      cursor: pointer;
      transition: all 0.15s;
      font-weight: 500;
    }
    .custom-select-option:first-child { border-radius: 10px 10px 0 0; }
    .custom-select-option:last-child { border-radius: 0 0 10px 10px; }
    .custom-select-option:hover { background: #e6f9f6; color: #11a89b; }
    .custom-select-option.selected { background: #19c8b9; color: #fff; }
    .custom-select-option.disabled { color: #c4b89e; cursor: default; }
    .custom-select-option.disabled:hover { background: transparent; color: #c4b89e; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .actions { display: flex; gap: 6px; }
    .actions button { padding: 6px 14px; border: none; border-radius: 50px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .actions .edit, .edit { background: #79ade9; color: #fff; box-shadow: 0 3px 0 0 #6299d4; }
    .actions .edit:hover, .edit:hover { transform: translateY(-1px); box-shadow: 0 4px 0 0 #6299d4; }
    .actions .delete, .delete { background: #fc736d; color: #fff; box-shadow: 0 3px 0 0 #e05a54; }
    .actions .delete:hover, .delete:hover { transform: translateY(-1px); box-shadow: 0 4px 0 0 #e05a54; }
    .editor-layout { display: flex; gap: 20px; align-items: stretch; }
    .editor-main { flex: 3; }
    .editor-side { flex: 1; }
    .modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(107,92,67,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-box { background: #f7f3df; border-radius: 20px; padding: 32px; max-width: 400px; width: 90%; border: 2px solid #e8e0cc; }
    .toast { position: fixed; bottom: 20px; right: 20px; padding: 16px 24px; background: #6fba2c; color: #fff; border-radius: 50px; font-weight: 600; }
    .w-33 { width: 640px; }
    .w-50 { width: 740px; }
    .w-60 { width: 100%; }
    .main-content { min-width: 0; max-width: 100%; overflow-x: auto; }
    /* ========== 平板端 (768px - 1024px) ========== */
    @media (min-width: 769px) and (max-width: 1024px) {
      .admin-layout { flex-direction: column; }
      .sidebar {
        width: 100%;
        flex-direction: row;
        overflow-x: auto;
        padding: 0;
        flex-shrink: 0;
      }
      .sidebar-header {
        padding: 12px 16px;
        white-space: nowrap;
        display: flex;
        align-items: center;
      }
      .sidebar-header h1 { font-size: 16px; }
      .sidebar-menu {
        display: flex;
        padding: 8px 12px;
        gap: 6px;
        flex-wrap: nowrap;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        flex: 1;
      }
      .sidebar-menu a {
        white-space: nowrap;
        padding: 10px 16px;
        margin: 0;
        font-size: 14px;
        border-radius: 10px;
      }
      .sidebar-footer {
        padding: 8px 16px;
        white-space: nowrap;
        display: flex;
        align-items: center;
      }
      .sidebar-footer button {
        padding: 8px 18px;
        font-size: 14px;
      }
      .main-content { padding: 20px; }
      .page-header h2 { font-size: 1.4em; }
      .card { padding: 20px; border-radius: 18px; }
      .editor-layout { flex-direction: column; }
      .editor-main, .editor-side { width: 100%; }
      .form-row { grid-template-columns: 1fr 1fr; }
      table { font-size: 14px; }
      th, td { padding: 12px 14px !important; }
      .w-33 { width: 50% !important; }
      .w-50 { width: 50% !important; }
      .w-66 { width: 100% !important; }
    }

    /* ========== 手机端 (≤768px) ========== */
    @media (max-width: 768px) {
      .admin-layout { flex-direction: column; }
      .sidebar {
        width: 100%;
        flex-direction: row;
        overflow-x: auto;
        padding: 0;
        flex-shrink: 0;
        position: sticky;
        top: 0;
        z-index: 100;
      }
      .sidebar-header {
        padding: 10px 12px;
        white-space: nowrap;
        display: flex;
        align-items: center;
      }
      .sidebar-header h1 { font-size: 15px; }
      .sidebar-menu {
        display: flex;
        padding: 6px 8px;
        gap: 4px;
        flex-wrap: nowrap;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        flex: 1;
      }
      .sidebar-menu a {
        white-space: nowrap;
        padding: 8px 12px;
        margin: 0;
        font-size: 12px;
        border-radius: 8px;
      }
      .sidebar-footer {
        padding: 6px 10px;
        white-space: nowrap;
        display: flex;
        align-items: center;
      }
      .sidebar-footer button {
        padding: 6px 14px;
        font-size: 12px;
      }
      .main-content { padding: 12px; }
      .page-header { margin-bottom: 12px; }
      .page-header h2 { font-size: 1.2em; }
      .card { padding: 14px; border-radius: 14px; margin-bottom: 12px; }
      .btn { padding: 10px 20px; font-size: 14px; }
      .btn-cancel { padding: 10px 20px; font-size: 14px; }
      .editor-layout { flex-direction: column; }
      .editor-main, .editor-side { width: 100%; }
      .form-row { grid-template-columns: 1fr; }
      .form-group { margin-bottom: 14px; }
      .form-group label { font-size: 14px; margin-bottom: 6px; }
      .form-group input, .form-group textarea, .form-group select { font-size: 15px; padding: 12px 16px; }
      .custom-select-trigger { font-size: 14px; padding: 12px 16px; min-height: 44px; }
      .custom-select-option { padding: 12px 16px; font-size: 14px; }
      /* 表格横向滚动 */
      .card[style*="padding:0"] { overflow-x: auto; -webkit-overflow-scrolling: touch; }
      table { min-width: 600px; font-size: 13px; }
      th { font-size: 13px !important; padding: 10px 12px !important; }
      td { font-size: 13px !important; padding: 10px 12px !important; }
      /* 封面图区域 */
      .cover-upload { min-height: 60px; }
      /* 自定义下拉 */
      .custom-select-dropdown { max-height: 200px; }
      .w-33, .w-50, .w-60 { width: 100% !important; }
    }

</style>
</head>
<body>
  <div id="app">
    <div v-if="!logged" class="login" role="main" aria-label="登录">
      <div class="login-box">
        <h1>博客管理后台</h1>
        <input v-model="username" type="text" placeholder="请输入账号" aria-label="管理员账号">
        <input v-model="password" type="password" placeholder="请输入密码" @keyup.enter="login" aria-label="管理员密码">
        <button @click="login" aria-label="登录">登录</button>
      </div>
    </div>
    <div v-else class="admin-layout">
      <nav class="sidebar" role="navigation" aria-label="主导航">
        <div class="sidebar-header"><h1><img src="/icon/dashboard.png" alt="" class="sidebar-header-icon">管理后台</h1></div>
        <div class="sidebar-menu" role="menubar">
          <a href="#" role="menuitem" :class="{active:currentPage==='posts'}" @click.prevent="currentPage='posts'" aria-label="文章管理"><span v-if="currentPage==='posts'" class="nav-icon"><img src="/icon/navigate.png" alt=""></span>文章管理</a>
          <a href="#" role="menuitem" :class="{active:currentPage==='category'}" @click.prevent="currentPage='category'" aria-label="分类管理"><span v-if="currentPage==='category'" class="nav-icon"><img src="/icon/navigate.png" alt=""></span>分类管理</a>
          <a href="#" role="menuitem" :class="{active:currentPage==='profile'}" @click.prevent="currentPage='profile'" aria-label="个人设置"><span v-if="currentPage==='profile'" class="nav-icon"><img src="/icon/navigate.png" alt=""></span>个人设置</a>
          <a href="#" role="menuitem" :class="{active:currentPage==='appearance'}" @click.prevent="currentPage='appearance'" aria-label="外观布局"><span v-if="currentPage==='appearance'" class="nav-icon"><img src="/icon/navigate.png" alt=""></span>外观布局</a>
          <a href="#" role="menuitem" :class="{active:currentPage==='settings'}" @click.prevent="currentPage='settings'" aria-label="网站设置"><span v-if="currentPage==='settings'" class="nav-icon"><img src="/icon/navigate.png" alt=""></span>网站设置</a>
          <a href="#" role="menuitem" :class="{active:currentPage==='trash'}" @click.prevent="currentPage='trash'" aria-label="回收站"><span v-if="currentPage==='trash'" class="nav-icon"><img src="/icon/navigate.png" alt=""></span>回收站</a>
        </div>
        <div class="sidebar-footer"><button @click="logout"><img src="/icon/logout.png" alt="" class="sidebar-footer-icon">退出登录</button></div>
      </nav>
      <div class="main-content" role="main" aria-label="主要内容">
        <div v-if="currentPage==='posts'">
          <!-- 文章列表 -->
          <div v-if="!editingId">
          <div class="page-header"><h2>文章管理</h2></div>
          <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
            <button class="btn" @click="openAdd()">新建文章</button>
            <button class="btn btn-import" @click="showImportModal=true">导入文章</button>
          </div>
          <div class="w-60"><div class="card" style="padding:0;overflow:hidden">
            <table style="width:100%;border-collapse:collapse">
              <thead>
                <tr style="background:#f0e8d8">
                  <th style="padding:16px 16px;text-align:center;color:#794f27;font-weight:700;font-size:15px;width:70px;white-space:nowrap">删除</th>
                  <th style="padding:16px 16px;text-align:center;color:#794f27;font-weight:700;font-size:15px;width:70px;white-space:nowrap">编辑</th>
                  <th style="padding:16px 16px;text-align:center;color:#794f27;font-weight:700;font-size:15px;width:60px">ID</th>
                  <th style="padding:16px 16px;text-align:left;color:#794f27;font-weight:700;font-size:15px">文章标题</th>
                  <th style="padding:16px 16px;text-align:left;color:#794f27;font-weight:700;font-size:15px;width:120px;white-space:nowrap">分类</th>
                  <th style="padding:16px 16px;text-align:left;color:#794f27;font-weight:700;font-size:15px;width:200px">标签</th>
                  <th style="padding:16px 16px;text-align:center;color:#794f27;font-weight:700;font-size:15px;width:100px">状态</th>
                  <th style="padding:16px 16px;text-align:right;color:#794f27;font-weight:700;font-size:15px;width:120px">发布日期</th>
                  <th style="padding:16px 16px;text-align:right;color:#794f27;font-weight:700;font-size:15px;width:120px">最后更新</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(post, idx) in posts.slice((postPage-1)*postPageSize, postPage*postPageSize)" :key="post.id">
                  <tr style="border-top:1px solid #e8e0cc">
                    <td style="padding:14px 16px;text-align:center;white-space:nowrap"><button class="delete" @click="deletePost(post.id)" style="padding:5px 14px;border:none;border-radius:50px;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s;white-space:nowrap">删除</button></td>
                    <td style="padding:14px 16px;text-align:center;white-space:nowrap"><button class="edit" @click="toggleEdit(post)" style="padding:5px 14px;border:none;border-radius:50px;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s;white-space:nowrap">编辑</button></td>
                    <td style="padding:14px 16px;text-align:center;color:#9f927d;font-size:14px">#{{post.id}}</td>
                    <td style="padding:14px 16px;color:#794f27;font-weight:600;font-size:16px;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                      <span v-if="currentPinnedId == post.id" style="color:#ff6b00;margin-right:4px" title="已置顶">📌</span>{{post.title}}
                    </td>
                    <td style="padding:14px 16px;color:#9f927d;font-size:15px;white-space:nowrap">{{post.category}}</td>
                    <td style="padding:14px 16px">
                      <div style="display:flex;flex-wrap:wrap;gap:4px">
                        <template v-for="(tag, i) in (post.tags || '').split(',').filter(t => t.trim())" :key="i">
                          <span style="display:inline-block;padding:2px 8px;background:#e6f9f6;color:#11a89b;font-size:12px;font-weight:600;border-radius:12px;border:1px solid #19c8b9">{{tag.trim()}}</span>
                        </template>
                      </div>
                    </td>
                    <td style="padding:14px 16px;text-align:center;white-space:nowrap"><span :style="{display:'inline-block',width:'8px',height:'8px',borderRadius:'50%',background:post.status==='published'?'#22c55e':'#9f927d',marginRight:'6px',verticalAlign:'middle'}"></span><span style="font-size:15px;color:#725d42;vertical-align:middle">{{post.status==='published'?'已发布':'草稿'}}</span></td>
                    <td style="padding:14px 16px;text-align:right;color:#9f927d;font-size:15px">{{new Date(post.published_at || post.created_at).toLocaleDateString('zh-CN')}}</td>
                    <td style="padding:14px 16px;text-align:right;color:#9f927d;font-size:15px">{{post.updated_at ? new Date(post.updated_at).toLocaleDateString('zh-CN') : '-'}}</td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
          <div v-if="Math.ceil(posts.length / postPageSize) > 1" style="display:flex;justify-content:center;gap:8px;margin-top:16px">
            <button class="btn btn-cancel" @click="postPage=Math.max(1,postPage-1)" :style="{opacity:postPage<=1?0.4:1}" :disabled="postPage<=1" style="padding:8px 16px;font-size:14px">上一页</button>
            <span style="display:flex;align-items:center;color:#725d42;font-weight:600;font-size:14px">{{postPage}} / {{Math.ceil(posts.length / postPageSize)}}</span>
            <button class="btn btn-cancel" @click="postPage=Math.min(Math.ceil(posts.length/postPageSize),postPage+1)" :style="{opacity:postPage>=Math.ceil(posts.length/postPageSize)?0.4:1}" :disabled="postPage>=Math.ceil(posts.length/postPageSize)" style="padding:8px 16px;font-size:14px">下一页</button>
          </div>
          </div>
          </div>

          <!-- 编辑/新建文章 -->
          <div v-if="editingId" class="card" style="margin-top:20px">
            <div class="page-header" style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
              <button class="btn-back" @click="cancelNewPost">返回</button>
              <h2>{{editingId === 'new' ? '新建文章' : '编辑文章'}}</h2>
            </div>
            <div class="editor-layout">
              <div class="editor-main" style="display:flex;flex-direction:column">
                <div class="form-group"><label>文章标题</label><input v-model="form.title"></div>
                <div class="form-group" style="flex:1;display:flex;flex-direction:column">
                  <label>文章内容</label>
                  <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">
                    <button type="button" @click="insertMd('heading')" style="padding:4px 10px;background:#f0e8d8;border:2px solid #c4b89e;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;color:#725d42">标题</button>
                    <button type="button" @click="insertMd('bold')" style="padding:4px 10px;background:#f0e8d8;border:2px solid #c4b89e;border-radius:6px;cursor:pointer;font-size:12px;font-weight:700;color:#725d42">B</button>
                    <button type="button" @click="insertMd('italic')" style="padding:4px 10px;background:#f0e8d8;border:2px solid #c4b89e;border-radius:6px;cursor:pointer;font-size:12px;font-style:italic;color:#725d42">I</button>
                    <button type="button" @click="insertMd('link')" style="padding:4px 10px;background:#f0e8d8;border:2px solid #c4b89e;border-radius:6px;cursor:pointer;font-size:12px;color:#725d42">🔗</button>
                    <button type="button" @click="insertMd('image')" style="padding:4px 10px;background:#f0e8d8;border:2px solid #c4b89e;border-radius:6px;cursor:pointer;font-size:12px;color:#725d42">🖼</button>
                    <button type="button" @click="insertMd('code')" style="padding:4px 10px;background:#f0e8d8;border:2px solid #c4b89e;border-radius:6px;cursor:pointer;font-size:12px;color:#725d42">代码</button>
                    <button type="button" @click="insertMd('ul')" style="padding:4px 10px;background:#f0e8d8;border:2px solid #c4b89e;border-radius:6px;cursor:pointer;font-size:12px;color:#725d42">•列表</button>
                    <button type="button" @click="insertMd('ol')" style="padding:4px 10px;background:#f0e8d8;border:2px solid #c4b89e;border-radius:6px;cursor:pointer;font-size:12px;color:#725d42">1.序号</button>
                    <button type="button" @click="insertMd('quote')" style="padding:4px 10px;background:#f0e8d8;border:2px solid #c4b89e;border-radius:6px;cursor:pointer;font-size:12px;color:#725d42">❝引用</button>
                    <button type="button" @click="insertMd('hr')" style="padding:4px 10px;background:#f0e8d8;border:2px solid #c4b89e;border-radius:6px;cursor:pointer;font-size:12px;color:#725d42">—分割线</button>
                    <button type="button" @click="insertMd('details')" style="padding:4px 10px;background:#f0e8d8;border:2px solid #c4b89e;border-radius:6px;cursor:pointer;font-size:12px;color:#725d42">▼折叠</button>
                  </div>
                  <div style="background:#faf8f2;border:2px solid #e8e0cc;border-radius:12px;padding:12px;margin-bottom:8px;max-height:200px;overflow-y:auto;display:flex;flex-wrap:wrap;gap:8px">
                    <div v-if="!settingsForm.iconfont_css" style="color:#9f927d;font-size:13px;padding:8px">未配置表情包链接，请在「网站设置」中配置并保存</div>
                    <div v-else-if="emojiLoading" style="color:#9f927d;font-size:13px;padding:8px">加载中...</div>
                    <div v-else-if="iconList.length === 0" style="color:#9f927d;font-size:13px;padding:8px">未找到图标，请检查链接是否正确</div>
                    <div v-for="icon in iconList" :key="icon.cls" @click="insertEmoji(icon)" style="cursor:pointer;padding:6px;border-radius:8px;transition:background 0.2s" @mouseenter="$event.currentTarget.style.background='#e8e0cc'" @mouseleave="$event.currentTarget.style.background='transparent'">
                      <svg v-if="icon.type === 'svg'" aria-hidden="true" style="width:24px;height:24px;fill:currentColor;overflow:hidden"><use :xlink:href="'#' + icon.cls"></use></svg>
                      <i v-else :class="icon.cls" style="font-size:24px"></i>
                    </div>
                  </div>
                  <textarea v-model="form.content" style="flex:1;min-height:400px"></textarea>
                </div>
                <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:auto;padding-top:12px"><button class="btn" @click="savePost">保存</button><button class="btn btn-cancel" @click="cancelNewPost">取消</button></div>
              </div>
              <div class="editor-side">
                <div class="form-group"><label>发布状态</label>
                  <div class="custom-select" @click.stop>
                    <div class="custom-select-trigger" :class="{active: customSelects['status']}" @click="toggleSelect('status')">{{ form.status === 'draft' ? '草稿' : '已发布' }}</div>
                    <div class="custom-select-dropdown" :class="{show: customSelects['status']}">
                      <div class="custom-select-option" :class="{selected: form.status==='draft'}" @click="selectOption('status', 'draft', 'status')">草稿</div>
                      <div class="custom-select-option" :class="{selected: form.status==='published'}" @click="selectOption('status', 'published', 'status')">已发布</div>
                    </div>
                  </div>
                </div>
                <div class="form-group"><label>发布日期</label><input type="date" v-model="form.published_at"></div>
                <div class="form-group"><label>文章分类</label>
                  <div class="custom-select" @click.stop>
                    <div class="custom-select-trigger" :class="{active: customSelects['category']}" @click="toggleSelect('category')">{{ form.category || '请选择' }}</div>
                    <div class="custom-select-dropdown" :class="{show: customSelects['category']}">
                      <div class="custom-select-option" @click="selectOption('category', '', 'category')">请选择</div>
                      <div v-for="cat in categories" :key="cat.id" class="custom-select-option" :class="{selected: form.category===cat.name}" @click="selectOption('category', cat.name, 'category')">{{ cat.name }}</div>
                    </div>
                  </div>
                </div>
                <div class="form-group"><label>文章标签</label><input v-model="form.tags" placeholder="多个标签用英文逗号隔开，如：JavaScript,Vue,React"></div>
                <div class="form-group">
                  <label>文章密码</label>
                  <div style="display:flex;align-items:center;gap:12px">
                    <label class="radio-item" style="margin:0">
                      <input type="radio" value="" v-model="form.passwordType">
                      <span class="radio-custom"></span>
                      <span class="radio-label">无</span>
                    </label>
                    <label class="radio-item" style="margin:0">
                      <input type="radio" value="has" v-model="form.passwordType">
                      <span class="radio-custom"></span>
                      <span class="radio-label">有</span>
                    </label>
                    <input v-if="form.passwordType === 'has'" v-model="form.password" type="password" :placeholder="form.hadPassword ? '已设置，留空保持不变' : '请输入密码'" style="flex:1">
                  </div>
                </div>
                <div class="form-group">
                  <label>封面图片</label>
                  <input v-model="form.cover_image" @input="coverPreview=form.cover_image" placeholder="输入外链地址" style="width:100%;margin-bottom:8px">
                  <div style="display:flex;gap:12px;align-items:center;justify-content:center">
                    <div @dragover.prevent="$event.currentTarget.style.borderColor='#19c8b9'" @dragleave="$event.currentTarget.style.borderColor='#c4b89e'" @drop.prevent="$event.currentTarget.style.borderColor='#c4b89e';handleCoverDrop($event)" @click="$event.currentTarget.querySelector('input[type=file]').click()" style="width:200px;height:200px;border:2px dashed #c4b89e;border-radius:12px;background:#f0e8d8;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;cursor:pointer;transition:border-color 0.2s">
                      <input type="file" @change="handleCoverChange" accept="image/*" @click.stop style="display:none">
                      <img v-if="coverPreview" :src="coverPreview" style="width:200px;height:200px;object-fit:cover;pointer-events:none">
                      <p v-else style="color:#9f927d;font-size:13px;pointer-events:none">点击或拖拽上传</p>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:8px">
                      <button type="button" @click="$event.target.closest('div').querySelector('input[type=file]').click()" style="padding:8px 20px;background:#19c8b9;color:#fff;border:none;border-radius:50px;cursor:pointer;font-size:13px;font-weight:600;box-shadow:0 3px 0 0 #11a89b;white-space:nowrap">{{coverPreview ? '更换' : '上传'}}</button>
                      <input type="file" @change="handleCoverChange" accept="image/*" style="display:none">
                      <button v-if="coverPreview" @click="deleteCover" style="padding:8px 20px;background:#e05a5a;color:#fff;border:none;border-radius:50px;cursor:pointer;font-size:13px;font-weight:600;box-shadow:0 3px 0 0 #c94444;white-space:nowrap">删除</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="currentPage==='category'">
          <div class="page-header"><h2>分类管理</h2></div>
          <button class="btn" @click="editingCategory='new';categoryForm={name:'',slug:'',description:''}" style="margin-bottom:16px">添加分类</button>
          <div v-if="editingCategory==='new'" class="card w-50">
            <div class="form-row">
              <div class="form-group"><label>英文ID</label><input v-model="categoryForm.slug"></div>
              <div class="form-group"><label>中文名称</label><input v-model="categoryForm.name"></div>
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn" @click="saveCategory">保存</button><button class="btn btn-cancel" @click="editingCategory=null">取消</button></div>
          </div>
          <div class="w-50">
            <div class="card" style="padding:0;overflow:hidden">
              <table style="width:100%;border-collapse:collapse">
                <thead>
                  <tr style="background:#f0e8d8">
                    <th style="padding:14px 16px;text-align:center;color:#794f27;font-weight:700;font-size:15px;width:70px;white-space:nowrap">删除</th>
                    <th style="padding:14px 16px;text-align:center;color:#794f27;font-weight:700;font-size:15px;width:70px;white-space:nowrap">编辑</th>
                    <th style="padding:14px 16px;text-align:left;color:#794f27;font-weight:700;font-size:15px">英文ID</th>
                    <th style="padding:14px 16px;text-align:left;color:#794f27;font-weight:700;font-size:15px">中文名称</th>
                    <th style="padding:14px 16px;text-align:center;color:#794f27;font-weight:700;font-size:15px;width:90px;white-space:nowrap">文章数</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="cat in categories" :key="cat.id">
                    <tr style="border-top:1px solid #e8e0cc">
                      <td style="padding:14px 16px;text-align:center;white-space:nowrap"><button class="delete" @click="deleteCategory(cat.id)" style="padding:5px 14px;border:none;border-radius:50px;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s;white-space:nowrap">删除</button></td>
                      <td style="padding:14px 16px;text-align:center;white-space:nowrap"><button class="edit" @click="editingCategory===cat.id?editingCategory=null:editCategory(cat)" style="padding:5px 14px;border:none;border-radius:50px;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s;white-space:nowrap">{{editingCategory===cat.id?'收起':'编辑'}}</button></td>
                      <td style="padding:14px 16px;color:#9f927d;font-size:15px">/{{cat.slug}}</td>
                      <td style="padding:14px 16px;color:#794f27;font-weight:600;font-size:16px">{{cat.name}}</td>
                      <td style="padding:14px 16px;text-align:center;color:#19c8b9;font-weight:700;font-size:15px">{{posts.filter(p => p.category === cat.name).length}}</td>
                    </tr>
                    <tr v-if="editingCategory===cat.id">
                      <td colspan="5" style="padding:16px;background:#faf8f2;border-top:2px solid #e8e0cc">
                        <div class="form-row">
                          <div class="form-group"><label>英文ID</label><input v-model="categoryForm.slug"></div>
                          <div class="form-group"><label>中文名称</label><input v-model="categoryForm.name"></div>
                        </div>
                        <div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn" @click="saveCategory">保存</button><button class="btn btn-cancel" @click="editingCategory=null">取消</button></div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div v-if="currentPage==='trash'">
          <div class="page-header"><h2>回收站</h2></div>
          <div v-if="trashPosts.length===0" class="card" style="text-align:center;color:#9f927d">回收站是空的</div>
          <div class="w-33"><div v-if="trashPosts.length > 0" class="card" style="padding:0;overflow:hidden">
            <table style="width:100%;border-collapse:collapse">
              <thead>
                <tr style="background:#f0e8d8">
                  <th style="padding:16px 16px;text-align:center;color:#794f27;font-weight:700;font-size:15px;width:80px;white-space:nowrap">删除</th>
                  <th style="padding:16px 16px;text-align:center;color:#794f27;font-weight:700;font-size:15px;width:80px;white-space:nowrap">恢复</th>
                  <th style="padding:16px 16px;text-align:center;color:#794f27;font-weight:700;font-size:15px;width:60px">ID</th>
                  <th style="padding:16px 16px;text-align:left;color:#794f27;font-weight:700;font-size:15px">文章标题</th>
                  <th style="padding:16px 16px;text-align:left;color:#794f27;font-weight:700;font-size:15px;width:150px;white-space:nowrap">分类</th>
                  <th style="padding:16px 16px;text-align:right;color:#794f27;font-weight:700;font-size:15px;width:120px">发布日期</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="post in trashPosts" :key="post.id" style="border-top:1px solid #e8e0cc">
                  <td style="padding:14px 16px;text-align:center;white-space:nowrap"><button class="delete" @click="permanentDelete(post.id)" style="padding:5px 14px;border:none;border-radius:50px;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s;white-space:nowrap">删除</button></td>
                  <td style="padding:14px 16px;text-align:center;white-space:nowrap"><button class="edit" @click="restorePost(post.id)" style="padding:5px 14px;border:none;border-radius:50px;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s;white-space:nowrap">恢复</button></td>
                  <td style="padding:14px 16px;text-align:center;color:#9f927d;font-size:14px">#{{post.id}}</td>
                  <td style="padding:14px 16px;color:#794f27;font-weight:600;font-size:16px;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{post.title}}</td>
                  <td style="padding:14px 16px;color:#9f927d;font-size:15px;white-space:nowrap">{{post.category}}</td>
                  
                  <td style="padding:14px 16px;text-align:right;color:#9f927d;font-size:15px">{{new Date(post.published_at || post.created_at).toLocaleDateString('zh-CN')}}</td>
                </tr>
              </tbody>
            </table>
          </div></div>
        </div>
        <div v-if="currentPage==='settings'">
          <div class="page-header"><h2>网站设置</h2></div>
          <button class="btn" @click="saveSiteSettings" style="margin-bottom:16px">保存设置</button>
          <div style="flex:0 0 33.33%;max-width:33.33%;min-width:300px">
          <div class="card">
            <div class="form-group"><label>网站标题</label><input v-model="settingsForm.site_name"></div>
            <div class="form-group"><label>网站副标题</label><input v-model="settingsForm.site_description"></div>
            <div class="form-group">
              <label>网站图标</label>
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
                <div style="width:36px;height:36px;border:2px solid #e8e0cc;border-radius:8px;background:#f0e8d8;display:flex;align-items:center;justify-content:center;overflow:hidden">
                  <img src="/icon/favicon.ico" style="width:32px;height:32px;object-fit:cover">
                </div>
                <span style="color:#9f927d;font-size:13px">替换 <code style="background:#f0e8d8;padding:2px 6px;border-radius:4px;font-size:12px">public/icon/favicon.ico</code> 文件即可更换</span>
              </div>
            </div>
            <div class="form-group"><label>网站页脚（支持HTML）</label><div style="display:flex;gap:8px;margin-bottom:8px"><button @click="applyFooterTemplate" style="padding:6px 12px;background:#19c8b9;color:white;border:none;border-radius:8px;cursor:pointer;font-size:0.85em">应用预设模板</button></div><textarea v-model="settingsForm.site_footer" rows="3"></textarea></div>
            <div class="form-group"><label>版权说明（支持HTML）</label><div style="display:flex;gap:8px;margin-bottom:8px"><button @click="applyCopyrightTemplate" style="padding:6px 12px;background:#19c8b9;color:white;border:none;border-radius:8px;cursor:pointer;font-size:0.85em">应用预设模板</button></div><textarea v-model="settingsForm.copyright_notice" rows="4" placeholder="例如：© 2026 我的博客. All rights reserved."></textarea></div>
            <div class="form-group"><label>表情包引入（仅支持阿里巴巴矢量图标库）</label><input v-model="settingsForm.iconfont_css" placeholder="Font class(.css) 或 Symbol(.js) 格式，如：//at.alicdn.com/t/c/font_xxx.js" style="width:100%"><p style="font-size:12px;color:#9f927d;margin-top:6px">支持 iconfont.cn 的 Font class（单色，颜色跟随文字）与 Symbol（多色，保留图库原始配色，推荐）格式，配置后可在编辑器中插入表情图标</p></div>
            <div class="form-group"><label>自定义JS（输入完整script标签）</label><textarea v-model="settingsForm.custom_js" rows="4" placeholder="请输入完整的 script 标签，例如：&lt;script src=&quot;https://cdn.jsdelivr.net/npm/xxx.js&quot;&gt;&lt;/script&gt;"></textarea></div>
            <div class="form-group">
              <label>全站密码</label>
              <div style="display:flex;align-items:center;gap:12px">
                <label class="radio-item" style="margin:0">
                  <input type="radio" value="" v-model="settingsForm.sitePasswordType">
                  <span class="radio-custom"></span>
                  <span class="radio-label">无</span>
                </label>
                <label class="radio-item" style="margin:0">
                  <input type="radio" value="has" v-model="settingsForm.sitePasswordType">
                  <span class="radio-custom"></span>
                  <span class="radio-label">有</span>
                </label>
                <input v-if="settingsForm.sitePasswordType === 'has'" v-model="settingsForm.site_password" type="password" :placeholder="sitePasswordSet ? '已设置，留空保持不变' : '请输入全站密码'" style="flex:1">
              </div>
            </div>
            <div class="form-group">
              <label>是否允许搜索引擎爬取</label>
              <div style="display:flex;align-items:center;gap:12px">
                <label class="radio-item" style="margin:0">
                  <input type="radio" value="1" v-model="settingsForm.allow_robots">
                  <span class="radio-custom"></span>
                  <span class="radio-label">是</span>
                </label>
                <label class="radio-item" style="margin:0">
                  <input type="radio" value="0" v-model="settingsForm.allow_robots">
                  <span class="radio-custom"></span>
                  <span class="radio-label">否</span>
                </label>
              </div>
            </div>
            <div class="form-group">
              <label>是否启用压缩</label>
              <div style="display:flex;align-items:center;gap:12px">
                <label class="radio-item" style="margin:0">
                  <input type="radio" value="1" v-model="settingsForm.enable_compression">
                  <span class="radio-custom"></span>
                  <span class="radio-label">是</span>
                </label>
                <label class="radio-item" style="margin:0">
                  <input type="radio" value="0" v-model="settingsForm.enable_compression">
                  <span class="radio-custom"></span>
                  <span class="radio-label">否</span>
                </label>
              </div>
            </div>
            <div class="form-group"><label>CORS 允许来源（多域名用逗号分隔，* 表示全部）</label><input v-model="settingsForm.allowed_origins" placeholder="*"></div>
          </div>
          </div>
        </div>
        <div v-if="currentPage==='appearance'">
          <div class="page-header"><h2>外观布局</h2></div>
          <button class="btn" @click="saveAppearanceSettings" style="margin-bottom:16px">保存设置</button>
          <div style="display:flex;gap:20px;flex-wrap:wrap">
            <div style="flex:0 0 33.33%;max-width:33.33%;min-width:300px">
              <div class="card">
                <div class="form-group">
                  <label>主题风格</label>
                  <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
                    <label class="radio-item" style="margin:0">
                      <input type="radio" value="animal-forest" v-model="settingsForm.site_theme" @change="applyTheme()">
                      <span class="radio-custom"></span>
                      <span class="radio-label">🌲 动森</span>
                    </label>
                    <label class="radio-item" style="margin:0">
                      <input type="radio" value="ocean-breeze" v-model="settingsForm.site_theme" @change="applyTheme()">
                      <span class="radio-custom"></span>
                      <span class="radio-label">🌊 蔚蓝</span>
                    </label>
                    <label class="radio-item" style="margin:0">
                      <input type="radio" value="diy-themes" v-model="settingsForm.site_theme" @change="applyTheme()">
                      <span class="radio-custom"></span>
                      <span class="radio-label">🎨 自定义</span>
                    </label>
                  </div>
                </div>
                <div class="form-group">
                  <label>个人简介位置</label>
                  <div style="display:flex;align-items:center;gap:12px">
                    <label class="radio-item" style="margin:0">
                      <input type="radio" value="left" v-model="settingsForm.profile_position">
                      <span class="radio-custom"></span>
                      <span class="radio-label">居左</span>
                    </label>
                    <label class="radio-item" style="margin:0">
                      <input type="radio" value="right" v-model="settingsForm.profile_position">
                      <span class="radio-custom"></span>
                      <span class="radio-label">居右</span>
                    </label>
                  </div>
                </div>
                <div class="form-group">
                  <label>标签云开关</label>
                  <div style="display:flex;align-items:center;gap:12px">
                    <label class="radio-item" style="margin:0">
                      <input type="radio" value="1" v-model="settingsForm.enable_tag_cloud">
                      <span class="radio-custom"></span>
                      <span class="radio-label">显示</span>
                    </label>
                    <label class="radio-item" style="margin:0">
                      <input type="radio" value="0" v-model="settingsForm.enable_tag_cloud">
                      <span class="radio-custom"></span>
                      <span class="radio-label">不显示</span>
                    </label>
                  </div>
                </div>
                <div class="form-group">
                  <label>标签云位置</label>
                  <div style="display:flex;align-items:center;gap:12px">
                    <label class="radio-item" style="margin:0">
                      <input type="radio" value="left" v-model="settingsForm.tag_cloud_position">
                      <span class="radio-custom"></span>
                      <span class="radio-label">居左</span>
                    </label>
                    <label class="radio-item" style="margin:0">
                      <input type="radio" value="right" v-model="settingsForm.tag_cloud_position">
                      <span class="radio-custom"></span>
                      <span class="radio-label">居右</span>
                    </label>
                  </div>
                </div>
                <div class="form-group">
                  <label>分类标题图标</label>
                  <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
                    <div style="width:36px;height:36px;border:2px solid #e8e0cc;border-radius:8px;background:#f0e8d8;display:flex;align-items:center;justify-content:center;overflow:hidden">
                      <img src="/icon/category.png" style="width:32px;height:32px;object-fit:cover">
                    </div>
                    <span style="color:#9f927d;font-size:13px">替换 <code style="background:#f0e8d8;padding:2px 6px;border-radius:4px;font-size:12px">public/icon/category.png</code> 文件即可更换</span>
                  </div>
                </div>
                <div class="form-group">
                  <label>置顶文章（输入编号）</label>
                  <div style="display:flex;align-items:center;gap:12px">
                    <label class="radio-item" style="margin:0">
                      <input type="radio" value="" v-model="settingsForm.pinnedType">
                      <span class="radio-custom"></span>
                      <span class="radio-label">无</span>
                    </label>
                    <label class="radio-item" style="margin:0">
                      <input type="radio" value="has" v-model="settingsForm.pinnedType">
                      <span class="radio-custom"></span>
                      <span class="radio-label">有</span>
                    </label>
                    <input v-if="settingsForm.pinnedType === 'has'" v-model="settingsForm.pinned_post_id" type="number" min="0" step="1" placeholder="输入文章编号" style="flex:1" @input="settingsForm.pinned_post_id = settingsForm.pinned_post_id.replace(/[^0-9]/g, '')">
                  </div>
                </div>
                <div class="form-group">
                  <label>置顶文章图标</label>
                  <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
                    <div style="width:36px;height:36px;border:2px solid #e8e0cc;border-radius:8px;background:#f0e8d8;display:flex;align-items:center;justify-content:center;overflow:hidden">
                      <img src="/icon/pin-post.png" style="width:32px;height:32px;object-fit:cover">
                    </div>
                    <span style="color:#9f927d;font-size:13px">替换 <code style="background:#f0e8d8;padding:2px 6px;border-radius:4px;font-size:12px">public/icon/pin-post.png</code> 文件即可更换</span>
                  </div>
                </div>
                <div class="form-group">
                  <label>广告位置</label>
                  <div style="display:flex;align-items:center;gap:12px">
                    <label class="radio-item" style="margin:0">
                      <input type="radio" value="left" v-model="settingsForm.ad_position">
                      <span class="radio-custom"></span>
                      <span class="radio-label">左侧栏</span>
                    </label>
                    <label class="radio-item" style="margin:0">
                      <input type="radio" value="right" v-model="settingsForm.ad_position">
                      <span class="radio-custom"></span>
                      <span class="radio-label">右侧栏</span>
                    </label>
                  </div>
                </div>
                <div class="form-group"><label>广告内容（支持 HTML 和 Markdown）</label><textarea v-model="settingsForm.ad_content" rows="4" placeholder="HTML 示例：&#10;<a href='https://example.com'><img src='广告图片链接'></a>&#10;Markdown 示例：&#10;[![广告](广告图片链接)](https://example.com)"></textarea><p style="font-size:12px;color:#9f927d;margin-top:6px">广告图片使用1:1比例</p></div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="currentPage==='profile'">
          <div class="page-header"><h2>个人设置</h2></div>
          <button class="btn" @click="saveProfileSettings" style="margin-bottom:16px">保存设置</button>
          <div style="display:flex;gap:20px;flex-wrap:wrap">
            <div style="flex:0 0 33.33%;max-width:33.33%;min-width:300px">
              <div class="card">
                <div class="form-group"><label>个人名称</label><input v-model="settingsForm.site_author"></div>
                <div class="form-group">
                  <label>个人头像</label>
                  <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
                    <div style="width:36px;height:36px;border:2px solid #e8e0cc;border-radius:8px;background:#f0e8d8;display:flex;align-items:center;justify-content:center;overflow:hidden">
                      <img src="/icon/profile.png" style="width:32px;height:32px;object-fit:cover">
                    </div>
                    <span style="color:#9f927d;font-size:13px">替换 <code style="background:#f0e8d8;padding:2px 6px;border-radius:4px;font-size:12px">public/icon/profile.png</code> 文件即可更换</span>
                  </div>
                </div>
                <div class="form-group"><label>个人简介</label><textarea v-model="settingsForm.site_bio" rows="3"></textarea></div>
                <div class="form-group"><label>建站时间</label><input type="date" v-model="settingsForm.site_created_at"></div>
                <div class="form-group"><label>友链标题</label><input v-model="settingsForm.links_title" placeholder="友链"></div>
                <div class="form-group">
                  <label>友链标题图标</label>
                  <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
                    <div style="width:36px;height:36px;border:2px solid #e8e0cc;border-radius:8px;background:#f0e8d8;display:flex;align-items:center;justify-content:center;overflow:hidden">
                      <img src="/icon/friend-links.png" style="width:32px;height:32px;object-fit:cover">
                    </div>
                    <span style="color:#9f927d;font-size:13px">替换 <code style="background:#f0e8d8;padding:2px 6px;border-radius:4px;font-size:12px">public/icon/friend-links.png</code> 文件即可更换</span>
                  </div>
                </div>
                <div class="form-group"><label>友链内容（名称,地址 每行一个）</label><textarea v-model="settingsForm.site_links" rows="4" placeholder="格式示例：&#10;Google,https://google.com&#10;GitHub,https://github.com&#10;示例站点,http://example.com&#10;&#10;支持 http:// 和 https:// 开头的网址"></textarea></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- 导入弹窗 -->
      <div v-if="showImportModal" class="modal" @click.self="showImportModal=false">
        <div class="modal-box" style="max-width:500px">
          <h3 style="color:#794f27;margin-bottom:12px">导入文章</h3>
          <p style="margin-bottom:16px;color:#725d42;font-size:14px">支持 WordPress 导出的 XML 文件</p>
          <div style="margin-bottom:16px">
            <input type="file" ref="importFile" accept=".xml" style="display:none" @change="handleImportFile">
            <button class="btn" @click="$refs.importFile.click()" style="width:100%">选择 XML 文件</button>
          </div>
          <div v-if="importFileName" style="margin-bottom:16px;padding:12px;background:#f8f8f0;border-radius:12px;border:2px solid #e8e0cc">
            <p style="color:#725d42;font-size:14px">已选择: {{importFileName}}</p>
          </div>
          <div v-if="importResult" style="margin-bottom:16px;padding:12px;background:#f8f8f0;border-radius:12px;border:2px solid #e8e0cc">
            <p style="color:#725d42;font-size:14px;margin-bottom:8px">导入结果:</p>
            <p style="color:#6fba2c;font-size:14px">成功: {{importResult.success}} 篇</p>
            <p v-if="importResult.failed > 0" style="color:#e05a5a;font-size:14px">失败: {{importResult.failed}} 篇</p>
          </div>
          <div style="display:flex;gap:12px;justify-content:center">
            <button class="btn btn-cancel" @click="showImportModal=false;importFileName='';importResult=null">关闭</button>
            <button class="btn" @click="importPosts" :disabled="!importFileName || importing">
              {{importing ? '导入中...' : '开始导入'}}
            </button>
          </div>
        </div>
      </div>
      <div v-if="confirmModal.show" class="modal" @click.self="confirmModal.show=false">
        <div class="modal-box">
          <h3 style="color:#794f27;margin-bottom:12px">{{confirmModal.title}}</h3>
          <p style="margin-bottom:16px" v-html="confirmModal.message"></p>
          <div v-if="confirmModal.checkbox" style="margin-bottom:20px;display:flex;align-items:center;gap:8px;justify-content:center">
            <input type="checkbox" id="confirmCheckbox" v-model="confirmModal.checkboxValue" style="width:16px;height:16px;cursor:pointer">
            <label for="confirmCheckbox" style="cursor:pointer;color:#725d42;font-size:14px">{{confirmModal.checkboxLabel}}</label>
          </div>
          <div style="display:flex;gap:12px;justify-content:center">
            <button class="btn btn-cancel" @click="confirmModal.onCancel && confirmModal.onCancel()">取消</button>
            <button class="btn" @click="confirmModal.onConfirm && confirmModal.onConfirm(confirmModal.checkboxValue)">确认</button>
          </div>
        </div>
      </div>
      <div v-if="toast" class="toast">{{toast}}</div>
    </div>
  </div>
  <script>
    const { createApp, ref, onMounted, watch } = Vue;
    createApp({
      setup() {
        const logged = ref(false);
        const username = ref('');
        const password = ref('');
        const posts = ref([]);
        const editingId = ref(null);
        const form = ref({ title: '', content: '', category: '', tags: '', status: 'draft', cover_image: '', password: '', passwordType: '', hadPassword: false, published_at: new Date().toISOString().split('T')[0] });
        const coverPreview = ref('');
        const toast = ref('');
        const categories = ref([]);
        const currentPage = ref('posts');
        const settingsForm = ref({ site_name: '', site_description: '', site_bio: '', site_links: '', site_author: '', site_footer: '', custom_js: '', iconfont_css: '', site_theme: 'animal-forest', enable_tag_cloud: '1', profile_position: 'left', tag_cloud_position: 'left', pinned_post_id: '', pinnedType: '', copyright_notice: '', ad_content: '', ad_position: 'left', site_password: '', sitePasswordType: '' });
        // 全站密码是否已设置（哈希不回传，仅用标记区分“保持不变”与“首次设置”）
        const sitePasswordSet = ref(false);
        const categoryForm = ref({ name: '', slug: '', description: '' });
        const editingCategory = ref(null);
        const trashPosts = ref([]);
        const confirmModal = ref({ show: false, title: '', message: '', checkbox: false, checkboxLabel: '', checkboxValue: true, onConfirm: null, onCancel: null });
        // 导入相关状态
        const showImportModal = ref(false);
        const importFileName = ref('');
        const importFileData = ref(null);
        const importing = ref(false);
        const importResult = ref(null);
        // 置顶相关状态
        const currentPinnedId = ref('');
        // 表情包相关状态
        const iconList = ref([]);
        const emojiLoading = ref(false);
        const loadedIconfontUrl = ref('');
        const check = () => { const t = localStorage.getItem('token'); if (t) { logged.value = true; currentPage.value = localStorage.getItem('adminPage') || 'posts'; loadPosts(); loadCategories(); loadSettings(); loadTrash(); } };
        const api = (url, o = {}) => {
          o.headers = o.headers || {};
          o.headers['Authorization'] = 'Bearer ' + localStorage.getItem('token');
          return axios(url, o).catch(function(e) {
            if (e.response && e.response.status === 401) {
              localStorage.removeItem('token');
              logged.value = false;
            }
            throw e;
          });
        };
        const login = async () => { try { const r = await axios.post('/api/login', { username: username.value, password: password.value }); if (r.data.success) { localStorage.setItem('token', r.data.token); logged.value = true; loadPosts(); loadCategories(); loadSettings(); loadTrash(); } } catch (e) { alert(e.response ? e.response.data.error || '登录失败' : '登录失败'); } };
        const logout = () => { localStorage.removeItem('token'); logged.value = false; };
        const loadPosts = async () => { try { const r = await api('/api/admin/posts'); posts.value = r.data; } catch (e) { showToast('加载文章失败'); } };
        const loadCategories = async () => { try { const r = await api('/api/categories'); categories.value = r.data; } catch (e) { showToast('加载分类失败'); } };
        const loadSettings = async () => { try { const r = await api('/api/admin/settings'); const pinnedId = r.data.pinned_post_id || ''; sitePasswordSet.value = r.data.site_password_set === '1'; settingsForm.value = { site_name: r.data.site_name || '', site_description: r.data.site_description || '', site_bio: r.data.site_bio || '', site_links: r.data.site_links || '', site_author: r.data.site_author || '', site_footer: r.data.site_footer || '', custom_js: r.data.custom_js || '', iconfont_css: r.data.iconfont_css || '', site_theme: r.data.site_theme || 'animal-forest', allow_robots: r.data.allow_robots || '1', enable_compression: r.data.enable_compression || '1', links_title: r.data.links_title || '友链', site_created_at: r.data.site_created_at || '2020-02-02', site_password: '', sitePasswordType: sitePasswordSet.value ? 'has' : '', allowed_origins: r.data.allowed_origins || '*', enable_tag_cloud: r.data.enable_tag_cloud || '1', profile_position: r.data.profile_position || 'left', tag_cloud_position: r.data.tag_cloud_position || 'left', pinned_post_id: pinnedId, pinnedType: pinnedId ? 'has' : '', copyright_notice: r.data.copyright_notice || '', ad_content: r.data.ad_content || '', ad_position: r.data.ad_position || 'left' }; currentPinnedId.value = pinnedId; applyTheme(); loadEmojiOnInit(); } catch (e) { showToast('加载设置失败'); } };
        const loadTrash = async () => { try { const r = await api('/api/admin/trash'); trashPosts.value = r.data; } catch (e) { showToast('加载回收站失败'); } };
        const showToast = (m) => { toast.value = m; setTimeout(() => toast.value = '', 2000); };
        const showConfirm = (t, m, options = {}) => new Promise(r => {
          confirmModal.value = {
            show: true,
            title: t,
            message: m,
            checkbox: options.checkbox || false,
            checkboxLabel: options.checkboxLabel || '',
            checkboxValue: options.checkboxDefault !== undefined ? options.checkboxDefault : true,
            onConfirm: (checkboxVal) => { confirmModal.value.show = false; r({ confirmed: true, checkboxValue: checkboxVal }); },
            onCancel: () => { confirmModal.value.show = false; r({ confirmed: false, checkboxValue: false }); }
          };
        });
        const postPage = ref(1);
        const postPageSize = 10;
        const openAdd = () => { editingId.value = 'new'; form.value = { title: '', content: '', category: '', tags: '', status: 'draft', cover_image: '', password: '', passwordType: '', hadPassword: false, published_at: new Date().toISOString().split('T')[0] }; coverPreview.value = ''; };
        const cancelNewPost = async () => { const { confirmed } = await showConfirm('确认取消', '未保存的内容将丢失'); if (confirmed) { editingId.value = null; } };
        const toggleEdit = (p) => { if (editingId.value === p.id) { editingId.value = null; } else { editingId.value = p.id; form.value = { title: p.title, content: p.content, category: p.category, tags: p.tags, status: p.status, cover_image: p.cover_image || '', password: '', passwordType: p.has_password ? 'has' : '', hadPassword: !!p.has_password, published_at: p.published_at ? p.published_at.split('T')[0] : new Date().toISOString().split('T')[0] }; coverPreview.value = p.cover_image || ''; } };
        const savePost = async () => { if (form.value.passwordType === 'has' && !form.value.password && !form.value.hadPassword) { alert('请输入文章密码'); return; } const { confirmed } = await showConfirm('确认保存', '确定保存？'); if (!confirmed) return; try { const postData = { ...form.value }; if (postData.passwordType !== 'has') { postData.password = ''; } else if (!postData.password) { delete postData.password; } delete postData.passwordType; delete postData.hadPassword; if (editingId.value === 'new') { await api('/api/admin/post', { method: 'POST', data: postData }); } else { await api('/api/admin/post?id=' + editingId.value, { method: 'PUT', data: postData }); } editingId.value = null; loadPosts(); showToast('保存成功'); } catch (e) { alert('保存失败'); } };
        const deletePost = async (id) => { const { confirmed } = await showConfirm('确认删除', '移到回收站？'); if (!confirmed) return; try { await api('/api/admin/post?id=' + id, { method: 'DELETE' }); loadPosts(); loadTrash(); showToast('已移到回收站'); } catch (e) { showToast('删除失败'); } };
        const editCategory = (c) => { editingCategory.value = c.id; categoryForm.value = { name: c.name, slug: c.slug, description: c.description || '' }; };
        const saveCategory = async () => { if (!categoryForm.value.name || !categoryForm.value.slug) { alert('请填写'); return; } const { confirmed } = await showConfirm('确认保存', '确定？'); if (!confirmed) return; try { const r = await api('/api/category', { method: 'POST', data: { ...categoryForm.value, name: categoryForm.value.name.trim(), slug: categoryForm.value.slug.trim() } }); if (!r.data || r.data.success !== true) throw new Error(r.data?.error || '保存失败'); await loadCategories(); editingCategory.value = null; categoryForm.value = { name: '', slug: '', description: '' }; showToast('保存成功'); } catch (e) { alert(e.response?.data?.error || e.message || '保存失败'); } };
        const deleteCategory = async (id) => { const { confirmed } = await showConfirm('确认删除', '确定删除？使用该分类的文章会转为“未分类”。'); if (!confirmed) return; try { const r = await api('/api/category?id=' + encodeURIComponent(id), { method: 'DELETE' }); if (!r.data || r.data.success !== true) throw new Error(r.data?.error || '删除失败'); await loadCategories(); showToast('已删除'); } catch (e) { showToast(e.response?.data?.error || e.message || '删除分类失败'); } };
        // 从 settingsForm 中挑选指定字段（各设置页独立保存，不影响其他页字段）
        const pickSettings = (keys) => { const data = {}; keys.forEach(k => { data[k] = settingsForm.value[k]; }); return data; };
        const postSettings = async (data, onSuccess) => { try { const r = await api('/api/settings', { method: 'POST', data: data }); if (r.data && r.data.success) { showToast('保存成功'); if (onSuccess) onSuccess(); } else { alert('保存失败: ' + (r.data ? r.data.error : '未知错误')); } } catch (e) { console.error('保存设置错误:', e); alert('保存失败: ' + (e.response ? e.response.data.error || e.response.statusText : e.message)); } };
        // 网站设置：站点信息 + 内容与安全
        const saveSiteSettings = async () => {
          if (settingsForm.value.sitePasswordType === 'has' && !settingsForm.value.site_password && !sitePasswordSet.value) { alert('请输入全站密码'); return; }
          const data = pickSettings(['site_name', 'site_description', 'site_footer', 'copyright_notice', 'iconfont_css', 'custom_js', 'allowed_origins', 'allow_robots', 'enable_compression']);
          if (settingsForm.value.sitePasswordType !== 'has') { data.site_password = ''; } else if (settingsForm.value.site_password) { data.site_password = settingsForm.value.site_password; }
          await postSettings(data, () => { sitePasswordSet.value = settingsForm.value.sitePasswordType === 'has'; settingsForm.value.site_password = ''; syncIconfontAfterSave(); });
        };
        // 外观布局：主题与模块位置
        const saveAppearanceSettings = async () => {
          if (settingsForm.value.pinnedType === 'has' && !settingsForm.value.pinned_post_id) { alert('请输入置顶文章编号'); return; }
          const data = pickSettings(['site_theme', 'profile_position', 'enable_tag_cloud', 'tag_cloud_position', 'ad_position', 'ad_content']);
          data.pinned_post_id = settingsForm.value.pinnedType === 'has' ? settingsForm.value.pinned_post_id : '';
          await postSettings(data, () => { currentPinnedId.value = data.pinned_post_id; });
        };
        // 个人设置：个人信息与友链
        const saveProfileSettings = async () => {
          const data = pickSettings(['site_author', 'site_bio', 'site_created_at', 'links_title', 'site_links']);
          await postSettings(data);
        };
        const handleCoverChange = async (e) => { const f = e.target.files[0]; if (f) await uploadFile(f); };
        const handleCoverDrop = async (e) => { const f = e.dataTransfer.files[0]; if (f && f.type.startsWith('image/')) await uploadFile(f); };
        const handleDrop = async (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && f.type.startsWith('image/')) await uploadFile(f); };
        const uploadFile = async (f) => { if (f.size > 2097152) { alert('文件大小不能超过 2MB'); return; } const fd = new FormData(); fd.append('file', f); const r = await fetch('/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }, body: fd }); const d = await r.json(); if (d.url) { form.value.cover_image = d.url; coverPreview.value = d.url; } else { alert(d.error || '上传失败'); } };
        const deleteCover = async () => {
          const imageUrl = form.value.cover_image;
          if (!imageUrl) return;
          
          const { confirmed, checkboxValue } = await showConfirm(
            '删除封面图片',
            '确定要删除封面图片吗？',
            { checkbox: true, checkboxLabel: '同时删除存储桶中的图片资源', checkboxDefault: true }
          );
          
          if (!confirmed) return;
          
          if (checkboxValue && imageUrl.startsWith('/images/')) {
            try {
              await api('/api/delete-image', { method: 'POST', data: { url: imageUrl } });
              showToast('图片已从存储桶删除');
            } catch (e) {
              showToast('删除存储桶图片失败');
            }
          }
          
          form.value.cover_image = '';
          coverPreview.value = '';
        };
        const restorePost = async (id) => { const { confirmed } = await showConfirm('确认恢复', '将文章恢复为草稿？'); if (!confirmed) return; try { await api('/api/admin/restore', { method: 'POST', data: { id } }); loadPosts(); loadTrash(); showToast('已恢复'); } catch (e) { showToast('恢复失败'); } };
        const permanentDelete = async (id) => { const { confirmed } = await showConfirm('确认删除', '彻底删除？不可恢复！'); if (!confirmed) return; try { await api('/api/admin/permanent-delete', { method: 'POST', data: { id } }); loadTrash(); showToast('已删除'); } catch (e) { showToast('删除失败'); } };

        
        const insertMd = (type) => {
          const ta = document.querySelector('textarea:focus') || document.querySelector('textarea');
          if (!ta) return;
          const start = ta.selectionStart;
          const end = ta.selectionEnd;
          const text = form.value.content || '';
          const selected = text.substring(start, end);
          let insert = '';
          switch(type) {
            case 'heading': insert = '## ' + (selected || '标题'); break;
            case 'bold': insert = '**' + (selected || '加粗') + '**'; break;
            case 'italic': insert = '*' + (selected || '斜体') + '*'; break;
            case 'link': insert = '[' + (selected || '链接') + '](https://)'; break;
            case 'image': insert = '![' + (selected || '图片') + '](https://)'; break;
            case 'code': var hasNL = selected.indexOf(String.fromCharCode(10)) >= 0; var cb = String.fromCharCode(96)+String.fromCharCode(96)+String.fromCharCode(96); insert = hasNL ? cb + String.fromCharCode(10) + (selected || '代码') + String.fromCharCode(10) + cb : String.fromCharCode(96) + (selected || '代码') + String.fromCharCode(96); break;
            case 'ul': insert = '- ' + (selected || '列表项'); break;
            case 'ol': insert = '1. ' + (selected || '列表项'); break;
            case 'quote': insert = '> ' + (selected || '引用'); break;
            case 'hr': insert = String.fromCharCode(10) + '---' + String.fromCharCode(10); break;
            case 'details': insert = String.fromCharCode(10) + '<details>' + String.fromCharCode(10) + '<summary>' + (selected || '折叠标题') + '</summary>' + String.fromCharCode(10) + String.fromCharCode(10) + '折叠内容' + String.fromCharCode(10) + String.fromCharCode(10) + '</details>' + String.fromCharCode(10); break;
          }
          form.value.content = text.substring(0, start) + insert + text.substring(end);
          setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = start + insert.length; }, 0);
        };

        // 表情包功能
        const loadEmojiOnInit = async () => {
          if (settingsForm.value.iconfont_css && iconList.value.length === 0) {
            await loadIconList();
          }
        };
        // 保存设置后同步表情包资源（链接变更时自动重载，无需手动刷新页面）
        const syncIconfontAfterSave = () => {
          const cssUrl = settingsForm.value.iconfont_css;
          if (!cssUrl) { iconList.value = []; loadedIconfontUrl.value = ''; return; }
          if (cssUrl !== loadedIconfontUrl.value) { loadIconList(); }
        };
        const loadIconList = async () => {
          emojiLoading.value = true;
          try {
            const cssUrl = settingsForm.value.iconfont_css;
            if (!cssUrl) { emojiLoading.value = false; return; }
            const url = cssUrl.startsWith('//') ? 'https:' + cssUrl : cssUrl;
            // .js 为 Symbol（多色 SVG）模式，.css 为 Font class（单色字体）模式
            const isSymbol = url.split('?')[0].endsWith('.js');
            // 清理旧链接注入的资源（Symbol 模式还需移除已插入的 SVG 雪碧图，避免旧图标 id 冲突）
            document.querySelectorAll('[data-iconfont-res]').forEach(el => {
              const res = el.tagName === 'SCRIPT' ? el.src : el.href;
              if (res !== url) {
                if (el.tagName === 'SCRIPT') {
                  document.querySelectorAll('body > svg[aria-hidden="true"]').forEach(s => { if (s.style.width === '0px' || s.getAttribute('width') === '0') s.remove(); });
                }
                el.remove();
              }
            });
            // 动态注入 iconfont 资源
            if (isSymbol) {
              if (!document.querySelector('script[src="' + url + '"]')) {
                const script = document.createElement('script');
                script.src = url;
                script.setAttribute('data-iconfont-res', '1');
                document.head.appendChild(script);
              }
            } else if (!document.querySelector('link[href="' + url + '"]')) {
              const link = document.createElement('link');
              link.rel = 'stylesheet';
              link.href = url;
              link.setAttribute('data-iconfont-res', '1');
              document.head.appendChild(link);
            }
            // 通过后端代理获取资源内容（解决跨域问题）
            const proxyUrl = '/api/proxy-css?url=' + encodeURIComponent(cssUrl);
            console.log('[表情包] 请求代理:', proxyUrl, '模式:', isSymbol ? 'Symbol' : 'Font class');
            const resp = await fetch(proxyUrl);
            console.log('[表情包] 响应状态:', resp.status, resp.statusText);
            const resText = await resp.text();
            console.log('[表情包] 内容长度:', resText.length, '前100字符:', resText.substring(0, 100));
            const icons = [];
            const seen = new Set();
            let match;
            if (isSymbol) {
              // Symbol 模式：从 JS 中解析 <symbol id="icon-xxx"> 定义
              const regex = /<symbol[^>]*?id="((?:icon|iconfont)[a-zA-Z0-9_-]*)"/g;
              while ((match = regex.exec(resText)) !== null) {
                if (match[1] && !seen.has(match[1])) { seen.add(match[1]); icons.push({ type: 'svg', cls: match[1] }); }
              }
            } else {
              // Font class 模式：匹配 .icon-xxx:before 格式（iconfont 官方格式）
              const regex = /\\.((?:icon|iconfont)[a-zA-Z0-9_-]*?)\\s*:\\s*before\\s*\\{/g;
              while ((match = regex.exec(resText)) !== null) {
                if (match[1] && !seen.has(match[1])) { seen.add(match[1]); icons.push({ type: 'font', cls: 'iconfont ' + match[1] }); }
              }
            }
            console.log('[表情包] 找到图标数量:', icons.length, icons.slice(0, 3));
            iconList.value = icons;
            loadedIconfontUrl.value = cssUrl;
          } catch (e) {
            console.error('[表情包] 加载失败:', e);
            iconList.value = [];
          } finally {
            emojiLoading.value = false;
          }
        };
        const insertEmoji = (icon) => {
          const ta = document.querySelector('textarea:focus') || document.querySelector('textarea');
          if (!ta) return;
          const start = ta.selectionStart;
          const end = ta.selectionEnd;
          const text = form.value.content || '';
          const insert = icon.type === 'svg'
            ? '<svg class="icon" aria-hidden="true"><use xlink:href="#' + icon.cls + '"></use></svg>'
            : '<i class="' + icon.cls + '"></i>';
          form.value.content = text.substring(0, start) + insert + text.substring(end);
          setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = start + insert.length; }, 0);
        };

        // 置顶文章方法
        const setPinnedPost = async (postId) => {
          console.log('[setPinnedPost] clicked, postId:', postId);
          try {
            // 如果点击的是已置顶的文章，则为取消置顶
            if (currentPinnedId.value == postId) {
              const post = posts.value.find(p => p.id == postId);
              const postTitle = post ? post.title : '未知文章';
              const { confirmed } = await showConfirm('取消置顶', '确定取消置顶文章？<br><br>文章编号：' + postId + '<br>文章标题：' + postTitle);
              if (!confirmed) return;
              await api('/api/settings', { method: 'POST', data: { pinned_post_id: '' } });
              currentPinnedId.value = '';
              showToast('已取消置顶');
              return;
            }
            
            // 置顶文章
            const post = posts.value.find(p => p.id == postId);
            if (!post) {
              showToast('文章不存在');
              return;
            }
            
            const { confirmed } = await showConfirm('置顶文章', '确定置顶文章？<br><br>文章编号：' + postId + '<br>文章标题：' + post.title);
            if (!confirmed) return;
            
            await api('/api/settings', { method: 'POST', data: { pinned_post_id: String(postId) } });
            currentPinnedId.value = String(postId);
            // 将置顶文章移到列表最前面
            const pinnedIndex = posts.value.findIndex(p => p.id == postId);
            if (pinnedIndex > 0) {
              const pinnedPost = posts.value.splice(pinnedIndex, 1)[0];
              posts.value.unshift(pinnedPost);
            }
            showToast('置顶成功');
          } catch (e) {
            console.error('[setPinnedPost] error:', e);
            showToast('操作失败: ' + (e.message || '未知错误'));
          }
        };

        // 主题配置
        const themes = {
          'animal-forest': {
            name: '动森',
            headerBg: 'linear-gradient(180deg, #8ac68a 0%, #6fba2c 100%)',
            sidebarBg: '#8ac68a',
            btnBg: '#19c8b9',
            btnShadow: '#11a89b',
            dangerBg: '#e05a5a',
            dangerShadow: '#c94444',
            cardBg: '#f7f3df',
            cardBorder: '#e8e0cc',
            bodyBg: '#f8f8f0',
            textPrimary: '#794f27',
            textBody: '#725d42',
            textSecondary: '#9f927d',
            inputBorder: '#c4b89e',
            inputShadow: '#d4c9b4'
          },
          'ocean-breeze': {
            name: '蔚蓝',
            headerBg: 'linear-gradient(180deg, #4ECDC4 0%, #2C9C93 100%)',
            sidebarBg: '#4ECDC4',
            btnBg: '#4ECDC4',
            btnShadow: '#2C9C93',
            dangerBg: '#E74C3C',
            dangerShadow: '#C0392B',
            cardBg: '#F0F9F8',
            cardBorder: '#B8E6E1',
            bodyBg: '#F5FCFB',
            textPrimary: '#1A535C',
            textBody: '#2C3E50',
            textSecondary: '#7F8C8D',
            inputBorder: '#B8E6E1',
            inputShadow: '#A0D8D2'
          },
          'diy-themes': {
            name: '自定义',
            headerBg: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
            sidebarBg: '#667eea',
            btnBg: '#667eea',
            btnShadow: '#5a6fd6',
            dangerBg: '#e05a5a',
            dangerShadow: '#c94444',
            cardBg: '#ffffff',
            cardBorder: '#e2e8f0',
            bodyBg: '#f7fafc',
            textPrimary: '#2d3748',
            textBody: '#4a5568',
            textSecondary: '#a0aec0',
            inputBorder: '#e2e8f0',
            inputShadow: '#edf2f7'
          }
        };

        const applyTheme = () => {
          const theme = themes[settingsForm.value.site_theme] || themes['animal-forest'];
          const root = document.documentElement;
          root.style.setProperty('--header-bg', theme.headerBg);
          root.style.setProperty('--sidebar-bg', theme.sidebarBg);
          root.style.setProperty('--btn-bg', theme.btnBg);
          root.style.setProperty('--btn-shadow', theme.btnShadow);
          root.style.setProperty('--danger-bg', theme.dangerBg);
          root.style.setProperty('--danger-shadow', theme.dangerShadow);
          root.style.setProperty('--card-bg', theme.cardBg);
          root.style.setProperty('--card-border', theme.cardBorder);
          root.style.setProperty('--body-bg', theme.bodyBg);
          root.style.setProperty('--text-primary', theme.textPrimary);
          root.style.setProperty('--text-body', theme.textBody);
          root.style.setProperty('--text-secondary', theme.textSecondary);
          root.style.setProperty('--input-border', theme.inputBorder);
          root.style.setProperty('--input-shadow', theme.inputShadow);
        };

        const applyCopyrightTemplate = () => {
          settingsForm.value.copyright_notice = '<div style="text-align:center;line-height:2">版权归属：@' + (settingsForm.value.site_author || '作者') + '<br>文章来自：{{article_url}}<br>发布日期：{{publish_date}}</div>';
        };

        const applyFooterTemplate = () => {
          settingsForm.value.site_footer = '© ' + new Date().getFullYear() + ' ' + (settingsForm.value.site_name || '我的博客') + ' | 已运行 {{days_running}} 天 | 建站于 {{site_created_at}}';
        };

        // 自定义下拉组件
        const customSelects = ref({});
        
        const toggleSelect = (id) => {
          Object.keys(customSelects.value).forEach(key => {
            if (key !== id) customSelects.value[key] = false;
          });
          customSelects.value[id] = !customSelects.value[id];
        };
        
        const selectOption = (id, value, field) => {
          if (field === 'category') form.value.category = value;
          else if (field === 'status') form.value.status = value;
          else if (field === 'theme') settingsForm.value.site_theme = value;
          customSelects.value[id] = false;
        };
        
        const getSelectLabel = (options, value) => {
          const opt = options.find(o => o.value === value);
          return opt ? opt.label : '请选择';
        };
        
        const closeAllSelects = () => {
          Object.keys(customSelects.value).forEach(key => {
            customSelects.value[key] = false;
          });
        };

        // 导入相关方法
        const handleImportFile = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          if (!file.name.endsWith('.xml')) {
            alert('请选择 XML 文件');
            return;
          }
          importFileName.value = file.name;
          importFileData.value = await file.text();
          importResult.value = null;
        };

        const importPosts = async () => {
          if (!importFileData.value) {
            alert('请先选择文件');
            return;
          }
          importing.value = true;
          try {
            const r = await api('/api/admin/import-wordpress', {
              method: 'POST',
              data: { xml: importFileData.value },
              headers: { 'Content-Type': 'application/json' }
            });
            importResult.value = r.data;
            loadPosts();
            loadCategories();
            if (r.data.failed === 0) {
              showToast('导入完成');
            }
          } catch (e) {
            alert('导入失败: ' + (e.response ? e.response.data.error : e.message));
          } finally {
            importing.value = false;
          }
        };

        watch(currentPage, (v) => { localStorage.setItem('adminPage', v); });
        onMounted(() => { check(); document.addEventListener('click', closeAllSelects); });
        return { logged, username, password, login, logout, posts, editingId, form, coverPreview, toast, openAdd, cancelNewPost, toggleEdit, handleCoverChange, handleCoverDrop, handleDrop, deleteCover, savePost, deletePost, categories, currentPage, postPage, postPageSize, categoryForm, saveCategory, deleteCategory, editCategory, editingCategory, settingsForm, saveSiteSettings, saveAppearanceSettings, saveProfileSettings, sitePasswordSet, trashPosts, restorePost, permanentDelete, confirmModal, showConfirm, insertMd, applyTheme, applyCopyrightTemplate, applyFooterTemplate, customSelects, toggleSelect, selectOption, getSelectLabel, showImportModal, importFileName, importFileData, importing, importResult, handleImportFile, importPosts, currentPinnedId, setPinnedPost, iconList, emojiLoading, insertEmoji };
      }
    }).mount('#app');
  <\/script>
</body>
</html>`;
}
