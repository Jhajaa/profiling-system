import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

const DEFAULT_THEME = {
  primaryColor: '#c95614',
  primaryDark: '#7f350f',
  primaryLight: '#f0a35d',
  backgroundColor: '#f7f2ec',
  cardBackground: '#ffffff',
  textColor: '#25211d',
  textMuted: '#6f6257',
  headingColor: '#c95614',
  sidebarBackground: '#ffffff',
  sidebarActive: '#1a1a1a',
  sidebarTextColor: '#5f554d',
  borderColor: '#d8cabe',
}

const getThemeStorageKey = (account) => {
  if (!account) return null
  const identifier = account.id || account.userNumber || account.email || account.name || 'user'
  return `appTheme:${account.role || 'user'}:${String(identifier).trim().replace(/\s+/g, '_')}`
}

// Apply saved theme before render
const applySavedTheme = () => {
  try {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null')
    const key = getThemeStorageKey(currentUser)
    const saved = key ? localStorage.getItem(key) : null
    if (saved) {
      const parsed = { ...DEFAULT_THEME, ...JSON.parse(saved) }
      const isOldDefault =
        parsed.primaryColor === '#E87722' &&
        parsed.primaryDark === '#c9631a' &&
        parsed.textMuted === '#888888'
      const theme = isOldDefault ? DEFAULT_THEME : parsed
      const root = document.documentElement
      const hexToRgb = (hex) => {
        const clean = String(hex || '').replace('#', '')
        if (!/^[0-9A-Fa-f]{6}$/.test(clean)) return '201, 86, 20'
        return `${parseInt(clean.slice(0, 2), 16)}, ${parseInt(clean.slice(2, 4), 16)}, ${parseInt(clean.slice(4, 6), 16)}`
      }
      root.style.setProperty('--orange', theme.primaryColor)
      root.style.setProperty('--orange-dark', theme.primaryDark)
      root.style.setProperty('--orange-light', theme.primaryLight)
      root.style.setProperty('--orange-rgb', hexToRgb(theme.primaryColor))
      root.style.setProperty('--orange-dark-rgb', hexToRgb(theme.primaryDark))
      root.style.setProperty('--bg', theme.backgroundColor)
      root.style.setProperty('--card-bg', theme.cardBackground)
      root.style.setProperty('--text', theme.textColor)
      root.style.setProperty('--text-muted', theme.textMuted)
      root.style.setProperty('--heading-color', theme.headingColor || theme.primaryColor)
      root.style.setProperty('--sidebar-bg', theme.sidebarBackground)
      root.style.setProperty('--sidebar-active', theme.sidebarActive)
      root.style.setProperty('--sidebar-text', theme.sidebarTextColor || theme.textMuted)
      root.style.setProperty('--border', theme.borderColor)
    } else {
      const root = document.documentElement
      root.style.setProperty('--orange', DEFAULT_THEME.primaryColor)
      root.style.setProperty('--orange-dark', DEFAULT_THEME.primaryDark)
      root.style.setProperty('--orange-light', DEFAULT_THEME.primaryLight)
      root.style.setProperty('--orange-rgb', '201, 86, 20')
      root.style.setProperty('--orange-dark-rgb', '127, 53, 15')
      root.style.setProperty('--bg', DEFAULT_THEME.backgroundColor)
      root.style.setProperty('--card-bg', DEFAULT_THEME.cardBackground)
      root.style.setProperty('--text', DEFAULT_THEME.textColor)
      root.style.setProperty('--text-muted', DEFAULT_THEME.textMuted)
      root.style.setProperty('--heading-color', DEFAULT_THEME.headingColor)
      root.style.setProperty('--sidebar-bg', DEFAULT_THEME.sidebarBackground)
      root.style.setProperty('--sidebar-active', DEFAULT_THEME.sidebarActive)
      root.style.setProperty('--sidebar-text', DEFAULT_THEME.sidebarTextColor)
      root.style.setProperty('--border', DEFAULT_THEME.borderColor)
    }
  } catch (e) {
    console.warn('Failed to load theme:', e)
  }
}
applySavedTheme()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
