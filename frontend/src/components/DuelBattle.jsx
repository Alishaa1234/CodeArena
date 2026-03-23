import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import Editor from "@monaco-editor/react";
import axiosClient from "../utils/axiosClient";
import useTheme from "../hooks/useTheme";
import ThemeToggle from "./ThemeToggle";
import {
    setActiveProblemIndex,
    problemSolved,
    updateOppProgress,
    receiveTaunt,
    clearTaunt,
} from "../store/duelSlice";
import {
    Play, Send, Terminal, CheckCircle2, XCircle,
    Clock, Zap, Trophy, Lock,
} from "lucide-react";

const LANG_LABELS = { javascript: "JavaScript", java: "Java", cpp: "C++" };
const LANG_MAP    = { cpp: "c++", java: "java", javascript: "javascript" };
const TAUNTS      = ["👀", "😈", "🔥", "💀", "⚡", "🤡", "😎", "🫡"];

const DIFF_COLOR = {
    easy:   "var(--success)",
    medium: "var(--accent)",
    hard:   "var(--danger)",
};

// ── Countdown timer ───────────────────────────────────────────────────────────

function useCountdown(totalSeconds, onExpire) {
    const [seconds, setSeconds] = useState(totalSeconds);
    const firedRef = useRef(false);

    useEffect(() => {
        if (totalSeconds <= 0) return;
        const id = setInterval(() => {
            setSeconds((s) => {
                if (s <= 1) {
                    clearInterval(id);
                    if (!firedRef.current) {
                        firedRef.current = true;
                        onExpire();
                    }
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(id);
    }, [totalSeconds]);

    const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
    const ss = String(seconds % 60).padStart(2, "0");
    return { display: `${mm}:${ss}`, seconds, urgent: seconds <= 30 };
}

export default function DuelBattle({ socket }) {
    const dispatch  = useDispatch();
    const { theme } = useTheme();
    const {
        roomCode, problems, timeLimitSeconds, totalPoints,
        activeProblemIndex, opponent,
        myPoints, mySolved, oppPoints, oppSolved, oppProgress,
        lastTaunt,
    } = useSelector((s) => s.duel);
    const { user } = useSelector((s) => s.auth);

    // ── Editor state (per problem) ────────────────────────────────────────────
    const [lang,        setLang]        = useState("javascript");
    const [codeMap,     setCodeMap]     = useState({});   // { [problemId]: code }
    const [loading,     setLoading]     = useState(false);
    const [runResult,   setRunResult]   = useState(null);
    const [bottomTab,   setBottomTab]   = useState(null);
    const [tauntToast,  setTauntToast]  = useState(null);
    const editorRef = useRef(null);

    const activeProblem = problems[activeProblemIndex] || problems[0];
    const activeCode    = codeMap[activeProblem?.problemId] || "";
    const iSolvedActive = mySolved.includes(activeProblem?.problemId);

    // ── Timeout handler ───────────────────────────────────────────────────────
    const timeoutFired = useRef(false);
    const handleTimeout = React.useCallback(() => {
        if (timeoutFired.current) return;
        timeoutFired.current = true;
        socket?.emit('duel:timeout', { roomCode });
    }, [socket, roomCode]);

    const { display: timerDisplay, urgent: timerUrgent } =
        useCountdown(timeLimitSeconds || 300, handleTimeout);

    // ── Fetch starter code when problem or lang changes ───────────────────────
    useEffect(() => {
        if (!activeProblem?.problemId) return;
        const pid = activeProblem.problemId;

        // Already have code for this problem+lang in local map — skip fetch
        if (codeMap[pid]) return;

        axiosClient.get(`/problem/problemById/${pid}`)
            .then(({ data }) => {
                const starter = data.startCode?.find(
                    (s) => s.language === LANG_MAP[lang]
                )?.initialCode || "";
                setCodeMap((prev) => ({ ...prev, [pid]: starter }));
            })
            .catch(console.error);
    }, [activeProblem?.problemId, lang]);

    // When lang changes reset starter for active problem
    useEffect(() => {
        if (!activeProblem?.problemId) return;
        const pid = activeProblem.problemId;
        axiosClient.get(`/problem/problemById/${pid}`)
            .then(({ data }) => {
                const starter = data.startCode?.find(
                    (s) => s.language === LANG_MAP[lang]
                )?.initialCode || "";
                setCodeMap((prev) => ({ ...prev, [pid]: starter }));
            })
            .catch(console.error);
    }, [lang]);

    // ── Taunt toast ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (!lastTaunt) return;
        setTauntToast(lastTaunt);
        const id = setTimeout(() => {
            setTauntToast(null);
            dispatch(clearTaunt());
        }, 3000);
        return () => clearTimeout(id);
    }, [lastTaunt, dispatch]);

    // ── Opponent display name ─────────────────────────────────────────────────
    // opponent = { host: { userId, username, eloRating }, guest: { userId, username, eloRating } }
    // If I am the host  → my opponent is the guest
    // If I am the guest → my opponent is the host
    const myId         = user?._id?.toString();
    const iAmHost      = opponent?.host?.userId === myId;
    const opponentSide = iAmHost ? opponent?.guest : opponent?.host;
    const opponentName = opponentSide?.username  ?? "Opponent";
    const opponentElo  = opponentSide?.eloRating ?? null;

    // ── Run code ──────────────────────────────────────────────────────────────
    const handleRun = async () => {
        if (!activeProblem) return;
        setLoading(true);
        setRunResult(null);
        setBottomTab("testcase");
        const pid  = activeProblem.problemId;
        const code = activeCode;
        try {
            const { data } = await axiosClient.post(
                `/submission/run/${pid}`,
                { code, language: lang }
            );
            setRunResult(data);
            const passed = data.testCases?.filter((tc) => tc.status_id === 3).length ?? 0;
            const total  = data.testCases?.length ?? 0;
            socket?.emit('duel:update-status', { roomCode, problemId: pid, testsPassed: passed, totalTests: total });
        } catch (e) {
            setRunResult({ success: false, testCases: [], error: e.displayMessage });
        } finally {
            setLoading(false);
        }
    };

    // ── Submit code ───────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!activeProblem || iSolvedActive) return;
        setLoading(true);
        setBottomTab("result");
        const pid  = activeProblem.problemId;
        const code = activeCode;
        try {
            const { data } = await axiosClient.post(
                `/submission/submit/${pid}`,
                { code, language: lang }
            );
            setRunResult(data);

            if (data.accepted) {
                // Tell server — awards points + checks early end
                socket?.emit('duel:submit', { roomCode, problemId: pid, language: lang, code });
                dispatch(problemSolved({
                    isMe:        true,
                    userId:      myId,
                    problemId:   pid,
                    points:      activeProblem.points,
                    totalPoints: myPoints + activeProblem.points,
                }));
            } else {
                socket?.emit('duel:update-status', {
                    roomCode,
                    problemId:   pid,
                    testsPassed: data.passedTestCases ?? 0,
                    totalTests:  data.totalTestCases  ?? 0,
                });
            }
        } catch (e) {
            setRunResult({ accepted: false, error: e.displayMessage });
        } finally {
            setLoading(false);
        }
    };

    // ── Taunt ─────────────────────────────────────────────────────────────────
    const handleTaunt = (emoji) => socket?.emit('duel:taunt', { roomCode, emoji });

    // ── Points bar width ──────────────────────────────────────────────────────
    const myPct  = totalPoints > 0 ? Math.round((myPoints  / totalPoints) * 100) : 0;
    const oppPct = totalPoints > 0 ? Math.round((oppPoints / totalPoints) * 100) : 0;

    const editorHeight = bottomTab
        ? "calc(100vh - 56px - 44px - 200px - 52px)"
        : "calc(100vh - 56px - 44px - 52px)";

    const isTestCasePassed = (tc) => {
        const statusId = tc?.status_id ?? tc?.statusId;
        if (typeof tc?.passed === "boolean") return tc.passed;
        if (typeof tc?.accepted === "boolean") return tc.accepted;
        if (statusId != null) return statusId === 3 || statusId === "3";
        const status = (tc?.status ?? tc?.result ?? "").toString().toLowerCase();
        return status === "passed" || status === "accepted" || status === "ac";
    };

    const getTcField = (tc, field, fallbackFields = []) => {
        const values = [field, ...fallbackFields]
            .map((k) => tc?.[k])
            .filter((v) => v !== undefined && v !== null && v !== "");
        return values.length ? values[0] : "—";
    };

    const overallPassed = (() => {
        if (typeof runResult?.success === "boolean") return runResult.success;
        if (!Array.isArray(runResult?.testCases)) return false;
        return runResult.testCases.every((tc) => isTestCasePassed(tc));
    })();

    const tcPassedCount = Array.isArray(runResult?.testCases)
        ? runResult.testCases.filter((tc) => isTestCasePassed(tc)).length
        : 0;

    const tcTotalCount = Array.isArray(runResult?.testCases) ? runResult.testCases.length : 0;

    const overallPassedSafe = tcTotalCount > 0 && overallPassed;

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
            <style>{`
                .db-nav { height:56px; background:var(--nav-bg); border-bottom:1px solid var(--border); display:flex; align-items:center; padding:0 14px; gap:8px; position:sticky; top:0; z-index:50; flex-shrink:0; }
                .db-body { flex:1; display:flex; overflow:hidden; height:calc(100vh - 56px); }
                .db-sidebar { width:260px; border-right:1px solid var(--border); display:flex; flex-direction:column; overflow-y:auto; background:var(--bg-secondary); flex-shrink:0; }
                .db-right { flex:1; display:flex; flex-direction:column; min-width:0; }
                .db-section { padding:14px 16px; border-bottom:1px solid var(--border); }
                .db-section-title { font-size:10px; font-weight:700; color:var(--text-muted); font-family:'JetBrains Mono',monospace; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:8px; }
                .db-prob-btn { width:100%; background:none; border:1px solid var(--border); border-radius:8px; padding:10px 12px; margin-bottom:6px; cursor:pointer; text-align:left; transition:all 0.15s; display:flex; align-items:center; gap:8px; }
                .db-prob-btn:hover { border-color:var(--accent-border); background:var(--accent-bg); }
                .db-prob-btn.active { border-color:var(--accent-border); background:var(--accent-bg); }
                .db-prob-btn.solved { border-color:var(--success-border); background:var(--success-bg); }
                .db-prob-btn.opp-solved { border-color:var(--danger-border,#f0aaaa); }
                .db-score-bar { height:8px; background:var(--bg-tertiary); border-radius:4px; overflow:hidden; margin:5px 0; }
                .db-score-fill { height:100%; border-radius:4px; transition:width 0.5s ease; }
                .db-lang-btn { padding:4px 12px; border-radius:6px; font-size:12px; font-weight:700; background:none; border:1px solid var(--border); color:var(--text-muted); cursor:pointer; font-family:'JetBrains Mono',monospace; transition:all 0.15s; }
                .db-lang-btn:hover { border-color:var(--border-strong); color:var(--text-secondary); }
                .db-lang-btn.active { background:var(--accent-bg); border-color:var(--accent-border); color:var(--accent); }
                .db-action-bar { height:52px; border-top:1px solid var(--border); background:var(--bg-secondary); display:flex; align-items:center; justify-content:space-between; padding:0 16px; flex-shrink:0; }
                .db-run-btn { background:none; border:1px solid var(--border-strong); border-radius:8px; padding:7px 18px; color:var(--text-secondary); cursor:pointer; font-size:13px; font-weight:700; font-family:'Syne',sans-serif; display:flex; align-items:center; gap:6px; transition:all 0.2s; }
                .db-run-btn:hover:not(:disabled) { border-color:var(--text-muted); color:var(--text-primary); }
                .db-run-btn:disabled { opacity:0.4; cursor:not-allowed; }
                .db-submit-btn { background:var(--accent); border:none; border-radius:8px; padding:7px 20px; color:#000; cursor:pointer; font-size:13px; font-weight:800; font-family:'Syne',sans-serif; display:flex; align-items:center; gap:6px; transition:all 0.15s; }
                .db-submit-btn:hover:not(:disabled) { opacity:0.88; }
                .db-submit-btn:disabled { opacity:0.4; cursor:not-allowed; }
                .db-solved-badge { background:var(--success-bg); border:1px solid var(--success-border); border-radius:8px; padding:7px 16px; color:var(--success); font-size:13px; font-weight:700; font-family:'Syne',sans-serif; display:flex; align-items:center; gap:5px; }
                .db-tab { padding:0 14px; height:36px; background:none; border:none; font-size:12px; color:var(--text-muted); cursor:pointer; font-family:'Syne',sans-serif; font-weight:600; border-bottom:2px solid transparent; transition:all 0.15s; display:flex; align-items:center; gap:5px; white-space:nowrap; }
                .db-tab.active { color:var(--accent); border-bottom-color:var(--accent); }
                .db-bottom-panel { border-top:1px solid var(--border); background:var(--bg-secondary); height:200px; overflow-y:auto; flex-shrink:0; }
                .db-tc-card { background:var(--bg-card); border:1px solid var(--border); border-radius:8px; padding:10px 12px; margin-bottom:8px; font-family:'JetBrains Mono',monospace; font-size:12px; }
                .db-status-pill {
                    display:inline-flex;
                    align-items:center;
                    gap:6px;
                    padding:5px 10px;
                    border-radius:999px;
                    font-size:12px;
                    font-weight:900;
                    font-family:'JetBrains Mono',monospace;
                    border:1px solid var(--border-mid);
                    background:var(--bg-card);
                }
                .db-status-pass { color:var(--success); background:var(--success-bg); border-color:var(--success-border); }
                .db-status-fail { color:var(--danger); background:var(--danger-bg); border-color:var(--danger-border); }
                .db-pre { margin:0; white-space:pre-wrap; overflow-wrap:anywhere; color:var(--text-secondary); line-height:1.6; }
                .db-spinner { display:inline-block; width:14px; height:14px; border:2px solid var(--accent-bg); border-top-color:var(--accent); border-radius:50%; animation:db-spin 0.7s linear infinite; }
                .db-taunt-toast { position:fixed; top:68px; left:50%; transform:translateX(-50%); background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:10px 20px; font-size:22px; z-index:999; display:flex; align-items:center; gap:10px; animation:db-toast-in 0.25s ease; }
                .db-taunt-btn { background:none; border:1px solid var(--border); border-radius:8px; padding:5px 9px; cursor:pointer; font-size:17px; transition:all 0.15s; line-height:1; }
                .db-taunt-btn:hover { border-color:var(--accent-border); background:var(--accent-bg); transform:scale(1.15); }
                .db-prog-bar { height:4px; background:var(--bg-tertiary); border-radius:2px; overflow:hidden; margin-top:4px; }
                .db-prog-fill { height:100%; border-radius:2px; background:#378ADD; transition:width 0.3s; }
                @keyframes db-spin { to{transform:rotate(360deg)} }
                @keyframes db-toast-in { from{opacity:0;transform:translateX(-50%) translateY(-8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
            `}</style>

            {/* Taunt toast */}
            {tauntToast && (
                <div className="db-taunt-toast">
                    <span style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace" }}>{tauntToast.from}:</span>
                    <span>{tauntToast.emoji}</span>
                </div>
            )}

            {/* ── Navbar ────────────────────────────────────────────────────── */}
            <nav className="db-nav">
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {activeProblem?.title || "Battle"}
                </span>
                {activeProblem?.difficulty && (
                    <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: DIFF_COLOR[activeProblem.difficulty], background: "var(--bg-secondary)", border: "1px solid var(--border)", flexShrink: 0 }}>
                        {activeProblem.difficulty}
                    </span>
                )}
                <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "var(--success)", background: "var(--success-bg)", border: "1px solid var(--success-border)", flexShrink: 0 }}>
                    ● Live
                </span>
                <div style={{ flex: 1 }} />
                {/* Points scoreboard */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 12px" }}>
                    <span style={{ color: "var(--success)", fontWeight: 700 }}>{myPoints}</span>
                    <span style={{ color: "var(--text-muted)" }}>vs</span>
                    <span style={{ color: "var(--danger)", fontWeight: 700 }}>{oppPoints}</span>
                    <span style={{ color: "var(--text-muted)" }}>/ {totalPoints} pts</span>
                </div>
                {/* Timer */}
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: timerUrgent ? "var(--danger)" : "var(--text-muted)", fontWeight: timerUrgent ? 700 : 400, background: timerUrgent ? "var(--danger-bg)" : "none", padding: "3px 8px", borderRadius: 6, transition: "all 0.3s", flexShrink: 0 }}>
                    <Clock size={13} />{timerDisplay}
                </div>
                <ThemeToggle />
            </nav>

            {/* ── Body ─────────────────────────────────────────────────────── */}
            <div className="db-body">

                {/* ── Sidebar ───────────────────────────────────────────────── */}
                <div className="db-sidebar">

                    {/* Problems list */}
                    <div className="db-section">
                        <div className="db-section-title">Problems</div>
                        {problems.map((prob, idx) => {
                            const iSolved   = mySolved.includes(prob.problemId);
                            const oppSolvedIt = oppSolved.includes(prob.problemId);
                            const oppProg   = oppProgress[prob.problemId];
                            return (
                                <button
                                    key={prob.problemId}
                                    className={`db-prob-btn${activeProblemIndex === idx ? " active" : ""}${iSolved ? " solved" : ""}`}
                                    onClick={() => { dispatch(setActiveProblemIndex(idx)); setRunResult(null); setBottomTab(null); }}
                                >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "var(--text-muted)" }}>Q{idx + 1}</span>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: iSolved ? "var(--success)" : "var(--text-primary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {prob.title}
                                            </span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <span style={{ fontSize: 10, color: DIFF_COLOR[prob.difficulty], fontFamily: "'JetBrains Mono',monospace" }}>{prob.difficulty}</span>
                                            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", fontFamily: "'JetBrains Mono',monospace", marginLeft: "auto" }}>+{prob.points}pts</span>
                                        </div>
                                        {/* Opponent progress on this problem */}
                                        {oppProg && !oppSolvedIt && (
                                            <div className="db-prog-bar">
                                                <div className="db-prog-fill" style={{ width: oppProg.totalTests > 0 ? `${Math.round((oppProg.testsPassed / oppProg.totalTests) * 100)}%` : "0%" }} />
                                            </div>
                                        )}
                                    </div>
                                    {/* Status icons */}
                                    {iSolved     && <CheckCircle2 size={14} color="var(--success)" style={{ flexShrink: 0 }} />}
                                    {oppSolvedIt && !iSolved && <Lock size={12} color="var(--danger)" style={{ flexShrink: 0 }} title="Opponent solved this" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Score */}
                    <div className="db-section">
                        <div className="db-section-title">Score</div>
                        <div style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                                <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{user?.firstName}</span>
                                <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--success)", fontWeight: 700 }}>{myPoints} pts</span>
                            </div>
                            <div className="db-score-bar">
                                <div className="db-score-fill" style={{ width: `${myPct}%`, background: "var(--success)" }} />
                            </div>
                        </div>
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                                <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{opponentName}</span>
                                <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--danger)", fontWeight: 700 }}>{oppPoints} pts</span>
                            </div>
                            <div className="db-score-bar">
                                <div className="db-score-fill" style={{ width: `${oppPct}%`, background: "var(--danger)" }} />
                            </div>
                        </div>
                        <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace", textAlign: "right" }}>
                            Max: {totalPoints} pts
                        </div>
                    </div>

                    {/* Taunts */}
                    <div className="db-section">
                        <div className="db-section-title">Taunts</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                            {TAUNTS.map((emoji) => (
                                <button key={emoji} className="db-taunt-btn" onClick={() => handleTaunt(emoji)}>{emoji}</button>
                            ))}
                        </div>
                    </div>

                </div>

                {/* ── Editor side ───────────────────────────────────────────── */}
                <div className="db-right">
                    {/* Lang selector */}
                    <div style={{ height: 44, borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)", display: "flex", alignItems: "center", padding: "0 12px", gap: 6, flexShrink: 0 }}>
                        {["javascript", "java", "cpp"].map((l) => (
                            <button key={l} className={`db-lang-btn${lang === l ? " active" : ""}`} onClick={() => setLang(l)}>
                                {LANG_LABELS[l]}
                            </button>
                        ))}
                        {activeProblem && (
                            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace" }}>
                                {activeProblem.points} pts · {activeProblem.difficulty}
                            </span>
                        )}
                    </div>

                    {/* Monaco */}
                    <div style={{ height: editorHeight, transition: "height 0.2s" }}>
                        <Editor
                            height="100%"
                            language={lang === "cpp" ? "cpp" : lang}
                            value={activeCode}
                            onChange={(v) => setCodeMap((prev) => ({ ...prev, [activeProblem?.problemId]: v || "" }))}
                            onMount={(e) => { editorRef.current = e; }}
                            theme={theme === "dark" ? "vs-dark" : "vs"}
                            options={{
                                fontSize: 14,
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                tabSize: 2,
                                wordWrap: "on",
                                lineNumbers: "on",
                                renderLineHighlight: "line",
                                mouseWheelZoom: true,
                                fontFamily: "'JetBrains Mono', monospace",
                                fontLigatures: true,
                                padding: { top: 12 },
                                readOnly: iSolvedActive,
                            }}
                        />
                    </div>

                    {/* Bottom panel */}
                    {bottomTab && (
                        <div className="db-bottom-panel">
                            <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--border)", background: "var(--bg-primary)", height: 36 }}>
                                <button className={`db-tab${bottomTab === "testcase" ? " active" : ""}`} onClick={() => setBottomTab("testcase")}>
                                    <Terminal size={12} />Test results
                                </button>
                                <button className={`db-tab${bottomTab === "result" ? " active" : ""}`} onClick={() => setBottomTab("result")}>
                                    <CheckCircle2 size={12} />Submit result
                                </button>
                                <div style={{ flex: 1 }} />
                                <button onClick={() => setBottomTab(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18, padding: "0 12px", lineHeight: 1 }}>×</button>
                            </div>
                            <div style={{ padding: "12px 16px" }}>
                                {loading && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--accent)", fontFamily: "'JetBrains Mono',monospace" }}>
                                        <span className="db-spinner" />Running...
                                    </div>
                                )}
                                {!loading && bottomTab === "testcase" && runResult && (
                                    <>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap", fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>
                                            <span className={`db-status-pill${overallPassedSafe ? " db-status-pass" : " db-status-fail"}`}>
                                                {overallPassedSafe ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                                                {overallPassedSafe ? `All visible tests passed (${tcPassedCount}/${tcTotalCount})` : `Some tests failed (${tcPassedCount}/${tcTotalCount})`}
                                            </span>
                                            {runResult?.error && (
                                                <span style={{ color: "var(--danger)", fontWeight: 900 }}>
                                                    {runResult.error}
                                                </span>
                                            )}
                                        </div>

                                        {Array.isArray(runResult?.testCases) && runResult.testCases.length > 0 ? (
                                            runResult.testCases.map((tc, i) => {
                                                const passed = isTestCasePassed(tc);
                                                const input = getTcField(tc, "stdin", ["input", "test_input"]);
                                                const expected = getTcField(tc, "expected_output", ["expected", "expected_output"]);
                                                const output = getTcField(tc, "stdout", ["stdout", "stderr", "output", "actual_output", "actual"]);

                                                return (
                                                    <div key={i} className="db-tc-card">
                                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                                                            <span style={{ color: "var(--text-muted)", fontWeight: 900 }}>Test {i + 1}</span>
                                                            <span className={`db-status-pill${passed ? " db-status-pass" : " db-status-fail"}`} style={{ padding: "4px 10px" }}>
                                                                {passed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                                {passed ? "Passed" : "Failed"}
                                                            </span>
                                                        </div>
                                                        <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                                                            <span style={{ color: "var(--text-muted)", minWidth: 72 }}>Input</span>
                                                            <pre className="db-pre">{input}</pre>
                                                        </div>
                                                        <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                                                            <span style={{ color: "var(--text-muted)", minWidth: 72 }}>Expected</span>
                                                            <pre className="db-pre">{expected}</pre>
                                                        </div>
                                                        <div style={{ display: "flex", gap: 8, marginBottom: 0 }}>
                                                            <span style={{ color: "var(--text-muted)", minWidth: 72 }}>Output</span>
                                                            <pre className="db-pre">{output}</pre>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div style={{ color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>
                                                No test case details returned.
                                            </div>
                                        )}
                                    </>
                                )}
                                {!loading && bottomTab === "result" && runResult && (
                                    <div style={{ borderRadius: 10, padding: "14px 18px", background: runResult.accepted ? "var(--success-bg)" : "var(--danger-bg)", border: `1px solid ${runResult.accepted ? "var(--success-border)" : "var(--danger-border)"}` }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                                            <div style={{ fontSize: 15, fontWeight: 900, color: runResult.accepted ? "var(--success)" : "var(--danger)", fontFamily: "'JetBrains Mono',monospace" }}>
                                                {runResult.accepted ? `✓ Accepted (+${activeProblem?.points} pts)` : `✗ ${runResult.error || "Wrong answer"}`}
                                            </div>
                                            {runResult.accepted && (
                                                <span className={`db-status-pill db-status-pass`} style={{ padding: "5px 10px" }}>
                                                    <CheckCircle2 size={13} />
                                                    AC
                                                </span>
                                            )}
                                            {!runResult.accepted && (
                                                <span className={`db-status-pill db-status-fail`} style={{ padding: "5px 10px" }}>
                                                    <XCircle size={13} />
                                                    WA
                                                </span>
                                            )}
                                        </div>

                                        {runResult.passedTestCases != null && runResult.totalTestCases != null && (
                                            <div style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "'JetBrains Mono',monospace", fontWeight: 900, marginBottom: 10 }}>
                                                {runResult.passedTestCases} / {runResult.totalTestCases} test cases passed
                                            </div>
                                        )}

                                        {(runResult.runtime != null || runResult.memory != null) && (
                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: 10, padding: 10 }}>
                                                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 900 }}>
                                                        Runtime
                                                    </div>
                                                    <div style={{ fontSize: 13, color: "var(--text-primary)", fontFamily: "'JetBrains Mono',monospace", fontWeight: 900, marginTop: 6 }}>
                                                        {typeof runResult.runtime === "number" ? `${runResult.runtime.toFixed(3)}s` : runResult.runtime != null ? `${runResult.runtime}s` : "—"}
                                                    </div>
                                                </div>
                                                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: 10, padding: 10 }}>
                                                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 900 }}>
                                                        Memory
                                                    </div>
                                                    <div style={{ fontSize: 13, color: "var(--text-primary)", fontFamily: "'JetBrains Mono',monospace", fontWeight: 900, marginTop: 6 }}>
                                                        {typeof runResult.memory === "number" ? `${runResult.memory}KB` : runResult.memory != null ? `${runResult.memory}KB` : "—"}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Action bar */}
                    <div className="db-action-bar">
                        <button
                            className="db-run-btn"
                            style={bottomTab ? { borderColor: "var(--accent-border)", color: "var(--accent)", background: "var(--accent-bg)" } : {}}
                            onClick={() => setBottomTab(bottomTab ? null : "testcase")}
                        >
                            <Terminal size={14} />Console
                        </button>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {iSolvedActive ? (
                                <div className="db-solved-badge">
                                    <CheckCircle2 size={13} />Solved · +{activeProblem?.points}pts
                                </div>
                            ) : (
                                <>
                                    <button className="db-run-btn" onClick={handleRun} disabled={loading}>
                                        {loading ? <span className="db-spinner" /> : <Play size={13} />}Run
                                    </button>
                                    <button className="db-submit-btn" onClick={handleSubmit} disabled={loading}>
                                        {loading ? <span className="db-spinner" /> : <Zap size={13} />}Submit
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}