// ==================== 密码验证页面 ====================

import { escapeHtml } from '../lib/utils.js';

export function getPasswordHTML(post) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>输入密码 - 文章受保护</title>
  <style>
    body { font-family: ui-rounded, 'PingFang SC', 'Microsoft YaHei', sans-serif; background: #f8f8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .box { background: #f7f3df; padding: 48px; border-radius: 20px; box-shadow: 0 4px 10px rgba(107, 92, 67, 0.42); text-align: center; border: 2px solid #e8e0cc; max-width: 400px; width: 90%; }
    h2 { margin-bottom: 16px; color: #794f27; font-weight: 700; }
    input { padding: 12px 18px; width: 100%; border: 2.5px solid #c4b89e; border-radius: 50px; font-size: 15px; margin-bottom: 16px; background: #f8f8f0; color: #725d42; font-weight: 500; outline: none; transition: all 0.25s; box-shadow: 0 3px 0 0 #d4c9b4; box-sizing: border-box; }
    input:focus { border-color: #ffcc00; box-shadow: 0 3px 0 0 #e0b800, 0 0 0 3px rgba(255,204,0,0.15); }
    button { padding: 12px 32px; background: #19c8b9; color: white; border: none; border-radius: 50px; font-size: 15px; font-weight: 600; cursor: pointer; box-shadow: 0 5px 0 0 #11a89b; transition: all 0.25s; }
    button:hover { transform: translateY(-1px); box-shadow: 0 6px 0 0 #11a89b; }
    button:active { transform: translateY(2px); box-shadow: 0 1px 0 0 #11a89b; }
    .back { display: inline-block; margin-top: 16px; color: #19c8b9; text-decoration: none; font-weight: 600; font-size: 14px; }
  </style>
</head>
<body>
  <div class="box">
    <h2>🔒 文章密码保护</h2>
    <p style="color:#666;margin-bottom:20px">请输入密码访问文章</p>
    <div id="msg" style="display:none;color:#e05a5a;font-size:14px;margin-bottom:12px;padding:8px 12px;background:#fef2f2;border:2px solid #fecaca;border-radius:8px"></div>
    <form id="pwdForm">
      <input type="password" id="pwd" placeholder="请输入密码" autofocus>
      <br>
      <button type="submit">确认访问</button>
    </form>
    <a class="back" href="/">← 返回首页</a>
  </div>
  <script>
    document.getElementById('pwdForm').onsubmit = async function(e) {
      e.preventDefault();
      var pwd = document.getElementById('pwd').value;
      if (!pwd) return;
      var errEl = document.getElementById('msg');
      try {
        var r = await fetch('/api/post-auth', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({postId: ${post.id}, password: pwd})
        });
        var d = await r.json();
        if (d.success) {
          window.location.reload();
        } else {
          errEl.textContent = d.error || '密码错误';
          errEl.style.display = 'block';
        }
      } catch(e) {
        errEl.textContent = '请求失败，请重试';
        errEl.style.display = 'block';
      }
    };
  </script>
</body>
</html>`;
}
