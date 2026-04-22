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
const IconEmail = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
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
  const [loadingPrefs,    setLoadingPrefs]    = useState(true);
  const [savingPrefs,     setSavingPrefs]     = useState(false);
  const [savedOk,         setSavedOk]         = useState(false);
  const [running,         setRunning]         = useState(false);
  const [schedulerStatus, setSchedulerStatus] = useState(null);
  const [recentJobs,      setRecentJobs]      = useState([]);
  const [loadingHistory,  setLoadingHistory]  = useState(true);
  const [usage,           setUsage]           = useState(null);

  // ── Persist run result across navigation ──────────────
  const [runResult, setRunResult] = useState(() => {
    try {
      const saved = localStorage.getItem("lastRunResult");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  function saveRunResult(result) {
    setRunResult(result);
    if (result) {
      localStorage.setItem("lastRunResult", JSON.stringify(result));
    } else {
      localStorage.removeItem("lastRunResult");
    }
  }

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

  function to12Hour(time24) {
    if (!time24) return "";
    const [h, m] = time24.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour   = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
  }

  async function handleRunNow() {
    try {
      setRunning(true);
      saveRunResult(null);
      const res = await api.post("/jobs/run");
      const result = {
        success  : true,
        message  : res.data.message,
        jobs_sent: res.data.jobs_sent ?? null,
        time     : new Date().toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" }),
      };
      saveRunResult(result);
      fetchRecentJobs();
      fetchUsage();
    } catch (err) {
      const msg = err.response?.data?.detail || "Something went wrong.";
      saveRunResult({ success: false, message: msg });
    } finally { setRunning(false); }
  }

  async function handleSignOut() {
    await signOut(auth);
    navigate("/login");
  }

  const initials = user?.displayName
    ? user.displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const scoreColor = s => s >= 85 ? "#10b981" : s >= 70 ? "#f59e0b" : "#ef4444";

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
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes fadeUp{ from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        .card { animation: fadeUp .35s ease both; transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .card:hover { transform: translateY(-2px); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        .card:nth-child(1){animation-delay:.05s} .card:nth-child(2){animation-delay:.12s} .card:nth-child(3){animation-delay:.19s}
        .field-input:focus { outline:none; border-color:#6366f1!important; box-shadow:0 0 0 4px rgba(99,102,241,.1); }
        .btn-save:hover:not(:disabled)  { background:#4f46e5!important; transform:translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.3); }
        .btn-run:hover:not(:disabled)   { background:#dcfce7!important; transform:translateY(-1px); box-shadow: 0 4px 12px rgba(16,185,129,0.15); }
        .btn-logout:hover  { background:rgba(239,68,68,.05)!important; }
        .btn-history:hover { background:#f8fafc!important; border-color:#6366f1!important; color:#6366f1!important; }
        .nav-link:hover    { background: #f8fafc; color: #111827!important; }
        .job-card:hover    { border-color:#6366f1!important; background:rgba(99,102,241,.02)!important; transform:translateY(-2px); }
        .score-pill { font-family:'Syne',sans-serif; font-size:12px; font-weight:700; padding:4px 12px; border-radius:99px; }
        input[type=range] { -webkit-appearance:none; width:100%; height:6px; border-radius:3px;
          background:linear-gradient(to right,#6366f1 0%,#6366f1 calc((var(--val,70) - 0)/(100 - 0)*100%),#e2e8f0 calc((var(--val,70) - 0)/(100 - 0)*100%),#e2e8f0 100%); }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:20px; height:20px; border-radius:50%; background:#6366f1; cursor:pointer; border:3px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,0.15); transition: transform 0.1s; }
        input[type=range]::-webkit-slider-thumb:hover { transform: scale(1.1); }
        @media (max-width: 1024px) { .dashboard-grid { grid-template-columns: 1fr!important; } .right-col { order: -1; } }
        @media (max-width: 768px) {
          .nav-inner { padding: 0 16px!important; }
          .nav-link-text { display: none; }
          .nav-link { padding: 8px!important; }
          .main-content { padding: 24px 16px!important; }
          .greeting-container { flex-direction: column; align-items: flex-start!important; gap: 16px; }
          .greet-name { font-size: 28px!important; }
          .field-row { gap: 12px!important; }
          .card { padding: 20px!important; }
        }
      `}</style>

      {/* NAV */}
      <nav style={styles.nav}>
        <div style={styles.navInner} className="nav-inner">
          <span style={styles.logo}>PingScore</span>
          <div style={styles.navLinks}>
            <button style={styles.navLink} className="nav-link" onClick={() => navigate("/history")}>
              <IconHistory /> <span className="nav-link-text">History</span>
            </button>
            <button style={styles.navLink} className="nav-link" onClick={() => navigate("/profile")}>
              <div style={styles.avatar}>{initials}</div>
              <span className="nav-link-text">{user?.displayName?.split(" ")[0] || "Profile"}</span>
            </button>
            <button style={{ ...styles.navLink, color: "#ef4444" }} className="nav-link btn-logout" onClick={handleSignOut}>
              <IconLogout /> <span className="nav-link-text">Sign out</span>
            </button>
          </div>
        </div>
      </nav>

      <main style={styles.main} className="main-content">
        {/* greeting */}
        <div style={styles.greeting} className="greeting-container">
          <div>
            <p style={styles.greetSub}>Welcome back,</p>
            <h1 style={styles.greetName} className="greet-name">{user?.displayName || "Vachan"}</h1>
          </div>
          {schedulerStatus && (
            <div style={styles.statusBadge}>
              <span style={{ width:10, height:10, borderRadius:"50%", background:"#10b981", display:"inline-block", animation:"pulse 2s infinite" }} />
              Scheduler active · {to12Hour(prefs.schedule_time)}
            </div>
          )}
        </div>

        <div style={styles.grid} className="dashboard-grid">
          {/* LEFT: preferences */}
          <section style={styles.card} className="card">
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Job Preferences</h2>
              <p style={styles.cardSub}>Tailor your automated job search settings.</p>
            </div>
            {loadingPrefs ? (
              <div style={styles.loadingState}><IconLoader /> Loading preferences...</div>
            ) : (
              <form onSubmit={handleSavePrefs} style={styles.form}>
                <div style={styles.fieldRow} className="field-row">
                  <FieldGroup icon={<IconBriefcase />} label="Job Title" htmlFor="job_title">
                    <input id="job_title" className="field-input" style={styles.input}
                      placeholder="e.g. Software Engineer" value={prefs.job_title}
                      onChange={e => setPrefs({ ...prefs, job_title: e.target.value })} />
                  </FieldGroup>
                  <FieldGroup icon={<IconMap />} label="Location" htmlFor="location">
                    <input id="location" className="field-input" style={styles.input}
                      placeholder="e.g. Remote, Bangalore" value={prefs.location}
                      onChange={e => setPrefs({ ...prefs, location: e.target.value })} />
                  </FieldGroup>
                </div>

                <div style={styles.fieldRow} className="field-row">
                  <FieldGroup icon={<IconStar />} label="Experience" htmlFor="experience">
                    <select id="experience" className="field-input" style={{ ...styles.input, cursor:"pointer", appearance:"none" }}
                      value={prefs.experience} onChange={e => setPrefs({ ...prefs, experience: e.target.value })}>
                      <option value="">Any level</option>
                      <option value="0-1 years">Fresher (0–1 years)</option>
                      <option value="0-2 years">Junior (0–2 years)</option>
                      <option value="2-4 years">Mid-level (2–4 years)</option>
                      <option value="4-7 years">Senior (4–7 years)</option>
                      <option value="7+ years">Lead/Expert (7+ years)</option>
                    </select>
                  </FieldGroup>
                  <FieldGroup icon={<IconClock />} label="Alert Time" htmlFor="schedule_time">
                    <input id="schedule_time" type="time" className="field-input" style={styles.input}
                      value={prefs.schedule_time}
                      onChange={e => setPrefs({ ...prefs, schedule_time: e.target.value })} />
                  </FieldGroup>
                </div>

                <FieldGroup icon={<IconBriefcase />} label="Skills (comma separated)" htmlFor="skills">
                  <input id="skills" className="field-input" style={styles.input}
                    placeholder="e.g. React, Python, AWS" value={prefs.skills}
                    onChange={e => setPrefs({ ...prefs, skills: e.target.value })} />
                </FieldGroup>

                <div style={{ marginBottom: 8 }}>
                  <label style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                    <span style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:600, color:"#374151" }}>
                      <span style={{ color:"#6366f1" }}><IconStar /></span> Min Match Score
                    </span>
                    <span style={{ fontSize:14, fontWeight:700, color:"#6366f1", background:"#eef2ff", padding:"2px 8px", borderRadius:6 }}>{prefs.min_score}%</span>
                  </label>
                  <input id="min_score" type="range" min="0" max="100" step="5"
                    style={{ cursor: "pointer" }}
                    value={prefs.min_score}
                    onChange={e => { const v = Number(e.target.value); setPrefs({ ...prefs, min_score: v }); e.target.style.setProperty("--val", v); }}
                    ref={el => { if (el) el.style.setProperty("--val", prefs.min_score); }} />
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:8 }}>
                    <span style={{ color:"#94a3b8", fontSize:11, fontWeight:500 }}>Broad Match</span>
                    <span style={{ color:"#94a3b8", fontSize:11, fontWeight:500 }}>Perfect Fit Only</span>
                  </div>
                </div>

                {/* Pipeline toggles */}
                <div style={styles.togglesCard}>
                  <p style={{ fontSize:14, fontWeight:700, color:"#111827", marginBottom:4 }}>Automation Pipeline</p>
                  <p style={{ fontSize:12, color:"#64748b", marginBottom:16 }}>Configure what happens when a match is found</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                    {[
                      { key:"use_ai_filter",    label:"AI Intelligence",   desc:"Use LLM to score relevance" },
                      { key:"use_cover_letter", label:"Smart Cover Letter", desc:"Generate tailored letters" },
                      { key:"use_resume_match", label:"Resume Analysis",   desc:"Compare against your CV" },
                      { key:"send_whatsapp",    label:"Email Alerts",      desc:"Receive instant notifications" },
                    ].map(({ key, label, desc }) => (
                      <div key={key} style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ flex:1 }}>
                          <p style={{ fontSize:13, fontWeight:600, color:"#334155", marginBottom:1 }}>{label}</p>
                          <p style={{ fontSize:11, color:"#94a3b8" }}>{desc}</p>
                        </div>
                        <button type="button"
                          onClick={() => setPrefs(p => ({ ...p, [key]: !p[key] }))}
                          style={{ position:"relative", width:40, height:22, borderRadius:99, border:"none",
                            cursor:"pointer", flexShrink:0, transition:"background .2s", padding:0,
                            background: prefs[key] ? "#10b981" : "#e2e8f0" }}>
                          <span style={{ position:"absolute", top:2, width:18, height:18, borderRadius:"50%",
                            background:"#fff", boxShadow:"0 1px 2px rgba(0,0,0,0.1)", transition:"transform .2s", display:"block",
                            transform: prefs[key] ? "translateX(20px)" : "translateX(2px)" }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display:"flex", alignItems:"center", gap:16, paddingTop:4 }}>
                  <button type="submit" className="btn-save" disabled={savingPrefs} style={styles.btnSave}>
                    {savingPrefs ? <><IconLoader /> Saving...</> : savedOk ? <><IconCheck /> Settings Saved</> : "Update Preferences"}
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* RIGHT col */}
          <div style={styles.rightCol} className="right-col">

            {/* Run Now */}
            <section style={{ ...styles.card, textAlign:"center", padding:32 }} className="card">
              <div style={{ width:56, height:56, borderRadius:20, background:"#f0fdf4", color:"#16a34a",
                display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px",
                boxShadow:"inset 0 0 0 1px rgba(22,163,74,0.1)" }}>
                <IconEmail />
              </div>
              <h2 style={styles.cardTitle}>Run Search Now</h2>
              <p style={styles.cardSub}>Trigger an immediate search across all platforms.</p>
              <button className="btn-run" onClick={handleRunNow} disabled={running} style={styles.btnRun}>
                {running ? <><IconLoader /> Analyzing Jobs...</> : <><IconPlay /> Fetch & Send Now</>}
              </button>
              {runResult && (
                <div style={{ ...styles.runResult,
                  background  : runResult.success ? "#f0fdf4" : "#fef2f2",
                  borderColor : runResult.success ? "#dcfce7" : "#fee2e2",
                  color       : runResult.success ? "#166534" : "#991b1b" }}>
                  <span>{runResult.success ? <IconCheck /> : "✕"}</span>
                  <span style={{ flex:1 }}>
                    {runResult.message}
                    {runResult.jobs_sent != null && ` (${runResult.jobs_sent} sent)`}
                  </span>
                  {runResult.time && (
                    <span style={{ fontSize:11, color:"#94a3b8", flexShrink:0 }}>{runResult.time}</span>
                  )}
                </div>
              )}
            </section>

            {/* API Usage */}
            {usage && (
              <section style={styles.card} className="card">
                <h2 style={{ ...styles.cardTitle, marginBottom:4, fontSize:16 }}>Daily Quota Usage</h2>
                <p style={{ ...styles.cardSub, marginBottom:20 }}>Resource limits for your current tier.</p>
                {[
                  { label:"JSearch API",  key:"jsearch" },
                  { label:"Groq AI",      key:"groq"    },
                  { label:"Email Alerts", key:"email"   },
                ].map(({ label, key }) => {
                  const u = usage[key] || { daily_used:0, daily_limit:1, weekly_used:0, weekly_limit:1 };
                  const { pct, col } = usageBar(u.daily_used, u.daily_limit);
                  return (
                    <div key={key} style={{ marginBottom:18 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:8 }}>
                        <span style={{ color:"#475569", fontWeight:600 }}>{label}</span>
                        <span style={{ color:"#94a3b8" }}>{u.daily_used} / {u.daily_limit}</span>
                      </div>
                      <div style={{ height:6, borderRadius:99, background:"#f1f5f9", overflow:"hidden" }}>
                        <div style={{ height:"100%", borderRadius:99, width:`${pct}%`, background:col, transition:"width .6s cubic-bezier(0.4, 0, 0.2, 1)" }}/>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {/* Recent alerts */}
            <section style={styles.card} className="card">
              <div style={{ ...styles.cardHeader, marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <h2 style={{ ...styles.cardTitle, fontSize:16 }}>Recent Matches</h2>
                <button className="btn-history" style={styles.btnHistory} onClick={() => navigate("/history")}>View History</button>
              </div>
              {loadingHistory ? (
                <div style={styles.loadingState}><IconLoader /> Fetching...</div>
              ) : recentJobs.length === 0 ? (
                <div style={{ textAlign:"center", padding:"32px 0" }}>
                  <p style={{ color:"#94a3b8", fontSize:14 }}>No matches found yet.</p>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {recentJobs.map((job, i) => (
                    <div key={i} className="job-card" style={styles.jobCard}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                        <span style={{ fontWeight:600, fontSize:14, color:"#1e293b", lineHeight:1.3 }}>{job.job_title || "Job Title"}</span>
                        {job.ai_score > 0 && (
                          <span className="score-pill" style={{ background:`${scoreColor(job.ai_score)}15`, color:scoreColor(job.ai_score) }}>
                            {job.ai_score}
                          </span>
                        )}
                      </div>
                      <div style={{ display:"flex", gap:6, fontSize:12, color:"#64748b", marginBottom:8 }}>
                        <span style={{ fontWeight:500 }}>{job.company || "Company"}</span>
                        {job.location && <><span style={{ color:"#cbd5e1" }}>·</span><span>{job.location}</span></>}
                      </div>
                      {job.apply_link && (
                        <a href={job.apply_link} target="_blank" rel="noreferrer"
                          style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:12, color:"#6366f1", fontWeight:600, textDecoration:"none" }}>
                          Quick Apply <IconPlay />
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
    <div style={{ display:"flex", flexDirection:"column", gap:8, flex:1, minWidth:200 }}>
      <label htmlFor={htmlFor} style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, fontWeight:600, color:"#475569" }}>
        <span style={{ color:"#6366f1", display:"flex", alignItems:"center" }}>{icon}</span>
        {label}
      </label>
      {children}
    </div>
  );
}

const styles = {
  root        : { minHeight:"100vh", background:"#f8fafc", fontFamily:"'DM Sans',sans-serif", color:"#1e293b", textAlign:"left" },
  nav         : { background:"#fff", borderBottom:"1px solid #e2e8f0", position:"sticky", top:0, zIndex:10 },
  navInner    : { maxWidth:1440, margin:"0 auto", padding:"0 32px", height:72, display:"flex", alignItems:"center", justifyContent:"space-between" },
  logo        : { fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:24, color:"#111827", letterSpacing:"-1.5px" },
  navLinks    : { display:"flex", alignItems:"center", gap:12 },
  navLink     : { display:"flex", alignItems:"center", gap:8, padding:"10px 16px", borderRadius:14, border:"none", background:"transparent", color:"#64748b", fontSize:14, fontWeight:600, fontFamily:"'DM Sans',sans-serif", cursor:"pointer", transition:"all .2s" },
  avatar      : { width:28, height:28, borderRadius:"50%", background:"#6366f1", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700 },
  main        : { maxWidth:1440, margin:"0 auto", padding:"48px 32px" },
  greeting    : { display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:40, flexWrap:"wrap", gap:16 },
  greetSub    : { fontSize:15, fontWeight:500, color:"#64748b", marginBottom:4 },
  greetName   : { fontFamily:"'Syne',sans-serif", fontSize:40, fontWeight:700, color:"#111827", letterSpacing:"-0.03em" },
  statusBadge : { display:"flex", alignItems:"center", gap:10, padding:"8px 18px", borderRadius:99, background:"#f0fdf4", color:"#166534", fontSize:14, fontWeight:600, border:"1px solid #dcfce7" },
  grid        : { display:"grid", gridTemplateColumns:"1fr 380px", gap:24, alignItems:"start" },
  card        : { background:"#fff", borderRadius:24, border:"1px solid #e2e8f0", padding:32, boxShadow:"0 1px 3px rgba(0,0,0,0.02)" },
  cardHeader  : { marginBottom:28 },
  cardTitle   : { fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:700, color:"#111827", marginBottom:6, letterSpacing:"-0.02em" },
  cardSub     : { fontSize:14, color:"#64748b", lineHeight:1.5 },
  loadingState: { display:"flex", alignItems:"center", gap:10, color:"#94a3b8", fontSize:14, padding:"40px 0", justifyContent:"center" },
  form        : { display:"flex", flexDirection:"column", gap:24 },
  fieldRow    : { display:"flex", gap:20, flexWrap:"wrap" },
  input       : { width:"100%", padding:"12px 16px", borderRadius:14, border:"1.5px solid #e2e8f0", fontSize:14, color:"#1e293b", background:"#fcfdfe", fontFamily:"'DM Sans',sans-serif", transition:"all .2s" },
  togglesCard : { background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:20, padding:24 },
  btnSave     : { display:"flex", alignItems:"center", justifyContent:"center", gap:8, width:"100%", padding:"14px 28px", borderRadius:14, border:"none", background:"#6366f1", color:"#fff", fontSize:15, fontWeight:600, fontFamily:"'DM Sans',sans-serif", cursor:"pointer", transition:"all .2s" },
  rightCol    : { display:"flex", flexDirection:"column", gap:24 },
  btnRun      : { display:"flex", alignItems:"center", justifyContent:"center", gap:10, width:"100%", padding:"15px", marginTop:24, borderRadius:16, border:"none", background:"#f0fdf4", color:"#16a34a", fontSize:16, fontWeight:700, fontFamily:"'DM Sans',sans-serif", cursor:"pointer", transition:"all .2s" },
  runResult   : { display:"flex", alignItems:"center", gap:8, marginTop:18, padding:"12px 18px", borderRadius:14, border:"1px solid", fontSize:14, fontWeight:600 },
  btnHistory  : { padding:"6px 14px", borderRadius:12, border:"1.5px solid #e2e8f0", background:"#fff", color:"#475569", fontSize:13, fontFamily:"'DM Sans',sans-serif", cursor:"pointer", transition:"all .2s", fontWeight:600 },
  jobCard     : { padding:"16px", borderRadius:16, border:"1px solid #e2e8f0", transition:"all .2s", cursor:"default", background:"#fff" },
};