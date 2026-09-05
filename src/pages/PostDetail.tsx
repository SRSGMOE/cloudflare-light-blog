import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from 'animal-island-ui'
import { useSettings } from '../hooks/useSettings'

function PostDetail() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  const { settings } = useSettings()
  const [article, setArticle] = useState<any>(null)
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
        // 获取文章详情
        // 路由参数可能是数字ID(num_id)或字符串ID(id)，需用对应参数查询
        const isNumeric = /^\d+$/.test(postId || '')
        const idKey = isNumeric ? 'num_id' : 'id'
        const articleRes = await fetch(`/api/articles?${idKey}=${postId}`)
        const articleData = await articleRes.json()
        if (articleData.success && articleData.articles && articleData.articles.length > 0) {
          setArticle(articleData.articles[0])
          
          // 使用文章中的categoryId获取分类信息
          const articleCategoryId = articleData.articles[0].categoryId
          if (articleCategoryId) {
            const catRes = await fetch(`/api/categories?id=${articleCategoryId}`)
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

    if (postId) {
      fetchData()
    }
  }, [postId])

  const handleVisit = () => {
    if (article?.url) {
      window.open(article.url, '_blank', 'noopener,noreferrer')
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">加载中...</div>
      </div>
    )
  }

  if (!article) {
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
            <p>文章不存在</p>
            <Button type="primary" onClick={() => navigate('/')}>
              返回首页
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const tags = article.tags ? article.tags.split(',').filter((t: string) => t.trim()) : []

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
        <div className="post-detail-card">
          {article.cover && (
            <div className="post-detail-cover">
              <img src={article.cover} alt={article.title} />
            </div>
          )}
          <h1 className="post-detail-title">{article.title}</h1>
          {tags.length > 0 && (
            <div className="post-detail-tags">
              {tags.map((tag: string, index: number) => (
                <span key={index} className="post-detail-tag">{tag.trim()}</span>
              ))}
            </div>
          )}
          {article.summary && (
            <p className="post-detail-summary">{article.summary}</p>
          )}
          {article.content && (
            <div className="post-detail-content" dangerouslySetInnerHTML={{ __html: article.content }} />
          )}
          {article.url && (
            <Button type="primary" size="large" onClick={handleVisit} block>
              查看原文
            </Button>
          )}
        </div>
      </div>

      <footer className="footer">
        <p>{settings.footerText || 'Powered by Cloudflare Pages'}</p>
      </footer>
    </div>
  )
}

export default PostDetail
