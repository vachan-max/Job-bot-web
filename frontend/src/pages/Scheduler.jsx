import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase'
import SchedulerSection from '../components/job-finder/SchedulerSection'
import { getSearches, getSearchSchedule, saveSearchSchedule, runSavedSearchNow, getSearchResults, deleteSavedSearch } from '../services/jobFinderService'
import './scheduler.css'

const defaultSchedule = { schedule_enabled: false, schedule_time: '09:00', timezone: 'Asia/Kolkata', email_enabled: true }

export default function Scheduler() {
  const navigate = useNavigate()
  const [searches, setSearches] = useState([])
  const [schedules, setSchedules] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saveStates, setSaveStates] = useState({})
  const [saveErrors, setSaveErrors] = useState({})
  const [runningId, setRunningId] = useState(null)
  const [runMessages, setRunMessages] = useState({})
  const [runJobs, setRunJobs] = useState({})
  const [deletingId, setDeletingId] = useState(null)
  const [deleteErrors, setDeleteErrors] = useState({})
  const [toast, setToast] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const savedSearches = await getSearches(50)
        const entries = await Promise.all(savedSearches.map(async search => {
          try {
            const schedule = await getSearchSchedule(search._id)
            return [search._id, { ...schedule, timezone: 'Asia/Kolkata' }]
          }
          catch { return [search._id, { ...defaultSchedule, filters: search.filters }] }
        }))
        if (active) {
          setSearches(savedSearches)
          setSchedules(Object.fromEntries(entries))
        }
      } catch (err) {
        if (active) setError(err.response?.data?.detail || 'Could not load saved searches.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  function updateSchedule(searchId, value) {
    setSchedules(previous => ({ ...previous, [searchId]: value }))
  }

  async function save(search) {
    const schedule = schedules[search._id] || defaultSchedule
    setSaveStates(previous => ({ ...previous, [search._id]: 'saving' }))
    setSaveErrors(previous => ({ ...previous, [search._id]: '' }))
    try {
      const saved = await saveSearchSchedule(search._id, schedule)
      updateSchedule(search._id, saved)
      setSaveStates(previous => ({ ...previous, [search._id]: 'saved' }))
      window.setTimeout(() => setSaveStates(previous => previous[search._id] === 'saved' ? { ...previous, [search._id]: 'idle' } : previous), 2000)
    } catch (err) {
      setSaveErrors(previous => ({ ...previous, [search._id]: err.response?.data?.detail || `Could not save schedule for ${search.filters?.job_titles?.join(', ') || 'this search'}.` }))
      setSaveStates(previous => ({ ...previous, [search._id]: 'error' }))
      window.setTimeout(() => setSaveStates(previous => previous[search._id] === 'error' ? { ...previous, [search._id]: 'idle' } : previous), 2000)
    }
  }

  async function runNow(search) {
    setRunningId(search._id)
    try {
      const result = await runSavedSearchNow(search._id)
      const message = result.persistence_error
        ? `${result.message} Email sent, but saving search results failed: ${result.persistence_error}`
        : result.message
      setRunMessages(previous => ({ ...previous, [search._id]: message }))
      const fresh = await getSearchSchedule(search._id)
      updateSchedule(search._id, fresh)
      if (fresh.email_enabled === false) {
        const results = await getSearchResults(search._id)
        setRunJobs(previous => ({ ...previous, [search._id]: results }))
      }
    } catch (err) {
      setRunMessages(previous => ({ ...previous, [search._id]: err.response?.data?.detail || 'Could not run this search.' }))
      try { updateSchedule(search._id, await getSearchSchedule(search._id)) } catch { /* keep the visible run error */ }
    } finally { setRunningId(null) }
  }

  async function deleteSearch(search) {
    const name = (search.filters?.job_titles || ['Saved search']).join(', ')
    if (!window.confirm(`Delete '${name}'? This also stops its daily emails. This can't be undone.`)) return
    setDeletingId(search._id)
    setDeleteErrors(previous => ({ ...previous, [search._id]: '' }))
    try {
      await deleteSavedSearch(search._id)
      setSearches(previous => previous.filter(item => item._id !== search._id))
      setToast('Saved search deleted')
      window.setTimeout(() => setToast(''), 3000)
    } catch (err) {
      setDeleteErrors(previous => ({ ...previous, [search._id]: err.response?.data?.detail || 'Could not delete saved search.' }))
    } finally { setDeletingId(null) }
  }

  async function handleSignOut() { await signOut(auth); navigate('/login') }

  return <div className="jf-root scheduler-page">
    <header className="jf-nav"><div className="jf-nav-inner">
      <button className="jf-brand" onClick={() => navigate('/job-finder')}>PingScore<span>Scheduler</span></button>
      <nav><button onClick={() => navigate('/job-finder')}>Job Finder</button><button onClick={() => navigate('/history')}>Search history</button><button onClick={() => navigate('/profile')}>{auth.currentUser?.displayName || 'Profile'}</button><button className="jf-logout" onClick={handleSignOut}>Sign out</button></nav>
    </div></header>
    <main className="jf-main">
      <section className="jf-hero"><div><p className="jf-eyebrow">Automation</p><h1>Manage your <em>job schedules.</em></h1><p>Choose which saved searches run daily, when they run, and whether new matches are emailed to you.</p></div></section>
      {error && <div className="jf-error" role="alert">{error}</div>}
      {toast && <div className="jf-toast" role="status">{toast}</div>}
      {loading ? <div className="jf-scheduler-empty">Loading your saved searches…</div> : searches.length === 0 ? <section className="jf-panel jf-scheduler-empty-state"><h2>No saved searches yet</h2><p>Create a search in Job Finder first. It will appear here so you can schedule it.</p><button className="jf-primary" onClick={() => navigate('/job-finder')}>Open Job Finder</button></section> : <div className="jf-scheduler-list">
        {searches.map(search => <SchedulerSection key={search._id} searchId={search._id} searchLabel={(search.filters?.job_titles || ['Saved search']).join(', ')} filters={search.filters} schedule={schedules[search._id] || defaultSchedule} onScheduleChange={value => updateSchedule(search._id, value)} onSave={() => save(search)} onRunNow={() => runNow(search)} onDelete={() => deleteSearch(search)} deleting={deletingId === search._id} deleteError={deleteErrors[search._id]} saveState={saveStates[search._id]} saveError={saveErrors[search._id]} running={runningId === search._id} destinationEmail={auth.currentUser?.email} runMessage={runMessages[search._id]} runJobs={runJobs[search._id] || []} />)}
      </div>}
    </main>
  </div>
}
