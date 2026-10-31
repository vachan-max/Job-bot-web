const SCHEDULE_TIMEZONE = 'Asia/Kolkata'

function dayLabel(date) {
  const dateParts = new Intl.DateTimeFormat('en-US', { timeZone: SCHEDULE_TIMEZONE, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(date)
  const nowParts = new Intl.DateTimeFormat('en-US', { timeZone: SCHEDULE_TIMEZONE, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date())
  const get = parts => Object.fromEntries(parts.map(part => [part.type, part.value]))
  const d = get(dateParts), n = get(nowParts)
  if (d.year === n.year && d.month === n.month && d.day === n.day) return 'Today'
  const tomorrow = new Date(Date.now() + 86400000)
  const t = get(new Intl.DateTimeFormat('en-US', { timeZone: SCHEDULE_TIMEZONE, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(tomorrow))
  if (d.year === t.year && d.month === t.month && d.day === t.day) return 'Tomorrow'
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', timeZone: SCHEDULE_TIMEZONE })
}

function readableDate(value) {
  if (!value) return 'Not scheduled'
  const date = new Date(value)
  return `${dayLabel(date)}, ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZone: SCHEDULE_TIMEZONE })} IST`
}

export default function SchedulerSection({ searchId, searchLabel, filters, schedule, onScheduleChange, onSave, onRunNow, onDelete, deleting = false, deleteError = '', saveState = 'idle', saveError = '', running, destinationEmail, runMessage, runJobs = [] }) {
  const active = Boolean(schedule.schedule_enabled)
  const result = schedule.last_run_status === 'new_jobs' ? `${schedule.last_new_count || 0} new jobs` : schedule.last_run_status === 'no_new_jobs' ? 'No new jobs' : schedule.last_run_status === 'error' ? 'Run failed' : ''
  return <section className="jf-panel jf-scheduler-section">
    <div className="jf-panel-heading"><div><p className="jf-eyebrow">Automation</p><h2>{searchLabel || 'Job search scheduler'}</h2></div>
      {searchId && <span className={active ? 'jf-scheduler-status is-on' : 'jf-scheduler-status'}>{active ? 'Active' : 'Paused'}</span>}
    </div>
    {!searchId ? <p className="jf-scheduler-empty">Create or select a saved search to set up a daily schedule.</p> : <>
      <p className="jf-scheduler-intro">Run this saved search each day and get only new matches.</p>
      <label className="jf-schedule-toggle"><input type="checkbox" role="switch" checked={active} onChange={event => onScheduleChange({ ...schedule, schedule_enabled: event.target.checked })} /><span>{active ? 'Active' : 'Paused'}</span></label>
      <div className="jf-schedule-fields">
        <label className="jf-field"><span>Daily time</span><input type="time" disabled={!active} value={schedule.schedule_time || '09:00'} onChange={event => onScheduleChange({ ...schedule, schedule_time: event.target.value })} /></label>
      </div>
      <label className="jf-email-option"><input type="checkbox" checked={schedule.email_enabled !== false} onChange={event => onScheduleChange({ ...schedule, email_enabled: event.target.checked })} /> Email me new matches</label>
      {schedule.email_enabled !== false && destinationEmail && <p className="jf-scheduler-email">New matches go to <strong>{destinationEmail}</strong></p>}
      <div className="jf-scheduler-meta"><p><strong>Next run</strong><span>{active ? readableDate(schedule.next_run) : 'Paused'}</span></p><p><strong>Last run</strong><span>{schedule.last_run ? `${readableDate(schedule.last_run)}${result ? `, ${result}` : ''}` : 'No scheduled run yet'}</span></p>{schedule.last_error && <p className="jf-scheduler-error"><strong>Last error</strong><span>{schedule.last_error}</span></p>}</div>
      {schedule.email_enabled === false && runJobs.length > 0 && <div className="jf-scheduled-results"><h3>New matches</h3>{runJobs.map((job, index) => <a key={job.dedupe_key || job.apply_link || index} href={job.apply_link} target="_blank" rel="noreferrer"><strong>{job.job_title}</strong><span>{[job.company, job.location].filter(Boolean).join(' · ')}</span></a>)}</div>}
      {runMessage && <p className="jf-scheduler-message" role="status">{runMessage}</p>}
      <div className="jf-scheduler-actions"><button className={`jf-primary jf-save-${saveState}`} onClick={onSave} disabled={saveState === 'saving' || !(filters?.job_titles || []).length}>{saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Schedule saved ✓' : saveState === 'error' ? 'Failed, try again' : 'Save schedule'}</button><button className="jf-schedule-pause" onClick={onRunNow} disabled={running}>{running ? 'Sending...' : 'Send test now'}</button><button className="jf-delete-search" onClick={onDelete} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete saved search'}</button></div>
      {saveError && <p className="jf-save-error-message" role="alert">{saveError}</p>}
      {deleteError && <p className="jf-delete-error-message" role="alert">{deleteError}</p>}
    </>}
  </section>
}
