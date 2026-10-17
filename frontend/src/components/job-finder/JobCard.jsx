export default function JobCard({ job }) {
  return <article className="jf-job-card"><div className="jf-job-heading"><div><h3>{job.job_title || 'Job opening'}</h3><p>{[job.company, job.location].filter(Boolean).join(' · ') || 'Company or location not listed'}</p></div>{Number.isFinite(job.match_score) && <div className="jf-score"><strong>{job.match_score}</strong><span>match</span></div>}</div>
    <div className="jf-tags">{job.industry && <span>{job.industry}</span>}{job.company_type && <span>{job.company_type}</span>}{job.posted_at && <span>{job.posted_at}</span>}</div>
    {job.description && <p className="jf-description">{job.description.slice(0, 520)}{job.description.length > 520 ? '…' : ''}</p>}
    {job.match_reasons?.length > 0 && <ul className="jf-reasons">{job.match_reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul>}
    <div className="jf-job-footer"><span>Source: {job.source || 'Search provider'}{job.details_source ? ` · Details: ${job.details_source}` : ''}</span><a className="jf-apply" href={job.apply_link} target="_blank" rel="noreferrer">View posting ↗</a></div>
  </article>
}
