import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ShieldCheck, ArrowRight, AlertCircle, Loader2 } from 'lucide-react'
import { useApp } from '../../context/AppContext'

export default function EnrollmentPortal() {
  const { verifyEnrollmentCode } = useApp()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const codeParam = searchParams.get('code')
    if (codeParam) {
      setCode(codeParam.toUpperCase())
    }
  }, [searchParams])

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!code.trim()) return

    setLoading(true)
    setError(null)

    // Artificial delay for premium feel
    setTimeout(async () => {
      const enrollee = await verifyEnrollmentCode(code.trim())
      if (enrollee) {
        navigate(`/enrollment-form/${code.trim()}`)
      } else {
        setError('Invalid or expired enrollment code. Please check your link or contact the administrator.')
        setLoading(false)
      }
    }, 800)
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'linear-gradient(135deg, #f5f0eb 0%, #e0d8d0 100%)',
      padding: '20px'
    }}>
      <div style={{ 
        maxWidth: '450px', 
        width: '100%', 
        background: '#fff', 
        borderRadius: '24px', 
        boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
        padding: '40px',
        textAlign: 'center'
      }}>
        <div style={{ 
          width: '80px', 
          height: '80px', 
          background: 'rgba(232, 119, 34, 0.1)', 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: '0 auto 24px',
          color: 'var(--orange)'
        }}>
          <ShieldCheck size={40} />
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#2d2d2d', marginBottom: '12px' }}>
          New Student Portal
        </h1>
        <p style={{ color: '#666', fontSize: '15px', lineHeight: 1.6, marginBottom: '32px' }}>
          Welcome! Please enter your unique enrollment code to access the student information form and complete your registration.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <input 
              type="text" 
              placeholder="Enter 8-character code" 
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={8}
              style={{ 
                width: '100%', 
                padding: '16px 20px', 
                borderRadius: '12px', 
                border: error ? '2px solid #ff4d4f' : '2px solid #eee', 
                fontSize: '18px', 
                fontWeight: 700, 
                textAlign: 'center',
                letterSpacing: '4px',
                outline: 'none',
                transition: 'all 0.2s',
                color: '#2d2d2d'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--orange)'}
              onBlur={e => e.target.style.borderColor = error ? '#ff4d4f' : '#eee'}
            />
          </div>

          {error && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              color: '#ff4d4f', 
              fontSize: '13px', 
              background: 'rgba(255, 77, 79, 0.05)', 
              padding: '12px', 
              borderRadius: '8px', 
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || code.length < 8}
            style={{ 
              width: '100%', 
              padding: '16px', 
              borderRadius: '12px', 
              background: code.length === 8 ? 'var(--orange)' : '#ccc', 
              color: '#fff', 
              fontSize: '16px', 
              fontWeight: 700, 
              border: 'none', 
              cursor: code.length === 8 && !loading ? 'pointer' : 'not-allowed',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px',
              transition: 'all 0.2s shadow'
            }}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                Verify and Continue <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '32px', fontSize: '12px', color: '#999' }}>
          This portal is for authorized enrollees only. If you haven't received a code, please contact the University Admissions Office.
        </div>
      </div>
    </div>
  )
}
