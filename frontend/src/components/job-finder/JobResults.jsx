import JobCard from './JobCard'

export default function JobResults({ jobs, loading, searchInfo }) {
  if (loading) return <section className="jf-panel jf-results"><div className="jf-loading"><span className="jf-spinner" />Searching job sources and preparing results…</div></section>
  if (!searchInfo && !jobs?.length) return null
  return <section className="jf-results"><div className="jf-results-heading"><div><p className="jf-eyebrow">Search results</p><h2>{jobs.length ? `${jobs.length} matching jobs` : 'No matches yet'}</h2></div>{searchInfo?.provider && <span className="jf-provider">Found via {searchInfo.provider === 'serpapi' ? 'Google Jobs' : 'JSearch fallback'}</span>}</div>
    {searchInfo?.message && <p className="jf-search-message">{searchInfo.message}</p>}{searchInfo?.fallback_reason && <p className="jf-fallback">Google Jobs was unavailable or empty, so the search used JSearch fallback.</p>}
    {searchInfo?.email_sent && <p className="jf-search-message">Results were also sent to your email.</p>}{searchInfo?.email_error && <p className="jf-fallback">{searchInfo.email_error}</p>}
    {jobs.length > 0 ? <div className="jf-job-list">{jobs.map(job => <JobCard key={job._id || job.apply_link} job={job} />)}</div> : <div className="jf-empty">Try a broader location, role, or posting date, then refine your filters.</div>}
    <p className="jf-disclaimer">Match scores are estimates based on available posting text. They are not a guarantee of eligibility or hiring status.</p>
  </section>
}
