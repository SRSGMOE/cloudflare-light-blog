import { useState, useEffect } from 'react'

interface Article {
  id: string
  numId?: number
  title: string
  url: string
  content?: string
  summary?: string
  cover?: string
  categoryId?: string
  tags?: string
  isPublished?: boolean
  sortOrder?: number
  createdAt?: string
  updatedAt?: string
}

export function useArticles() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadArticles = async (params?: { categoryId?: string; published?: boolean }) => {
    try {
      setLoading(true)
      let url = '/api/articles'
      const queryParams = new URLSearchParams()
      
      if (params?.categoryId) {
        queryParams.set('category_id', params.categoryId)
      }
      if (params?.published !== undefined) {
        queryParams.set('published', params.published ? '1' : '0')
      }
      
      if (queryParams.toString()) {
        url += '?' + queryParams.toString()
      }
      
      const res = await fetch(url)
      const data = await res.json()

      if (data.success && data.articles) {
        setArticles(data.articles)
        setError(null)
      } else {
        setError('加载文章失败')
      }
    } catch (err) {
      setError('加载文章失败')
      console.error('加载文章失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const addArticle = async (article: Partial<Article>) => {
    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
        },
        body: JSON.stringify(article)
      })
      const data = await res.json()

      if (data.success && data.article) {
        setArticles(prev => [data.article, ...prev])
        return { success: true, article: data.article }
      } else {
        return { success: false, error: data.message || '添加失败' }
      }
    } catch (err) {
      console.error('添加文章失败:', err)
      return { success: false, error: '添加失败' }
    }
  }

  const updateArticle = async (id: string, article: Partial<Article>) => {
    try {
      const res = await fetch(`/api/articles?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
        },
        body: JSON.stringify(article)
      })
      const data = await res.json()

      if (data.success && data.article) {
        setArticles(prev => prev.map(a => a.id === id ? data.article : a))
        return { success: true, article: data.article }
      } else {
        return { success: false, error: data.message || '更新失败' }
      }
    } catch (err) {
      console.error('更新文章失败:', err)
      return { success: false, error: '更新失败' }
    }
  }

  const deleteArticle = async (id: string) => {
    try {
      const res = await fetch(`/api/articles?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
        }
      })
      const data = await res.json()

      if (data.success) {
        setArticles(prev => prev.filter(a => a.id !== id))
        return { success: true }
      } else {
        return { success: false, error: data.message || '删除失败' }
      }
    } catch (err) {
      console.error('删除文章失败:', err)
      return { success: false, error: '删除失败' }
    }
  }

  useEffect(() => {
    loadArticles()
  }, [])

  return {
    articles,
    loading,
    error,
    loadArticles,
    addArticle,
    updateArticle,
    deleteArticle
  }
}
