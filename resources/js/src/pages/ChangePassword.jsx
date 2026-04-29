import React, { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { useNavigate } from 'react-router-dom'
import { Lock, ShieldCheck, AlertCircle, Loader2, Check, X, ChevronLeft, KeyRound } from 'lucide-react'
import Header from '../components/Header'

export default function ChangePassword() {
  const { user, showToast } = useApp()
  const navigate = useNavigate()
  
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const criteria = useMemo(() => ([
    { id: 'length', label: '8+ Characters', test: (p) => p.length >= 8 },
    { id: 'upper', label: 'Uppercase', test: (p) => /[A-Z]/.test(p) },
    { id: 'lower', label: 'Lowercase', test: (p) => /[a-z]/.test(p) },
    { id: 'number', label: 'Number', test: (p) => /[0-9]/.test(p) },
    { id: 'special', label: 'Special Symbol', test: (p) => /[@$!%*?&]/.test(p) },
  ]), [])

  const validation = useMemo(() => {
    return criteria.map(c => ({ ...c, met: c.test(password) }))
  }, [password, criteria])

  const allMet = validation.every(v => v.met)
  const match = password && password === confirmPassword

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!allMet) {
      setError('Please meet all password complexity requirements.')
      return
    }
    if (!match) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await window.axios.post('/api/change-password', { 
        new_password: password,
        current_password: currentPassword,
        user_id: user.id 
      })
      
      showToast('Password updated successfully!', 'success')
      navigate(-1)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password. Please verify your current password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <Header title="Change Password" />
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        padding: '60px 20px',
        animation: 'fadeIn 0.5s ease-out'
      }}>
        <div style={{ 
          maxWidth: '520px', 
          width: '100%',
          background: '#fff',
          borderRadius: '32px',
          boxShadow: '0 20px 60px -10px rgba(0,0,0,0.05), 0 10px 30px -5px rgba(0,0,0,0.03)',
          padding: '48px',
          position: 'relative',
          border: '1px solid #f1f3f5'
        }}>
          {/* Back Button */}
          <button 
            onClick={() => navigate(-1)} 
            style={{ 
              position: 'absolute',
              left: '24px',
              top: '24px',
              background: '#f8f9fa',
              border: 'none',
              borderRadius: '12px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#495057',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#e9ecef'; e.currentTarget.style.transform = 'translateX(-2px)' }}
            onMouseOut={e => { e.currentTarget.style.background = '#f8f9fa'; e.currentTarget.style.transform = 'translateX(0)' }}
          >
            <ChevronLeft size={16} /> Back
          </button>

          <div style={{ textAlign: 'center', marginBottom: '40px', marginTop: '10px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, rgba(230, 126, 34, 0.1) 0%, rgba(230, 126, 34, 0.05) 100%)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: 'var(--orange)',
              boxShadow: 'inset 0 2px 6px rgba(230, 126, 34, 0.1)'
            }}>
              <KeyRound size={30} />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1a1a1a', letterSpacing: '-0.02em', marginBottom: '8px' }}>Security Settings</h2>
            <p style={{ fontSize: '14px', color: '#6c757d', lineHeight: 1.5 }}>
              Update your account password to maintain maximum security.
            </p>
          </div>

          {error && (
            <div style={{
              background: '#fff5f5',
              color: '#e03131',
              padding: '16px 20px',
              borderRadius: '16px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              marginBottom: '32px',
              border: '1px solid #ffc9c9',
              animation: 'shake 0.4s ease-in-out'
            }}>
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <span style={{ fontWeight: 500 }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Current Password */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '10px', color: '#495057', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />
                <input 
                  type="password" 
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '16px 16px 16px 48px',
                    borderRadius: '16px',
                    border: '1.5px solid #eee',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    background: '#fcfcfc',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--orange)'; e.target.style.background = '#fff' }}
                  onBlur={e => { e.target.style.borderColor = '#eee'; e.target.style.background = '#fcfcfc' }}
                  required
                />
              </div>
            </div>

            {/* New Password */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '10px', color: '#495057', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />
                <input 
                  type="password" 
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '16px 16px 16px 48px',
                    borderRadius: '16px',
                    border: '1.5px solid #eee',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    background: '#fcfcfc',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--orange)'; e.target.style.background = '#fff' }}
                  onBlur={e => { e.target.style.borderColor = '#eee'; e.target.style.background = '#fcfcfc' }}
                  required
                />
              </div>

              {/* Checklist */}
              <div style={{ 
                marginTop: '16px', 
                background: '#f8f9fa', 
                padding: '18px', 
                borderRadius: '16px',
                border: '1px solid #eee'
              }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#adb5bd', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Complexity Requirements</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {validation.map(v => (
                    <div key={v.id} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      fontSize: '12px', 
                      color: v.met ? '#2ecc71' : '#adb5bd',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontWeight: v.met ? 600 : 500
                    }}>
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '6px',
                        background: v.met ? 'rgba(46, 204, 113, 0.1)' : 'rgba(173, 181, 189, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s'
                      }}>
                        {v.met ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                      </div>
                      {v.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '10px', color: '#495057', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />
                <input 
                  type="password" 
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '16px 16px 16px 48px',
                    borderRadius: '16px',
                    border: '1.5px solid #eee',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    background: '#fcfcfc',
                    borderColor: confirmPassword && !match ? '#ffc9c9' : (confirmPassword && match ? '#b2f2bb' : '#eee'),
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                  }}
                  required
                />
              </div>
              {confirmPassword && !match && (
                <div style={{ color: '#e03131', fontSize: '12px', marginTop: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={14} /> Passwords do not match
                </div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={loading || !allMet || !match}
              style={{
                width: '100%',
                padding: '18px',
                borderRadius: '16px',
                background: (!allMet || !match) ? '#e9ecef' : 'var(--orange)',
                color: '#fff',
                border: 'none',
                fontSize: '16px',
                fontWeight: 800,
                cursor: (loading || !allMet || !match) ? 'not-allowed' : 'pointer',
                boxShadow: (!allMet || !match) ? 'none' : '0 10px 20px rgba(230, 126, 34, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                marginTop: '12px',
                transition: 'all 0.3s'
              }}
              onMouseOver={e => { if(!loading && allMet && match) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(230, 126, 34, 0.25)' } }}
              onMouseOut={e => { if(!loading && allMet && match) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(230, 126, 34, 0.2)' } }}
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'Update Password'}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

