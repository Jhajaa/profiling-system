import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

  .login-root {
    min-height: 100vh;
    background: #120A04;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    font-family: 'DM Sans', sans-serif;
    position: relative;
    overflow: hidden;
  }

  .login-glow-1 {
    position: fixed;
    width: 600px; height: 600px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(232,100,10,.20) 0%, transparent 70%);
    top: -160px; left: -160px;
    pointer-events: none;
    z-index: 0;
  }

  .login-glow-2 {
    position: fixed;
    width: 400px; height: 400px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(232,100,10,.12) 0%, transparent 70%);
    bottom: -100px; right: -80px;
    pointer-events: none;
    z-index: 0;
  }

  /* ── TOP BAR ── */
  .login-topbar {
    width: 100%;
    max-width: 960px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0 20px;
    border-bottom: 0.5px solid rgba(255,255,255,.08);
    margin-bottom: 28px;
    position: relative;
    z-index: 1;
  }

  .login-brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .login-badge {
    width: 38px; height: 38px;
    background: var(--orange);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 12px;
    color: #fff;
    flex-shrink: 0;
    box-shadow: 0 4px 16px rgba(0,0,0,.25);
  }

  .login-brand-text strong {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #fff;
    line-height: 1.3;
  }

  .login-brand-text span {
    font-size: 11px;
    color: rgba(255,255,255,.35);
    font-weight: 300;
  }

  .login-topbar-tagline {
    font-family: 'Playfair Display', serif;
    font-style: italic;
    font-size: 14px;
    color: rgb(255, 255, 255);
  }

  /* ── CARD ── */
  .login-card {
    width: 100%;
    max-width: 960px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-radius: 18px;
    overflow: hidden;
    border: 0.5px solid rgba(255,255,255,.08);
    position: relative;
    z-index: 1;
    box-shadow: 0 32px 80px rgba(0,0,0,.5);
  }

  /* ── HERO PANEL ── */
  .login-hero {
    background: rgba(255,255,255,.03);
    padding: 52px 44px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    border-right: 0.5px solid rgba(255,255,255,.07);
    position: relative;
    overflow: hidden;
  }

  .login-hero::before {
    content: '';
    position: absolute;
    width: 320px; height: 320px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,.05);
    bottom: -80px; right: -80px;
  }

  .login-hero::after {
    content: '';
    position: absolute;
    width: 200px; height: 200px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,.04);
    bottom: -40px; right: -40px;
  }

  .login-hero-eyebrow {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .18em;
    text-transform: uppercase;
    color: var(--orange);
    margin-bottom: 18px;
  }

  .login-hero-title {
    font-family: 'Playfair Display', serif;
    font-size: 40px;
    line-height: 1.1;
    color: #fff;
    margin-bottom: 22px;
  }

  .login-hero-title em {
    font-style: italic;
    color: rgba(255, 190, 120, .85);
  }

  .login-hero-divider {
    width: 36px; height: 2px;
    background: var(--orange);
    border-radius: 2px;
    margin-bottom: 20px;
  }

  .login-hero-sub {
    font-size: 13px;
    color: rgba(255,255,255,.4);
    font-weight: 300;
    line-height: 1.85;
    max-width: 240px;
    margin-bottom: 32px;
  }

  .login-pills {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .login-pill {
    font-size: 10px;
    font-weight: 500;
    letter-spacing: .06em;
    text-transform: uppercase;
    padding: 5px 14px;
    border-radius: 20px;
    border: 0.5px solid rgba(255,255,255,.15);
    color: rgba(255,255,255,.4);
  }

  /* ── FORM PANEL ── */
  .login-form-panel {
    background: rgba(255,255,255,.025);
    padding: 44px 40px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .login-tabs {
    display: flex;
    border-bottom: 0.5px solid rgba(255,255,255,.1);
    margin-bottom: 28px;
  }

  .login-tab {
    flex: 1;
    padding: 9px 0;
    font-size: 13px;
    font-weight: 500;
    text-align: center;
    cursor: pointer;
    color: rgba(255,255,255,.3);
    border: none;
    background: transparent;
    font-family: 'DM Sans', sans-serif;
    border-bottom: 2px solid transparent;
    margin-bottom: -0.5px;
    transition: all .2s;
  }

  .login-tab.active {
    color: #fff;
    border-bottom-color: var(--orange);
  }

  .login-label {
    display: block;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .09em;
    text-transform: uppercase;
    color: rgba(255,255,255,.35);
    margin-bottom: 7px;
  }

  .login-input {
    width: 100%;
    padding: 11px 14px;
    border: 0.5px solid rgba(255,255,255,.1);
    border-radius: 10px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    color: #fff;
    background: rgba(255,255,255,.05);
    outline: none;
    transition: border-color .2s, background .2s;
    box-sizing: border-box;
  }

  .login-input::placeholder { color: rgba(255,255,255,.2); }

  .login-input:focus {
    border-color: rgba(0,0,0,.3);
    background: rgba(255,255,255,.12);
  }

  .login-field { margin-bottom: 16px; }

  .login-pw-wrap { position: relative; }
  .login-pw-wrap .login-input { padding-right: 40px; }

  .login-eye {
    position: absolute;
    right: 12px; top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    color: rgba(255,255,255,.3);
    padding: 0;
    display: flex;
    align-items: center;
    transition: color .2s;
  }
  .login-eye:hover { color: var(--orange); }

  .login-error {
    display: flex;
    align-items: center;
    gap: 7px;
    color: #ff7b6b;
    font-size: 12px;
    background: rgba(255,80,60,.1);
    border: 0.5px solid rgba(255,80,60,.25);
    padding: 9px 12px;
    border-radius: 8px;
    margin-bottom: 14px;
  }

  .login-btn {
    width: 100%;
    padding: 12px;
    background: var(--orange);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    letter-spacing: .03em;
    transition: background .2s, transform .15s, box-shadow .2s;
    box-shadow: 0 4px 18px rgba(0,0,0,.25);
    margin-top: 4px;
  }
  .login-btn:hover {
    background: var(--orange-dark);
    transform: translateY(-1px);
    box-shadow: 0 6px 22px rgba(0,0,0,.3);
  }
  .login-btn:active { transform: translateY(0); }

  .login-hint {
    text-align: center;
    font-size: 12px;
    color: rgba(255,255,255,.3);
    margin-top: 14px;
    font-weight: 300;
  }

  .login-hint-link {
    color: var(--orange);
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    background: none;
    border: none;
    font-size: 12px;
    font-family: 'DM Sans', sans-serif;
  }

  .login-demo {
    border: 0.5px solid rgba(232,100,10,.2);
    background: rgba(232,100,10,.06);
    border-radius: 10px;
    padding: 12px 16px;
    margin-top: 18px;
  }

  .login-demo-title {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .09em;
    text-transform: uppercase;
    color: var(--orange);
    margin-bottom: 10px;
  }

  .login-demo-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 5px;
  }
  .login-demo-row:last-child { margin-bottom: 0; }

  .login-demo-role {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: rgba(255,255,255,.3);
    width: 48px;
    flex-shrink: 0;
  }

  .login-demo-cred {
    font-size: 11px;
    color: rgba(255,255,255,.55);
  }

  /* ── SIGNUP NOTICE ── */
  .login-signup-notice {
    text-align: center;
    color: rgba(255,255,255,.35);
    font-size: 13px;
    font-weight: 300;
    line-height: 1.8;
    padding: 32px 0;
  }

  /* ── BOTTOM BAR ── */
  .login-bottombar {
    width: 100%;
    max-width: 960px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px 0 0;
    border-top: 0.5px solid rgba(255,255,255,.06);
    margin-top: 20px;
    position: relative;
    z-index: 1;
  }

  .login-footer {
    font-family: 'Playfair Display', serif;
    font-style: italic;
    font-size: 14px;
    color: rgb(255, 255, 255);
  }

  /* ── RESPONSIVE ── */
  @media (max-width: 640px) {
    .login-card { grid-template-columns: 1fr; }
    .login-hero { display: none; }
    .login-topbar-tagline { display: none; }
  }
`

export default function Login() {
  const { login } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState('login')
  const [userNumber, setUserNumber] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (isLoggingIn) return
    setError('')
    if (!userNumber.trim()) { setError('User number is required.'); return }
    if (!password.trim()) { setError('Password is required.'); return }
    
    setIsLoggingIn(true)
    try {
      const result = await login(userNumber.trim(), password)
      if (result?.success) {
        if (result.role === 'student') navigate('/student/dashboard')
        else navigate('/dashboard')
      } else {
        setError(result?.message || 'Invalid user number or password.')
      }
    } finally {
      setIsLoggingIn(false)
    }
  }

  const switchTab = (t) => { setTab(t); setError('') }

  return (
    <>
      <style>{styles}</style>
      <div className="login-root">
        <div className="login-glow-1" />
        <div className="login-glow-2" />

        {/* Top bar */}
        <div className="login-topbar">
          <div className="login-brand">
            <div className="login-badge">CCS</div>
            <div className="login-brand-text">
              <strong>College of Computing Studies</strong>
              <span>Laguna State Polytechnic University</span>
            </div>
          </div>
          <span className="login-topbar-tagline">Dangal ng Bayan</span>
        </div>

        {/* Main card */}
        <div className="login-card">

          {/* Left — Hero */}
          <div className="login-hero">
            <div className="login-hero-eyebrow">Welcome back</div>
            <h1 className="login-hero-title">
              Comprehensive<br /><em>Profiling</em><br />System
            </h1>
            <div className="login-hero-divider" />
            <p className="login-hero-sub">
              One unified platform for students, faculty, and administrators across CCS.
            </p>
            <div className="login-pills">
              <span className="login-pill">Students</span>
              <span className="login-pill">Faculty</span>
              <span className="login-pill">Admin</span>
            </div>
          </div>

          {/* Right — Form */}
          <div className="login-form-panel">
            <div className="login-tabs">
              {['login', 'signup'].map(t => (
                <button
                  key={t}
                  className={`login-tab${tab === t ? ' active' : ''}`}
                  onClick={() => switchTab(t)}
                >
                  {t === 'login' ? 'Log In' : 'Sign Up'}
                </button>
              ))}
            </div>

            {tab === 'login' ? (
              <form onSubmit={handleLogin}>
                <div className="login-field">
                  <label className="login-label">User Number</label>
                  <input
                    className="login-input"
                    type="text"
                    placeholder="Ex. StudNo, FacultyNo, AdminNo..."
                    value={userNumber}
                    onChange={e => setUserNumber(e.target.value)}
                  />
                </div>

                <div className="login-field">
                  <label className="login-label">Password</label>
                  <div className="login-pw-wrap">
                    <input
                      className="login-input"
                      type={showPw ? 'text' : 'password'}
                      placeholder="Your Password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button type="button" className="login-eye" onClick={() => setShowPw(!showPw)}>
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="login-error">
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}

                <button type="submit" className="login-btn" disabled={isLoggingIn}>
                  {isLoggingIn ? 'Verifying...' : 'Log In'}
                </button>

                <p className="login-hint">
                  Don't have an account?{' '}
                  <button type="button" className="login-hint-link" onClick={() => switchTab('signup')}>
                    Sign Up
                  </button>
                </p>

                <div className="login-demo">
                  <div className="login-demo-title">Demo Accounts</div>
                  <div className="login-demo-row">
                    <span className="login-demo-role">Admin</span>
                    <span className="login-demo-cred">ADMIN001 / admin123</span>
                  </div>
                  <div className="login-demo-row">
                    <span className="login-demo-role">Student</span>
                    <span className="login-demo-cred">#2203343 / student123</span>
                  </div>
                  <div className="login-demo-row">
                    <span className="login-demo-role">Faculty</span>
                    <span className="login-demo-cred">#0000001 / faculty123</span>
                  </div>
                </div>
              </form>
            ) : (
              <div className="login-signup-notice">
                <p style={{ marginBottom: 10 }}>Account registration requires administrator approval.</p>
                <p>Please contact the College of Computing Studies office for account creation.</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="login-bottombar">
          <span className="login-footer">Dangal ng Bayan — College of Computing Studies</span>
        </div>
      </div>
    </>
  )
}