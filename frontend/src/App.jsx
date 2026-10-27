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
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: 'DM Sans, sans-serif',
      color: '#6b7280', fontSize: 15,
    }}>
      Loading...
    </div>
  )

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
