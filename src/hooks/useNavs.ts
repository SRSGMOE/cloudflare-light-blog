import { useState, useEffect } from 'react'

interface NavItem {
  id: number
  numId?: number
  title: string
  url: string
  desc?: string
  icon?: string
  category?: string
  categoryId?: string
  tags?: string
  sortOrder?: number
}

export function useNavs() {
  const [navs, setNavs] = useState<NavItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadNavs = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/navs')
      const data = await res.json()

      if (data.success) {
        const sortedNavs = [...(data.navs || [])].sort(
          (a, b) => (b.sortOrder || 0) - (a.sortOrder || 0)
        )
        setNavs(sortedNavs)
        setError(null)
      } else {
        setError('加载导航失败')
      }
    } catch (err) {
      setError('加载导航失败')
      console.error('加载导航失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const addNav = async (nav: Omit<NavItem, 'id'>) => {
    try {
      const res = await fetch('/api/navs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
        },
        body: JSON.stringify(nav)
      })
      const data = await res.json()

      if (data.success) {
        await loadNavs()
        return { success: true }
      } else {
        return { success: false, error: data.error || data.message || '添加失败' }
      }
    } catch (err) {
      console.error('添加导航失败:', err)
      return { success: false, error: '添加失败' }
    }
  }

  const updateNav = async (id: number, nav: Partial<NavItem>) => {
    try {
      const res = await fetch(`/api/navs?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
        },
        body: JSON.stringify(nav)
      })
      const data = await res.json()

      if (data.success) {
        await loadNavs()
        return { success: true }
      } else {
        return { success: false, error: data.error || data.message || '更新失败' }
      }
    } catch (err) {
      console.error('更新导航失败:', err)
      return { success: false, error: '更新失败' }
    }
  }

  const deleteNav = async (id: number) => {
    try {
      const res = await fetch(`/api/navs?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
        }
      })
      const data = await res.json()

      if (data.success) {
        await loadNavs()
        return { success: true }
      } else {
        return { success: false, error: data.error || data.message || '删除失败' }
      }
    } catch (err) {
      console.error('删除导航失败:', err)
      return { success: false, error: '删除失败' }
    }
  }

  useEffect(() => {
    loadNavs()
  }, [])

  return {
    navs,
    loading,
    error,
    loadNavs,
    addNav,
    updateNav,
    deleteNav
  }
}