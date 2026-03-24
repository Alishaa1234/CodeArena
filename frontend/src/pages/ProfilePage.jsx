import { useEffect, useState } from "react";
import { NavLink } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import axiosClient from "../utils/axiosClient";
import { logoutUser } from "../authSlice";
import ThemeToggle from "../components/ThemeToggle";
import {
    Code2, LogOut, Settings, CheckCircle2, XCircle,
    AlertCircle, Clock, Flame, Trophy, ChevronLeft,
    Swords, TrendingUp, Target
} from "lucide-react";

const fmt = (date) => new Date(date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric"
});

// ── Heatmap ───────────────────────────────────────────────────────────────────
function Heatmap({ data, isDark }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const toKey = (d) =>
        `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    const days = [];
    for (let i = 364; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        days.push({ date: toKey(d), count: data[toKey(d)] || 0 });
    }

    const weeks = [];
    let week = [];
    const startDay = new Date(days[0].date + 'T12:00:00').getDay();
    for (let i = 0; i < startDay; i++) week.push(null);
    days.forEach(d => {
        week.push(d);
        if (week.length === 7) { weeks.push(week); week = []; }
    });
    if (week.length) { while (week.length < 7) week.push(null); weeks.push(week); }

    // Track which week index each month starts at (for spacing)
    const monthStartWeeks = new Set();
    let lastM = -1;
    weeks.forEach((wk, wi) => {
        const first = wk.find(d => d !== null);
        if (!first) return;
        const m = new Date(first.date + 'T12:00:00').getMonth();
        if (m !== lastM) { monthStartWeeks.add(wi); lastM = m; }
    });

    const emptyColor = isDark ? "#2d2d2d" : "#ebedf0";
    const getColor = (count) => {
        if (!count) return emptyColor;
        if (count === 1) return isDark ? "#0e4429" : "#9be9a8";
        if (count === 2) return isDark ? "#006d32" : "#40c463";
        if (count === 3) return isDark ? "#26a641" : "#30a14e";
        return isDark ? "#39d353" : "#216e39";
    };

    const monthLabels = [];
    let lastMonth = -1;
    weeks.forEach((wk, wi) => {
        const first = wk.find(d => d !== null);
        if (!first) return;
        const m = new Date(first.date + 'T12:00:00').getMonth();
        if (m !== lastMonth) {
            monthLabels.push({ wi, label: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m] });
            lastMonth = m;
        }
    });

    const activeDays = Object.values(data).filter(v => v > 0).length;
    const total = Object.values(data).reduce((a, b) => a + b, 0);

    return (
        <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <span style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)" }}>Submission activity</span>
                <span style={{ fontSize:11, color:"var(--text-muted)", fontFamily:"'JetBrains Mono',monospace" }}>
                    {total} submissions · {activeDays} active days
                </span>
            </div>
            {/* Month labels */}
            <div style={{ display:"flex", gap:2, marginBottom:3 }}>
                {weeks.map((_, wi) => {
                    const lbl = monthLabels.find(m => m.wi === wi);
                    return <div key={wi} style={{ width:11, flexShrink:0, fontSize:9, color:"var(--text-muted)", fontFamily:"'JetBrains Mono',monospace", overflow:"visible", whiteSpace:"nowrap" }}>{lbl?.label || ""}</div>;
                })}
            </div>
            {/* Grid */}
            <div style={{ overflowX:"auto" }}>
                <div style={{ display:"flex", gap:2, minWidth:"fit-content" }}>
                    {weeks.map((wk, wi) => (
                        <div key={wi} style={{ display:"flex", flexDirection:"column", gap:2, marginLeft: wi > 0 && monthStartWeeks.has(wi) ? 6 : 0 }}>
                            {wk.map((day, di) => (
                                <div key={di}
                                    title={day ? `${day.date}: ${day.count} submission${day.count !== 1 ? "s" : ""}` : ""}
                                    style={{
                                        width:11, height:11, borderRadius:2, flexShrink:0,
                                        background: day ? getColor(day.count) : "transparent",
                                    }}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
            {/* Legend */}
            <div style={{ display:"flex", alignItems:"center", gap:3, marginTop:8, justifyContent:"flex-end" }}>
                <span style={{ fontSize:10, color:"var(--text-muted)", fontFamily:"'JetBrains Mono',monospace", marginRight:2 }}>Less</span>
                {[0,1,2,3,4].map(n => (
                    <div key={n} style={{ width:11, height:11, borderRadius:2, background: getColor(n) }} />
                ))}
                <span style={{ fontSize:10, color:"var(--text-muted)", fontFamily:"'JetBrains Mono',monospace", marginLeft:2 }}>More</span>
            </div>
        </div>
    );
}

// ── Donut ─────────────────────────────────────────────────────────────────────
function Donut({ easy=0, medium=0, hard=0 }) {
    const total = easy + medium + hard;
    const size = 110, r = 40, cx = 55, cy = 55;
    const circ = 2 * Math.PI * r;
    const segs = [
        { v:easy,   c:"#00b8a3", label:"Easy"   },
        { v:medium, c:"#ffa116", label:"Medium" },
        { v:hard,   c:"#ff375f", label:"Hard"   },
    ];
    let off = 0;
    const arcs = segs.map(s => {
        const d = total ? (s.v/total)*circ : 0;
        const a = { ...s, d, off };
        off += d;
        return a;
    });

    return (
        <div style={{ display:"flex", alignItems:"center", gap:20 }}>
            <svg width={size} height={size} style={{ transform:"rotate(-90deg)", flexShrink:0 }}>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={10}/>
                {total > 0 && arcs.map((a,i) => a.v > 0 && (
                    <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                        stroke={a.c} strokeWidth={10}
                        strokeDasharray={`${a.d} ${circ-a.d}`}
                        strokeDashoffset={-a.off}
                    />
                ))}
                <text x={cx} y={cy-7} textAnchor="middle"
                    style={{ fill:"var(--text-primary)", fontSize:20, fontWeight:900, fontFamily:"'Syne',sans-serif" }}
                    transform={`rotate(90,${cx},${cy})`}>{total}</text>
                <text x={cx} y={cy+10} textAnchor="middle"
                    style={{ fill:"var(--text-muted)", fontSize:10, fontFamily:"'JetBrains Mono',monospace" }}
                    transform={`rotate(90,${cx},${cy})`}>solved</text>
            </svg>
            <div style={{ flex:1 }}>
                {segs.map(s => (
                    <div key={s.label} style={{ marginBottom:10 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                            <span style={{ fontSize:12, color:"var(--text-muted)", fontFamily:"'JetBrains Mono',monospace" }}>{s.label}</span>
                            <span style={{ fontSize:12, fontWeight:700, color:s.c, fontFamily:"'JetBrains Mono',monospace" }}>{s.v}</span>
                        </div>
                        <div style={{ height:4, background:"var(--border)", borderRadius:2, overflow:"hidden" }}>
                            <div style={{ height:"100%", borderRadius:2, background:s.c, width:total ? `${(s.v/total)*100}%`:"0%", transition:"width 1s ease" }}/>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
    const dispatch = useDispatch();
    const { user: authUser } = useSelector(s => s.auth);

    // Read theme directly from DOM — stays in sync when ThemeToggle fires
    const [isDark, setIsDark] = useState(
        !document.documentElement.classList.contains('light')
    );
    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDark(!document.documentElement.classList.contains('light'));
        });
        observer.observe(document.documentElement, {
            attributes: true, attributeFilter: ['class']
        });
        return () => observer.disconnect();
    }, []);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axiosClient.get("/profile/me")
            .then(({ data }) => setProfile(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    // Theme-aware colors
    const card    = isDark ? "#1c1c1e" : "#ffffff";
    const cardBdr = isDark ? "#2c2c2e" : "#e5e7eb";
    const tile    = isDark ? "#2c2c2e" : "#f4f4f5";
    const tileBdr = isDark ? "#3a3a3c" : "#e4e4e7";
    const text    = isDark ? "#f5f5f5" : "#111111";
    const textSub = isDark ? "#a1a1aa" : "#52525b";
    const textMut = isDark ? "#71717a" : "#a1a1aa";
    const pageBg  = isDark ? "#111111" : "#f9f9fb";

    const STATUS = {
        accepted: { label:"Accepted", color:"#22c55e", bg: isDark ? "rgba(34,197,94,0.15)"  : "rgba(34,197,94,0.1)",  icon:<CheckCircle2 size={11}/> },
        wrong:    { label:"Wrong",    color:"#ef4444", bg: isDark ? "rgba(239,68,68,0.15)"   : "rgba(239,68,68,0.1)",  icon:<XCircle size={11}/> },
        error:    { label:"Error",    color:"#f59e0b", bg: isDark ? "rgba(245,158,11,0.15)"  : "rgba(245,158,11,0.1)", icon:<AlertCircle size={11}/> },
        pending:  { label:"Pending",  color:"#71717a", bg: isDark ? "rgba(113,113,122,0.15)" : "rgba(113,113,122,0.1)",icon:<Clock size={11}/> },
    };
    const DIFF_C = { easy:"#22c55e", medium:"#f59e0b", hard:"#ef4444" };
    const DIFF_B = {
        easy:   isDark ? "rgba(34,197,94,0.15)"  : "rgba(34,197,94,0.1)",
        medium: isDark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.1)",
        hard:   isDark ? "rgba(239,68,68,0.15)"  : "rgba(239,68,68,0.1)",
    };

    const card_style = {
        background: card,
        border: `1px solid ${cardBdr}`,
        borderRadius: 16,
        padding: 22,
    };

    return (
        <div style={{ minHeight:"100vh", background:pageBg, fontFamily:"'Syne',sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@400;600;700;800;900&display=swap');
                *, *::before, *::after { box-sizing:border-box; }
                .pf-nav { position:sticky; top:0; z-index:50; height:56px; background:${isDark ? "rgba(17,17,17,0.92)" : "rgba(255,255,255,0.92)"}; backdrop-filter:blur(16px); border-bottom:1px solid ${cardBdr}; display:flex; align-items:center; padding:0 20px; gap:12px; }
                .pf-back { color:${textMut}; text-decoration:none; display:inline-flex; align-items:center; gap:5px; font-size:12px; font-family:'JetBrains Mono',monospace; padding:6px 10px; border-radius:8px; border:1px solid ${cardBdr}; transition:all 0.2s; background:none; }
                .pf-back:hover { color:${text}; border-color:${textMut}; background:${tile}; }
                .pf-nav-btn { background:none; border:1px solid ${cardBdr}; border-radius:8px; padding:6px 12px; color:${textMut}; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:6px; transition:all 0.2s; font-family:'Syne',sans-serif; }
                .pf-nav-btn:hover { border-color:${textMut}; color:${text}; background:${tile}; }
                .pf-body { max-width:1080px; margin:0 auto; padding:28px 20px; display:grid; grid-template-columns:270px 1fr; gap:16px; }
                @media (max-width:860px) { .pf-body { grid-template-columns:1fr; } }
                .pf-hr { height:1px; background:${cardBdr}; margin:16px 0; }
                .pf-label { font-size:10px; font-weight:700; color:${textMut}; text-transform:uppercase; letter-spacing:1.2px; font-family:'JetBrains Mono',monospace; margin-bottom:12px; }
                .pf-tile { background:${tile}; border:1px solid ${tileBdr}; border-radius:10px; padding:14px; }
                .pf-sub { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:11px 0; border-bottom:1px solid ${cardBdr}; }
                .pf-sub:last-child { border-bottom:none; }
                .pf-sub-link { font-size:13px; font-weight:700; color:${text}; text-decoration:none; transition:color 0.15s; }
                .pf-sub-link:hover { color:#ffa116; }
                .pf-loading { display:flex; align-items:center; justify-content:center; height:60vh; color:${textMut}; font-family:'JetBrains Mono',monospace; font-size:13px; }
            `}</style>

            {/* Navbar */}
            <nav className="pf-nav">
                <NavLink to="/" className="pf-back"><ChevronLeft size={13}/>Back</NavLink>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:28, height:28, background:"#ffa116", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <Code2 size={15} color="#000"/>
                    </div>
                    <span style={{ fontSize:15, fontWeight:800, color:text }}>LeetCode</span>
                </div>
                <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8 }}>
                    {authUser?.role === "admin" && (
                        <NavLink to="/admin">
                            <button className="pf-nav-btn"><Settings size={13}/>Admin</button>
                        </NavLink>
                    )}
                    <ThemeToggle/>
                    <button className="pf-nav-btn" onClick={() => dispatch(logoutUser())}>
                        <LogOut size={13}/>Logout
                    </button>
                </div>
            </nav>

            {loading ? (
                <div className="pf-loading">Loading profile...</div>
            ) : !profile?.user ? (
                <div className="pf-loading">Failed to load profile.</div>
            ) : (
                <div className="pf-body">

                    {/* ── Left column ── */}
                    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

                        {/* Profile card */}
                        <div style={card_style}>
                            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
                                <div style={{ width:64, height:64, borderRadius:"50%", background:"linear-gradient(135deg,#ffa116,#ff5722)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, fontWeight:900, color:"#fff", flexShrink:0 }}>
                                    {profile.user.firstName?.[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ fontSize:17, fontWeight:900, color:text, letterSpacing:"-0.3px", lineHeight:1.2 }}>
                                        {profile.user.firstName} {profile.user.lastName || ""}
                                    </div>
                                    <div style={{ fontSize:12, color:textMut, fontFamily:"'JetBrains Mono',monospace", marginTop:3 }}>
                                        {profile.user.emailId}
                                    </div>
                                    <span style={{ marginTop:6, display:"inline-block", padding:"2px 9px", borderRadius:20, fontSize:10, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", background:"rgba(255,161,22,0.15)", border:"1px solid rgba(255,161,22,0.4)", color:"#ffa116" }}>
                                        {profile.user.role}
                                    </span>
                                </div>
                            </div>

                            <div className="pf-hr"/>

                            {[
                                { icon:<Clock size={12} color={textMut}/>,      text:`Joined ${fmt(profile.user.createdAt)}` },
                                { icon:<TrendingUp size={12} color={textMut}/>, text:`${profile.acceptanceRate ?? 0}% acceptance rate` },
                                { icon:<Target size={12} color={textMut}/>,     text:`${profile.totalSubmissions ?? 0} total submissions` },
                            ].map(({ icon, text: t }, i) => (
                                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:textSub, fontFamily:"'JetBrains Mono',monospace", marginBottom:7 }}>
                                    {icon}{t}
                                </div>
                            ))}

                            <div className="pf-hr"/>

                            {/* Streaks */}
                            <div className="pf-label">Streaks</div>
                            <div style={{ display:"flex", gap:10 }}>
                                {[
                                    { icon:<Flame size={18} color="#ffa116"/>, num:profile.streaks?.current ?? 0, label:"Current" },
                                    { icon:<Trophy size={18} color="#ffa116"/>, num:profile.streaks?.max ?? 0, label:"Best" },
                                ].map(({ icon, num, label }) => (
                                    <div key={label} className="pf-tile" style={{ flex:1, textAlign:"center" }}>
                                        <div style={{ marginBottom:6 }}>{icon}</div>
                                        <div style={{ fontSize:26, fontWeight:900, color:"#ffa116", fontFamily:"'Syne',sans-serif", lineHeight:1 }}>{num}</div>
                                        <div style={{ fontSize:10, color:textMut, fontFamily:"'JetBrains Mono',monospace", marginTop:5, textTransform:"uppercase", letterSpacing:"0.5px" }}>{label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* ELO */}
                            {profile.user.eloRating != null && (
                                <>
                                    <div className="pf-hr"/>
                                    <div className="pf-label">Duel rating</div>
                                    <div style={{ background:isDark ? "rgba(255,161,22,0.08)" : "rgba(255,161,22,0.06)", border:"1px solid rgba(255,161,22,0.25)", borderRadius:12, padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                                            <Swords size={18} color="#ffa116"/>
                                            <div>
                                                <div style={{ fontSize:22, fontWeight:900, color:"#ffa116", fontFamily:"'Syne',sans-serif", lineHeight:1 }}>{profile.user.eloRating}</div>
                                                <div style={{ fontSize:10, color:textMut, fontFamily:"'JetBrains Mono',monospace", marginTop:2 }}>ELO rating</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign:"right" }}>
                                            <div style={{ fontSize:18, fontWeight:700, color:text, fontFamily:"'Syne',sans-serif" }}>{profile.user.duelsPlayed ?? 0}</div>
                                            <div style={{ fontSize:10, color:textMut, fontFamily:"'JetBrains Mono',monospace" }}>duels played</div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Donut */}
                        <div style={card_style}>
                            <div className="pf-label">Problems solved</div>
                            <Donut
                                easy={profile.stats?.easy ?? 0}
                                medium={profile.stats?.medium ?? 0}
                                hard={profile.stats?.hard ?? 0}
                            />
                        </div>
                    </div>

                    {/* ── Right column ── */}
                    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

                        {/* Overview */}
                        <div style={card_style}>
                            <div className="pf-label">Overview</div>
                            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:22 }}>
                                {[
                                    { num: profile.stats?.total ?? 0,         label:"Solved",      color:"#ffa116" },
                                    { num: profile.acceptedSubmissions ?? 0,  label:"Accepted",    color:"#22c55e" },
                                    { num: profile.totalSubmissions ?? 0,     label:"Submissions", color: textSub  },
                                ].map(({ num, label, color }) => (
                                    <div key={label} className="pf-tile" style={{ textAlign:"center" }}>
                                        <div style={{ fontSize:26, fontWeight:900, color, fontFamily:"'Syne',sans-serif", lineHeight:1 }}>{num}</div>
                                        <div style={{ fontSize:10, color:textMut, fontFamily:"'JetBrains Mono',monospace", marginTop:6, textTransform:"uppercase", letterSpacing:"0.5px" }}>{label}</div>
                                    </div>
                                ))}
                            </div>

                            {[
                                { label:"Easy",   value:profile.stats?.easy   ?? 0, color:"#22c55e" },
                                { label:"Medium", value:profile.stats?.medium ?? 0, color:"#f59e0b" },
                                { label:"Hard",   value:profile.stats?.hard   ?? 0, color:"#ef4444" },
                            ].map(({ label, value, color }) => {
                                const total = profile.stats?.total ?? 0;
                                return (
                                    <div key={label} style={{ marginBottom:14 }}>
                                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                                            <span style={{ fontSize:12, color:textSub, fontFamily:"'JetBrains Mono',monospace" }}>{label}</span>
                                            <span style={{ fontSize:12, fontWeight:700, color, fontFamily:"'JetBrains Mono',monospace" }}>{value}</span>
                                        </div>
                                        <div style={{ height:5, background:tileBdr, borderRadius:3, overflow:"hidden" }}>
                                            <div style={{ height:"100%", borderRadius:3, background:color, width:total > 0 ? `${(value/total)*100}%` : "0%", transition:"width 1s ease" }}/>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Heatmap */}
                        <div style={card_style}>
                            <Heatmap data={profile.heatmap ?? {}} isDark={isDark}/>
                        </div>

                        {/* Recent submissions */}
                        <div style={card_style}>
                            <div className="pf-label">Recent submissions</div>
                            {(profile.recentSubmissions?.length ?? 0) === 0 ? (
                                <div style={{ color:textMut, fontSize:13, fontFamily:"'JetBrains Mono',monospace" }}>No submissions yet.</div>
                            ) : profile.recentSubmissions.map((sub) => {
                                const sc = STATUS[sub.status] || STATUS.pending;
                                return (
                                    <div key={sub._id} className="pf-sub">
                                        <div style={{ flex:1, minWidth:0 }}>
                                            <NavLink to={`/problem/${sub.problemId}`} className="pf-sub-link">
                                                {sub.problemTitle}
                                            </NavLink>
                                            <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4, flexWrap:"wrap" }}>
                                                <span style={{ fontSize:10, fontFamily:"'JetBrains Mono',monospace", color:DIFF_C[sub.difficulty] ?? textMut, background:DIFF_B[sub.difficulty] ?? "transparent", padding:"2px 8px", borderRadius:20 }}>
                                                    {sub.difficulty}
                                                </span>
                                                <span style={{ fontSize:11, color:textMut, fontFamily:"'JetBrains Mono',monospace" }}>{sub.language}</span>
                                                <span style={{ fontSize:11, color:textMut, fontFamily:"'JetBrains Mono',monospace" }}>{fmt(sub.createdAt)}</span>
                                            </div>
                                        </div>
                                        <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:sc.color, background:sc.bg, flexShrink:0 }}>
                                            {sc.icon}{sc.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}