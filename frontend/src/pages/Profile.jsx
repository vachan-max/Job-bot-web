import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

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
const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
export default function Profile() {
  const navigate = useNavigate();
  const user     = auth.currentUser;

  async function handleSignOut() {
    await signOut(auth);
    navigate("/login");
  }

  const initials = user?.displayName
    ? user.displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="app-shell profile-shell" style={s.root}>
      <style>{`
        
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

        .btn-back:hover { color:#cc785c!important; background: #f5f0e8!important; }
        .btn-save:hover:not(:disabled), .btn-upload:hover:not(:disabled) { background:#a9583e!important; transform:none; box-shadow:none; }
        .btn-logout:hover { background:rgba(239,68,68,.05)!important; }
        
        .drop-zone { transition: all 0.2s ease; }
        .drop-zone:hover { border-color:#cc785c!important; background:#f5f0e8!important; }
        .drop-zone.over { border-color:#cc785c!important; background:#f5f0e8!important; transform: none; }
        
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
      <nav className="app-nav" style={s.nav}>
        <div style={s.navInner} className="nav-inner">
          <button className="nav-btn btn-back" style={s.backBtn} onClick={() => navigate("/job-finder")}>
            <IconBack /> <span className="btn-text">Job Finder</span>
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
            <h1 style={s.pageTitle} className="page-title profile-page-title">{user?.displayName || "Profile Settings"}</h1>
            <p style={s.pageSub} className="profile-page-subtitle">Manage your account information.</p>
          </div>
        </div>

        <div style={s.grid} className="profile-grid">
          {/* LEFT: Account Info */}
          <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
            <section style={s.card} className="card">
              <div style={{ marginBottom: 24 }}>
                <h2 style={s.cardTitle} className="profile-card-title">Account Identity</h2>
                <p style={s.cardSub} className="profile-card-subtitle">Personal details from your Google account.</p>
              </div>
              
              <div style={{ display:"flex", flexDirection:"column" }}>
                <InfoRow icon={<IconUser />} label="Full Name"  value={user?.displayName || "Not provided"} />
                <InfoRow icon={<IconMail />} label="Email Address" value={user?.email || "Not provided"} />
                <InfoRow icon={<IconUser />} label="User ID" value={user?.uid || "—"} mono />
              </div>
            </section>

            <section style={{ ...s.card, border: "1px solid rgba(239,68,68,0.2)" }} className="card danger-card">
              <h2 style={{ ...s.cardTitle, color: "#dc2626" }} className="profile-card-title">Danger Zone</h2>
              <p style={s.cardSub} className="profile-card-subtitle">Actions that impact your active sessions.</p>
              <button onClick={handleSignOut}
                style={{ display:"flex", alignItems:"center", gap:8, marginTop:20, padding:"12px 20px",
                  borderRadius:14, border:"1.5px solid rgba(239,68,68,0.2)", background:"transparent",
                  color:"#dc2626", fontSize:14, fontWeight:600, fontFamily:"'DM Sans',sans-serif",
                  cursor:"pointer", transition:"all .2s" }} className="btn-logout danger-action">
                <IconLogout /> Sign out from all devices
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
    <div className="profile-info-row" style={{ display:"flex", alignItems:"center", gap:16, padding:"16px 0", borderBottom:"1px solid #f1f5f9" }}>
      <div className="profile-info-icon" style={{ color:"#cc785c", display:"flex", flexShrink:0, background: "#e8e0d2", padding: 8, borderRadius: 8 }}>{icon}</div>
      <div style={{ flex:1, overflow: "hidden" }}>
        <p className="profile-info-label" style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</p>
        <p className="profile-info-value" style={{ fontSize:14, fontWeight: 600, color:"#1e293b", fontFamily: mono ? "monospace" : "inherit", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</p>
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
  grid      : { display:"grid", gridTemplateColumns:"minmax(0, 760px)", gap:24, alignItems:"start" },
  card      : { background:"#fff", borderRadius:24, border:"1px solid #e2e8f0", padding:32, boxShadow:"0 1px 3px rgba(0,0,0,0.02)" },
  cardTitle : { fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:700, color:"#111827", marginBottom:6, letterSpacing: "-0.02em" },
  cardSub   : { fontSize:14, color:"#64748b", lineHeight:1.5 },
};
