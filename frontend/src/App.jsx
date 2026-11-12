import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import Login     from './pages/Login'
import Profile   from './pages/Profile'
import History   from './pages/History'
import JobFinder from './pages/JobFinder'
import Scheduler from './pages/Scheduler'

function ThemeToggle() {
  const [theme, setTheme] = useState(() => localStorage.getItem('pingscore-theme') || 'light')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('pingscore-theme', theme)
  }, [theme])

  return <button
    type="button"
    className="theme-toggle"
    onClick={() => setTheme(current => current === 'light' ? 'dark' : 'light')}
    aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
  >
    <span aria-hidden="true">{theme === 'light' ? '☾' : '☀'}</span>
    <span className="theme-toggle-label">{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
  </button>
}

function PrivateRoute({ children }) {
  const [user,    setUser]    = useState(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

 if (loading) return (
  <div style={{
    minHeight: '100vh', 
    display: 'flex', 
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center', 
    fontFamily: 'DM Sans, sans-serif',
    color: '#9ca3af', 
    fontSize: 14,
    gap: 12,
    backgroundColor: '#121212', // matches dark backgrounds
  }}>
    {/* Inline keyframe animation for spinner */}
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
    
    <div style={{
      width: 32,
      height: 32,
      border: '3px solid rgba(255, 255, 255, 0.1)',
      borderTop: '3px solid #f97316', // or your accent color (e.g. orange/coral)
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
    
    <span style={{ letterSpacing: '0.025em' }}>Loading...</span>
  </div>
);

  return user ? children : <Navigate to="/login" />
}

function PublicRoute({ children }) {
  const [user,    setUser]    = useState(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: 'DM Sans, sans-serif',
      color: '#6b7280', fontSize: 15,
    }}>
      Loading...
    </div>
  )

  return user ? <Navigate to="/job-finder" /> : children
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeToggle />
      <Routes>
        <Route path="/"          element={<Navigate to="/job-finder" />} />
        <Route path="/login"     element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><Navigate to="/job-finder" replace /></PrivateRoute>} />
        <Route path="/profile"   element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/history"   element={<PrivateRoute><History /></PrivateRoute>} />
        <Route path="/scheduler" element={<PrivateRoute><Scheduler /></PrivateRoute>} />
        <Route path="/job-finder" element={<PrivateRoute><JobFinder /></PrivateRoute>} />
        <Route path="*"          element={<Navigate to="/job-finder" />} />
      </Routes>
    </BrowserRouter>
  )
}
