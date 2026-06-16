import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import axiosClient from "../utils/axiosClient";
import {
    ChevronLeft, Upload, FileText, Link, Zap, CheckCircle2, XCircle,
    RefreshCw, Copy, ChevronDown, ChevronUp, AlertTriangle, BookOpen,
    TrendingUp, Brain, Target, Clock, History, Trash2, ArrowRight,
    BarChart3, Sparkles, GraduationCap, Shield, ChevronRight
} from "lucide-react";

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
    const [activeTab,    setActiveTab]    = useState("overview"); // overview | gaps | learning | history
    const [history,      setHistory]      = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Job queue polling state
    const [jobId,        setJobId]        = useState(null);
    const [jobStatus,    setJobStatus]    = useState(null);  // queued | processing | completed | failed
    const [jobStage,     setJobStage]     = useState("");    // current stage label
    const [jobPercent,   setJobPercent]   = useState(0);

    // Fetch history on mount
    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const { data } = await axiosClient.get("/ats/history");
            setHistory(data.analyses || []);
        } catch (err) { /* silent */ }
        finally { setHistoryLoading(false); }
    };

    const loadAnalysis = async (id) => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await axiosClient.get(`/ats/analysis/${id}`);
            setReport(data);
            setStep(2);
        } catch (err) {
            setError("Failed to load analysis");
        } finally {
            setLoading(false);
        }
    };

    const deleteAnalysis = async (id) => {
        try {
            await axiosClient.delete(`/ats/analysis/${id}`);
            setHistory(prev => prev.filter(a => a._id !== id));
        } catch (err) {
            console.error(err);
        }
    };

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
        setJobStatus(null);
        setJobStage("");
        setJobPercent(0);
        try {
            const fd = new FormData();
            fd.append("resume", resumeFile);
            fd.append("jdText", jdText);
            fd.append("role",   role);
            const { data } = await axiosClient.post("/ats/analyze", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            // Backend now returns { jobId } — start polling
            const newJobId = data.jobId;
            setJobId(newJobId);
            setJobStatus("queued");
            setJobStage("Queued — waiting to start...");
            setLoading(false);

            // Poll for job status
            let attempts = 0;
            const maxAttempts = 60; // 60 × 2s = 2 minutes max
            const poll = setInterval(async () => {
                attempts++;
                try {
                    const { data: statusData } = await axiosClient.get(`/ats/job/${newJobId}`);

                    if (statusData.status === "completed") {
                        clearInterval(poll);
                        setJobStatus("completed");
                        setJobPercent(100);
                        setJobStage("Analysis complete!");

                        // Fetch the full report
                        if (statusData.analysisId) {
                            const { data: reportData } = await axiosClient.get(`/ats/analysis/${statusData.analysisId}`);
                            setReport(reportData);
                        }
                        setStep(2);
                        setActiveTab("overview");
                        setJobId(null);
                        setJobStatus(null);
                        fetchHistory();
                        return;
                    }

                    if (statusData.status === "failed") {
                        clearInterval(poll);
                        setJobStatus("failed");
                        setError(statusData.error || "Analysis failed. Please try again.");
                        setJobId(null);
                        return;
                    }

                    // Active / queued
                    setJobStatus(statusData.status);
                    setJobStage(statusData.label || statusData.stage || "Processing...");
                    setJobPercent(statusData.percent || 0);

                } catch (pollErr) {
                    // Ignore transient polling errors
                    console.warn("Poll error:", pollErr.message);
                }

                if (attempts >= maxAttempts) {
                    clearInterval(poll);
                    setError("Analysis timed out. Please try again.");
                    setJobStatus("failed");
                    setJobId(null);
                }
            }, 2000);

        } catch (err) {
            setError(err.displayMessage || "Analysis failed. Please try again.");
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

    const score      = report?.score || report?.fitScore || 0;
    const scoreColor = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
    const scoreLabel = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Average" : "Needs Work";

    const severityColor = (sev) => {
        if (sev === "critical")  return { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", text: "#f87171", icon: "🔴" };
        if (sev === "important") return { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", text: "#fbbf24", icon: "🟡" };
        return { bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.2)", text: "#4ade80", icon: "🟢" };
    };

    return (
        <div style={{ minHeight:"100vh", background:"#0a0a0f", fontFamily:"'Inter',sans-serif", color:"#f0f0f0" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Sora:wght@400;500;600;700;800&family=Syne:wght@400;600;700;800;900&display=swap');
                *, *::before, *::after { box-sizing:border-box; }
                .ats-bg { position:fixed; inset:0; background:#0a0a0f; z-index:0; overflow:hidden; }
                .ats-bg::before { content:''; position:absolute; top:-30%; left:-10%; width:500px; height:500px; background:radial-gradient(circle,rgba(34,197,94,0.07) 0%,transparent 70%); border-radius:50%; }
                .ats-bg::after  { content:''; position:absolute; bottom:-20%; right:-10%; width:400px; height:400px; background:radial-gradient(circle,rgba(99,102,241,0.07) 0%,transparent 70%); border-radius:50%; }
                .ats-wrap { position:relative; z-index:1; }
                .ats-nav { height:60px; background:rgba(10,10,15,0.9); backdrop-filter:blur(20px); border-bottom:1px solid rgba(34,197,94,0.15); display:flex; align-items:center; padding:0 24px; gap:14px; position:sticky; top:0; z-index:100; }
                .ats-back { background:none; border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:6px 12px; color:rgba(255,255,255,0.4); cursor:pointer; display:inline-flex; align-items:center; gap:6px; font-size:12px; font-family:'JetBrains Mono',monospace; transition:all 0.2s; }
                .ats-back:hover { color:#fff; border-color:rgba(34,197,94,0.4); }
                .ats-body { max-width:1100px; margin:0 auto; padding:40px 24px; }
                .ats-hero { text-align:center; margin-bottom:40px; }
                .ats-badge { display:inline-flex; align-items:center; gap:8px; padding:6px 16px; background:rgba(34,197,94,0.08); border:1px solid rgba(34,197,94,0.25); border-radius:20px; font-size:12px; color:#22c55e; font-family:'JetBrains Mono',monospace; margin-bottom:16px; }
                .ats-h1 { font-size:38px; font-weight:800; font-family:'Sora',sans-serif; letter-spacing:-0.5px; background:linear-gradient(135deg,#fff 0%,#22c55e 60%,#6366f1 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; margin:0 0 12px; }
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
                .ats-btn { width:100%; padding:14px; border-radius:13px; border:none; background:linear-gradient(135deg,#22c55e,#16a34a); color:#fff; font-size:15px; font-weight:700; cursor:pointer; font-family:'Sora',sans-serif; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:8px; }
                .ats-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 28px rgba(34,197,94,0.35); }
                .ats-btn:disabled { opacity:0.35; cursor:not-allowed; transform:none; }
                .ats-sec-btn { padding:9px 18px; border-radius:10px; border:1px solid rgba(255,255,255,0.1); background:none; color:rgba(255,255,255,0.5); font-size:13px; font-weight:700; cursor:pointer; font-family:'Sora',sans-serif; transition:all 0.15s; display:inline-flex; align-items:center; gap:7px; }
                .ats-sec-btn:hover:not(:disabled) { border-color:rgba(34,197,94,0.4); color:#22c55e; }
                .ats-sec-btn:disabled { opacity:0.3; cursor:not-allowed; }
                .ats-error { background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); border-radius:10px; padding:12px 16px; font-size:12px; color:#f87171; font-family:'JetBrains Mono',monospace; margin-bottom:16px; }
                .ats-spinner { width:14px; height:14px; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:spin 0.7s linear infinite; }
                @keyframes spin { to { transform:rotate(360deg); } }
                @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
                @keyframes scoreReveal { from { transform:scale(0.8); opacity:0; } to { transform:scale(1); opacity:1; } }
                @keyframes ringPulse { 0%,100% { box-shadow:0 0 0 0 rgba(34,197,94,0); } 50% { box-shadow:0 0 30px 8px rgba(34,197,94,0.15); } }
                @keyframes slideInRight { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
                @keyframes progressPulse { 0%,100% { opacity:0.7; } 50% { opacity:1; } }
                @keyframes progressBarGlow { 0% { box-shadow: 0 0 8px rgba(34,197,94,0.3); } 50% { box-shadow: 0 0 20px rgba(34,197,94,0.5); } 100% { box-shadow: 0 0 8px rgba(34,197,94,0.3); } }

                /* Report styles */
                .ats-report-grid { display:grid; grid-template-columns:280px 1fr; gap:20px; }
                @media (max-width:900px) { .ats-report-grid { grid-template-columns:1fr; } }
                .ats-kw-chip { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:20px; font-size:11px; font-family:'JetBrains Mono',monospace; margin:3px; }
                .ats-kw-matched { background:rgba(34,197,94,0.1); border:1px solid rgba(34,197,94,0.25); color:#22c55e; }
                .ats-kw-missing { background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); color:#f87171; }
                .ats-kw-partial { background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.2); color:#fbbf24; }
                .ats-bench-bar { height:6px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden; margin-top:5px; position:relative; }
                .ats-bench-fill { height:100%; border-radius:3px; transition:width 1s ease; }
                .ats-bullet-card { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:14px; padding:16px; margin-bottom:10px; }
                .ats-bullet-original { font-size:13px; color:rgba(255,255,255,0.6); font-family:'JetBrains Mono',monospace; line-height:1.6; margin-bottom:10px; }
                .ats-bullet-rewritten { font-size:13px; color:#22c55e; font-family:'JetBrains Mono',monospace; line-height:1.6; background:rgba(34,197,94,0.06); border:1px solid rgba(34,197,94,0.2); border-radius:10px; padding:12px; }
                .ats-rewrite-btn { padding:6px 14px; border-radius:8px; border:1px solid rgba(34,197,94,0.3); background:rgba(34,197,94,0.08); color:#22c55e; font-size:12px; font-weight:700; cursor:pointer; font-family:'Sora',sans-serif; transition:all 0.15s; display:inline-flex; align-items:center; gap:6px; }
                .ats-rewrite-btn:hover:not(:disabled) { background:rgba(34,197,94,0.15); }
                .ats-rewrite-btn:disabled { opacity:0.4; cursor:not-allowed; }
                .ats-copy-btn { padding:5px 10px; border-radius:7px; border:1px solid rgba(255,255,255,0.08); background:none; color:rgba(255,255,255,0.4); font-size:11px; cursor:pointer; font-family:'JetBrains Mono',monospace; transition:all 0.15s; display:inline-flex; align-items:center; gap:5px; }
                .ats-copy-btn:hover { color:#fff; border-color:rgba(255,255,255,0.2); }
                .ats-divider { height:1px; background:rgba(255,255,255,0.06); margin:20px 0; }
                .ats-section-card { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:14px; margin-bottom:10px; }

                /* Tab styles */
                .ats-tabs { display:flex; gap:4px; background:rgba(255,255,255,0.04); border-radius:14px; padding:4px; margin-bottom:24px; border:1px solid rgba(255,255,255,0.06); overflow-x:auto; }
                .ats-tab { flex:1; padding:10px 16px; border-radius:11px; border:none; background:none; color:rgba(255,255,255,0.4); font-size:12px; font-weight:700; cursor:pointer; font-family:'Sora',sans-serif; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:6px; white-space:nowrap; }
                .ats-tab:hover { color:rgba(255,255,255,0.7); }
                .ats-tab.active { background:rgba(34,197,94,0.12); color:#22c55e; border:1px solid rgba(34,197,94,0.25); }

                /* Score hero animations */
                .score-hero-ring { animation: scoreReveal 0.8s ease-out, ringPulse 3s ease-in-out 1s infinite; }
                .score-stat { animation: fadeIn 0.5s ease-out backwards; }

                /* Skill gap card */
                .skill-gap-card { animation: slideInRight 0.4s ease-out backwards; transition: all 0.2s; }
                .skill-gap-card:hover { transform: translateX(4px); }

                /* Learning path card */
                .learn-card { animation: fadeIn 0.4s ease-out backwards; transition: all 0.2s; border-left: 3px solid rgba(99,102,241,0.4); }
                .learn-card:hover { border-left-color: #6366f1; background: rgba(99,102,241,0.04); }

                /* History row */
                .history-row { animation: fadeIn 0.3s ease-out backwards; transition: all 0.15s; cursor: pointer; }
                .history-row:hover { background: rgba(255,255,255,0.04); }

                /* TF-IDF meter */
                .tfidf-meter { position:relative; height:8px; background:rgba(255,255,255,0.06); border-radius:4px; overflow:hidden; }
                .tfidf-fill { height:100%; border-radius:4px; background:linear-gradient(90deg,#6366f1,#22c55e); transition:width 1.5s ease-out; }
            `}</style>

            <div className="ats-bg"/>
            <div className="ats-wrap">

                {/* Nav */}
                <nav className="ats-nav">
                    <button className="ats-back" onClick={() => navigate("/")}>
                        <ChevronLeft size={13}/>Back
                    </button>
                    <span style={{ fontSize:14, fontWeight:800, color:"#fff", fontFamily:"'Sora',sans-serif" }}>🎯 ATS Resume Analyzer</span>
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
                            <div className="ats-badge"><Sparkles size={12}/>AI-Powered ATS Analysis</div>
                            <h1 className="ats-h1">Beat the ATS System</h1>
                            <p className="ats-sub">NLP pipeline · TF-IDF scoring · Skill gap analysis · Learning paths · AI rewrites</p>
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

                    {/* Processing State — Job Queue Progress */}
                    {jobId && jobStatus && jobStatus !== "completed" && jobStatus !== "failed" && (
                        <div style={{ maxWidth: 520, margin: "0 auto", animation: "fadeIn 0.4s ease-out" }}>
                            <div className="ats-card" style={{ textAlign: "center", padding: 40 }}>
                                <div style={{ marginBottom: 28 }}>
                                    <div style={{
                                        width: 72, height: 72, margin: "0 auto 20px",
                                        borderRadius: "50%",
                                        background: "rgba(34,197,94,0.08)",
                                        border: "2px solid rgba(34,197,94,0.25)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        animation: "progressBarGlow 2s ease-in-out infinite"
                                    }}>
                                        <Brain size={30} style={{ color: "#22c55e", animation: "progressPulse 1.5s ease-in-out infinite" }} />
                                    </div>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 8, fontFamily: "'Sora',sans-serif" }}>
                                        Analyzing Your Resume
                                    </div>
                                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: "'JetBrains Mono',monospace", marginBottom: 24 }}>
                                        {jobStage || "Starting analysis..."}
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 8, height: 10, overflow: "hidden", marginBottom: 12 }}>
                                    <div style={{
                                        height: "100%", borderRadius: 8,
                                        background: "linear-gradient(90deg, #22c55e, #6366f1)",
                                        width: `${jobPercent}%`,
                                        transition: "width 0.6s ease-out",
                                        animation: "progressBarGlow 2s ease-in-out infinite"
                                    }} />
                                </div>
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono',monospace" }}>
                                    {jobPercent}% complete
                                </div>

                                {/* Stage indicators */}
                                <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
                                    {[
                                        { key: "parsing",     label: "Parse PDF text",           pct: 5 },
                                        { key: "nlp",         label: "NLP pipeline (TF-IDF)",    pct: 15 },
                                        { key: "keywords",    label: "AI keyword extraction",    pct: 30 },
                                        { key: "sections",    label: "Section analysis",         pct: 45 },
                                        { key: "scoring",     label: "Weighted scoring",         pct: 55 },
                                        { key: "llm",         label: "AI gap analysis",          pct: 70 },
                                        { key: "suggestions", label: "Build recommendations",    pct: 85 },
                                        { key: "saving",      label: "Save report",              pct: 95 },
                                    ].map(s => {
                                        const done  = jobPercent > s.pct;
                                        const active = !done && jobPercent >= (s.pct - 15);
                                        return (
                                            <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
                                                <div style={{
                                                    width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                                                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10,
                                                    ...(done
                                                        ? { background: "rgba(34,197,94,0.15)", border: "1px solid #22c55e", color: "#22c55e" }
                                                        : active
                                                            ? { background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.4)", color: "#22c55e", animation: "progressPulse 1s infinite" }
                                                            : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.2)" })
                                                }}>
                                                    {done ? "✓" : active ? <div className="ats-spinner" style={{ width: 10, height: 10 }}/> : ""}
                                                </div>
                                                <span style={{
                                                    fontSize: 12, fontFamily: "'JetBrains Mono',monospace",
                                                    color: done ? "#22c55e" : active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)"
                                                }}>
                                                    {s.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 0 — Upload Resume */}
                    {step === 0 && (
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:24, alignItems:"start" }}>
                            <div className="ats-card">
                                <div style={{ fontSize:17, fontWeight:800, color:"#fff", marginBottom:20, fontFamily:"'Sora',sans-serif" }}>
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

                            {/* History sidebar */}
                            <div className="ats-card" style={{ padding:20 }}>
                                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
                                    <History size={14} color="#6366f1"/>
                                    <div className="ats-label" style={{ margin:0 }}>Past Analyses</div>
                                </div>
                                {historyLoading ? (
                                    <div style={{ textAlign:"center", padding:20 }}>
                                        <div className="ats-spinner" style={{ margin:"0 auto" }}/>
                                    </div>
                                ) : history.length === 0 ? (
                                    <p style={{ fontSize:12, color:"rgba(255,255,255,0.25)", fontFamily:"'JetBrains Mono',monospace", textAlign:"center", padding:"20px 0" }}>
                                        No analyses yet
                                    </p>
                                ) : (
                                    <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:400, overflowY:"auto" }}>
                                        {history.slice(0, 10).map((a, i) => {
                                            const aColor = a.fitScore >= 80 ? "#22c55e" : a.fitScore >= 60 ? "#f59e0b" : "#ef4444";
                                            return (
                                                <div key={a._id} className="history-row"
                                                    style={{ padding:"10px 12px", borderRadius:10, border:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", gap:10, animationDelay:`${i*0.05}s` }}
                                                    onClick={() => loadAnalysis(a._id)}>
                                                    <div style={{ width:32, height:32, borderRadius:8, background:`${aColor}15`, border:`1px solid ${aColor}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, color:aColor, fontFamily:"'JetBrains Mono',monospace", flexShrink:0 }}>
                                                        {a.fitScore}
                                                    </div>
                                                    <div style={{ flex:1, minWidth:0 }}>
                                                        <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.7)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                                                            {a.role || "Analysis"}
                                                        </div>
                                                        <div style={{ fontSize:10, color:"rgba(255,255,255,0.25)", fontFamily:"'JetBrains Mono',monospace" }}>
                                                            {new Date(a.createdAt).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                    <button
                                                        style={{ background:"none", border:"none", cursor:"pointer", padding:4, color:"rgba(255,255,255,0.15)" }}
                                                        onClick={(e) => { e.stopPropagation(); deleteAnalysis(a._id); }}
                                                        title="Delete">
                                                        <Trash2 size={12}/>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 1 — Job Description */}
                    {step === 1 && (
                        <div className="ats-card" style={{ maxWidth:700, margin:"0 auto" }}>
                            <div style={{ fontSize:17, fontWeight:800, color:"#fff", marginBottom:20, fontFamily:"'Sora',sans-serif" }}>
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
                                        ? <><span className="ats-spinner"/>Analyzing with AI + NLP pipeline...</>
                                        : <><Brain size={15}/>Analyze ATS Score</>
                                    }
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2 — Report */}
                    {step === 2 && report && (
                        <div style={{ animation:"fadeIn 0.5s ease-out" }}>

                            {/* ═══════════════════════════════════════════════
                                SCORE HERO BANNER
                            ═══════════════════════════════════════════════ */}
                            <div style={{ background:`linear-gradient(135deg,${scoreColor}10,rgba(99,102,241,0.06),rgba(0,0,0,0))`, border:`1px solid ${scoreColor}25`, borderRadius:24, padding:"32px 36px", marginBottom:28, display:"flex", alignItems:"center", gap:32, flexWrap:"wrap" }}>
                                {/* Big animated score ring */}
                                <div style={{ flexShrink:0, textAlign:"center" }}>
                                    <div className="score-hero-ring" style={{
                                        width:130, height:130, borderRadius:"50%",
                                        border:`4px solid ${scoreColor}`,
                                        display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column",
                                        background:`radial-gradient(circle at center, ${scoreColor}08 0%, transparent 70%)`,
                                        position:"relative",
                                    }}>
                                        <div style={{ fontSize:42, fontWeight:800, color:scoreColor, fontFamily:"'Sora',sans-serif", lineHeight:1 }}>{score}</div>
                                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontFamily:"'JetBrains Mono',monospace" }}>/100</div>
                                    </div>
                                    <div style={{ fontSize:13, fontWeight:700, color:scoreColor, marginTop:10 }}>{scoreLabel}</div>
                                </div>

                                <div style={{ flex:1, minWidth:250 }}>
                                    <div style={{ fontSize:22, fontWeight:800, color:"#fff", marginBottom:8, fontFamily:"'Sora',sans-serif" }}>
                                        ATS Score for {report.role}
                                    </div>

                                    {/* LLM Justification */}
                                    <p style={{ fontSize:13, color:"rgba(255,255,255,0.55)", lineHeight:1.7, margin:"0 0 16px", fontFamily:"'JetBrains Mono',monospace", maxWidth:600 }}>
                                        {report.llmJustification || report.suggestions?.summary || "Analysis complete."}
                                    </p>

                                    {/* Score breakdown mini stats */}
                                    <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                                        {[
                                            { label:"TF-IDF Similarity", value:`${report.similarityScore || 0}%`, icon:<BarChart3 size={11}/>, color:"#6366f1" },
                                            { label:"Keyword Match",     value:`${report.keywordMatchScore || report.keywords?.score || 0}%`, icon:<Target size={11}/>, color:"#22c55e" },
                                            { label:report.benchmark?.percentile || "Benchmark", value:`Gap: ${report.benchmark?.gap || 0}`, icon:<TrendingUp size={11}/>, color:"#f59e0b" },
                                        ].map((s, i) => (
                                            <div key={s.label} className="score-stat" style={{
                                                padding:"6px 14px", borderRadius:12, fontSize:11, fontFamily:"'JetBrains Mono',monospace",
                                                background:`${s.color}10`, border:`1px solid ${s.color}30`, color:s.color,
                                                display:"flex", alignItems:"center", gap:6, animationDelay:`${0.3+i*0.1}s`,
                                            }}>
                                                {s.icon} {s.label}: <strong>{s.value}</strong>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* ═══════════════════════════════════════════════
                                TAB NAVIGATION
                            ═══════════════════════════════════════════════ */}
                            <div className="ats-tabs">
                                {[
                                    { id:"overview",  label:"Overview",      icon:<BarChart3 size={13}/> },
                                    { id:"gaps",      label:"Skill Gaps",    icon:<AlertTriangle size={13}/> },
                                    { id:"learning",  label:"Learning Path", icon:<GraduationCap size={13}/> },
                                    { id:"history",   label:"History",       icon:<History size={13}/> },
                                ].map(t => (
                                    <button key={t.id} className={`ats-tab${activeTab === t.id ? " active" : ""}`}
                                        onClick={() => setActiveTab(t.id)}>
                                        {t.icon}{t.label}
                                    </button>
                                ))}
                            </div>

                            {/* ═══════════════════════════════════════════════
                                TAB: OVERVIEW
                            ═══════════════════════════════════════════════ */}
                            {activeTab === "overview" && (
                                <div className="ats-report-grid" style={{ animation:"fadeIn 0.4s ease-out" }}>

                                    {/* Left column */}
                                    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

                                        {/* TF-IDF Metrics */}
                                        {report.tfidfMeta && (
                                            <div className="ats-card">
                                                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                                                    <Brain size={13} color="#6366f1"/>
                                                    <div className="ats-label" style={{ margin:0 }}>NLP Analysis</div>
                                                </div>
                                                <div style={{ marginBottom:14 }}>
                                                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                                                        <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontFamily:"'JetBrains Mono',monospace" }}>TF-IDF Cosine Similarity</span>
                                                        <span style={{ fontSize:11, fontWeight:700, color:"#6366f1", fontFamily:"'JetBrains Mono',monospace" }}>{report.similarityScore}%</span>
                                                    </div>
                                                    <div className="tfidf-meter">
                                                        <div className="tfidf-fill" style={{ width:`${report.similarityScore || 0}%` }}/>
                                                    </div>
                                                </div>
                                                {[
                                                    { label:"Vocabulary Size",   value:report.tfidfMeta.vocabularySize },
                                                    { label:"Resume Tokens",     value:report.tfidfMeta.resumeTokenCount },
                                                    { label:"JD Tokens",         value:report.tfidfMeta.jdTokenCount },
                                                ].map(m => (
                                                    <div key={m.label} style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                                                        <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace" }}>{m.label}</span>
                                                        <span style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.5)", fontFamily:"'JetBrains Mono',monospace" }}>{m.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

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
                                                    color: (report.keywords?.score || report.keywordMatchScore) >= 70 ? "#22c55e" : "#f59e0b" }}>
                                                    {report.keywords?.matched?.length}/{report.keywords?.total} ({report.keywords?.score || report.keywordMatchScore}%)
                                                </span>
                                            </div>

                                            {report.keywords?.matched?.length > 0 && (
                                                <div style={{ marginBottom:12 }}>
                                                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", marginBottom:6 }}>✅ Found in resume</div>
                                                    <div>
                                                        {report.keywords.matched.slice(0, 15).map(kw => (
                                                            <span key={kw} className="ats-kw-chip ats-kw-matched">{kw}</span>
                                                        ))}
                                                        {report.keywords.matched.length > 15 && (
                                                            <span style={{ fontSize:11, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace" }}>+{report.keywords.matched.length - 15} more</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {report.keywords?.partial?.length > 0 && (
                                                <div style={{ marginBottom:12 }}>
                                                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", marginBottom:6 }}>🟡 Partial match</div>
                                                    <div>
                                                        {report.keywords.partial.slice(0, 10).map(kw => (
                                                            <span key={kw} className="ats-kw-chip ats-kw-partial">{kw}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {report.keywords?.missing?.length > 0 && (
                                                <div>
                                                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", marginBottom:6 }}>❌ Missing from resume</div>
                                                    <div>
                                                        {report.keywords.missing.slice(0, 15).map(kw => (
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
                                                                        ? <><span className="ats-spinner" style={{ border:"2px solid rgba(34,197,94,0.2)", borderTopColor:"#22c55e" }}/>Rewriting...</>
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
                            )}

                            {/* ═══════════════════════════════════════════════
                                TAB: SKILL GAPS
                            ═══════════════════════════════════════════════ */}
                            {activeTab === "gaps" && (
                                <div style={{ animation:"fadeIn 0.4s ease-out" }}>
                                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
                                        <Shield size={18} color="#f87171"/>
                                        <div>
                                            <div style={{ fontSize:18, fontWeight:800, color:"#fff", fontFamily:"'Sora',sans-serif" }}>Skill Gap Analysis</div>
                                            <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", fontFamily:"'JetBrains Mono',monospace" }}>
                                                {report.skillGaps?.length || 0} gaps identified · Prioritized by severity
                                            </div>
                                        </div>
                                    </div>

                                    {(!report.skillGaps || report.skillGaps.length === 0) ? (
                                        <div className="ats-card" style={{ textAlign:"center", padding:40 }}>
                                            <CheckCircle2 size={32} color="#22c55e" style={{ marginBottom:12 }}/>
                                            <div style={{ fontSize:16, fontWeight:700, color:"#fff", marginBottom:6, fontFamily:"'Sora',sans-serif" }}>No Critical Gaps Found</div>
                                            <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", fontFamily:"'JetBrains Mono',monospace" }}>
                                                Your resume covers the key requirements well!
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                                            {report.skillGaps.map((gap, i) => {
                                                const sev = severityColor(gap.severity);
                                                return (
                                                    <div key={i} className="skill-gap-card ats-card"
                                                        style={{ animationDelay:`${i*0.08}s`, padding:20, borderColor:sev.border, background:sev.bg }}>
                                                        <div style={{ display:"flex", alignItems:"flex-start", gap:14 }}>
                                                            <div style={{ fontSize:20, flexShrink:0, marginTop:2 }}>{sev.icon}</div>
                                                            <div style={{ flex:1 }}>
                                                                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6, flexWrap:"wrap" }}>
                                                                    <span style={{ fontSize:15, fontWeight:700, color:"#fff", fontFamily:"'Sora',sans-serif" }}>{gap.skill}</span>
                                                                    <span style={{
                                                                        fontSize:10, padding:"2px 10px", borderRadius:20,
                                                                        background:`${sev.text}15`, border:`1px solid ${sev.text}40`, color:sev.text,
                                                                        fontFamily:"'JetBrains Mono',monospace", fontWeight:700, textTransform:"uppercase",
                                                                    }}>
                                                                        {gap.severity}
                                                                    </span>
                                                                </div>
                                                                <p style={{ fontSize:13, color:"rgba(255,255,255,0.5)", fontFamily:"'JetBrains Mono',monospace", lineHeight:1.7, margin:"0 0 10px" }}>
                                                                    {gap.reason}
                                                                </p>
                                                                <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background:"rgba(255,255,255,0.04)", borderRadius:10, border:"1px solid rgba(255,255,255,0.06)" }}>
                                                                    <ArrowRight size={12} color="#22c55e"/>
                                                                    <span style={{ fontSize:12, color:"#22c55e", fontFamily:"'JetBrains Mono',monospace" }}>
                                                                        {gap.action}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ═══════════════════════════════════════════════
                                TAB: LEARNING PATH
                            ═══════════════════════════════════════════════ */}
                            {activeTab === "learning" && (
                                <div style={{ animation:"fadeIn 0.4s ease-out" }}>
                                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24 }}>
                                        <GraduationCap size={18} color="#6366f1"/>
                                        <div>
                                            <div style={{ fontSize:18, fontWeight:800, color:"#fff", fontFamily:"'Sora',sans-serif" }}>Personalized Learning Path</div>
                                            <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", fontFamily:"'JetBrains Mono',monospace" }}>
                                                AI-generated recommendations to fill your skill gaps
                                            </div>
                                        </div>
                                    </div>

                                    {(!report.learningPath || report.learningPath.length === 0) ? (
                                        <div className="ats-card" style={{ textAlign:"center", padding:40 }}>
                                            <Sparkles size={32} color="#6366f1" style={{ marginBottom:12 }}/>
                                            <div style={{ fontSize:16, fontWeight:700, color:"#fff", marginBottom:6, fontFamily:"'Sora',sans-serif" }}>No Learning Path Generated</div>
                                            <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", fontFamily:"'JetBrains Mono',monospace" }}>
                                                Your skills are well-aligned with this role!
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                                            {report.learningPath.map((item, i) => (
                                                <div key={i} className="learn-card ats-card"
                                                    style={{ animationDelay:`${i*0.1}s`, padding:22, paddingLeft:24 }}>
                                                    <div style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
                                                        {/* Priority badge */}
                                                        <div style={{
                                                            width:36, height:36, borderRadius:10, flexShrink:0,
                                                            background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.3)",
                                                            display:"flex", alignItems:"center", justifyContent:"center",
                                                            fontSize:14, fontWeight:800, color:"#818cf8", fontFamily:"'Sora',sans-serif",
                                                        }}>
                                                            {item.priority || (i + 1)}
                                                        </div>

                                                        <div style={{ flex:1 }}>
                                                            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6, flexWrap:"wrap" }}>
                                                                <span style={{ fontSize:15, fontWeight:700, color:"#fff", fontFamily:"'Sora',sans-serif" }}>{item.skill}</span>
                                                                {item.timeEstimate && (
                                                                    <span style={{
                                                                        display:"inline-flex", alignItems:"center", gap:4,
                                                                        fontSize:10, padding:"2px 10px", borderRadius:20,
                                                                        background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.25)",
                                                                        color:"#818cf8", fontFamily:"'JetBrains Mono',monospace",
                                                                    }}>
                                                                        <Clock size={9}/>{item.timeEstimate}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {item.description && (
                                                                <p style={{ fontSize:13, color:"rgba(255,255,255,0.5)", fontFamily:"'JetBrains Mono',monospace", lineHeight:1.7, margin:"0 0 12px" }}>
                                                                    {item.description}
                                                                </p>
                                                            )}
                                                            {item.resources?.length > 0 && (
                                                                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                                                                    {item.resources.map((res, j) => (
                                                                        <span key={j} style={{
                                                                            display:"inline-flex", alignItems:"center", gap:5,
                                                                            fontSize:11, padding:"4px 10px", borderRadius:8,
                                                                            background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
                                                                            color:"rgba(255,255,255,0.6)", fontFamily:"'JetBrains Mono',monospace",
                                                                        }}>
                                                                            <BookOpen size={10}/>{res}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ═══════════════════════════════════════════════
                                TAB: HISTORY
                            ═══════════════════════════════════════════════ */}
                            {activeTab === "history" && (
                                <div style={{ animation:"fadeIn 0.4s ease-out" }}>
                                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24 }}>
                                        <History size={18} color="#22c55e"/>
                                        <div>
                                            <div style={{ fontSize:18, fontWeight:800, color:"#fff", fontFamily:"'Sora',sans-serif" }}>Analysis History</div>
                                            <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", fontFamily:"'JetBrains Mono',monospace" }}>
                                                {history.length} past {history.length === 1 ? "analysis" : "analyses"}
                                            </div>
                                        </div>
                                    </div>

                                    {history.length === 0 ? (
                                        <div className="ats-card" style={{ textAlign:"center", padding:40 }}>
                                            <History size={32} color="rgba(255,255,255,0.2)" style={{ marginBottom:12 }}/>
                                            <div style={{ fontSize:16, fontWeight:700, color:"#fff", marginBottom:6, fontFamily:"'Sora',sans-serif" }}>No History Yet</div>
                                            <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", fontFamily:"'JetBrains Mono',monospace" }}>
                                                Run an analysis to start building your history
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                                            {history.map((a, i) => {
                                                const aColor = a.fitScore >= 80 ? "#22c55e" : a.fitScore >= 60 ? "#f59e0b" : "#ef4444";
                                                const aLabel = a.fitScore >= 80 ? "Excellent" : a.fitScore >= 60 ? "Good" : a.fitScore >= 40 ? "Average" : "Needs Work";
                                                return (
                                                    <div key={a._id} className="history-row ats-card"
                                                        style={{ padding:"16px 20px", animationDelay:`${i*0.05}s`, display:"flex", alignItems:"center", gap:16, cursor:"pointer" }}
                                                        onClick={() => loadAnalysis(a._id)}>
                                                        <div style={{
                                                            width:50, height:50, borderRadius:14,
                                                            background:`${aColor}10`, border:`2px solid ${aColor}40`,
                                                            display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", flexShrink:0,
                                                        }}>
                                                            <div style={{ fontSize:18, fontWeight:900, color:aColor, fontFamily:"'Syne',sans-serif", lineHeight:1 }}>{a.fitScore}</div>
                                                            <div style={{ fontSize:8, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace" }}>/100</div>
                                                        </div>
                                                        <div style={{ flex:1 }}>
                                                            <div style={{ fontSize:14, fontWeight:800, color:"#fff", marginBottom:4 }}>
                                                                {a.role || "Software Engineer"}
                                                            </div>
                                                            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                                                                <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace" }}>
                                                                    {new Date(a.createdAt).toLocaleDateString("en-US", { year:"numeric", month:"short", day:"numeric" })}
                                                                </span>
                                                                <span style={{
                                                                    fontSize:9, padding:"2px 8px", borderRadius:20,
                                                                    background:`${aColor}10`, border:`1px solid ${aColor}30`, color:aColor,
                                                                    fontFamily:"'JetBrains Mono',monospace", fontWeight:700,
                                                                }}>
                                                                    {aLabel}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                                                            <button
                                                                style={{ background:"none", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, cursor:"pointer", padding:"6px 8px", color:"rgba(255,255,255,0.25)", transition:"all 0.15s" }}
                                                                onClick={(e) => { e.stopPropagation(); deleteAnalysis(a._id); }}
                                                                title="Delete analysis">
                                                                <Trash2 size={13}/>
                                                            </button>
                                                            <ChevronRight size={16} color="rgba(255,255,255,0.15)"/>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}