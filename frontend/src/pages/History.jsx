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
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#d1d5db" }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
  </svg>
);

// ─── helpers ──────────────────────────────────────────────────────────────────
function scoreColor(s) {
  if (s >= 85) return { bg: "rgba(34,197,94,.12)", text: "#16a34a", border: "rgba(34,197,94,.25)" };
  if (s >= 70) return { bg: "rgba(245,158,11,.12)", text: "#d97706", border: "rgba(245,158,11,.25)" };
  return { bg: "rgba(239,68,68,.12)", text: "#dc2626", border: "rgba(239,68,68,.25)" };
}

function matchColor(m) {
  if (m >= 80) return "#16a34a";
  if (m >= 60) return "#d97706";
  return "#dc2626";
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

  const [jobs, setJobs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [filterScore, setFilterScore] = useState("all"); // all | high | medium | low
  const [expanded, setExpanded]   = useState(null); // job index expanded for cover letter
  const [sortBy, setSortBy]       = useState("date"); // date | score | match

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
  const avgScore = jobs.length
    ? Math.round(jobs.reduce((s, j) => s + (j.ai_score ?? 0), 0) / jobs.length)
    : 0;
  const highMatches = jobs.filter(j => (j.ai_score ?? 0) >= 85).length;

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div style={styles.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .job-row { animation: fadeUp .3s ease both; transition: box-shadow .2s, border-color .2s; }
        .job-row:hover { border-color: rgba(99,102,241,.35) !important; box-shadow: 0 4px 16px rgba(99,102,241,.07) !important; }
        .apply-btn:hover { background: #4f46e5 !important; transform: translateY(-1px); }
        .filter-btn { cursor:pointer; transition: all .15s; }
        .filter-btn:hover { border-color: #6366f1 !important; color: #6366f1 !important; }
        .filter-btn.active { background: #6366f1 !important; color: #fff !important; border-color: #6366f1 !important; }
        .expand-btn:hover { color: #6366f1 !important; }
        .search-wrap:focus-within input { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,.12); }
        .sort-select:focus { outline:none; border-color:#6366f1; }
        .cl-box { background: #f8f9fc; border-radius: 10px; border: 1px solid #e5e7eb;
          padding: 16px; margin-top: 14px; font-size: 13px; color: #374151;
          line-height: 1.7; white-space: pre-wrap; font-family: 'DM Sans', sans-serif;
          max-height: 220px; overflow-y: auto; }
      `}</style>

      {/* ── NAV ── */}
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <button style={styles.backBtn} onClick={() => navigate("/dashboard")}>
            <IconBack /> Dashboard
          </button>
          <span style={styles.logo}>Job History</span>
          <span style={{ minWidth: 120 }} />
        </div>
      </nav>

      <main style={styles.main}>

        {/* ── stats row ── */}
        <div style={styles.statsRow}>
          {[
            { label: "Total alerts sent", value: jobs.length },
            { label: "Avg AI score",      value: jobs.length ? `${avgScore}` : "—" },
            { label: "High matches (85+)", value: highMatches },
          ].map((s, i) => (
            <div key={i} style={styles.statCard}>
              <span style={styles.statVal}>{s.value}</span>
              <span style={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── toolbar ── */}
        <div style={styles.toolbar}>

          {/* search */}
          <div style={styles.searchWrap} className="search-wrap">
            <span style={styles.searchIcon}><IconSearch /></span>
            <input
              style={styles.searchInput}
              placeholder="Search by title, company, location..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* score filter */}
          <div style={styles.filterGroup}>
            <IconFilter />&nbsp;
            {[
              { key: "all",    label: "All" },
              { key: "high",   label: "85+" },
              { key: "medium", label: "70–84" },
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

          {/* sort */}
          <select
            className="sort-select"
            style={styles.sortSelect}
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="date">Sort: Latest</option>
            <option value="score">Sort: AI Score</option>
            <option value="match">Sort: Match %</option>
          </select>
        </div>

        {/* ── result count ── */}
        {!loading && (
          <p style={styles.resultCount}>
            {filtered.length} {filtered.length === 1 ? "job" : "jobs"}
            {search && ` matching "${search}"`}
            {filterScore !== "all" && ` · score filter: ${filterScore}`}
          </p>
        )}

        {/* ── list ── */}
        {loading ? (
          <div style={styles.loadingState}><IconLoader /> Loading your job history...</div>
        ) : filtered.length === 0 ? (
          <div style={styles.emptyState}>
            <IconEmpty />
            <p style={{ marginTop: 16, fontWeight: 500, color: "#6b7280" }}>
              {jobs.length === 0 ? "No jobs sent yet" : "No jobs match your filter"}
            </p>
            <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 6 }}>
              {jobs.length === 0
                ? "Go to Dashboard and click Run Now to send your first batch."
                : "Try clearing the search or changing the score filter."}
            </p>
            {jobs.length === 0 && (
              <button style={styles.goBtn} onClick={() => navigate("/dashboard")}>
                Go to Dashboard
              </button>
            )}
          </div>
        ) : (
          <div style={styles.list}>
            {filtered.map((job, i) => {
              const sc   = scoreColor(job.ai_score ?? 0);
              const isEx = expanded === i;
              const title = job.job_title || job.title || "Job";
              const delay = `${Math.min(i * 0.04, 0.4)}s`;

              return (
                <div
                  key={i}
                  className="job-row"
                  style={{ ...styles.jobRow, animationDelay: delay }}
                >
                  {/* ── top row ── */}
                  <div style={styles.jobTop}>

                    {/* left: title + meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={styles.jobTitleRow}>
                        <h3 style={styles.jobTitle}>{title}</h3>
                        {/* score pill */}
                        <span style={{ ...styles.scorePill, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                          {job.ai_score ?? "—"}
                        </span>
                      </div>

                      <div style={styles.metaRow}>
                        {job.company && (
                          <span style={styles.metaItem}><IconBriefcase />{job.company}</span>
                        )}
                        {job.location && (
                          <span style={styles.metaItem}><IconMap />{job.location}</span>
                        )}
                        {job.sent_at && (
                          <span style={styles.metaItem}><IconClock />{formatDate(job.sent_at)}</span>
                        )}
                      </div>
                    </div>

                    {/* right: match % + apply */}
                    <div style={styles.jobActions}>
                      {job.match_percent != null && (
                        <div style={styles.matchWrap}>
                          <svg width="38" height="38" viewBox="0 0 38 38">
                            <circle cx="19" cy="19" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3"/>
                            <circle cx="19" cy="19" r="15" fill="none"
                              stroke={matchColor(job.match_percent)}
                              strokeWidth="3"
                              strokeDasharray={`${(job.match_percent / 100) * 94.2} 94.2`}
                              strokeLinecap="round"
                              transform="rotate(-90 19 19)"
                            />
                          </svg>
                          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: 10, fontWeight: 600, color: matchColor(job.match_percent) }}>
                              {job.match_percent}%
                            </span>
                          </div>
                          <span style={styles.matchLabel}>match</span>
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
                          <IconLink /> Apply
                        </a>
                      )}
                    </div>
                  </div>

                  {/* ── skills gap ── */}
                  {job.skills_gap && (
                    <div style={styles.skillsGap}>
                      <span style={styles.skillsLabel}>Skills gap: </span>
                      {job.skills_gap.split(",").map((sk, si) => (
                        <span key={si} style={styles.skillTag}>{sk.trim()}</span>
                      ))}
                    </div>
                  )}

                  {/* ── cover letter toggle ── */}
                  {job.cover_letter && (
                    <div>
                      <button
                        className="expand-btn"
                        style={styles.expandBtn}
                        onClick={() => setExpanded(isEx ? null : i)}
                      >
                        {isEx ? "▲ Hide cover letter" : "▼ View cover letter"}
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
  root: {
    minHeight: "100vh",
    background: "#f8f9fc",
    fontFamily: "'DM Sans', sans-serif",
    color: "#111827",
  },
  nav: {
    background: "#fff",
    borderBottom: "1px solid #e5e7eb",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  navInner: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "0 24px",
    height: 60,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 8,
    border: "none",
    background: "transparent",
    color: "#6b7280",
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
    minWidth: 120,
  },
  logo: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    fontSize: 20,
    color: "#111827",
  },
  main: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "32px 24px",
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
    marginBottom: 28,
  },
  statCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  statVal: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 32,
    fontWeight: 700,
    color: "#111827",
    letterSpacing: "-1px",
  },
  statLabel: {
    fontSize: 13,
    color: "#6b7280",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  searchWrap: {
    position: "relative",
    flex: 1,
    minWidth: 220,
  },
  searchIcon: {
    position: "absolute",
    left: 12,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#9ca3af",
    display: "flex",
  },
  searchInput: {
    width: "100%",
    padding: "9px 14px 9px 36px",
    borderRadius: 10,
    border: "1.5px solid #e5e7eb",
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    background: "#fff",
    color: "#111827",
    transition: "border-color .2s, box-shadow .2s",
    outline: "none",
  },
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "#6b7280",
  },
  filterBtn: {
    padding: "6px 12px",
    borderRadius: 8,
    border: "1.5px solid #e5e7eb",
    background: "#fff",
    color: "#6b7280",
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 500,
  },
  sortSelect: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1.5px solid #e5e7eb",
    background: "#fff",
    color: "#374151",
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
  },
  resultCount: {
    fontSize: 13,
    color: "#9ca3af",
    marginBottom: 16,
  },
  loadingState: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#9ca3af",
    fontSize: 15,
    padding: "60px 0",
    justifyContent: "center",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "80px 0",
    textAlign: "center",
  },
  goBtn: {
    marginTop: 20,
    padding: "10px 24px",
    borderRadius: 10,
    border: "none",
    background: "#6366f1",
    color: "#fff",
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
    fontWeight: 500,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  jobRow: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: "20px 24px",
    boxShadow: "0 1px 3px rgba(0,0,0,.04)",
  },
  jobTop: {
    display: "flex",
    alignItems: "flex-start",
    gap: 16,
  },
  jobTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  jobTitle: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 17,
    fontWeight: 700,
    color: "#111827",
  },
  scorePill: {
    fontSize: 12,
    fontWeight: 600,
    padding: "2px 10px",
    borderRadius: 99,
    fontFamily: "'Syne', sans-serif",
  },
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 13,
    color: "#6b7280",
  },
  jobActions: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    flexShrink: 0,
  },
  matchWrap: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  matchLabel: {
    fontSize: 10,
    color: "#9ca3af",
    textAlign: "center",
  },
  applyBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    borderRadius: 9,
    background: "#6366f1",
    color: "#fff",
    fontSize: 13,
    fontWeight: 500,
    textDecoration: "none",
    transition: "all .2s",
  },
  skillsGap: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTop: "1px solid #f3f4f6",
  },
  skillsLabel: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: 500,
  },
  skillTag: {
    padding: "2px 10px",
    borderRadius: 99,
    background: "rgba(99,102,241,.08)",
    color: "#6366f1",
    fontSize: 12,
    fontWeight: 500,
    border: "1px solid rgba(99,102,241,.2)",
  },
  expandBtn: {
    marginTop: 12,
    background: "none",
    border: "none",
    color: "#9ca3af",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    padding: 0,
    transition: "color .2s",
  },
};