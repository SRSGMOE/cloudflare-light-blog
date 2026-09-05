import React, { useState, useEffect, useRef } from 'react'
import { Button, Card, Input, Form, Icon, Switch, Collapse } from 'animal-island-ui'
import { useSettings } from '../hooks/useSettings'
import { useNavs } from '../hooks/useNavs'
import { useArticles } from '../hooks/useArticles'
import { checkAuthStatus, login } from '../api'

// 日历组件
function CalendarWidget() {
  const [currentDate] = useState(new Date())
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const today = currentDate.getDate()
  
  // 获取本月第一天是星期几
  const firstDay = new Date(year, month, 1).getDay()
  // 获取本月天数
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  
  // 生成日历网格
  const days = []
  // 填充月初空白
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>)
  }
  // 填充日期
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(
      <div key={i} className={`calendar-day ${i === today ? 'today' : ''}`}>
        {i}
      </div>
    )
  }
  
  return (
    <div className="calendar-widget">
      <div className="calendar-header">
        <span className="calendar-year">{year}</span>
        <span className="calendar-month">{monthNames[month]}</span>
      </div>
      <div className="calendar-weekdays">
        {weekDays.map(day => (
          <div key={day} className="calendar-weekday">{day}</div>
        ))}
      </div>
      <div className="calendar-days">
        {days}
      </div>
    </div>
  )
}

// 时钟组件（替代已移除的 animal-island-ui Time 组件）
function GameClockWidget() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  const weekday = weekDays[now.getDay()]
  const date = `${now.getFullYear()} ${monthNames[now.getMonth()]} ${now.getDate()}日`
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')

  return (
    <div className="time-display">
      <div className="time-hud">
        <div className="time-hud-left">
          <div className="time-hud-weekday">{weekday}</div>
          <div className="time-hud-date">{date}</div>
        </div>
        <div className="time-hud-right">
          <span className="time-hud-time">{hh}:{mm}</span>
          <span className="time-hud-seconds">{ss}</span>
        </div>
      </div>
      <div className="time-hud-line"></div>
      <div className="time-hud-label">ACGNav 导航</div>
    </div>
  )
}

function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [activeMenu, setActiveMenu] = useState('dashboard')

  const { settings, updateSettings } = useSettings()
  const { navs, addNav, updateNav, deleteNav } = useNavs()
  const { articles, addArticle, updateArticle, deleteArticle, loadArticles } = useArticles()
  const contentEditorRef = useRef<HTMLTextAreaElement>(null)

  // Markdown插入函数
  const insertMarkdown = (prefix: string, suffix: string, placeholder: string) => {
    const textarea = contentEditorRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = newArticle.content
    const selected = text.substring(start, end) || placeholder
    const newText = text.substring(0, start) + prefix + selected + suffix + text.substring(end)

    setNewArticle({ ...newArticle, content: newText })
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length)
    }, 0)
  }

  // 添加导航表单状态
  const [newNav, setNewNav] = useState({
    title: '',
    url: '',
    desc: '',
    icon: '',
    category: '',
    categoryId: '',
    tags: '',
    sortOrder: 0
  })

  // 编辑导航表单状态
  const [editNav, setEditNav] = useState({
    title: '',
    url: '',
    desc: '',
    icon: '',
    category: '',
    categoryId: '',
    tags: '',
    sortOrder: 0
  })

  // 分类管理状态
  const [categories, setCategories] = useState<any[]>([])
  const [newCategory, setNewCategory] = useState({ name: '', icon: '', category_id: '', type: 'link', sortOrder: 0 })
  const [editingCategory, setEditingCategory] = useState<any>(null)

  // 分类筛选状态
  const [navCategoryFilter, setNavCategoryFilter] = useState('')
  const [articleCategoryFilter, setArticleCategoryFilter] = useState('')

  // 按分类筛选后的列表
  const filteredNavs = navs.filter(nav => !navCategoryFilter || nav.category === navCategoryFilter)
  const filteredArticles = articles.filter(article => !articleCategoryFilter || article.categoryId === articleCategoryFilter)

  // 广告管理状态
  const [ads, setAds] = useState<any[]>([])
  const [newLinkAd, setNewLinkAd] = useState({ name: '', url: '', icon: '', sortOrder: 0 })
  const [newImageAd, setNewImageAd] = useState({ name: '', imageUrl: '', linkUrl: '', sortOrder: 0 })
  const [editingAd, setEditingAd] = useState<any>(null)

  // 文章管理状态
  const [newArticle, setNewArticle] = useState({ title: '', url: '', content: '', summary: '', cover: '', categoryId: '', tags: '', isPublished: true, sortOrder: 0 })
  const [editingArticle, setEditingArticle] = useState<any>(null)

  // 网站设置本地状态
  const [localSettings, setLocalSettings] = useState({
    siteTitle: '',
    siteSubtitle: '',
    siteLogo: '',
    siteDescription: '',
    footerText: '',
    siteKeywords: '',
    iconfontSymbol: '',
    showAdsNav: false,
    announcement: '',
    friendLinks: '',
    bannerBgImage: ''
  })

  // iconfont 图标列表
  const [iconfontIcons, setIconfontIcons] = useState<string[]>([])

  // 同步 settings 到 localSettings
  useEffect(() => {
    if (settings.siteTitle !== undefined) {
      setLocalSettings({
        siteTitle: settings.siteTitle || '',
        siteSubtitle: settings.siteSubtitle || '',
        siteLogo: settings.siteLogo || '',
        siteDescription: settings.siteDescription || '',
        footerText: settings.footerText || '',
        siteKeywords: settings.siteKeywords || '',
        iconfontSymbol: settings.iconfontSymbol || '',
        showAdsNav: settings.showAdsNav || false,
        announcement: settings.announcement || '',
        friendLinks: settings.friendLinks || '',
        bannerBgImage: settings.bannerBgImage || ''
      })

      // 加载 iconfont Symbol 脚本
      if (settings.iconfontSymbol) {
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
          script.onload = () => {
            // 解析图标列表
            setTimeout(() => {
              const symbols = document.querySelectorAll('svg[id^="icon-"]')
              const icons = Array.from(symbols).map(s => s.id.replace('icon-', ''))
              setIconfontIcons(icons)
            }, 500)
          }
          document.head.appendChild(script)
        }
      }
    }
  }, [settings])

  // 通知和弹窗状态
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string; description?: string } | null>(null)
  const [modal, setModal] = useState<{ title: string; content: string; onConfirm: () => void } | null>(null)

  useEffect(() => {
    // 先检查本地token
    const token = localStorage.getItem('adminToken')
    if (token) {
      setIsAuthenticated(true)
      loadCategories()
      loadAds()
    }
    // 然后验证token有效性
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const data = await checkAuthStatus()
      if (data.authenticated) {
        setIsAuthenticated(true)
        loadCategories()
        loadAds()
      } else {
        // token无效，清除
        localStorage.removeItem('adminToken')
        setIsAuthenticated(false)
      }
    } catch (err) {
      console.error('检查认证状态失败:', err)
    }
  }

  // 显示通知
  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', message: string, description?: string) => {
    setNotification({ type, message, description })
    setTimeout(() => setNotification(null), 3000)
  }

  // 显示确认弹窗
  const showConfirm = (title: string, content: string, onConfirm: () => void) => {
    setModal({ title, content, onConfirm })
  }

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
      const response = await fetch('/api/ads?all=true')
      const data = await response.json()
      if (data.success) {
        setAds(data.ads)
      }
    } catch (err) {
      console.error('加载广告失败:', err)
    }
  }

  const handleLogin = async () => {
    if (!password.trim()) {
      showNotification('warning', '请输入管理密码')
      return
    }

    try {
      setLoading(true)
      const data = await login(password)

      if (data.success) {
        // 保存 token 到 localStorage
        if (data.token) {
          localStorage.setItem('adminToken', data.token)
        }
        showNotification('success', '登录成功', '欢迎回到导航管理后台')
        setIsAuthenticated(true)
        loadCategories()
        loadAds()
      } else {
        showNotification('error', data.error || data.message || '密码错误', '请检查密码是否正确')
      }
    } catch (err) {
      showNotification('error', '登录失败')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    setIsAuthenticated(false)
    window.location.reload()
  }

  const handleAddNav = async () => {
    if (!newNav.title.trim() || !newNav.url.trim()) {
      showNotification('warning', '标题和链接不能为空')
      return
    }

    try {
      const result = await addNav(newNav)

      if (result.success) {
        showNotification('success', '添加成功', '新导航链接已添加到列表中')
        setNewNav({ title: '', url: '', desc: '', icon: '', category: '', categoryId: '', tags: '', sortOrder: 0 })
      } else {
        showNotification('error', result.error || '添加失败', '请检查输入信息是否完整')
      }
    } catch (err) {
      showNotification('error', '添加失败')
    }
  }

  const handleEditNav = async (id: number) => {
    if (!editNav.title.trim() || !editNav.url.trim()) {
      showNotification('warning', '标题和链接不能为空')
      return
    }

    try {
      const result = await updateNav(id, editNav)

      if (result.success) {
        showNotification('success', '更新成功', '导航链接信息已更新')
        setEditingId(null)
      } else {
        showNotification('error', result.error || '更新失败', '请检查输入信息是否完整')
      }
    } catch (err) {
      showNotification('error', '更新失败')
    }
  }

  const handleDeleteNav = async (id: number) => {
    showConfirm('确认删除', '确定要删除这个导航吗？', async () => {
      try {
        const result = await deleteNav(id)

        if (result.success) {
          showNotification('success', '删除成功', '导航链接已从列表中移除')
        } else {
          showNotification('error', result.error || '删除失败', '请稍后重试')
        }
      } catch (err) {
        showNotification('error', '删除失败', '网络错误，请检查网络连接')
      }
    })
  }

  const handleSaveSettings = async () => {
    try {
      const result = await updateSettings(localSettings)

      if (result.success) {
        showNotification('success', '设置已保存', '网站设置已更新并生效')
      } else {
        showNotification('error', result.error || '保存失败', '请检查输入信息是否正确')
      }
    } catch (err) {
      showNotification('error', '保存失败', '网络错误，请检查网络连接')
    }
  }

  const startEdit = (nav: { id: number; title: string; url: string; desc?: string; icon?: string; category?: string; categoryId?: string; tags?: string; sortOrder?: number }) => {
    setEditingId(nav.id)
    setEditNav({
      title: nav.title,
      url: nav.url,
      desc: nav.desc || '',
      icon: nav.icon || '',
      category: nav.category || '',
      categoryId: nav.categoryId || '',
      tags: nav.tags || '',
      sortOrder: nav.sortOrder || 0
    })
  }

  // 分类管理函数
  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      showNotification('warning', '分类名称不能为空')
      return
    }

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(newCategory)
      })
      const data = await response.json()
      if (data.success) {
        showNotification('success', '分类添加成功')
        setNewCategory({ name: '', icon: '', category_id: '', type: 'link', sortOrder: 0 })
        loadCategories()
      } else {
        showNotification('error', data.message || '添加失败')
      }
    } catch (err) {
      showNotification('error', '添加失败')
    }
  }

  const handleUpdateCategory = async (id: string) => {
    if (!editingCategory) return

    try {
      const response = await fetch(`/api/categories?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(editingCategory)
      })
      const data = await response.json()
      if (data.success) {
        showNotification('success', '分类更新成功')
        setEditingCategory(null)
        loadCategories()
      } else {
        showNotification('error', data.message || '更新失败')
      }
    } catch (err) {
      showNotification('error', '更新失败')
    }
  }

  const handleDeleteCategory = async (id: string) => {
    showConfirm('确认删除', '确定要删除这个分类吗？', async () => {
      try {
        const response = await fetch(`/api/categories?id=${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          }
        })
        const data = await response.json()
        if (data.success) {
          showNotification('success', '分类删除成功')
          loadCategories()
        } else {
          showNotification('error', data.message || '删除失败')
        }
      } catch (err) {
        showNotification('error', '删除失败')
      }
    })
  }

  // 广告管理函数
  const handleAddLinkAd = async () => {
    if (!newLinkAd.name.trim() || !newLinkAd.url.trim()) {
      showNotification('warning', '广告名称和链接不能为空')
      return
    }

    try {
      const response = await fetch('/api/ads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          name: newLinkAd.name,
          content: `<div class="ads-nav-item" onclick="window.open('${newLinkAd.url}', '_blank')"><div class="ads-nav-icon"><img src="${newLinkAd.icon || ''}" alt="${newLinkAd.name}"></div><div class="ads-nav-name">${newLinkAd.name}</div></div>`,
          adType: 'link',
          sortOrder: newLinkAd.sortOrder
        })
      })
      const data = await response.json()
      if (data.success) {
        showNotification('success', '链接广告添加成功')
        setNewLinkAd({ name: '', url: '', icon: '', sortOrder: 0 })
        loadAds()
      } else {
        showNotification('error', data.message || '添加失败')
      }
    } catch (err) {
      showNotification('error', '添加失败')
    }
  }

  const handleAddImageAd = async () => {
    if (!newImageAd.name.trim() || !newImageAd.imageUrl.trim()) {
      showNotification('warning', '广告名称和图片不能为空')
      return
    }

    try {
      const content = newImageAd.linkUrl
        ? `<a href="${newImageAd.linkUrl}" target="_blank" rel="noopener noreferrer"><img src="${newImageAd.imageUrl}" alt="${newImageAd.name}"></a>`
        : `<img src="${newImageAd.imageUrl}" alt="${newImageAd.name}">`
      
      const response = await fetch('/api/ads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          name: newImageAd.name,
          content: content,
          adType: 'image',
          sortOrder: newImageAd.sortOrder
        })
      })
      const data = await response.json()
      if (data.success) {
        showNotification('success', '图片广告添加成功')
        setNewImageAd({ name: '', imageUrl: '', linkUrl: '', sortOrder: 0 })
        loadAds()
      } else {
        showNotification('error', data.message || '添加失败')
      }
    } catch (err) {
      showNotification('error', '添加失败')
    }
  }

  const handleUpdateAd = async (id: string) => {
    if (!editingAd) return

    try {
      const response = await fetch(`/api/ads?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(editingAd)
      })
      const data = await response.json()
      if (data.success) {
        showNotification('success', '广告更新成功')
        setEditingAd(null)
        loadAds()
      } else {
        showNotification('error', data.message || '更新失败')
      }
    } catch (err) {
      showNotification('error', '更新失败')
    }
  }

  const handleDeleteAd = async (id: string) => {
    showConfirm('确认删除', '确定要删除这个广告吗？', async () => {
      try {
        const response = await fetch(`/api/ads?id=${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          }
        })
        const data = await response.json()
        if (data.success) {
          showNotification('success', '广告删除成功')
          loadAds()
        } else {
          showNotification('error', data.message || '删除失败')
        }
      } catch (err) {
        showNotification('error', '删除失败')
      }
    })
  }

  // 文章管理函数
  const handleAddArticle = async () => {
    if (!newArticle.title.trim()) {
      showNotification('warning', '文章标题不能为空')
      return
    }

    // 先不设置url，让API自动生成num_id后更新
    const articleData = {
      ...newArticle,
      url: '#'
    }

    const result = await addArticle(articleData)
    if (result.success && result.article) {
      // 使用返回的numId更新文章url
      const articleUrl = `/post/${result.article.numId}`
      await updateArticle(result.article.id, { url: articleUrl })
      showNotification('success', '文章添加成功')
      setNewArticle({ title: '', url: '', content: '', summary: '', cover: '', categoryId: '', tags: '', isPublished: true, sortOrder: 0 })
      loadArticles()
    } else {
      showNotification('error', result.error || '添加失败')
    }
  }

  const handleUpdateArticle = async (id: string) => {
    if (!editingArticle) return

    const result = await updateArticle(id, editingArticle)
    if (result.success) {
      showNotification('success', '文章更新成功')
      setEditingArticle(null)
    } else {
      showNotification('error', result.error || '更新失败')
    }
  }

  const handleDeleteArticle = async (id: string) => {
    setModal({
      title: '确认删除',
      content: '确定要删除这篇文章吗？',
      onConfirm: async () => {
        const result = await deleteArticle(id)
        if (result.success) {
          showNotification('success', '文章删除成功')
        } else {
          showNotification('error', result.error || '删除失败')
        }
      }
    })
  }

  // 统计数据
  const stats = {
    totalUsers: 0, // 预留用户统计
    totalNavs: navs.length,
    totalArticles: articles.length,
    totalAds: ads.length,
    activeAds: ads.filter((ad: any) => ad.is_active).length
  }

  if (!isAuthenticated) {
    return (
      <div className="admin-login">
        <Card className="login-card">
          <div className="login-header">
            <div className="login-logo">🧭</div>
            <h2>导航管理后台</h2>
            <p className="login-subtitle">请输入管理密码登录</p>
          </div>
          <div className="login-form">
            <div className="login-form-item">
              <label className="login-label">管理密码</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入管理密码"
              />
            </div>
            <Button type="primary" onClick={handleLogin} loading={loading} block>
              登录
            </Button>
          </div>
          <div className="login-footer">
            <Button type="link" onClick={() => window.location.href = '/'}>
              返回首页
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="admin">
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <h2>管理后台</h2>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`sidebar-nav-item ${activeMenu === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveMenu('dashboard')}
          >
            <Icon name="icon-map" size={20} />
            <span>数据表盘</span>
          </button>
          <button
            className={`sidebar-nav-item ${activeMenu === 'navs' ? 'active' : ''}`}
            onClick={() => setActiveMenu('navs')}
          >
            <Icon name="icon-design" size={20} />
            <span>链接管理</span>
          </button>
          <button
            className={`sidebar-nav-item ${activeMenu === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveMenu('categories')}
          >
            <Icon name="icon-variant" size={20} />
            <span>分类管理</span>
          </button>
          <button
            className={`sidebar-nav-item ${activeMenu === 'ads' ? 'active' : ''}`}
            onClick={() => setActiveMenu('ads')}
          >
            <Icon name="icon-shopping" size={20} />
            <span>广告管理</span>
          </button>
          <button
            className={`sidebar-nav-item ${activeMenu === 'articles' ? 'active' : ''}`}
            onClick={() => setActiveMenu('articles')}
          >
            <Icon name="icon-encyclopedia" size={20} />
            <span>文章管理</span>
          </button>
          <button
            className={`sidebar-nav-item ${activeMenu === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveMenu('settings')}
          >
            <Icon name="icon-diy" size={20} />
            <span>网站设置</span>
          </button>
          <button
            className="sidebar-nav-item logout"
            onClick={handleLogout}
          >
            <Icon name="icon-left" size={20} />
            <span>退出登录</span>
          </button>
        </nav>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1>
            {activeMenu === 'dashboard' && '数据表盘'}
            {activeMenu === 'navs' && '链接管理'}
            {activeMenu === 'categories' && '分类管理'}
            {activeMenu === 'ads' && '广告管理'}
            {activeMenu === 'settings' && '网站设置'}
            {activeMenu === 'articles' && '文章管理'}
          </h1>
        </header>

        <div className="admin-content">
          {/* 数据表盘 */}
          {activeMenu === 'dashboard' && (
            <div className="dashboard">
              <div className="stats-grid">
                <Card className="stat-card">
                  <div className="stat-icon">👤</div>
                  <div className="stat-info">
                    <div className="stat-number">
                      <span className="stat-number-value">{stats.totalUsers}</span>
                      <span className="stat-number-skeleton"></span>
                    </div>
                    <div className="stat-label">用户数量</div>
                  </div>
                </Card>
                <Card className="stat-card">
                  <div className="stat-icon">🔗</div>
                  <div className="stat-info">
                    <div className="stat-number">
                      <span className="stat-number-value">{stats.totalNavs}</span>
                      <span className="stat-number-skeleton"></span>
                    </div>
                    <div className="stat-label">链接总数</div>
                  </div>
                </Card>
                <Card className="stat-card">
                  <div className="stat-icon">📄</div>
                  <div className="stat-info">
                    <div className="stat-number">
                      <span className="stat-number-value">{stats.totalArticles}</span>
                      <span className="stat-number-skeleton"></span>
                    </div>
                    <div className="stat-label">文章数量</div>
                  </div>
                </Card>
                <Card className="stat-card">
                  <div className="stat-icon">📢</div>
                  <div className="stat-info">
                    <div className="stat-number">
                      <span className="stat-number-value">{stats.totalAds}</span>
                      <span className="stat-number-skeleton"></span>
                    </div>
                    <div className="stat-label">广告数量</div>
                  </div>
                </Card>
              </div>
              <div className="dashboard-bottom">
                <Card className="time-card">
                  <GameClockWidget />
                </Card>
                <Card className="calendar-card">
                  <CalendarWidget />
                </Card>
              </div>
            </div>
          )}

          {/* 链接管理 */}
          {activeMenu === 'navs' && (
            <>
              <Card className="admin-card">
                <h3>添加链接</h3>
                <Form>
                  <Form.Item label="标题" required>
                    <Input
                      value={newNav.title}
                      onChange={(e) => setNewNav({ ...newNav, title: e.target.value })}
                      placeholder="请输入标题"
                    />
                  </Form.Item>
                  <Form.Item label="链接" required>
                    <Input
                      value={newNav.url}
                      onChange={(e) => setNewNav({ ...newNav, url: e.target.value })}
                      placeholder="请输入链接"
                    />
                  </Form.Item>
                  <Form.Item label="描述">
                    <Input
                      value={newNav.desc}
                      onChange={(e) => setNewNav({ ...newNav, desc: e.target.value })}
                      placeholder="请输入描述"
                    />
                  </Form.Item>
                  <Form.Item label="图标">
                    <Input
                      value={newNav.icon}
                      onChange={(e) => setNewNav({ ...newNav, icon: e.target.value })}
                      placeholder="Emoji 或图片 URL"
                    />
                  </Form.Item>
                  <Form.Item label="分类">
                    <select
                      value={newNav.categoryId}
                      onChange={(e) => {
                        const selectedCat = categories.find(cat => cat.id === e.target.value)
                        setNewNav({ 
                          ...newNav, 
                          categoryId: e.target.value,
                          category: selectedCat ? selectedCat.name : ''
                        })
                      }}
                      className="form-select"
                    >
                      <option value="">选择分类</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </Form.Item>
                  <Form.Item label="标签">
                    <Input
                      value={newNav.tags}
                      onChange={(e) => setNewNav({ ...newNav, tags: e.target.value })}
                      placeholder="多个标签用英文逗号分隔"
                    />
                  </Form.Item>
                  <Form.Item label="排序序号">
                    <Input
                      type="number"
                      value={newNav.sortOrder.toString()}
                      onChange={(e) => setNewNav({ ...newNav, sortOrder: parseInt(e.target.value) || 0 })}
                      placeholder="数字越大越靠前"
                    />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" onClick={handleAddNav}>
                      添加
                    </Button>
                  </Form.Item>
                </Form>
              </Card>

              <Card className="admin-card">
                <div className="admin-card-header">
                  <h3>链接列表</h3>
                  <select
                    value={navCategoryFilter}
                    onChange={(e) => setNavCategoryFilter(e.target.value)}
                    className="form-select filter-select"
                  >
                    <option value="">全部分类</option>
                    {categories.filter(c => c.type !== 'article').map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="nav-table-container">
                  <table className="nav-table">
                    <thead>
                      <tr>
                        <th>排序</th>
                        <th>标题</th>
                        <th>链接</th>
                        <th>分类</th>
                        <th>标签</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredNavs.map((nav) => (
                        <React.Fragment key={nav.id}>
                          <tr className="nav-table-row">
                            <td className="nav-table-sort">{nav.sortOrder || 0}</td>
                            <td className="nav-table-title">{nav.title}</td>
                            <td className="nav-table-url">
                              <a href={nav.url} target="_blank" rel="noopener noreferrer">
                                {nav.url}
                              </a>
                            </td>
                            <td className="nav-table-category">
                              {nav.category && (
                                <span className="nav-item-category">{nav.category}</span>
                              )}
                            </td>
                            <td className="nav-table-tags">
                              {nav.tags && (
                                <span className="nav-item-tags">{nav.tags}</span>
                              )}
                            </td>
                            <td className="nav-table-actions">
                              <Button
                                size="small"
                                onClick={() => startEdit(nav)}
                              >
                                编辑
                              </Button>
                              <Button
                                size="small"
                                className="btn-delete-light"
                                onClick={() => handleDeleteNav(nav.id)}
                              >
                                删除
                              </Button>
                            </td>
                          </tr>
                          {editingId === nav.id && (
                            <tr className="nav-table-edit-row">
                              <td colSpan={5}>
                                <div className="edit-form">
                                  <Form>
                                    <div className="edit-form-grid">
                                      <Form.Item label="标题">
                                        <Input
                                          value={editNav.title}
                                          onChange={(e) => setEditNav({ ...editNav, title: e.target.value })}
                                        />
                                      </Form.Item>
                                      <Form.Item label="链接">
                                        <Input
                                          value={editNav.url}
                                          onChange={(e) => setEditNav({ ...editNav, url: e.target.value })}
                                        />
                                      </Form.Item>
                                      <Form.Item label="描述">
                                        <Input
                                          value={editNav.desc}
                                          onChange={(e) => setEditNav({ ...editNav, desc: e.target.value })}
                                        />
                                      </Form.Item>
                                      <Form.Item label="图标">
                                        <Input
                                          value={editNav.icon}
                                          onChange={(e) => setEditNav({ ...editNav, icon: e.target.value })}
                                        />
                                      </Form.Item>
                                      <Form.Item label="分类">
                                        <select
                                          value={editNav.categoryId}
                                          onChange={(e) => {
                                            const selectedCat = categories.find(cat => cat.id === e.target.value)
                                            setEditNav({ 
                                              ...editNav, 
                                              categoryId: e.target.value,
                                              category: selectedCat ? selectedCat.name : ''
                                            })
                                          }}
                                          className="form-select"
                                        >
                                          <option value="">选择分类</option>
                                          {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                          ))}
                                        </select>
                                      </Form.Item>
                                      <Form.Item label="标签">
                                        <Input
                                          value={editNav.tags}
                                          onChange={(e) => setEditNav({ ...editNav, tags: e.target.value })}
                                          placeholder="多个标签用英文逗号分隔"
                                        />
                                      </Form.Item>
                                      <Form.Item label="排序序号">
                                        <Input
                                          type="number"
                                          value={editNav.sortOrder.toString()}
                                          onChange={(e) => setEditNav({ ...editNav, sortOrder: parseInt(e.target.value) || 0 })}
                                          placeholder="数字越大越靠前"
                                        />
                                      </Form.Item>
                                    </div>
                                    <Form.Item>
                                      <Button type="primary" onClick={() => handleEditNav(nav.id)}>
                                        保存
                                      </Button>
                                      <Button onClick={() => setEditingId(null)}>
                                        取消
                                      </Button>
                                    </Form.Item>
                                  </Form>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}

          {/* 分类管理 */}
          {activeMenu === 'categories' && (
            <>
              <Card className="admin-card">
                <h3>新增分类</h3>
                <Form>
                  <Form.Item label="分类ID" required>
                    <Input
                      value={newCategory.category_id}
                      onChange={(e) => setNewCategory({ ...newCategory, category_id: e.target.value })}
                      placeholder="英文数字，如: tools, resources"
                    />
                  </Form.Item>
                  <Form.Item label="分类名称" required>
                    <Input
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                      placeholder="请输入分类名称"
                    />
                  </Form.Item>
                  <Form.Item label="分类类型">
                    <select
                      value={newCategory.type}
                      onChange={(e) => setNewCategory({ ...newCategory, type: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d9d9d9' }}
                    >
                      <option value="link">链接</option>
                      <option value="article">文章</option>
                    </select>
                  </Form.Item>
                  <Form.Item label="分类图标">
                    <div className="icon-input-wrapper">
                      <Input
                        value={newCategory.icon}
                        onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                        placeholder="Emoji、图片 URL 或 iconfont 图标名"
                      />
                      {newCategory.icon && (
                        <div className="icon-preview">
                          {newCategory.icon.startsWith('http://') || newCategory.icon.startsWith('https://') ? (
                            <img src={newCategory.icon} alt="预览" />
                          ) : newCategory.icon.startsWith('icon-') ? (
                            <svg className="icon-svg" aria-hidden="true">
                              <use xlinkHref={`#${newCategory.icon}`}></use>
                            </svg>
                          ) : (
                            <span>{newCategory.icon}</span>
                          )}
                        </div>
                      )}
                    </div>
                    {iconfontIcons.length > 0 && (
                      <div className="iconfont-selector">
                        <div className="iconfont-selector-header">选择图标：</div>
                        <div className="iconfont-grid">
                          {iconfontIcons.map((icon) => (
                            <div
                              key={icon}
                              className={`iconfont-item ${newCategory.icon === `icon-${icon}` ? 'active' : ''}`}
                              onClick={() => setNewCategory({ ...newCategory, icon: `icon-${icon}` })}
                            >
                              <svg className="icon-svg" aria-hidden="true">
                                <use xlinkHref={`#icon-${icon}`}></use>
                              </svg>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Form.Item>
                  <Form.Item label="排序">
                    <Input
                      type="number"
                      value={newCategory.sortOrder.toString()}
                      onChange={(e) => setNewCategory({ ...newCategory, sortOrder: parseInt(e.target.value) || 0 })}
                      placeholder="数字越大越靠前"
                    />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" onClick={handleAddCategory}>
                      添加分类
                    </Button>
                  </Form.Item>
                </Form>
              </Card>

              <Card className="admin-card">
                <h3>分类列表</h3>
                <div className="category-list">
                  {categories.map((category) => (
                    <div key={category.id} className="category-item">
                      <div className="category-info">
                        <span className="category-icon">
                          {category.icon && (category.icon.startsWith('http://') || category.icon.startsWith('https://')) ? (
                            <img src={category.icon} alt={category.name} style={{ width: 24, height: 24, objectFit: 'contain' }} />
                          ) : (
                            category.icon || '📁'
                          )}
                        </span>
                        <span className="category-name">
                          {category.name}
                          {category.category_id && <span className="category-id-tag">{category.category_id}</span>}
                        </span>
                        <span className="category-count">
                          {navs.filter(n => n.category === category.name).length} 个链接
                        </span>
                      </div>
                      <div className="category-actions">
                        <Button
                          size="small"
                          onClick={() => setEditingCategory(category)}
                        >
                          编辑
                        </Button>
                        <Button
                          size="small"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          删除
                        </Button>
                      </div>

                      {editingCategory?.id === category.id && (
                        <div className="edit-form">
                          <Form>
                            <Form.Item label="分类ID">
                              <Input
                                value={editingCategory.category_id || ''}
                                onChange={(e) => setEditingCategory({ ...editingCategory, category_id: e.target.value })}
                              />
                            </Form.Item>
                            <Form.Item label="分类名称">
                              <Input
                                value={editingCategory.name}
                                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                              />
                            </Form.Item>
                            <Form.Item label="分类图标">
                              <div className="icon-input-wrapper">
                                <Input
                                  value={editingCategory.icon}
                                  onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                                  placeholder="Emoji、图片 URL 或 iconfont 图标名"
                                />
                                {editingCategory.icon && (
                                  <div className="icon-preview">
                                    {editingCategory.icon.startsWith('http://') || editingCategory.icon.startsWith('https://') ? (
                                      <img src={editingCategory.icon} alt="预览" />
                                    ) : editingCategory.icon.startsWith('icon-') ? (
                                      <svg className="icon-svg" aria-hidden="true">
                                        <use xlinkHref={`#${editingCategory.icon}`}></use>
                                      </svg>
                                    ) : (
                                      <span>{editingCategory.icon}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              {iconfontIcons.length > 0 && (
                                <div className="iconfont-selector">
                                  <div className="iconfont-selector-header">选择图标：</div>
                                  <div className="iconfont-grid">
                                    {iconfontIcons.map((icon) => (
                                      <div
                                        key={icon}
                                        className={`iconfont-item ${editingCategory.icon === `icon-${icon}` ? 'active' : ''}`}
                                        onClick={() => setEditingCategory({ ...editingCategory, icon: `icon-${icon}` })}
                                      >
                                        <svg className="icon-svg" aria-hidden="true">
                                          <use xlinkHref={`#icon-${icon}`}></use>
                                        </svg>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </Form.Item>
                            <Form.Item label="排序">
                              <Input
                                type="number"
                                value={editingCategory.sortOrder || editingCategory.sort_order || 0}
                                onChange={(e) => setEditingCategory({ ...editingCategory, sortOrder: parseInt(e.target.value) || 0 })}
                              />
                            </Form.Item>
                            <Form.Item>
                              <Button type="primary" onClick={() => handleUpdateCategory(category.id)}>
                                保存
                              </Button>
                              <Button onClick={() => setEditingCategory(null)}>
                                取消
                              </Button>
                            </Form.Item>
                          </Form>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          {/* 广告管理 */}
          {activeMenu === 'ads' && (
            <>
              <div className="ads-grid">
                <Card className="admin-card">
                  <h3>新增链接广告</h3>
                  <Form>
                    <Form.Item label="广告名称" required>
                      <Input
                        value={newLinkAd.name}
                        onChange={(e) => setNewLinkAd({ ...newLinkAd, name: e.target.value })}
                        placeholder="请输入广告名称"
                      />
                    </Form.Item>
                    <Form.Item label="广告链接" required>
                      <Input
                        value={newLinkAd.url}
                        onChange={(e) => setNewLinkAd({ ...newLinkAd, url: e.target.value })}
                        placeholder="https://example.com"
                      />
                    </Form.Item>
                    <Form.Item label="广告图标">
                      <Input
                        value={newLinkAd.icon}
                        onChange={(e) => setNewLinkAd({ ...newLinkAd, icon: e.target.value })}
                        placeholder="请输入图标地址"
                      />
                    </Form.Item>
                    <Form.Item label="位置排序">
                      <Input
                        type="number"
                        value={newLinkAd.sortOrder}
                        onChange={(e) => setNewLinkAd({ ...newLinkAd, sortOrder: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                      />
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary" onClick={handleAddLinkAd}>
                        添加链接广告
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>

                <Card className="admin-card">
                  <h3>新增图片广告</h3>
                  <Form>
                    <Form.Item label="广告名称" required>
                      <Input
                        value={newImageAd.name}
                        onChange={(e) => setNewImageAd({ ...newImageAd, name: e.target.value })}
                        placeholder="请输入广告名称"
                      />
                    </Form.Item>
                    <Form.Item label="广告图片" required>
                      <Input
                        value={newImageAd.imageUrl || ''}
                        onChange={(e) => setNewImageAd({ ...newImageAd, imageUrl: e.target.value })}
                        placeholder="请输入图片地址"
                      />
                    </Form.Item>
                    <Form.Item label="广告链接">
                      <Input
                        value={newImageAd.linkUrl || ''}
                        onChange={(e) => setNewImageAd({ ...newImageAd, linkUrl: e.target.value })}
                        placeholder="请输入点击跳转链接"
                      />
                    </Form.Item>
                    <Form.Item label="位置排序">
                      <Input
                        type="number"
                        value={newImageAd.sortOrder}
                        onChange={(e) => setNewImageAd({ ...newImageAd, sortOrder: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                      />
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary" onClick={handleAddImageAd}>
                        添加图片广告
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>
              </div>

              <div className="ads-grid">
                <Card className="admin-card">
                  <h3>链接广告列表</h3>
                  <div className="ad-list">
                    {ads.filter(ad => ad.ad_type === 'link').map((ad) => (
                      <div key={ad.id} className="ad-item">
                        <div className="ad-info">
                          <div className="ad-name">{ad.name}</div>
                          <div className="ad-url">{ad.content.match(/href="([^"]+)"/)?.[1] || '-'}</div>
                          <div className="ad-sort">排序: {ad.sortOrder || ad.sort_order || 0}</div>
                        </div>
                        <div className="ad-actions">
                          <Button
                            size="small"
                            onClick={() => setEditingAd(ad)}
                          >
                            编辑
                          </Button>
                          <Button
                            size="small"
                            onClick={() => handleDeleteAd(ad.id)}
                          >
                            删除
                          </Button>
                        </div>

                        {editingAd?.id === ad.id && (
                          <div className="edit-form">
                            <Form>
                              <Form.Item label="广告名称">
                                <Input
                                  value={editingAd.name}
                                  onChange={(e) => setEditingAd({ ...editingAd, name: e.target.value })}
                                />
                              </Form.Item>
                              <Form.Item label="广告链接">
                                <Input
                                  value={editingAd.content.match(/window\.open\('([^']+)',/)?.[1] || ''}
                                  onChange={(e) => {
                                    const url = e.target.value
                                    const icon = editingAd.content.match(/src="([^"]+)"/)?.[1] || ''
                                    setEditingAd({ ...editingAd, content: `<div class="ads-nav-item" onclick="window.open('${url}', '_blank')"><div class="ads-nav-icon"><img src="${icon}" alt="${editingAd.name}"></div><div class="ads-nav-name">${editingAd.name}</div></div>` })
                                  }}
                                />
                              </Form.Item>
                              <Form.Item label="广告图标">
                                <Input
                                  value={editingAd.content.match(/src="([^"]+)"/)?.[1] || ''}
                                  onChange={(e) => {
                                    const icon = e.target.value
                                    const url = editingAd.content.match(/window\.open\('([^']+)',/)?.[1] || ''
                                    setEditingAd({ ...editingAd, content: `<div class="ads-nav-item" onclick="window.open('${url}', '_blank')"><div class="ads-nav-icon"><img src="${icon}" alt="${editingAd.name}"></div><div class="ads-nav-name">${editingAd.name}</div></div>` })
                                  }}
                                />
                              </Form.Item>
                              <Form.Item label="位置排序">
                                <Input
                                  type="number"
                                  value={editingAd.sortOrder || editingAd.sort_order || 0}
                                  onChange={(e) => setEditingAd({ ...editingAd, sortOrder: parseInt(e.target.value) || 0 })}
                                />
                              </Form.Item>
                              <Form.Item>
                                <Button type="primary" onClick={() => handleUpdateAd(ad.id)}>
                                  保存
                                </Button>
                                <Button onClick={() => setEditingAd(null)}>
                                  取消
                                </Button>
                              </Form.Item>
                            </Form>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="admin-card">
                  <h3>图片广告列表</h3>
                  <div className="ad-list">
                    {ads.filter(ad => ad.ad_type === 'image').map((ad) => (
                      <div key={ad.id} className="ad-item">
                        <div className="ad-info">
                          <div className="ad-name">{ad.name}</div>
                          <div className="ad-sort">排序: {ad.sortOrder || ad.sort_order || 0}</div>
                        </div>
                        <div className="ad-actions">
                          <Button
                            size="small"
                            onClick={() => setEditingAd(ad)}
                          >
                            编辑
                          </Button>
                          <Button
                            size="small"
                            onClick={() => handleDeleteAd(ad.id)}
                          >
                            删除
                          </Button>
                        </div>

                        {editingAd?.id === ad.id && (
                          <div className="edit-form">
                            <Form>
                              <Form.Item label="广告名称">
                                <Input
                                  value={editingAd.name}
                                  onChange={(e) => setEditingAd({ ...editingAd, name: e.target.value })}
                                />
                              </Form.Item>
                              <Form.Item label="广告图片">
                                <Input
                                  value={editingAd.content.match(/<img[^>]+src=["']([^"']+)["']/)?.[1] || ''}
                                  onChange={(e) => {
                                    const imageUrl = e.target.value
                                    const linkUrl = editingAd.content.match(/<a[^>]+href=["']([^"']+)["']/)?.[1] || ''
                                    const content = linkUrl
                                      ? `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer"><img src="${imageUrl}" alt="${editingAd.name}"></a>`
                                      : `<img src="${imageUrl}" alt="${editingAd.name}">`
                                    setEditingAd({ ...editingAd, content })
                                  }}
                                />
                              </Form.Item>
                              <Form.Item label="广告链接">
                                <Input
                                  value={editingAd.content.match(/<a[^>]+href=["']([^"']+)["']/)?.[1] || ''}
                                  onChange={(e) => {
                                    const linkUrl = e.target.value
                                    const imageUrl = editingAd.content.match(/<img[^>]+src=["']([^"']+)["']/)?.[1] || ''
                                    const content = linkUrl
                                      ? `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer"><img src="${imageUrl}" alt="${editingAd.name}"></a>`
                                      : `<img src="${imageUrl}" alt="${editingAd.name}">`
                                    setEditingAd({ ...editingAd, content })
                                  }}
                                />
                              </Form.Item>
                              <Form.Item label="位置排序">
                                <Input
                                  type="number"
                                  value={editingAd.sortOrder || editingAd.sort_order || 0}
                                  onChange={(e) => setEditingAd({ ...editingAd, sortOrder: parseInt(e.target.value) || 0 })}
                                />
                              </Form.Item>
                              <Form.Item>
                                <Button type="primary" onClick={() => handleUpdateAd(ad.id)}>
                                  保存
                                </Button>
                                <Button onClick={() => setEditingAd(null)}>
                                  取消
                                </Button>
                              </Form.Item>
                            </Form>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </>
          )}

          {/* 文章管理 */}
          {activeMenu === 'articles' && (
            <>
              <Card className="admin-card">
                <h3>新增文章</h3>
                <div className="article-editor-layout">
                  {/* 左侧：基本信息 */}
                  <div className="article-editor-left">
                    <div className="article-form-group">
                      <label>文章标题 <span className="required">*</span></label>
                      <Input
                        value={newArticle.title}
                        onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
                        placeholder="请输入文章标题"
                      />
                    </div>
                    <div className="article-form-group">
                      <label>文章摘要</label>
                      <textarea
                        value={newArticle.summary}
                        onChange={(e) => setNewArticle({ ...newArticle, summary: e.target.value })}
                        placeholder="文章摘要，用于卡片显示"
                        className="form-textarea"
                        rows={2}
                      />
                    </div>
                    <div className="article-form-group">
                      <label>文章标签</label>
                      <Input
                        value={newArticle.tags}
                        onChange={(e) => setNewArticle({ ...newArticle, tags: e.target.value })}
                        placeholder="多个标签用英文逗号分隔"
                      />
                    </div>
                    <div className="article-form-group">
                      <label>文章封面</label>
                      <Input
                        value={newArticle.cover}
                        onChange={(e) => setNewArticle({ ...newArticle, cover: e.target.value })}
                        placeholder="封面图URL"
                      />
                    </div>
                    <div className="article-form-group">
                      <label>文章分类</label>
                      <select
                        value={newArticle.categoryId}
                        onChange={(e) => setNewArticle({ ...newArticle, categoryId: e.target.value })}
                        className="article-form-select"
                      >
                        <option value="">选择分类</option>
                        {categories.filter(c => c.type === 'article').map(cat => (
                          <option key={cat.id} value={cat.category_id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="article-form-group">
                      <label>排序序号</label>
                      <Input
                        type="number"
                        value={String(newArticle.sortOrder)}
                        onChange={(e) => setNewArticle({ ...newArticle, sortOrder: parseInt(e.target.value) || 0 })}
                        placeholder="数字越大越靠前"
                      />
                    </div>
                  </div>
                  
                  {/* 右侧：内容编辑（折叠框） */}
                  <div className="article-editor-right">
                    <Collapse
                      question="文章正文（支持 Markdown）"
                      defaultExpanded
                      answer={
                        <>
                          <div className="markdown-toolbar">
                            <button type="button" className="md-btn" title="加粗" onClick={() => insertMarkdown('**', '**', '粗体文字')}>B</button>
                            <button type="button" className="md-btn" title="斜体" onClick={() => insertMarkdown('*', '*', '斜体文字')}><i>I</i></button>
                            <button type="button" className="md-btn" title="删除线" onClick={() => insertMarkdown('~~', '~~', '删除线')}>S</button>
                            <span className="md-divider"></span>
                            <button type="button" className="md-btn" title="标题1" onClick={() => insertMarkdown('# ', '', '标题')}>H1</button>
                            <button type="button" className="md-btn" title="标题2" onClick={() => insertMarkdown('## ', '', '标题')}>H2</button>
                            <button type="button" className="md-btn" title="标题3" onClick={() => insertMarkdown('### ', '', '标题')}>H3</button>
                            <span className="md-divider"></span>
                            <button type="button" className="md-btn" title="无序列表" onClick={() => insertMarkdown('- ', '', '列表项')}>•</button>
                            <button type="button" className="md-btn" title="有序列表" onClick={() => insertMarkdown('1. ', '', '列表项')}>1.</button>
                            <button type="button" className="md-btn" title="引用" onClick={() => insertMarkdown('> ', '', '引用内容')}>❝</button>
                            <span className="md-divider"></span>
                            <button type="button" className="md-btn" title="链接" onClick={() => insertMarkdown('[', '](url)', '链接文字')}>🔗</button>
                            <button type="button" className="md-btn" title="图片" onClick={() => insertMarkdown('![', '](url)', '图片描述')}>🖼</button>
                            <button type="button" className="md-btn" title="代码块" onClick={() => insertMarkdown('```\n', '\n```', '代码内容')}>⟨⟩</button>
                          </div>
                          <textarea
                            ref={contentEditorRef}
                            value={newArticle.content}
                            onChange={(e) => setNewArticle({ ...newArticle, content: e.target.value })}
                            placeholder="文章正文内容，支持Markdown格式"
                            className="markdown-editor"
                            rows={15}
                          />
                        </>
                      }
                    />
                    <div className="article-editor-footer">
                      <Button type="primary" onClick={handleAddArticle}>
                        发布文章
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="admin-card">
                <div className="admin-card-header">
                  <h3>文章列表</h3>
                  <select
                    value={articleCategoryFilter}
                    onChange={(e) => setArticleCategoryFilter(e.target.value)}
                    className="form-select filter-select"
                  >
                    <option value="">全部分类</option>
                    {categories.filter(c => c.type === 'article').map(cat => (
                      <option key={cat.id} value={cat.category_id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="article-table">
                  <table>
                    <thead>
                      <tr>
                        <th>文章</th>
                        <th>分类</th>
                        <th>标签</th>
                        <th>排序</th>
                        <th>状态</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredArticles.map((article) => (
                        <tr key={article.id}>
                          <td>
                            <div className="article-list-item">
                              {article.cover && (
                                <img className="article-list-cover" src={article.cover} alt="" />
                              )}
                              <div className="article-list-info">
                                <div className="article-list-title">{article.title}</div>
                                {article.summary && (
                                  <div className="article-list-summary">{article.summary}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>{categories.find(c => c.category_id === article.categoryId)?.name || '-'}</td>
                          <td>{article.tags ? article.tags.split(',').slice(0, 2).join(', ') : '-'}</td>
                          <td>{article.sortOrder}</td>
                          <td>
                            <span className={`article-status ${article.isPublished ? 'published' : 'draft'}`}>
                              {article.isPublished ? '已发布' : '草稿'}
                            </span>
                          </td>
                          <td>
                            <div className="article-table-actions">
                              <Button size="small" onClick={() => setEditingArticle(article)}>编辑</Button>
                              <Button size="small" className="btn-delete-light" onClick={() => handleDeleteArticle(article.id)}>删除</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {editingArticle && (
                <Card className="admin-card">
                  <h3>编辑文章</h3>
                  <div className="article-editor-layout">
                    {/* 左侧：基本信息 */}
                    <div className="article-editor-left">
                      <div className="article-form-group">
                        <label>文章标题 <span className="required">*</span></label>
                        <Input
                          value={editingArticle.title}
                          onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                          placeholder="请输入文章标题"
                        />
                      </div>
                      <div className="article-form-group">
                        <label>文章摘要</label>
                        <textarea
                          value={editingArticle.summary || ''}
                          onChange={(e) => setEditingArticle({ ...editingArticle, summary: e.target.value })}
                          placeholder="文章摘要，用于卡片显示"
                          className="form-textarea"
                          rows={2}
                        />
                      </div>
                      <div className="article-form-group">
                        <label>文章标签</label>
                        <Input
                          value={editingArticle.tags || ''}
                          onChange={(e) => setEditingArticle({ ...editingArticle, tags: e.target.value })}
                          placeholder="多个标签用英文逗号分隔"
                        />
                      </div>
                      <div className="article-form-group">
                        <label>文章封面</label>
                        <Input
                          value={editingArticle.cover || ''}
                          onChange={(e) => setEditingArticle({ ...editingArticle, cover: e.target.value })}
                          placeholder="封面图URL"
                        />
                      </div>
                      <div className="article-form-group">
                        <label>文章分类</label>
                        <select
                          value={editingArticle.categoryId || ''}
                          onChange={(e) => setEditingArticle({ ...editingArticle, categoryId: e.target.value })}
                          className="article-form-select"
                        >
                          <option value="">选择分类</option>
                          {categories.filter(c => c.type === 'article').map(cat => (
                            <option key={cat.id} value={cat.category_id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="article-form-group">
                        <label>排序序号</label>
                        <Input
                          type="number"
                          value={String(editingArticle.sortOrder || 0)}
                          onChange={(e) => setEditingArticle({ ...editingArticle, sortOrder: parseInt(e.target.value) || 0 })}
                          placeholder="数字越大越靠前"
                        />
                      </div>
                    </div>
                    
                    {/* 右侧：内容编辑（折叠框） */}
                    <div className="article-editor-right">
                      <Collapse
                        question="文章正文（支持 Markdown）"
                        defaultExpanded
                        answer={
                          <>
                            <div className="markdown-toolbar">
                              <button type="button" className="md-btn" title="加粗" onClick={() => insertMarkdown('**', '**', '粗体文字')}>B</button>
                              <button type="button" className="md-btn" title="斜体" onClick={() => insertMarkdown('*', '*', '斜体文字')}><i>I</i></button>
                              <button type="button" className="md-btn" title="删除线" onClick={() => insertMarkdown('~~', '~~', '删除线')}>S</button>
                              <span className="md-divider"></span>
                              <button type="button" className="md-btn" title="标题1" onClick={() => insertMarkdown('# ', '', '标题')}>H1</button>
                              <button type="button" className="md-btn" title="标题2" onClick={() => insertMarkdown('## ', '', '标题')}>H2</button>
                              <button type="button" className="md-btn" title="标题3" onClick={() => insertMarkdown('### ', '', '标题')}>H3</button>
                              <span className="md-divider"></span>
                              <button type="button" className="md-btn" title="无序列表" onClick={() => insertMarkdown('- ', '', '列表项')}>•</button>
                              <button type="button" className="md-btn" title="有序列表" onClick={() => insertMarkdown('1. ', '', '列表项')}>1.</button>
                              <button type="button" className="md-btn" title="引用" onClick={() => insertMarkdown('> ', '', '引用内容')}>❝</button>
                              <span className="md-divider"></span>
                              <button type="button" className="md-btn" title="链接" onClick={() => insertMarkdown('[', '](url)', '链接文字')}>🔗</button>
                              <button type="button" className="md-btn" title="图片" onClick={() => insertMarkdown('![', '](url)', '图片描述')}>🖼</button>
                              <button type="button" className="md-btn" title="代码块" onClick={() => insertMarkdown('```\n', '\n```', '代码内容')}>⟨⟩</button>
                            </div>
                            <textarea
                              ref={contentEditorRef}
                              value={editingArticle.content || ''}
                              onChange={(e) => setEditingArticle({ ...editingArticle, content: e.target.value })}
                              placeholder="文章正文内容，支持Markdown格式"
                              className="markdown-editor"
                              rows={15}
                            />
                          </>
                        }
                      />
                      <div className="article-editor-footer">
                        <Button type="primary" onClick={() => handleUpdateArticle(editingArticle.id)}>
                          保存修改
                        </Button>
                        <Button onClick={() => setEditingArticle(null)} style={{ marginLeft: '0.5rem' }}>
                          取消
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}

          {/* 网站设置 */}
          {activeMenu === 'settings' && (
            <Card className="admin-card">
              <h3>网站设置</h3>
              <Form>
                <Form.Item label="网站标题">
                  <Input
                    value={localSettings.siteTitle}
                    onChange={(e) => setLocalSettings({ ...localSettings, siteTitle: e.target.value })}
                  />
                </Form.Item>
                <Form.Item label="网站副标题">
                  <Input
                    value={localSettings.siteSubtitle}
                    onChange={(e) => setLocalSettings({ ...localSettings, siteSubtitle: e.target.value })}
                  />
                </Form.Item>
                <Form.Item label="网站 Logo">
                  <Input
                    value={localSettings.siteLogo}
                    onChange={(e) => setLocalSettings({ ...localSettings, siteLogo: e.target.value })}
                    placeholder="Logo URL"
                  />
                </Form.Item>
                <Form.Item label="网站描述">
                  <Input
                    value={localSettings.siteDescription}
                    onChange={(e) => setLocalSettings({ ...localSettings, siteDescription: e.target.value })}
                    placeholder="SEO 描述"
                  />
                </Form.Item>
                <Form.Item label="页脚文字">
                  <Input
                    value={localSettings.footerText}
                    onChange={(e) => setLocalSettings({ ...localSettings, footerText: e.target.value })}
                  />
                </Form.Item>
                <Form.Item label="Keywords">
                  <Input
                    value={localSettings.siteKeywords}
                    onChange={(e) => setLocalSettings({ ...localSettings, siteKeywords: e.target.value })}
                    placeholder="SEO 关键词"
                  />
                </Form.Item>
                <Form.Item label="Iconfont Symbol">
                  <Input
                    value={localSettings.iconfontSymbol}
                    onChange={(e) => setLocalSettings({ ...localSettings, iconfontSymbol: e.target.value })}
                    placeholder="//at.alicdn.com/t/c/font_xxxxx.js"
                  />
                </Form.Item>
                <Form.Item label="广告导航模块">
                  <Switch
                    checked={localSettings.showAdsNav}
                    onChange={(checked) => setLocalSettings({ ...localSettings, showAdsNav: checked })}
                    checkedChildren="开"
                    unCheckedChildren="关"
                  />
                </Form.Item>
                <Form.Item label="公告内容">
                  <textarea
                    value={localSettings.announcement}
                    onChange={(e) => setLocalSettings({ ...localSettings, announcement: e.target.value })}
                    placeholder="请输入公告内容"
                    className="form-textarea"
                    rows={4}
                  />
                </Form.Item>
                <Form.Item label="友情链接">
                  <textarea
                    value={localSettings.friendLinks}
                    onChange={(e) => setLocalSettings({ ...localSettings, friendLinks: e.target.value })}
                    placeholder={'每行一个，英文逗号隔开名称和链接：\n我的导航,https://example.com'}
                    className="form-textarea"
                    rows={5}
                  />
                </Form.Item>
                <Form.Item label="Banner 背景图">
                  <Input
                    value={localSettings.bannerBgImage}
                    onChange={(e) => setLocalSettings({ ...localSettings, bannerBgImage: e.target.value })}
                    placeholder="https://example.com/banner.jpg"
                  />
                  <div className="form-hint">建议使用宽幅横图，比例约 8:1（如 1920×240），图片会铺满顶部 banner</div>
                </Form.Item>
                <Form.Item>
                  <Button type="primary" onClick={handleSaveSettings}>
                    保存设置
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          )}
        </div>
      </main>

      {/* 通知组件 */}
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          <span className="notification-icon">
            {notification.type === 'success' ? '✓' : notification.type === 'error' ? '✗' : notification.type === 'warning' ? '⚠' : 'ℹ'}
          </span>
          <div className="notification-content">
            <span className="notification-message">{notification.message}</span>
            {notification.description && (
              <span className="notification-description">{notification.description}</span>
            )}
          </div>
        </div>
      )}

      {/* 确认弹窗 */}
      {modal && (
        <div className="modal-overlay">
          <Card className="modal-card">
            <h3 className="modal-title">{modal.title}</h3>
            <p className="modal-content">{modal.content}</p>
            <div className="modal-actions">
              <Button onClick={() => setModal(null)}>取消</Button>
              <Button type="primary" onClick={() => {
                modal.onConfirm()
                setModal(null)
              }}>
                确认
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default Admin