import { useState, useEffect } from 'react'

interface Settings {
  siteTitle?: string
  siteSubtitle?: string
  siteLogo?: string
  footerText?: string
  siteKeywords?: string
  siteDescription?: string
  headCustomJs?: string
  footerCustomJs?: string
  siteTheme?: string
  mobileColumns?: string
  passwordEnabled?: boolean
  sitePassword?: string
  iconfontSymbol?: string
  showAdsNav?: boolean
  announcement?: string
  friendLinks?: string
  bannerBgImage?: string
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/settings')
      const data = await res.json()

      if (data.success && data.settings) {
        setSettings(data.settings)
        setError(null)
      } else {
        setError('加载设置失败')
      }
    } catch (err) {
      setError('加载设置失败')
      console.error('加载设置失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (newSettings: Partial<Settings>) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
        },
        body: JSON.stringify(newSettings)
      })
      const data = await res.json()

      if (data.success) {
        setSettings(prev => ({ ...prev, ...newSettings }))
        return { success: true }
      } else {
        return { success: false, error: data.error || '更新失败' }
      }
    } catch (err) {
      console.error('更新设置失败:', err)
      return { success: false, error: '更新失败' }
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  return {
    settings,
    loading,
    error,
    loadSettings,
    updateSettings
  }
}