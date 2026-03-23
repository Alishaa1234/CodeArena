import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { resetDuel } from "../store/duelSlice";
import { RotateCcw, Home, ChevronRight, CheckCircle2, XCircle, Trophy } from "lucide-react";
import Editor from "@monaco-editor/react";
import { useState } from "react";
import useTheme from "../hooks/useTheme";
import ThemeToggle from "./ThemeToggle";

const LANG_MAP  = { "c++": "cpp", java: "java", javascript: "javascript" };
const DIFF_COLOR = { easy: "var(--success)", medium: "var(--accent)", hard: "var(--danger)" };

export default function DuelRecap() {
    const dispatch  = useDispatch();
    const navigate  = useNavigate();
    const { theme } = useTheme();
    const { recap } = useSelector((s) => s.duel);
    const { user }  = useSelector((s) => s.auth);

    // { player: 'mine'|'theirs', problemIndex: number } | null
    const [viewingCode, setViewingCode] = useState(null);

    if (!recap) {
        return (
            <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>Loading recap...</p>
            </div>
        );
    }

    const myId  = user?._id?.toString();
    const me    = recap.players.find((p) => p.userId?.toString() === myId);
    const opp   = recap.players.find((p) => p.userId?.toString() !== myId);

    // Helper — extract string id regardless of whether it's ObjectId, { _id }, or string
    const toStr = (id) => {
        if (!id) return '';
        if (typeof id === 'string') return id;
        if (id._id) return id._id.toString();
        return id.toString();
    };
    const isDraw = recap.isDraw || recap.winnerId === null;
    const iWon  = !isDraw && recap.winnerId?.toString() === myId;

    const durationMs  = recap.finishedAt && recap.startedAt
        ? new Date(recap.finishedAt) - new Date(recap.startedAt) : null;
    const durationStr = durationMs
        ? `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s` : null;

    const totalPoints = recap.problems?.reduce((s, p) => s + p.points, 0) ?? 0;

    // ── Code viewer ───────────────────────────────────────────────────────────
    if (viewingCode !== null) {
        const player    = viewingCode.player === "mine" ? me : opp;
        const prob      = recap.problems[viewingCode.problemIndex];
        const solveRecord = player?.solved?.find(s => s.problemId?.toString() === prob?.problemId?.toString());
        const editorLang  = LANG_MAP[solveRecord?.language] || solveRecord?.language || "javascript";

        return (
            <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
                <nav style={{ height: 56, background: "var(--nav-bg)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 16px", gap: 10 }}>
                    <button onClick={() => setViewingCode(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontFamily: "'JetBrains Mono',monospace", padding: "6px 10px", borderRadius: 7 }}>
                        ← Back to recap
                    </button>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                        {viewingCode.player === "mine" ? "Your" : `${opp?.username}'s`} solution — {prob?.title}
                    </span>
                    <div style={{ flex: 1 }} />
                    <ThemeToggle />
                    {solveRecord?.language && (
                        <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", background: "var(--accent-bg)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
                            {solveRecord.language}
                        </span>
                    )}
                </nav>
                <div style={{ flex: 1 }}>
                    <Editor
                        height="calc(100vh - 56px)"
                        language={editorLang}
                        value={solveRecord?.code || "// This problem was not solved"}
                        theme={theme === "dark" ? "vs-dark" : "vs"}
                        options={{ readOnly: true, fontSize: 14, minimap: { enabled: false }, fontFamily: "'JetBrains Mono', monospace", fontLigatures: true, padding: { top: 16 } }}
                    />
                </div>
            </div>
        );
    }

    // ── Main recap ────────────────────────────────────────────────────────────
    const resultEmoji = isDraw ? "🤝" : (iWon ? "🏆" : "💀");
    const resultText  = isDraw ? "It's a draw!" : (iWon ? "You won!" : "You lost!");
    const resultColor = isDraw ? "var(--accent)" : (iWon ? "var(--success)" : "var(--danger)");

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
            <style>{`
                .rc-nav { height:56px; background:var(--nav-bg); border-bottom:1px solid var(--border); display:flex; align-items:center; padding:0 16px; gap:10px; }
                .rc-body { flex:1; padding:32px 16px; max-width:680px; margin:0 auto; width:100%; }
                .rc-card { background:var(--bg-secondary); border:1px solid var(--border); border-radius:16px; padding:28px; margin-bottom:16px; }
                .rc-inner { background:var(--bg-card); border:1px solid var(--border); border-radius:10px; padding:14px 16px; }
                .rc-label { font-size:11px; color:var(--text-muted); font-family:'JetBrains Mono',monospace; margin-bottom:3px; }
                .rc-btn { padding:9px 20px; border-radius:8px; font-size:14px; font-weight:700; font-family:'Syne',sans-serif; cursor:pointer; transition:all 0.15s; display:flex; align-items:center; gap:6px; }
                .rc-btn-outline { background:none; border:1px solid var(--border-strong); color:var(--text-secondary); }
                .rc-btn-outline:hover { border-color:var(--accent); color:var(--accent); background:var(--accent-bg); }
                .rc-btn-primary { background:var(--accent); border:none; color:#000; }
                .rc-btn-primary:hover { opacity:0.88; }
                .rc-divider { border:none; border-top:1px solid var(--border); margin:20px 0; }
                .rc-view-btn { background:none; border:1px solid var(--border); border-radius:6px; padding:4px 10px; font-size:11px; color:var(--text-muted); cursor:pointer; display:flex; align-items:center; gap:4px; font-family:'JetBrains Mono',monospace; transition:all 0.15s; white-space:nowrap; }
                .rc-view-btn:hover { border-color:var(--accent-border); color:var(--accent); background:var(--accent-bg); }
                .rc-prob-row { display:grid; grid-template-columns:1fr 100px 100px; gap:8px; align-items:center; padding:10px 0; border-bottom:1px solid var(--border); font-size:13px; }
                .rc-prob-row:last-child { border-bottom:none; }
                .rc-prob-header { display:grid; grid-template-columns:1fr 100px 100px; gap:8px; padding:6px 0; font-size:11px; color:var(--text-muted); font-family:'JetBrains Mono',monospace; text-transform:uppercase; letter-spacing:0.06em; border-bottom:1px solid var(--border); margin-bottom:4px; }
            `}</style>

            {/* Navbar */}
            <nav className="rc-nav">
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>Battle recap</span>
                {durationStr && (
                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace" }}>{durationStr}</span>
                )}
                <ThemeToggle />
            </nav>

            <div className="rc-body">

                {/* ── Result banner ─────────────────────────────────────────── */}
                <div className="rc-card" style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 44, marginBottom: 8 }}>{resultEmoji}</div>
                    <p style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px", color: resultColor }}>{resultText}</p>
                    {isDraw && (
                        <p style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace", margin: "0 0 12px" }}>
                            Time's up · equal points
                        </p>
                    )}

                    {/* ELO change */}
                    {me && (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 20, background: isDraw ? "var(--bg-tertiary)" : (iWon ? "var(--success-bg)" : "var(--danger-bg)"), border: `1px solid ${isDraw ? "var(--border)" : (iWon ? "var(--success-border)" : "var(--danger-border)")}`, fontFamily: "'JetBrains Mono',monospace", fontSize: 13, marginBottom: 20 }}>
                            <span style={{ color: "var(--text-muted)" }}>{me.eloAtStart}</span>
                            <span style={{ color: "var(--text-muted)" }}>→</span>
                            <span style={{ fontWeight: 700, color: resultColor }}>{me.eloAfter ?? me.eloAtStart}</span>
                            {me.eloDelta !== 0 && me.eloDelta != null && (
                                <span style={{ color: resultColor, fontWeight: 700 }}>
                                    ({me.eloDelta > 0 ? "+" : ""}{me.eloDelta} ELO)
                                </span>
                            )}
                            {isDraw && <span style={{ color: "var(--text-muted)" }}>no ELO change</span>}
                        </div>
                    )}

                    {/* Score comparison */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div className="rc-inner" style={{ borderColor: iWon ? "var(--success-border)" : "var(--border)" }}>
                            <div className="rc-label">You · {me?.username}</div>
                            <div style={{ fontSize: 28, fontWeight: 800, color: iWon ? "var(--success)" : "var(--text-primary)", margin: "4px 0" }}>
                                {me?.totalPoints ?? 0}
                                <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)" }}> / {totalPoints} pts</span>
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace" }}>
                                {me?.solved?.length ?? 0} / {recap.problems?.length ?? 0} solved
                            </div>
                        </div>
                        <div className="rc-inner" style={{ borderColor: !iWon && !isDraw ? "var(--success-border)" : "var(--border)" }}>
                            <div className="rc-label">Opponent · {opp?.username}</div>
                            <div style={{ fontSize: 28, fontWeight: 800, color: !iWon && !isDraw ? "var(--success)" : "var(--text-primary)", margin: "4px 0" }}>
                                {opp?.totalPoints ?? 0}
                                <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)" }}> / {totalPoints} pts</span>
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace" }}>
                                {opp?.solved?.length ?? 0} / {recap.problems?.length ?? 0} solved
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Problems breakdown ─────────────────────────────────────── */}
                <div className="rc-card">
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
                        <Trophy size={14} color="var(--accent)" />Problems breakdown
                    </p>

                    <div className="rc-prob-header">
                        <span>Problem</span>
                        <span style={{ textAlign: "center" }}>You</span>
                        <span style={{ textAlign: "center" }}>Opponent</span>
                    </div>

                    {recap.problems?.map((prob, idx) => {
                        const probIdStr = toStr(prob.problemId);
                        const meSolve   = me?.solved?.find(s => toStr(s.problemId) === probIdStr);
                        const oppSolve  = opp?.solved?.find(s => toStr(s.problemId) === probIdStr);

                        return (
                            <div key={prob.problemId} className="rc-prob-row">
                                {/* Problem info */}
                                <div>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{prob.title}</span>
                                    <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                                        <span style={{ fontSize: 10, color: DIFF_COLOR[prob.difficulty], fontFamily: "'JetBrains Mono',monospace" }}>{prob.difficulty}</span>
                                        <span style={{ fontSize: 10, color: "var(--accent)", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>+{prob.points}pts</span>
                                    </div>
                                </div>

                                {/* My solve status */}
                                <div style={{ textAlign: "center" }}>
                                    {meSolve ? (
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                            <CheckCircle2 size={16} color="var(--success)" />
                                            <button className="rc-view-btn" onClick={() => setViewingCode({ player: "mine", problemIndex: idx })}>
                                                Code <ChevronRight size={10} />
                                            </button>
                                        </div>
                                    ) : (
                                        <XCircle size={16} color="var(--border)" style={{ opacity: 0.5 }} />
                                    )}
                                </div>

                                {/* Opponent solve status */}
                                <div style={{ textAlign: "center" }}>
                                    {oppSolve ? (
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                            <CheckCircle2 size={16} color="var(--success)" />
                                            <button className="rc-view-btn" onClick={() => setViewingCode({ player: "theirs", problemIndex: idx })}>
                                                Code <ChevronRight size={10} />
                                            </button>
                                        </div>
                                    ) : (
                                        <XCircle size={16} color="var(--border)" style={{ opacity: 0.5 }} />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Actions ───────────────────────────────────────────────── */}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button className="rc-btn rc-btn-outline" onClick={() => { dispatch(resetDuel()); navigate("/"); }}>
                        <Home size={14} />Home
                    </button>
                    <button className="rc-btn rc-btn-primary" onClick={() => { dispatch(resetDuel()); navigate("/duel"); }}>
                        <RotateCcw size={14} />Rematch
                    </button>
                </div>
            </div>
        </div>
    );
}