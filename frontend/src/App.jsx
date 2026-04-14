import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import Login     from './pages/Login'
import Dashboard from './pages/Dashboard'
import Profile   from './pages/Profile'
import History   from './pages/History'

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

  return user ? <Navigate to="/dashboard" /> : children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<Navigate to="/dashboard" />} />
        <Route path="/login"     element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/profile"   element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/history"   element={<PrivateRoute><History /></PrivateRoute>} />
        <Route path="*"          element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  )
}