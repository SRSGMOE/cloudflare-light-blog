# cloudflare-light-blog

基于 Cloudflare Workers + D1 + R2 构建的轻量级博客系统。

## 更新日志

### v1.2.0 (2026-08-01)

#### 新增功能
- **表情包功能**：编辑器新增表情包插入，支持阿里巴巴矢量图标库 Font class 和 Symbol 双模式
- **版权模块**：文章详情页底部新增版权说明模块，支持模板变量（文章链接、发布日期）
- **广告模块**：前台侧边栏新增广告位，支持图片、链接及 Markdown 格式，可配置居左/居右
- **分类统计**：后台分类管理新增每分类文章数量统计
- **主题字体**：动森主题新增 LXGW WenKai 风格字体
- **RSS 订阅**：新增 `/rss.xml` 接口，支持外部 RSS 阅读器订阅
- **标签聚合 API**：新增 `/api/tags` 接口，服务端聚合标签数据，减少前端请求量
- **页脚预设模板**：后台网站页脚新增预设模板按钮，包含建站时间和运行天数（北京时间 0 点自动更新）
- **设置键名白名单**：后台保存设置时仅允许写入合法键名，防止非法数据注入

#### SEO 优化
- 新增 Twitter Card 元标签（文章页自动选择 summary / summary_large_image）
- 首页新增 JSON-LD WebSite 结构化数据
- 文章页新增 og:url 完整地址
- Sitemap 新增分类页 URL
- RSS Feed 支持 5 分钟 CDN 缓存
- Sitemap 响应添加 Cache-Control 缓存头

#### 性能优化
- Settings 内存缓存（60 秒 TTL），避免每次请求查询数据库
- 标签云改用服务端聚合 API，响应体积从数 KB 降至数百字节

#### 问题修复
- 修复友链同时支持 http 和 https 输入
- 修复主题切换限定后台问题，切换主题同时适用前台和后台
- 修复文章卡片摘要显示 Markdown 格式符号问题
- 修复标签查询 SQL 运算符优先级错误，避免返回草稿和回收站文章
- 修复图片删除接口缺少文件名校验
- 修复恢复/彻底删除文章接口缺少 ID 参数校验
- 修复数据库初始化注释步骤编号重复

#### 其他变更
- 为防止部署错误，取消 wrangler.toml 中绑定数据库 ID 和 R2 存储，需部署后在后台手动绑定
- 新增主题目录结构及 DIY 主题模板，便于自行开发主题（建议直接对 diyThemes 进行开发）
- 个人简介模块移除建站时间显示，建站时间通过页脚预设模板展示
- 清理冗余代码（deriveHMACKey 统一导出、补充默认设置字段）

### v1.1.0 (2026-07-05)

#### 新增功能
- **标签云模块**：前台新增标签云展示，自动聚合所有无密码文章的标签，字体随机大小，支持点击标签筛选文章
- **模块位置开关**：个人简介和标签云模块支持居左/居右位置切换
- **图标静态化**：后台管理、前台首页、文章详情页的图标统一改为静态资源（public/icon/），替换对应文件即可自定义图标
- **图片删除增强**：文章管理中删除封面图片时增加二次确认弹框，可选择是否同时删除存储桶中的图片资源
- **导入文章**：支持导入 WordPress XML 文件（WXR 格式），批量导入文章、分类、标签及状态信息 ⚠️ 该功能未经充分测试，请先备份数据后再自行测试使用
- **置顶文章**：在网站设置中配置置顶文章编号，置顶文章在首页首位展示并添加金色边框和置顶图标标识
- **后台美化**：后台导航栏图标优化，选中项使用 navigate.png 指示器，管理后台标题和退出登录按钮分别添加 dashboard.png、logout.png 图标

#### 默认值优化
- 标签云模块默认开启
- 个人简介和标签云模块默认居左显示

#### 新增设置项
| 设置项 | 说明 | 默认值 |
|--------|------|--------|
| 标签云开关 | 控制是否显示标签云模块 | 开启 |
| 个人简介位置 | 居左 / 居右 | 居左 |
| 标签云位置 | 居左 / 居右 | 居左 |
| 置顶文章ID | 置顶显示的文章编号，留空表示不置顶 | 空 |

### v1.0.0

初始版本发布

---

## 预览图
<table>
  <tr>
    <td><div align="center"><img src="https://tvax2.sinaimg.cn/large/78f38e4bgy1idtpne8ezsj21d10y5amt.jpg" width=99% referrerpolicy="no-referrer" /></div></td>
    <td><div align="center"><img src="https://tvax1.sinaimg.cn/large/78f38e4bgy1idtpnefku6j219i0z2h2d.jpg" width=99% referrerpolicy="no-referrer" /></div></td>
  </tr>
</table>

## 功能特性

### 前台
- ✅ 文章列表（分页、分类筛选、搜索标题和标签）
- ✅ 文章详情页（Markdown 渲染、代码高亮、代码复制按钮、折叠框、引用样式）
- ✅ 图片灯箱（上一张/下一张导航、键盘操作、图片计数器）
- ✅ 侧边栏（个人简介、文章/分类/标签统计、建站时间/最后更新、分类列表、自定义友链）
- ✅ 标签云模块（自动聚合标签、随机字体大小、点击筛选文章）
- ✅ 密码保护文章（HKDF 密钥派生、HMAC 签名、24小时有效期、5次/1小时速率限制）
- ✅ 全站密码保护（可选、Cookie 24小时有效期、5次/1小时速率限制）
- ✅ 搜索栏（实时搜索文章标题和标签）
- ✅ 便签贴纸风格标签
- ✅ 版权说明模块（文章详情页底部，支持模板变量）
- ✅ 侧边栏广告模块（支持图片、链接、Markdown 格式）
- ✅ 响应式布局（手机端 / 平板端 / 桌面端）
- ✅ 文章置顶（在网站设置中配置置顶文章编号，置顶文章首位显示，带金色边框和📌置顶标识）
- ✅ 主题切换（动森 / 蔚蓝 / 自定义）

### 后台管理
- ✅ 文章管理（表格布局、分页、内联新建/编辑、封面图上传+外链、Markdown 编辑器工具栏、标签列展示）
- ✅ 分类管理（表格布局、增删改、文章数量统计）
- ✅ 回收站（表格布局、恢复/彻底删除）
- ✅ 个人设置（头像、简介、建站时间、友链标题/内容、图标配置、模块位置开关）
- ✅ 网站设置（标题、图标、主题、页脚、自定义JS、全站密码、CORS 来源、功能开关）
- ✅ 主题切换（动森 / 蔚蓝 / 自定义）
- ✅ 图片上传（支持上传 + 外链，限制 2MB，类型验证）
- ✅ 图片删除二次确认（可选择是否删除存储桶资源）
- ✅ Markdown 编辑器（标题、加粗、斜体、链接、图片、代码、列表、引用、分割线、折叠框、表情包）
- ✅ 页面刷新保持当前导航页
- ✅ 响应式布局（手机端 / 平板端 / 桌面端）
- ✅ 文章导入（支持 WordPress XML 格式，批量导入文章、分类、标签）
- ✅ 网站设置中配置置顶文章编号（置顶文章首位显示，带金色边框和📌标识）

### 安全
- ✅ HMAC-SHA256 管理员认证（48小时过期）
- ✅ HKDF 密钥派生（从密码派生 32 字节安全密钥，不直接使用密码原文）
- ✅ 恒定时间比较（timingSafeEqual，防止时序攻击）
- ✅ 密码哈希存储（文章密码使用 HMAC-SHA256 哈希，数据库不存明文）
- ✅ 全站密码保护（HKDF 派生 Cookie 密钥、24小时过期）
- ✅ 登录速率限制（5次/10分钟）
- ✅ 密码速率限制（全站密码 + 文章密码，5次/1小时）
- ✅ XSS 防护（Markdown 内容转义、sanitizeMarkdown）
- ✅ SQL 注入防护（参数化查询、表名白名单验证）
- ✅ 设置键名白名单（后台保存设置时仅允许写入合法键名）
- ✅ 文件上传限制（2MB、MIME 类型验证、文件名正则校验）
- ✅ 错误信息隐藏（仅记录截断的错误摘要到服务器日志）
- ✅ CORS 可配置来源（支持多域名逗号分隔，后台设置）
- ✅ HTTP 安全头（X-Content-Type-Options、X-Frame-Options、Referrer-Policy、HSTS）
- ✅ Cookie 安全属性（HttpOnly、SameSite=Lax、Max-Age）

### SEO
- ✅ meta 标签（description、robots、author）
- ✅ Open Graph 标签（og:type、og:title、og:description、og:image、og:url、og:site_name）
- ✅ Twitter Card（summary / summary_large_image 自动选择）
- ✅ JSON-LD 结构化数据（文章页 BlogPosting、首页 WebSite）
- ✅ canonical URL
- ✅ sitemap.xml 自动生成（含文章页 + 分类页）
- ✅ RSS Feed（`/rss.xml`，最近 20 篇，5 分钟缓存）
- ✅ robots.txt（后台可开关）
- ✅ 图片懒加载（loading="lazy"）

### 性能
- ✅ 数据库索引（status、created_at、slug、category）
- ✅ API 缓存（公开 GET 接口使用 Workers Cache；文章列表 60s、分类 300s、统计 60s、标签 60s）
- ✅ Settings 内存缓存（60 秒 TTL，避免每次请求查库）
- ✅ 标签云服务端聚合（`/api/tags`，减少前端请求量）
- ✅ 前台页面缓存（Cache API，首页 5min）
- ✅ R2 图片缓存（1年）
- ✅ 冷启动优化（设置读取 Promise 缓存避免并发重复查询）
- ✅ D1 迁移初始化（请求链路不再执行建表和默认数据写入）
- ✅ 压缩支持（后台可开关，Cloudflare 自动处理）

## 技术栈

- **运行时**: Cloudflare Workers (ES Modules, compatibility_date: 2025-05-01)
- **数据库**: Cloudflare D1
- **对象存储**: Cloudflare R2（可选）
- **前端**: 原生 HTML + Vue 3（后台管理）
- **Markdown**: marked.js + highlight.js
- **部署**: GitHub → Cloudflare Workers 自动部署

## 项目结构

```
src/
├── worker.js              # 主入口（路由、全站密码验证、robots.txt、favicon.ico）
├── api.js                 # API 处理（分页、缓存、输入验证、速率限制、密码认证、Cookie 生成）
├── lib/
│   ├── utils.js           # 工具函数（JSON/HTML 响应、CORS 多域名、HTTP 安全头）
│   ├── db.js              # 数据库初始化（索引、表名白名单、设置读写）
│   ├── auth.js            # 认证模块（HKDF 密钥派生、HMAC-SHA256、恒定时间比较、密码哈希）
│   ├── cache.js           # Workers Cache API
│   └── image.js           # 图片处理（R2 上传、2MB 限制、MIME 验证、文件名校验）
├── themes/                # 主题目录（可自行扩展）
│   ├── index.js           # 主题注册中心
│   ├── animal-forest.js   # 动森主题（默认）
│   ├── ocean-breeze.js    # 蔚蓝主题
│   └── diy-themes.js      # 自定义主题（用户可修改，建议在此基础上开发）
└── views/
    ├── frontend.js        # 前台首页（SEO、分页、搜索、响应式）
    ├── post.js            # 文章详情页（Markdown、代码高亮、灯箱、SEO、懒加载）
    ├── password.js        # 密码验证页（API 认证、速率限制）
    └── admin.js           # 后台管理页（Vue 3、响应式、SRI）
public/icon/               # 静态图标资源（随项目部署）
wrangler.toml              # Cloudflare 配置
```

### 图标资源说明

`public/icon/` 目录下的图片文件用途如下：

| 文件名 | 用途 |
|--------|------|
| `dashboard.png` | 后台管理标题前置图标 |
| `navigate.png` | 导航栏选中项指示器 |
| `logout.png` | 退出登录按钮前置图标 |
| `profile.png` | 个人头像 |
| `favicon.ico` | 网站图标 |
| `category.png` | 分类标题图标 |
| `friend-links.png` | 友链标题图标 |
| `pin-post.png` | 置顶文章标识（首页卡片及文章内页） |

> 替换对应的图片文件即可自定义图标，无需修改代码。

### 主题开发指南

`src/themes/` 目录用于存放主题文件，支持用户自行开发和扩展主题。

#### 现有主题

| 主题变量名 | 主题名称 | 风格 |
|------------|----------|------|
| `animal-forest` | 动森 | 温馨自然（默认） |
| `ocean-breeze` | 蔚蓝 | 清新海洋 |
| `diy-themes` | 自定义 | 用户可自由修改（建议在此基础上开发新主题） |

#### 开发新主题

**1. 创建主题文件**

在 `src/themes/` 目录创建新的 `.js` 文件，例如 `my-theme.js`：

```javascript
// 我的主题 - 简短描述
export default {
  name: '我的主题',           // 主题显示名称
  headerBg: 'linear-gradient(180deg, #颜色1 0%, #颜色2 100%)',  // 顶部渐变背景
  sidebarBg: '#颜色',         // 侧边栏背景
  btnBg: '#颜色',             // 按钮背景
  btnShadow: '#颜色',         // 按钮阴影
  dangerBg: '#e05a5a',        // 危险按钮背景
  dangerShadow: '#c94444',    // 危险按钮阴影
  cardBg: '#颜色',            // 卡片背景
  cardBorder: '#颜色',        // 卡片边框
  bodyBg: '#颜色',            // 页面背景
  textPrimary: '#颜色',       // 主要文字
  textBody: '#颜色',          // 正文文字
  textSecondary: '#颜色',     // 次要文字
  inputBorder: '#颜色',       // 输入框边框
  inputShadow: '#颜色'        // 输入框阴影
};
```

**2. 注册主题**

编辑 `src/themes/index.js`，导入并注册新主题：

```javascript
import myTheme from './my-theme.js';

export const themes = {
  // ...其他主题
  'my-theme': myTheme  // 添加这行
};
```

**3. 添加后台选项**

编辑 `src/views/admin.js`，在主题选择区域添加选项：

```html
<label class="radio-item" style="margin:0">
  <input type="radio" value="my-theme" v-model="settingsForm.site_theme" @change="applyTheme()">
  <span class="radio-custom"></span>
  <span class="radio-label">🎨 我的主题</span>
</label>
```

同时在 `themes` 配置对象中添加对应的主题变量。

**4. 部署生效**

保存后重新部署即可在后台看到新主题选项。

#### 自定义主题快速修改

如果只想修改颜色，可直接编辑 `src/themes/diy-themes.js` 文件，无需额外注册步骤。

## 部署步骤

### 1. 获取项目代码（二选一）

**方式一：Fork 仓库（推荐）**

1. 在 GitHub 上 Fork 本仓库到你的账号
2. 后续可同步上游更新

**方式二：克隆到新仓库**

```bash
git clone https://github.com/你的用户名/cloudflare-light-blog.git
cd cloudflare-light-blog
# 如需推送到自己的仓库
git remote set-url origin https://github.com/你的用户名/cloudflare-light-blog.git
git push -u origin main
```

### 2. 创建 D1 数据库

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages** → **D1**
3. 点击 **Create database**，名称输入 `blog-db`
4. 记下数据库名称，后续绑定时需要选择

### 3. 配置 D1 数据库绑定

`wrangler.toml` 已配置 D1 绑定和 `migrations` 目录，Cloudflare 会根据 `database_name` 自动查找对应数据库，无需手动绑定。

如果部署时报错 `database not found`，说明你的账户下还没有 `blog-db` 数据库，需要先创建：

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages** → **D1**
3. 点击 **Create database**，名称输入 `blog-db`
4. 重新部署即可

首次部署或新建数据库后，在项目目录执行一次远程迁移：

```bash
npx wrangler d1 migrations apply blog-db --remote
```

已有数据库无需删除数据；迁移使用幂等建表和索引语句。

### 4. 创建 R2 存储桶（可选）

R2 存储桶用于存储文章封面图片等静态资源。

| 绑定 R2 | 不绑定 R2 |
|---------|----------|
| 图片上传到 R2 存储，通过 `/images/xxx` 路径访问 | 图片以 base64 格式内嵌在文章中 |
| 图片独立存储，不占用 Worker 响应体积 | 图片数据随文章内容返回，增加响应体积 |
| 支持长期缓存（1年），加载更快 | 每次请求都传输图片数据 |
| 适合有大量图片的博客 | 适合少量图片或纯文字博客 |

如需绑定 R2：

1. 进入 **Workers & Pages** → **R2**
2. 点击 **Create bucket**，名称输入 `blog-images`
3. 进入你的 Worker → **Settings** → **Bindings** → **Add**
4. 选择 **R2 Bucket**，变量名填 `R2`，选择你创建的 `blog-images` 存储桶
5. 保存后重新部署

### 5. 连接 Cloudflare Workers

1. Cloudflare Dashboard → **Workers & Pages** → **Create Application**
2. 选择 **Workers** → **Connect to Git**
3. 选择你的 GitHub 仓库（Fork 的仓库或自己的仓库）
4. 在构建配置中填写：

| 配置项 | 填写内容 |
|--------|--------|
| **生产分支** | `main` |
| **构建命令** | （留空） |
| **部署命令** | `npx wrangler deploy` |

5. 点击保存，Cloudflare 会自动读取 `wrangler.toml` 配置并部署

### 6. 设置环境变量

部署完成后，在 Worker 的 **Settings → Variables and Secrets** 中添加：

| 变量名 | 类型 | 说明 |
|--------|------|------|
| `ADMIN_USERNAME` | **Secret** | 管理员账号 |
| `ADMIN_PASSWORD` | **Secret** | 管理员密码 |

> ⚠️ `ADMIN_USERNAME` 和 `ADMIN_PASSWORD` 请使用 **Secret** 类型，确保凭据加密存储。
> CORS 来源、全站密码等配置在后台网站设置中管理，无需在此设置。

> 📌 **凭据重置提示：** 若遗忘管理员账号或密码，可前往 Cloudflare Dashboard → Workers & Pages → 你的 Worker → Settings → Variables and Secrets，重新设置 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD` 的值，保存后触发重新部署即可生效。无需修改代码或推送仓库。

### 7. 后续更新

**Fork 用户：** 在 GitHub 上点击 **Sync fork** 同步上游更新，Cloudflare 会自动重新部署。

**自有仓库用户：** 推送到 `main` 分支即可自动部署：

```bash
git add .
git commit -m "Update"
git push
```

## 访问地址

| 页面 | 路径 |
|------|------|
| 前台首页 | `https://你的域名/` |
| 后台管理 | `https://你的域名/admin/` |
| 站点地图 | `https://你的域名/sitemap.xml` |
| RSS 订阅 | `https://你的域名/rss.xml` |
| robots.txt | `https://你的域名/robots.txt` |
| favicon | `https://你的域名/favicon.ico` |
| 健康检查 | `https://你的域名/api/health` |

## 后台设置说明

### 个人设置

| 设置项 | 说明 | 默认值 |
|--------|------|--------|
| 个人名称 | 侧边栏显示的作者名 | 空 |
| 个人头像 | 替换 `public/icon/profile.png` 文件即可更换 | profile.png |
| 个人简介 | 侧边栏简介文字 | 空 |
| 建站时间 | 侧边栏显示的建站日期 | 2020-02-02 |
| 友链标题 | 侧边栏友链模块标题 | 友链 |
| 友链内容 | 名称,地址 每行一个 | 空 |
| 分类标题图标 | 替换 `public/icon/category.png` 文件即可更换 | category.png |
| 友链标题图标 | 替换 `public/icon/friend-links.png` 文件即可更换 | friend-links.png |
| 置顶文章图标 | 替换 `public/icon/pin-post.png` 文件即可更换 | pin-post.png |
| 标签云开关 | 控制是否显示标签云模块 | 显示 |
| 个人简介位置 | 居左 / 居右 | 居左 |
| 标签云位置 | 居左 / 居右 | 居左 |

### 网站设置

| 设置项 | 说明 | 默认值 |
|--------|------|--------|
| 网站标题 | 浏览器标题栏和侧边栏 | 我的博客 |
| 网站副标题 | 首页描述文字 | 空 |
| 网站图标 | 替换 `public/icon/favicon.ico` 文件即可更换 | favicon.ico |
| 主题风格 | 动森 / 蔚蓝 / 自定义 | 动森 |
| 网站页脚 | 支持 HTML | © 2026 我的博客 |
| 自定义 JS | 注入到页面的自定义脚本 | 空 |
| 全站密码 | 留空则不启用，访问任何页面需输入密码 | 空 |
| CORS 允许来源 | 多域名逗号分隔，* 表示全部 | * |
| 允许搜索引擎爬取 | 控制 robots.txt 是否允许爬取 | 开启 |
| 启用压缩 | 控制 Cloudflare 自动压缩 | 开启 |
| 置顶文章ID | 置顶显示的文章编号，留空表示不置顶 | 空 |

## API 接口

<details>
<summary>点击展开 API 接口文档</summary>

### 公开接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/home-data` | 首页侧栏聚合数据（统计、分类、友链、标签） |
| GET | `/api/posts?page=1&limit=10&category=slug` | 文章列表（分页） |
| GET | `/api/post/?slug=xxx` | 文章详情 |
| GET | `/api/categories` | 分类列表 |
| GET | `/api/settings` | 网站设置 |
| GET | `/api/stats` | 统计信息（文章数、分类数、标签数、最新更新日期） |
| GET | `/api/links` | 友链列表 |
| GET | `/api/tags` | 标签列表（服务端聚合，按数量降序，最多 18 个） |
| GET | `/api/related-posts?id=x&tags=a,b` | 相关文章（相同标签，随机 4 篇） |
| GET | `/api/health` | 健康检查（数据库连接状态） |
| GET | `/sitemap.xml` | 站点地图（含文章页 + 分类页） |
| GET | `/rss.xml` | RSS 订阅（最近 20 篇，5 分钟缓存） |
| POST | `/api/site-auth` | 全站密码认证（返回 HttpOnly Cookie） |
| POST | `/api/post-auth` | 文章密码认证（返回 HttpOnly Cookie） |

### 管理接口（需要 Bearer Token）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/login` | 登录获取 Token（5次/10分钟限制） |
| GET | `/api/admin/posts` | 所有文章（含草稿） |
| POST | `/api/admin/post` | 创建文章 |
| PUT | `/api/admin/post?id=x` | 更新文章 |
| DELETE | `/api/admin/post?id=x` | 删除文章（移至回收站） |
| GET | `/api/admin/trash` | 回收站列表 |
| POST | `/api/admin/restore` | 恢复文章 |
| POST | `/api/admin/permanent-delete` | 彻底删除 |
| POST | `/api/category` | 创建/更新分类 |
| DELETE | `/api/category?id=x` | 删除分类 |
| POST | `/api/upload` | 上传图片（2MB 限制） |
| POST | `/api/delete-image` | 删除存储桶图片（需传入图片路径） |
| POST | `/api/settings` | 保存设置 |
| POST | `/api/links` | 保存友链 |
| POST | `/api/admin/import-wordpress` | 导入 WordPress XML 文件 |

</details>

## License

MIT
