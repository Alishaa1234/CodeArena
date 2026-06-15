import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import axiosClient from "../utils/axiosClient";
import { Mic, MicOff, ArrowRight, BrainCircuit, Volume2, Clock, ChevronRight } from "lucide-react";
import { buildStyles, CircularProgressbar } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

export default function InterviewLive() {
    const navigate = useNavigate();
    const interviewData = JSON.parse(sessionStorage.getItem("interviewData") || "{}");
    const { interviewId, questions = [], userName = "Candidate" } = interviewData;

    const [isIntroPhase,  setIsIntroPhase]  = useState(true);
    const [isMicOn,       setIsMicOn]       = useState(true);
    const [isAIPlaying,   setIsAIPlaying]   = useState(false);
    const [currentIndex,  setCurrentIndex]  = useState(0);
    const [answer,        setAnswer]        = useState("");
    const [feedback,      setFeedback]      = useState("");
    const [timeLeft,      setTimeLeft]      = useState(questions[0]?.timeLimit || 60);
    const [selectedVoice, setSelectedVoice] = useState(null);
    const [isSubmitting,  setIsSubmitting]  = useState(false);
    const [followUp,      setFollowUp]      = useState(null);
    const [isFollowUp,    setIsFollowUp]    = useState(false);
    const [followUpAnswer,setFollowUpAnswer] = useState("");
    const [subtitle,      setSubtitle]      = useState("");
    const [waveActive,    setWaveActive]    = useState(false);
    const [wordCount,     setWordCount]     = useState(0);
    const [totalWords,    setTotalWords]    = useState(0);

    const recognitionRef = useRef(null);
    const timerRef       = useRef(null);
    const currentQuestion = questions[currentIndex];

    // ── Load voice ────────────────────────────────────────────────────────────
    useEffect(() => {
        const load = () => {
            const voices = window.speechSynthesis.getVoices();
            if (!voices.length) return;
            const voice =
                voices.find(v => v.name.toLowerCase().includes("samantha")) ||
                voices.find(v => v.name.toLowerCase().includes("zira"))     ||
                voices.find(v => v.name.toLowerCase().includes("female"))   ||
                voices[0];
            setSelectedVoice(voice);
        };
        load();
        window.speechSynthesis.onvoiceschanged = load;
    }, []);

    // ── Speech recognition ────────────────────────────────────────────────────
    useEffect(() => {
        if (!("webkitSpeechRecognition" in window)) return;
        const rec = new window.webkitSpeechRecognition();
        rec.lang = "en-US";
        rec.continuous = true;
        rec.interimResults = false;
        rec.onresult = (e) => {
            const t = e.results[e.results.length - 1][0].transcript;
            setAnswer(prev => {
                const updated = prev + " " + t;
                setWordCount(updated.trim().split(/\s+/).filter(Boolean).length);
                return updated;
            });
        };
        recognitionRef.current = rec;
    }, []);

    const startMic = () => { try { recognitionRef.current?.start(); } catch {} };
    const stopMic  = () => { recognitionRef.current?.stop(); };
    const toggleMic = () => { isMicOn ? stopMic() : startMic(); setIsMicOn(p => !p); };

    // ── Speak ─────────────────────────────────────────────────────────────────
    const speakText = (text) => new Promise((resolve) => {
        if (!window.speechSynthesis || !selectedVoice) { resolve(); return; }
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(
            text.replace(/,/g, ", ... ").replace(/\./g, ". ... ")
        );
        utt.voice  = selectedVoice;
        utt.rate   = 0.92;
        utt.pitch  = 1.05;
        utt.volume = 1;
        utt.onstart = () => { setIsAIPlaying(true); setWaveActive(true); stopMic(); setSubtitle(text); };
        utt.onend   = () => {
            setIsAIPlaying(false);
            setWaveActive(false);
            if (isMicOn) startMic();
            setTimeout(() => { setSubtitle(""); resolve(); }, 300);
        };
        window.speechSynthesis.speak(utt);
    });

    // ── Intro + question flow ─────────────────────────────────────────────────
    useEffect(() => {
        if (!selectedVoice) return;
        const run = async () => {
            if (isIntroPhase) {
                await speakText(`Welcome ${userName}! I'm your AI interviewer today. I'll ask you ${questions.length} questions. Answer clearly and naturally. Let's begin.`);
                setIsIntroPhase(false);
            } else if (currentQuestion) {
                await new Promise(r => setTimeout(r, 500));
                if (currentIndex === questions.length - 1)
                    await speakText("This is our final question.");
                await speakText(currentQuestion.question);
                if (isMicOn) startMic();
            }
        };
        run();
    }, [selectedVoice, isIntroPhase, currentIndex]);

    // ── Timer ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (isIntroPhase || !currentQuestion) return;
        setTimeLeft(currentQuestion.timeLimit || 60);
        setWordCount(0);
    }, [currentIndex, isIntroPhase]);

    useEffect(() => {
        if (isIntroPhase || !currentQuestion) return;
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setTimeLeft(p => {
            if (p <= 1) { clearInterval(timerRef.current); return 0; }
            return p - 1;
        }), 1000);
        return () => clearInterval(timerRef.current);
    }, [isIntroPhase, currentIndex]);

    useEffect(() => {
        if (!isIntroPhase && currentQuestion && timeLeft === 0 && !isSubmitting && !feedback)
            submitAnswer();
    }, [timeLeft]);

    // ── Cleanup ───────────────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            recognitionRef.current?.stop();
            window.speechSynthesis.cancel();
            clearInterval(timerRef.current);
        };
    }, []);

    // ── Submit ────────────────────────────────────────────────────────────────
    const submitAnswer = async () => {
        if (isSubmitting) return;
        stopMic();
        clearInterval(timerRef.current);
        setIsSubmitting(true);
        setTotalWords(wordCount);
        try {
            const timeTaken = (currentQuestion.timeLimit || 60) - timeLeft;
            const { data } = await axiosClient.post("/api/interview/submit-answer", {
                interviewId, questionIndex: currentIndex, answer, timeTaken,
            });
            setFeedback(data.feedback);
            await speakText(data.feedback);
            // If AI generated a follow-up, ask it after brief pause
            if (data.followUp && !isFollowUp) {
                await new Promise(r => setTimeout(r, 800));
                setFollowUp(data.followUp);
                setIsFollowUp(true);
                setFeedback(null);
                setFollowUpAnswer("");
                setAnswer("");
                setWordCount(0);
                await speakText("One quick follow-up: " + data.followUp);
                if (isMicOn) startMic();
            }
        } catch (err) { console.error(err); }
        finally { setIsSubmitting(false); }
    };

    const handleNext = async () => {
        setAnswer(""); setFeedback(""); setWordCount(0); setFollowUp(null); setIsFollowUp(false); setFollowUpAnswer("");
        if (currentIndex + 1 >= questions.length) { finishInterview(); return; }
        await speakText("Great. Moving to the next question.");
        setCurrentIndex(p => p + 1);
    };

    const finishInterview = async () => {
        stopMic();
        window.speechSynthesis.cancel();
        try {
            const { data } = await axiosClient.post("/api/interview/finish", { interviewId });
            sessionStorage.setItem("interviewReport", JSON.stringify(data));
            navigate("/interview/report");
        } catch (err) { console.error(err); navigate("/interview/history"); }
    };

    const pct = ((timeLeft / (currentQuestion?.timeLimit || 60)) * 100);
    const timerColor = timeLeft <= 10 ? "#ef4444" : timeLeft <= 20 ? "#f59e0b" : "#a855f7";
    const diffColor  = { easy:"#22c55e", medium:"#f59e0b", hard:"#ef4444" };

    return (
        <div style={{ minHeight:"100vh", background:"#0a0a0f", fontFamily:"'Syne',sans-serif", color:"#f0f0f0", display:"flex", flexDirection:"column" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@400;600;700;800&display=swap');
                *, *::before, *::after { box-sizing:border-box; }

                /* Waveform animation */
                .wave-bar { width:3px; border-radius:3px; background:linear-gradient(180deg,#a855f7,#6366f1); animation:wave 0.8s ease-in-out infinite; }
                @keyframes wave {
                    0%,100% { height:6px; opacity:0.4; }
                    50%      { height:28px; opacity:1; }
                }

                /* Pulse ring for mic */
                .mic-pulse { position:relative; }
                .mic-pulse::before { content:''; position:absolute; inset:-6px; border-radius:50%; border:2px solid #a855f7; animation:pulse-ring 1.5s ease-out infinite; }
                @keyframes pulse-ring { 0%{transform:scale(0.9);opacity:1} 100%{transform:scale(1.4);opacity:0} }

                /* Shimmer for loading */
                @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }

                .il-nav { height:56px; background:rgba(10,10,15,0.9); backdrop-filter:blur(20px); border-bottom:1px solid rgba(168,85,247,0.15); display:flex; align-items:center; padding:0 20px; gap:10px; position:sticky; top:0; z-index:100; }
                .il-body { flex:1; display:grid; grid-template-columns:300px 1fr; overflow:hidden; height:calc(100vh - 56px); }
                @media (max-width:768px) { .il-body { grid-template-columns:1fr; grid-template-rows:auto 1fr; } }
                .il-sidebar { border-right:1px solid rgba(255,255,255,0.06); background:rgba(255,255,255,0.02); display:flex; flex-direction:column; padding:20px; gap:14px; overflow-y:auto; }
                .il-main { display:flex; flex-direction:column; padding:24px; gap:16px; overflow-y:auto; }

                .il-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:16px; padding:18px; }

                .il-textarea { flex:1; min-height:180px; width:100%; padding:18px; border-radius:16px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); color:#f0f0f0; font-size:14px; font-family:'JetBrains Mono',monospace; resize:none; outline:none; transition:all 0.2s; line-height:1.8; }
                .il-textarea:focus { border-color:#a855f7; background:rgba(168,85,247,0.04); box-shadow:0 0 0 3px rgba(168,85,247,0.08); }
                .il-textarea::placeholder { color:rgba(255,255,255,0.15); }

                .il-submit-btn { flex:1; padding:14px; border-radius:14px; border:none; background:linear-gradient(135deg,#a855f7,#6366f1); color:#fff; font-size:14px; font-weight:800; font-family:'Syne',sans-serif; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:8px; }
                .il-submit-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 24px rgba(168,85,247,0.4); }
                .il-submit-btn:disabled { opacity:0.35; cursor:not-allowed; transform:none; }

                .il-mic-btn { width:48px; height:48px; border-radius:50%; border:none; background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.5); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.15s; border:1px solid rgba(255,255,255,0.1); flex-shrink:0; }
                .il-mic-btn.on { background:rgba(168,85,247,0.15); border-color:#a855f7; color:#a855f7; }

                .il-next-btn { width:100%; padding:14px; border-radius:14px; border:none; background:linear-gradient(135deg,#a855f7,#6366f1); color:#fff; font-size:14px; font-weight:800; font-family:'Syne',sans-serif; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all 0.2s; }
                .il-next-btn:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(168,85,247,0.35); }

                .progress-dot { width:8px; height:8px; border-radius:50%; transition:all 0.3s; }

                .il-spinner { width:14px; height:14px; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:spin 0.7s linear infinite; }
                @keyframes spin { to { transform:rotate(360deg); } }
            `}</style>

            {/* Nav */}
            <nav className="il-nav">
                <BrainCircuit size={18} color="#a855f7"/>
                <span style={{ fontSize:14, fontWeight:800, color:"#fff" }}>AI Mock Interview</span>
                <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:16 }}>
                    {/* Question dots */}
                    <div style={{ display:"flex", gap:6 }}>
                        {questions.map((_, i) => (
                            <div key={i} className="progress-dot" style={{
                                background: i < currentIndex ? "#22c55e" : i === currentIndex ? "#a855f7" : "rgba(255,255,255,0.1)",
                                boxShadow: i === currentIndex ? "0 0 8px #a855f7" : "none",
                            }}/>
                        ))}
                    </div>
                    <span style={{ fontSize:12, color:"rgba(255,255,255,0.4)", fontFamily:"'JetBrains Mono',monospace" }}>
                        {currentIndex + 1}/{questions.length}
                    </span>
                    {isAIPlaying && (
                        <span style={{ fontSize:11, color:"#a855f7", fontFamily:"'JetBrains Mono',monospace", display:"flex", alignItems:"center", gap:5 }}>
                            <Volume2 size={12}/> Speaking
                        </span>
                    )}
                </div>
            </nav>

            <div className="il-body">

                {/* Sidebar */}
                <div className="il-sidebar">

                    {/* AI Avatar + waveform */}
                    <div className="il-card" style={{ textAlign:"center", borderColor: isAIPlaying ? "rgba(168,85,247,0.4)" : "rgba(255,255,255,0.07)", transition:"border-color 0.3s" }}>
                        <div style={{ width:72, height:72, borderRadius:"50%", background:"linear-gradient(135deg,rgba(168,85,247,0.3),rgba(99,102,241,0.3))", border:`2px solid ${isAIPlaying ? "#a855f7" : "rgba(168,85,247,0.2)"}`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px", transition:"all 0.3s", boxShadow: isAIPlaying ? "0 0 24px rgba(168,85,247,0.4)" : "none" }}>
                            <BrainCircuit size={32} color={isAIPlaying ? "#e9d5ff" : "#a855f7"}/>
                        </div>

                        {/* Waveform */}
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:3, height:32, marginBottom:8 }}>
                            {Array.from({ length: 9 }).map((_, i) => (
                                <div key={i} className="wave-bar" style={{
                                    animationDelay: `${i * 0.08}s`,
                                    animationPlayState: isAIPlaying ? "running" : "paused",
                                    height: isAIPlaying ? undefined : "4px",
                                    opacity: isAIPlaying ? undefined : 0.2,
                                }}/>
                            ))}
                        </div>

                        <div style={{ fontSize:12, color: isAIPlaying ? "#c084fc" : "rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", transition:"color 0.3s" }}>
                            {isAIPlaying ? "● AI Speaking" : isIntroPhase ? "Preparing..." : "Listening..."}
                        </div>
                    </div>

                    {/* Timer */}
                    <div className="il-card" style={{ textAlign:"center" }}>
                        <div style={{ width:80, height:80, margin:"0 auto 10px" }}>
                            <CircularProgressbar value={pct} text={`${timeLeft}s`}
                                styles={buildStyles({
                                    textSize: "22px",
                                    pathColor: timerColor,
                                    textColor: timerColor,
                                    trailColor: "rgba(255,255,255,0.06)",
                                })}
                            />
                        </div>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace" }}>
                            {timeLeft <= 10 ? "⚠️ Time running out!" : "Time remaining"}
                        </div>
                    </div>

                    {/* Subtitle */}
                    {subtitle && (
                        <div className="il-card" style={{ borderColor:"rgba(168,85,247,0.2)", background:"rgba(168,85,247,0.04)" }}>
                            <div style={{ fontSize:10, color:"#a855f7", fontFamily:"'JetBrains Mono',monospace", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px" }}>AI is saying</div>
                            <p style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.7, margin:0 }}>{subtitle}</p>
                        </div>
                    )}

                    {/* Word count */}
                    {!isIntroPhase && !feedback && (
                        <div className="il-card">
                            <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", marginBottom:8, textTransform:"uppercase" }}>Answer stats</div>
                            <div style={{ display:"flex", justifyContent:"space-between" }}>
                                <div style={{ textAlign:"center" }}>
                                    <div style={{ fontSize:20, fontWeight:800, color:"#a855f7", fontFamily:"'Syne',sans-serif" }}>{wordCount}</div>
                                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace" }}>words</div>
                                </div>
                                <div style={{ textAlign:"center" }}>
                                    <div style={{ fontSize:20, fontWeight:800, color: isMicOn ? "#22c55e" : "rgba(255,255,255,0.3)", fontFamily:"'Syne',sans-serif" }}>
                                        {isMicOn ? "ON" : "OFF"}
                                    </div>
                                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace" }}>mic</div>
                                </div>
                                <div style={{ textAlign:"center" }}>
                                    <div style={{ fontSize:20, fontWeight:800, color: currentQuestion?.difficulty ? diffColor[currentQuestion.difficulty.toLowerCase()] || "#a855f7" : "#a855f7", fontFamily:"'Syne',sans-serif" }}>
                                        {currentQuestion?.difficulty?.[0] || "M"}
                                    </div>
                                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace" }}>level</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Main */}
                <div className="il-main">

                    {/* Intro screen */}
                    {isIntroPhase && (
                        <div className="il-card" style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16, textAlign:"center", borderColor:"rgba(168,85,247,0.2)", background:"rgba(168,85,247,0.03)" }}>
                            <div style={{ fontSize:48 }}>🎙️</div>
                            <h2 style={{ fontSize:22, fontWeight:800, color:"#fff", margin:0 }}>Your interviewer is ready</h2>
                            <p style={{ fontSize:14, color:"rgba(255,255,255,0.4)", maxWidth:360, lineHeight:1.7, margin:0, fontFamily:"'JetBrains Mono',monospace" }}>
                                Listen carefully to the introduction and get ready for your first question.
                            </p>
                            <div style={{ display:"flex", gap:8, marginTop:8 }}>
                                {Array.from({length:3}).map((_,i) => (
                                    <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:"#a855f7", animation:`wave ${0.6+i*0.2}s ease-in-out infinite`, animationDelay:`${i*0.15}s` }}/>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Question card */}
                    {!isIntroPhase && currentQuestion && (
                        <div className="il-card" style={{ borderColor:"rgba(168,85,247,0.25)", background:"rgba(168,85,247,0.04)" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                                <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", textTransform:"uppercase", letterSpacing:"0.5px" }}>
                                    Question {currentIndex + 1} of {questions.length}
                                </span>
                                <span style={{ padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:700, fontFamily:"'JetBrains Mono',monospace",
                                    color: diffColor[currentQuestion.difficulty?.toLowerCase()] || "#a855f7",
                                    background: `${diffColor[currentQuestion.difficulty?.toLowerCase()] || "#a855f7"}18`,
                                    border: `1px solid ${diffColor[currentQuestion.difficulty?.toLowerCase()] || "#a855f7"}40`,
                                }}>
                                    {currentQuestion.difficulty}
                                </span>
                                <span style={{ marginLeft:"auto", fontSize:10, color:"rgba(255,255,255,0.2)", fontFamily:"'JetBrains Mono',monospace" }}>
                                    {currentQuestion.timeLimit}s limit
                                </span>
                            </div>
                            <p style={{ fontSize:16, fontWeight:700, color:"#fff", margin:0, lineHeight:1.65 }}>
                                {followUp || currentQuestion.question}
                            </p>
                            {followUp && (
                                <div style={{ marginTop:8, fontSize:11, color:"#a855f7", fontFamily:"'JetBrains Mono',monospace", display:"flex", alignItems:"center", gap:6 }}>
                                    ↳ Follow-up question
                                </div>
                            )}
                        </div>
                    )}

                    {/* Answer area */}
                    {!isIntroPhase && (
                        <textarea className="il-textarea"
                            placeholder={feedback ? "" : "Type your answer here, or speak using the microphone..."}
                            value={answer}
                            onChange={e => { setAnswer(e.target.value); setWordCount(e.target.value.trim().split(/\s+/).filter(Boolean).length); }}
                            disabled={!!feedback || isIntroPhase}
                        />
                    )}

                    {/* Actions */}
                    {!isIntroPhase && !feedback && (
                        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                            <button className={`il-mic-btn${isMicOn ? " on" : ""}${isMicOn && !isAIPlaying ? " mic-pulse" : ""}`}
                                onClick={toggleMic} disabled={isAIPlaying}>
                                {isMicOn ? <Mic size={18}/> : <MicOff size={18}/>}
                            </button>
                            <button className="il-submit-btn" onClick={submitAnswer} disabled={isSubmitting || isAIPlaying}>
                                {isSubmitting
                                    ? <><span className="il-spinner"/>Evaluating answer...</>
                                    : "Submit Answer"
                                }
                            </button>
                        </div>
                    )}

                    {/* Feedback */}
                    {feedback && (
                        <div style={{ background:"rgba(168,85,247,0.06)", border:"1px solid rgba(168,85,247,0.25)", borderRadius:16, padding:20 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                                <div style={{ width:8, height:8, borderRadius:"50%", background:"#a855f7" }}/>
                                <span style={{ fontSize:11, color:"#a855f7", fontFamily:"'JetBrains Mono',monospace", textTransform:"uppercase", letterSpacing:"0.5px" }}>AI Feedback</span>
                                {totalWords > 0 && (
                                    <span style={{ marginLeft:"auto", fontSize:11, color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace" }}>
                                        {totalWords} words answered
                                    </span>
                                )}
                            </div>
                            <p style={{ fontSize:14, color:"rgba(255,255,255,0.75)", lineHeight:1.8, marginBottom:16 }}>{feedback}</p>
                            <button className="il-next-btn" onClick={handleNext}>
                                {currentIndex + 1 >= questions.length
                                    ? "🏁 Finish Interview & See Report"
                                    : <>Next Question <ArrowRight size={15}/></>
                                }
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}