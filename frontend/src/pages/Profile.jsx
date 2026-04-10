import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import api from "../api";

// ─── icons ────────────────────────────────────────────────────────────────────
const IconBack = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
  </svg>
);
const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconPhone = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.6a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);
const IconMail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
  </svg>
);
const IconUpload = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const IconFile = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
  </svg>
);
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconLoader = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ animation: "spin 1s linear infinite" }}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);
const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconWhatsapp = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);

export default function Profile() {
  const navigate  = useNavigate();
  const user      = auth.currentUser;
  const fileRef   = useRef(null);

  // ─── state ────────────────────────────────────────────────────────────────
  const [phone,        setPhone]        = useState("");
  const [rawPhone,     setRawPhone]     = useState(""); // what user types (digits only)
  const [loadingUser,  setLoadingUser]  = useState(true);
  const [savingPhone,  setSavingPhone]  = useState(false);
  const [phoneSaved,   setPhoneSaved]   = useState(false);
  const [phoneError,   setPhoneError]   = useState("");

  const [resumeFile,     setResumeFile]     = useState(null);  // File object
  const [resumeName,     setResumeName]     = useState("");    // name of currently uploaded resume
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeSaved,    setResumeSaved]    = useState(false);
  const [resumeError,    setResumeError]    = useState("");
  const [dragOver,       setDragOver]       = useState(false);

  // ─── load user on mount ───────────────────────────────────────────────────
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await api.get("/users/me");
        const p   = res.data?.phone || "";
        setPhone(p);
        // strip prefix for display input
        setRawPhone(p.replace("whatsapp:+91", "").replace("whatsapp:+", ""));
        setResumeName(res.data?.resume_filename || "");
      } catch (e) {
        console.error("loadUser error:", e);
      } finally {
        setLoadingUser(false);
      }
    }
    loadUser();
  }, []);

  // ─── save phone ───────────────────────────────────────────────────────────
  async function handleSavePhone(e) {
    e.preventDefault();
    setPhoneError("");

    const digits = rawPhone.replace(/\D/g, "");
    if (digits.length < 10) {
      setPhoneError("Enter a valid 10-digit mobile number.");
      return;
    }

    const formatted = `whatsapp:+91${digits.slice(-10)}`;

    try {
      setSavingPhone(true);
      await api.put("/users/me", { phone: formatted });
      setPhone(formatted);
      setPhoneSaved(true);
      setTimeout(() => setPhoneSaved(false), 3000);
    } catch (err) {
      setPhoneError(err.response?.data?.detail || "Failed to save. Try again.");
    } finally {
      setSavingPhone(false);
    }
  }

  // ─── resume upload ────────────────────────────────────────────────────────
  function handleFilePick(file) {
    if (!file) return;
    if (file.type !== "application/pdf") {
      setResumeError("Only PDF files are accepted.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setResumeError("File must be under 5 MB.");
      return;
    }
    setResumeError("");
    setResumeFile(file);
  }

  async function handleUploadResume() {
    if (!resumeFile) return;
    try {
      setUploadingResume(true);
      setResumeError("");
      const form = new FormData();
      form.append("file", resumeFile);
      await api.post("/users/me/resume", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResumeName(resumeFile.name);
      setResumeFile(null);
      setResumeSaved(true);
      setTimeout(() => setResumeSaved(false), 3000);
    } catch (err) {
      setResumeError(err.response?.data?.detail || "Upload failed. Check the backend.");
    } finally {
      setUploadingResume(false);
    }
  }

  // ─── sign out ─────────────────────────────────────────────────────────────
  async function handleSignOut() {
    await signOut(auth);
    navigate("/login");
  }

  // ─── initials ─────────────────────────────────────────────────────────────
  const initials = user?.displayName
    ? user.displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div style={styles.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .card { animation: fadeUp .35s ease both; }
        .card:nth-child(1){ animation-delay:.05s }
        .card:nth-child(2){ animation-delay:.12s }
        .card:nth-child(3){ animation-delay:.19s }
        .field-input:focus { outline:none; border-color:#6366f1 !important; box-shadow:0 0 0 3px rgba(99,102,241,.15); }
        .btn-save:hover:not(:disabled)   { background:#4f46e5 !important; transform:translateY(-1px); }
        .btn-upload:hover:not(:disabled) { background:#059669 !important; transform:translateY(-1px); }
        .btn-logout:hover { color:#ef4444 !important; }
        .back-btn:hover   { color:#6366f1 !important; }
        .drop-zone { transition: border-color .2s, background .2s; }
        .drop-zone:hover  { border-color:#6366f1 !important; background:rgba(99,102,241,.04) !important; }
        .drop-zone.over   { border-color:#6366f1 !important; background:rgba(99,102,241,.08) !important; }
      `}</style>

      {/* ── NAV ── */}
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <button className="back-btn" style={styles.backBtn} onClick={() => navigate("/dashboard")}>
            <IconBack /> Dashboard
          </button>
          <span style={styles.logo}>JobBot</span>
          <button className="btn-logout" style={styles.logoutBtn} onClick={handleSignOut}>
            <IconLogout /> Sign out
          </button>
        </div>
      </nav>

      <main style={styles.main}>

        {/* ── page header ── */}
        <div style={styles.pageHeader}>
          <div style={styles.avatarLg}>{initials}</div>
          <div>
            <h1 style={styles.pageTitle}>{user?.displayName || "Your Profile"}</h1>
            <p style={styles.pageSub}>Manage your account and notification settings</p>
          </div>
        </div>

        <div style={styles.grid}>

          {/* ── LEFT col ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Account info card */}
            <section style={styles.card} className="card">
              <h2 style={styles.cardTitle}>Account Info</h2>
              <p style={styles.cardSub}>From your Google account — read only</p>

              {loadingUser ? (
                <div style={styles.loadRow}><IconLoader /> Loading...</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
                  <InfoRow icon={<IconUser />} label="Full name"  value={user?.displayName || "—"} />
                  <InfoRow icon={<IconMail />} label="Email"      value={user?.email || "—"} />
                  <InfoRow icon={<IconUser />} label="Account ID" value={user?.uid?.slice(0, 16) + "…" || "—"} mono />
                </div>
              )}
            </section>

            {/* WhatsApp card */}
            <section style={styles.card} className="card">
              <h2 style={styles.cardTitle}>WhatsApp Number</h2>
              <p style={styles.cardSub}>Job alerts will be sent to this number daily</p>

              {phone && (
                <div style={styles.currentPhone}>
                  <IconWhatsapp />
                  <span style={{ fontSize: 13, color: "#16a34a", fontWeight: 500 }}>
                    Currently: {phone}
                  </span>
                </div>
              )}

              <form onSubmit={handleSavePhone} style={{ marginTop: 20 }}>
                <label style={styles.label}>
                  <IconPhone /> Mobile number (India)
                </label>

                <div style={styles.phoneWrap}>
                  <span style={styles.phonePrefix}>+91</span>
                  <input
                    className="field-input"
                    style={{ ...styles.input, borderRadius: "0 10px 10px 0", borderLeft: "none" }}
                    placeholder="9876543210"
                    value={rawPhone}
                    maxLength={10}
                    onChange={e => {
                      setRawPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                      setPhoneError("");
                    }}
                  />
                </div>

                {phoneError && <p style={styles.errorText}>{phoneError}</p>}

                <p style={styles.hintText}>
                  Make sure you have joined the Twilio sandbox first — send&nbsp;
                  <code style={styles.code}>join &lt;two-words&gt;</code> to the Twilio WhatsApp number.
                  Sandbox expires every 72 hours.
                </p>

                <button
                  type="submit"
                  className="btn-save"
                  disabled={savingPhone}
                  style={styles.btnSave}
                >
                  {savingPhone ? <><IconLoader /> Saving...</>
                    : phoneSaved ? <><IconCheck /> Saved!</>
                    : "Save Number"}
                </button>
              </form>
            </section>
          </div>

          {/* ── RIGHT col ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Resume upload card */}
            <section style={styles.card} className="card">
              <h2 style={styles.cardTitle}>Resume</h2>
              <p style={styles.cardSub}>Used by AI to calculate match % and generate cover letters</p>

              {/* current resume */}
              {resumeName && (
                <div style={styles.currentResume}>
                  <IconFile />
                  <span style={{ fontSize: 13, color: "#374151" }}>{resumeName}</span>
                  <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}>current</span>
                </div>
              )}

              {/* drop zone */}
              <div
                className={`drop-zone ${dragOver ? "over" : ""}`}
                style={styles.dropZone}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFilePick(e.dataTransfer.files[0]);
                }}
              >
                <div style={styles.dropIcon}><IconUpload /></div>
                {resumeFile ? (
                  <>
                    <p style={styles.dropTitle}>{resumeFile.name}</p>
                    <p style={styles.dropSub}>{(resumeFile.size / 1024).toFixed(0)} KB · PDF</p>
                  </>
                ) : (
                  <>
                    <p style={styles.dropTitle}>Drop your resume here</p>
                    <p style={styles.dropSub}>or click to browse · PDF only · max 5 MB</p>
                  </>
                )}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                style={{ display: "none" }}
                onChange={e => handleFilePick(e.target.files[0])}
              />

              {resumeError && <p style={styles.errorText}>{resumeError}</p>}

              {resumeSaved && (
                <p style={{ ...styles.errorText, color: "#16a34a" }}>
                  <IconCheck /> Resume uploaded and parsed successfully!
                </p>
              )}

              <button
                className="btn-upload"
                disabled={!resumeFile || uploadingResume}
                onClick={handleUploadResume}
                style={{
                  ...styles.btnUpload,
                  opacity: (!resumeFile || uploadingResume) ? 0.5 : 1,
                  cursor: (!resumeFile || uploadingResume) ? "not-allowed" : "pointer",
                }}
              >
                {uploadingResume
                  ? <><IconLoader /> Uploading...</>
                  : resumeSaved
                  ? <><IconCheck /> Uploaded!</>
                  : <><IconUpload /> Upload Resume</>}
              </button>

              <div style={styles.infoBox}>
                <strong style={{ fontSize: 12 }}>What happens after upload?</strong>
                <ul style={{ marginTop: 6, paddingLeft: 18, fontSize: 12, color: "#6b7280", lineHeight: 1.8 }}>
                  <li>Your PDF is saved to the backend as <code style={styles.code}>resume.pdf</code></li>
                  <li>Text is extracted to <code style={styles.code}>resume.txt</code> automatically</li>
                  <li>Groq AI uses it to calculate match % for every job</li>
                  <li>Cover letters are tailored to your resume skills</li>
                </ul>
              </div>
            </section>

            {/* Danger zone card */}
            <section style={{ ...styles.card, borderColor: "rgba(239,68,68,.2)" }} className="card">
              <h2 style={{ ...styles.cardTitle, color: "#dc2626" }}>Danger Zone</h2>
              <p style={styles.cardSub}>Permanent actions — cannot be undone</p>
              <button
                style={styles.btnDanger}
                onClick={handleSignOut}
              >
                <IconLogout /> Sign out of all devices
              </button>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}

// ─── sub-component ────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, mono }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #f3f4f6" }}>
      <span style={{ color: "#6366f1", display: "flex", flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2, textTransform: "uppercase", letterSpacing: ".5px" }}>{label}</p>
        <p style={{ fontSize: 14, color: "#111827", fontFamily: mono ? "monospace" : "inherit" }}>{value}</p>
      </div>
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
    transition: "color .2s",
  },
  logo: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    fontSize: 22,
    color: "#6366f1",
  },
  logoutBtn: {
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
    transition: "color .2s",
  },
  main: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "32px 24px",
  },
  pageHeader: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    marginBottom: 32,
  },
  avatarLg: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    fontWeight: 700,
    fontFamily: "'Syne', sans-serif",
    flexShrink: 0,
  },
  pageTitle: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 28,
    fontWeight: 700,
    color: "#111827",
    letterSpacing: "-0.5px",
  },
  pageSub: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
    alignItems: "start",
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #e5e7eb",
    padding: 28,
    boxShadow: "0 1px 4px rgba(0,0,0,.04)",
  },
  cardTitle: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 17,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: "#6b7280",
  },
  loadRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#9ca3af",
    fontSize: 14,
    marginTop: 16,
  },
  currentPhone: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    padding: "8px 12px",
    borderRadius: 8,
    background: "rgba(34,197,94,.08)",
    border: "1px solid rgba(34,197,94,.2)",
    color: "#16a34a",
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    fontWeight: 500,
    color: "#374151",
    marginBottom: 8,
  },
  phoneWrap: {
    display: "flex",
    alignItems: "stretch",
  },
  phonePrefix: {
    display: "flex",
    alignItems: "center",
    padding: "0 14px",
    background: "#f3f4f6",
    border: "1.5px solid #e5e7eb",
    borderRight: "none",
    borderRadius: "10px 0 0 10px",
    fontSize: 14,
    color: "#6b7280",
    fontWeight: 500,
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    border: "1.5px solid #e5e7eb",
    fontSize: 14,
    color: "#111827",
    background: "#fafafa",
    fontFamily: "'DM Sans', sans-serif",
    transition: "border-color .2s, box-shadow .2s",
  },
  hintText: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 10,
    lineHeight: 1.6,
  },
  errorText: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12,
    color: "#dc2626",
    marginTop: 8,
  },
  code: {
    fontFamily: "monospace",
    background: "#f3f4f6",
    padding: "1px 5px",
    borderRadius: 4,
    fontSize: 11,
  },
  btnSave: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    padding: "11px 24px",
    borderRadius: 10,
    border: "none",
    background: "#6366f1",
    color: "#fff",
    fontSize: 14,
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
    transition: "all .2s",
  },
  currentResume: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    marginBottom: 4,
    padding: "8px 12px",
    borderRadius: 8,
    background: "rgba(99,102,241,.06)",
    border: "1px solid rgba(99,102,241,.15)",
    color: "#6366f1",
  },
  dropZone: {
    marginTop: 16,
    border: "2px dashed #e5e7eb",
    borderRadius: 12,
    padding: "32px 20px",
    textAlign: "center",
    cursor: "pointer",
    background: "#fafafa",
  },
  dropIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: "rgba(99,102,241,.1)",
    color: "#6366f1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 12px",
  },
  dropTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: "#374151",
    marginBottom: 4,
  },
  dropSub: {
    fontSize: 12,
    color: "#9ca3af",
  },
  btnUpload: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    padding: "11px 24px",
    borderRadius: 10,
    border: "none",
    background: "#10b981",
    color: "#fff",
    fontSize: 14,
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    transition: "all .2s",
  },
  infoBox: {
    marginTop: 20,
    padding: "14px 16px",
    borderRadius: 10,
    background: "#f8f9fc",
    border: "1px solid #e5e7eb",
    color: "#374151",
  },
  btnDanger: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    padding: "10px 20px",
    borderRadius: 10,
    border: "1.5px solid rgba(239,68,68,.3)",
    background: "transparent",
    color: "#dc2626",
    fontSize: 14,
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
    transition: "all .2s",
  },
};