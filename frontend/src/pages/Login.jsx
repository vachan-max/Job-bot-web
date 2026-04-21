import { useState } from 'react'
import { signInWithPopup } from 'firebase/auth'
import { auth, provider } from '../firebase'
import { useNavigate } from 'react-router-dom'
import api from '../api'

const features = [
  'Finds matching jobs daily from top job boards',
  'AI scores and ranks best matches for your profile',
  'Sends results to your WhatsApp automatically',
  'Generates cover letters for each job',
]

export default function Login() {
  const navigate             = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await signInWithPopup(auth, provider)
      const token  = await result.user.getIdToken()
      await api.post('/auth/google', {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      navigate('/dashboard')
    } catch (err) {
      console.error('Login failed:', err)
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #f8fafc, #ffffff)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'DM Sans', sans-serif"
    }}>

      {/* Center content */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px'
      }}>

        {/* Card */}
        <div style={{
          width: '100%',
          maxWidth: 400,
          background: '#ffffff',
          borderRadius: 24,
          padding: '48px 40px',
          border: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 10px 25px rgba(0,0,0,0.05)'
        }}>

          {/* Logo */}
          <div style={{ marginBottom: 32, textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56,
              background: '#ecfdf5',
              borderRadius: 16,
              display: 'flex', alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#059669'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            <h1 style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 28, fontWeight: 700,
              color: '#111827', marginBottom: 6, letterSpacing: '-0.025em'
            }}>
              PingScore
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280' }}>
              Premium AI job alerts on WhatsApp
            </p>
          </div>

          {/* Features */}
          <ul style={{
            width: '100%', listStyle: 'none',
            padding: 0, margin: '0 0 32px 0',
            display: 'flex', flexDirection: 'column', gap: 14
          }}>
            {features.map((f, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <svg width="20" height="20" viewBox="0 0 24 24"
                  fill="#10b981" style={{ marginTop: 1, flexShrink: 0 }}>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10
                    10-4.48 10-10S17.52 2 12 2zm-2
                    14.5l-4-4 1.41-1.41L10 13.67l6.59-6.59L18
                    8.5l-8 8z"/>
                </svg>
                <span style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.5 }}>
                  {f}
                </span>
              </li>
            ))}
          </ul>

          {/* Error */}
          {error && (
            <div style={{
              width: '100%', marginBottom: 16,
              padding: '12px 14px', borderRadius: 12,
              background: '#fef2f2', border: '1px solid #fecaca',
              color: '#dc2626', fontSize: 13, fontWeight: 500
            }}>
              {error}
            </div>
          )}

          {/* Google Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{
              width: '100%', height: 52,
              background: '#111827',
              border: 'none',
              borderRadius: 14,
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 12,
              fontSize: 15, fontWeight: 600,
              color: '#ffffff',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s',
              fontFamily: 'inherit'
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#1f2937'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#111827'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            {loading ? (
              <>
                <div style={{
                  width: 18, height: 18,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#ffffff',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite'
                }}/>
                Signing in...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26
                    1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92
                    3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23
                    1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99
                    20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43
                    .35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43
                    3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45
                    2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66
                    2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        background: '#ffffff',
        borderTop: '1px solid #e5e7eb',
        padding: '40px 32px'
      }}>
        <div style={{
          maxWidth: 900, margin: '0 auto',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap', gap: 20
        }}>
          
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
