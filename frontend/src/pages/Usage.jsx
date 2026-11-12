import { useEffect, useState } from 'react'
import api from '../api'
import AppNavigation from '../components/AppNavigation'
import './usage.css'

const SERVICE_LABELS = {
  jsearch: 'JSearch',
  groq: 'Groq',
  email: 'Email',
  serpapi: 'SerpAPI',
  firecrawl: 'Firecrawl',
}

function UsageMeter({ label, used, limit, period }) {
  const safeUsed = Math.max(0, Number(used) || 0)
  const safeLimit = Math.max(0, Number(limit) || 0)
  const percent = safeLimit ? Math.min(100, (safeUsed / safeLimit) * 100) : 0
  const remaining = Math.max(0, safeLimit - safeUsed)

  return <div className="usage-meter">
    <div className="usage-meter-heading">
      <span>{label}</span>
      <strong>{safeUsed.toLocaleString()} <span>of {safeLimit.toLocaleString()}</span></strong>
    </div>
    <div className="usage-meter-track" role="progressbar" aria-label={`${label} usage`} aria-valuemin={0} aria-valuemax={safeLimit} aria-valuenow={Math.min(safeUsed, safeLimit)}>
      <div className={`usage-meter-fill${percent >= 90 ? ' is-near-limit' : ''}`} style={{ width: `${percent}%` }} />
    </div>
    <p>{remaining.toLocaleString()} {period === 'day' ? 'remaining today' : 'remaining this week'}</p>
  </div>
}

export default function Usage() {
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function loadUsage() {
      try {
        const response = await api.get('/jobs/usage')
        if (active) setUsage(response.data || {})
      } catch (loadError) {
        console.error('Could not load usage:', loadError)
        if (active) setError('Usage could not be loaded. Please try again.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadUsage()
    return () => { active = false }
  }, [])

  const services = Object.entries(usage || {}).sort(([a], [b]) => a.localeCompare(b))

  return <div className="usage-page">
    <AppNavigation brand="PingScore" variant="history" />
    <main className="usage-main">
      <header className="usage-header">
        <div className="usage-eyebrow">Account overview</div>
        <h1>Usage</h1>
        <p>Track your rate limit usage for today and this week.</p>
      </header>

      {loading ? <div className="usage-state" role="status">Loading your usage…</div>
        : error ? <div className="usage-error" role="alert">{error}</div>
          : services.length === 0 ? <div className="usage-state">No usage data is available yet.</div>
            : <div className="usage-grid">
              {services.map(([service, values]) => <section className="usage-card" key={service}>
                <div className="usage-card-heading">
                  <span className="usage-service-mark" aria-hidden="true">{service.slice(0, 1).toUpperCase()}</span>
                  <div>
                    <h2>{SERVICE_LABELS[service] || service}</h2>
                    <p>Rate limit usage</p>
                  </div>
                </div>
                <UsageMeter label="Daily" used={values.daily_used} limit={values.daily_limit} period="day" />
                <UsageMeter label="Weekly" used={values.weekly_used} limit={values.weekly_limit} period="week" />
              </section>)}
            </div>}
    </main>
  </div>
}
