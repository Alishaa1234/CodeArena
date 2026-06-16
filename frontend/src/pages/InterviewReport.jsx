 import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import axiosClient from "../utils/axiosClient";
import { ChevronLeft, BrainCircuit, Download, Star, TrendingUp, MessageSquare, Target, RotateCcw } from "lucide-react";
import { buildStyles, CircularProgressbar } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function InterviewReport() {
    const navigate = useNavigate();
    const { id }   = useParams();
    const [report,  setReport]  = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeQ, setActiveQ] = useState(null);

    useEffect(() => {
        const load = async () => {
            if (!id) {
                const cached = sessionStorage.getItem("interviewReport");
                if (cached) { setReport(JSON.parse(cached)); sessionStorage.removeItem("interviewReport"); setLoading(false); return; }
            }
            try {
                const { data } = await axiosClient.get(`/api/interview/report/${id}`);
                setReport(data);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        load();
    }, [id]);

    const downloadPDF = () => {
        const doc = new jsPDF("p","mm","a4");
        const pw = doc.internal.pageSize.getWidth();
        const m  = 20;
        let y    = 25;
        doc.setFont("helvetica","bold"); doc.setFontSize(20); doc.setTextColor(168,85,247);
        doc.text("AI Interview Report", pw/2, y, { align:"center" }); y += 8;
        doc.setDrawColor(168,85,247); doc.line(m, y, pw-m, y); y += 14;
        doc.setFillColor(245,240,255); doc.roundedRect(m, y, pw-m*2, 18, 4, 4, "F");
        doc.setFontSize(13); doc.setTextColor(0,0,0);
        doc.text(`Final Score: ${report.finalScore}/10  |  Confidence: ${report.confidence}  |  Communication: ${report.communication}  |  Correctness: ${report.correctness}`, pw/2, y+11, { align:"center" }); y += 30;
        autoTable(doc, {
            startY: y, margin: { left:m, right:m },
            head: [["#","Question","Score","Feedback"]],
            body: (report.questionWiseScore||[]).map((q,i) => [`${i+1}`, q.question, `${q.score}/10`, q.feedback]),
            styles: { fontSize:9, cellPadding:4 },
            headStyles: { fillColor:[168,85,247], textColor:255 },
            columnStyles: { 0:{cellWidth:10,halign:"center"}, 1:{cellWidth:55}, 2:{cellWidth:18,halign:"center"} },
        });
        doc.save("Interview_Report.pdf");
    };

    if (loading) return (
        <div style={{ minHeight:"100vh", background:"#1e1e1e", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ textAlign:"center" }}>
                <BrainCircuit size={40} color="#a855f7" style={{ margin:"0 auto 16px" }}/>
                <p style={{ color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", fontSize:13 }}>Loading your report...</p>
            </div>
        </div>
    );

    if (!report) return (
        <div style={{ minHeight:"100vh", background:"#1e1e1e", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <p style={{ color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace" }}>Report not found.</p>
        </div>
    );

    const { finalScore=0, confidence=0, communication=0, correctness=0, questionWiseScore=[] } = report;
    const pct = (finalScore/10)*100;

    const completedQs = questionWiseScore.filter(q => q.answer);
    const avgFillers = completedQs.length
        ? (completedQs.reduce((acc, q) => acc + (q.fillerCount || 0), 0) / completedQs.length).toFixed(1)
        : 0;
    const avgWpm = completedQs.length
        ? Math.round(completedQs.reduce((acc, q) => acc + (q.wpm || 0), 0) / completedQs.length)
        : 0;

    const chartData    = questionWiseScore.map((q,i) => ({ name:`Q${i+1}`, score:q.score||0 }));
    const radarData    = [
        { subject:"Confidence",    A:confidence    },
        { subject:"Communication", A:communication },
        { subject:"Correctness",   A:correctness   },
        { subject:"Overall",       A:finalScore    },
    ];
    const perfText  = finalScore >= 8 ? "Outstanding Performance 🏆" : finalScore >= 6 ? "Good Performance 👍" : finalScore >= 4 ? "Needs Improvement 📈" : "Keep Practicing 💪";
    const perfColor = finalScore >= 8 ? "#22c55e" : finalScore >= 6 ? "#a855f7" : finalScore >= 4 ? "#f59e0b" : "#ef4444";
    const advice    = finalScore >= 8
        ? "Excellent! You demonstrate strong technical knowledge and communication skills. You're ready for real interviews."
        : finalScore >= 6
        ? "Good performance with room to improve. Focus on structuring answers with the STAR method and adding concrete examples."
        : finalScore >= 4
        ? "You have the right foundation. Practice delivering concise, confident answers. Mock interviews will help significantly."
        : "Focus on fundamentals. Study common interview questions for your role, practice out loud, and work on clarity.";

    return (
        <div style={{ minHeight:"100vh", background:"#1e1e1e", fontFamily:"'Syne',sans-serif", color:"#f0f0f0" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@400;600;700;800;900&display=swap');
                *, *::before, *::after { box-sizing:border-box; }
                .rp-nav { height:60px; background:var(--nav-bg); backdrop-filter:blur(20px); border-bottom:1px solid rgba(168,85,247,0.15); display:flex; align-items:center; padding:0 24px; gap:12px; position:sticky; top:0; z-index:100; }
                .rp-back { background:none; border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:6px 12px; color:rgba(255,255,255,0.4); cursor:pointer; display:inline-flex; align-items:center; gap:6px; font-size:12px; font-family:'JetBrains Mono',monospace; transition:all 0.2s; }
                .rp-back:hover { color:#fff; border-color:rgba(168,85,247,0.4); background:rgba(168,85,247,0.08); }
                .rp-body { max-width:1080px; margin:0 auto; padding:36px 24px; }
                .rp-grid { display:grid; grid-template-columns:320px 1fr; gap:20px; }
                @media (max-width:900px) { .rp-grid { grid-template-columns:1fr; } }
                .rp-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:20px; padding:24px; }
                .rp-label { font-size:10px; font-weight:700; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:1px; font-family:'JetBrains Mono',monospace; margin-bottom:14px; }
                .rp-dl-btn { display:inline-flex; align-items:center; gap:8px; padding:10px 20px; border-radius:12px; background:linear-gradient(135deg,#a855f7,#6366f1); border:none; color:#fff; font-size:13px; font-weight:700; cursor:pointer; font-family:'Syne',sans-serif; transition:all 0.2s; }
                .rp-dl-btn:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(168,85,247,0.4); }
                .rp-again-btn { display:inline-flex; align-items:center; gap:8px; padding:10px 20px; border-radius:12px; border:1px solid rgba(168,85,247,0.3); background:rgba(168,85,247,0.08); color:#c084fc; font-size:13px; font-weight:700; cursor:pointer; font-family:'Syne',sans-serif; transition:all 0.2s; }
                .rp-again-btn:hover { border-color:#a855f7; background:rgba(168,85,247,0.15); color:#fff; }
                .rp-q-card { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:14px; padding:16px; margin-bottom:10px; cursor:pointer; transition:all 0.2s; }
                .rp-q-card:hover { border-color:rgba(168,85,247,0.3); background:rgba(168,85,247,0.04); }
                .rp-q-card.active { border-color:rgba(168,85,247,0.4); background:rgba(168,85,247,0.06); }
                .rp-skill-bar { height:5px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden; margin-top:5px; }
                .rp-skill-fill { height:100%; border-radius:3px; background:linear-gradient(90deg,#a855f7,#6366f1); transition:width 1.2s ease; }
                .rp-score-chip { padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; font-family:'JetBrains Mono',monospace; }
            `}</style>

            {/* Nav */}
            <nav className="rp-nav">
                <button className="rp-back" onClick={() => navigate("/interview/history")}>
                    <ChevronLeft size={13}/>History
                </button>
                <BrainCircuit size={16} color="#a855f7"/>
                <span style={{ fontSize:14, fontWeight:800, color:"#fff" }}>Interview Report</span>
                <div style={{ marginLeft:"auto", display:"flex", gap:10 }}>
                    <button className="rp-again-btn" onClick={() => navigate("/interview/setup")}>
                        <RotateCcw size={13}/>Try Again
                    </button>
                    <button className="rp-dl-btn" onClick={downloadPDF}>
                        <Download size={13}/>PDF Report
                    </button>
                </div>
            </nav>

            <div className="rp-body">

                {/* Hero score banner */}
                <div style={{ background:"linear-gradient(135deg,rgba(168,85,247,0.12),rgba(99,102,241,0.08))", border:"1px solid rgba(168,85,247,0.2)", borderRadius:20, padding:"28px 32px", marginBottom:24, display:"flex", alignItems:"center", gap:28, flexWrap:"wrap" }}>
                    <div style={{ width:100, height:100, flexShrink:0 }}>
                        <CircularProgressbar value={pct} text={`${finalScore}/10`}
                            styles={buildStyles({ textSize:"18px", pathColor:perfColor, textColor:"#fff", trailColor:"rgba(255,255,255,0.06)" })}
                        />
                    </div>
                    <div style={{ flex:1 }}>
                        <div style={{ fontSize:22, fontWeight:900, color:"#fff", marginBottom:6 }}>{perfText}</div>
                        <p style={{ fontSize:13, color:"rgba(255,255,255,0.5)", lineHeight:1.7, margin:"0 0 14px", maxWidth:540, fontFamily:"'JetBrains Mono',monospace" }}>{advice}</p>
                        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                            {[
                                { label:"Confidence",    v:confidence,    c:"#a855f7" },
                                { label:"Communication", v:communication, c:"#6366f1" },
                                { label:"Correctness",   v:correctness,   c:"#22c55e" },
                            ].map(s => (
                                <div key={s.label} style={{ padding:"6px 14px", borderRadius:20, background:`${s.c}18`, border:`1px solid ${s.c}40`, display:"flex", alignItems:"center", gap:6 }}>
                                    <span style={{ fontSize:12, fontWeight:700, color:s.c, fontFamily:"'JetBrains Mono',monospace" }}>{s.v}/10</span>
                                    <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontFamily:"'JetBrains Mono',monospace" }}>{s.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="rp-grid">

                    {/* Left */}
                    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

                        {/* Skill bars */}
                        <div className="rp-card">
                            <div className="rp-label">Skill Breakdown</div>
                            {[
                                { label:"Confidence",    value:confidence,    color:"#a855f7" },
                                { label:"Communication", value:communication, color:"#6366f1" },
                                { label:"Correctness",   value:correctness,   color:"#22c55e" },
                                { label:"Overall Score", value:finalScore,    color:"#f59e0b" },
                            ].map(s => (
                                <div key={s.label} style={{ marginBottom:16 }}>
                                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                                        <span style={{ fontSize:12, color:"rgba(255,255,255,0.5)", fontFamily:"'JetBrains Mono',monospace" }}>{s.label}</span>
                                        <span style={{ fontSize:12, fontWeight:700, color:s.color, fontFamily:"'JetBrains Mono',monospace" }}>{s.value}/10</span>
                                    </div>
                                    <div className="rp-skill-bar">
                                        <div className="rp-skill-fill" style={{ width:`${s.value*10}%`, background:s.color }}/>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Radar chart */}
                        <div className="rp-card">
                            <div className="rp-label">Skill Radar</div>
                            <div style={{ height:200 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart data={radarData}>
                                        <PolarGrid stroke="rgba(255,255,255,0.08)"/>
                                        <PolarAngleAxis dataKey="subject" tick={{ fontSize:10, fill:"rgba(255,255,255,0.4)", fontFamily:"'JetBrains Mono',monospace" }}/>
                                        <Radar name="Score" dataKey="A" stroke="#a855f7" fill="rgba(168,85,247,0.2)" strokeWidth={2}/>
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Speech Quality Summary */}
                        {completedQs.length > 0 && (
                            <div className="rp-card" style={{ borderColor:"rgba(99,102,241,0.2)", background:"rgba(99,102,241,0.03)" }}>
                                <div className="rp-label" style={{ color:"#6366f1" }}>Speech Quality Summary</div>
                                
                                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                                    <span style={{ fontSize:12, color:"rgba(255,255,255,0.5)", fontFamily:"'JetBrains Mono',monospace" }}>Avg Filler Words</span>
                                    <span style={{ fontSize:16, fontWeight:800, color: Number(avgFillers) <= 2 ? "#22c55e" : Number(avgFillers) <= 5 ? "#f59e0b" : "#ef4444" }}>{avgFillers}</span>
                                </div>
                                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                                    <span style={{ fontSize:12, color:"rgba(255,255,255,0.5)", fontFamily:"'JetBrains Mono',monospace" }}>Avg Speaking Pace</span>
                                    <span style={{ fontSize:16, fontWeight:800, color: avgWpm >= 120 && avgWpm <= 150 ? "#22c55e" : "#6366f1" }}>{avgWpm || "—"} WPM</span>
                                </div>
                                <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", fontFamily:"'JetBrains Mono',monospace", lineHeight:1.5, borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:10 }}>
                                    {Number(avgFillers) <= 2 ? "🎉 Excellent verbal clarity with minimal filler words." : "💡 Try pausing briefly instead of using filler words."}
                                    {avgWpm > 0 && (avgWpm < 110 ? " Speak a bit faster for dynamic pacing." : avgWpm > 160 ? " Slow down slightly to help clarity." : " Pacing is in the ideal conversational zone.") }
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right */}
                    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

                        {/* Performance trend */}
                        <div className="rp-card">
                            <div className="rp-label">Score Trend Per Question</div>
                            <div style={{ height:180 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" tick={{ fontSize:11, fill:"rgba(255,255,255,0.3)" }}/>
                                        <YAxis domain={[0,10]} stroke="rgba(255,255,255,0.2)" tick={{ fontSize:11, fill:"rgba(255,255,255,0.3)" }}/>
                                        <Tooltip contentStyle={{ background:"#1a1a2e", border:"1px solid rgba(168,85,247,0.3)", borderRadius:10, fontSize:12, fontFamily:"'JetBrains Mono',monospace" }} itemStyle={{ color:"#c084fc" }}/>
                                        <Area type="monotone" dataKey="score" stroke="#a855f7" fill="url(#scoreGrad)" strokeWidth={2.5}/>
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Questions */}
                        <div className="rp-card">
                            <div className="rp-label">Question Breakdown — click to expand</div>
                            {questionWiseScore.map((q, i) => {
                                const isOpen = activeQ === i;
                                const sc = q.score || 0;
                                const scoreCol = sc >= 8 ? "#22c55e" : sc >= 5 ? "#a855f7" : "#ef4444";
                                return (
                                    <div key={i} className={`rp-q-card${isOpen ? " active" : ""}`} onClick={() => setActiveQ(isOpen ? null : i)}>
                                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                                            <span style={{ fontSize:11, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", flexShrink:0 }}>Q{i+1}</span>
                                            <span style={{ fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.8)", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace: isOpen ? "normal" : "nowrap" }}>
                                                {q.question}
                                            </span>
                                            <span className="rp-score-chip" style={{ color:scoreCol, background:`${scoreCol}18`, border:`1px solid ${scoreCol}40`, flexShrink:0 }}>
                                                {sc}/10
                                            </span>
                                        </div>

                                        {isOpen && (
                                            <div style={{ marginTop:14, borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:14 }}>
                                                {q.answer && (
                                                    <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:10, padding:12, marginBottom:12 }}>
                                                        <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", marginBottom:5, textTransform:"uppercase" }}>Your Answer</div>
                                                        <p style={{ fontSize:12, color:"rgba(255,255,255,0.5)", margin:0, lineHeight:1.7, fontFamily:"'JetBrains Mono',monospace" }}>"{q.answer}"</p>
                                                    </div>
                                                )}

                                                <div style={{ background:"rgba(168,85,247,0.06)", border:"1px solid rgba(168,85,247,0.15)", borderRadius:10, padding:12, marginBottom:12 }}>
                                                    <div style={{ fontSize:10, color:"#a855f7", fontFamily:"'JetBrains Mono',monospace", marginBottom:5, textTransform:"uppercase" }}>AI Feedback</div>
                                                    <p style={{ fontSize:12, color:"rgba(255,255,255,0.6)", margin:0, lineHeight:1.7 }}>{q.feedback || "No feedback."}</p>
                                                </div>

                                                {/* Speech metrics if present */}
                                                {(q.wpm > 0 || q.fillerCount > 0 || q.starScore > 0) && (
                                                    <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:8, marginBottom:12 }}>
                                                        <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:10, padding:"8px", textAlign:"center" }}>
                                                            <div style={{ fontSize:14, fontWeight:800, color: q.fillerCount <= 2 ? "#22c55e" : q.fillerCount <= 5 ? "#f59e0b" : "#ef4444", fontFamily:"'Syne',sans-serif" }}>{q.fillerCount}</div>
                                                            <div style={{ fontSize:8, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", marginTop:2 }}>FILLER WORDS</div>
                                                        </div>
                                                        <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:10, padding:"8px", textAlign:"center" }}>
                                                            <div style={{ fontSize:14, fontWeight:800, color: q.wpm >= 120 && q.wpm <= 150 ? "#22c55e" : "#6366f1", fontFamily:"'Syne',sans-serif" }}>{q.wpm || "—"}</div>
                                                            <div style={{ fontSize:8, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", marginTop:2 }}>WPM PACE</div>
                                                        </div>
                                                        <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:10, padding:"8px", textAlign:"center" }}>
                                                            <div style={{ fontSize:14, fontWeight:800, color: q.starScore >= 3 ? "#22c55e" : "#a855f7", fontFamily:"'Syne',sans-serif" }}>{q.starScore > 0 ? `${q.starScore}/4` : "—"}</div>
                                                            <div style={{ fontSize:8, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", marginTop:2 }}>STAR METHOD</div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                                                    {[
                                                        { l:"Confidence",    v:q.confidence    },
                                                        { l:"Communication", v:q.communication },
                                                        { l:"Correctness",   v:q.correctness   },
                                                    ].map(s => (
                                                        <div key={s.l} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:10, padding:"10px", textAlign:"center" }}>
                                                            <div style={{ fontSize:18, fontWeight:800, color:"#c084fc", fontFamily:"'Syne',sans-serif" }}>{s.v||0}</div>
                                                            <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", marginTop:3, textTransform:"uppercase" }}>{s.l}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}