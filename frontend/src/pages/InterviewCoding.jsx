import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import Editor from "@monaco-editor/react";
import axiosClient from "../utils/axiosClient";
import { BrainCircuit, Send, ChevronLeft, ChevronRight } from "lucide-react";
import { buildStyles, CircularProgressbar } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

const LANG_LABELS  = { javascript: "JavaScript", java: "Java", cpp: "C++" };
const MONACO_LANGS = { javascript: "javascript", java: "java", cpp: "cpp" };
const DIFF_STYLE   = {
    easy:   { color: "#22c55e", bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.3)"  },
    medium: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" },
    hard:   { color: "#ef4444", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.3)"  },
};

export default function InterviewCoding() {
    const navigate      = useNavigate();
    const interviewData = JSON.parse(sessionStorage.getItem("interviewData") || "{}");
    const { interviewId } = interviewData;

    const [problems,    setProblems]    = useState([]); // [easy, medium, hard]
    const [currentIdx,  setCurrentIdx]  = useState(0);
    const [lang,        setLang]        = useState("javascript");
    const [codeByProb,  setCodeByProb]  = useState({}); // { problemId: { js, java, cpp } }
    const [explanations,setExplanations]= useState({}); // { problemId: string }
    const [loading,     setLoading]     = useState(true);
    const [submitting,  setSubmitting]  = useState(false);
    const [results,     setResults]     = useState({}); // { problemId: result }
    const [timeLeft,    setTimeLeft]    = useState(60 * 60); // 60 min for 3 problems

    const problem    = problems[currentIdx];
    const code       = codeByProb[problem?._id]?.[lang] || "";
    const explanation= explanations[problem?._id] || "";
    const result     = results[problem?._id];
    const allDone    = problems.length > 0 && problems.every(p => results[p._id]);

    // ── Fetch 1 easy + 1 medium + 1 hard ─────────────────────────────────────
    useEffect(() => {
        const cached = sessionStorage.getItem("codingProblems");
        if (cached) {
            const parsed = JSON.parse(cached);
            setProblems(parsed);
            // Init code
            const initCode = {};
            parsed.forEach(p => {
                initCode[p._id] = {
                    javascript: p.starterCode?.javascript || "",
                    java:       p.starterCode?.java       || "",
                    cpp:        p.starterCode?.cpp        || "",
                };
            });
            setCodeByProb(initCode);
            setLoading(false);
            return;
        }

        const fetchProblems = async () => {
            setLoading(true);
            try {
                const { data: all } = await axiosClient.get("/problem/getAllProblem");

                // Pick one random problem of each difficulty
                const byDiff = { easy: [], medium: [], hard: [] };
                all.forEach(p => { if (byDiff[p.difficulty]) byDiff[p.difficulty].push(p); });

                const picked = await Promise.all(
                    ["easy", "medium", "hard"].map(async (diff) => {
                        const pool = byDiff[diff];
                        if (!pool.length) return null;
                        const random = pool[Math.floor(Math.random() * pool.length)];
                        const { data: full } = await axiosClient.get(`/problem/problemById/${random._id}`);

                        const langMap     = { javascript:"javascript", java:"java", "c++":"cpp" };
                        const starterCode = { javascript:"", java:"", cpp:"" };
                        (full.startCode || []).forEach(s => {
                            const key = langMap[s.language];
                            if (key) starterCode[key] = s.initialCode || "";
                        });

                        return {
                            _id:              full._id,
                            title:            full.title,
                            description:      full.description,
                            difficulty:       full.difficulty,
                            points:           full.points,
                            constraints:      full.constraints || [],
                            visibleTestCases: full.visibleTestCases || [],
                            starterCode,
                        };
                    })
                );

                const valid = picked.filter(Boolean);
                setProblems(valid);

                const initCode = {};
                valid.forEach(p => {
                    initCode[p._id] = { ...p.starterCode };
                });
                setCodeByProb(initCode);
                sessionStorage.setItem("codingProblems", JSON.stringify(valid));
            } catch (err) {
                console.error("[InterviewCoding]", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProblems();
    }, []);

    // ── Timer ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        const id = setInterval(() => setTimeLeft(p => Math.max(0, p - 1)), 1000);
        return () => clearInterval(id);
    }, []);

    const fmtTime = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

    const updateCode = (val) => {
        setCodeByProb(prev => ({
            ...prev,
            [problem._id]: { ...(prev[problem._id] || {}), [lang]: val || "" },
        }));
    };

    const updateExplanation = (val) => {
        setExplanations(prev => ({ ...prev, [problem._id]: val }));
    };

    // ── Submit current problem ────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!code.trim() || submitting) return;
        setSubmitting(true);
        try {
            const { data } = await axiosClient.post("/api/interview/evaluate-code", {
                interviewId,
                questionIndex:      currentIdx,
                code,
                language:           lang,
                explanation,
                problemTitle:       problem?.title,
                problemDescription: (problem?.description || "").replace(/<[^>]*>/g, ""),
            });
            setResults(prev => ({ ...prev, [problem._id]: data }));
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Finish all ────────────────────────────────────────────────────────────
    const handleFinish = async () => {
        try {
            const { data } = await axiosClient.post("/api/interview/finish", { interviewId });
            sessionStorage.setItem("interviewReport", JSON.stringify(data));
            sessionStorage.removeItem("codingProblems");
            navigate("/interview/report");
        } catch (err) {
            navigate("/interview/history");
        }
    };

    const pct        = (timeLeft / (60*60)) * 100;
    const timerColor = timeLeft < 10*60 ? "#ef4444" : timeLeft < 20*60 ? "#f59e0b" : "#a855f7";
    const ds         = problem ? DIFF_STYLE[problem.difficulty] || DIFF_STYLE.easy : DIFF_STYLE.easy;

    return (
        <div style={{ minHeight:"100vh", background:"#0a0a0f", fontFamily:"'Syne',sans-serif", color:"#f0f0f0", display:"flex", flexDirection:"column" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@400;600;700;800&display=swap');
                *, *::before, *::after { box-sizing:border-box; }
                .ic-nav { height:56px; background:rgba(10,10,15,0.95); backdrop-filter:blur(20px); border-bottom:1px solid rgba(168,85,247,0.15); display:flex; align-items:center; padding:0 20px; gap:12px; position:sticky; top:0; z-index:100; }
                .ic-back { background:none; border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:6px 10px; color:rgba(255,255,255,0.4); cursor:pointer; display:inline-flex; align-items:center; gap:5px; font-size:12px; font-family:'JetBrains Mono',monospace; transition:all 0.2s; }
                .ic-back:hover { color:#fff; border-color:rgba(168,85,247,0.4); }
                .ic-prob-tabs { display:flex; gap:6px; }
                .ic-prob-tab { padding:5px 14px; border-radius:8px; border:1px solid rgba(255,255,255,0.08); background:none; color:rgba(255,255,255,0.35); font-size:12px; font-weight:700; cursor:pointer; font-family:'JetBrains Mono',monospace; transition:all 0.15s; display:flex; align-items:center; gap:6px; }
                .ic-prob-tab:hover { border-color:rgba(168,85,247,0.3); color:#fff; }
                .ic-prob-tab.active { border-color:#a855f7; color:#a855f7; background:rgba(168,85,247,0.1); }
                .ic-prob-tab.done { border-color:#22c55e; color:#22c55e; background:rgba(34,197,94,0.08); }
                .ic-body { flex:1; display:grid; grid-template-columns:420px 1fr; height:calc(100vh - 56px); overflow:hidden; }
                .ic-left { border-right:1px solid rgba(255,255,255,0.06); overflow-y:auto; background:rgba(255,255,255,0.01); }
                .ic-right { display:flex; flex-direction:column; overflow:hidden; }
                .ic-prob-header { padding:20px 20px 0; }
                .ic-prob-title { font-size:19px; font-weight:900; color:#fff; margin-bottom:10px; letter-spacing:-0.3px; }
                .ic-prob-meta { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
                .ic-diff-badge { display:inline-flex; align-items:center; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:700; font-family:'JetBrains Mono',monospace; }
                .ic-pts-pill { padding:3px 10px; border-radius:20px; font-size:12px; font-weight:700; font-family:'JetBrains Mono',monospace; color:rgba(255,255,255,0.4); background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); }
                .ic-divider { height:1px; background:rgba(255,255,255,0.06); margin:14px 0; }
                .ic-desc { padding:0 20px; font-size:13px; color:rgba(255,255,255,0.65); line-height:1.75; }
                .ic-section-title { font-size:10px; font-weight:700; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:1px; font-family:'JetBrains Mono',monospace; margin-bottom:10px; padding:0 20px; }
                .ic-example { margin:0 20px 12px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:12px; }
                .ic-example-label { font-size:10px; color:rgba(255,255,255,0.25); font-family:'JetBrains Mono',monospace; margin-bottom:6px; }
                .ic-example-row { display:flex; gap:8px; align-items:flex-start; margin-bottom:4px; }
                .ic-example-key { font-size:12px; color:rgba(255,255,255,0.35); font-family:'JetBrains Mono',monospace; min-width:64px; }
                .ic-example-val { font-size:12px; color:rgba(255,255,255,0.7); font-family:'JetBrains Mono',monospace; white-space:pre-wrap; word-break:break-all; }
                .ic-constraints { padding:0 20px 14px; }
                .ic-constraint { font-size:12px; color:rgba(255,255,255,0.35); font-family:'JetBrains Mono',monospace; margin-bottom:4px; display:flex; align-items:flex-start; gap:8px; }
                .ic-constraint::before { content:"•"; color:rgba(168,85,247,0.5); flex-shrink:0; }
                .ic-explain-wrap { padding:14px 20px; border-top:1px solid rgba(255,255,255,0.06); }
                .ic-textarea { width:100%; padding:10px 14px; border-radius:10px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); color:#f0f0f0; font-size:12px; font-family:'JetBrains Mono',monospace; resize:none; outline:none; transition:all 0.2s; line-height:1.7; }
                .ic-textarea:focus { border-color:#a855f7; }
                .ic-textarea::placeholder { color:rgba(255,255,255,0.12); }
                .ic-langbar { height:44px; background:rgba(255,255,255,0.02); border-bottom:1px solid rgba(255,255,255,0.06); display:flex; align-items:center; padding:0 14px; gap:8px; flex-shrink:0; }
                .ic-lang-btn { padding:6px 14px; border-radius:8px; border:1px solid rgba(255,255,255,0.08); background:none; color:rgba(255,255,255,0.4); font-size:12px; font-weight:700; cursor:pointer; font-family:'JetBrains Mono',monospace; transition:all 0.15s; }
                .ic-lang-btn.active { border-color:#a855f7; color:#a855f7; background:rgba(168,85,247,0.1); }
                .ic-actionbar { height:58px; background:rgba(10,10,15,0.95); border-top:1px solid rgba(255,255,255,0.06); display:flex; align-items:center; padding:0 14px; gap:10px; flex-shrink:0; }
                .ic-btn { flex:1; padding:11px; border-radius:11px; border:none; font-size:13px; font-weight:800; font-family:'Syne',sans-serif; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:7px; }
                .ic-btn:hover:not(:disabled) { transform:translateY(-1px); }
                .ic-btn:disabled { opacity:0.35; cursor:not-allowed; transform:none; }
                .ic-submit { background:linear-gradient(135deg,#a855f7,#6366f1); color:#fff; }
                .ic-submit:hover:not(:disabled) { box-shadow:0 6px 20px rgba(168,85,247,0.35); }
                .ic-next { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1) !important; color:rgba(255,255,255,0.6); border:none; }
                .ic-finish { background:linear-gradient(135deg,#22c55e,#16a34a); color:#fff; }
                .ic-finish:hover { box-shadow:0 6px 20px rgba(34,197,94,0.35); }
                .ic-result-panel { background:rgba(34,197,94,0.05); border:1px solid rgba(34,197,94,0.2); border-radius:12px; padding:14px; margin:14px 20px; }
                .ic-spinner { width:13px; height:13px; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:spin 0.7s linear infinite; }
                @keyframes spin { to { transform:rotate(360deg); } }
                .ic-score-bar { height:3px; background:rgba(255,255,255,0.06); border-radius:2px; overflow:hidden; margin-top:4px; }
                .ic-score-fill { height:100%; border-radius:2px; transition:width 1s ease; }
            `}</style>

            {/* Nav */}
            <nav className="ic-nav">
                <button className="ic-back" onClick={() => navigate("/")}>
                    <ChevronLeft size={13}/>Back
                </button>
                <BrainCircuit size={16} color="#a855f7"/>

                {/* Problem tabs */}
                <div className="ic-prob-tabs">
                    {problems.map((p, i) => (
                        <button key={p._id}
                            className={`ic-prob-tab${currentIdx === i ? " active" : ""}${results[p._id] ? " done" : ""}`}
                            onClick={() => setCurrentIdx(i)}>
                            {results[p._id] ? "✓" : i + 1}
                            <span style={{ fontSize:10, opacity:0.7 }}>{p.difficulty}</span>
                        </button>
                    ))}
                </div>

                <div style={{ marginLeft:"auto", width:42, height:42 }}>
                    <CircularProgressbar value={pct} text={fmtTime(timeLeft)}
                        styles={buildStyles({ textSize:"15px", pathColor:timerColor, textColor:timerColor, trailColor:"rgba(255,255,255,0.05)" })}
                    />
                </div>
            </nav>

            <div className="ic-body">

                {/* Left — problem */}
                <div className="ic-left">
                    {loading ? (
                        <div style={{ padding:"60px 20px", textAlign:"center", color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", fontSize:13 }}>
                            Loading problems...
                        </div>
                    ) : problem ? (
                        <>
                            <div className="ic-prob-header">
                                <div className="ic-prob-title">{currentIdx + 1}. {problem.title}</div>
                                <div className="ic-prob-meta">
                                    <span className="ic-diff-badge" style={{ color:ds.color, background:ds.bg, border:`1px solid ${ds.border}` }}>
                                        {problem.difficulty}
                                    </span>
                                    {problem.points != null && (
                                        <span className="ic-pts-pill">{problem.points} pts</span>
                                    )}
                                </div>
                            </div>

                            <div className="ic-divider"/>

                            <div className="ic-desc" dangerouslySetInnerHTML={{ __html: problem.description || "" }}/>

                            <div className="ic-divider"/>

                            {/* Examples */}
                            {problem.visibleTestCases?.length > 0 && (
                                <>
                                    <div className="ic-section-title">Examples</div>
                                    {problem.visibleTestCases.slice(0, 2).map((tc, i) => (
                                        <div key={i} className="ic-example">
                                            <div className="ic-example-label">Example {i+1}</div>
                                            <div className="ic-example-row">
                                                <span className="ic-example-key">Input:</span>
                                                <span className="ic-example-val">{tc.input}</span>
                                            </div>
                                            <div className="ic-example-row">
                                                <span className="ic-example-key">Output:</span>
                                                <span className="ic-example-val">{tc.output}</span>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="ic-divider"/>
                                </>
                            )}

                            {/* Constraints */}
                            {problem.constraints?.length > 0 && (
                                <>
                                    <div className="ic-section-title">Constraints</div>
                                    <div className="ic-constraints">
                                        {problem.constraints.map((con, i) => (
                                            <div key={i} className="ic-constraint">{con}</div>
                                        ))}
                                    </div>
                                    <div className="ic-divider"/>
                                </>
                            )}

                            {/* Result for this problem */}
                            {result && (
                                <div className="ic-result-panel">
                                    <div style={{ fontSize:10, color:"#22c55e", fontFamily:"'JetBrains Mono',monospace", marginBottom:8, textTransform:"uppercase" }}>
                                        ✓ Submitted — Score: {result.finalScore}/10
                                    </div>
                                    {[
                                        { label:"Correctness", value:result.correctness,  color:"#22c55e" },
                                        { label:"Efficiency",  value:result.efficiency,   color:"#a855f7" },
                                        { label:"Code Quality",value:result.codeQuality,  color:"#6366f1" },
                                    ].map(s => (
                                        <div key={s.label} style={{ marginBottom:8 }}>
                                            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                                                <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontFamily:"'JetBrains Mono',monospace" }}>{s.label}</span>
                                                <span style={{ fontSize:11, fontWeight:700, color:s.color, fontFamily:"'JetBrains Mono',monospace" }}>{s.value}/10</span>
                                            </div>
                                            <div className="ic-score-bar">
                                                <div className="ic-score-fill" style={{ width:`${s.value*10}%`, background:s.color }}/>
                                            </div>
                                        </div>
                                    ))}
                                    <p style={{ fontSize:11, color:"rgba(255,255,255,0.4)", margin:"8px 0 0", fontFamily:"'JetBrains Mono',monospace", lineHeight:1.6 }}>
                                        {result.feedback}
                                    </p>
                                </div>
                            )}

                            {/* Explanation */}
                            {!result && (
                                <div className="ic-explain-wrap">
                                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.25)", fontFamily:"'JetBrains Mono',monospace", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px" }}>
                                        Explain your approach (optional)
                                    </div>
                                    <textarea className="ic-textarea" rows={3}
                                        placeholder="Walk me through your thought process..."
                                        value={explanation}
                                        onChange={e => updateExplanation(e.target.value)}
                                    />
                                </div>
                            )}
                        </>
                    ) : null}
                </div>

                {/* Right — editor */}
                <div className="ic-right">
                    <div className="ic-langbar">
                        {["javascript","java","cpp"].map(l => (
                            <button key={l} className={`ic-lang-btn${lang === l ? " active" : ""}`} onClick={() => setLang(l)}>
                                {LANG_LABELS[l]}
                            </button>
                        ))}
                        {/* Progress indicator */}
                        <div style={{ marginLeft:"auto", fontSize:11, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace" }}>
                            {Object.keys(results).length}/{problems.length} submitted
                        </div>
                    </div>

                    <div style={{ flex:1, overflow:"hidden" }}>
                        <Editor
                            height="100%"
                            language={MONACO_LANGS[lang]}
                            value={code}
                            onChange={updateCode}
                            theme="vs-dark"
                            options={{
                                fontSize:             14,
                                minimap:              { enabled: false },
                                scrollBeyondLastLine: false,
                                automaticLayout:      true,
                                tabSize:              2,
                                wordWrap:             "on",
                                fontFamily:           "'JetBrains Mono', monospace",
                                fontLigatures:        true,
                                padding:              { top: 14 },
                                lineNumbers:          "on",
                                renderLineHighlight:  "line",
                            }}
                        />
                    </div>

                    <div className="ic-actionbar">
                        {/* Prev */}
                        {currentIdx > 0 && (
                            <button className="ic-btn ic-next" style={{ flex:"0 0 auto", padding:"11px 14px" }}
                                onClick={() => setCurrentIdx(p => p - 1)}>
                                <ChevronLeft size={14}/>
                            </button>
                        )}

                        {/* Submit or already done */}
                        {!result ? (
                            <button className="ic-btn ic-submit" onClick={handleSubmit}
                                disabled={submitting || !code.trim() || loading}>
                                {submitting
                                    ? <><span className="ic-spinner"/>Evaluating...</>
                                    : <><Send size={13}/>Submit Problem {currentIdx + 1}</>
                                }
                            </button>
                        ) : (
                            <button className="ic-btn ic-submit" style={{ background:"rgba(34,197,94,0.15)", border:"1px solid rgba(34,197,94,0.3)", color:"#22c55e" }} disabled>
                                ✓ Submitted
                            </button>
                        )}

                        {/* Next or Finish */}
                        {currentIdx < problems.length - 1 ? (
                            <button className="ic-btn ic-next" style={{ flex:"0 0 auto", padding:"11px 14px" }}
                                onClick={() => setCurrentIdx(p => p + 1)}>
                                <ChevronRight size={14}/>
                            </button>
                        ) : allDone ? (
                            <button className="ic-btn ic-finish" onClick={handleFinish}>
                                🏁 Finish Round
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}