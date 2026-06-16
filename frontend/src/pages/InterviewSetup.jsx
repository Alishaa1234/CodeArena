import { useState } from "react";
import { useNavigate } from "react-router";
import axiosClient from "../utils/axiosClient";
import { BrainCircuit, Upload, ChevronLeft, Briefcase, Clock, Zap, Shield, Star, CheckCircle2, X } from "lucide-react";

const QUICK_ROLES = [
    { label: "Frontend Dev",     icon: "⚛️" },
    { label: "Backend Dev",      icon: "⚙️" },
    { label: "Full Stack Dev",   icon: "🧩" },
    { label: "Data Scientist",   icon: "📊" },
    { label: "ML Engineer",      icon: "🤖" },
    { label: "DevOps Engineer",  icon: "🚀" },
    { label: "Product Manager",  icon: "🎯" },
    { label: "System Design",    icon: "🏗️" },
];

const EXP_OPTIONS = ["Fresher", "1 year", "2 years", "3 years", "5+ years", "10+ years"];

const TEMPLATES = [
    { label: "FAANG Frontend",    emoji: "🌐", role: "Frontend Developer",  experience: "3 years",  mode: "Technical", difficulty: "Hard",   tag: "Popular"  },
    { label: "ML Engineer",       emoji: "🤖", role: "ML Engineer",         experience: "2 years",  mode: "Technical", difficulty: "Hard",   tag: "Trending" },
    { label: "System Design",     emoji: "🏗️",  role: "System Design",       experience: "5+ years", mode: "Technical", difficulty: "Hard",   tag: "Senior"   },
    { label: "HR Behavioral",     emoji: "🤝", role: "Software Engineer",   experience: "1 year",   mode: "HR",        difficulty: "Medium", tag: "Fresher"  },
    { label: "Backend Engineer",  emoji: "⚙️",  role: "Backend Developer",   experience: "2 years",  mode: "Technical", difficulty: "Medium", tag: "Popular"  },
    { label: "Data Science",      emoji: "📊", role: "Data Scientist",      experience: "2 years",  mode: "Technical", difficulty: "Medium", tag: "Hot"      },
    { label: "Coding Round",      emoji: "💻", role: "Software Engineer",   experience: "2 years",  mode: "Coding",    difficulty: "Medium", tag: "New"      },
    { label: "Fresher Technical", emoji: "🎓", role: "Software Engineer",   experience: "Fresher",  mode: "Technical", difficulty: "Easy",   tag: "Fresher"  },
];

export default function InterviewSetup() {
    const navigate = useNavigate();
    const [role,         setRole]         = useState("");
    const [experience,   setExperience]   = useState("");
    const [mode,         setMode]         = useState("Technical");
    const [difficulty,   setDifficulty]   = useState("Medium");
    const [resumeFile,   setResumeFile]   = useState(null);
    const [loading,      setLoading]      = useState(false);
    const [analyzing,    setAnalyzing]    = useState(false);
    const [analysisDone, setAnalysisDone] = useState(false);
    const [projects,     setProjects]     = useState([]);
    const [skills,       setSkills]       = useState([]);
    const [resumeText,   setResumeText]   = useState("");
    const [error,        setError]        = useState(null);
    const [step,         setStep]         = useState(1); // 1=role, 2=config, 3=resume

    const handleUploadResume = async () => {
        if (!resumeFile || analyzing) return;
        setAnalyzing(true);
        setError(null);
        const fd = new FormData();
        fd.append("resume", resumeFile);
        try {
            const { data } = await axiosClient.post("/api/interview/resume", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setRole(data.role || role);
            setExperience(data.experience || experience);
            setProjects(data.projects || []);
            setSkills(data.skills || []);
            setResumeText(data.resumeText || "");
            setAnalysisDone(true);
        } catch (err) {
            setError("Resume analysis failed. You can still proceed manually.");
        } finally {
            setAnalyzing(false);
        }
    };

    const handleStart = async () => {
        if (!role || !experience || loading) return;
        setLoading(true);
        setError(null);
        try {
            const { data } = await axiosClient.post("/api/interview/generate-questions", {
                role, experience, mode, resumeText, projects, skills,
            });
            sessionStorage.setItem("interviewData", JSON.stringify(data));
            // Coding mode goes to the Monaco editor coding page
            if (mode === "Coding") {
                navigate("/interview/coding");
            } else {
                navigate("/interview/live");
            }
        } catch (err) {
            setError(err.displayMessage || "Failed to start interview. Check your credits.");
            setLoading(false);
        }
    };

    const canProceed = role.trim() && experience.trim();

    return (
        <div style={{ minHeight:"100vh", background:"#1e1e1e", fontFamily:"'Syne',sans-serif", color:"#f0f0f0" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@400;600;700;800;900&display=swap');
                *, *::before, *::after { box-sizing:border-box; }

                /* Animated background */
                .is-bg { position:fixed; inset:0; background:#1e1e1e; z-index:0; overflow:hidden; }
                .is-bg::before { content:''; position:absolute; top:-40%; left:-20%; width:600px; height:600px; background:radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%); border-radius:50%; animation:drift1 8s ease-in-out infinite; }
                .is-bg::after  { content:''; position:absolute; bottom:-30%; right:-10%; width:500px; height:500px; background:radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%); border-radius:50%; animation:drift2 10s ease-in-out infinite; }
                @keyframes drift1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(40px,30px)} }
                @keyframes drift2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-30px,-20px)} }

                .is-wrap { position:relative; z-index:1; min-height:100vh; }

                /* Nav */
                .is-nav { height:60px; background:rgba(10,10,15,0.8); backdrop-filter:blur(20px); border-bottom:1px solid rgba(168,85,247,0.15); display:flex; align-items:center; padding:0 24px; gap:14px; position:sticky; top:0; z-index:100; }
                .is-back { background:none; border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:6px 12px; color:rgba(255,255,255,0.5); cursor:pointer; display:inline-flex; align-items:center; gap:6px; font-size:12px; font-family:'JetBrains Mono',monospace; transition:all 0.2s; }
                .is-back:hover { color:#fff; border-color:rgba(168,85,247,0.5); background:rgba(168,85,247,0.08); }

                /* Body */
                .is-body { max-width:1000px; margin:0 auto; padding:48px 24px; }

                /* Hero */
                .is-hero { text-align:center; margin-bottom:48px; }
                .is-hero-badge { display:inline-flex; align-items:center; gap:8px; padding:6px 16px; background:rgba(168,85,247,0.1); border:1px solid rgba(168,85,247,0.3); border-radius:20px; font-size:12px; color:#a855f7; font-family:'JetBrains Mono',monospace; margin-bottom:20px; }
                .is-hero h1 { font-size:42px; font-weight:900; letter-spacing:-1px; line-height:1.1; margin:0 0 14px; background:linear-gradient(135deg,#fff 0%,#a855f7 50%,#6366f1 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
                .is-hero p { font-size:15px; color:rgba(255,255,255,0.45); max-width:500px; margin:0 auto; line-height:1.7; }

                /* Steps */
                .is-steps { display:flex; align-items:center; justify-content:center; gap:0; margin-bottom:40px; }
                .is-step { display:flex; align-items:center; gap:8px; }
                .is-step-dot { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; transition:all 0.3s; border:2px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.3); }
                .is-step-dot.active { background:linear-gradient(135deg,#a855f7,#6366f1); border-color:transparent; color:#fff; box-shadow:0 0 20px rgba(168,85,247,0.5); }
                .is-step-dot.done { background:rgba(34,197,94,0.15); border-color:#22c55e; color:#22c55e; }
                .is-step-label { font-size:11px; color:rgba(255,255,255,0.3); font-family:'JetBrains Mono',monospace; }
                .is-step-label.active { color:#a855f7; }
                .is-step-line { width:60px; height:1px; background:rgba(255,255,255,0.1); margin:0 8px; }
                .is-step-line.done { background:linear-gradient(90deg,#22c55e,#a855f7); }

                /* Cards */
                .is-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:20px; padding:28px; backdrop-filter:blur(10px); }
                .is-card-title { font-size:16px; font-weight:800; color:#fff; margin-bottom:20px; display:flex; align-items:center; gap:10px; }

                /* Quick role */
                .is-role-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:16px; }
                @media (max-width:640px) { .is-role-grid { grid-template-columns:repeat(2,1fr); } }
                .is-role-btn { padding:12px 10px; border-radius:12px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); color:rgba(255,255,255,0.6); cursor:pointer; font-size:12px; font-family:'Syne',sans-serif; font-weight:600; transition:all 0.2s; text-align:center; }
                .is-role-btn:hover { border-color:rgba(168,85,247,0.4); background:rgba(168,85,247,0.08); color:#fff; transform:translateY(-2px); }
                .is-role-btn.active { border-color:#a855f7; background:rgba(168,85,247,0.15); color:#a855f7; }
                .is-role-emoji { font-size:18px; display:block; margin-bottom:4px; }

                /* Inputs */
                .is-label { display:block; font-size:10px; font-weight:700; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px; font-family:'JetBrains Mono',monospace; }
                .is-input { width:100%; padding:12px 16px; border-radius:12px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.05); color:#fff; font-size:14px; outline:none; font-family:'JetBrains Mono',monospace; transition:all 0.2s; }
                .is-input:focus { border-color:#a855f7; background:rgba(168,85,247,0.06); box-shadow:0 0 0 3px rgba(168,85,247,0.1); }
                .is-input::placeholder { color:rgba(255,255,255,0.2); }

                /* Exp grid */
                .is-exp-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
                @media (max-width:500px) { .is-exp-grid { grid-template-columns:repeat(2,1fr); } }
                .is-exp-btn { padding:9px; border-radius:10px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); color:rgba(255,255,255,0.5); cursor:pointer; font-size:12px; font-family:'JetBrains Mono',monospace; transition:all 0.15s; text-align:center; }
                .is-exp-btn:hover { border-color:rgba(168,85,247,0.4); color:#fff; }
                .is-exp-btn.active { border-color:#a855f7; background:rgba(168,85,247,0.12); color:#a855f7; }

                /* Mode */
                .is-mode-row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; }
                .is-mode-card { padding:16px; border-radius:14px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); cursor:pointer; transition:all 0.2s; text-align:center; }
                .is-mode-card:hover { border-color:rgba(168,85,247,0.3); transform:translateY(-2px); }
                .is-mode-card.active { border-color:#a855f7; background:rgba(168,85,247,0.1); }
                .is-mode-icon { font-size:24px; margin-bottom:6px; }
                .is-mode-title { font-size:13px; font-weight:700; color:#fff; }
                .is-mode-desc { font-size:11px; color:rgba(255,255,255,0.35); font-family:'JetBrains Mono',monospace; margin-top:3px; }

                /* Difficulty */
                .is-diff-row { display:flex; gap:8px; }
                .is-diff-btn { flex:1; padding:8px; border-radius:10px; border:1px solid rgba(255,255,255,0.08); background:none; color:rgba(255,255,255,0.4); font-size:12px; font-weight:700; cursor:pointer; font-family:'Syne',sans-serif; transition:all 0.15s; }
                .is-diff-btn.Easy.active   { border-color:#22c55e; color:#22c55e; background:rgba(34,197,94,0.1); }
                .is-diff-btn.Medium.active { border-color:#f59e0b; color:#f59e0b; background:rgba(245,158,11,0.1); }
                .is-diff-btn.Hard.active   { border-color:#ef4444; color:#ef4444; background:rgba(239,68,68,0.1); }

                /* Upload */
                .is-upload-zone { border:2px dashed rgba(168,85,247,0.2); border-radius:16px; padding:28px; text-align:center; cursor:pointer; transition:all 0.2s; background:rgba(168,85,247,0.03); }
                .is-upload-zone:hover { border-color:rgba(168,85,247,0.5); background:rgba(168,85,247,0.06); }
                .is-upload-zone.has-file { border-color:#a855f7; }

                /* Tags */
                .is-tag { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:20px; font-size:11px; font-family:'JetBrains Mono',monospace; background:rgba(168,85,247,0.12); color:#c084fc; border:1px solid rgba(168,85,247,0.2); margin:3px; }

                /* CTA Button */
                .is-start-btn { width:100%; padding:16px; border-radius:14px; border:none; background:linear-gradient(135deg,#a855f7,#6366f1); color:#fff; font-size:16px; font-weight:800; cursor:pointer; font-family:'Syne',sans-serif; transition:all 0.2s; position:relative; overflow:hidden; }
                .is-start-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 32px rgba(168,85,247,0.4); }
                .is-start-btn:disabled { opacity:0.35; cursor:not-allowed; transform:none; }
                .is-start-btn::after { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,0.1),transparent); }

                /* Nav buttons */
                .is-nav-btn { padding:10px 20px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); background:none; color:rgba(255,255,255,0.5); font-size:13px; font-weight:700; cursor:pointer; font-family:'Syne',sans-serif; transition:all 0.15s; }
                .is-nav-btn:hover { border-color:rgba(168,85,247,0.4); color:#fff; }
                .is-nav-btn.primary { background:linear-gradient(135deg,#a855f7,#6366f1); border:none; color:#fff; }
                .is-nav-btn.primary:hover { box-shadow:0 4px 20px rgba(168,85,247,0.4); transform:translateY(-1px); }

                .is-spinner { width:16px; height:16px; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:spin 0.7s linear infinite; display:inline-block; margin-right:8px; vertical-align:middle; }
                @keyframes spin { to { transform:rotate(360deg); } }

                .is-error { background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); border-radius:10px; padding:12px 16px; font-size:12px; color:#f87171; font-family:'JetBrains Mono',monospace; margin-bottom:16px; }
            `}</style>

            {/* Animated bg */}
            <div className="is-bg"/>

            <div className="is-wrap">
                {/* Nav */}
                <nav className="is-nav">
                    <button className="is-back" onClick={() => navigate("/")}>
                        <ChevronLeft size={13}/>Back
                    </button>
                    <BrainCircuit size={18} color="#a855f7"/>
                    <span style={{ fontSize:14, fontWeight:800, color:"#fff" }}>AI Mock Interview</span>
                    <button onClick={() => navigate("/interview/history")} style={{ marginLeft:"auto", padding:"6px 14px", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, background:"none", color:"rgba(255,255,255,0.4)", fontSize:12, cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", transition:"all 0.2s" }}
                        onMouseEnter={e=>e.currentTarget.style.color="#fff"}
                        onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.4)"}
                    >
                        History →
                    </button>
                </nav>

                <div className="is-body">
                    {/* Hero */}
                    <div className="is-hero">
                        <div className="is-hero-badge">
                            <Zap size={12}/>AI-Powered · Real-time Feedback · Scored
                        </div>
                        <h1>Ace Your Next Interview</h1>
                        <p>Practice with an AI interviewer that adapts to your role, experience, and resume. Get detailed feedback on every answer.</p>
                    </div>

                    {/* Steps indicator */}
                    <div className="is-steps">
                        {["Role", "Config", "Resume"].map((s, i) => (
                            <>
                                <div className="is-step" key={s}>
                                    <div className={`is-step-dot${step === i+1 ? " active" : step > i+1 ? " done" : ""}`}>
                                        {step > i+1 ? "✓" : i+1}
                                    </div>
                                    <span className={`is-step-label${step === i+1 ? " active" : ""}`}>{s}</span>
                                </div>
                                {i < 2 && <div className={`is-step-line${step > i+1 ? " done" : ""}`}/>}
                            </>
                        ))}
                    </div>

                    {error && <div className="is-error">{error}</div>}

                    {/* Templates — shown only on step 1 */}
                    {step === 1 && (
                        <div style={{ marginBottom:24 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                                <span style={{ fontSize:11, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", textTransform:"uppercase", letterSpacing:"1px" }}>Quick Start Templates</span>
                                <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.06)" }}/>
                            </div>
                            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
                                {TEMPLATES.map(t => (
                                    <div key={t.label}
                                        onClick={() => { setRole(t.role); setExperience(t.experience); setMode(t.mode); setDifficulty(t.difficulty); setStep(3); }}
                                        style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:"14px 12px", cursor:"pointer", transition:"all 0.2s", position:"relative", overflow:"hidden" }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(168,85,247,0.4)"; e.currentTarget.style.background="rgba(168,85,247,0.08)"; e.currentTarget.style.transform="translateY(-2px)"; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.07)"; e.currentTarget.style.background="rgba(255,255,255,0.03)"; e.currentTarget.style.transform="translateY(0)"; }}
                                    >
                                        <div style={{ position:"absolute", top:8, right:8, fontSize:9, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", padding:"2px 6px", borderRadius:10,
                                            color: t.tag === "New" ? "#22c55e" : t.tag === "Trending" || t.tag === "Hot" ? "#f59e0b" : t.tag === "Senior" ? "#ef4444" : "#a855f7",
                                            background: t.tag === "New" ? "rgba(34,197,94,0.1)" : t.tag === "Trending" || t.tag === "Hot" ? "rgba(245,158,11,0.1)" : t.tag === "Senior" ? "rgba(239,68,68,0.1)" : "rgba(168,85,247,0.1)",
                                        }}>{t.tag}</div>
                                        <div style={{ fontSize:24, marginBottom:8 }}>{t.emoji}</div>
                                        <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.8)", marginBottom:4 }}>{t.label}</div>
                                        <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace" }}>{t.mode} · {t.difficulty}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 1 — Role */}
                    {step === 1 && (
                        <div className="is-card">
                            <div className="is-card-title"><Briefcase size={18} color="#a855f7"/>Choose Your Role</div>

                            {/* Quick select */}
                            <div className="is-role-grid">
                                {QUICK_ROLES.map(r => (
                                    <button key={r.label} className={`is-role-btn${role === r.label ? " active" : ""}`}
                                        onClick={() => setRole(r.label)}>
                                        <span className="is-role-emoji">{r.icon}</span>
                                        {r.label}
                                    </button>
                                ))}
                            </div>

                            <div style={{ display:"flex", alignItems:"center", gap:12, margin:"16px 0", color:"rgba(255,255,255,0.2)", fontSize:12, fontFamily:"'JetBrains Mono',monospace" }}>
                                <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.08)" }}/>
                                or type custom role
                                <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.08)" }}/>
                            </div>

                            <input className="is-input" placeholder="e.g. iOS Developer, Blockchain Engineer..."
                                value={role} onChange={e => setRole(e.target.value)}/>

                            <div style={{ display:"flex", justifyContent:"flex-end", marginTop:20 }}>
                                <button className="is-nav-btn primary" onClick={() => setStep(2)} disabled={!role.trim()}>
                                    Next: Configure →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2 — Config */}
                    {step === 2 && (
                        <div className="is-card">
                            <div className="is-card-title"><Star size={18} color="#a855f7"/>Interview Configuration</div>

                            {/* Experience */}
                            <div style={{ marginBottom:20 }}>
                                <label className="is-label">Experience Level</label>
                                <div className="is-exp-grid">
                                    {EXP_OPTIONS.map(e => (
                                        <button key={e} className={`is-exp-btn${experience === e ? " active" : ""}`}
                                            onClick={() => setExperience(e)}>{e}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Mode */}
                            <div style={{ marginBottom:20 }}>
                                <label className="is-label">Interview Type</label>
                                <div className="is-mode-row">
                                    {[
                                        { value:"Technical", icon:"💻", desc:"DSA, system design, coding" },
                                        { value:"HR",        icon:"🤝", desc:"Behavioral, culture fit"   },
                                        { value:"Coding",    icon:"⌨️",  desc:"Live coding problem + review" },
                                    ].map(m => (
                                        <div key={m.value} className={`is-mode-card${mode === m.value ? " active" : ""}`}
                                            onClick={() => setMode(m.value)}>
                                            <div className="is-mode-icon">{m.icon}</div>
                                            <div className="is-mode-title">{m.value}</div>
                                            <div className="is-mode-desc">{m.desc}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Difficulty */}
                            <div style={{ marginBottom:20 }}>
                                <label className="is-label">Difficulty</label>
                                <div className="is-diff-row">
                                    {["Easy","Medium","Hard"].map(d => (
                                        <button key={d} className={`is-diff-btn ${d}${difficulty === d ? " active" : ""}`}
                                            onClick={() => setDifficulty(d)}>{d}</button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display:"flex", gap:10, justifyContent:"space-between" }}>
                                <button className="is-nav-btn" onClick={() => setStep(1)}>← Back</button>
                                <button className="is-nav-btn primary" onClick={() => setStep(3)} disabled={!experience}>
                                    Next: Resume →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3 — Resume + Launch */}
                    {step === 3 && (
                        <div className="is-card">
                            <div className="is-card-title"><Upload size={18} color="#a855f7"/>Upload Resume <span style={{ fontSize:11, color:"rgba(255,255,255,0.3)", fontWeight:400, marginLeft:4 }}>(optional but recommended)</span></div>

                            {!analysisDone ? (
                                <div className={`is-upload-zone${resumeFile ? " has-file" : ""}`}
                                    onClick={() => document.getElementById("resumeUpload").click()}>
                                    <div style={{ fontSize:36, marginBottom:10 }}>{resumeFile ? "📄" : "📎"}</div>
                                    <p style={{ fontSize:14, color:resumeFile ? "#c084fc" : "rgba(255,255,255,0.3)", marginBottom:6, fontWeight:600 }}>
                                        {resumeFile ? resumeFile.name : "Drop your PDF resume here"}
                                    </p>
                                    <p style={{ fontSize:11, color:"rgba(255,255,255,0.2)", fontFamily:"'JetBrains Mono',monospace" }}>
                                        PDF only · Max 5MB · AI extracts skills & projects
                                    </p>
                                    <input type="file" accept="application/pdf" id="resumeUpload" style={{ display:"none" }}
                                        onChange={e => setResumeFile(e.target.files[0])}/>
                                    {resumeFile && (
                                        <button onClick={e => { e.stopPropagation(); handleUploadResume(); }}
                                            style={{ marginTop:14, padding:"9px 20px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#a855f7,#6366f1)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Syne',sans-serif" }}
                                            disabled={analyzing}>
                                            {analyzing ? <><span className="is-spinner"/>Analyzing with AI...</> : "✨ Analyze Resume"}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div style={{ background:"rgba(34,197,94,0.05)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:14, padding:18, marginBottom:4 }}>
                                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                                        <CheckCircle2 size={16} color="#22c55e"/>
                                        <span style={{ fontSize:13, fontWeight:700, color:"#22c55e" }}>Resume analyzed successfully!</span>
                                    </div>
                                    {skills.length > 0 && (
                                        <div style={{ marginBottom:10 }}>
                                            <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px" }}>Skills detected</div>
                                            {skills.slice(0,8).map((s,i) => <span key={i} className="is-tag">{s}</span>)}
                                        </div>
                                    )}
                                    {projects.length > 0 && (
                                        <div>
                                            <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px" }}>Projects found</div>
                                            {projects.slice(0,4).map((p,i) => <span key={i} className="is-tag">🚀 {p}</span>)}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Summary */}
                            <div style={{ background:"rgba(168,85,247,0.06)", border:"1px solid rgba(168,85,247,0.15)", borderRadius:14, padding:16, margin:"20px 0" }}>
                                <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", marginBottom:10, textTransform:"uppercase" }}>Interview Summary</div>
                                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                                    {[
                                        { label:"Role",       value:role },
                                        { label:"Experience", value:experience },
                                        { label:"Mode",       value:mode },
                                    ].map(({ label, value }) => (
                                        <div key={label}>
                                            <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace" }}>{label}</div>
                                            <div style={{ fontSize:13, fontWeight:700, color:"#c084fc", marginTop:3 }}>{value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button className="is-start-btn" onClick={handleStart} disabled={loading || !canProceed}>
                                {loading
                                    ? <><span className="is-spinner"/>Generating questions...</>
                                    : "🚀 Start Interview Now"
                                }
                            </button>

                            <div style={{ display:"flex", justifyContent:"flex-start", marginTop:14 }}>
                                <button className="is-nav-btn" onClick={() => setStep(2)}>← Back</button>
                            </div>
                        </div>
                    )}

                    {/* Feature pills */}
                    <div style={{ display:"flex", flexWrap:"wrap", gap:10, justifyContent:"center", marginTop:40 }}>
                        {["🎙️ Voice recognition","🤖 AI interviewer","📊 Detailed scoring","⏱️ Timed questions","📄 PDF report"].map(f => (
                            <span key={f} style={{ padding:"6px 14px", borderRadius:20, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", fontSize:12, color:"rgba(255,255,255,0.4)", fontFamily:"'JetBrains Mono',monospace" }}>{f}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}