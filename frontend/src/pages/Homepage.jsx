/* PAGE: Homepage
   PURPOSE: The landing page of the application where users can see featured content or news.
*/

import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import axiosClient from "../utils/axiosClient";
import { logoutUser } from "../authSlice";
import {
  Code2, LogOut, Settings, CheckCircle2, ChevronDown,
  Swords, Search, ArrowUpDown, X, User
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";

export default function Homepage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const [problems, setProblems] = useState([]);
  const [solvedIds, setSolvedIds] = useState(new Set());
  const [loadingProblems, setLoadingProblems] = useState(true);
  const [filters, setFilters] = useState({ difficulty: "all", tag: "all", status: "all" });
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");

  // Theme sync via MutationObserver
  const [isDark, setIsDark] = useState(!document.documentElement.classList.contains('light'));
  useEffect(() => {
    const obs = new MutationObserver(() => setIsDark(!document.documentElement.classList.contains('light')));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingProblems(true);
      try {
        const [pRes, sRes] = await Promise.all([
          axiosClient.get("/problem/getAllProblem"),
          axiosClient.get("/problem/problemSolvedByUser"),
        ]);
        setProblems(pRes.data);
        setSolvedIds(new Set(sRes.data.map((p) => p._id)));
      } catch (e) { console.error(e); }
      finally { setLoadingProblems(false); }
    };
    fetchData();
  }, []);

  const filtered = problems.filter((p) => {
    const d = filters.difficulty === "all" || p.difficulty === filters.difficulty;
    const t = filters.tag === "all" || (Array.isArray(p.tags) ? p.tags.includes(filters.tag) : p.tags === filters.tag);
    const s = filters.status === "all" ||
      (filters.status === "solved" && solvedIds.has(p._id)) ||
      (filters.status === "unsolved" && !solvedIds.has(p._id));
    const q = query.trim().toLowerCase();
    const hay = (p.title || "").toLowerCase() + " " + (Array.isArray(p.tags) ? p.tags.join(" ") : (p.tags || "")).toLowerCase();
    return d && t && s && (!q || hay.includes(q));
  });

  const diffRank = { easy: 1, medium: 2, hard: 3 };
  filtered.sort((a, b) => {
    if (sortBy === "title") return String(a.title || "").localeCompare(String(b.title || ""));
    if (sortBy === "difficulty") { const r = (diffRank[a.difficulty] ?? 99) - (diffRank[b.difficulty] ?? 99); return r !== 0 ? r : String(a.title || "").localeCompare(String(b.title || "")); }
    if (sortBy === "solvedFirst") { const r = (solvedIds.has(a._id) ? 0 : 1) - (solvedIds.has(b._id) ? 0 : 1); return r !== 0 ? r : String(a.title || "").localeCompare(String(b.title || "")); }
    return 0;
  });

  const counts = { easy: 0, medium: 0, hard: 0 };
  problems.forEach((p) => { if (counts[p.difficulty] !== undefined) counts[p.difficulty]++; });

  // Theme-aware colors
  const bg      = isDark ? "#0f0f0f" : "#f5f5f7";
  const nav     = isDark ? "rgba(15,15,15,0.85)" : "rgba(255,255,255,0.85)";
  const card    = isDark ? "#1a1a1a" : "#ffffff";
  const cardBdr = isDark ? "#2a2a2a" : "#e4e4e7";
  const tile    = isDark ? "#222222" : "#f4f4f5";
  const tileBdr = isDark ? "#333333" : "#e4e4e7";
  const text    = isDark ? "#f0f0f0" : "#111111";
  const textSub = isDark ? "#a0a0a0" : "#555555";
  const textMut = isDark ? "#666666" : "#aaaaaa";
  const input   = isDark ? "#1e1e1e" : "#ffffff";

  const DIFF = {
    easy:   { color: "#22c55e", bg: isDark ? "rgba(34,197,94,0.12)"  : "rgba(34,197,94,0.1)",  border: isDark ? "rgba(34,197,94,0.25)"  : "rgba(34,197,94,0.3)"  },
    medium: { color: "#f59e0b", bg: isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.1)", border: isDark ? "rgba(245,158,11,0.25)" : "rgba(245,158,11,0.3)" },
    hard:   { color: "#ef4444", bg: isDark ? "rgba(239,68,68,0.12)"  : "rgba(239,68,68,0.1)",  border: isDark ? "rgba(239,68,68,0.25)"  : "rgba(239,68,68,0.3)"  },
  };

  return (
    <div style={{ minHeight:"100vh", background:bg, fontFamily:"'Syne',sans-serif", color:text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@400;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing:border-box; }
        .hp-nav { position:sticky; top:0; z-index:50; height:58px; background:${nav}; backdrop-filter:blur(20px); border-bottom:1px solid ${cardBdr}; padding:0 24px; display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .hp-logo { display:flex; align-items:center; gap:10px; text-decoration:none; }
        .hp-logo-icon { width:32px; height:32px; background:#ffa116; border-radius:8px; display:flex; align-items:center; justify-content:center; }
        .hp-logo-text { font-size:17px; font-weight:900; color:${text}; letter-spacing:-0.3px; }
        .hp-nav-right { display:flex; align-items:center; gap:8px; }
        .hp-nav-btn { background:none; border:1px solid ${cardBdr}; border-radius:8px; padding:6px 12px; color:${textSub}; cursor:pointer; font-size:13px; display:inline-flex; align-items:center; gap:6px; transition:all 0.2s; font-family:'Syne',sans-serif; font-weight:600; }
        .hp-nav-btn:hover { border-color:${textMut}; color:${text}; background:${tile}; }
        .hp-nav-btn.duel { color:#ef4444; border-color:rgba(239,68,68,0.4); background:rgba(239,68,68,0.06); }
        .hp-nav-btn.duel:hover { background:rgba(239,68,68,0.12); border-color:rgba(239,68,68,0.6); }
        .hp-avatar { width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg,#ffa116,#ff5722); display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:800; color:#fff; cursor:pointer; transition:opacity 0.2s; border:2px solid rgba(255,161,22,0.3); }
        .hp-avatar:hover { opacity:0.85; }
        .hp-body { max-width:1100px; margin:0 auto; padding:36px 24px; }

        /* Welcome */
        .hp-welcome { margin-bottom:32px; }
        .hp-welcome-name { font-size:28px; font-weight:900; letter-spacing:-0.6px; color:${text}; }
        .hp-welcome-sub { font-size:13px; color:${textMut}; margin-top:6px; font-family:'JetBrains Mono',monospace; }

        /* Duel banner */
        .hp-duel { background:${card}; border:1px solid ${cardBdr}; border-radius:16px; padding:18px 22px; margin-bottom:24px; display:flex; align-items:center; justify-content:space-between; gap:16px; cursor:pointer; transition:all 0.2s; }
        .hp-duel:hover { border-color:rgba(239,68,68,0.5); background:${isDark ? "rgba(239,68,68,0.06)" : "rgba(239,68,68,0.03)"}; transform:translateY(-1px); }
        .hp-duel:hover .hp-duel-arrow { transform:translateX(4px); }
        .hp-duel-icon { width:42px; height:42px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.25); border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .hp-duel-arrow { transition:transform 0.2s; }

        /* Stats */
        .hp-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px; }
        @media (max-width:640px) { .hp-stats { grid-template-columns:repeat(2,1fr); } }
        .hp-stat { background:${card}; border:1px solid ${cardBdr}; border-radius:14px; padding:18px 20px; }
        .hp-stat-lbl { font-size:10px; color:${textMut}; text-transform:uppercase; letter-spacing:1px; font-family:'JetBrains Mono',monospace; margin-bottom:8px; font-weight:600; }
        .hp-stat-val { font-size:26px; font-weight:900; line-height:1; font-family:'Syne',sans-serif; }
        .hp-prog { height:5px; background:${tileBdr}; border-radius:3px; overflow:hidden; margin-top:10px; }
        .hp-prog-fill { height:100%; border-radius:3px; transition:width 0.8s ease; }

        /* Filters */
        .hp-filters { display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap; align-items:center; }
        .hp-search-wrap { position:relative; display:flex; align-items:center; }
        .hp-search { width:240px; background:${input}; border:1px solid ${cardBdr}; border-radius:10px; padding:9px 36px 9px 36px; color:${text}; font-size:13px; outline:none; transition:border-color 0.2s; font-family:'JetBrains Mono',monospace; }
        .hp-search:focus { border-color:#ffa116; }
        .hp-search::placeholder { color:${textMut}; }
        .hp-search-icon { position:absolute; left:12px; color:${textMut}; pointer-events:none; }
        .hp-search-clear { position:absolute; right:8px; border:none; background:none; color:${textMut}; cursor:pointer; padding:4px; border-radius:6px; display:flex; align-items:center; }
        .hp-search-clear:hover { color:${text}; }
        .hp-sel-wrap { position:relative; }
        .hp-sel { background:${input}; border:1px solid ${cardBdr}; border-radius:10px; padding:9px 30px 9px 12px; color:${textSub}; font-size:13px; outline:none; cursor:pointer; font-family:'JetBrains Mono',monospace; appearance:none; transition:border-color 0.2s; }
        .hp-sel:focus { border-color:#ffa116; color:${text}; }
        .hp-sel-icon { position:absolute; right:9px; top:50%; transform:translateY(-50%); color:${textMut}; pointer-events:none; }

        /* Table */
        .hp-table-wrap { background:${card}; border:1px solid ${cardBdr}; border-radius:16px; overflow:hidden; }
        .hp-table { width:100%; border-collapse:collapse; }
        .hp-th { padding:13px 20px; text-align:left; font-size:10px; color:${textMut}; text-transform:uppercase; letter-spacing:1px; font-family:'JetBrains Mono',monospace; border-bottom:1px solid ${cardBdr}; font-weight:600; background:${tile}; }
        .hp-tr { border-bottom:1px solid ${tileBdr}; transition:background 0.15s; }
        .hp-tr:last-child { border-bottom:none; }
        .hp-tr:hover { background:${tile}; }
        .hp-td { padding:14px 20px; font-size:14px; color:${textSub}; }
        .hp-link { color:${text}; text-decoration:none; font-weight:700; transition:color 0.15s; }
        .hp-link:hover { color:#ffa116; }
        .hp-badge { display:inline-flex; align-items:center; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:700; font-family:'JetBrains Mono',monospace; border:1px solid; }
        .hp-tag { display:inline-block; padding:2px 8px; border-radius:6px; font-size:11px; font-family:'JetBrains Mono',monospace; background:${tile}; color:${textMut}; border:1px solid ${tileBdr}; }
        .hp-empty { text-align:center; padding:60px 20px; color:${textMut}; font-family:'JetBrains Mono',monospace; font-size:14px; }
        @keyframes shimmer { to { transform:translateX(100%); } }
        @media (max-width:560px) { .hp-search { width:100%; } }
      `}</style>

      {/* ── Navbar ── */}
      <nav className="hp-nav">
        <NavLink to="/" className="hp-logo">
          <div className="hp-logo-icon"><Code2 size={18} color="#000"/></div>
          <span className="hp-logo-text">CodeArena</span>
        </NavLink>
        <div className="hp-nav-right">
          {user?.role === "admin" && (
            <NavLink to="/admin">
              <button className="hp-nav-btn"><Settings size={13}/>Admin</button>
            </NavLink>
          )}
          <button className="hp-nav-btn duel" onClick={() => navigate("/duel")}>
            <Swords size={13}/>Duel
          </button>
          <ThemeToggle/>
          <div className="hp-avatar" onClick={() => navigate("/profile")} title="Profile">
            {user?.firstName?.[0]?.toUpperCase()}
          </div>
          <button className="hp-nav-btn" onClick={() => dispatch(logoutUser())}>
            <LogOut size={13}/>Logout
          </button>
        </div>
      </nav>

      <div className="hp-body">

        {/* ── Welcome ── */}
        <div className="hp-welcome">
          <div className="hp-welcome-name">Hey, {user?.firstName} 👋</div>
          <div className="hp-welcome-sub">// {solvedIds.size} of {problems.length} problems solved</div>
        </div>

        {/* ── Duel banner ── */}
        <div className="hp-duel" onClick={() => navigate("/duel")}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div className="hp-duel-icon"><Swords size={20} color="#ef4444"/></div>
            <div>
              <p style={{ fontSize:15, fontWeight:800, color:text, margin:"0 0 3px" }}>1v1 Code Duel</p>
              <p style={{ fontSize:12, color:textMut, margin:0, fontFamily:"'JetBrains Mono',monospace" }}>
                Challenge a friend · First AC wins · ELO rated
              </p>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {user?.eloRating && (
              <span style={{ padding:"3px 12px", borderRadius:20, fontSize:12, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:"#ef4444", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)" }}>
                {user.eloRating} ELO
              </span>
            )}
            <ChevronDown size={16} className="hp-duel-arrow" style={{ transform:"rotate(-90deg)", color:textMut }}/>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="hp-stats">
          <div className="hp-stat">
            <div className="hp-stat-lbl">Total Solved</div>
            <div className="hp-stat-val" style={{ color:"#ffa116" }}>{solvedIds.size}</div>
          </div>
          {["easy","medium","hard"].map((d) => {
            const solved = problems.filter(p => solvedIds.has(p._id) && p.difficulty === d).length;
            const ds = DIFF[d];
            return (
              <div key={d} className="hp-stat">
                <div className="hp-stat-lbl">{d}</div>
                <div className="hp-stat-val" style={{ color:ds.color }}>
                  {solved}<span style={{ fontSize:14, color:textMut, fontWeight:400 }}>/{counts[d]}</span>
                </div>
                <div className="hp-prog">
                  <div className="hp-prog-fill" style={{ width:counts[d] ? `${(solved/counts[d])*100}%`:"0%", background:ds.color }}/>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Filters ── */}
        <div className="hp-filters">
          <div className="hp-search-wrap">
            <Search size={14} className="hp-search-icon" style={{ color:textMut }}/>
            <input className="hp-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search title or tags..."/>
            {query.trim() && (
              <button className="hp-search-clear" onClick={() => setQuery("")}><X size={13}/></button>
            )}
          </div>

          {[
            { key:"status",     options:[["all","All Status"],["solved","Solved"],["unsolved","Unsolved"]] },
            { key:"difficulty", options:[["all","All Difficulty"],["easy","Easy"],["medium","Medium"],["hard","Hard"]] },
            { key:"tag",        options:[["all","All Tags"],["array","Array"],["linkedList","Linked List"],["graph","Graph"],["dp","DP"],["string","String"],["tree","Tree"]] },
          ].map(({ key, options }) => (
            <div key={key} className="hp-sel-wrap">
              <select className="hp-sel" value={filters[key]} onChange={e => setFilters({ ...filters, [key]: e.target.value })}>
                {options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <ChevronDown size={12} className="hp-sel-icon"/>
            </div>
          ))}

          <div className="hp-sel-wrap">
            <select className="hp-sel" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="default">Sort: Default</option>
              <option value="difficulty">Sort: Difficulty</option>
              <option value="title">Sort: Title</option>
              <option value="solvedFirst">Sort: Solved first</option>
            </select>
            <ChevronDown size={12} className="hp-sel-icon"/>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="hp-table-wrap">
          {loadingProblems ? (
            <div style={{ padding:24 }}>
              {Array.from({ length:8 }).map((_,i) => (
                <div key={i} style={{ height:14, borderRadius:8, background:tile, border:`1px solid ${tileBdr}`, overflow:"hidden", position:"relative", marginBottom:12 }}>
                  <div style={{ position:"absolute", inset:0, transform:"translateX(-100%)", animation:"shimmer 1.2s infinite", background:`linear-gradient(90deg, transparent 0%, ${isDark ? "rgba(255,161,22,0.08)" : "rgba(0,0,0,0.04)"} 50%, transparent 100%)` }}/>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="hp-empty">No problems match your filters</div>
          ) : (
            <table className="hp-table">
              <thead>
                <tr>
                  <th className="hp-th" style={{ width:50 }}>#</th>
                  <th className="hp-th">Title</th>
                  <th className="hp-th">Difficulty</th>
                  <th className="hp-th">Tags</th>
                  <th className="hp-th" style={{ width:80, textAlign:"center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const ds = DIFF[p.difficulty] || DIFF.easy;
                  const tags = Array.isArray(p.tags) ? p.tags : [p.tags];
                  return (
                    <tr key={p._id} className="hp-tr">
                      <td className="hp-td" style={{ color:textMut, fontFamily:"'JetBrains Mono',monospace", fontSize:13 }}>{i+1}</td>
                      <td className="hp-td">
                        <NavLink to={`/problem/${p._id}`} className="hp-link">{p.title}</NavLink>
                      </td>
                      <td className="hp-td">
                        <span className="hp-badge" style={{ color:ds.color, background:ds.bg, borderColor:ds.border }}>
                          {p.difficulty.charAt(0).toUpperCase() + p.difficulty.slice(1)}
                        </span>
                      </td>
                      <td className="hp-td">
                        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                          {tags.map(t => <span key={t} className="hp-tag">{t}</span>)}
                        </div>
                      </td>
                      <td className="hp-td" style={{ textAlign:"center" }}>
                        {solvedIds.has(p._id)
                          ? <CheckCircle2 size={18} color="#22c55e"/>
                          : <span style={{ color:textMut, fontSize:16 }}>—</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}