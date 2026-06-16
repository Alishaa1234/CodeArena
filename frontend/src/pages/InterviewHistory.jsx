import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import axiosClient from "../utils/axiosClient";
import { ChevronLeft, BrainCircuit, CheckCircle2, Clock, Search, Plus, TrendingUp, Award, Target } from "lucide-react";

export default function InterviewHistory() {
    const navigate = useNavigate();
    const [interviews, setInterviews] = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [query,      setQuery]      = useState("");
    const [filter,     setFilter]     = useState("all"); // all | completed | pending

    useEffect(() => {
        axiosClient.get("/api/interview/get-interview")
            .then(({ data }) => setInterviews(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const fmt = (date) => new Date(date).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric"
    });

    const filtered = interviews.filter(i => {
        const matchQ = !query.trim() ||
            i.role.toLowerCase().includes(query.toLowerCase()) ||
            i.mode.toLowerCase().includes(query.toLowerCase());
        const matchF =
            filter === "all" ||
            (filter === "completed" && i.status === "completed") ||
            (filter === "pending"   && i.status !== "completed");
        return matchQ && matchF;
    });

    const scoreColor = (s) =>
        s >= 8 ? "#22c55e" : s >= 6 ? "#a855f7" : s >= 4 ? "#f59e0b" : "#ef4444";

    const scoreLabel = (s) =>
        s >= 8 ? "Excellent" : s >= 6 ? "Good" : s >= 4 ? "Average" : "Weak";

    // Stats
    const completed  = interviews.filter(i => i.status === "completed");
    const avgScore   = completed.length
        ? (completed.reduce((a, b) => a + (b.finalScore || 0), 0) / completed.length).toFixed(1)
        : 0;
    const bestScore  = completed.length
        ? Math.max(...completed.map(i => i.finalScore || 0))
        : 0;

    return (
        <div style={{ minHeight:"100vh", background:"#1e1e1e", fontFamily:"'Syne',sans-serif", color:"#f0f0f0" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@400;600;700;800;900&display=swap');
                *, *::before, *::after { box-sizing:border-box; }

                .ih-bg { position:fixed; inset:0; background:#1e1e1e; z-index:0; overflow:hidden; }
                .ih-bg::before { content:''; position:absolute; top:-20%; right:-10%; width:400px; height:400px; background:radial-gradient(circle,rgba(168,85,247,0.08) 0%,transparent 70%); border-radius:50%; }

                .ih-wrap { position:relative; z-index:1; }
                .ih-nav { height:60px; background:var(--nav-bg); backdrop-filter:blur(20px); border-bottom:1px solid rgba(168,85,247,0.15); display:flex; align-items:center; padding:0 24px; gap:12px; position:sticky; top:0; z-index:100; }
                .ih-back { background:none; border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:6px 12px; color:rgba(255,255,255,0.4); cursor:pointer; display:inline-flex; align-items:center; gap:6px; font-size:12px; font-family:'JetBrains Mono',monospace; transition:all 0.2s; }
                .ih-back:hover { color:#fff; border-color:rgba(168,85,247,0.4); }
                .ih-body { max-width:860px; margin:0 auto; padding:36px 24px; }

                /* Stats row */
                .ih-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:28px; }
                @media (max-width:640px) { .ih-stats { grid-template-columns:repeat(2,1fr); } }
                .ih-stat { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:16px; padding:18px 16px; text-align:center; }
                .ih-stat-num { font-size:26px; font-weight:900; font-family:'Syne',sans-serif; line-height:1; }
                .ih-stat-lbl { font-size:10px; color:rgba(255,255,255,0.3); font-family:'JetBrains Mono',monospace; margin-top:6px; text-transform:uppercase; letter-spacing:0.5px; }

                /* Filters */
                .ih-toolbar { display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap; align-items:center; }
                .ih-search { flex:1; min-width:200px; position:relative; }
                .ih-search-input { width:100%; padding:10px 14px 10px 38px; border-radius:12px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.04); color:#f0f0f0; font-size:13px; outline:none; font-family:'JetBrains Mono',monospace; transition:all 0.2s; }
                .ih-search-input:focus { border-color:#a855f7; background:rgba(168,85,247,0.06); }
                .ih-search-input::placeholder { color:rgba(255,255,255,0.2); }
                .ih-search-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:rgba(255,255,255,0.2); pointer-events:none; }
                .ih-filter-btn { padding:9px 16px; border-radius:10px; border:1px solid rgba(255,255,255,0.08); background:none; color:rgba(255,255,255,0.4); font-size:12px; font-weight:700; cursor:pointer; font-family:'Syne',sans-serif; transition:all 0.15s; }
                .ih-filter-btn:hover { border-color:rgba(168,85,247,0.3); color:#fff; }
                .ih-filter-btn.active { border-color:#a855f7; background:rgba(168,85,247,0.1); color:#c084fc; }

                /* Cards */
                .ih-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:18px; padding:20px 24px; margin-bottom:10px; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; gap:16px; }
                .ih-card:hover { border-color:rgba(168,85,247,0.35); background:rgba(168,85,247,0.04); transform:translateY(-2px); box-shadow:0 8px 32px rgba(168,85,247,0.08); }
                .ih-card-icon { width:46px; height:46px; border-radius:12px; background:rgba(168,85,247,0.1); border:1px solid rgba(168,85,247,0.2); display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:20px; }
                .ih-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:20px; font-size:10px; font-weight:700; font-family:'JetBrains Mono',monospace; flex-shrink:0; }
                .ih-score-ring { width:52px; height:52px; flex-shrink:0; }
                .ih-new-btn { display:inline-flex; align-items:center; gap:8px; padding:12px 22px; border-radius:12px; background:linear-gradient(135deg,#a855f7,#6366f1); border:none; color:#fff; font-size:14px; font-weight:700; cursor:pointer; font-family:'Syne',sans-serif; transition:all 0.2s; }
                .ih-new-btn:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(168,85,247,0.4); }

                .ih-empty { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:20px; padding:60px 40px; text-align:center; }
            `}</style>

            <div className="ih-bg"/>
            <div className="ih-wrap">

                {/* Nav */}
                <nav className="ih-nav">
                    <button className="ih-back" onClick={() => navigate("/")}>
                        <ChevronLeft size={13}/>Home
                    </button>
                    <BrainCircuit size={16} color="#a855f7"/>
                    <span style={{ fontSize:14, fontWeight:800, color:"#fff" }}>Interview History</span>
                    <button className="ih-back" style={{ marginLeft:"auto", borderColor:"rgba(168,85,247,0.3)", color:"#c084fc" }} onClick={() => navigate("/interview/analytics")}>
                        📊 Analytics
                    </button>
                    <button className="ih-new-btn" style={{ padding:"7px 16px", fontSize:13 }} onClick={() => navigate("/interview")}>
                        <Plus size={13}/>New Interview
                    </button>
                </nav>

                <div className="ih-body">

                    {/* Header */}
                    <div style={{ marginBottom:28 }}>
                        <h1 style={{ fontSize:26, fontWeight:900, color:"#fff", margin:"0 0 6px", letterSpacing:"-0.5px" }}>
                            Your Interviews
                        </h1>
                        <p style={{ fontSize:13, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", margin:0 }}>
                            Track your progress and review past performance
                        </p>
                    </div>

                    {/* Stats */}
                    {!loading && interviews.length > 0 && (
                        <div className="ih-stats">
                            {[
                                { icon:<Target size={18} color="#a855f7"/>, num:interviews.length,     label:"Total",    color:"#a855f7" },
                                { icon:<CheckCircle2 size={18} color="#22c55e"/>, num:completed.length, label:"Completed", color:"#22c55e" },
                                { icon:<TrendingUp size={18} color="#6366f1"/>, num:avgScore,            label:"Avg Score", color:"#6366f1" },
                                { icon:<Award size={18} color="#f59e0b"/>, num:bestScore,                label:"Best Score",color:"#f59e0b" },
                            ].map(({ icon, num, label, color }) => (
                                <div key={label} className="ih-stat">
                                    <div style={{ display:"flex", justifyContent:"center", marginBottom:8 }}>{icon}</div>
                                    <div className="ih-stat-num" style={{ color }}>{num}</div>
                                    <div className="ih-stat-lbl">{label}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Toolbar */}
                    <div className="ih-toolbar">
                        <div className="ih-search">
                            <Search size={14} className="ih-search-icon"/>
                            <input className="ih-search-input" placeholder="Search by role or mode..."
                                value={query} onChange={e => setQuery(e.target.value)}/>
                        </div>
                        {["all","completed","pending"].map(f => (
                            <button key={f} className={`ih-filter-btn${filter === f ? " active" : ""}`}
                                onClick={() => setFilter(f)}>
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* List */}
                    {loading ? (
                        <div style={{ textAlign:"center", padding:"60px 0", color:"rgba(255,255,255,0.2)", fontFamily:"'JetBrains Mono',monospace", fontSize:13 }}>
                            Loading interviews...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="ih-empty">
                            <div style={{ fontSize:48, marginBottom:16 }}>
                                {interviews.length === 0 ? "🎙️" : "🔍"}
                            </div>
                            <p style={{ fontSize:15, fontWeight:700, color:"rgba(255,255,255,0.5)", margin:"0 0 8px" }}>
                                {interviews.length === 0 ? "No interviews yet" : "No matches found"}
                            </p>
                            <p style={{ fontSize:12, color:"rgba(255,255,255,0.2)", fontFamily:"'JetBrains Mono',monospace", margin:"0 0 20px" }}>
                                {interviews.length === 0 ? "Start your first AI mock interview" : "Try adjusting your search or filter"}
                            </p>
                            {interviews.length === 0 && (
                                <button className="ih-new-btn" onClick={() => navigate("/interview")}>
                                    <Plus size={14}/>Start First Interview
                                </button>
                            )}
                        </div>
                    ) : (
                        filtered.map((item) => {
                            const sc     = item.finalScore || 0;
                            const sColor = scoreColor(sc);
                            const modeEmoji = item.mode === "Technical" ? "💻" : "🤝";
                            return (
                                <div key={item._id} className="ih-card"
                                    onClick={() => navigate(`/interview/report/${item._id}`)}>

                                    {/* Icon */}
                                    <div className="ih-card-icon">{modeEmoji}</div>

                                    {/* Info */}
                                    <div style={{ flex:1, minWidth:0 }}>
                                        <div style={{ fontSize:15, fontWeight:800, color:"#fff", marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                            {item.role}
                                        </div>
                                        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                                            <span style={{ fontSize:11, color:"rgba(255,255,255,0.35)", fontFamily:"'JetBrains Mono',monospace" }}>
                                                {item.experience}
                                            </span>
                                            <span style={{ fontSize:11, color:"rgba(255,255,255,0.15)" }}>·</span>
                                            <span style={{ fontSize:11, color:"rgba(255,255,255,0.35)", fontFamily:"'JetBrains Mono',monospace" }}>
                                                {item.mode}
                                            </span>
                                            <span style={{ fontSize:11, color:"rgba(255,255,255,0.15)" }}>·</span>
                                            <span style={{ fontSize:11, color:"rgba(255,255,255,0.25)", fontFamily:"'JetBrains Mono',monospace" }}>
                                                {fmt(item.createdAt)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Score */}
                                    {item.status === "completed" && (
                                        <div style={{ textAlign:"center", flexShrink:0 }}>
                                            <div style={{ fontSize:22, fontWeight:900, color:sColor, fontFamily:"'Syne',sans-serif", lineHeight:1 }}>
                                                {sc}/10
                                            </div>
                                            <div style={{ fontSize:10, color:sColor, fontFamily:"'JetBrains Mono',monospace", marginTop:3, opacity:0.7 }}>
                                                {scoreLabel(sc)}
                                            </div>
                                        </div>
                                    )}

                                    {/* Status badge */}
                                    <span className="ih-badge" style={{
                                        color:      item.status === "completed" ? "#22c55e" : "#f59e0b",
                                        background: item.status === "completed" ? "rgba(34,197,94,0.1)"  : "rgba(245,158,11,0.1)",
                                        border:     `1px solid ${item.status === "completed" ? "rgba(34,197,94,0.25)" : "rgba(245,158,11,0.25)"}`,
                                    }}>
                                        {item.status === "completed"
                                            ? <><CheckCircle2 size={10}/>Done</>
                                            : <><Clock size={10}/>In Progress</>
                                        }
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}