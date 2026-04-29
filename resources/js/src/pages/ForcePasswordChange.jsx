import React, { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { useNavigate } from 'react-router-dom'
import { Lock, ShieldCheck, AlertCircle, Loader2, Check, X } from 'lucide-react'

export default function ForcePasswordChange() {
  const { user, setUser, showToast } = useApp()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const criteria = useMemo(() => ([
    { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { id: 'upper', label: 'Contains uppercase letter', test: (p) => /[A-Z]/.test(p) },
    { id: 'lower', label: 'Contains lowercase letter', test: (p) => /[a-z]/.test(p) },
    { id: 'number', label: 'Contains a number', test: (p) => /[0-9]/.test(p) },
    { id: 'special', label: 'Contains special character (@$!%*?&)', test: (p) => /[@$!%*?&]/.test(p) },
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
      const res = await window.axios.post('/api/change-password', { 
        new_password: password,
        user_id: user.id 
      })
      
      showToast('Password updated successfully! You can now access your account.', 'success')
      
      const updatedUser = { ...user, must_change_password: false }
      setUser(updatedUser)
      sessionStorage.setItem('user', JSON.stringify(updatedUser))

      // Redirect to the appropriate dashboard
      setTimeout(() => {
        if (user.role === 'student') {
          navigate('/student/dashboard', { replace: true })
        } else {
          navigate('/dashboard', { replace: true })
        }
      }, 500)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        background: '#fff',
        borderRadius: '28px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)',
        padding: '40px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '70px',
          height: '70px',
          background: 'rgba(230, 126, 34, 0.1)',
          borderRadius: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          color: 'var(--orange)'
        }}>
          <ShieldCheck size={36} />
        </div>

        <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '12px', color: '#1a1a1a', letterSpacing: '-0.02em' }}>Security Update Required</h1>
        <p style={{ fontSize: '15px', color: '#666', lineHeight: 1.6, marginBottom: '32px' }}>
          Welcome, <strong>{user?.name}</strong>! For your security, you must create a strong password before continuing.
        </p>

        {error && (
          <div style={{
            background: '#fff5f5',
            color: '#e03131',
            padding: '14px 18px',
            borderRadius: '14px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px',
            textAlign: 'left',
            border: '1px solid #ffc9c9',
            animation: 'shake 0.4s ease-in-out'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        <form onSubmit={handleUpdate} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />
              <input 
                type="password" 
                placeholder="Enter new password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px 16px 16px 48px',
                  borderRadius: '14px',
                  border: '1.5px solid #eee',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  background: '#fcfcfc',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--orange)'}
                onBlur={(e) => e.target.style.borderColor = '#eee'}
                required
              />
            </div>

            {/* Password Checklist */}
            <div style={{ 
              marginTop: '16px', 
              background: '#f8f9fa', 
              padding: '16px', 
              borderRadius: '14px',
              border: '1px solid #eee'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#888', marginBottom: '10px', textTransform: 'uppercase' }}>Password Strength Checklist</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {validation.map(v => (
                  <div key={v.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    fontSize: '11px', 
                    color: v.met ? '#2ecc71' : '#adb5bd',
                    transition: 'color 0.2s',
                    fontWeight: v.met ? 600 : 400
                  }}>
                    {v.met ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                    {v.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirm New Password</label>
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
                  borderRadius: '14px',
                  border: '1.5px solid #eee',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  background: '#fcfcfc',
                  borderColor: confirmPassword && !match ? '#ffc9c9' : (confirmPassword && match ? '#b2f2bb' : '#eee')
                }}
                required
              />
            </div>
            {confirmPassword && !match && (
              <div style={{ color: '#e03131', fontSize: '11px', marginTop: '6px', fontWeight: 600 }}>Passwords do not match</div>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading || !allMet || !match}
            style={{
              width: '100%',
              padding: '18px',
              borderRadius: '14px',
              background: (!allMet || !match) ? '#ced4da' : 'var(--orange)',
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
              transition: 'all 0.3s'
            }}
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Update Password & Continue'}
          </button>
        </form>
      </div>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

