import { useEffect, useState } from 'react'
import { Card, Button, Drawer } from 'animal-island-ui'
import { useSettings } from '../hooks/useSettings'
import { useNavs } from '../hooks/useNavs'
import { useArticles } from '../hooks/useArticles'

// 简单的Markdown解析函数
function parseMarkdown(md: string): string {
  if (!md) return ''
  
  let html = md
    // 转义HTML特殊字符
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // 标题
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // 粗体和斜体
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    // 链接和图片
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    // 代码块
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // 引用
    .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
    // 水平线
    .replace(/^---$/gm, '<hr />')
  
  // 处理列表 - 用正则匹配连续的列表项并包装
  // 无序列表
  html = html.replace(/(^[-*] .+$\n?)+/gm, (match) => {
    const items = match.trim().split('\n').map(item => 
      '<li>' + item.replace(/^[-*] /, '') + '</li>'
    ).join('')
    return '<ul>' + items + '</ul>'
  })
  
  // 有序列表
  html = html.replace(/(^\d+\. .+$\n?)+/gm, (match) => {
    const items = match.trim().split('\n').map(item => 
      '<li>' + item.replace(/^\d+\. /, '') + '</li>'
    ).join('')
    return '<ol>' + items + '</ol>'
  })
  
  // 段落（连续两个换行）
  html = html.replace(/\n\n/g, '</p><p>')
  // 单个换行
  html = html.replace(/\n/g, '<br />')
  
  // 包装在段落中
  html = '<p>' + html + '</p>'
  
  // 清理空段落和错误嵌套
  html = html.replace(/<p><\/p>/g, '')
  html = html.replace(/<p>(<h[1-6]>)/g, '$1')
  html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1')
  html = html.replace(/<p>(<ul>)/g, '$1')
  html = html.replace(/<\/ul><\/p>/g, '</ul>')
  html = html.replace(/<p>(<ol>)/g, '$1')
  html = html.replace(/<\/ol><\/p>/g, '</ol>')
  html = html.replace(/<p>(<blockquote>)/g, '$1')
  html = html.replace(/<\/blockquote><\/p>/g, '</blockquote>')
  html = html.replace(/<p>(<pre>)/g, '$1')
  html = html.replace(/<\/pre><\/p>/g, '</pre>')
  html = html.replace(/<p>(<hr \/>)/g, '$1')
  
  return html
}

function Home() {
  const { settings, loading: settingsLoading, error: settingsError } = useSettings()
  const { navs, loading: navsLoading, error: navsError } = useNavs()
  const { articles } = useArticles()
  const [categories, setCategories] = useState<any[]>([])
  const [ads, setAds] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [activeSubpage, setActiveSubpage] = useState<{ type: 'link' | 'post'; id: string } | null>(null)
  const [subpageData, setSubpageData] = useState<any>(null)
  const [subpageCategory, setSubpageCategory] = useState<any>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [articlesExpanded, setArticlesExpanded] = useState(false)

  const loading = settingsLoading || navsLoading
  const error = settingsError || navsError


  useEffect(() => {
    if (settings.siteTheme) {
      document.body.classList.remove('theme-dark', 'theme-pink', 'theme-blue')
      if (settings.siteTheme !== 'light') {
        document.body.classList.add(`theme-${settings.siteTheme}`)
      }
    }
  }, [settings.siteTheme])

  // 浏览器标签页标题与图标跟随网站设置（logo/标题/副标题）
  useEffect(() => {
    const tabTitle = [settings.siteTitle || '我的导航', settings.siteSubtitle]
      .filter(Boolean)
      .join(' - ')
    document.title = tabTitle

    const logo = settings.siteLogo
    if (logo && (logo.startsWith('http://') || logo.startsWith('https://'))) {
      let iconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
      if (!iconLink) {
        iconLink = document.createElement('link')
        iconLink.rel = 'icon'
        document.head.appendChild(iconLink)
      }
      iconLink.href = logo
    }
  }, [settings.siteTitle, settings.siteSubtitle, settings.siteLogo])

  // 注入 iconfont Symbol
  useEffect(() => {
    if (settings.iconfontSymbol) {
      // 检查是否已经注入
      const existingScript = document.getElementById('iconfont-symbol-script')
      if (!existingScript) {
        // 直接使用 URL
        let scriptUrl = settings.iconfontSymbol
        // 确保有协议前缀
        if (!scriptUrl.startsWith('http://') && !scriptUrl.startsWith('https://')) {
          scriptUrl = 'https:' + (scriptUrl.startsWith('//') ? scriptUrl : '//' + scriptUrl)
        }
        const script = document.createElement('script')
        script.id = 'iconfont-symbol-script'
        script.src = scriptUrl
        document.head.appendChild(script)
      }
    }
  }, [settings.iconfontSymbol])

  // 根据URL路径同步子页面：首次进入（刷新/直接访问）和浏览器前进/后退时生效，
  // 与点击卡片（handleOpenSubpage 内嵌打开）保持同一套布局
  useEffect(() => {
    const syncSubpageFromUrl = () => {
      const pathname = window.location.pathname
      const match = pathname.match(/^\/(link|post)\/([^/]+)$/)
      if (match) {
        const type = match[1] as 'link' | 'post'
        const id = match[2]
        setActiveSubpage({ type, id })
        loadSubpageData(type, id)
      } else {
        setActiveSubpage(null)
        setSubpageData(null)
        setSubpageCategory(null)
      }
    }
    syncSubpageFromUrl()
    window.addEventListener('popstate', syncSubpageFromUrl)
    return () => window.removeEventListener('popstate', syncSubpageFromUrl)
  }, [])

  useEffect(() => {
    loadCategories()
    loadAds()
  }, [])

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      if (data.success) {
        setCategories(data.categories)
      }
    } catch (err) {
      console.error('加载分类失败:', err)
    }
  }

  const loadAds = async () => {
    try {
      const response = await fetch('/api/ads')
      const data = await response.json()
      if (data.success) {
        setAds(data.ads)
      }
    } catch (err) {
      console.error('加载广告失败:', err)
    }
  }

  const loadSubpageData = async (type: 'link' | 'post', id: number | string) => {
    try {
      const idStr = String(id)
      // 数字ID走 num_id 查询，字符串ID走 id 查询
      const isNumeric = /^\d+$/.test(idStr)
      const idKey = isNumeric ? 'num_id' : 'id'
      if (type === 'link') {
        const navRes = await fetch(`/api/navs?${idKey}=${idStr}`)
        const navData = await navRes.json()
        if (navData.success && navData.navs && navData.navs.length > 0) {
          setSubpageData(navData.navs[0])
          // 获取分类信息
          if (navData.navs[0].categoryId) {
            const catRes = await fetch(`/api/categories?id=${navData.navs[0].categoryId}`)
            const catData = await catRes.json()
            if (catData.success && catData.categories && catData.categories.length > 0) {
              setSubpageCategory(catData.categories[0])
            }
          }
        } else {
          // 数据不存在，关闭子页面
          setSubpageData(null)
          setActiveSubpage(null)
        }
      } else {
        const articleRes = await fetch(`/api/articles?${idKey}=${idStr}`)
        const articleData = await articleRes.json()
        if (articleData.success && articleData.articles && articleData.articles.length > 0) {
          setSubpageData(articleData.articles[0])
          // 获取分类信息
          if (articleData.articles[0].categoryId) {
            const catRes = await fetch(`/api/categories?id=${articleData.articles[0].categoryId}`)
            const catData = await catRes.json()
            if (catData.success && catData.categories && catData.categories.length > 0) {
              setSubpageCategory(catData.categories[0])
            }
          }
        } else {
          // 数据不存在，关闭子页面
          setSubpageData(null)
          setActiveSubpage(null)
        }
      }
    } catch (err) {
      console.error('加载子页面数据失败:', err)
      setSubpageData(null)
      setActiveSubpage(null)
    }
  }

  const handleOpenSubpage = (type: 'link' | 'post', id: number | string) => {
    const idStr = String(id)
    setActiveSubpage({ type, id: idStr })
    loadSubpageData(type, idStr)
    // 更新URL但不刷新页面
    window.history.pushState(null, '', `/${type}/${idStr}`)
  }

  const handleCloseSubpage = () => {
    setActiveSubpage(null)
    setSubpageData(null)
    setSubpageCategory(null)
    window.history.pushState(null, '', '/')
  }

  const handleCategoryClick = (categoryId: string) => {
    // 关闭移动端抽屉
    setMobileNavOpen(false)
    // 如果在子页面，先关闭子页面
    if (activeSubpage) {
      setActiveSubpage(null)
      setSubpageData(null)
      setSubpageCategory(null)
      window.history.pushState(null, '', '/')
    }
    // 延迟滚动，等待页面更新
    setTimeout(() => {
      const element = document.getElementById(`category-${categoryId}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  const getIconHtml = (icon: string | undefined, url: string) => {
    if (!icon) {
      try {
        const domain = new URL(url).hostname
        return (
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
            alt=""
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
            }}
          />
        )
      } catch {
        return <span>🔗</span>
      }
    }

    if (icon.startsWith('http://') || icon.startsWith('https://')) {
      return <img src={icon} alt="" />
    }

    return <span>{icon}</span>
  }

  // 根据搜索词过滤导航
  const filteredNavs = navs.filter((nav: any) => {
    const matchSearch = !searchQuery || 
      nav.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (nav.desc && nav.desc.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (nav.tags && nav.tags.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchSearch
  })

  // 解析友情链接设置：每行一条，英文逗号分隔 名称,链接
  const friendLinks: { name: string; url: string }[] = (settings.friendLinks || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(',')
      if (idx <= 0) return null
      const name = line.slice(0, idx).trim()
      const url = line.slice(idx + 1).trim()
      if (!name || !url) return null
      // 自动补全协议
      const href = /^https?:\/\//i.test(url) ? url : 'https://' + url.replace(/^\/\//, '')
      return { name, url: href }
    })
    .filter((link): link is { name: string; url: string } => link !== null)

  // banner 背景图：叠加半透明白色遮罩（0.3）保证文字可读，不改动图片色相
  const bannerStyle = settings.bannerBgImage
    ? {
        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.3)), url(${settings.bannerBgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined

  // 搜索栏（桌面侧边栏 & 移动端主内容共用）
  const searchBar = (
    <div className="sidebar-search">
      <input
        type="text"
        placeholder="搜索导航..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="sidebar-search-input"
      />
    </div>
  )

  // 分类导航列表（桌面侧边栏 & 移动端抽屉共用）
  const sidebarNav = (
    <nav className="category-nav">
      {categories.map((category: any) => (
        <button
          key={category.id}
          className="category-nav-item"
          onClick={() => handleCategoryClick(category.id)}
        >
          <span className="category-nav-icon">
            {category.icon && (category.icon.startsWith('http://') || category.icon.startsWith('https://')) ? (
              <img src={category.icon} alt={category.name} style={{ width: 24, height: 24, objectFit: 'contain' }} />
            ) : category.icon && category.icon.startsWith('icon-') ? (
              <svg className="icon-svg" aria-hidden="true">
                <use xlinkHref={`#${category.icon}`}></use>
              </svg>
            ) : (
              category.icon || '📁'
            )}
          </span>
          <span className="category-nav-name">{category.name}</span>
          <span className="category-nav-count">
            {category.type === 'article' 
              ? articles.filter(a => a.categoryId === category.category_id).length
              : navs.filter(n => n.category === category.name).length
            }
          </span>
        </button>
      ))}
    </nav>
  )

  // 公告模块（桌面右侧栏 & 移动端抽屉顶部共用）
  const announcementModule = (
    <div className="announcement-module">
      <div className="announcement-title">📢 公告</div>
      <div className="announcement-content">
        {settings.announcement ? (
          <div className="announcement-html" dangerouslySetInnerHTML={{ __html: settings.announcement }} />
        ) : (
          '欢迎访问 ACGNav 导航页！'
        )}
      </div>
    </div>
  )

  // 友情链接模块（桌面右侧栏 & 移动端抽屉底部共用）
  const friendLinksModule = friendLinks.length > 0 ? (
    <div className="friend-links-module">
      <div className="friend-links-title">🔗 友情链接</div>
      <div className="friend-links-list">
        {friendLinks.map((link, index) => (
          <a
            key={index}
            className="friend-link-item"
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            title={link.name}
          >
            {link.name}
          </a>
        ))}
      </div>
    </div>
  ) : null

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">加载中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header" style={bannerStyle}>
        <div className="header-content">
          {settings.siteLogo && (
            <img
              src={settings.siteLogo}
              alt="Logo"
              className="site-logo"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          )}
          <div className="site-title-group">
            <h1 className="site-title">{settings.siteTitle || '我的导航'}</h1>
            {settings.siteDescription && (
              <p className="site-subtitle">{settings.siteDescription}</p>
            )}
          </div>
        </div>
      </header>

      <div className="main-with-sidebar">
        {/* 桌面端左侧分类导航 */}
        <aside className="category-sidebar">
          {searchBar}
          {sidebarNav}
        </aside>

        {/* 移动端抽屉导航 */}
        <button
          className="mobile-nav-toggle"
          style={{ left: mobileNavOpen ? 280 : 0 }}
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          aria-label="切换导航"
        >
          {mobileNavOpen ? '<' : '☰'}
        </button>
        <Drawer
          open={mobileNavOpen}
          placement="left"
          width={280}
          pushBackground={false}
          onClose={() => setMobileNavOpen(false)}
        >
          <div className="drawer-nav">
            {sidebarNav}
            <div className="drawer-bottom">
              {announcementModule}
              {friendLinksModule}
            </div>
          </div>
        </Drawer>

        {/* 主内容区域 */}
        <main className="main-content">
          {/* 移动端搜索栏 */}
          <div className="mobile-search">{searchBar}</div>

          {/* 广告链接模块 - 始终显示 */}
          {settings.showAdsNav && (
            <div className="ads-nav-module">
              <div className="ads-nav-list">
                {ads.filter(ad => ad.ad_type === 'link' && ad.is_active).length > 0 ? (
                  ads.filter(ad => ad.ad_type === 'link' && ad.is_active).slice(0, 8).map((ad) => (
                    <div
                      key={ad.id}
                      className="ads-nav-item"
                      onClick={() => {
                        // 解析链接广告内容，提取URL
                        const match = ad.content.match(/window\.open\('([^']+)',/)
                        if (match) {
                          window.open(match[1], '_blank', 'noopener,noreferrer')
                        }
                      }}
                    >
                      <div className="ads-nav-icon">
                        {/* 从内容中提取图标或使用默认图标 */}
                        {(() => {
                          const iconMatch = ad.content.match(/<img[^>]+src=["']([^"']+)["']/)
                          if (iconMatch) {
                            return <img src={iconMatch[1]} alt={ad.name} />
                          }
                          return <span className="ads-nav-default-icon">🔗</span>
                        })()}
                      </div>
                      <div className="ads-nav-name">{ad.name}</div>
                    </div>
                  ))
                ) : (
                  // 占位符
                  Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="ads-nav-item ads-nav-placeholder">
                      <div className="ads-nav-icon">
                        <span className="ads-nav-default-icon">📢</span>
                      </div>
                      <div className="ads-nav-name">广告位招租</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeSubpage ? (
            /* 子页面内容 */
            <div className="subpage-content">
              {activeSubpage.type === 'link' && subpageData && (
                <>
                  <button className="link-detail-back" onClick={handleCloseSubpage}>
                    返回首页
                  </button>
                  <div className="link-detail-card">
                    <div className="link-detail-body">
                      <div className="link-detail-icon">
                        {subpageData.icon ? (
                          subpageData.icon.startsWith('http://') || subpageData.icon.startsWith('https://') ? (
                            <img src={subpageData.icon} alt={subpageData.title} />
                          ) : subpageData.icon.startsWith('icon-') ? (
                            <svg className="icon-svg" aria-hidden="true">
                              <use xlinkHref={`#${subpageData.icon}`}></use>
                            </svg>
                          ) : (
                            <span>{subpageData.icon}</span>
                          )
                        ) : (
                          <span>🔗</span>
                        )}
                      </div>
                      
                      <div className="link-detail-info">
                        <h1 className="link-detail-title">
                          {subpageData.title}
                          {subpageCategory && (
                            <span className="link-detail-category">{subpageCategory.name}</span>
                          )}
                        </h1>
                        {subpageData.desc && <p className="link-detail-desc">{subpageData.desc}</p>}
                        {subpageData.tags && (
                          <div className="link-detail-tags">
                            {subpageData.tags.split(',').filter((t: string) => t.trim()).map((tag: string, index: number) => (
                              <span key={index} className="link-detail-tag">{tag.trim()}</span>
                            ))}
                          </div>
                        )}
                        <Button 
                          type="primary" 
                          size="large" 
                          onClick={() => window.open(subpageData.url, '_blank', 'noopener,noreferrer')}
                        >
                          访问网站
                        </Button>
                      </div>
                    </div>
                  
                  {/* 相关网站 */}
                  {(() => {
                    const currentTags = subpageData.tags ? subpageData.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []
                    
                    // 优先根据相同标签匹配
                    const tagMatchedNavs = currentTags.length > 0 ? navs
                      .filter(nav => {
                        if (nav.id === subpageData.id) return false
                        if (!nav.tags) return false
                        const navTags = nav.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
                        return currentTags.some((tag: string) => navTags.includes(tag))
                      }) : []
                    
                    // 如果不足5个，再根据相同分类填充
                    let relatedNavs = [...tagMatchedNavs]
                    
                    if (relatedNavs.length < 5 && subpageCategory) {
                      const categoryMatchedNavs = navs
                        .filter(nav => {
                          if (nav.id === subpageData.id) return false
                          if (relatedNavs.some(r => r.id === nav.id)) return false
                          return nav.category === subpageCategory.name
                        })
                      relatedNavs = [...relatedNavs, ...categoryMatchedNavs]
                    }
                    
                    // 最多显示5个
                    relatedNavs = relatedNavs.slice(0, 5)
                    
                    if (relatedNavs.length === 0) return null
                    
                    return (
                      <div className="link-detail-related">
                        <h3 className="link-detail-related-title">相关网站</h3>
                        <div className="link-detail-related-list">
                          {relatedNavs.map((nav) => (
                            <div
                              key={nav.id}
                              className="link-detail-related-item"
                              onClick={() => handleOpenSubpage('link', nav.numId || 0)}
                            >
                              <div className="link-detail-related-icon">
                                {nav.icon ? (
                                  nav.icon.startsWith('http://') || nav.icon.startsWith('https://') ? (
                                    <img src={nav.icon} alt={nav.title} />
                                  ) : nav.icon.startsWith('icon-') ? (
                                    <svg className="icon-svg" aria-hidden="true">
                                      <use xlinkHref={`#${nav.icon}`}></use>
                                    </svg>
                                  ) : (
                                    <span>{nav.icon}</span>
                                  )
                                ) : (
                                  <span>🔗</span>
                                )}
                              </div>
                              <div className="link-detail-related-name">{nav.title}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </>
            )}
              
              {activeSubpage.type === 'post' && subpageData && (
                <>
                  <button className="post-detail-back" onClick={handleCloseSubpage}>
                    返回首页
                  </button>
                  <div className="post-detail-card">
                    <div className="post-detail-body">
                      <h1 className="post-detail-title">
                        {subpageData.title}
                        {subpageData.categoryId && (() => {
                          const cat = categories.find(c => c.category_id === subpageData.categoryId)
                          return cat ? <span className="post-detail-category">{cat.name}</span> : null
                        })()}
                      </h1>
                      
                      <div className="post-detail-divider"></div>
                      
                      {subpageData.cover && (
                        <div className="post-detail-cover">
                          <img src={subpageData.cover} alt={subpageData.title} />
                        </div>
                      )}
                      
                      {subpageData.content && (
                        <div className="post-detail-content" dangerouslySetInnerHTML={{ __html: parseMarkdown(subpageData.content) }} />
                      )}
                      
                      {subpageData.tags && (
                        <div className="post-detail-tags">
                          {subpageData.tags.split(',').filter((t: string) => t.trim()).map((tag: string, index: number) => (
                            <span key={index} className="post-detail-tag">{tag.trim()}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 相关文章 */}
                  {(() => {
                    const currentTags = subpageData.tags ? subpageData.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []
                    
                    // 优先根据相同标签匹配
                    const tagMatchedArticles = currentTags.length > 0 ? articles
                      .filter(article => {
                        if (article.id === subpageData.id) return false
                        if (!article.tags) return false
                        const articleTags = article.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
                        return currentTags.some((tag: string) => articleTags.includes(tag))
                      }) : []
                    
                    // 如果不足5个，再根据相同分类填充
                    let relatedArticles = [...tagMatchedArticles]
                    
                    if (relatedArticles.length < 5 && subpageData.categoryId) {
                      const categoryMatchedArticles = articles
                        .filter(article => {
                          if (article.id === subpageData.id) return false
                          if (relatedArticles.some(r => r.id === article.id)) return false
                          return article.categoryId === subpageData.categoryId
                        })
                      relatedArticles = [...relatedArticles, ...categoryMatchedArticles]
                    }
                    
                    // 最多显示5个
                    relatedArticles = relatedArticles.slice(0, 5)
                    
                    if (relatedArticles.length === 0) return null
                    
                    return (
                      <div className="post-detail-related">
                        <h3 className="post-detail-related-title">相关文章</h3>
                        <div className="post-detail-related-list">
                          {relatedArticles.map((article) => (
                            <div
                              key={article.id}
                              className="post-detail-related-item"
                              onClick={() => handleOpenSubpage('post', article.numId || 0)}
                            >
                              <div className="post-detail-related-info">
                                <div className="post-detail-related-name">{article.title}</div>
                                {article.summary && (
                                  <div className="post-detail-related-summary">{article.summary}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </>
              )}
            </div>
          ) : filteredNavs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>暂无导航链接</p>
              <Button type="primary" onClick={() => window.location.href = '/admin'}>
                去添加
              </Button>
            </div>
          ) : (
            <>
              {/* 按分类分组显示 */}
              {categories.map((category: any) => {
                const categoryNavs = filteredNavs.filter(nav => nav.category === category.name)
                if (categoryNavs.length === 0) return null
                
                const isExpanded = expandedCategories.has(category.id)
                const displayNavs = isExpanded ? categoryNavs : categoryNavs.slice(0, 10)
                const hasMore = categoryNavs.length > 10
                
                return (
                  <div key={category.id} id={`category-${category.id}`} className="category-section">
                    <div className="category-section-header">
                      <span className="category-section-icon">
                        {category.icon && (category.icon.startsWith('http://') || category.icon.startsWith('https://')) ? (
                          <img src={category.icon} alt={category.name} />
                        ) : category.icon && category.icon.startsWith('icon-') ? (
                          <svg className="icon-svg" aria-hidden="true">
                            <use xlinkHref={`#${category.icon}`}></use>
                          </svg>
                        ) : (
                          category.icon || '📁'
                        )}
                      </span>
                      <h2 className="category-section-title">
                        <span className="category-section-title-text">{category.name}</span>
                      </h2>
                      {hasMore && (
                        <button
                          className="category-section-more"
                          onClick={() => {
                            setExpandedCategories(prev => {
                              const next = new Set(prev)
                              if (next.has(category.id)) {
                                next.delete(category.id)
                              } else {
                                next.add(category.id)
                              }
                              return next
                            })
                          }}
                        >
                          {isExpanded ? '收起' : '显示更多'}
                        </button>
                      )}
                    </div>
                    <div className="nav-grid">
                      {displayNavs.map((nav) => (
                        <Card key={nav.id} className="nav-card">
                          <div
                            className="nav-card-link"
                            onClick={(e) => {
                              e.preventDefault()
                              handleOpenSubpage('link', nav.numId || 0)
                            }}
                          >
                            <div className="nav-card-top">
                              <div className="nav-card-icon">
                                {getIconHtml(nav.icon, nav.url)}
                              </div>
                              <div className="nav-card-info">
                                <div className="nav-card-title">{nav.title}</div>
                                {nav.desc && (
                                  <div className="nav-card-desc">{nav.desc}</div>
                                )}
                              </div>
                              <div
                                className="nav-card-visit"
                                title="访问链接"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenSubpage('link', nav.numId || 0)
                                }}
                              >
                                ↗
                              </div>
                            </div>
                            <div className="nav-card-bottom">
                              {nav.tags && (
                                <div className="nav-card-tags">
                                  {nav.tags.split(',').slice(0, 3).map((tag: string, index: number) => (
                                    <span key={index} className="nav-tag">{tag.trim()}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )
              })}
              
              {/* 未分类的链接 */}
              {(() => {
                const uncategorizedNavs = filteredNavs.filter(nav => !nav.category || !categories.some(c => c.name === nav.category))
                if (uncategorizedNavs.length === 0) return null
                
                const isExpanded = expandedCategories.has('uncategorized')
                const displayNavs = isExpanded ? uncategorizedNavs : uncategorizedNavs.slice(0, 10)
                const hasMore = uncategorizedNavs.length > 10
                
                return (
                  <div className="category-section">
                    <div className="category-section-header">
                      <span className="category-section-icon">📋</span>
                      <h2 className="category-section-title">
                        <span className="category-section-title-text">未分类</span>
                      </h2>
                      {hasMore && (
                        <button
                          className="category-section-more"
                          onClick={() => {
                            setExpandedCategories(prev => {
                              const next = new Set(prev)
                              if (next.has('uncategorized')) {
                                next.delete('uncategorized')
                              } else {
                                next.add('uncategorized')
                              }
                              return next
                            })
                          }}
                        >
                          {isExpanded ? '收起' : '显示更多'}
                        </button>
                      )}
                    </div>
                    <div className="nav-grid">
                      {displayNavs.map((nav) => (
                        <Card key={nav.id} className="nav-card">
                          <div
                            className="nav-card-link"
                            onClick={(e) => {
                              e.preventDefault()
                              handleOpenSubpage('link', nav.numId || 0)
                            }}
                          >
                            <div className="nav-card-top">
                              <div className="nav-card-icon">
                                {getIconHtml(nav.icon, nav.url)}
                              </div>
                              <div className="nav-card-info">
                                <div className="nav-card-title">{nav.title}</div>
                                {nav.desc && (
                                  <div className="nav-card-desc">{nav.desc}</div>
                                )}
                              </div>
                              <div
                                className="nav-card-visit"
                                title="访问链接"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenSubpage('link', nav.numId || 0)
                                }}
                              >
                                ↗
                              </div>
                            </div>
                            <div className="nav-card-bottom">
                              {nav.tags && (
                                <div className="nav-card-tags">
                                  {nav.tags.split(',').slice(0, 3).map((tag: string, index: number) => (
                                    <span key={index} className="nav-tag">{tag.trim()}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </>
          )}

          {/* 文章区域 - 只在首页显示 */}
          {!activeSubpage && articles.length > 0 && (() => {
            const articleCategoryIds = [...new Set(articles.map(a => a.categoryId).filter(Boolean))]
            const articleCategoryNames = articleCategoryIds.map(id => {
              const cat = categories.find(c => c.category_id === id)
              return cat ? cat.name : id
            })
            const sectionTitle = articleCategoryNames.length === 1 ? articleCategoryNames[0] : '文章'
            const articleCategory = articleCategoryIds.length === 1 ? categories.find(c => c.category_id === articleCategoryIds[0]) : null
            const articleIcon = articleCategory?.icon || '📄'
            return (
              <div className="articles-section">
                <div className="articles-section-header">
                  <span className="category-section-icon">
                    {articleIcon.startsWith('http://') || articleIcon.startsWith('https://') ? (
                      <img src={articleIcon} alt={sectionTitle} />
                    ) : articleIcon.startsWith('icon-') ? (
                      <svg className="icon-svg" aria-hidden="true">
                        <use xlinkHref={`#${articleIcon}`}></use>
                      </svg>
                    ) : (
                      articleIcon
                    )}
                  </span>
                  <h2 className="articles-section-title">
                    <span className="category-section-title-text">{sectionTitle}</span>
                  </h2>
                {articles.length > 6 && (
                  <button
                    className="articles-more-btn"
                    onClick={() => setArticlesExpanded(!articlesExpanded)}
                  >
                    {articlesExpanded ? '收起' : '查看更多'}
                  </button>
                )}
              </div>
              <div className="articles-grid">
                {articles.slice(0, articlesExpanded ? undefined : 6).map((article) => (
                  <div 
                    key={article.id} 
                    className="article-card"
                    onClick={() => handleOpenSubpage('post', article.numId || 0)}
                    style={{ cursor: 'pointer' }}
                  >
                    {article.cover && (
                      <div className="article-card-cover">
                        <img src={article.cover} alt={article.title} />
                      </div>
                    )}
                    <div className="article-card-content">
                      <h3 className="article-card-title">{article.title}</h3>
                      {article.summary && (
                        <p className="article-card-summary">{article.summary}</p>
                      )}
                      <div className="article-card-footer">
                        {article.tags && (
                          <div className="article-card-tags">
                            {article.tags.split(',').slice(0, 3).map((tag: string, index: number) => (
                              <span key={index} className="article-tag">{tag.trim()}</span>
                            ))}
                          </div>
                        )}
                        <span className="article-card-link">点击阅读</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )
          })()}
        </main>

        {/* 右侧栏 */}
        <aside className="right-sidebar">
          <div className="right-sidebar-top">
            {announcementModule}
            {friendLinksModule}
          </div>

          {/* 图片广告区域 */}
          {ads.filter(ad => ad.ad_type === 'image' && ad.is_active).length > 0 && (
            <div className="image-ads-module">
              {ads.filter(ad => ad.ad_type === 'image' && ad.is_active).map((ad) => (
                <div
                  key={ad.id}
                  className="image-ad-item"
                  dangerouslySetInnerHTML={{ __html: ad.content }}
                />
              ))}
            </div>
          )}
        </aside>
      </div>

      <footer className="footer">
        <p>{settings.footerText || 'Powered by Cloudflare Pages'}</p>
      </footer>
    </div>
  )
}

export default Home