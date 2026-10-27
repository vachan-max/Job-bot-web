import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { auth } from '../firebase'
import ChatWindow from '../components/job-finder/ChatWindow'
import ResumeUpload from '../components/job-finder/ResumeUpload'
import SearchFormCard from '../components/job-finder/SearchFormCard'
import JobResults from '../components/job-finder/JobResults'
import { getSearches, getSearchResults, interpretSearch, runSearch } from '../services/jobFinderService'
import './job-finder.css'

export default function JobFinder() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [messages, setMessages] = useState([])
  const [searchId, setSearchId] = useState(null)
  const [filters, setFilters] = useState(null)
  const [jobs, setJobs] = useState([])
  const [searchInfo, setSearchInfo] = useState(null)
  const [searches, setSearches] = useState([])
  const [interpreting, setInterpreting] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [sendEmail, setSendEmail] = useState(false)

  useEffect(() => { refreshSearches() }, [])

  function formatSearchList(values, fallback = '') {
    if (Array.isArray(values)) return values.filter(value => typeof value === 'string' && value.trim()).join(', ') || fallback
    return typeof values === 'string' && values.trim() ? values : fallback
  }

  useEffect(() => {
    const requestedSearchId = searchParams.get('search_id')
    if (!requestedSearchId) return
    let active = true
    getSearches().then(searchList => {
      if (active) setSearches(searchList)
      const requestedSearch = searchList.find(search => search._id === requestedSearchId)
      if (requestedSearch && active) openSearch(requestedSearch)
    }).catch(err => console.error('Could not open saved finder run', err))
    return () => { active = false }
  }, [searchParams])

  async function refreshSearches() {
    try { setSearches(await getSearches()) } catch (err) { console.error('Could not load finder history', err) }
  }

  async function handleSend(message) {
    setError('')
    setMessages(previous => [...previous, { role: 'user', content: message }])
    setInterpreting(true)
    try {
      const result = await interpretSearch(message, searchId)
      setSearchId(result.search_id)
      setFilters(result.filters)
      setMessages(previous => [...previous, { role: 'assistant', content: result.assistant_message }])
      if (result.requires_clarification && result.clarification_question) {
        setMessages(previous => [...previous, { role: 'assistant', content: result.clarification_question }])
      }
      setJobs([])
      setSearchInfo(null)
      await refreshSearches()
    } catch (err) {
      const messageText = err.response?.data?.detail || 'I could not interpret that request. Please try again.'
      setError(messageText)
      setMessages(previous => [...previous, { role: 'assistant', content: messageText }])
    } finally { setInterpreting(false) }
  }

  async function handleSearch() {
    if (!searchId || !filters) return
    setError('')
    setRunning(true)
    setJobs([])
    setSearchInfo(null)
    try {
      const result = await runSearch(searchId, filters, sendEmail)
      const savedJobs = await getSearchResults(searchId)
      setJobs(savedJobs)
      setSearchInfo(result)
      await refreshSearches()
    } catch (err) {
      setError(err.response?.data?.detail || 'The search could not be completed. Please try again.')
    } finally { setRunning(false) }
  }

  async function openSearch(search) {
    setError('')
    setSearchId(search._id)
    setFilters(search.filters)
    setMessages([])
    setSearchInfo({ provider: search.provider, message: `${search.result_count || 0} saved results · ${search.status}` })
    try {
      const savedJobs = await getSearchResults(search._id)
      setJobs(savedJobs)
    } catch (err) { setError(err.response?.data?.detail || 'Could not load saved search details.') }
  }

  async function handleSignOut() { await signOut(auth); navigate('/login') }

  return <div className="jf-root">
    <header className="jf-nav"><div className="jf-nav-inner"><button className="jf-brand" onClick={() => navigate('/job-finder')}>PingScore<span>Job Finder</span></button>
      <nav><button onClick={() => navigate('/scheduler')}>Scheduler</button><button onClick={() => navigate('/history')}>Search history</button><button onClick={() => navigate('/profile')}>{auth.currentUser?.displayName || 'Profile'}</button><button className="jf-logout" onClick={handleSignOut}>Sign out</button></nav>
    </div></header>
    <main className="jf-main">

      <section className="jf-hero"><div><p className="jf-eyebrow">Personal job search</p><h1>Find work that fits <em>your</em> next step.</h1><p>Search across roles, industries, and company types. Review what the assistant understood before any provider is called.</p></div><button className="jf-new-search" onClick={() => { setSearchId(null); setFilters(null); setMessages([]); setJobs([]); setSearchInfo(null); setError('') }}>＋ New search</button></section>
      {error && <div className="jf-error" role="alert">{error}</div>}

      <div className="jf-layout">

        <div className="jf-workspace"><ChatWindow messages={messages} onSend={handleSend} busy={interpreting} />
          <ResumeUpload />
          <SearchFormCard filters={filters} onChange={setFilters} onSearch={handleSearch} busy={running} sendEmail={sendEmail} onEmailChange={setSendEmail} />
          <JobResults jobs={jobs} loading={running} searchInfo={searchInfo} searchId={searchId} onRemoveJob={id => setJobs(previous => previous.filter(job => job._id !== id))} />
        </div>
        <aside className="jf-history-panel"><div className="jf-history-heading"><div><p className="jf-eyebrow">Your searches</p><h2>Recent finder runs</h2></div><button onClick={refreshSearches} aria-label="Refresh searches">↻</button></div>
          {searches.length === 0 ? <p className="jf-history-empty">Confirmed searches will appear here.</p> : <div className="jf-history-list">{searches.map(search => <button key={search._id} className={`jf-history-item ${search._id === searchId ? 'active' : ''}`} onClick={() => openSearch(search)}>
            <strong>{formatSearchList(search.filters?.job_titles, 'Untitled search')}</strong><span>{formatSearchList(search.filters?.locations, 'Any location')}</span><small>{Number(search.result_count) || 0} results · {search.status || 'draft'}</small>
          </button>)}</div>}
          <div className="jf-provider-note"><strong>Sources</strong><p>Google Jobs via SerpApi, with JSearch as a fallback. Firecrawl may enrich a limited number of incomplete descriptions.</p></div>
        </aside>
      </div>
    </main>
  </div>
}
