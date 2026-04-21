import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

// ─── icons ────────────────────────────────────────────────────────────────────
const IconBack = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
  </svg>
);
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);
const IconBriefcase = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
  </svg>
);
const IconMap = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const IconClock = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconLink = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);
const IconLoader = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ animation: "spin 1s linear infinite" }}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);
const IconFilter = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
);
const IconEmpty = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#cbd5e1" }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
  </svg>
);
const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

// ─── helpers ──────────────────────────────────────────────────────────────────
function scoreColor(s) {
  if (s >= 85) return { bg: "#f0fdf4", text: "#166534", border: "#dcfce7" };
  if (s >= 70) return { bg: "#fffbeb", text: "#92400e", border: "#fef3c7" };
  return { bg: "#fef2f2", text: "#991b1b", border: "#fee2e2" };
}

function matchColor(m) {
  if (m >= 80) return "#10b981";
  if (m >= 60) return "#f59e0b";
  return "#ef4444";
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day      : "numeric",
    month    : "short",
    year     : "numeric",
    timeZone : "Asia/Kolkata",
  }) + " · " + d.toLocaleTimeString("en-IN", {
    hour     : "2-digit",
    minute   : "2-digit",
    timeZone : "Asia/Kolkata",
  });
}

// ─── main component ───────────────────────────────────────────────────────────
export default function History() {
  const navigate = useNavigate();

  const [jobs,        setJobs]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [filterScore, setFilterScore] = useState("all");
  const [expanded,    setExpanded]    = useState(null);
  const [sortBy,      setSortBy]      = useState("date");
  const [deletingId,  setDeletingId]  = useState(null);
  const [clearingAll, setClearingAll] = useState(false);

  useEffect(() => { fetchHistory(); }, []);

  async function fetchHistory() {
    try {
      setLoading(true);
      const res = await api.get("/jobs/history");
      let data = res.data;
      if (!Array.isArray(data)) {
        data = data?.jobs || data?.alerts || data?.data || [];
      }
      setJobs(data);
    } catch (e) {
      console.error("History fetch error:", e);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }

  // ─── delete one ───────────────────────────────────────────────────────────
  async function handleDeleteOne(alertId) {
    if (!window.confirm("Remove this job from history?")) return;
    try {
      setDeletingId(alertId);
      await api.delete(`/jobs/history/${alertId}`);
      setJobs(prev => prev.filter(j => j._id !== alertId));
    } catch (err) {
      alert("Failed to delete. Try again.");
    } finally {
      setDeletingId(null);
    }
  }

  // ─── clear all ────────────────────────────────────────────────────────────
  async function handleClearAll() {
    if (!window.confirm("Delete your entire job history? This cannot be undone.")) return;
    try {
      setClearingAll(true);
      await api.delete("/jobs/history/all");
      setJobs([]);
    } catch (err) {
      alert("Failed to clear history. Try again.");
    } finally {
      setClearingAll(false);
    }
  }

  // ─── filter + search + sort ───────────────────────────────────────────────
  const filtered = jobs
    .filter(j => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        (j.job_title || j.title || "").toLowerCase().includes(q) ||
        (j.company || "").toLowerCase().includes(q) ||
        (j.location || "").toLowerCase().includes(q);
      const s = j.ai_score ?? 0;
      const matchFilter =
        filterScore === "all"    ? true :
        filterScore === "high"   ? s >= 85 :
        filterScore === "medium" ? s >= 70 && s < 85 :
                                   s < 70;
      return matchSearch && matchFilter;
    })
    .sort((a, b) => {
      if (sortBy === "score") return (b.ai_score ?? 0) - (a.ai_score ?? 0);
      if (sortBy === "match") return (b.match_percent ?? 0) - (a.match_percent ?? 0);
      return new Date(b.sent_at || 0) - new Date(a.sent_at || 0);
    });

  // ─── stats ────────────────────────────────────────────────────────────────
  const avgScore    = jobs.length ? Math.round(jobs.reduce((s, j) => s + (j.ai_score ?? 0), 0) / jobs.length) : 0;
  const highMatches = jobs.filter(j => (j.ai_score ?? 0) >= 85).length;

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div style={styles.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@600;700&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        
        .card { animation: fadeUp .35s ease both; transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .card:hover { transform: translateY(-2px); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }

        .job-row { animation: fadeUp .3s ease both; transition: all .2s; }
        .job-row:hover { border-color: #6366f1!important; background: rgba(99,102,241, 0.01)!important; transform: translateY(-2px); }
        
        .btn-back:hover { color:#6366f1!important; background: #f8fafc!important; }
        .apply-btn:hover { background: #4f46e5 !important; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.3); }
        .delete-btn:hover { background: #fef2f2 !important; border-color: #ef4444 !important; color: #dc2626!important; }
        .clear-btn:hover:not(:disabled) { background: #fef2f2 !important; border-color: #ef4444!important; }
        
        .filter-btn { cursor:pointer; transition: all .15s; }
        .filter-btn:hover { border-color: #6366f1 !important; color: #6366f1 !important; background: #f8fafc!important; }
        .filter-btn.active { background: #6366f1 !important; color: #fff !important; border-color: #6366f1 !important; }
        
        .expand-btn:hover { color: #6366f1 !important; text-decoration: underline; }
        .search-wrap:focus-within input { border-color: #6366f1 !important; box-shadow: 0 0 0 4px rgba(99,102,241,.1); }
        .sort-select:focus { outline:none; border-color:#6366f1; box-shadow: 0 0 0 4px rgba(99,102,241,.1); }
        
        .cl-box { background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;
          padding: 20px; margin-top: 16px; font-size: 14px; color: #334155;
          line-height: 1.7; white-space: pre-wrap; font-family: 'DM Sans', sans-serif;
          max-height: 300px; overflow-y: auto; }

        @media (max-width: 1024px) {
          .stats-grid { grid-template-columns: 1fr!important; }
        }

        @media (max-width: 768px) {
          .nav-inner { padding: 0 16px!important; }
          .btn-text { display: none; }
          .nav-btn { padding: 8px!important; }
          .main-content { padding: 24px 16px!important; }
          .toolbar-container { flex-direction: column; align-items: stretch!important; gap: 16px; }
          .search-wrap { min-width: 100%!important; }
          .job-top { flex-direction: column; align-items: stretch!important; gap: 16px; }
          .job-actions { justify-content: space-between; width: 100%; border-top: 1px solid #f1f5f9; pt: 16px; margin-top: 4px; }
          .stat-card { padding: 16px 20px!important; }
          .stat-val { font-size: 28px!important; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={styles.nav}>
        <div style={styles.navInner} className="nav-inner">
          <button className="nav-btn btn-back" style={styles.backBtn} onClick={() => navigate("/dashboard")}>
            <IconBack /> <span className="btn-text">Dashboard</span>
          </button>
          <span style={styles.logo}>Search History</span>
          <div style={{ minWidth: 40 }} />
        </div>
      </nav>

      <main style={styles.main} className="main-content">

        {/* ── stats row ── */}
        <div style={styles.statsRow} className="stats-grid">
          {[
            { label: "Jobs tracked",  value: jobs.length },
            { label: "Average relevancy",        value: jobs.length ? `${avgScore}%` : "—" },
            { label: "High potential (85+)",  value: highMatches },
          ].map((s, i) => (
            <div key={i} style={styles.statCard} className="card">
              <span style={styles.statLabel}>{s.label}</span>
              <span style={styles.statVal}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* ── toolbar ── */}
        <div style={styles.toolbar} className="toolbar-container">

          {/* search */}
          <div style={styles.searchWrap} className="search-wrap">
            <span style={styles.searchIcon}><IconSearch /></span>
            <input
              style={styles.searchInput}
              placeholder="Search title, company, or location..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* score filter */}
          <div style={styles.filterGroup}>
            <span style={{ display:"flex", alignItems:"center", gap:6, fontWeight:600, color:"#64748b" }}><IconFilter /> Filter:</span>
            <div style={{ display:"flex", gap:6 }}>
              {[
                { key: "all",    label: "All" },
                { key: "high",   label: "85+" },
                { key: "medium", label: "70+" },
                { key: "low",    label: "<70" },
              ].map(f => (
                <button
                  key={f.key}
                  className={`filter-btn ${filterScore === f.key ? "active" : ""}`}
                  style={styles.filterBtn}
                  onClick={() => setFilterScore(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* sort */}
          <select
            className="sort-select"
            style={styles.sortSelect}
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="date">Latest Matches</option>
            <option value="score">Highest AI Score</option>
            <option value="match">Best Resume Fit</option>
          </select>

          {/* clear all */}
          <button
            className="clear-btn"
            onClick={handleClearAll}
            disabled={clearingAll || jobs.length === 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: 14,
              border: "1.5px solid #fee2e2",
              background: "transparent",
              color: "#ef4444",
              fontSize: 14,
              fontFamily: "'DM Sans', sans-serif",
              cursor: (clearingAll || jobs.length === 0) ? "not-allowed" : "pointer",
              fontWeight: 700,
              opacity: (clearingAll || jobs.length === 0) ? 0.5 : 1,
              transition: "all .2s",
            }}
          >
            <IconTrash />
            <span className="btn-text">{clearingAll ? "Clearing..." : "Clear All"}</span>
          </button>
        </div>

        {/* ── result count ── */}
        {!loading && (
          <p style={styles.resultCount}>
            Found <strong>{filtered.length}</strong> {filtered.length === 1 ? "job" : "jobs"}
            {search && <> matching <strong>"{search}"</strong></>}
          </p>
        )}

        {/* ── list ── */}
        {loading ? (
          <div style={styles.loadingState}><IconLoader /> Loading search history...</div>
        ) : filtered.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ background: "#f1f5f9", padding: 24, borderRadius: "50%", marginBottom: 20 }}>
              <IconEmpty />
            </div>
            <p style={{ fontSize: 20, fontWeight: 700, color: "#1e293b" }}>
              {jobs.length === 0 ? "No search history" : "No results match your filters"}
            </p>
            <p style={{ fontSize: 14, color: "#64748b", marginTop: 8, maxWidth: 300, margin: "8px auto 24px" }}>
              {jobs.length === 0
                ? "Start a new job search from your dashboard to see your history here."
                : "Try adjusting your search terms or filters to find what you're looking for."}
            </p>
            {jobs.length === 0 && (
              <button style={styles.goBtn} onClick={() => navigate("/dashboard")}>
                Return to Dashboard
              </button>
            )}
          </div>
        ) : (
          <div style={styles.list}>
            {filtered.map((job, i) => {
              const sc    = scoreColor(job.ai_score ?? 0);
              const isEx  = expanded === i;
              const title = job.job_title || job.title || "Untitled Job";
              const delay = `${Math.min(i * 0.04, 0.4)}s`;

              return (
                <div
                  key={job._id || i}
                  className="job-row"
                  style={{ ...styles.jobRow, animationDelay: delay }}
                >
                  {/* ── top row ── */}
                  <div style={styles.jobTop} className="job-top">

                    {/* left: title + meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={styles.jobTitleRow}>
                        <h3 style={styles.jobTitle}>{title}</h3>
                        {(job.ai_score > 0) && (
                            <span style={{ ...styles.scorePill, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                            AI Score: {job.ai_score}
                            </span>
                          )}
                      </div>
                      <div style={styles.metaRow}>
                        {job.company && (
                          <span style={styles.metaItem} title="Company"><IconBriefcase /> {job.company}</span>
                        )}
                        {job.location && (
                          <span style={styles.metaItem} title="Location"><IconMap /> {job.location}</span>
                        )}
                        {job.sent_at && (
                          <span style={styles.metaItem} title="Date Sent"><IconClock /> {formatDate(job.sent_at)}</span>
                        )}
                      </div>
                    </div>

                    {/* right: match % + apply + delete */}
                    <div style={styles.jobActions} className="job-actions">
                      {job.match_percent != null && job.match_percent > 0 && (
                        <div style={styles.matchWrap}>
                          <svg width="40" height="40" viewBox="0 0 38 38">
                            <circle cx="19" cy="19" r="15" fill="none" stroke="#f1f5f9" strokeWidth="4"/>
                            <circle cx="19" cy="19" r="15" fill="none"
                              stroke={matchColor(job.match_percent)}
                              strokeWidth="4"
                              strokeDasharray={`${(job.match_percent / 100) * 94.2} 94.2`}
                              strokeLinecap="round"
                              transform="rotate(-90 19 19)"
                            />
                          </svg>
                          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", top: -8 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: matchColor(job.match_percent) }}>
                              {job.match_percent}%
                            </span>
                          </div>
                          <span style={styles.matchLabel}>Fit</span>
                        </div>
                      )}

                      {job.apply_link && (
                        <a
                          href={job.apply_link}
                          target="_blank"
                          rel="noreferrer"
                          className="apply-btn"
                          style={styles.applyBtn}
                        >
                          Apply <IconLink />
                        </a>
                      )}

                      {/* delete button */}
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteOne(job._id)}
                        disabled={deletingId === job._id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          padding: "10px",
                          borderRadius: 12,
                          border: "1.5px solid #f1f5f9",
                          background: "#fff",
                          color: "#94a3b8",
                          cursor: deletingId === job._id ? "not-allowed" : "pointer",
                          opacity: deletingId === job._id ? 0.5 : 1,
                          transition: "all .2s",
                          flexShrink: 0,
                        }}
                        title="Remove from history"
                      >
                        {deletingId === job._id ? <IconLoader /> : <IconTrash />}
                      </button>
                    </div>
                  </div>

                  {/* ── skills gap ── */}
                  {job.skills_gap && (
                    <div style={styles.skillsGap}>
                      <span style={styles.skillsLabel}>Missing Skills: </span>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                        {job.skills_gap.split(",").map((sk, si) => (
                          <span key={si} style={styles.skillTag}>{sk.trim()}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── cover letter toggle ── */}
                  {job.cover_letter && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
                      <button
                        className="expand-btn"
                        style={styles.expandBtn}
                        onClick={() => setExpanded(isEx ? null : i)}
                      >
                        {isEx ? "Hide Cover Letter ▲" : "Generate Cover Letter ▼"}
                      </button>
                      {isEx && <div className="cl-box">{job.cover_letter}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = {
  root: { minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif", color: "#1e293b", textAlign: "left" },
  nav: { background: "#fff", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 10 },
  navInner: { maxWidth: 1440, margin: "0 auto", padding: "0 32px", height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" },
  backBtn: { display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 14, border: "none", background: "transparent", color: "#64748b", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", transition: "all .2s" },
  logo: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, color: "#111827", letterSpacing: "-1.5px" },
  main: { maxWidth: 1440, margin: "0 auto", padding: "48px 32px" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 40 },
  statCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 24, padding: "24px 32px", display: "flex", flexDirection: "column", gap: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.02)" },
  statVal: { fontFamily: "'Syne', sans-serif", fontSize: 36, fontWeight: 700, color: "#111827", letterSpacing: "-0.03em" },
  statLabel: { fontSize: 14, color: "#64748b", fontWeight: 600 },
  toolbar: { display: "flex", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" },
  searchWrap: { position: "relative", flex: 1, minWidth: 300 },
  searchIcon: { position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", display: "flex" },
  searchInput: { width: "100%", padding: "12px 16px 12px 44px", borderRadius: 14, border: "1.5px solid #e2e8f0", fontSize: 14, fontFamily: "'DM Sans', sans-serif", background: "#fcfdfe", color: "#1e293b", transition: "all .2s", outline: "none" },
  filterGroup: { display: "flex", alignItems: "center", gap: 12, fontSize: 14 },
  filterBtn: { padding: "8px 16px", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 700 },
  sortSelect: { padding: "10px 16px", borderRadius: 14, border: "1.5px solid #e2e8f0", background: "#fcfdfe", color: "#475569", fontSize: 14, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", fontWeight: 600 },
  resultCount: { fontSize: 14, color: "#64748b", marginBottom: 20, fontWeight: 500 },
  loadingState: { display: "flex", alignItems: "center", gap: 10, color: "#94a3b8", fontSize: 15, padding: "80px 0", justifyContent: "center" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", padding: "100px 0", textAlign: "center" },
  goBtn: { padding: "14px 28px", borderRadius: 14, border: "none", background: "#6366f1", color: "#fff", fontSize: 15, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", fontWeight: 700, boxShadow: "0 8px 16px -4px rgba(99,102,241,0.25)", transition: "all .2s" },
  list: { display: "flex", flexDirection: "column", gap: 16 },
  jobRow: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 24, padding: "24px 32px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" },
  jobTop: { display: "flex", alignItems: "flex-start", gap: 20 },
  jobTitleRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" },
  jobTitle: { fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" },
  scorePill: { fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 99, fontFamily: "'Syne', sans-serif" },
  metaRow: { display: "flex", flexWrap: "wrap", gap: 16 },
  metaItem: { display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b", fontWeight: 500 },
  jobActions: { display: "flex", alignItems: "center", gap: 16, flexShrink: 0 },
  matchWrap: { position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
  matchLabel: { fontSize: 11, color: "#94a3b8", textAlign: "center", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.02em" },
  applyBtn: { display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 14, background: "#6366f1", color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none", transition: "all .2s" },
  skillsGap: { display: "flex", alignItems: "flex-start", gap: 12, marginTop: 16, paddingTop: 16, borderTop: "1px solid #f1f5f9" },
  skillsLabel: { fontSize: 13, color: "#475569", fontWeight: 700, whiteSpace: "nowrap" },
  skillTag: { padding: "4px 12px", borderRadius: 99, background: "#f0fdf4", color: "#166534", fontSize: 12, fontWeight: 700, border: "1px solid #dcfce7" },
  expandBtn: { background: "none", border: "none", color: "#64748b", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", padding: 0, transition: "color .2s" },
};
