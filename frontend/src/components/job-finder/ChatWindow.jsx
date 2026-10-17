import { useEffect, useRef, useState } from 'react'

export default function ChatWindow({ messages, onSend, busy }) {
  const [value, setValue] = useState('')
  const bottomRef = useRef(null)
  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages, busy])

  function submit(event) {
    event.preventDefault()
    const message = value.trim()
    if (!message || busy) return
    setValue('')
    onSend(message)
  }

  return (
    <section className="jf-panel jf-chat-panel">
      <div className="jf-panel-heading"><div><p className="jf-eyebrow">Search assistant</p><h2>Tell me what you’re looking for</h2></div><span className="jf-safe-note">Search runs only after you confirm</span></div>
      <div className="jf-messages" aria-live="polite">
        {messages.length === 0 && <div className="jf-welcome"><span className="jf-spark">✳</span><p>Describe a role, skills, location, or the kind of workplace you prefer.</p>
          <div className="jf-suggestions"><button type="button" onClick={() => setValue('Find entry-level fintech analyst jobs in Bengaluru')}>Fintech roles in Bengaluru</button><button type="button" onClick={() => setValue('Find remote customer support jobs, full-time, posted this week')}>Remote support roles</button><button type="button" onClick={() => setValue('Find software engineering internships in India')}>Internships across India</button></div>
        </div>}
        {messages.map((message, index) => <div className={`jf-message jf-message-${message.role}`} key={`${index}-${message.content}`}><span className="jf-message-label">{message.role === 'user' ? 'You' : 'Finder'}</span><p>{message.content}</p></div>)}
        {busy && <div className="jf-typing"><span /><span /><span /> Reading your request…</div>}<div ref={bottomRef} />
      </div>
      <form className="jf-chat-form" onSubmit={submit}><textarea value={value} onChange={event => setValue(event.target.value)} rows={2} placeholder="e.g. Find marketing roles at fintech companies in Mumbai…" aria-label="Describe your job search" onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(event) } }} /><button className="jf-primary jf-send" type="submit" disabled={!value.trim() || busy}>{busy ? 'Thinking…' : 'Interpret'}</button></form>
      <p className="jf-caption">Your message updates filters only. No external search happens until you confirm below.</p>
    </section>
  )
}
