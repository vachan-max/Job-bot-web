import { useState, useEffect } from "react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import api from "../api";

const IconBriefcase = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
  </svg>
);
const IconMap = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const IconClock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconStar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const IconPlay = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);
const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconLoader = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);
const IconHistory = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>
  </svg>
);
const IconWhatsapp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const user     = auth.currentUser;

  const [prefs, setPrefs] = useState({
    job_title       : "",
    location        : "",
    experience      : "",
    skills          : "",
    min_score       : 70,
    schedule_time   : "09:00",
    use_ai_filter   : true,
    use_cover_letter: true,
    use_resume_match: true,
    send_whatsapp   : true,
  });
  const [loadingPrefs,  setLoadingPrefs]  = useState(true);
  const [savingPrefs,   setSavingPrefs]   = useState(false);
  const [savedOk,       setSavedOk]       = useState(false);
  const [running,       setRunning]       = useState(false);
  const [runResult,     setRunResult]     = useState(null);
  const [schedulerStatus, setSchedulerStatus] = useState(null);
  const [recentJobs,    setRecentJobs]    = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [usage,         setUsage]         = useState(null);

  useEffect(() => {
    fetchPrefs();
    fetchSchedulerStatus();
    fetchRecentJobs();
    fetchUsage();
  }, []);

  async function fetchPrefs() {
    try {
      setLoadingPrefs(true);
      const res = await api.get("/users/me/preferences");
      if (res.data) setPrefs(p => ({ ...p, ...res.data }));
    } catch (e) { console.error("fetchPrefs error:", e); }
    finally { setLoadingPrefs(false); }
  }

  async function fetchSchedulerStatus() {
    try {
      const res = await api.get("/jobs/scheduler-status");
      setSchedulerStatus(res.data);
    } catch (e) { console.error("schedulerStatus error:", e); }
  }

  async function fetchRecentJobs() {
    try {
      setLoadingHistory(true);
      const res = await api.get("/jobs/history");
      let data  = res.data;
      if (!Array.isArray(data)) data = data?.jobs || data?.alerts || data?.data || [];
      setRecentJobs(data.slice(0, 3));
    } catch (e) { console.error("fetchHistory error:", e); setRecentJobs([]); }
    finally { setLoadingHistory(false); }
  }

  async function fetchUsage() {
    try {
      const res = await api.get("/jobs/usage");
      setUsage(res.data);
    } catch (e) { console.error("fetchUsage error:", e); }
  }

  async function handleSavePrefs(e) {
    e.preventDefault();
    try {
      setSavingPrefs(true);
      setSavedOk(false);
      await api.put("/users/me/preferences", prefs);
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 3000);
      fetchSchedulerStatus();
    } catch (err) {
      console.error("savePrefs error:", err);
      alert("Failed to save preferences.");
    } finally { setSavingPrefs(false); }
  }

  async function handleRunNow() {
    try {
      setRunning(true);
      setRunResult(null);
      const res = await api.post("/jobs/run");
      setRunResult({ success: true, message: res.data.message, jobs_sent: res.data.jobs_sent ?? null });
      fetchRecentJobs();
      fetchUsage();
    } catch (err) {
      const msg = err.response?.data?.detail || "Something went wrong.";
      setRunResult({ success: false, message: msg });
    } finally { setRunning(false); }
  }

  async function handleSignOut() {
    await signOut(auth);
    navigate("/login");
  }

  const initials = user?.displayName
    ? user.displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const scoreColor = s => s >= 85 ? "#22c55e" : s >= 70 ? "#f59e0b" : "#ef4444";

  const usageBar = (used, limit) => {
    const pct = Math.min((used / limit) * 100, 100);
    const col  = used >= limit ? "#ef4444" : used >= limit * 0.8 ? "#f59e0b" : "#6366f1";
    return { pct, col };
  };

  return (
    <div style={styles.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes fadeUp{ from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        .card { animation: fadeUp .35s ease both; }
        .card:nth-child(1){animation-delay:.05s} .card:nth-child(2){animation-delay:.12s} .card:nth-child(3){animation-delay:.19s}
        .field-input:focus { outline:none; border-color:#6366f1!important; box-shadow:0 0 0 3px rgba(99,102,241,.15); }
        .btn-save:hover:not(:disabled)  { background:#4f46e5!important; transform:translateY(-1px); }
        .btn-run:hover:not(:disabled)   { background:#059669!important; transform:translateY(-1px); }
        .btn-logout:hover  { background:rgba(255,255,255,.08)!important; }
        .btn-history:hover { background:rgba(99,102,241,.12)!important; color:#6366f1!important; }
        .nav-link:hover    { opacity:1!important; }
        .job-card:hover    { border-color:rgba(99,102,241,.4)!important; background:rgba(99,102,241,.04)!important; }
        .score-pill { font-family:'Syne',sans-serif; font-size:13px; font-weight:600; padding:2px 10px; border-radius:99px; }
        input[type=range] { -webkit-appearance:none; width:100%; height:4px; border-radius:2px;
          background:linear-gradient(to right,#6366f1 0%,#6366f1 calc((var(--val,70) - 0)/(100 - 0)*100%),#e2e8f0 calc((var(--val,70) - 0)/(100 - 0)*100%),#e2e8f0 100%); }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:18px; height:18px; border-radius:50%; background:#6366f1; cursor:pointer; border:2px solid #fff; box-shadow:0 1px 4px rgba(0,0,0,.2); }
      `}</style>

      {/* NAV */}
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <span style={styles.logo}>JobBot</span>
          <div style={styles.navLinks}>
            <button style={styles.navLink} className="nav-link" onClick={() => navigate("/history")}>
              <IconHistory /> History
            </button>
            <button style={styles.navLink} className="nav-link" onClick={() => navigate("/profile")}>
              <div style={styles.avatar}>{initials}</div>
              {user?.displayName?.split(" ")[0] || "Profile"}
            </button>
            <button style={{ ...styles.navLink, color: "#ef4444" }} className="btn-logout" onClick={handleSignOut}>
              <IconLogout /> Sign out 
            </button>
          </div>
        </div>
      </nav>

      <main style={styles.main}>
        {/* greeting */}
        <div style={styles.greeting}>
          <div>
            <p style={styles.greetSub}>Good to see you,</p>
            <h1 style={styles.greetName}>{user?.displayName || "Vachan"}</h1>
          </div>
          {schedulerStatus && (
            <div style={styles.statusBadge}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:"#22c55e", display:"inline-block", animation:"pulse 2s infinite" }} />
              Scheduler running · next at {prefs.schedule_time}
            </div>
          )}
        </div>

        <div style={styles.grid}>
          {/* LEFT: preferences */}
          <section style={styles.card} className="card">
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Job Preferences</h2>
              <p style={styles.cardSub}>What jobs should we find for you?</p>
            </div>
            {loadingPrefs ? (
              <div style={styles.loadingState}><IconLoader /> Loading...</div>
            ) : (
              <form onSubmit={handleSavePrefs} style={styles.form}>
                <div style={styles.fieldRow}>
                  <FieldGroup icon={<IconBriefcase />} label="Job Title" htmlFor="job_title">
                    <input id="job_title" className="field-input" style={styles.input}
                      placeholder="e.g. AI Engineer" value={prefs.job_title}
                      onChange={e => setPrefs({ ...prefs, job_title: e.target.value })} />
                  </FieldGroup>
                  <FieldGroup icon={<IconMap />} label="Location" htmlFor="location">
                    <input id="location" className="field-input" style={styles.input}
                      placeholder="e.g. Bangalore" value={prefs.location}
                      onChange={e => setPrefs({ ...prefs, location: e.target.value })} />
                  </FieldGroup>
                </div>

                <FieldGroup icon={<IconStar />} label="Experience Level" htmlFor="experience">
                  <select id="experience" className="field-input" style={{ ...styles.input, cursor:"pointer", appearance:"none" }}
                    value={prefs.experience} onChange={e => setPrefs({ ...prefs, experience: e.target.value })}>
                    <option value="">Select experience</option>
                    <option value="0-1 years">Fresher (0–1 years)</option>
                    <option value="0-2 years">Junior (0–2 years)</option>
                    <option value="2-4 years">Mid-level (2–4 years)</option>
                    <option value="4-7 years">Senior (4–7 years)</option>
                    <option value="7+ years">Expert (7+ years)</option>
                  </select>
                </FieldGroup>

                <FieldGroup icon={<IconBriefcase />} label="Key Skills (comma separated)" htmlFor="skills">
                  <input id="skills" className="field-input" style={styles.input}
                    placeholder="e.g. Python, Machine Learning, FastAPI" value={prefs.skills}
                    onChange={e => setPrefs({ ...prefs, skills: e.target.value })} />
                </FieldGroup>

                <div style={styles.fieldRow}>
                  <FieldGroup icon={<IconClock />} label="Daily Alert Time" htmlFor="schedule_time">
                    <input id="schedule_time" type="time" className="field-input" style={styles.input}
                      value={prefs.schedule_time}
                      onChange={e => setPrefs({ ...prefs, schedule_time: e.target.value })} />
                  </FieldGroup>
                  <FieldGroup icon={<IconStar />} label={`Min AI Score: ${prefs.min_score}`} htmlFor="min_score">
                    <input id="min_score" type="range" min="0" max="100" step="5"
                      value={prefs.min_score}
                      onChange={e => { const v = Number(e.target.value); setPrefs({ ...prefs, min_score: v }); e.target.style.setProperty("--val", v); }}
                      ref={el => { if (el) el.style.setProperty("--val", prefs.min_score); }} />
                    <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                      <span style={{ color:"#6b7280", fontSize:11 }}>0</span>
                      <span style={{ color:"#6b7280", fontSize:11 }}>100</span>
                    </div>
                  </FieldGroup>
                </div>

                {/* Pipeline toggles */}
                <div style={styles.togglesCard}>
                  <p style={{ fontSize:14, fontWeight:600, color:"#111827", marginBottom:2 }}>Pipeline Features</p>
                  <p style={{ fontSize:12, color:"#9ca3af", marginBottom:14 }}>Choose what happens when jobs are fetched</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    {[
                      { key:"use_ai_filter",    label:"AI Scoring & Filter",  desc:"Score jobs with Groq and filter by min score" },
                      { key:"use_cover_letter", label:"Cover Letter",          desc:"Generate a tailored cover letter per job" },
                      { key:"use_resume_match", label:"Resume Match %",        desc:"Calculate how well job matches your resume" },
                      { key:"send_whatsapp",    label:"WhatsApp Delivery",     desc:"Send results to your WhatsApp number" },
                    ].map(({ key, label, desc }) => (
                      <div key={key} style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ flex:1 }}>
                          <p style={{ fontSize:13, fontWeight:500, color:"#374151", marginBottom:1 }}>{label}</p>
                          <p style={{ fontSize:11, color:"#9ca3af" }}>{desc}</p>
                        </div>
                        <button type="button"
                          onClick={() => setPrefs(p => ({ ...p, [key]: !p[key] }))}
                          style={{ position:"relative", width:44, height:24, borderRadius:99, border:"none",
                            cursor:"pointer", flexShrink:0, transition:"background .2s", padding:0,
                            background: prefs[key] ? "#6366f1" : "#e5e7eb" }}>
                          <span style={{ position:"absolute", top:2, width:20, height:20, borderRadius:"50%",
                            background:"#fff", boxShadow:"0 1px 3px rgba(0,0,0,.2)", transition:"transform .2s", display:"block",
                            transform: prefs[key] ? "translateX(20px)" : "translateX(2px)" }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display:"flex", alignItems:"center", gap:16, paddingTop:4 }}>
                  <button type="submit" className="btn-save" disabled={savingPrefs} style={styles.btnSave}>
                    {savingPrefs ? <><IconLoader /> Saving...</> : savedOk ? <><IconCheck /> Saved!</> : "Save Preferences"}
                  </button>
                  {savedOk && <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:13, color:"#16a34a" }}><IconCheck /> Preferences updated</span>}
                </div>
              </form>
            )}
          </section>

          {/* RIGHT col */}
          <div style={styles.rightCol}>

            {/* Run Now */}
            <section style={{ ...styles.card, textAlign:"center", paddingTop:32, paddingBottom:32 }} className="card">
              <div style={{ width:52, height:52, borderRadius:14, background:"rgba(99,102,241,.1)", color:"#6366f1",
                display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                <IconWhatsapp />
              </div>
              <h2 style={styles.cardTitle}>Send Jobs Now</h2>
              <p style={styles.cardSub}>Manually trigger a job search and send results to WhatsApp.</p>
              <button className="btn-run" onClick={handleRunNow} disabled={running} style={styles.btnRun}>
                {running ? <><IconLoader /> Fetching jobs...</> : <><IconPlay /> Run Now</>}
              </button>
              {runResult && (
                <div style={{ ...styles.runResult,
                  background  : runResult.success ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.08)",
                  borderColor : runResult.success ? "rgba(34,197,94,.3)"  : "rgba(239,68,68,.3)",
                  color       : runResult.success ? "#16a34a"             : "#dc2626" }}>
                  {runResult.success ? <IconCheck /> : "✕"}&nbsp;
                  {runResult.message}
                  {runResult.jobs_sent != null && ` (${runResult.jobs_sent} jobs sent)`}
                </div>
              )}
            </section>

            {/* API Usage */}
            {usage && (
              <section style={styles.card} className="card">
                <h2 style={{ ...styles.cardTitle, marginBottom:4 }}>API Usage Today</h2>
                <p style={{ ...styles.cardSub, marginBottom:16 }}>Daily limits protect your free quotas</p>
                {[
                  { label:"Job searches (JSearch)", key:"jsearch" },
                  { label:"AI calls (Groq)",         key:"groq"    },
                  { label:"WhatsApp messages",        key:"twilio"  },
                ].map(({ label, key }) => {
                  const u = usage[key] || { daily_used:0, daily_limit:1, weekly_used:0, weekly_limit:1 };
                  const { pct, col } = usageBar(u.daily_used, u.daily_limit);
                  return (
                    <div key={key} style={{ marginBottom:16 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:6 }}>
                        <span style={{ color:"#374151", fontWeight:500 }}>{label}</span>
                        <span style={{ color:"#6b7280" }}>{u.daily_used}/{u.daily_limit} today · {u.weekly_used}/{u.weekly_limit} week</span>
                      </div>
                      <div style={{ height:6, borderRadius:99, background:"#e5e7eb" }}>
                        <div style={{ height:"100%", borderRadius:99, width:`${pct}%`, background:col, transition:"width .4s ease" }}/>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {/* Recent alerts */}
            <section style={styles.card} className="card">
              <div style={{ ...styles.cardHeader, marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <h2 style={styles.cardTitle}>Recent Alerts</h2>
                <button className="btn-history" style={styles.btnHistory} onClick={() => navigate("/history")}>View all</button>
              </div>
              {loadingHistory ? (
                <div style={styles.loadingState}><IconLoader /> Loading...</div>
              ) : recentJobs.length === 0 ? (
                <div style={{ textAlign:"center", padding:"24px 0" }}>
                  <p style={{ color:"#9ca3af", fontSize:14 }}>No jobs sent yet.</p>
                  <p style={{ color:"#9ca3af", fontSize:13, marginTop:4 }}>Run now or wait for the scheduler.</p>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {recentJobs.map((job, i) => (
                    <div key={i} className="job-card" style={styles.jobCard}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                        <span style={{ fontWeight:500, fontSize:14, color:"#111827" }}>{job.job_title || "Job"}</span>
                        <span className="score-pill" style={{ background:`${scoreColor(job.ai_score)}18`, color:scoreColor(job.ai_score) }}>
                          {job.ai_score ?? "--"}
                        </span>
                      </div>
                      <div style={{ display:"flex", gap:6, fontSize:12, color:"#6b7280" }}>
                        <span>{job.company || "Company"}</span>
                        {job.location && <><span style={{ color:"#d1d5db" }}>·</span><span>{job.location}</span></>}
                      </div>
                      {job.apply_link && (
                        <a href={job.apply_link} target="_blank" rel="noreferrer"
                          style={{ display:"inline-block", marginTop:8, fontSize:12, color:"#6366f1", fontWeight:500, textDecoration:"none" }}>
                          Apply →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function FieldGroup({ icon, label, htmlFor, children }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6, flex:1 }}>
      <label htmlFor={htmlFor} style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, fontWeight:500, color:"#374151" }}>
        <span style={{ color:"#6366f1", display:"flex", alignItems:"center" }}>{icon}</span>
        {label}
      </label>
      {children}
    </div>
  );
}

const styles = {
  root      : { minHeight:"100vh", background:"#f8f9fc", fontFamily:"'DM Sans',sans-serif", color:"#111827" },
  nav       : { background:"#fff", borderBottom:"1px solid #e5e7eb", position:"sticky", top:0, zIndex:10 },
  navInner  : { maxWidth:1200, margin:"0 auto", padding:"0 24px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between" },
  logo      : { fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:22, color:"#6366f1", letterSpacing:"-0.5px" },
  navLinks  : { display:"flex", alignItems:"center", gap:8 },
  navLink   : { display:"flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:8, border:"none", background:"transparent", color:"#6b7280", fontSize:14, fontFamily:"'DM Sans',sans-serif", cursor:"pointer", opacity:0.8, transition:"all .2s" },
  avatar    : { width:26, height:26, borderRadius:"50%", background:"#6366f1", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:600 },
  main      : { maxWidth:1200, margin:"0 auto", padding:"32px 24px" },
  greeting  : { display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:12 },
  greetSub  : { fontSize:14, color:"#6b7280", marginBottom:2 },
  greetName : { fontFamily:"'Syne',sans-serif", fontSize:32, fontWeight:700, color:"#111827", letterSpacing:"-1px" },
  statusBadge: { display:"flex", alignItems:"center", gap:8, padding:"6px 14px", borderRadius:99, background:"rgba(34,197,94,.1)", color:"#16a34a", fontSize:13, fontWeight:500, border:"1px solid rgba(34,197,94,.2)" },
  grid      : { display:"grid", gridTemplateColumns:"1fr 380px", gap:20, alignItems:"start" },
  card      : { background:"#fff", borderRadius:16, border:"1px solid #e5e7eb", padding:28, boxShadow:"0 1px 4px rgba(0,0,0,.04)" },
  cardHeader: { marginBottom:24 },
  cardTitle : { fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:700, color:"#111827", marginBottom:4 },
  cardSub   : { fontSize:13, color:"#6b7280" },
  loadingState: { display:"flex", alignItems:"center", gap:8, color:"#9ca3af", fontSize:14, padding:"20px 0" },
  form      : { display:"flex", flexDirection:"column", gap:20 },
  fieldRow  : { display:"flex", gap:16, flexWrap:"wrap" },
  input     : { width:"100%", padding:"10px 14px", borderRadius:10, border:"1.5px solid #e5e7eb", fontSize:14, color:"#111827", background:"#fafafa", fontFamily:"'DM Sans',sans-serif", transition:"border-color .2s, box-shadow .2s" },
  togglesCard: { background:"#f8f9fc", border:"1px solid #e5e7eb", borderRadius:12, padding:"16px 20px" },
  btnSave   : { display:"flex", alignItems:"center", gap:8, padding:"11px 24px", borderRadius:10, border:"none", background:"#6366f1", color:"#fff", fontSize:14, fontWeight:500, fontFamily:"'DM Sans',sans-serif", cursor:"pointer", transition:"all .2s" },
  rightCol  : { display:"flex", flexDirection:"column", gap:20 },
  btnRun    : { display:"flex", alignItems:"center", justifyContent:"center", gap:8, width:"100%", padding:"13px", marginTop:20, borderRadius:10, border:"none", background:"#10b981", color:"#fff", fontSize:15, fontWeight:500, fontFamily:"'DM Sans',sans-serif", cursor:"pointer", transition:"all .2s" },
  runResult : { display:"flex", alignItems:"center", gap:6, marginTop:14, padding:"10px 14px", borderRadius:10, border:"1px solid", fontSize:13, fontWeight:500, textAlign:"left" },
  btnHistory: { padding:"4px 12px", borderRadius:8, border:"1.5px solid #e5e7eb", background:"transparent", color:"#6b7280", fontSize:13, fontFamily:"'DM Sans',sans-serif", cursor:"pointer", transition:"all .2s", fontWeight:500 },
  jobCard   : { padding:"12px 14px", borderRadius:10, border:"1px solid #e5e7eb", transition:"all .2s", cursor:"default" },
};