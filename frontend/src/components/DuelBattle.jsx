import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import Editor from "@monaco-editor/react";
import axiosClient from "../utils/axiosClient";
import ThemeToggle from "./ThemeToggle";
import {
    setActiveProblemIndex,
    problemSolved,
    clearTaunt,
} from "../store/duelSlice";
import {
    Play, Terminal, CheckCircle2, XCircle,
    Clock, Zap, Lock, FileText, ChevronLeft, ChevronRight,
} from "lucide-react";

const LANG_LABELS = { javascript: "JavaScript", java: "Java", cpp: "C++" };
const LANG_MAP    = { cpp: "c++", java: "java", javascript: "javascript" };
const TAUNTS      = ["👀", "😈", "🔥", "💀", "⚡", "🤡", "😎", "🫡"];
const DIFF = {
    easy:   { color: "#00b8a3", bg: "rgba(0,184,163,0.1)"  },
    medium: { color: "#ffc01e", bg: "rgba(255,192,30,0.1)" },
    hard:   { color: "#ff375f", bg: "rgba(255,55,95,0.1)"  },
};

// ── Countdown ─────────────────────────────────────────────────────────────────
function useCountdown(totalSeconds, onExpire) {
    const [seconds, setSeconds] = useState(totalSeconds);
    const firedRef = useRef(false);
    useEffect(() => {
        if (totalSeconds <= 0) return;
        const id = setInterval(() => {
            setSeconds((s) => {
                if (s <= 1) {
                    clearInterval(id);
                    if (!firedRef.current) { firedRef.current = true; onExpire(); }
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(id);
    }, [totalSeconds]);
    const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
    const ss = String(seconds % 60).padStart(2, "0");
    return { display: `${mm}:${ss}`, urgent: seconds <= 30 };
}

// ── Format value ──────────────────────────────────────────────────────────────
function formatValue(raw = "") {
    const s = raw.trim();
    if (/^-?\d+(\s+-?\d+)+$/.test(s)) return "[" + s.split(/\s+/).join(", ") + "]";
    if (s.startsWith("[") || s.startsWith("{")) return s;
    if (s.startsWith('"') || s.startsWith("'")) return s;
    return s;
}

// ── Example card ──────────────────────────────────────────────────────────────
function ExampleCard({ example, index, paramNames, isDark }) {
    const lines  = (example.input || "").split("\n").map(l => l.trim()).filter(Boolean);
    const params = Array.isArray(paramNames) ? paramNames : [];
    const bg     = isDark ? "#282828" : "#f7f8fa";
    const border = isDark ? "#3a3a3a" : "#e5e7eb";
    const muted  = isDark ? "#8d8d8d" : "#888";
    const ink    = isDark ? "#eff1f6" : "#111";
    return (
        <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, marginBottom: 10, overflow: "hidden", fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>
            <div style={{ padding: "6px 14px", borderBottom: `1px solid ${border}` }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Example {index + 1}</span>
            </div>
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${border}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Input</div>
                {lines.length === 0
                    ? <span style={{ color: muted }}>—</span>
                    : lines.length > params.length
                        ? <pre style={{ color: ink, fontSize: 12, lineHeight: 1.7, margin: 0 }}>{lines.join("\n")}</pre>
                        : <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                            {lines.map((line, li) => (
                                <span key={li} style={{ display: "inline-flex", alignItems: "baseline", gap: 5 }}>
                                    <span style={{ color: "#ffa116", fontWeight: 600 }}>{params[li] || `param${li + 1}`}</span>
                                    <span style={{ color: muted }}>=</span>
                                    <span style={{ color: ink }}>{formatValue(line)}</span>
                                    {li < lines.length - 1 && <span style={{ color: muted }}>,</span>}
                                </span>
                            ))}
                          </div>
                }
            </div>
            <div style={{ padding: "10px 14px", borderBottom: example.explanation ? `1px solid ${border}` : "none" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Output</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ color: "#00b8a3", fontWeight: 600 }}>result</span>
                    <span style={{ color: muted }}>=</span>
                    <span style={{ color: ink }}>{formatValue(example.output || "")}</span>
                </div>
            </div>
            {example.explanation && (
                <div style={{ padding: "8px 14px", background: isDark ? "rgba(255,161,22,0.04)" : "rgba(255,161,22,0.03)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Explanation</div>
                    <div style={{ fontSize: 12, color: isDark ? "#c9ccd3" : "#555", lineHeight: 1.7, fontFamily: "'Syne',sans-serif" }}>{example.explanation}</div>
                </div>
            )}
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DuelBattle({ socket }) {
    const dispatch = useDispatch();

    // Theme — same pattern as ProblemPage
    const [isDark, setIsDark] = useState(!document.documentElement.classList.contains("light"));
    useEffect(() => {
        const observer = new MutationObserver(() =>
            setIsDark(!document.documentElement.classList.contains("light"))
        );
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => observer.disconnect();
    }, []);

    const {
        roomCode, problems, timeLimitSeconds, totalPoints,
        activeProblemIndex, opponent,
        myPoints, mySolved, oppPoints, oppSolved, oppProgress,
        lastTaunt,
    } = useSelector((s) => s.duel);
    const { user } = useSelector((s) => s.auth);

    const [lang,           setLang]           = useState("javascript");
    const [codeMap,        setCodeMap]        = useState({});
    const [problemDataMap, setProblemDataMap] = useState({});
    const [loading,        setLoading]        = useState(false);
    const [runResult,      setRunResult]      = useState(null);
    const [consoleOpen,    setConsoleOpen]    = useState(false);
    const [consoleTab,     setConsoleTab]     = useState("testcase");
    const [tauntToast,     setTauntToast]     = useState(null);
    const [showDesc,       setShowDesc]       = useState(true);
    const editorRef = useRef(null);

    const activeProblem     = problems[activeProblemIndex] || problems[0];
    const activeCode        = codeMap[activeProblem?.problemId] || "";
    const iSolvedActive     = mySolved.includes(activeProblem?.problemId);
    const activeProblemData = problemDataMap[activeProblem?.problemId] || null;
    const paramNames        = Array.isArray(activeProblemData?.paramNames) ? activeProblemData.paramNames : [];
    const ds                = DIFF[activeProblem?.difficulty] || DIFF.easy;

    // Timeout
    const timeoutFired = useRef(false);
    const handleTimeout = React.useCallback(() => {
        if (timeoutFired.current) return;
        timeoutFired.current = true;
        socket?.emit("duel:timeout", { roomCode });
    }, [socket, roomCode]);
    const { display: timerDisplay, urgent: timerUrgent } = useCountdown(timeLimitSeconds || 300, handleTimeout);

    // Fetch problem
    useEffect(() => {
        if (!activeProblem?.problemId) return;
        const pid = activeProblem.problemId;
        axiosClient.get(`/problem/problemById/${pid}`)
            .then(({ data }) => {
                setProblemDataMap((prev) => ({ ...prev, [pid]: data }));
                const starter = data.startCode?.find((s) => s.language === LANG_MAP[lang])?.initialCode || "";
                setCodeMap((prev) => ({ ...prev, [pid]: prev[pid] || starter }));
            })
            .catch(console.error);
    }, [activeProblem?.problemId]);

    // Lang change → reload starter
    useEffect(() => {
        if (!activeProblem?.problemId) return;
        const pid  = activeProblem.problemId;
        const data = problemDataMap[pid];
        if (!data) return;
        const starter = data.startCode?.find((s) => s.language === LANG_MAP[lang])?.initialCode || "";
        setCodeMap((prev) => ({ ...prev, [pid]: starter }));
    }, [lang]);

    // Taunt toast
    useEffect(() => {
        if (!lastTaunt) return;
        setTauntToast(lastTaunt);
        const id = setTimeout(() => { setTauntToast(null); dispatch(clearTaunt()); }, 3000);
        return () => clearTimeout(id);
    }, [lastTaunt, dispatch]);

    const myId         = user?._id?.toString();
    const iAmHost      = opponent?.host?.userId === myId;
    const opponentSide = iAmHost ? opponent?.guest : opponent?.host;
    const opponentName = opponentSide?.username ?? "Opponent";
    const myPct        = totalPoints > 0 ? Math.round((myPoints  / totalPoints) * 100) : 0;
    const oppPct       = totalPoints > 0 ? Math.round((oppPoints / totalPoints) * 100) : 0;

    // Run
    const handleRun = async () => {
        if (!activeProblem) return;
        setLoading(true); setRunResult(null); setConsoleOpen(true); setConsoleTab("testcase");
        const pid = activeProblem.problemId;
        try {
            const { data } = await axiosClient.post(`/submission/run/${pid}`, { code: activeCode, language: lang });
            setRunResult(data);
            const passed = data.testCases?.filter((tc) => tc.status_id === 3).length ?? 0;
            socket?.emit("duel:update-status", { roomCode, problemId: pid, testsPassed: passed, totalTests: data.testCases?.length ?? 0 });
        } catch (e) {
            setRunResult({ success: false, testCases: [], error: e.displayMessage });
        } finally { setLoading(false); }
    };

    // Submit
    const handleSubmit = async () => {
        if (!activeProblem || iSolvedActive) return;
        setLoading(true); setConsoleOpen(true); setConsoleTab("result");
        const pid = activeProblem.problemId;
        try {
            const { data } = await axiosClient.post(`/submission/submit/${pid}`, { code: activeCode, language: lang });
            setRunResult(data);
            if (data.accepted) {
                socket?.emit("duel:submit", { roomCode, problemId: pid, language: lang, code: activeCode });
                dispatch(problemSolved({ isMe: true, userId: myId, problemId: pid, points: activeProblem.points, totalPoints: myPoints + activeProblem.points }));
            } else {
                socket?.emit("duel:update-status", { roomCode, problemId: pid, testsPassed: data.passedTestCases ?? 0, totalTests: data.totalTestCases ?? 0 });
            }
        } catch (e) {
            setRunResult({ accepted: false, error: e.displayMessage });
        } finally { setLoading(false); }
    };

    const handleTaunt = (emoji) => socket?.emit("duel:taunt", { roomCode, emoji });

    // Test case helpers
    const isTC = (tc) => {
        const sid = tc?.status_id ?? tc?.statusId;
        if (typeof tc?.passed   === "boolean") return tc.passed;
        if (typeof tc?.accepted === "boolean") return tc.accepted;
        if (sid != null) return sid === 3 || sid === "3";
        return ["passed","accepted","ac"].includes((tc?.status ?? "").toLowerCase());
    };
    const getF = (tc, f, fb = []) => {
        const v = [f, ...fb].map(k => tc?.[k]).filter(v => v != null && v !== "");
        return v.length ? v[0] : "—";
    };
    const testCases     = runResult?.testCases || runResult?.testcases || [];
    const tcPassed      = testCases.filter(isTC).length;
    const tcTotal       = testCases.length;
    const overallPassed = typeof runResult?.success === "boolean" ? runResult.success : tcTotal > 0 && testCases.every(isTC);

    // Colors — matching ProblemPage exactly
    const bg     = isDark ? "#1a1a1a" : "#ffffff";
    const bg2    = isDark ? "#282828" : "#f7f8fa";
    const border = isDark ? "#3a3a3a" : "#e5e7eb";
    const muted  = isDark ? "#8d8d8d" : "#6b7280";
    const ink    = isDark ? "#eff1f6" : "#1a1a1a";

    const CONSOLE_HEIGHT = 260;

    return (
        <div style={{ height: "100vh", overflow: "hidden", fontFamily: "'Syne',sans-serif", background: bg, color: ink, display: "flex", flexDirection: "column" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@400;600;700;800&display=swap');
                * { box-sizing:border-box; margin:0; padding:0; }
                ::-webkit-scrollbar { width:6px; height:6px; }
                ::-webkit-scrollbar-track { background:transparent; }
                ::-webkit-scrollbar-thumb { background:${isDark ? "#3a3a3a" : "#d4d4d4"}; border-radius:3px; }

                .db-topbar { height:46px; background:${bg2}; border-bottom:1px solid ${border}; display:flex; align-items:center; padding:0 16px; gap:10px; flex-shrink:0; }
                .db-body { flex:1; display:flex; overflow:hidden; min-height:0; }

                .db-sidebar { width:240px; border-right:1px solid ${border}; display:flex; flex-direction:column; overflow-y:auto; background:${bg2}; flex-shrink:0; }
                .db-section { padding:12px 14px; border-bottom:1px solid ${border}; }
                .db-section-title { font-size:10px; font-weight:700; color:${muted}; font-family:'JetBrains Mono',monospace; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:8px; }
                .db-prob-btn { width:100%; background:none; border:1px solid ${border}; border-radius:8px; padding:8px 10px; margin-bottom:5px; cursor:pointer; text-align:left; transition:all 0.15s; display:flex; align-items:center; gap:8px; }
                .db-prob-btn:hover { border-color:#ffa116; background:rgba(255,161,22,0.05); }
                .db-prob-btn.active { border-color:#ffa116; background:rgba(255,161,22,0.08); }
                .db-prob-btn.solved { border-color:rgba(0,184,163,0.4); background:rgba(0,184,163,0.05); }
                .db-score-bar { height:6px; background:${isDark ? "#333" : "#eee"}; border-radius:3px; overflow:hidden; margin:4px 0; }
                .db-score-fill { height:100%; border-radius:3px; transition:width 0.5s; }
                .db-taunt-btn { background:none; border:1px solid ${border}; border-radius:7px; padding:5px 8px; cursor:pointer; font-size:16px; transition:all 0.15s; line-height:1; }
                .db-taunt-btn:hover { border-color:#ffa116; background:rgba(255,161,22,0.08); transform:scale(1.15); }
                .db-prog-bar { height:3px; background:${isDark ? "#333" : "#eee"}; border-radius:2px; overflow:hidden; margin-top:4px; }
                .db-prog-fill { height:100%; border-radius:2px; background:#378ADD; transition:width 0.3s; }

                .db-desc-panel { width:400px; border-right:1px solid ${border}; display:flex; flex-direction:column; background:${bg}; flex-shrink:0; overflow:hidden; }
                .db-desc-header { height:40px; background:${bg2}; border-bottom:1px solid ${border}; display:flex; align-items:center; padding:0 14px; gap:8px; flex-shrink:0; }
                .db-desc-body { flex:1; overflow-y:auto; padding:20px; min-height:0; }

                .db-right { flex:1; display:flex; flex-direction:column; min-width:0; overflow:hidden; background:${isDark ? "#1e1e1e" : "#fafafa"}; }
                .db-langbar { height:40px; background:${bg2}; border-bottom:1px solid ${border}; display:flex; align-items:center; padding:0 12px; gap:6px; flex-shrink:0; }
                .db-lang-btn { padding:4px 12px; border-radius:6px; font-size:12px; font-weight:700; background:none; border:1px solid ${border}; color:${muted}; cursor:pointer; font-family:'JetBrains Mono',monospace; transition:all 0.15s; }
                .db-lang-btn:hover { border-color:#ffa116; color:#ffa116; }
                .db-lang-btn.active { background:rgba(255,161,22,0.1); border-color:#ffa116; color:#ffa116; }

                .db-console { border-top:1px solid ${border}; background:${bg}; display:flex; flex-direction:column; flex-shrink:0; }
                .db-console-tabs { height:36px; display:flex; align-items:center; padding:0 8px; border-bottom:1px solid ${border}; flex-shrink:0; }
                .db-console-tab { height:36px; padding:0 12px; display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:700; color:${muted}; background:none; border:none; border-bottom:2px solid transparent; cursor:pointer; white-space:nowrap; transition:all 0.15s; }
                .db-console-tab.active { color:#ffa116; border-bottom-color:#ffa116; }
                .db-console-body { flex:1; overflow-y:auto; padding:12px 16px; min-height:0; }

                .db-actionbar { height:44px; background:${bg2}; border-top:1px solid ${border}; display:flex; align-items:center; justify-content:space-between; padding:0 14px; flex-shrink:0; }
                .db-btn { display:inline-flex; align-items:center; gap:7px; padding:7px 16px; border-radius:8px; font-size:13px; font-weight:700; font-family:'Syne',sans-serif; cursor:pointer; transition:all 0.15s; border:1px solid ${border}; background:none; color:${isDark ? "#c9ccd3" : "#444"}; }
                .db-btn:hover:not(:disabled) { border-color:${isDark ? "#555" : "#bbb"}; color:${ink}; }
                .db-btn:disabled { opacity:0.4; cursor:not-allowed; }
                .db-btn-submit { background:#ffa116; border-color:#ffa116; color:#000; }
                .db-btn-submit:hover:not(:disabled) { background:#ffb84d; border-color:#ffb84d; color:#000; }
                .db-btn-accepted { background:#00b8a3; border-color:#00b8a3; color:#000; }
                .db-console-toggle { display:inline-flex; align-items:center; gap:7px; padding:7px 14px; border-radius:8px; font-size:13px; font-weight:700; border:1px solid ${border}; background:none; cursor:pointer; color:${muted}; transition:all 0.15s; }
                .db-console-toggle:hover { color:${ink}; border-color:${isDark ? "#555" : "#bbb"}; }
                .db-icon-btn { background:none; border:none; cursor:pointer; color:${muted}; display:inline-flex; align-items:center; gap:4px; font-size:12px; font-weight:700; font-family:'JetBrains Mono',monospace; padding:4px 8px; border-radius:6px; transition:all 0.15s; }
                .db-icon-btn:hover { color:${ink}; background:${isDark ? "#333" : "#e5e7eb"}; }
                .db-tc-card { background:${bg2}; border:1px solid ${border}; border-radius:10px; margin-bottom:8px; overflow:hidden; font-family:'JetBrains Mono',monospace; font-size:12px; }
                .db-kv { background:${bg2}; border:1px solid ${border}; border-radius:10px; padding:10px 14px; min-width:110px; font-family:'JetBrains Mono',monospace; }
                .db-spinner { width:14px; height:14px; border:2px solid rgba(255,161,22,0.2); border-top-color:#ffa116; border-radius:50%; animation:db-spin 0.7s linear infinite; flex-shrink:0; }
                .db-taunt-toast { position:fixed; top:60px; left:50%; transform:translateX(-50%); background:${bg2}; border:1px solid ${border}; border-radius:12px; padding:10px 20px; font-size:20px; z-index:999; display:flex; align-items:center; gap:10px; animation:db-toast-in 0.25s ease; }
                @keyframes db-spin { to { transform:rotate(360deg); } }
                @keyframes db-toast-in { from{opacity:0;transform:translateX(-50%) translateY(-8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
            `}</style>

            {/* Taunt toast */}
            {tauntToast && (
                <div className="db-taunt-toast">
                    <span style={{ fontSize: 12, color: muted, fontFamily: "'JetBrains Mono',monospace" }}>{tauntToast.from}:</span>
                    <span>{tauntToast.emoji}</span>
                </div>
            )}

            {/* ── Top bar ── */}
            <div className="db-topbar">
                <span style={{ fontSize: 14, fontWeight: 700, color: ink, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {activeProblem?.title || "Duel"}
                </span>
                {activeProblem?.difficulty && (
                    <span style={{ padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: ds.color, background: ds.bg }}>
                        {activeProblem.difficulty}
                    </span>
                )}
                <span style={{ padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "#00b8a3", background: "rgba(0,184,163,0.1)" }}>● Live</span>
                <div style={{ flex: 1 }} />
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, background: bg2, border: `1px solid ${border}`, borderRadius: 8, padding: "4px 12px" }}>
                    <span style={{ color: "#00b8a3", fontWeight: 700 }}>{myPoints}</span>
                    <span style={{ color: muted }}>vs</span>
                    <span style={{ color: "#ff375f", fontWeight: 700 }}>{oppPoints}</span>
                    <span style={{ color: muted }}>/ {totalPoints} pts</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: timerUrgent ? 700 : 400, color: timerUrgent ? "#ff375f" : muted, background: timerUrgent ? "rgba(255,55,95,0.1)" : "none", padding: "3px 8px", borderRadius: 6, flexShrink: 0 }}>
                    <Clock size={13} />{timerDisplay}
                </div>
                <ThemeToggle />
            </div>

            {/* ── Body ── */}
            <div className="db-body">

                {/* ── Sidebar ── */}
                <div className="db-sidebar">
                    <div className="db-section">
                        <div className="db-section-title">Problems</div>
                        {problems.map((prob, idx) => {
                            const iSolved     = mySolved.includes(prob.problemId);
                            const oppSolvedIt = oppSolved.includes(prob.problemId);
                            const oppProg     = oppProgress[prob.problemId];
                            const dc          = DIFF[prob.difficulty] || DIFF.easy;
                            return (
                                <button key={prob.problemId}
                                    className={`db-prob-btn${activeProblemIndex === idx ? " active" : ""}${iSolved ? " solved" : ""}`}
                                    onClick={() => { dispatch(setActiveProblemIndex(idx)); setRunResult(null); setConsoleOpen(false); }}
                                >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                                            <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: muted }}>Q{idx + 1}</span>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: iSolved ? "#00b8a3" : ink, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prob.title}</span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center" }}>
                                            <span style={{ fontSize: 10, color: dc.color, fontFamily: "'JetBrains Mono',monospace" }}>{prob.difficulty}</span>
                                            <span style={{ fontSize: 10, fontWeight: 700, color: "#ffa116", fontFamily: "'JetBrains Mono',monospace", marginLeft: "auto" }}>+{prob.points}pts</span>
                                        </div>
                                        {oppProg && !oppSolvedIt && (
                                            <div className="db-prog-bar">
                                                <div className="db-prog-fill" style={{ width: oppProg.totalTests > 0 ? `${Math.round((oppProg.testsPassed / oppProg.totalTests) * 100)}%` : "0%" }} />
                                            </div>
                                        )}
                                    </div>
                                    {iSolved      && <CheckCircle2 size={13} color="#00b8a3" style={{ flexShrink: 0 }} />}
                                    {oppSolvedIt && !iSolved && <Lock size={12} color="#ff375f" style={{ flexShrink: 0 }} />}
                                </button>
                            );
                        })}
                    </div>

                    <div className="db-section">
                        <div className="db-section-title">Score</div>
                        <div style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                                <span style={{ color: ink, fontWeight: 600 }}>{user?.firstName || "You"}</span>
                                <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#00b8a3", fontWeight: 700 }}>{myPoints} pts</span>
                            </div>
                            <div className="db-score-bar"><div className="db-score-fill" style={{ width: `${myPct}%`, background: "#00b8a3" }} /></div>
                        </div>
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                                <span style={{ color: ink, fontWeight: 600 }}>{opponentName}</span>
                                <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#ff375f", fontWeight: 700 }}>{oppPoints} pts</span>
                            </div>
                            <div className="db-score-bar"><div className="db-score-fill" style={{ width: `${oppPct}%`, background: "#ff375f" }} /></div>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 11, color: muted, fontFamily: "'JetBrains Mono',monospace", textAlign: "right" }}>Max: {totalPoints} pts</div>
                    </div>

                    <div className="db-section">
                        <div className="db-section-title">Taunts</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                            {TAUNTS.map((emoji) => (
                                <button key={emoji} className="db-taunt-btn" onClick={() => handleTaunt(emoji)}>{emoji}</button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Description panel ── */}
                {showDesc && (
                    <div className="db-desc-panel">
                        <div className="db-desc-header">
                            <FileText size={13} color="#ffa116" />
                            <span style={{ fontSize: 12, fontWeight: 700, color: ink, fontFamily: "'JetBrains Mono',monospace", flex: 1 }}>Description</span>
                            <button className="db-icon-btn" onClick={() => setShowDesc(false)}>
                                <ChevronLeft size={13} />Hide
                            </button>
                        </div>
                        <div className="db-desc-body">
                            {!activeProblemData
                                ? <div style={{ color: muted, fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>Loading...</div>
                                : <>
                                    <div style={{ fontSize: 17, fontWeight: 800, color: ink, marginBottom: 10, lineHeight: 1.3 }}>{activeProblemData.title}</div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                                        <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: ds.color, background: ds.bg, fontFamily: "'JetBrains Mono',monospace" }}>{activeProblemData.difficulty}</span>
                                        {activeProblemData.points != null && (
                                            <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: "#ffa116", background: "rgba(255,161,22,0.12)", fontFamily: "'JetBrains Mono',monospace" }}>{activeProblemData.points} pts</span>
                                        )}
                                        {(activeProblemData.tags || []).map(t => (
                                            <span key={t} style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: isDark ? "#3a3a3a" : "#f0f0f0", color: isDark ? "#a8a8a8" : "#555", fontFamily: "'JetBrains Mono',monospace" }}>{t}</span>
                                        ))}
                                    </div>
                                    <div style={{ fontSize: 13, lineHeight: 1.8, color: isDark ? "#c9ccd3" : "#3d3d3d", whiteSpace: "pre-wrap", marginBottom: 8 }}>
                                        {activeProblemData.description}
                                    </div>
                                    {activeProblemData.visibleTestCases?.length > 0 && (
                                        <>
                                            <div style={{ fontSize: 11, fontWeight: 800, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono',monospace", margin: "16px 0 10px" }}>Examples</div>
                                            {activeProblemData.visibleTestCases.map((ex, i) => (
                                                <ExampleCard key={i} example={ex} index={i} paramNames={paramNames} isDark={isDark} />
                                            ))}
                                        </>
                                    )}
                                    {activeProblemData.constraints?.length > 0 && (
                                        <>
                                            <div style={{ fontSize: 11, fontWeight: 800, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono',monospace", margin: "16px 0 10px" }}>Constraints</div>
                                            <ul style={{ margin: "0 0 20px", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5 }}>
                                                {activeProblemData.constraints.map((con, i) => (
                                                    <li key={i} style={{ fontSize: 12, fontFamily: "'JetBrains Mono',monospace", color: isDark ? "#a1a1aa" : "#555", lineHeight: 1.7 }}>{con}</li>
                                                ))}
                                            </ul>
                                        </>
                                    )}
                                </>
                            }
                        </div>
                    </div>
                )}

                {/* ── Editor side ── */}
                <div className="db-right">
                    <div className="db-langbar">
                        {!showDesc && (
                            <button className="db-icon-btn" onClick={() => setShowDesc(true)}>
                                <FileText size={13} /><ChevronRight size={13} />
                            </button>
                        )}
                        {["javascript", "java", "cpp"].map((l) => (
                            <button key={l} className={`db-lang-btn${lang === l ? " active" : ""}`} onClick={() => setLang(l)}>
                                {LANG_LABELS[l]}
                            </button>
                        ))}
                        {activeProblem && (
                            <span style={{ marginLeft: "auto", fontSize: 11, color: "#ffa116", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>
                                {activeProblem.difficulty} · {activeProblem.points}pts
                            </span>
                        )}
                    </div>

                    {/* Editor — flex:1 so it fills remaining space */}
                    <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
                        <Editor
                            height="100%"
                            language={lang === "cpp" ? "cpp" : lang}
                            value={activeCode}
                            onChange={(v) => setCodeMap((prev) => ({ ...prev, [activeProblem?.problemId]: v || "" }))}
                            onMount={(e) => { editorRef.current = e; e.focus(); }}
                            theme={isDark ? "vs-dark" : "vs"}
                            options={{
                                fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false,
                                automaticLayout: true, tabSize: 2, wordWrap: "on", lineNumbers: "on",
                                renderLineHighlight: "line", fontFamily: "'JetBrains Mono',monospace",
                                fontLigatures: true, padding: { top: 14 }, fixedOverflowWidgets: true,
                                readOnly: iSolvedActive,
                            }}
                        />
                    </div>

                    {/* Console */}
                    {consoleOpen && (
                        <div className="db-console" style={{ height: CONSOLE_HEIGHT }}>
                            <div className="db-console-tabs">
                                <button className={`db-console-tab${consoleTab === "testcase" ? " active" : ""}`} onClick={() => setConsoleTab("testcase")}>Test results</button>
                                <button className={`db-console-tab${consoleTab === "result" ? " active" : ""}`} onClick={() => setConsoleTab("result")}>Submit result</button>
                                <div style={{ flex: 1 }} />
                                <button onClick={() => setConsoleOpen(false)} style={{ background: "none", border: "none", color: muted, cursor: "pointer", fontSize: 18, padding: "0 12px", lineHeight: 1 }}>×</button>
                            </div>
                            <div className="db-console-body">
                                {loading && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ffa116", fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>
                                        <span className="db-spinner" />Running...
                                    </div>
                                )}
                                {!loading && consoleTab === "testcase" && runResult && (
                                    <>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", background: overallPassed ? "rgba(0,184,163,0.1)" : "rgba(255,55,95,0.1)", color: overallPassed ? "#00b8a3" : "#ff375f" }}>
                                                {overallPassed ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                                                {overallPassed ? `All tests passed (${tcPassed}/${tcTotal})` : `Some tests failed (${tcPassed}/${tcTotal})`}
                                            </span>
                                        </div>
                                        {testCases.map((tc, i) => {
                                            const passed   = isTC(tc);
                                            const input    = getF(tc, "stdin",           ["input"]);
                                            const expected = getF(tc, "expected_output", ["expected"]);
                                            const output   = getF(tc, "stdout",          ["stderr", "output"]);
                                            return (
                                                <div key={i} className="db-tc-card">
                                                    <div style={{ padding: "7px 12px", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", gap: 8, background: passed ? "rgba(0,184,163,0.05)" : "rgba(255,55,95,0.05)" }}>
                                                        <span style={{ fontSize: 11, fontWeight: 700, color: muted }}>Test {i + 1}</span>
                                                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: passed ? "rgba(0,184,163,0.1)" : "rgba(255,55,95,0.1)", color: passed ? "#00b8a3" : "#ff375f" }}>
                                                            {passed ? <CheckCircle2 size={10} /> : <XCircle size={10} />}{passed ? "Passed" : "Failed"}
                                                        </span>
                                                    </div>
                                                    <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                                                        {[["Input", input], ["Expected", expected], ["Output", output]].map(([label, val]) => (
                                                            <div key={label} style={{ display: "flex", gap: 8 }}>
                                                                <span style={{ color: muted, minWidth: 64, fontSize: 11 }}>{label}</span>
                                                                <pre style={{ margin: 0, color: ink, fontSize: 12, whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.5 }}>{val}</pre>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </>
                                )}
                                {!loading && consoleTab === "result" && runResult && (
                                    <>
                                        <div style={{ fontSize: 16, fontWeight: 800, color: runResult.accepted ? "#00b8a3" : "#ff375f", marginBottom: 8 }}>
                                            {runResult.accepted ? `✓ Accepted (+${activeProblem?.points} pts)` : `✗ ${runResult.error || "Wrong Answer"}`}
                                        </div>
                                        {runResult.passedTestCases != null && (
                                            <div style={{ fontSize: 13, color: muted, fontFamily: "'JetBrains Mono',monospace", marginBottom: 10 }}>
                                                {runResult.passedTestCases} / {runResult.totalTestCases} test cases passed
                                            </div>
                                        )}
                                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                                            <div className="db-kv">
                                                <div style={{ fontSize: 11, color: muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Runtime</div>
                                                <div style={{ fontSize: 14, fontWeight: 800, marginTop: 4, color: ink }}>{runResult.runtime != null ? `${Number(runResult.runtime).toFixed(3)}s` : "—"}</div>
                                            </div>
                                            <div className="db-kv">
                                                <div style={{ fontSize: 11, color: muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Memory</div>
                                                <div style={{ fontSize: 14, fontWeight: 800, marginTop: 4, color: ink }}>{runResult.memory != null ? `${runResult.memory} KB` : "—"}</div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Action bar */}
                    <div className="db-actionbar">
                        <button className="db-console-toggle" onClick={() => setConsoleOpen((v) => !v)}>
                            <Terminal size={13} />Console
                        </button>
                        <div style={{ display: "flex", gap: 8 }}>
                            {iSolvedActive
                                ? <div className="db-btn db-btn-accepted"><CheckCircle2 size={13} />Solved · +{activeProblem?.points}pts</div>
                                : <>
                                    <button className="db-btn" onClick={handleRun} disabled={loading}>
                                        {loading ? <span className="db-spinner" /> : <Play size={13} />}Run
                                    </button>
                                    <button className="db-btn db-btn-submit" onClick={handleSubmit} disabled={loading}>
                                        {loading ? <span className="db-spinner" /> : <Zap size={13} />}Submit
                                    </button>
                                </>
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}