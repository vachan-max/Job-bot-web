import { useState } from 'react'
import { deleteSearchResult } from '../../services/jobFinderService'

function TrashIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16M10 11v6m4-6v6M5.5 7l1 13h11l1-13M9 7V4h6v3" /></svg>
}

export default function JobCard({ job, searchId, onDeleted }) {
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!job._id) return
    setDeleting(true)
    setError('')
    try {
      await deleteSearchResult(searchId, job._id)
      onDeleted(job._id)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not remove this job. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const score = Number.isFinite(job.match_score) ? job.match_score : null
  return <article className="jf-job-card"><div className="jf-job-heading"><div className="jf-job-title-block"><h3>{job.job_title || 'Job opening'}</h3><p>{[job.company, job.location, job.posted_at].filter(Boolean).join(' · ') || 'Company or location not listed'}</p></div><div className="jf-job-actions">{score !== null && <div className="jf-score-wrap"><div className="jf-score" style={{ '--score': `${score}%` }}><strong>{score}</strong></div><span>Resume Score: {score}%</span></div>}{job.apply_link && <a className="jf-apply" href={job.apply_link} target="_blank" rel="noreferrer">Apply <span aria-hidden="true">↗</span></a>}{job._id && <button type="button" className="jf-delete-job" onClick={handleDelete} disabled={deleting} aria-label="Delete job result" title="Delete job result">{deleting ? '…' : <TrashIcon />}</button>}</div></div>
    <div className="jf-tags">{job.industry && <span>{job.industry}</span>}{job.company_type && <span>{job.company_type}</span>}{job.posted_at && <span>{job.posted_at}</span>}</div>
    {job.description && <p className="jf-description">{job.description.slice(0, 520)}{job.description.length > 520 ? '…' : ''}</p>}
    {job.match_reasons?.length > 0 && <ul className="jf-reasons">{job.match_reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul>}
    {error && <p className="jf-fallback">{error}</p>}
    <div className="jf-job-source">Source: {job.source || 'Search provider'}{job.details_source ? ` · Details: ${job.details_source}` : ''}</div>
  </article>
}
