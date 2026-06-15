import { useState } from "react";
import { useNavigate } from "react-router";
import axiosClient from "../utils/axiosClient";
import { ChevronLeft, Upload, FileText, Link, Zap, CheckCircle2, XCircle, RefreshCw, Copy, ChevronDown, ChevronUp } from "lucide-react";

const STEPS = ["Upload Resume", "Job Description", "ATS Report"];

export default function ATSAnalyzer() {
    const navigate = useNavigate();
    const [step,         setStep]         = useState(0);
    const [resumeFile,   setResumeFile]   = useState(null);
    const [jdText,       setJdText]       = useState("");
    const [jdUrl,        setJdUrl]        = useState("");
    const [role,         setRole]         = useState("");
    const [loading,      setLoading]      = useState(false);
    const [extracting,   setExtracting]   = useState(false);
    const [report,       setReport]       = useState(null);
    const [error,        setError]        = useState(null);
    const [rewriting,    setRewriting]    = useState({});
    const [rewritten,    setRewritten]    = useState({});
    const [expanded,     setExpanded]     = useState({});
    const [copied,       setCopied]       = useState({});
    const [showBefore,   setShowBefore]   = useState({});

    // ── Extract JD from URL ───────────────────────────────────────────────────
    const handleExtractJD = async () => {
        if (!jdUrl.trim()) return;
        setExtracting(true);
        setError(null);
        try {
            const { data } = await axiosClient.post("/ats/extract-jd", { url: jdUrl });
            setJdText(data.jdText);
        } catch (err) {
            setError("Could not extract from URL. Please paste the JD text manually.");
        } finally {
            setExtracting(false);
        }
    };

    // ── Analyze ───────────────────────────────────────────────────────────────
    const handleAnalyze = async () => {
        if (!resumeFile || !jdText.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const fd = new FormData();
            fd.append("resume", resumeFile);
            fd.append("jdText", jdText);
            fd.append("role",   role);
            const { data } = await axiosClient.post("/ats/analyze", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setReport(data);
            setStep(2);
        } catch (err) {
            setError(err.displayMessage || "Analysis failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // ── Rewrite bullet ────────────────────────────────────────────────────────
    const handleRewrite = async (bullet, idx) => {
        setRewriting(prev => ({ ...prev, [idx]: true }));
        try {
            const { data } = await axiosClient.post("/ats/rewrite", {
                bullet,
                role:     report?.role,
                keywords: report?.keywords?.missing?.slice(0, 8),
            });
            setRewritten(prev => ({ ...prev, [idx]: data }));
        } catch (err) {
            console.error(err);
        } finally {
            setRewriting(prev => ({ ...prev, [idx]: false }));
        }
    };

    const copyText = (text, key) => {
        navigator.clipboard.writeText(text);
        setCopied(prev => ({ ...prev, [key]: true }));
        setTimeout(() => setCopied(prev => ({ ...prev, [key]: false })), 2000);
    };

    const score      = report?.score || 0;
    const scoreColor = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
    const scoreLabel = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Average" : "Weak";

    return (
        <div style={{ minHeight:"100vh", background:"#0a0a0f", fontFamily:"'Syne',sans-serif", color:"#f0f0f0" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@400;600;700;800;900&display=swap');
                *, *::before, *::after { box-sizing:border-box; }
                .ats-bg { position:fixed; inset:0; background:#0a0a0f; z-index:0; overflow:hidden; }
                .ats-bg::before { content:''; position:absolute; top:-30%; left:-10%; width:500px; height:500px; background:radial-gradient(circle,rgba(34,197,94,0.07) 0%,transparent 70%); border-radius:50%; }
                .ats-bg::after  { content:''; position:absolute; bottom:-20%; right:-10%; width:400px; height:400px; background:radial-gradient(circle,rgba(99,102,241,0.07) 0%,transparent 70%); border-radius:50%; }
                .ats-wrap { position:relative; z-index:1; }
                .ats-nav { height:60px; background:rgba(10,10,15,0.9); backdrop-filter:blur(20px); border-bottom:1px solid rgba(34,197,94,0.15); display:flex; align-items:center; padding:0 24px; gap:14px; position:sticky; top:0; z-index:100; }
                .ats-back { background:none; border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:6px 12px; color:rgba(255,255,255,0.4); cursor:pointer; display:inline-flex; align-items:center; gap:6px; font-size:12px; font-family:'JetBrains Mono',monospace; transition:all 0.2s; }
                .ats-back:hover { color:#fff; border-color:rgba(34,197,94,0.4); }
                .ats-body { max-width:900px; margin:0 auto; padding:40px 24px; }
                .ats-hero { text-align:center; margin-bottom:40px; }
                .ats-badge { display:inline-flex; align-items:center; gap:8px; padding:6px 16px; background:rgba(34,197,94,0.08); border:1px solid rgba(34,197,94,0.25); border-radius:20px; font-size:12px; color:#22c55e; font-family:'JetBrains Mono',monospace; margin-bottom:16px; }
                .ats-h1 { font-size:38px; font-weight:900; letter-spacing:-1px; background:linear-gradient(135deg,#fff 0%,#22c55e 60%,#6366f1 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; margin:0 0 12px; }
                .ats-sub { font-size:14px; color:rgba(255,255,255,0.35); font-family:'JetBrains Mono',monospace; }
                .ats-steps { display:flex; align-items:center; justify-content:center; gap:0; margin-bottom:36px; }
                .ats-step-dot { width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; border:2px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.3); transition:all 0.3s; }
                .ats-step-dot.active { background:linear-gradient(135deg,#22c55e,#16a34a); border-color:transparent; color:#fff; box-shadow:0 0 16px rgba(34,197,94,0.4); }
                .ats-step-dot.done   { background:rgba(34,197,94,0.15); border-color:#22c55e; color:#22c55e; }
                .ats-step-lbl { font-size:11px; color:rgba(255,255,255,0.3); font-family:'JetBrains Mono',monospace; margin-left:6px; }
                .ats-step-lbl.active { color:#22c55e; }
                .ats-step-line { width:50px; height:1px; background:rgba(255,255,255,0.08); margin:0 6px; }
                .ats-step-line.done { background:#22c55e; }
                .ats-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:20px; padding:28px; }
                .ats-label { font-size:10px; font-weight:700; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:1px; font-family:'JetBrains Mono',monospace; margin-bottom:8px; }
                .ats-upload { border:2px dashed rgba(34,197,94,0.2); border-radius:14px; padding:32px; text-align:center; cursor:pointer; transition:all 0.2s; }
                .ats-upload:hover, .ats-upload.has-file { border-color:rgba(34,197,94,0.5); background:rgba(34,197,94,0.04); }
                .ats-input { width:100%; padding:11px 16px; border-radius:11px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.04); color:#f0f0f0; font-size:13px; outline:none; font-family:'JetBrains Mono',monospace; transition:all 0.2s; }
                .ats-input:focus { border-color:#22c55e; background:rgba(34,197,94,0.04); }
                .ats-input::placeholder { color:rgba(255,255,255,0.15); }
                .ats-textarea { width:100%; padding:14px 16px; border-radius:11px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.04); color:#f0f0f0; font-size:13px; outline:none; font-family:'JetBrains Mono',monospace; resize:vertical; line-height:1.7; transition:all 0.2s; }
                .ats-textarea:focus { border-color:#22c55e; }
                .ats-textarea::placeholder { color:rgba(255,255,255,0.15); }
                .ats-btn { width:100%; padding:14px; border-radius:13px; border:none; background:linear-gradient(135deg,#22c55e,#16a34a); color:#fff; font-size:15px; font-weight:800; cursor:pointer; font-family:'Syne',sans-serif; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:8px; }
                .ats-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 28px rgba(34,197,94,0.35); }
                .ats-btn:disabled { opacity:0.35; cursor:not-allowed; transform:none; }
                .ats-sec-btn { padding:9px 18px; border-radius:10px; border:1px solid rgba(255,255,255,0.1); background:none; color:rgba(255,255,255,0.5); font-size:13px; font-weight:700; cursor:pointer; font-family:'Syne',sans-serif; transition:all 0.15s; display:inline-flex; align-items:center; gap:7px; }
                .ats-sec-btn:hover:not(:disabled) { border-color:rgba(34,197,94,0.4); color:#22c55e; }
                .ats-sec-btn:disabled { opacity:0.3; cursor:not-allowed; }
                .ats-error { background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); border-radius:10px; padding:12px 16px; font-size:12px; color:#f87171; font-family:'JetBrains Mono',monospace; margin-bottom:16px; }
                .ats-spinner { width:14px; height:14px; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:spin 0.7s linear infinite; }
                @keyframes spin { to { transform:rotate(360deg); } }

                /* Report styles */
                .ats-report-grid { display:grid; grid-template-columns:280px 1fr; gap:20px; }
                @media (max-width:800px) { .ats-report-grid { grid-template-columns:1fr; } }
                .ats-score-ring { width:120px; height:120px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-direction:column; margin:0 auto 16px; position:relative; }
                .ats-kw-chip { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:20px; font-size:11px; font-family:'JetBrains Mono',monospace; margin:3px; }
                .ats-kw-matched { background:rgba(34,197,94,0.1); border:1px solid rgba(34,197,94,0.25); color:#22c55e; }
                .ats-kw-missing { background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); color:#f87171; }
                .ats-bench-bar { height:6px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden; margin-top:5px; position:relative; }
                .ats-bench-fill { height:100%; border-radius:3px; transition:width 1s ease; }
                .ats-bullet-card { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:14px; padding:16px; margin-bottom:10px; }
                .ats-bullet-original { font-size:13px; color:rgba(255,255,255,0.6); font-family:'JetBrains Mono',monospace; line-height:1.6; margin-bottom:10px; }
                .ats-bullet-rewritten { font-size:13px; color:#22c55e; font-family:'JetBrains Mono',monospace; line-height:1.6; background:rgba(34,197,94,0.06); border:1px solid rgba(34,197,94,0.2); border-radius:10px; padding:12px; }
                .ats-rewrite-btn { padding:6px 14px; border-radius:8px; border:1px solid rgba(34,197,94,0.3); background:rgba(34,197,94,0.08); color:#22c55e; font-size:12px; font-weight:700; cursor:pointer; font-family:'Syne',sans-serif; transition:all 0.15s; display:inline-flex; align-items:center; gap:6px; }
                .ats-rewrite-btn:hover:not(:disabled) { background:rgba(34,197,94,0.15); }
                .ats-rewrite-btn:disabled { opacity:0.4; cursor:not-allowed; }
                .ats-copy-btn { padding:5px 10px; border-radius:7px; border:1px solid rgba(255,255,255,0.08); background:none; color:rgba(255,255,255,0.4); font-size:11px; cursor:pointer; font-family:'JetBrains Mono',monospace; transition:all 0.15s; display:inline-flex; align-items:center; gap:5px; }
                .ats-copy-btn:hover { color:#fff; border-color:rgba(255,255,255,0.2); }
                .ats-divider { height:1px; background:rgba(255,255,255,0.06); margin:20px 0; }
                .ats-section-card { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:14px; margin-bottom:10px; }
            `}</style>

            <div className="ats-bg"/>
            <div className="ats-wrap">

                {/* Nav */}
                <nav className="ats-nav">
                    <button className="ats-back" onClick={() => navigate("/")}>
                        <ChevronLeft size={13}/>Back
                    </button>
                    <span style={{ fontSize:14, fontWeight:800, color:"#fff" }}>🎯 ATS Resume Analyzer</span>
                    {step === 2 && (
                        <button className="ats-back" style={{ marginLeft:"auto" }}
                            onClick={() => { setStep(0); setReport(null); setResumeFile(null); setJdText(""); setRewritten({}); }}>
                            <RefreshCw size={12}/>New Analysis
                        </button>
                    )}
                </nav>

                <div className="ats-body">

                    {/* Hero */}
                    {step < 2 && (
                        <div className="ats-hero">
                            <div className="ats-badge"><Zap size={12}/>Level 2 + 3 ATS Analysis</div>
                            <h1 className="ats-h1">Beat the ATS System</h1>
                            <p className="ats-sub">Keyword matching · Section scoring · AI rewrites · Industry benchmarks</p>
                        </div>
                    )}

                    {/* Steps */}
                    <div className="ats-steps">
                        {STEPS.map((s, i) => (
                            <div key={s} style={{ display:"flex", alignItems:"center" }}>
                                <div className={`ats-step-dot${step === i ? " active" : step > i ? " done" : ""}`}>
                                    {step > i ? "✓" : i+1}
                                </div>
                                <span className={`ats-step-lbl${step === i ? " active" : ""}`}>{s}</span>
                                {i < STEPS.length-1 && <div className={`ats-step-line${step > i ? " done" : ""}`}/>}
                            </div>
                        ))}
                    </div>

                    {error && <div className="ats-error">{error}</div>}

                    {/* Step 0 — Upload Resume */}
                    {step === 0 && (
                        <div className="ats-card">
                            <div style={{ fontSize:17, fontWeight:800, color:"#fff", marginBottom:20 }}>
                                📄 Upload Your Resume
                            </div>

                            <div className={`ats-upload${resumeFile ? " has-file" : ""}`}
                                onClick={() => document.getElementById("atsResume").click()}>
                                <div style={{ fontSize:40, marginBottom:10 }}>{resumeFile ? "✅" : "📎"}</div>
                                <p style={{ fontSize:14, color:resumeFile ? "#22c55e" : "rgba(255,255,255,0.3)", fontWeight:600, marginBottom:4 }}>
                                    {resumeFile ? resumeFile.name : "Click to upload PDF resume"}
                                </p>
                                <p style={{ fontSize:11, color:"rgba(255,255,255,0.2)", fontFamily:"'JetBrains Mono',monospace" }}>
                                    PDF only · Max 5MB
                                </p>
                                <input type="file" accept="application/pdf" id="atsResume" style={{ display:"none" }}
                                    onChange={e => setResumeFile(e.target.files[0])}/>
                            </div>

                            <div style={{ marginTop:20 }}>
                                <div className="ats-label">Target Role (optional)</div>
                                <input className="ats-input" placeholder="e.g. Senior Frontend Developer"
                                    value={role} onChange={e => setRole(e.target.value)}/>
                            </div>

                            <button className="ats-btn" style={{ marginTop:20 }}
                                onClick={() => setStep(1)} disabled={!resumeFile}>
                                Next: Add Job Description →
                            </button>
                        </div>
                    )}

                    {/* Step 1 — Job Description */}
                    {step === 1 && (
                        <div className="ats-card">
                            <div style={{ fontSize:17, fontWeight:800, color:"#fff", marginBottom:20 }}>
                                📋 Add Job Description
                            </div>

                            {/* URL extraction */}
                            <div className="ats-label">Extract from URL (LinkedIn, Naukri, etc.)</div>
                            <div style={{ display:"flex", gap:10, marginBottom:20 }}>
                                <input className="ats-input" placeholder="https://linkedin.com/jobs/..."
                                    value={jdUrl} onChange={e => setJdUrl(e.target.value)}
                                    style={{ flex:1 }}/>
                                <button className="ats-sec-btn" onClick={handleExtractJD} disabled={!jdUrl.trim() || extracting}>
                                    {extracting ? <><span className="ats-spinner"/>Extracting...</> : <><Link size={13}/>Extract</>}
                                </button>
                            </div>

                            <div style={{ display:"flex", alignItems:"center", gap:12, margin:"0 0 16px", color:"rgba(255,255,255,0.2)", fontSize:12, fontFamily:"'JetBrains Mono',monospace" }}>
                                <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.06)" }}/>or paste manually<div style={{ flex:1, height:1, background:"rgba(255,255,255,0.06)" }}/>
                            </div>

                            <div className="ats-label">Job Description Text</div>
                            <textarea className="ats-textarea" rows={10}
                                placeholder="Paste the full job description here..."
                                value={jdText} onChange={e => setJdText(e.target.value)}/>

                            <div style={{ display:"flex", gap:10, marginTop:20 }}>
                                <button className="ats-sec-btn" onClick={() => setStep(0)}>← Back</button>
                                <button className="ats-btn" onClick={handleAnalyze}
                                    disabled={!jdText.trim() || loading} style={{ flex:1 }}>
                                    {loading
                                        ? <><span className="ats-spinner"/>Analyzing resume...</>
                                        : <><Zap size={15}/>Analyze ATS Score</>
                                    }
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2 — Report */}
                    {step === 2 && report && (
                        <div>
                            {/* Score banner */}
                            <div style={{ background:`linear-gradient(135deg,${scoreColor}15,rgba(99,102,241,0.08))`, border:`1px solid ${scoreColor}30`, borderRadius:20, padding:"28px 32px", marginBottom:24, display:"flex", alignItems:"center", gap:28, flexWrap:"wrap" }}>
                                {/* Big score circle */}
                                <div style={{ flexShrink:0, textAlign:"center" }}>
                                    <div style={{ width:110, height:110, borderRadius:"50%", border:`4px solid ${scoreColor}`, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", background:`${scoreColor}12` }}>
                                        <div style={{ fontSize:32, fontWeight:900, color:scoreColor, fontFamily:"'Syne',sans-serif", lineHeight:1 }}>{score}</div>
                                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontFamily:"'JetBrains Mono',monospace" }}>/100</div>
                                    </div>
                                    <div style={{ fontSize:13, fontWeight:700, color:scoreColor, marginTop:8 }}>{scoreLabel}</div>
                                </div>

                                <div style={{ flex:1 }}>
                                    <div style={{ fontSize:20, fontWeight:900, color:"#fff", marginBottom:6 }}>
                                        ATS Score for {report.role}
                                    </div>
                                    <p style={{ fontSize:13, color:"rgba(255,255,255,0.5)", lineHeight:1.7, margin:"0 0 14px", fontFamily:"'JetBrains Mono',monospace", maxWidth:500 }}>
                                        {report.suggestions?.summary}
                                    </p>
                                    {/* Benchmark pills */}
                                    <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                                        <span style={{ padding:"5px 12px", borderRadius:20, fontSize:11, fontFamily:"'JetBrains Mono',monospace", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.5)" }}>
                                            Industry avg: {report.benchmark?.avg}
                                        </span>
                                        <span style={{ padding:"5px 12px", borderRadius:20, fontSize:11, fontFamily:"'JetBrains Mono',monospace", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.5)" }}>
                                            Top 10%: {report.benchmark?.top10}+
                                        </span>
                                        <span style={{ padding:"5px 12px", borderRadius:20, fontSize:11, fontFamily:"'JetBrains Mono',monospace",
                                            background: report.benchmark?.percentile === "Top 10%" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
                                            border: `1px solid ${report.benchmark?.percentile === "Top 10%" ? "rgba(34,197,94,0.25)" : "rgba(245,158,11,0.25)"}`,
                                            color: report.benchmark?.percentile === "Top 10%" ? "#22c55e" : "#f59e0b",
                                            fontWeight:700,
                                        }}>
                                            📊 {report.benchmark?.percentile}
                                        </span>
                                        {report.benchmark?.gap > 0 && (
                                            <span style={{ padding:"5px 12px", borderRadius:20, fontSize:11, fontFamily:"'JetBrains Mono',monospace", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", color:"#f87171" }}>
                                                {report.benchmark.gap} points to Top 10%
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="ats-report-grid">

                                {/* Left column */}
                                <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

                                    {/* Benchmark bar */}
                                    <div className="ats-card">
                                        <div className="ats-label">Industry Benchmark</div>
                                        {[
                                            { label:"Your Score",  value:score,                     color:scoreColor },
                                            { label:"Top 25%",     value:report.benchmark?.top25,   color:"#6366f1" },
                                            { label:"Top 10%",     value:report.benchmark?.top10,   color:"#22c55e" },
                                            { label:"Industry Avg",value:report.benchmark?.avg,     color:"#f59e0b" },
                                        ].map(b => (
                                            <div key={b.label} style={{ marginBottom:12 }}>
                                                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                                                    <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontFamily:"'JetBrains Mono',monospace" }}>{b.label}</span>
                                                    <span style={{ fontSize:11, fontWeight:700, color:b.color, fontFamily:"'JetBrains Mono',monospace" }}>{b.value}</span>
                                                </div>
                                                <div className="ats-bench-bar">
                                                    <div className="ats-bench-fill" style={{ width:`${b.value}%`, background:b.color }}/>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Section scores */}
                                    <div className="ats-card">
                                        <div className="ats-label">Section Analysis</div>
                                        {Object.entries(report.sections || {}).map(([key, val]) => (
                                            <div key={key} className="ats-section-card">
                                                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:val.issue ? 6 : 0 }}>
                                                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                                        {val.present
                                                            ? <CheckCircle2 size={13} color="#22c55e"/>
                                                            : <XCircle      size={13} color="#ef4444"/>
                                                        }
                                                        <span style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.7)", textTransform:"capitalize" }}>{key}</span>
                                                    </div>
                                                    <span style={{ fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace",
                                                        color: val.score >= 80 ? "#22c55e" : val.score >= 60 ? "#f59e0b" : "#ef4444" }}>
                                                        {val.score}/100
                                                    </span>
                                                </div>
                                                {val.issue && (
                                                    <p style={{ fontSize:11, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", margin:0 }}>
                                                        {val.issue}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Format issues */}
                                    {report.format?.issues?.length > 0 && (
                                        <div className="ats-card">
                                            <div className="ats-label">Format Issues</div>
                                            {report.format.issues.map((issue, i) => (
                                                <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:8, fontSize:12, color:"rgba(255,255,255,0.5)", fontFamily:"'JetBrains Mono',monospace" }}>
                                                    <span style={{ color:"#f59e0b", flexShrink:0 }}>⚠</span>{issue}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Right column */}
                                <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

                                    {/* Top suggestions */}
                                    {report.suggestions?.topSuggestions?.length > 0 && (
                                        <div className="ats-card" style={{ borderColor:"rgba(34,197,94,0.15)", background:"rgba(34,197,94,0.03)" }}>
                                            <div className="ats-label">🚀 Top Actions to Improve Score</div>
                                            {report.suggestions.topSuggestions.map((s, i) => (
                                                <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:10, padding:"10px 12px", background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.12)", borderRadius:10 }}>
                                                    <span style={{ color:"#22c55e", fontWeight:900, fontSize:13, flexShrink:0 }}>{i+1}.</span>
                                                    <span style={{ fontSize:13, color:"rgba(255,255,255,0.7)", lineHeight:1.6 }}>{s}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Keywords */}
                                    <div className="ats-card">
                                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                                            <div className="ats-label" style={{ margin:0 }}>Keyword Match</div>
                                            <span style={{ fontSize:12, fontWeight:700, fontFamily:"'JetBrains Mono',monospace",
                                                color: report.keywords?.score >= 70 ? "#22c55e" : "#f59e0b" }}>
                                                {report.keywords?.matched?.length}/{report.keywords?.total} ({report.keywords?.score}%)
                                            </span>
                                        </div>

                                        {report.keywords?.matched?.length > 0 && (
                                            <div style={{ marginBottom:12 }}>
                                                <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", marginBottom:6 }}>✅ Found in resume</div>
                                                <div>
                                                    {report.keywords.matched.slice(0, 12).map(kw => (
                                                        <span key={kw} className="ats-kw-chip ats-kw-matched">{kw}</span>
                                                    ))}
                                                    {report.keywords.matched.length > 12 && (
                                                        <span style={{ fontSize:11, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace" }}>+{report.keywords.matched.length - 12} more</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {report.keywords?.missing?.length > 0 && (
                                            <div>
                                                <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", marginBottom:6 }}>❌ Missing from resume</div>
                                                <div>
                                                    {report.keywords.missing.slice(0, 12).map(kw => (
                                                        <span key={kw} className="ats-kw-chip ats-kw-missing">{kw}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Missing keywords with context */}
                                    {report.suggestions?.missingKeywords?.length > 0 && (
                                        <div className="ats-card">
                                            <div className="ats-label">Keywords to Add — with context</div>
                                            {report.suggestions.missingKeywords.slice(0, 6).map((item, i) => (
                                                <div key={i} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:10, padding:12, marginBottom:8 }}>
                                                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                                                        <span style={{ fontSize:12, fontWeight:700, color:"#f87171", fontFamily:"'JetBrains Mono',monospace" }}>
                                                            + {item.keyword}
                                                        </span>
                                                        <span style={{ fontSize:10, color:"rgba(255,255,255,0.25)", fontFamily:"'JetBrains Mono',monospace" }}>{item.context}</span>
                                                    </div>
                                                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
                                                        <p style={{ fontSize:12, color:"rgba(255,255,255,0.5)", fontFamily:"'JetBrains Mono',monospace", margin:0, lineHeight:1.6, flex:1 }}>
                                                            "{item.suggestedBullet}"
                                                        </p>
                                                        <button className="ats-copy-btn"
                                                            onClick={() => copyText(item.suggestedBullet, `kw-${i}`)}>
                                                            <Copy size={10}/>
                                                            {copied[`kw-${i}`] ? "Copied!" : "Copy"}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Bullet rewriter */}
                                    {report.suggestions?.weakBullets?.length > 0 && (
                                        <div className="ats-card">
                                            <div className="ats-label">🔧 AI Bullet Point Rewriter</div>
                                            <p style={{ fontSize:12, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", marginBottom:16, lineHeight:1.6 }}>
                                                These bullet points were identified as weak. Click "Rewrite" to get an ATS-optimized version.
                                            </p>
                                            {report.suggestions.weakBullets.map((item, i) => (
                                                <div key={i} className="ats-bullet-card">
                                                    {/* Original */}
                                                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10, marginBottom:8 }}>
                                                        <div style={{ flex:1 }}>
                                                            <div style={{ fontSize:10, color:"#f87171", fontFamily:"'JetBrains Mono',monospace", marginBottom:4, textTransform:"uppercase" }}>
                                                                ⚠ Weak — {item.issue}
                                                            </div>
                                                            <div className="ats-bullet-original">{item.original}</div>
                                                        </div>
                                                    </div>

                                                    {/* Rewritten */}
                                                    {rewritten[i] ? (
                                                        <div>
                                                            {showBefore[i] && (
                                                                <div style={{ fontSize:12, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", marginBottom:8, textDecoration:"line-through" }}>
                                                                    {item.original}
                                                                </div>
                                                            )}
                                                            <div className="ats-bullet-rewritten">
                                                                {rewritten[i].rewritten}
                                                            </div>
                                                            <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
                                                                {rewritten[i].improvements?.map((imp, j) => (
                                                                    <span key={j} style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.2)", color:"#22c55e", fontFamily:"'JetBrains Mono',monospace" }}>
                                                                        ✓ {imp}
                                                                    </span>
                                                                ))}
                                                                <button className="ats-copy-btn" onClick={() => copyText(rewritten[i].rewritten, `bullet-${i}`)}>
                                                                    <Copy size={10}/>{copied[`bullet-${i}`] ? "Copied!" : "Copy"}
                                                                </button>
                                                                <button className="ats-copy-btn"
                                                                    onClick={() => setShowBefore(prev => ({ ...prev, [i]: !prev[i] }))}>
                                                                    {showBefore[i] ? "Hide before" : "Compare"}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                                                            <button className="ats-rewrite-btn"
                                                                onClick={() => handleRewrite(item.original, i)}
                                                                disabled={rewriting[i]}>
                                                                {rewriting[i]
                                                                    ? <><span className="ats-spinner" style={{ borderTopColor:"#22c55e", border:"2px solid rgba(34,197,94,0.2)", borderTopColor:"#22c55e" }}/>Rewriting...</>
                                                                    : <><RefreshCw size={12}/>AI Rewrite</>
                                                                }
                                                            </button>
                                                            <span style={{ fontSize:11, color:"rgba(255,255,255,0.25)", fontFamily:"'JetBrains Mono',monospace" }}>
                                                                {item.issue}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}