import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import axiosClient from "../utils/axiosClient";
import { ChevronLeft, BrainCircuit, Activity, BarChart3, TrendingUp, AlertTriangle, MessageSquare, ShieldAlert, Award, Star } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, BarChart, Bar, Legend } from "recharts";

export default function InterviewAnalytics() {
    const navigate = useNavigate();
    const [analytics, setAnalytics] = useState(null);
    const [loading,   setLoading]   = useState(true);
    const [chartTab,  setChartTab]  = useState("score"); // score | verbal

    useEffect(() => {
        axiosClient.get("/api/interview/analytics")
            .then(({ data }) => {
                setAnalytics(data);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const scoreColor = (s) =>
        s >= 8 ? "#22c55e" : s >= 6 ? "#a855f7" : s >= 4 ? "#f59e0b" : "#ef4444";

    if (loading) return (
        <div style={{ minHeight:"100vh", background:"#1e1e1e", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ textAlign:"center" }}>
                <BrainCircuit size={40} className="spin-slow" color="#a855f7" style={{ margin:"0 auto 16px" }}/>
                <p style={{ color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", fontSize:13 }}>Loading analytics dashboard...</p>
                <style>{`
                    @keyframes spin { to { transform: rotate(360deg); } }
                    .spin-slow { animation: spin 4s linear infinite; }
                `}</style>
            </div>
        </div>
    );

    const {
        timeline = [],
        skillAvg = { confidence: 0, communication: 0, correctness: 0 },
        topicMap = {},
        totalCount = 0,
        completedCount = 0,
        avgImprovement = 0
    } = analytics || {};

    const completionRate = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

    // Build overall radar data
    const radarData = [
        { subject: "Confidence",    Score: skillAvg.confidence },
        { subject: "Communication", Score: skillAvg.communication },
        { subject: "Correctness",   Score: skillAvg.correctness },
    ];

    // Determine weakest skill to provide customized tips
    const skills = [
        { name: "confidence", value: skillAvg.confidence, display: "Confidence", tip: "Improve confidence by practicing pacing, keeping eye contact (or focusing on the avatar), and speaking in complete sentences without rushing." },
        { name: "communication", value: skillAvg.communication, display: "Communication", tip: "Reduce filler words like 'um', 'like', and 'basically'. Use structured answers like the STAR method (Situation, Task, Action, Result) for behavioral questions." },
        { name: "correctness", value: skillAvg.correctness, display: "Correctness / Content Accuracy", tip: "Ensure you address all parts of the question. Practice writing down core technical principles, algorithms, or definitions before starting your verbal response." }
    ];
    
    // Sort ascending to find the lowest score
    const sortedSkills = [...skills].sort((a, b) => a.value - b.value);
    const weakestSkill = completedCount > 0 ? sortedSkills[0] : null;

    const formattedTimeline = timeline.map((item, idx) => {
        const dateObj = new Date(item.date);
        return {
            ...item,
            formattedDate: dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            index: idx + 1
        };
    });

    return (
        <div style={{ minHeight:"100vh", background:"#1e1e1e", fontFamily:"'Syne',sans-serif", color:"var(--text-primary)" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@400;600;700;800;900&display=swap');
                *, *::before, *::after { box-sizing:border-box; }
                .an-nav { height:60px; background:var(--bg-secondary); border-bottom:1px solid var(--border); display:flex; align-items:center; padding:0 24px; gap:12px; position:sticky; top:0; z-index:100; }
                .an-back { background:none; border:1px solid var(--border); border-radius:8px; padding:6px 12px; color:var(--text-muted); cursor:pointer; display:inline-flex; align-items:center; gap:6px; font-size:12px; font-family:'JetBrains Mono',monospace; transition:all 0.2s; }
                .an-back:hover { color:#fff; border-color:var(--accent); background:var(--accent-bg); }
                .an-body { max-width:1140px; margin:0 auto; padding:36px 24px; }
                
                .an-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px; }
                @media (max-width:850px) { .an-grid-2 { grid-template-columns:1fr; } }
                
                .an-card { background:var(--bg-card); border:1px solid var(--border); border-radius:20px; padding:24px; }
                .an-label { font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; font-family:'JetBrains Mono',monospace; margin-bottom:18px; display:flex; align-items:center; gap:8px; }
                
                .an-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
                @media (max-width:768px) { .an-stats { grid-template-columns:repeat(2,1fr); } }
                .an-stat { background:var(--bg-card); border:1px solid var(--border); border-radius:16px; padding:20px; display:flex; flex-direction:column; align-items:center; text-align:center; transition:all 0.2s; }
                .an-stat:hover { border-color:var(--accent); background:var(--accent-bg); }
                .an-stat-num { font-size:28px; font-weight:900; line-height:1.1; margin-top:8px; }
                .an-stat-lbl { font-size:10px; color:var(--text-muted); font-family:'JetBrains Mono',monospace; margin-top:6px; text-transform:uppercase; letter-spacing:0.5px; }

                .an-tab-btn { background:none; border:1px solid var(--border); padding:6px 14px; border-radius:8px; color:var(--text-muted); font-size:11px; font-family:'JetBrains Mono',monospace; cursor:pointer; transition:all 0.2s; }
                .an-tab-btn:hover { color:#fff; border-color:var(--text-muted); }
                .an-tab-btn.active { background:var(--accent-bg); border-color:var(--accent); color:var(--accent); }

                /* Topic row styles */
                .an-topic-item { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-radius:12px; background:var(--bg-primary); border:1px solid var(--border); margin-bottom:8px; }
                .an-topic-role { font-weight:700; font-size:14px; color:#fff; }
                .an-topic-count { font-size:11px; color:var(--text-muted); font-family:'JetBrains Mono',monospace; margin-top:3px; }
                .an-score-badge { padding:4px 10px; border-radius:12px; font-size:12px; font-weight:800; font-family:'JetBrains Mono',monospace; text-align:center; }
            `}</style>

            {/* Nav */}
            <nav className="an-nav">
                <button className="an-back" onClick={() => navigate("/interview/history")}>
                    <ChevronLeft size={13}/>History
                </button>
                <BrainCircuit size={16} color="#a855f7"/>
                <span style={{ fontSize:14, fontWeight:800, color:"#fff" }}>Mock Interview Analytics</span>
            </nav>

            <div className="an-body">
                {/* Header */}
                <div style={{ marginBottom:28 }}>
                    <h1 style={{ fontSize:28, fontWeight:900, color:"#fff", margin:"0 0 6px", letterSpacing:"-0.5px" }}>
                        Verbal & Skill Intelligence
                    </h1>
                    <p style={{ fontSize:13, color:"rgba(255,255,255,0.35)", fontFamily:"'JetBrains Mono',monospace", margin:0 }}>
                        Track your confidence, communication correctness, fillers, and speech pacing across rounds
                    </p>
                </div>

                {/* Stats Row */}
                <div className="an-stats">
                    <div className="an-stat">
                        <BarChart3 size={20} color="#a855f7" />
                        <div className="an-stat-num" style={{ color: "#a855f7" }}>{totalCount}</div>
                        <div className="an-stat-lbl">Interviews Started</div>
                    </div>
                    <div className="an-stat">
                        <Activity size={20} color="#22c55e" />
                        <div className="an-stat-num" style={{ color: "#22c55e" }}>{completionRate}%</div>
                        <div className="an-stat-lbl">Completion Rate</div>
                    </div>
                    <div className="an-stat">
                        <TrendingUp size={20} color="#6366f1" />
                        <div className="an-stat-num" style={{ color: "#6366f1" }}>
                            {avgImprovement > 0 ? `+${avgImprovement}` : avgImprovement === 0 ? "—" : avgImprovement}
                        </div>
                        <div className="an-stat-lbl">Avg Score Growth</div>
                    </div>
                    <div className="an-stat">
                        <Award size={20} color="#f59e0b" />
                        <div className="an-stat-num" style={{ color: "#f59e0b" }}>
                            {completedCount > 0 ? (formattedTimeline.reduce((acc, curr) => Math.max(acc, curr.score), 0)) : 0}/10
                        </div>
                        <div className="an-stat-lbl">Highest Score</div>
                    </div>
                </div>

                {completedCount === 0 ? (
                    <div className="an-card" style={{ textAlign:"center", padding:"60px 40px" }}>
                        <div style={{ fontSize:48, marginBottom:16 }}>📊</div>
                        <p style={{ fontSize:16, fontWeight:700, color:"rgba(255,255,255,0.5)", margin:"0 0 8px" }}>
                            Not enough data to compute analytics
                        </p>
                        <p style={{ fontSize:12, color:"rgba(255,255,255,0.25)", fontFamily:"'JetBrains Mono',monospace", margin:"0 0 20px" }}>
                            Complete at least one mock interview to unlock trends and insights.
                        </p>
                        <button className="an-back" style={{ borderColor:"#a855f7", color:"#c084fc" }} onClick={() => navigate("/interview")}>
                            Start Mock Interview
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Timeline Trend Card */}
                        <div className="an-card" style={{ marginBottom: 20 }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18, flexWrap:"wrap", gap:10 }}>
                                <div className="an-label" style={{ margin:0 }}>
                                    <TrendingUp size={14} color="#a855f7"/> Interview Performance History
                                </div>
                                <div style={{ display:"flex", gap:6 }}>
                                    <button className={`an-tab-btn ${chartTab === "score" ? "active" : ""}`} onClick={() => setChartTab("score")}>Scores</button>
                                    <button className={`an-tab-btn ${chartTab === "verbal" ? "active" : ""}`} onClick={() => setChartTab("verbal")}>Verbal cues</button>
                                </div>
                            </div>
                            
                            <div style={{ height: 260 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    {chartTab === "score" ? (
                                        <AreaChart data={formattedTimeline}>
                                            <defs>
                                                <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                                            <XAxis dataKey="formattedDate" stroke="rgba(255,255,255,0.2)" tick={{ fontSize:11, fill:"rgba(255,255,255,0.3)" }}/>
                                            <YAxis domain={[0, 10]} stroke="rgba(255,255,255,0.2)" tick={{ fontSize:11, fill:"rgba(255,255,255,0.3)" }}/>
                                            <Tooltip contentStyle={{ background:"#1a1a2e", border:"1px solid rgba(168,85,247,0.3)", borderRadius:10, fontSize:12, fontFamily:"'JetBrains Mono',monospace" }} itemStyle={{ color:"#c084fc" }}/>
                                            <Area type="monotone" name="Overall Score" dataKey="score" stroke="#a855f7" fill="url(#scoreColor)" strokeWidth={2.5}/>
                                        </AreaChart>
                                    ) : (
                                        <BarChart data={formattedTimeline}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                                            <XAxis dataKey="formattedDate" stroke="rgba(255,255,255,0.2)" tick={{ fontSize:11, fill:"rgba(255,255,255,0.3)" }}/>
                                            <YAxis yAxisId="fillers" orientation="left" stroke="#ef4444" tick={{ fontSize:11, fill:"#ef4444" }}/>
                                            <YAxis yAxisId="wpm" orientation="right" stroke="#6366f1" tick={{ fontSize:11, fill:"#6366f1" }}/>
                                            <Tooltip contentStyle={{ background:"#1a1a2e", border:"1px solid rgba(168,85,247,0.3)", borderRadius:10, fontSize:12, fontFamily:"'JetBrains Mono',monospace" }}/>
                                            <Legend verticalAlign="top" height={36}/>
                                            <Bar yAxisId="fillers" name="Avg Fillers" dataKey="avgFillers" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={30}/>
                                            <Bar yAxisId="wpm" name="Avg WPM" dataKey="avgWpm" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={30}/>
                                        </BarChart>
                                    )}
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Split columns: Radar & Heatmap/Topics */}
                        <div className="an-grid-2">
                            <div className="an-card">
                                <div className="an-label">
                                    <Star size={14} color="#a855f7" /> Average Skill Profile
                                </div>
                                <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart data={radarData}>
                                            <PolarGrid stroke="rgba(255,255,255,0.08)"/>
                                            <PolarAngleAxis dataKey="subject" tick={{ fontSize:11, fill:"rgba(255,255,255,0.5)", fontFamily:"'JetBrains Mono',monospace" }}/>
                                            <Radar name="Averages" dataKey="Score" stroke="#a855f7" fill="rgba(168,85,247,0.2)" strokeWidth={2}/>
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="an-card">
                                <div className="an-label">
                                    <Activity size={14} color="#a855f7"/> Practice by Role
                                </div>
                                <div style={{ overflowY: "auto", maxHeight: 220 }}>
                                    {Object.entries(topicMap).map(([role, stats]) => {
                                        const col = scoreColor(stats.avgScore);
                                        return (
                                            <div key={role} className="an-topic-item">
                                                <div>
                                                    <div className="an-topic-role">{role}</div>
                                                    <div className="an-topic-count">{stats.count} mock session{stats.count > 1 ? "s" : ""}</div>
                                                </div>
                                                <div className="an-score-badge" style={{ color: col, background: `${col}12`, border: `1px solid ${col}25` }}>
                                                    {stats.avgScore}/10
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Speech Quality / Weakest Skill tips */}
                        {weakestSkill && (
                            <div className="an-card" style={{ background:"rgba(168,85,247,0.05)", borderColor:"rgba(168,85,247,0.2)" }}>
                                <div className="an-label" style={{ color: "#c084fc" }}>
                                    <ShieldAlert size={14} color="#c084fc"/> AI Coaching Insights
                                </div>
                                <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px", color: "#fff" }}>
                                    Focus Area: Improve {weakestSkill.display} (Current Avg: {weakestSkill.value}/10)
                                </h3>
                                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, margin: 0, fontFamily: "'JetBrains Mono',monospace" }}>
                                    {weakestSkill.tip}
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
