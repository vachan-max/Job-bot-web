import { useState } from 'react'
import { deleteSearchResult } from '../../services/jobFinderService'

function Icon({ name }) {
  const paths = {
    category: <><path d="M4 5h7v6H4zM13 5h7v6h-7zM4 13h7v6H4zM13 13h7v6h-7z" /></>,
    location: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2" /></>,
    work: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></>,
    source: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
    external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></>,
    trash: <><path d="M4 7h16M10 11v6m4-6v6M5.5 7l1 13h11l1-13M9 7V4h6v3" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    warning: <><path d="M10.3 4.3 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 4h.01" /></>,
  }
  return <svg className="jf-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">{paths[name]}</svg>
}

function normalizeReasons(reasons = []) {
  return reasons.map(item => typeof item === 'string' ? { text: item, gap: /\b(gap|missing|lack|without|no experience|not listed|limited)\b/i.test(item) } : { text: item.text || item.reason || '', gap: item.type === 'gap' || item.category === 'gap' }).filter(item => item.text)
}

export default function JobCard({ job, searchId, onDeleted }) {
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [expanded, setExpanded] = useState(false)

  async function handleDelete() {
    if (!job._id) return
    setDeleting(true)
    setError('')
    try {
      await deleteSearchResult(searchId, job._id)
      onDeleted(job._id)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not remove this job. Please try again.')
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  const rawScore = Number(job.match_score)
  const score = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : null
  const scoreTone = score === null ? 'neutral' : score < 40 ? 'low' : score < 70 ? 'medium' : 'high'
  const reasons = normalizeReasons(job.match_reasons)
  const matches = reasons.filter(reason => !reason.gap)
  const gaps = reasons.filter(reason => reason.gap)
  const description = job.description?.trim()
  const longDescription = Boolean(description && description.length > 520)
  const metadata = [
    job.industry && { icon: 'category', text: job.industry },
    job.location && { icon: 'location', text: job.location },
    job.remote_preference && { icon: 'work', text: job.remote_preference },
    job.employment_type && { icon: 'work', text: job.employment_type },
  ].filter(Boolean)

  return <article className="jf-job-card">
    <div className="jf-job-heading">
      <div className="jf-job-title-block">
        <h3 title={job.job_title || undefined}>{job.job_title || 'Job opening'}</h3>
        <p>{job.company || 'Company not listed'}</p>
      </div>
      <div className="jf-job-actions">
        <div className={`jf-score-wrap jf-score-${scoreTone}`} aria-label={score === null ? 'Resume score unavailable' : `Resume score ${score}%`}>
          <div className="jf-score" style={{ '--score': `${score ?? 0}%` }}><strong>{score === null ? '—' : `${score}%`}</strong></div>
          <span>{job.resume_missing || score === null ? 'Resume not found' : 'Resume Score'}</span>
        </div>
        {job.apply_link && <a className="jf-apply" href={job.apply_link} target="_blank" rel="noopener noreferrer" aria-label={`Apply for ${job.job_title || 'this job'} (opens in a new tab)`}>Apply <Icon name="external" /></a>}
        {job._id && <div className="jf-delete-control">{confirmDelete ? <><span className="jf-delete-prompt">Remove this job?</span><button type="button" className="jf-delete-confirm" onClick={handleDelete} disabled={deleting}>{deleting ? 'Removing…' : 'Confirm'}</button><button type="button" className="jf-delete-cancel" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancel</button></> : <button type="button" className="jf-delete-job" onClick={() => setConfirmDelete(true)} disabled={deleting} aria-label="Delete job result" title="Delete job result"><Icon name="trash" /></button>}</div>}
      </div>
    </div>
    <div className="jf-tags" aria-label="Job details">
      {metadata.map((item, index) => <span className="jf-meta-chip" key={`${item.text}-${index}`}><Icon name={item.icon} />{item.text}</span>)}
      {!job.location && <span className="jf-meta-chip jf-meta-muted"><Icon name="location" />Location not listed</span>}
      {metadata.length === 0 && !job.location && <span className="jf-meta-chip jf-meta-muted"><Icon name="category" />Category not listed</span>}
    </div>
    {description ? <div className="jf-description-block"><p className="jf-description">{expanded || !longDescription ? description : `${description.slice(0, 520).trimEnd()}…`}</p>{longDescription && <button type="button" className="jf-description-toggle" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'Show less' : 'Read full description'}</button>}</div> : <p className="jf-description jf-description-empty">No description was provided for this posting.</p>}
    {(matches.length > 0 || gaps.length > 0) && <div className="jf-reason-groups">
      {matches.length > 0 && <section className="jf-reason-group jf-reason-match"><h4><Icon name="check" />Why it matches</h4><ul>{matches.map((reason, index) => <li key={`match-${index}`}>{reason.text}</li>)}</ul></section>}
      {gaps.length > 0 && <section className="jf-reason-group jf-reason-gap"><h4><Icon name="warning" />Gaps</h4><ul>{gaps.map((reason, index) => <li key={`gap-${index}`}>{reason.text}</li>)}</ul></section>}
    </div>}
    {error && <p className="jf-fallback" role="alert">{error}</p>}
    <footer className="jf-job-source"><span><Icon name="source" />{job.source || 'Source not listed'}{job.details_source ? ` · Details: ${job.details_source}` : ''}</span>{job.posted_at && <span>Posted {job.posted_at}</span>}</footer>
  </article>
}
