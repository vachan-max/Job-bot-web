import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import api from "../api";

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
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
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
const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

export default function Profile() {
  const navigate = useNavigate();
  const user     = auth.currentUser;
  const fileRef  = useRef(null);

  const [loadingUser,     setLoadingUser]     = useState(true);
  const [resumeFile,      setResumeFile]      = useState(null);
  const [resumeName,      setResumeName]      = useState("");
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeSaved,     setResumeSaved]     = useState(false);
  const [resumeError,     setResumeError]     = useState("");
  const [removingResume,  setRemovingResume]  = useState(false);
  const [dragOver,        setDragOver]        = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await api.get("/users/me");
        setResumeName(res.data?.resume_filename || "");
      } catch (e) { console.error("loadUser error:", e); }
      finally { setLoadingUser(false); }
    }
    loadUser();
  }, []);

  function handleFilePick(file) {
    if (!file) return;
    if (file.type !== "application/pdf") { setResumeError("Only PDF files are accepted."); return; }
    if (file.size > 5 * 1024 * 1024)    { setResumeError("File must be under 5 MB."); return; }
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
      await api.post("/users/me/resume", form, { headers: { "Content-Type": "multipart/form-data" } });
      setResumeName(resumeFile.name);
      setResumeFile(null);
      setResumeSaved(true);
      setTimeout(() => setResumeSaved(false), 3000);
    } catch (err) {
      setResumeError(err.response?.data?.detail || "Upload failed. Try again.");
    } finally { setUploadingResume(false); }
  }

  async function handleRemoveResume() {
    if (!window.confirm("Remove your resume? This will delete the file from our servers.")) return;
    try {
      setRemovingResume(true);
      await api.delete("/users/me/resume");
      setResumeName("");
      setResumeFile(null);
    } catch (err) {
      alert("Failed to remove resume. Try again.");
    } finally { setRemovingResume(false); }
  }

  async function handleSignOut() {
    await signOut(auth);
    navigate("/login");
  }

  const initials = user?.displayName
    ? user.displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@600;700&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.5} }

        .card { animation: fadeUp .35s ease both; transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .card:hover { transform: translateY(-2px); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        .card:nth-child(1){animation-delay:.05s} .card:nth-child(2){animation-delay:.12s} .card:nth-child(3){animation-delay:.19s}

        .btn-back:hover { color:#6366f1!important; background: #f8fafc!important; }
        .btn-save:hover:not(:disabled)   { background:#4f46e5!important; transform:translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.3); }
        .btn-upload:hover:not(:disabled) { background:#059669!important; transform:translateY(-1px); box-shadow: 0 4px 12px rgba(16,185,129,0.15); }
        .btn-logout:hover { background:rgba(239,68,68,.05)!important; }
        
        .drop-zone { transition: all 0.2s ease; }
        .drop-zone:hover { border-color:#6366f1!important; background:rgba(99,102,241,.02)!important; }
        .drop-zone.over { border-color:#6366f1!important; background:rgba(99,102,241,.08)!important; transform: scale(1.01); }
        
        .btn-remove:hover { background:rgba(239,68,68,.05)!important; border-color:#ef4444!important; }

        @media (max-width: 1024px) {
          .profile-grid { grid-template-columns: 1fr!important; }
        }

        @media (max-width: 768px) {
          .nav-inner { padding: 0 16px!important; }
          .btn-text { display: none; }
          .nav-btn { padding: 8px!important; }
          .main-content { padding: 24px 16px!important; }
          .header-container { flex-direction: column; text-align: center; gap: 16px; }
          .avatar-lg { width: 80px!important; height: 80px!important; font-size: 32px!important; }
          .page-title { font-size: 24px!important; }
          .card { padding: 24px!important; }
        }
      `}</style>

      {/* NAV */}
      <nav style={s.nav}>
        <div style={s.navInner} className="nav-inner">
          <button className="nav-btn btn-back" style={s.backBtn} onClick={() => navigate("/dashboard")}>
            <IconBack /> <span className="btn-text">Dashboard</span>
          </button>
          <span style={s.logo}>PingScore</span>
          <button className="nav-btn btn-logout" style={s.logoutBtn} onClick={handleSignOut}>
            <IconLogout /> <span className="btn-text">Sign out</span>
          </button>
        </div>
      </nav>

      <main style={s.main} className="main-content">
        {/* header */}
        <div style={s.pageHeader} className="header-container">
          <div style={s.avatarLg} className="avatar-lg">{initials}</div>
          <div>
            <h1 style={s.pageTitle} className="page-title">{user?.displayName || "Profile Settings"}</h1>
            <p style={s.pageSub}>Manage your account information and resume data.</p>
          </div>
        </div>

        <div style={s.grid} className="profile-grid">
          {/* LEFT: Account Info */}
          <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
            <section style={s.card} className="card">
              <div style={{ marginBottom: 24 }}>
                <h2 style={s.cardTitle}>Account Identity</h2>
                <p style={s.cardSub}>Personal details from your Google account.</p>
              </div>
              
              {loadingUser ? (
                <div style={s.loadingState}><IconLoader /> Loading details...</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column" }}>
                  <InfoRow icon={<IconUser />} label="Full Name"  value={user?.displayName || "Not provided"} />
                  <InfoRow icon={<IconMail />} label="Email Address" value={user?.email || "Not provided"} />
                  <InfoRow icon={<IconUser />} label="User ID" value={user?.uid || "—"} mono />
                </div>
              )}
            </section>

            <section style={{ ...s.card, border: "1px solid rgba(239,68,68,0.2)" }} className="card">
              <h2 style={{ ...s.cardTitle, color: "#dc2626" }}>Danger Zone</h2>
              <p style={s.cardSub}>Actions that impact your active sessions.</p>
              <button onClick={handleSignOut}
                style={{ display:"flex", alignItems:"center", gap:8, marginTop:20, padding:"12px 20px",
                  borderRadius:14, border:"1.5px solid rgba(239,68,68,0.2)", background:"transparent",
                  color:"#dc2626", fontSize:14, fontWeight:600, fontFamily:"'DM Sans',sans-serif",
                  cursor:"pointer", transition:"all .2s" }} className="btn-logout">
                <IconLogout /> Sign out from all devices
              </button>
            </section>
          </div>

          {/* RIGHT: Resume Management */}
          <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
            <section style={s.card} className="card">
              <div style={{ marginBottom: 20 }}>
                <h2 style={s.cardTitle}>Resume & CV</h2>
                <p style={s.cardSub}>This file is used by AI to analyze your fit for new jobs.</p>
              </div>

              {/* current resume */}
              {resumeName && (
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20,
                  padding:"14px 16px", borderRadius:16, background:"#f8fafc",
                  border:"1px solid #e2e8f0" }}>
                  <div style={{ color: "#6366f1" }}><IconFile /></div>
                  <div style={{ flex:1, overflow: "hidden" }}>
                    <p style={{ fontSize:14, fontWeight:600, color:"#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{resumeName}</p>
                    <p style={{ fontSize:11, color:"#94a3b8", fontWeight:500 }}>Currently active</p>
                  </div>
                  <button className="btn-remove"
                    onClick={handleRemoveResume}
                    disabled={removingResume}
                    style={{ display:"flex", alignItems:"center", gap:6, background:"transparent",
                      border:"1.5px solid #fee2e2", borderRadius:10, color:"#ef4444",
                      cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"'DM Sans',sans-serif",
                      padding:"6px 10px", transition:"all .2s" }}>
                    {removingResume ? "..." : <><IconTrash /> Remove</>}
                  </button>
                </div>
              )}

              {/* drop zone */}
              <div className={`drop-zone ${dragOver ? "over" : ""}`} style={s.dropZone}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFilePick(e.dataTransfer.files[0]); }}>
                <div style={{ width:56, height:56, borderRadius:20, background:"#eef2ff",
                  color:"#6366f1", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                  <IconUpload />
                </div>
                {resumeFile ? (
                  <>
                    <p style={s.dropTitle}>{resumeFile.name}</p>
                    <p style={s.dropSub}>Ready to upload · {(resumeFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </>
                ) : (
                  <>
                    <p style={s.dropTitle}>Click or drag to update resume</p>
                    <p style={s.dropSub}>PDF format only · Max size 5MB</p>
                  </>
                )}
              </div>

              <input ref={fileRef} type="file" accept="application/pdf"
                style={{ display:"none" }} onChange={e => handleFilePick(e.target.files[0])} />

              {resumeError  && <p style={s.errorText}>{resumeError}</p>}
              {resumeSaved  && <p style={{ ...s.errorText, color:"#10b981" }}><IconCheck /> Resume updated successfully!</p>}

              <button className="btn-upload" disabled={!resumeFile || uploadingResume}
                onClick={handleUploadResume}
                style={{ ...s.btnUpload, opacity:(!resumeFile || uploadingResume) ? 0.5 : 1,
                  cursor:(!resumeFile || uploadingResume) ? "not-allowed" : "pointer", width: "100%", marginTop: 24 }}>
                {uploadingResume ? <><IconLoader /> Uploading...</> : resumeSaved ? <><IconCheck /> Uploaded Successfully</> : <><IconUpload /> {resumeName ? "Replace Resume" : "Upload Resume"}</>}
              </button>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function InfoRow({ icon, label, value, mono }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:16, padding:"16px 0", borderBottom:"1px solid #f1f5f9" }}>
      <div style={{ color:"#6366f1", display:"flex", flexShrink:0, background: "#eef2ff", padding: 8, borderRadius: 10 }}>{icon}</div>
      <div style={{ flex:1, overflow: "hidden" }}>
        <p style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</p>
        <p style={{ fontSize:14, fontWeight: 600, color:"#1e293b", fontFamily: mono ? "monospace" : "inherit", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</p>
      </div>
    </div>
  );
}

const s = {
  root      : { minHeight:"100vh", background:"#f8fafc", fontFamily:"'DM Sans',sans-serif", color:"#1e293b", textAlign: "left" },
  nav       : { background:"#fff", borderBottom:"1px solid #e2e8f0", position:"sticky", top:0, zIndex:10 },
  navInner  : { maxWidth:1440, margin:"0 auto", padding:"0 32px", height:72, display:"flex", alignItems:"center", justifyContent:"space-between" },
  backBtn   : { display:"flex", alignItems:"center", gap:8, padding:"10px 16px", borderRadius:14, border:"none", background:"transparent", color:"#64748b", fontSize:14, fontWeight:600, fontFamily:"'DM Sans',sans-serif", cursor:"pointer", transition:"all .2s" },
  logo      : { fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:24, color:"#111827", letterSpacing:"-1.5px" },
  logoutBtn : { display:"flex", alignItems:"center", gap:8, padding:"10px 16px", borderRadius:14, border:"none", background:"transparent", color:"#64748b", fontSize:14, fontWeight:600, fontFamily:"'DM Sans',sans-serif", cursor:"pointer", transition:"all .2s" },
  main      : { maxWidth:1440, margin:"0 auto", padding:"48px 32px" },
  pageHeader: { display:"flex", alignItems:"center", gap:24, marginBottom:48 },
  avatarLg  : { width:80, height:80, borderRadius:24, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, fontWeight:700, fontFamily:"'Syne',sans-serif", flexShrink:0, boxShadow: "0 8px 16px -4px rgba(99,102,241,0.25)" },
  pageTitle : { fontFamily:"'Syne',sans-serif", fontSize:32, fontWeight:700, color:"#111827", letterSpacing:"-0.03em" },
  pageSub   : { fontSize:15, color:"#64748b", marginTop:6, fontWeight: 500 },
  grid      : { display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, alignItems:"start" },
  card      : { background:"#fff", borderRadius:24, border:"1px solid #e2e8f0", padding:32, boxShadow:"0 1px 3px rgba(0,0,0,0.02)" },
  cardTitle : { fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:700, color:"#111827", marginBottom:6, letterSpacing: "-0.02em" },
  cardSub   : { fontSize:14, color:"#64748b", lineHeight:1.5 },
  loadingState: { display:"flex", alignItems:"center", gap:10, color:"#94a3b8", fontSize:14, padding:"40px 0", justifyContent:"center" },
  errorText : { display:"flex", alignItems:"center", gap:6, fontSize:13, color:"#dc2626", marginTop:16, fontWeight: 600 },
  dropZone  : { marginTop:20, border:"2px dashed #e2e8f0", borderRadius:24, padding:"40px 24px", textAlign:"center", cursor:"pointer", background:"#fcfdfe" },
  dropTitle : { fontSize:15, fontWeight:700, color:"#1e293b", marginBottom:6 },
  dropSub   : { fontSize:13, color:"#94a3b8", fontWeight: 500 },
  btnUpload : { display:"flex", alignItems:"center", justifyContent:"center", gap:10, padding:"14px 28px", borderRadius:14, border:"none", background:"#10b981", color:"#fff", fontSize:15, fontWeight:700, fontFamily:"'DM Sans',sans-serif", transition:"all .2s" },
};
