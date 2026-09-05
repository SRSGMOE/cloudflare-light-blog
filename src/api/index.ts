const API_BASE = '/api'

export async function fetchSettings() {
  const res = await fetch(`${API_BASE}/settings`)
  return res.json()
}

export async function updateSettings(settings: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  })
  return res.json()
}

export async function fetchNavs() {
  const res = await fetch(`${API_BASE}/navs`)
  return res.json()
}

export async function addNav(nav: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/navs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(nav)
  })
  return res.json()
}

export async function updateNav(id: number, nav: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/navs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(nav)
  })
  return res.json()
}

export async function deleteNav(id: number) {
  const res = await fetch(`${API_BASE}/navs/${id}`, {
    method: 'DELETE'
  })
  return res.json()
}

export async function checkAuthStatus() {
  const token = localStorage.getItem('adminToken') || ''
  const res = await fetch(`${API_BASE}/auth-status`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  return res.json()
}

export async function login(password: string) {
  const res = await fetch(`${API_BASE}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, type: 'admin' })
  })
  return res.json()
}