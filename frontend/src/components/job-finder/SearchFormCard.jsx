import { useEffect, useState } from 'react'

const fields = [['job_titles', 'Job titles'], ['industries', 'Industries'], ['locations', 'Locations'], ['skills', 'Skills'], ['keywords', 'Keywords']]
const employmentTypes = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary']
const experienceLevels = [
  ['', 'Any experience'],
  ['Internship', 'Internship'],
  ['0-1 years', 'Entry level (0–1 years)'],
  ['2-4 years', 'Mid-level (2–4 years)'],
  ['4-7 years', 'Senior (4–7 years)'],
  ['7+ years', 'Lead or principal (7+ years)'],
]
function splitValues(value) { return Array.isArray(value) ? value.join(', ') : '' }

function hasAdvancedFilters(filters) {
  return Boolean([filters.industries, filters.skills, filters.keywords, filters.employment_types, filters.experience_level].flat().some(Boolean))
}

export default function SearchFormCard(props) {
  if (!props.filters) return null
  return <SearchFormCardContent key={props.searchId || 'draft'} {...props} />
}

function SearchFormCardContent({ filters, onChange, onSearch, busy, sendEmail, onEmailChange }) {
  const [advancedOpen, setAdvancedOpen] = useState(() => hasAdvancedFilters(filters))
  const [listDrafts, setListDrafts] = useState(() => Object.fromEntries(fields.map(([key]) => [key, splitValues(filters[key])])))
  useEffect(() => {
    setListDrafts(Object.fromEntries(fields.map(([key]) => [key, splitValues(filters[key])])))
  }, [filters])
  function updateListDraft(key, value) {
    setListDrafts(previous => ({ ...previous, [key]: value }))
  }
  function commitList(key) {
    const values = (listDrafts[key] || '').split(',').map(item => item.trim()).filter(Boolean)
    setListDrafts(previous => ({ ...previous, [key]: values.join(', ') }))
    onChange({ ...filters, [key]: values })
  }
  const customExperience = filters.experience_level && !experienceLevels.some(([value]) => value === filters.experience_level)
  const selectedEmploymentType = (filters.employment_types || [])[0] || ''
  const customEmploymentType = selectedEmploymentType && !employmentTypes.includes(selectedEmploymentType)
  return (
    <section className="jf-panel jf-filter-panel">
      <div className="jf-panel-heading"><div><p className="jf-eyebrow">Review before searching</p><h2>Your search filters</h2></div><span className="jf-edit-badge">Editable</span></div>
      <div className="jf-form-grid">
        {fields.filter(([key]) => ['job_titles', 'locations'].includes(key)).map(([key, label]) => <label className="jf-field" key={key}><span>{label}</span><input value={listDrafts[key] ?? splitValues(filters[key])} onChange={event => updateListDraft(key, event.target.value)} onBlur={() => commitList(key)} placeholder="Separate values with commas" /></label>)}
        <label className="jf-field"><span>Work arrangement</span><select value={filters.remote_preference || 'any'} onChange={event => onChange({ ...filters, remote_preference: event.target.value })}><option value="any">Any</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="on-site">On-site</option></select></label>
      </div>
      <details className="jf-advanced" open={advancedOpen} onToggle={event => setAdvancedOpen(event.currentTarget.open)}>
        <summary>Advanced filters <span>Industry, skills, experience and posting date</span></summary>
        <div className="jf-form-grid">
          {fields.filter(([key]) => !['job_titles', 'locations'].includes(key)).map(([key, label]) => <label className="jf-field" key={key}><span>{label}</span><input value={listDrafts[key] ?? splitValues(filters[key])} onChange={event => updateListDraft(key, event.target.value)} onBlur={() => commitList(key)} placeholder="Separate values with commas" /></label>)}
          <label className="jf-field"><span>Experience level</span><select value={customExperience ? filters.experience_level : (filters.experience_level || '')} onChange={event => onChange({ ...filters, experience_level: event.target.value })}>
            {customExperience && <option value={filters.experience_level}>{filters.experience_level} (saved value)</option>}
            {experienceLevels.map(([value, label]) => <option key={value || 'any'} value={value}>{label}</option>)}
          </select></label>
          <label className="jf-field"><span>Employment type</span><select value={selectedEmploymentType} onChange={event => onChange({ ...filters, employment_types: event.target.value ? [event.target.value] : [] })}>
            {customEmploymentType && <option value={selectedEmploymentType}>{selectedEmploymentType} (saved value)</option>}
            <option value="">Any employment type</option>
            {employmentTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select></label>
          <label className="jf-field"><span>Posted</span><select value={filters.date_posted || 'week'} onChange={event => onChange({ ...filters, date_posted: event.target.value })}><option value="any">Any time</option><option value="day">Past day</option><option value="3days">Past 3 days</option><option value="week">Past week</option><option value="month">Past month</option></select></label>
        </div>
      </details>
      <div className="jf-run-row"><label className="jf-email-option"><input type="checkbox" checked={sendEmail} onChange={event => onEmailChange(event.target.checked)} /> Email these results to me too</label><button className="jf-primary" onClick={onSearch} disabled={busy || !(filters.job_titles || []).length}>{busy ? 'Searching…' : 'Confirm and find jobs'}</button></div>
      {!(filters.job_titles || []).length && <p className="jf-validation">Add a job title before searching.</p>}
    </section>
  )
}
