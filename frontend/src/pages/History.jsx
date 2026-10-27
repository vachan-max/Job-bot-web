import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSearchResults } from "../services/jobFinderService";
import JobCard from "../components/job-finder/JobCard";
import api from "../api";

function formatDate(dateValue) {
  if (!dateValue) return "Date unavailable";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

function getSearchLabel(search) {
  const roles = search.filters?.job_titles || [];
  return roles.length ? roles.join(", ") : "Untitled job search";
}

function getSearchDescription(search) {
  const filters = search.filters || {};
  const details = [
    ...(filters.locations || []),
    filters.experience_level,
    filters.remote_preference && filters.remote_preference !== "any" ? filters.remote_preference : "",
  ].filter(Boolean);
  return details.length ? details.join(" · ") : "Any location or experience level";
}

function getStatus(search) {
  if (search.schedule?.enabled) return "Scheduled";
  const status = search.status || "draft";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function History() {
  const navigate = useNavigate();
  const [searches, setSearches] = useState([]);
  const [totalSearches, setTotalSearches] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletingSearchId, setDeletingSearchId] = useState("");
  const [expandedSearchId, setExpandedSearchId] = useState("");
  const [searchResults, setSearchResults] = useState({});
  const [loadingResultsId, setLoadingResultsId] = useState("");
  const [resultErrors, setResultErrors] = useState({});
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadSearches() {
      setLoading(true);
      setError("");
      try {
        const response = await api.get("/jobs/finder/searches", { params: { limit: 50, offset: 0 } });
        if (active) {
          setSearches(response.data?.searches || []);
          setTotalSearches(response.data?.total ?? response.data?.searches?.length ?? 0);
        }
      } catch (loadError) {
        console.error("Finder history fetch error:", loadError);
        if (active) setError("Search history could not be loaded. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadSearches();
    return () => { active = false; };
  }, []);

  const visibleSearches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return searches
      .filter(search => {
        const status = search.schedule?.enabled ? "scheduled" : (search.status || "draft").toLowerCase();
        const matchesStatus = statusFilter === "all" || status === statusFilter;
        const searchableText = [
          getSearchLabel(search),
          getSearchDescription(search),
          ...(search.filters?.industries || []),
          ...(search.filters?.skills || []),
          ...(search.filters?.keywords || []),
        ].join(" ").toLowerCase();
        return matchesStatus && (!normalizedQuery || searchableText.includes(normalizedQuery));
      })
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
  }, [searches, query, statusFilter]);

  async function toggleSearch(search) {
    if (expandedSearchId === search._id) {
      setExpandedSearchId("");
      return;
    }
    setExpandedSearchId(search._id);
    if (searchResults[search._id] || loadingResultsId === search._id) return;
    setLoadingResultsId(search._id);
    setResultErrors(previous => ({ ...previous, [search._id]: "" }));
    try {
      const results = await getSearchResults(search._id);
      setSearchResults(previous => ({ ...previous, [search._id]: results }));
    } catch (loadError) {
      console.error("Could not load saved search results:", loadError);
      setResultErrors(previous => ({ ...previous, [search._id]: "Saved jobs could not be loaded. Please try again." }));
    } finally {
      setLoadingResultsId("");
    }
  }

  async function deleteSearch(search) {
    if (!window.confirm(`Delete the search “${getSearchLabel(search)}” and its saved results?`)) return;
    setDeletingSearchId(search._id);
    setDeleteError("");
    try {
      await api.delete(`/jobs/finder/searches/${search._id}`);
      setSearches(previous => previous.filter(item => item._id !== search._id));
      setTotalSearches(previous => Math.max(0, previous - 1));
      if (expandedSearchId === search._id) setExpandedSearchId("");
      setSearchResults(previous => {
        const next = { ...previous };
        delete next[search._id];
        return next;
      });
    } catch (deleteError) {
      console.error("Could not delete finder search:", deleteError);
      setDeleteError("Search could not be deleted. Please try again.");
    } finally {
      setDeletingSearchId("");
    }
  }

  async function loadMoreSearches() {
    setLoadingMore(true);
    try {
      const response = await api.get("/jobs/finder/searches", { params: { limit: 50, offset: searches.length } });
      setSearches(previous => [...previous, ...(response.data?.searches || [])]);
      setTotalSearches(response.data?.total ?? totalSearches);
    } catch (loadError) {
      console.error("Could not load more finder history:", loadError);
      setError("More search history could not be loaded. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="app-shell history-page" style={styles.root}>
      <style>{`
        .history-page * { box-sizing: border-box; }
        .history-page .history-entry:hover { border-color: var(--primary) !important; background: var(--surface-soft) !important; }
        .history-page .history-entry:focus-visible { outline: 3px solid rgba(204,120,92,.35); outline-offset: 2px; }
        .history-page .history-job-card { text-align: left; }
        .history-page .history-job-card .jf-job-card { background: var(--surface-card); }
        @media (max-width: 680px) {
          .history-page .history-toolbar { align-items: stretch !important; flex-direction: column; }
          .history-page .history-search { min-width: 0 !important; width: 100%; }
          .history-page .history-row { align-items: flex-start !important; flex-direction: column; }
          .history-page .history-row-meta { align-items: center !important; flex-direction: row !important; flex-wrap: wrap; width: 100%; }
          .history-page .history-delete { margin-left: auto; }
          .history-page .history-entry { padding: 0 !important; }
          .history-page .history-details { padding: 0 12px 12px !important; }
        }
      `}</style>

      <nav className="app-nav" style={styles.nav}>
        <div className="nav-inner" style={styles.navInner}>
          <button className="nav-btn" style={styles.backBtn} onClick={() => navigate("/job-finder")}>← <span>Job Finder</span></button>
          <span style={styles.logo}>Search History</span>
          <button style={styles.newSearch} onClick={() => navigate("/job-finder")}>＋ New search</button>
        </div>
      </nav>

      <main className="main-content" style={styles.main}>
        <header style={styles.heading}>
          <div>
            <p style={styles.eyebrow}>Your Job Finder archive</p>
            <h1 style={styles.title}>Pick up where you left off.</h1>
            <p style={styles.subtitle}>Select a search to review its saved job results.</p>
          </div>
        </header>

        <section style={styles.panel} aria-label="Saved Job Finder searches">
          <div className="history-toolbar" style={styles.toolbar}>
            <input
              className="history-search"
              type="search"
              aria-label="Search saved searches"
              placeholder="Search roles, locations, skills..."
              value={query}
              onChange={event => setQuery(event.target.value)}
              style={styles.searchInput}
            />
            <label style={styles.filterLabel}>
              <span>Status</span>
              <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} style={styles.statusSelect}>
                <option value="all">All searches</option>
                <option value="draft">Drafts</option>
                <option value="completed">Completed</option>
                <option value="scheduled">Scheduled</option>
                <option value="failed">Failed</option>
                <option value="running">Running</option>
              </select>
            </label>
          </div>

          {!loading && !error && (
            <p style={styles.count}>Showing {visibleSearches.length} of {totalSearches} {totalSearches === 1 ? "search" : "searches"}</p>
          )}
          {deleteError && <p style={styles.deleteError} role="alert">{deleteError}</p>}

          {loading ? (
            <div style={styles.message}>Loading your saved searches…</div>
          ) : error ? (
            <div style={styles.emptyState} role="alert">
              <p style={styles.emptyTitle}>We couldn’t load your history.</p>
              <button style={styles.newSearch} onClick={() => window.location.reload()}>Try again</button>
            </div>
          ) : visibleSearches.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyTitle}>{searches.length ? "No searches match these filters." : "Your search archive is ready."}</p>
              <p style={styles.subtitle}>{searches.length ? "Try another keyword or status." : "Start a Job Finder search and it will appear here, including drafts you want to finish later."}</p>
              {!searches.length && <button style={styles.newSearch} onClick={() => navigate("/job-finder")}>Start a job search</button>}
            </div>
          ) : (
            <div style={styles.list}>
              {visibleSearches.map(search => (
                <div key={search._id} className="history-entry" style={styles.entry}>
                  <button
                    type="button"
                    className="history-row"
                    style={styles.rowButton}
                    onClick={() => toggleSearch(search)}
                    aria-expanded={expandedSearchId === search._id}
                    aria-controls={`search-details-${search._id}`}
                  >
                    <span style={styles.entryMain}>
                      <strong style={styles.entryTitle}>{getSearchLabel(search)}</strong>
                      <span style={styles.entryDescription}>{getSearchDescription(search)}</span>
                      <small style={styles.entryDate}>Updated {formatDate(search.updated_at || search.created_at)}</small>
                    </span>
                    <span className="history-row-meta" style={styles.entryMeta}>
                      <span style={styles.statusBadge}>{getStatus(search)}</span>
                      <strong style={styles.resultCount}>{search.result_count || 0} results</strong>
                      <span style={styles.expandHint}>{expandedSearchId === search._id ? "Hide results ↑" : "View results ↓"}</span>
                    </span>
                  </button>
                  {expandedSearchId === search._id && (
                    <section id={`search-details-${search._id}`} className="history-details" style={styles.details} aria-label={`${getSearchLabel(search)} saved jobs`}>
                      {loadingResultsId === search._id ? (
                        <div style={styles.resultMessage}>Loading saved jobs…</div>
                      ) : resultErrors[search._id] ? (
                        <div style={styles.resultMessage} role="alert">{resultErrors[search._id]} <button type="button" style={styles.retryButton} onClick={() => toggleSearch(search)}>Retry</button></div>
                      ) : searchResults[search._id]?.length ? (
                        <div className="history-job-card" style={styles.jobList}>
                          {searchResults[search._id].map(job => <JobCard key={job._id || job.apply_link} job={job} searchId={search._id} />)}
                        </div>
                      ) : (
                        <div style={styles.resultMessage}>{search.status === "draft" ? "This draft has no saved job results yet." : search.status === "failed" ? "This search failed before any job results were saved." : "No saved job results for this search."}</div>
                      )}
                    </section>
                  )}
                  <div style={styles.rowActions}>
                    <button type="button" className="history-delete" style={styles.deleteButton} onClick={() => deleteSearch(search)} disabled={deletingSearchId === search._id}>
                      {deletingSearchId === search._id ? "Deleting…" : "Delete search"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && !error && searches.length < totalSearches && (
            <button style={styles.loadMore} onClick={loadMoreSearches} disabled={loadingMore}>
              {loadingMore ? "Loading…" : "Load more searches"}
            </button>
          )}
        </section>
      </main>
    </div>
  );
}

const styles = {
  root: { minHeight: "100vh", background: "var(--canvas)", color: "var(--body-strong)", fontFamily: "var(--sans)" },
  nav: { background: "var(--canvas)", borderBottom: "1px solid var(--hairline)", position: "sticky", top: 0, zIndex: 10 },
  navInner: { maxWidth: 1160, margin: "0 auto", padding: "0 32px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 },
  backBtn: { display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", border: 0, borderRadius: 8, background: "transparent", color: "var(--muted)", fontWeight: 600, cursor: "pointer" },
  logo: { fontFamily: "var(--display)", fontSize: 25, color: "var(--ink)" },
  newSearch: { border: "1px solid var(--hairline)", borderRadius: 8, background: "var(--surface-card)", color: "var(--ink)", padding: "10px 14px", fontWeight: 700, cursor: "pointer" },
  main: { maxWidth: 1160, margin: "0 auto", padding: "42px 32px 72px" },
  heading: { marginBottom: 26 },
  eyebrow: { margin: "0 0 7px", color: "var(--primary)", fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" },
  title: { margin: 0, color: "var(--ink)", font: "400 clamp(30px, 4vw, 42px)/1.1 var(--display)" },
  subtitle: { margin: "8px 0 0", color: "var(--muted)", fontSize: 14, lineHeight: 1.6 },
  panel: { padding: 22, border: "1px solid var(--hairline)", borderRadius: 12, background: "var(--surface-card)" },
  toolbar: { display: "flex", alignItems: "center", gap: 14, marginBottom: 16 },
  searchInput: { flex: 1, minWidth: 240, padding: "11px 13px", border: "1px solid var(--hairline)", borderRadius: 8, background: "var(--canvas)", color: "var(--ink)" },
  filterLabel: { display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 13, fontWeight: 600 },
  statusSelect: { padding: "10px 12px", border: "1px solid var(--hairline)", borderRadius: 8, background: "var(--canvas)", color: "var(--ink)" },
  count: { margin: "0 0 12px", color: "var(--muted)", fontSize: 12 },
  loadMore: { display: "block", margin: "16px auto 0", padding: "9px 14px", border: "1px solid var(--hairline)", borderRadius: 8, background: "var(--canvas)", color: "var(--body-strong)", fontWeight: 600, cursor: "pointer" },
  list: { display: "flex", flexDirection: "column", gap: 9 },
  entry: { width: "100%", border: "1px solid var(--hairline)", borderRadius: 9, background: "var(--canvas)", color: "var(--body-strong)", overflow: "hidden", transition: "background .15s, border-color .15s" },
  rowButton: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, padding: 16, border: 0, background: "transparent", color: "inherit", textAlign: "left", cursor: "pointer" },
  entryMain: { minWidth: 0, display: "flex", flexDirection: "column", gap: 5 },
  entryTitle: { color: "var(--ink)", fontSize: 15 },
  entryDescription: { color: "var(--body)", fontSize: 12 },
  entryDate: { color: "var(--muted)", fontSize: 11 },
  entryMeta: { display: "flex", alignItems: "flex-end", flexDirection: "column", gap: 7, flexShrink: 0 },
  statusBadge: { padding: "4px 8px", borderRadius: 99, background: "var(--surface-strong)", color: "var(--body-strong)", fontSize: 10, fontWeight: 700 },
  resultCount: { color: "var(--body-strong)", fontSize: 12 },
  expandHint: { color: "var(--primary)", fontSize: 11, fontWeight: 700 },
  details: { borderTop: "1px solid var(--hairline)", padding: 14, background: "var(--surface-soft)" },
  jobList: { display: "flex", flexDirection: "column", gap: 10 },
  resultMessage: { padding: "18px 12px", color: "var(--muted)", fontSize: 13, textAlign: "center" },
  retryButton: { marginLeft: 8, border: 0, background: "transparent", color: "var(--primary)", fontWeight: 700, cursor: "pointer" },
  rowActions: { display: "flex", justifyContent: "flex-end", padding: "0 16px 12px" },
  deleteButton: { border: "1px solid var(--hairline)", borderRadius: 6, padding: "5px 9px", background: "var(--surface-card)", color: "var(--error)", fontSize: 11, fontWeight: 700, cursor: "pointer" },
  deleteError: { margin: "0 0 12px", color: "var(--error)", fontSize: 13 },
  message: { padding: "48px 16px", textAlign: "center", color: "var(--muted)" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "54px 18px", textAlign: "center" },
  emptyTitle: { margin: 0, color: "var(--ink)", fontSize: 18, fontWeight: 700 },
};
