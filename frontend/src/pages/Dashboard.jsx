import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../authSlice";
import {
  Code2, LogOut, Settings, ChevronRight,
  Swords, BrainCircuit, Target
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";

export default function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  
  const [greeting, setGreeting] = useState("Hello");

  // Theme sync via MutationObserver
  const [isDark, setIsDark] = useState(!document.documentElement.classList.contains('light'));
  useEffect(() => {
    const obs = new MutationObserver(() => setIsDark(!document.documentElement.classList.contains('light')));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    // Dynamic greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  // Theme-aware colors
  const bg      = isDark ? "var(--bg-primary)" : "#f5f5f7";
  const nav     = isDark ? "var(--bg-secondary)" : "rgba(255,255,255,0.85)";
  const card    = isDark ? "var(--bg-card)" : "#ffffff";
  const cardBdr = isDark ? "var(--border)" : "#e4e4e7";
  const tile    = isDark ? "var(--bg-tertiary)" : "#f4f4f5";
  const text    = isDark ? "var(--text-primary)" : "#111111";
  const textSub = isDark ? "var(--text-secondary)" : "#555555";
  const textMut = isDark ? "var(--text-muted)" : "#aaaaaa";

  const products = [
    {
      title: "Coding Practice",
      desc: "Solve algorithmic challenges, explore reference solutions, and study interactive code editorials.",
      icon: <Code2 size={24} color="var(--accent)" />,
      route: "/practice",
      accent: "var(--accent)",
      bgGlow: "rgba(99,102,241,0.04)"
    },
    {
      title: "AI Mock Interview",
      desc: "Simulate coding & behavioral rounds with our AI voice-transcribed tutor and receive targeted rubrics.",
      icon: <BrainCircuit size={24} color="#a855f7" />,
      route: "/interview",
      accent: "#a855f7",
      bgGlow: "rgba(168,85,247,0.04)"
    },
    {
      title: "ATS Resume Analyzer",
      desc: "Benchmark your resume against job descriptions, detect keywords gaps, and generate AI suggestions.",
      icon: <Target size={24} color="#22c55e" />,
      route: "/ats",
      accent: "#22c55e",
      bgGlow: "rgba(34,197,94,0.04)"
    }
  ];

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'Inter',sans-serif", color: text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Sora:wght@400;600;700;800&display=swap');
        *, *::before, *::after { box-sizing:border-box; }
        .db-nav { position:sticky; top:0; z-index:50; height:58px; background:${nav}; backdrop-filter:blur(20px); border-bottom:1px solid ${cardBdr}; padding:0 24px; display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .db-logo { display:flex; align-items:center; gap:10px; text-decoration:none; }
        .db-logo-icon { width:32px; height:32px; background:var(--accent); border-radius:8px; display:flex; align-items:center; justify-content:center; }
        .db-logo-text { font-size:17px; font-weight:800; color:${text}; letter-spacing:-0.3px; font-family:'Sora',sans-serif; }
        .db-nav-right { display:flex; align-items:center; gap:8px; }
        .db-nav-btn { background:none; border:1px solid ${cardBdr}; border-radius:8px; padding:6px 12px; color:${textSub}; cursor:pointer; font-size:13px; display:inline-flex; align-items:center; gap:6px; transition:all 0.2s; font-family:'Sora',sans-serif; font-weight:600; }
        .db-nav-btn:hover { border-color:${textMut}; color:${text}; background:${tile}; }
        .db-nav-btn.duel { color:#ef4444; border-color:rgba(239,68,68,0.4); background:rgba(239,68,68,0.06); }
        .db-nav-btn.duel:hover { background:rgba(239,68,68,0.12); border-color:rgba(239,68,68,0.6); }
        .db-avatar { width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg,var(--accent),#a855f7); display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:800; color:#fff; cursor:pointer; transition:opacity 0.2s; border:2px solid rgba(99,102,241,0.3); }
        .db-avatar:hover { opacity:0.85; }
        .db-body { max-width:1100px; margin:0 auto; padding:40px 24px; }

        /* Welcome */
        .db-welcome { margin-bottom:36px; }
        .db-welcome-name { font-size:32px; font-weight:800; letter-spacing:-0.8px; color:${text}; font-family:'Sora',sans-serif; }
        .db-welcome-sub { font-size:13px; color:${textMut}; margin-top:6px; font-family:'JetBrains Mono',monospace; }

        /* Portal Cards Grid */
        .db-portals { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; margin-bottom:44px; }
        @media (max-width:860px) { .db-portals { grid-template-columns:1fr; } }
        
        .db-portal-card { background:${card}; border:1px solid ${cardBdr}; border-radius:20px; padding:32px; text-decoration:none; display:flex; flex-direction:column; cursor:pointer; transition:all 0.25s; position:relative; overflow:hidden; }
        .db-portal-card:hover { transform:translateY(-3px); border-color:var(--hover-border); box-shadow:0 8px 30px var(--hover-shadow); }
        .db-portal-icon-wrap { width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center; margin-bottom:20px; border:1px solid ${cardBdr}; background:${tile}; transition:transform 0.25s; }
        .db-portal-card:hover .db-portal-icon-wrap { transform:scale(1.08); }
        .db-portal-title { font-size:18px; font-weight:800; color:${text}; margin-bottom:10px; font-family:'Sora',sans-serif; }
        .db-portal-desc { font-size:13px; color:${textSub}; line-height:1.6; margin-bottom:24px; flex:1; }
        .db-portal-cta { display:inline-flex; align-items:center; gap:6px; font-size:13px; font-weight:700; transition:gap 0.2s; }
        .db-portal-card:hover .db-portal-cta { gap:10px; }
      `}</style>

      {/* ── Navbar ── */}
      <nav className="db-nav">
        <NavLink to="/" className="db-logo">
          <div className="db-logo-icon"><Code2 size={18} color="#fff"/></div>
          <span className="db-logo-text">CodeArena</span>
        </NavLink>
        <div className="db-nav-right">
          {user?.role === "admin" && (
            <NavLink to="/admin">
              <button className="db-nav-btn"><Settings size={13}/>Admin</button>
            </NavLink>
          )}
          <button className="db-nav-btn" onClick={() => navigate("/practice")}>
            <Code2 size={13}/>Practice
          </button>
          <button className="db-nav-btn duel" onClick={() => navigate("/duel")}>
            <Swords size={13}/>Duel
          </button>
          <button className="db-nav-btn" onClick={() => navigate('/interview')}
            style={{ color:"#a855f7", borderColor:"rgba(168,85,247,0.4)", background:"rgba(168,85,247,0.06)" }}
            onMouseEnter={e => e.currentTarget.style.background="rgba(168,85,247,0.12)"}
            onMouseLeave={e => e.currentTarget.style.background="rgba(168,85,247,0.06)"}
          >
            <BrainCircuit size={13}/>Interview
          </button>
          <button className="db-nav-btn" onClick={() => navigate("/ats")}
            style={{ color:"#22c55e", borderColor:"rgba(34,197,94,0.4)", background:"rgba(34,197,94,0.06)" }}
            onMouseEnter={e => e.currentTarget.style.background="rgba(34,197,94,0.12)"}
            onMouseLeave={e => e.currentTarget.style.background="rgba(34,197,94,0.06)"}
          >
            <Target size={13}/>ATS Score
          </button>
          <ThemeToggle/>
          <div className="db-avatar" onClick={() => navigate("/profile")} title="Profile">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              user?.firstName?.[0]?.toUpperCase()
            )}
          </div>
          <button className="db-nav-btn" onClick={() => dispatch(logoutUser())}>
            <LogOut size={13}/>Logout
          </button>
        </div>
      </nav>

      <div className="db-body">

        {/* ── Welcome Header ── */}
        <div className="db-welcome">
          <div className="db-welcome-name">{greeting}, {user?.firstName} 👋</div>
          <div className="db-welcome-sub">// your unified engineering preparation hub</div>
        </div>

        {/* ── Product Portal Grid ── */}
        <div className="db-portals">
          {products.map((p) => {
            const shadowColor = p.accent === "var(--accent)" ? "rgba(99,102,241,0.12)" : (p.accent === "#a855f7" ? "rgba(168,85,247,0.12)" : "rgba(34,197,94,0.12)");
            return (
              <div
                key={p.title}
                className="db-portal-card"
                onClick={() => navigate(p.route)}
                style={{
                  "--hover-border": p.accent,
                  "--hover-shadow": shadowColor
                }}
              >
                <div className="db-portal-icon-wrap" style={{ background: p.bgGlow, borderColor: `${p.accent}25` }}>
                  {p.icon}
                </div>
                <h3 className="db-portal-title">{p.title}</h3>
                <p className="db-portal-desc">{p.desc}</p>
                <div className="db-portal-cta" style={{ color: p.accent }}>
                  Enter portal <ChevronRight size={14} className="hp-duel-arrow" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
