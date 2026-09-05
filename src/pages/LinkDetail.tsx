import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from 'animal-island-ui'
import { useSettings } from '../hooks/useSettings'

function LinkDetail() {
  const { linkId } = useParams<{ linkId: string }>()
  const navigate = useNavigate()
  const { settings } = useSettings()
  const [nav, setNav] = useState<any>(null)
  const [category, setCategory] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (settings.siteTheme) {
      document.body.classList.remove('theme-dark', 'theme-pink', 'theme-blue')
      if (settings.siteTheme !== 'light') {
        document.body.classList.add(`theme-${settings.siteTheme}`)
      }
    }
  }, [settings.siteTheme])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 获取链接详情
        // 路由参数可能是数字ID(num_id)或字符串ID(id)，需用对应参数查询
        const isNumeric = /^\d+$/.test(linkId || '')
        const idKey = isNumeric ? 'num_id' : 'id'
        const navRes = await fetch(`/api/navs?${idKey}=${linkId}`)
        const navData = await navRes.json()
        
        if (navData.success && navData.navs && navData.navs.length > 0) {
          setNav(navData.navs[0])
          
          // 使用链接中的categoryId获取分类信息
          const navCategoryId = navData.navs[0].categoryId
          if (navCategoryId) {
            const catRes = await fetch(`/api/categories?id=${navCategoryId}`)
            const catData = await catRes.json()
            if (catData.success && catData.categories && catData.categories.length > 0) {
              setCategory(catData.categories[0])
            }
          }
        }
      } catch (err) {
        console.error('获取数据失败:', err)
      } finally {
        setLoading(false)
      }
    }

    if (linkId) {
      fetchData()
    }
  }, [linkId])

  const handleVisit = () => {
    if (nav?.url) {
      window.open(nav.url, '_blank', 'noopener,noreferrer')
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">加载中...</div>
      </div>
    )
  }

  if (!nav) {
    return (
      <div className="detail-page">
        <div className="detail-header">
          <button className="back-button" onClick={() => navigate('/')}>
            ← 返回首页
          </button>
        </div>
        <div className="detail-content">
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>链接不存在</p>
            <Button type="primary" onClick={() => navigate('/')}>
              返回首页
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const tags = nav.tags ? nav.tags.split(',').filter((t: string) => t.trim()) : []

  return (
    <div className="detail-page">
      <div className="detail-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← 返回首页
        </button>
        {category && (
          <span className="detail-category">
            {category.icon && (category.icon.startsWith('http://') || category.icon.startsWith('https://')) ? (
              <img src={category.icon} alt={category.name} className="detail-category-icon" />
            ) : (
              <span className="detail-category-icon">{category.icon || '📁'}</span>
            )}
            {category.name}
          </span>
        )}
      </div>

      <div className="detail-content">
        <div className="link-detail-card">
          <div className="link-detail-icon">
            {nav.icon && (nav.icon.startsWith('http://') || nav.icon.startsWith('https://')) ? (
              <img src={nav.icon} alt={nav.title} />
            ) : nav.icon && nav.icon.startsWith('icon-') ? (
              <svg className="icon-svg" aria-hidden="true">
                <use xlinkHref={`#${nav.icon}`}></use>
              </svg>
            ) : (
              <span>{nav.icon || '🔗'}</span>
            )}
          </div>
          <h1 className="link-detail-title">{nav.title}</h1>
          {nav.desc && <p className="link-detail-desc">{nav.desc}</p>}
          {tags.length > 0 && (
            <div className="link-detail-tags">
              {tags.map((tag: string, index: number) => (
                <span key={index} className="link-detail-tag">{tag.trim()}</span>
              ))}
            </div>
          )}
          <Button type="primary" size="large" onClick={handleVisit} block>
            访问网站
          </Button>
        </div>
      </div>

      <footer className="footer">
        <p>{settings.footerText || 'Powered by Cloudflare Pages'}</p>
      </footer>
    </div>
  )
}

export default LinkDetail
