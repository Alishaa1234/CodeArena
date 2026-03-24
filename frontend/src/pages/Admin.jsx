import { NavLink } from "react-router";
import { Plus, Trash2, Video, ArrowLeft, Code2 } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";

const OPTIONS = [
  { id: "create", title: "Create Problem", desc: "Add a new DSA problem with test cases and solutions", icon: Plus, color: "#00b8a3", route: "/admin/create" },
  { id: "delete", title: "Delete Problem", desc: "Remove problems from the platform permanently", icon: Trash2, color: "#ef4444", route: "/admin/delete" },
  { id: "video", title: "Manage Videos", desc: "Upload and delete editorial solution videos", icon: Video, color: "#ffa116", route: "/admin/video" },
];

export default function Admin() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", fontFamily: "'Syne',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@400;600;700;800&display=swap');
        * { box-sizing:border-box; }
        .adm-nav { height:56px; background:var(--nav-bg); border-bottom:1px solid var(--border); display:flex; align-items:center; padding:0 24px; gap:12px; }
        .adm-back { color:var(--text-muted); text-decoration:none; display:flex; align-items:center; gap:5px; font-size:13px; font-family:'JetBrains Mono',monospace; padding:6px 10px; border-radius:7px; transition:all 0.2s; border:1px solid var(--border-mid); background:none; }
        .adm-back:hover { color:var(--accent); background:var(--accent-bg); border-color:var(--accent-border); }
        .adm-logo { display:flex; align-items:center; gap:9px; }
        .adm-logo-icon { width:30px; height:30px; background:var(--accent); border-radius:6px; display:flex; align-items:center; justify-content:center; }
        .adm-logo-text { font-size:16px; font-weight:800; color:var(--text-primary); }
        .adm-nav-tag { margin-left:8px; padding:3px 10px; background:var(--accent-bg); border:1px solid var(--accent-border); border-radius:20px; font-size:11px; color:var(--accent); font-family:'JetBrains Mono',monospace; }
        .adm-body { max-width:900px; margin:0 auto; padding:48px 24px; }
        .adm-heading { font-size:32px; font-weight:800; color:var(--text-primary); letter-spacing:-0.8px; margin-bottom:8px; }
        .adm-sub { font-size:14px; color:var(--text-muted); font-family:'JetBrains Mono',monospace; margin-bottom:40px; }
        .adm-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:16px; }
        .adm-card { background:var(--bg-card); border:1px solid var(--border); border-radius:14px; padding:28px; text-decoration:none; display:block; transition:all 0.2s; position:relative; overflow:hidden; }
        .adm-card::before { content:''; position:absolute; inset:0; opacity:0; transition:opacity 0.2s; }
        .adm-card:hover { border-color:var(--border-strong); transform:translateY(-2px); }
        .adm-card:hover::before { opacity:1; }
        .adm-card-icon { width:44px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center; margin-bottom:18px; }
        .adm-card-title { font-size:17px; font-weight:800; color:var(--text-primary); margin-bottom:8px; }
        .adm-card-desc { font-size:13px; color:var(--text-muted); font-family:'JetBrains Mono',monospace; line-height:1.6; margin-bottom:20px; }
        .adm-card-cta { display:inline-flex; align-items:center; gap:6px; font-size:13px; font-weight:700; text-decoration:none; }
      `}</style>

      <nav className="adm-nav">
        <NavLink to="/" className="adm-back"><ArrowLeft size={14} />Home</NavLink>
        <div className="adm-logo">
          <div className="adm-logo-icon"><Code2 size={16} color="#000" /></div>
          <span className="adm-logo-text">LeetCode</span>
        </div>
        <span className="adm-nav-tag">Admin</span>
        <div style={{ marginLeft: "auto" }}>
          <ThemeToggle />
        </div>
      </nav>

      <div className="adm-body">
        <div className="adm-heading">Admin Panel</div>
        <div className="adm-sub">// manage problems, test cases, and editorial videos</div>
        <div className="adm-grid">
          {OPTIONS.map(({ id, title, desc, icon: Icon, color, route }) => (
            <NavLink key={id} to={route} className="adm-card" style={{ "--hover-bg": `${color}08` }}>
              <div className="adm-card-icon" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                <Icon size={20} color={color} />
              </div>
              <div className="adm-card-title">{title}</div>
              <div className="adm-card-desc">{desc}</div>
              <div className="adm-card-cta" style={{ color }}>Go to {title} →</div>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}
