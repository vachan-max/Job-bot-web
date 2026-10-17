import { useEffect, useRef, useState } from 'react'
import api from '../../api'
import './ResumeUpload.css'

export default function ResumeUpload() {
  const fileRef = useRef(null)
  const [filename, setFilename] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    api.get('/users/me/resume')
      .then(({ data }) => setFilename(data.filename || ''))
      .catch(() => setError('Could not load your resume status.'))
  }, [])

  function pickFile(nextFile) {
    if (!nextFile) return
    if (nextFile.type !== 'application/pdf') {
      setError('Choose a PDF file.')
      return
    }
    if (nextFile.size > 5 * 1024 * 1024) {
      setError('The PDF must be under 5 MB.')
      return
    }
    setError('')
    setNotice('')
    setFile(nextFile)
  }

  async function upload() {
    if (!file) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const form = new FormData()
      form.append('file', file)
      await api.post('/users/me/resume', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setFilename(file.name)
      setFile(null)
      setNotice('Resume uploaded. It will be used to personalize job match scores.')
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setError(err.response?.data?.detail || 'Resume upload failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm('Remove your saved resume?')) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await api.delete('/users/me/resume')
      setFilename('')
      setFile(null)
      setNotice('Saved resume removed.')
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not remove your resume.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="jf-panel jf-resume-panel" aria-labelledby="jf-resume-title">
      <div className="jf-resume-copy">
        <p className="jf-eyebrow">Optional profile context</p>
        <h2 id="jf-resume-title">Personalize your matches</h2>
        <p>Your PDF resume helps the finder score jobs against your experience. It is not sent to job providers.</p>
        {filename && <div className="jf-resume-current"><span>Saved resume</span><strong title={filename}>{filename}</strong><button type="button" onClick={remove} disabled={busy}>Remove</button></div>}
        {file && <p className="jf-resume-selected">Selected: {file.name} · {(file.size / (1024 * 1024)).toFixed(2)} MB</p>}
        {error && <p className="jf-resume-status error" role="alert">{error}</p>}
        {notice && <p className="jf-resume-status" role="status">{notice}</p>}
      </div>
      <div className="jf-resume-actions">
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" onChange={event => pickFile(event.target.files?.[0])} aria-label="Choose a PDF resume" />
        <button type="button" className="jf-secondary" onClick={() => fileRef.current?.click()} disabled={busy}>{filename ? 'Choose replacement' : 'Choose PDF resume'}</button>
        <button type="button" className="jf-primary" onClick={upload} disabled={!file || busy}>{busy ? 'Saving…' : 'Upload resume'}</button>
        <small>PDF only · Maximum 5 MB</small>
      </div>
    </section>
  )
}
