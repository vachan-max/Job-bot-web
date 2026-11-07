import { useEffect, useRef, useState } from 'react'
import { signOut } from 'firebase/auth'
import { useLocation, useNavigate } from 'react-router-dom'
import { auth } from '../firebase'
import './app-navigation.css'

const links = [
  { label: 'Job Finder', path: '/job-finder' },
  { label: 'Scheduler', path: '/scheduler' },
  { label: 'Search history', path: '/history' },
  { label: 'Profile', path: '/profile', profile: true },
]

export default function AppNavigation({ brand, variant = 'default', leftAction, rightAction }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const rootRef = useRef(null)
  const toggleRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const profileName = auth.currentUser?.displayName || 'Profile'

  useEffect(() => {
    if (!menuOpen) return undefined

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setMenuOpen(false)
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        toggleRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  function go(path) {
    setMenuOpen(false)
    navigate(path)
  }

  async function handleSignOut() {
    setMenuOpen(false)
    await signOut(auth)
    navigate('/login')
  }

  function renderLinks(mobile = false) {
    return <>
      {links.map(link => {
        const label = link.profile ? profileName : link.label
        return <span className="app-navigation-link-group" key={link.path}>
          <button
            type="button"
            className={link.profile ? 'app-navigation-profile' : undefined}
            aria-current={location.pathname === link.path ? 'page' : undefined}
            onClick={() => go(link.path)}
          >{label}</button>
          {mobile && link.profile && auth.currentUser?.email && <span className="app-navigation-user-email">{auth.currentUser.email}</span>}
        </span>
      })}
      <button type="button" className="app-navigation-signout" onClick={handleSignOut}>Sign out</button>
    </>
  }

  return <header ref={rootRef} className={`app-navigation app-navigation-${variant}`}>
    <div className="app-navigation-inner">
      {leftAction && <div className="app-navigation-left">{leftAction}</div>}
      <button type="button" className="app-navigation-brand" onClick={() => go('/job-finder')}>{brand}</button>
      {rightAction && <div className="app-navigation-right">{rightAction}</div>}
      <nav className="app-navigation-desktop" aria-label="Main navigation">{renderLinks()}</nav>
      <button
        type="button"
        ref={toggleRef}
        className="app-navigation-toggle"
        aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={menuOpen}
        aria-controls="app-mobile-navigation"
        onClick={() => setMenuOpen(open => !open)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          {menuOpen ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
        </svg>
      </button>
      <nav id="app-mobile-navigation" className="app-navigation-mobile" aria-label="Mobile navigation" hidden={!menuOpen}>
        {renderLinks(true)}
      </nav>
    </div>
  </header>
}
