import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useApp, applyTheme } from '../context/AppContext'
import Header from '../components/Header'
import { RotateCcw, Save, Check, Megaphone } from 'lucide-react'
import '../../../css/theme-settings.css'

/* ── PRESET DEFINITIONS ── */
const PRESETS = [
  {
    id: 'default',
    label: 'Default Orange',
    dark: false,
    sidebarBg:  '#1A0F05',
    bgColor:    '#F7F2EC',
    primary:    '#E87722',
    colors: {
      primary:      '#c95614',
      primaryDark:  '#7f350f',
      primaryLight: '#f0a35d',
      background:   '#f7f2ec',
      card:         '#ffffff',
      border:       '#d8cabe',
      text:         '#25211d',
      textMuted:    '#6f6257',
      heading:      '#c95614',
      sidebarBg:    '#ffffff',
      sidebarActive:'#1a1a1a',
      sidebarText:  '#5f554d',
    }
  },
  {
    id: 'blue',
    label: 'Blue Ocean',
    dark: false,
    sidebarBg:  '#0D47A1',
    bgColor:    '#E8F4FD',
    primary:    '#1565c0',
    colors: {
      primary:      '#1565c0',
      primaryDark:  '#0D47A1',
      primaryLight: '#90CAF9',
      background:   '#E8F4FD',
      card:         '#ffffff',
      border:       '#BBDEFB',
      text:         '#0D1117',
      textMuted:    '#4A6080',
      heading:      '#1565c0',
      sidebarBg:    '#0D47A1',
      sidebarActive:'#1565c0',
      sidebarText:  '#BBDEFB',
    }
  },
  {
    id: 'green',
    label: 'Forest Green',
    dark: false,
    sidebarBg:  '#1B5E20',
    bgColor:    '#F1F8F1',
    primary:    '#2e7d32',
    colors: {
      primary:      '#2e7d32',
      primaryDark:  '#1B5E20',
      primaryLight: '#A5D6A7',
      background:   '#F1F8F1',
      card:         '#ffffff',
      border:       '#C8E6C9',
      text:         '#1A2E1A',
      textMuted:    '#4A6A4A',
      heading:      '#2e7d32',
      sidebarBg:    '#1B5E20',
      sidebarActive:'#2e7d32',
      sidebarText:  '#C8E6C9',
    }
  },
  {
    id: 'purple',
    label: 'Royal Purple',
    dark: false,
    sidebarBg:  '#4A148C',
    bgColor:    '#F3EEF8',
    primary:    '#6a1b9a',
    colors: {
      primary:      '#6a1b9a',
      primaryDark:  '#4A148C',
      primaryLight: '#CE93D8',
      background:   '#F3EEF8',
      card:         '#ffffff',
      border:       '#E1BEE7',
      text:         '#1A0A2E',
      textMuted:    '#5A3A7A',
      heading:      '#6a1b9a',
      sidebarBg:    '#4A148C',
      sidebarActive:'#6a1b9a',
      sidebarText:  '#E1BEE7',
    }
  },
  {
    id: 'red',
    label: 'Cherry Red',
    dark: false,
    sidebarBg:  '#B71C1C',
    bgColor:    '#FDE8E8',
    primary:    '#c62828',
    colors: {
      primary:      '#c62828',
      primaryDark:  '#B71C1C',
      primaryLight: '#EF9A9A',
      background:   '#FDE8E8',
      card:         '#ffffff',
      border:       '#FFCDD2',
      text:         '#2E0A0A',
      textMuted:    '#7A3A3A',
      heading:      '#c62828',
      sidebarBg:    '#B71C1C',
      sidebarActive:'#c62828',
      sidebarText:  '#FFCDD2',
    }
  },
  {
    id: 'dark',
    label: 'Dark Mode',
    dark: true,
    sidebarBg:  '#0A0A0A',
    bgColor:    '#1A1A1A',
    primary:    '#E87722',
    colors: {
      primary:      '#E87722',
      primaryDark:  '#c9631a',
      primaryLight: '#f4a55a',
      background:   '#1A1A1A',
      card:         '#2A2A2A',
      border:       '#3A3A3A',
      text:         '#E8F4FD', 
      textMuted:    '#888888',
      heading:      '#E87722',
      sidebarBg:    '#0A0A0A',
      sidebarActive:'#E87722',
      sidebarText:  '#d7c7b8',
    }
  },
]

const DEFAULT = PRESETS[0]

const COLOR_GROUPS = [
  {
    title: 'Primary Colors',
    fields: [
      { key: 'primary',      label: 'Primary Color' },
      { key: 'primaryDark',  label: 'Primary Dark' },
      { key: 'primaryLight', label: 'Primary Light' },
    ]
  },
  {
    title: 'Background & Card',
    fields: [
      { key: 'background', label: 'Background' },
      { key: 'card',       label: 'Card Background' },
      { key: 'border',     label: 'Border Color' },
    ]
  },
  {
    title: 'Text Colors',
    fields: [
      { key: 'text',      label: 'Body Text' },
      { key: 'textMuted', label: 'Muted Text' },
      { key: 'heading',   label: 'Heading Color' },
    ]
  },
  {
    title: 'Sidebar',
    fields: [
      { key: 'sidebarBg',     label: 'Sidebar Background' },
      { key: 'sidebarActive', label: 'Sidebar Active' },
      { key: 'sidebarText',   label: 'Sidebar Text' },
    ]
  },
]

function isValidHex(v) {
  return /^#[0-9A-Fa-f]{6}$/.test(v)
}

function normalizeHexInput(value) {
  const clean = String(value || '').trim().replace(/[^#0-9A-Fa-f]/g, '')
  if (!clean) return ''
  return clean.startsWith('#') ? clean.slice(0, 7) : `#${clean}`.slice(0, 7)
}

function hexToRgb(hex) {
  if (!isValidHex(hex)) return null
  const value = hex.slice(1)
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  }
}

function readableTextOn(hex) {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#ffffff'
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance > 0.62 ? '#1f2933' : '#ffffff'
}

function colorsEqual(a, b) {
  return Object.keys(a).every(key => {
    if (['systemName', 'systemShortName'].includes(key)) return true
    return String(a[key] || '').toLowerCase() === String(b[key] || '').toLowerCase()
  })
}

export default function ThemeSettings() {
  const { theme, setTheme, showToast } = useApp()
  const [toast, setToast] = useState(false)
  const [pendingTheme, setPendingTheme] = useState(theme)
  const savedThemeRef = useRef(theme)
  const savedOnExitRef = useRef(false)

  const updatePending = (newTheme) => {
    setPendingTheme(newTheme)
    applyTheme(newTheme)
  }

  const mapToComponentColors = (t) => ({
    primary: t.primaryColor,
    primaryDark: t.primaryDark,
    primaryLight: t.primaryLight,
    background: t.backgroundColor,
    card: t.cardBackground,
    text: t.textColor,
    textMuted: t.textMuted,
    heading: t.headingColor,
    border: t.borderColor,
    sidebarBg: t.sidebarBackground,
    sidebarActive: t.sidebarActive,
    sidebarText:  t.sidebarTextColor,
    systemName:   t.systemName || 'College of Computing Studies',
    systemShortName: t.systemShortName || 'CCS',
  })

  const mapToContextTheme = (colors) => ({
    primaryColor: colors.primary,
    primaryDark: colors.primaryDark,
    primaryLight: colors.primaryLight,
    backgroundColor: colors.background,
    cardBackground: colors.card,
    textColor: colors.text,
    textMuted: colors.textMuted,
    headingColor: colors.heading,
    borderColor: colors.border,
    sidebarBackground: colors.sidebarBg,
    sidebarActive: colors.sidebarActive,
    sidebarTextColor:  colors.sidebarText,
    systemName:        colors.systemName,
    systemShortName:   colors.systemShortName,
  })

  const displayTheme = pendingTheme || theme
  const colors = mapToComponentColors(displayTheme)
  const [hexInputs, setHexInputs] = useState(() => mapToComponentColors(theme))
  
  const activePreset = useMemo(() => {
    const match = PRESETS.find(preset => colorsEqual(colors, preset.colors))
    return match?.id || null
  }, [colors])
  
  const hasInvalidHex = Object.values(hexInputs).some((value, idx) => {
    const key = Object.keys(hexInputs)[idx]
    if (['systemName', 'systemShortName'].includes(key)) return false
    return !isValidHex(value)
  })
  
  const activeNavText = readableTextOn(colors.sidebarActive)
  const primaryText = readableTextOn(colors.primary)

  useEffect(() => {
    savedThemeRef.current = theme
    setPendingTheme(theme)
    setHexInputs(mapToComponentColors(theme))
    savedOnExitRef.current = false
  }, [theme])

  useEffect(() => {
    return () => {
      if (!savedOnExitRef.current) applyTheme(savedThemeRef.current)
    }
  }, [])

  const applyPreset = useCallback((preset) => {
    const newColors = { ...preset.colors, systemName: hexInputs.systemName, systemShortName: hexInputs.systemShortName }
    const mappedTheme = mapToContextTheme(newColors)
    setHexInputs(newColors)
    updatePending(mappedTheme)
  }, [hexInputs.systemName, hexInputs.systemShortName])

  const handleHexChange = (key, value) => {
    const nextValue = normalizeHexInput(value)
    setHexInputs(prev => ({ ...prev, [key]: nextValue }))
    if (isValidHex(nextValue)) {
      const newColors = { ...colors, [key]: nextValue }
      updatePending(mapToContextTheme(newColors))
    }
  }

  const handleColorPicker = (key, value) => {
    const newColors = { ...colors, [key]: value }
    setHexInputs(newColors)
    updatePending(mapToContextTheme(newColors))
  }

  const resetDefaults = () => {
    const newColors = { ...DEFAULT.colors, systemName: 'College of Computing Studies', systemShortName: 'CCS' }
    const mappedTheme = mapToContextTheme(newColors)
    setHexInputs(newColors)
    updatePending(mappedTheme)
  }

  const saveChanges = () => {
    console.log('--- saveChanges clicked ---', pendingTheme?.primaryColor);
    if (hasInvalidHex) {
      showToast('Please fix invalid color values before saving.', 'error')
      return
    }
    if (pendingTheme) {
      savedOnExitRef.current = true
      setTheme(pendingTheme)
    }
    showToast('Theme saved successfully!', 'success')
    setToast(true)
    setTimeout(() => setToast(false), 2500)
  }

  return (
    <div>
      <Header title="Settings" />

      <div className="theme-settings">
        <div className="theme-header">
          <h1>Theme & Appearance Settings</h1>
          <p>Customize the look and feel of your application</p>
        </div>

        <div className="theme-content">
          
          <div className="theme-section">
            <h2>System Branding</h2>
            <div className="theme-section-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="form-group">
                  <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>Full System / School Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={hexInputs.systemName || ''} 
                    onChange={e => {
                      const val = e.target.value
                      setHexInputs(prev => ({ ...prev, systemName: val }))
                      updatePending(mapToContextTheme({ ...colors, systemName: val }))
                    }}
                    placeholder="e.g. College of Computing Studies"
                    style={{ 
                      width: '100%', 
                      padding: '10px 12px', 
                      borderRadius: 8, 
                      border: '1px solid var(--border)', 
                      background: 'var(--card-bg)', 
                      color: 'var(--text)' 
                    }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>Abbreviation / Badge Text</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={hexInputs.systemShortName || ''} 
                    onChange={e => {
                      const val = e.target.value
                      setHexInputs(prev => ({ ...prev, systemShortName: val }))
                      updatePending(mapToContextTheme({ ...colors, systemShortName: val }))
                    }}
                    placeholder="e.g. CCS"
                    maxLength={5}
                    style={{ 
                      width: '100%', 
                      padding: '10px 12px', 
                      borderRadius: 8, 
                      border: '1px solid var(--border)', 
                      background: 'var(--card-bg)', 
                      color: 'var(--text)' 
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="theme-section">
            <h2>Preset Themes</h2>
            <div className="theme-section-body">
              <div className="preset-grid">
                {PRESETS.map(preset => (
                  <div
                    key={preset.id}
                    className={[
                      'preset-card',
                      preset.dark ? 'dark-preset' : '',
                      activePreset === preset.id ? 'active' : ''
                    ].filter(Boolean).join(' ')}
                    onClick={() => applyPreset(preset)}
                  >
                    <div className="preset-preview">
                      <div className="preset-sidebar" style={{ background: preset.sidebarBg }} />
                      <div className="preset-main" style={{ background: preset.bgColor }}>
                        <div className="preset-swatch-bar" style={{ background: 'rgba(0,0,0,.08)' }} />
                        <div className="preset-swatch-btn" style={{ background: preset.primary }} />
                      </div>
                    </div>
                    <div className="preset-name">{preset.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="theme-section">
            <h2>Custom Colors</h2>
            <div className="theme-section-body">
              <div className="color-grid">
                {COLOR_GROUPS.map(group => (
                  <div key={group.title} className="color-group">
                    <h3>{group.title}</h3>
                    {group.fields.map(field => (
                      <div key={field.key} className="color-input">
                        <label>{field.label}</label>
                        <div className="color-picker">
                          <div
                            className="color-dot-swatch"
                            style={{ background: colors[field.key] }}
                            title="Click to pick color"
                          >
                            <input
                              type="color"
                              value={colors[field.key] || '#000000'}
                              onChange={e => handleColorPicker(field.key, e.target.value)}
                            />
                          </div>
                          <input
                            className={`color-text${!isValidHex(hexInputs[field.key]) ? ' invalid' : ''}`}
                            type="text"
                            value={hexInputs[field.key] || ''}
                            onChange={e => handleHexChange(field.key, e.target.value)}
                            maxLength={7}
                            spellCheck={false}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="theme-section">
            <h2>Live Preview</h2>
            <div className="theme-section-body">
              <div className="preview-container">
                <div className="preview-sidebar" style={{ background: colors.sidebarBg }}>
                  <div className="preview-logo" style={{ background: colors.primary }}>{colors.systemShortName}</div>
                  <div
                    className="preview-nav-item active"
                    style={{
                      color:            activeNavText,
                      borderLeftColor:  colors.sidebarActive,
                      background:       colors.sidebarActive,
                    }}
                  >Dashboard</div>
                  <div className="preview-nav-item" style={{ color: colors.sidebarText }}>Students</div>
                  <div className="preview-nav-item" style={{ color: colors.sidebarText }}>Faculty</div>
                </div>

                <div className="preview-main">
                  <div className="preview-header" style={{ background: colors.card, borderColor: colors.border, color: colors.text }}>
                    Home
                  </div>
                  <div className="preview-content" style={{ background: colors.background }}>
                    <div className="preview-card" style={{ background: colors.card, borderColor: colors.border }}>
                      <h3 style={{ color: colors.primary }}>Sample Card</h3>
                      <p style={{ color: colors.textMuted }}>
                        This is how your content will look with the current theme.
                      </p>
                      <button className="preview-btn" style={{ background: colors.primary, color: primaryText }}>
                        Button
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="theme-actions">
            <button className="btn-reset" onClick={resetDefaults}>
              <RotateCcw size={13} /> Reset to Default
            </button>
            <button className="btn-save" onClick={saveChanges} disabled={hasInvalidHex}>
              <Save size={13} /> Save Changes
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className="ts-toast">
          <Check size={15} />
          Theme saved successfully!
        </div>
      )}
    </div>
  )
}
