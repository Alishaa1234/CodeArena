import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NavLink } from "react-router";
import { Swords, ChevronLeft, Trophy, Clock, Hash } from "lucide-react";
import { createRoom, fetchLeaderboard } from "../store/duelSlice";
import { getSocket } from "../socket/socket";
import ThemeToggle from "./ThemeToggle";

const PRESET_TIMES = [
    { label: "5 min",  value: 300  },
    { label: "10 min", value: 600  },
    { label: "15 min", value: 900  },
    { label: "20 min", value: 1200 },
    { label: "30 min", value: 1800 },
    { label: "Custom", value: 0    },
];

export default function DuelLobby({ socket }) {
    const dispatch = useDispatch();
    const { loading, error, leaderboard } = useSelector((s) => s.duel);
    const { user } = useSelector((s) => s.auth);

    // Theme — same pattern as ProblemPage
    const [isDark, setIsDark] = useState(!document.documentElement.classList.contains("light"));
    useEffect(() => {
        const observer = new MutationObserver(() =>
            setIsDark(!document.documentElement.classList.contains("light"))
        );
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => observer.disconnect();
    }, []);

    const [selectedPreset,     setSelectedPreset]     = useState(300);
    const [customMinutes,      setCustomMinutes]       = useState("");
    const [questionCount,      setQuestionCount]       = useState(1);
    const [configError,        setConfigError]         = useState("");
    const [joinCode,           setJoinCode]            = useState("");
    const [joinError,          setJoinError]           = useState("");
    const [showBoard,          setShowBoard]           = useState(false);
    const [leaderboardLoading, setLeaderboardLoading]  = useState(false);

    const isCustom = selectedPreset === 0;

    const getTimeLimitSeconds = () => {
        if (!isCustom) return selectedPreset;
        const mins = parseInt(customMinutes, 10);
        if (isNaN(mins) || mins < 1 || mins > 120) return null;
        return mins * 60;
    };

    const handleCreate = async () => {
        setConfigError("");
        const timeLimitSeconds = getTimeLimitSeconds();
        if (!timeLimitSeconds) {
            setConfigError("Enter a valid custom time between 1 and 120 minutes");
            return;
        }
        const result = await dispatch(createRoom({ timeLimitSeconds, questionCount }));
        if (createRoom.fulfilled.match(result)) {
            const { roomCode } = result.payload;
            const s = socket || getSocket();
            s.emit("duel:create", { roomCode });
        }
    };

    const handleJoin = () => {
        const code = joinCode.trim().toUpperCase();
        if (code.length !== 6) { setJoinError("Room code must be 6 characters"); return; }
        setJoinError("");
        const s = socket || getSocket();
        s.emit("duel:join", { roomCode: code });
    };

    const handleShowBoard = async () => {
        if (!showBoard) {
            setLeaderboardLoading(true);
            try { await dispatch(fetchLeaderboard()); }
            finally { setLeaderboardLoading(false); }
        }
        setShowBoard((v) => !v);
    };

    // Colors — same as ProblemPage
    const bg     = isDark ? "#1a1a1a" : "#ffffff";
    const bg2    = isDark ? "#282828" : "#f7f8fa";
    const bg3    = isDark ? "#222222" : "#f0f0f0";
    const border = isDark ? "#3a3a3a" : "#e5e7eb";
    const muted  = isDark ? "#8d8d8d" : "#6b7280";
    const ink    = isDark ? "#eff1f6" : "#1a1a1a";
    const ink2   = isDark ? "#c9ccd3" : "#3d3d3d";

    return (
        <div style={{ minHeight: "100vh", background: bg, color: ink, fontFamily: "'Syne',sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@400;600;700;800&display=swap');
                * { box-sizing:border-box; margin:0; padding:0; }
                ::-webkit-scrollbar { width:6px; }
                ::-webkit-scrollbar-track { background:transparent; }
                ::-webkit-scrollbar-thumb { background:${isDark ? "#3a3a3a" : "#d4d4d4"}; border-radius:3px; }

                .dl-topbar { height:46px; background:${bg2}; border-bottom:1px solid ${border}; display:flex; align-items:center; padding:0 20px; gap:12px; position:sticky; top:0; z-index:50; }
                .dl-back { color:${muted}; text-decoration:none; display:inline-flex; align-items:center; gap:5px; font-size:12px; font-family:'JetBrains Mono',monospace; padding:5px 8px; border-radius:6px; transition:all 0.15s; }
                .dl-back:hover { color:${ink}; background:${isDark ? "#3a3a3a" : "#e5e7eb"}; }

                .dl-body { display:flex; align-items:flex-start; justify-content:center; padding:48px 20px; gap:20px; flex-wrap:wrap; }

                .dl-card { background:${bg2}; border:1px solid ${border}; border-radius:14px; padding:28px; width:100%; max-width:460px; }
                .dl-inner { background:${bg}; border:1px solid ${border}; border-radius:10px; padding:16px 18px; margin-bottom:12px; }
                .dl-section-title { font-size:10px; font-weight:700; color:${muted}; font-family:'JetBrains Mono',monospace; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:10px; display:flex; align-items:center; gap:6px; }

                .dl-preset-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:4px; }
                .dl-preset-btn { padding:8px 4px; border-radius:8px; font-size:12px; font-weight:700; font-family:'JetBrains Mono',monospace; cursor:pointer; border:1px solid ${border}; background:${bg2}; color:${muted}; transition:all 0.15s; text-align:center; }
                .dl-preset-btn:hover { border-color:#ffa116; color:#ffa116; }
                .dl-preset-btn.active { background:rgba(255,161,22,0.1); border-color:#ffa116; color:#ffa116; }

                .dl-custom-input { width:100%; padding:9px 14px; border-radius:8px; border:1px solid ${border}; background:${bg2}; color:${ink}; font-size:13px; font-family:'JetBrains Mono',monospace; outline:none; transition:border 0.15s; margin-top:8px; }
                .dl-custom-input:focus { border-color:#ffa116; }

                .dl-count-row { display:flex; gap:8px; }
                .dl-count-btn { flex:1; padding:9px 4px; border-radius:8px; font-size:13px; font-weight:700; font-family:'JetBrains Mono',monospace; cursor:pointer; border:1px solid ${border}; background:${bg2}; color:${muted}; transition:all 0.15s; text-align:center; }
                .dl-count-btn:hover { border-color:#ffa116; color:#ffa116; }
                .dl-count-btn.active { background:rgba(255,161,22,0.1); border-color:#ffa116; color:#ffa116; }

                .dl-btn { width:100%; padding:11px; border-radius:8px; font-size:13px; font-weight:700; font-family:'Syne',sans-serif; cursor:pointer; transition:all 0.15s; border:none; display:flex; align-items:center; justify-content:center; gap:7px; }
                .dl-btn-primary { background:#ffa116; color:#000; border:none; }
                .dl-btn-primary:hover:not(:disabled) { background:#ffb84d; }
                .dl-btn-outline { background:none; border:1px solid ${border}; color:${isDark ? "#c9ccd3" : "#444"}; }
                .dl-btn-outline:hover:not(:disabled) { border-color:#ffa116; color:#ffa116; background:rgba(255,161,22,0.05); }
                .dl-btn:disabled { opacity:0.4; cursor:not-allowed; }

                .dl-input { width:100%; padding:10px 14px; border-radius:8px; border:1px solid ${border}; background:${bg}; color:${ink}; font-size:16px; font-family:'JetBrains Mono',monospace; letter-spacing:0.14em; text-transform:uppercase; outline:none; transition:border 0.15s; text-align:center; margin-bottom:10px; }
                .dl-input:focus { border-color:#ffa116; }
                .dl-input::placeholder { text-transform:none; letter-spacing:normal; color:${muted}; font-size:13px; }

                .dl-error { font-size:12px; color:#ff375f; font-family:'JetBrains Mono',monospace; margin-top:6px; }
                .dl-pill { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:700; font-family:'JetBrains Mono',monospace; background:rgba(255,161,22,0.1); border:1px solid rgba(255,161,22,0.25); color:#ffa116; }
                .dl-board-row { display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid ${border}; font-size:13px; }
                .dl-board-row:last-child { border-bottom:none; }
                .dl-skel { height:32px; border-radius:8px; background:${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}; position:relative; overflow:hidden; margin-bottom:8px; }
                .dl-skel::after { content:''; position:absolute; inset:0; transform:translateX(-100%); background:linear-gradient(90deg,transparent,${isDark ? "rgba(255,161,22,0.08)" : "rgba(0,0,0,0.04)"},transparent); animation:dl-skel 1.1s infinite; }
                .dl-spinner { display:inline-block; width:14px; height:14px; border:2px solid rgba(255,161,22,0.2); border-top-color:#ffa116; border-radius:50%; animation:dl-spin 0.7s linear infinite; }
                @keyframes dl-skel { to { transform:translateX(100%); } }
                @keyframes dl-spin { to { transform:rotate(360deg); } }
            `}</style>

            {/* ── Top bar ── */}
            <div className="dl-topbar">
                <NavLink to="/" className="dl-back"><ChevronLeft size={14} />Problems</NavLink>
                <span style={{ fontSize: 14, fontWeight: 700, color: ink, flex: 1 }}>Code Duel</span>
                <button
                    onClick={handleShowBoard}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${border}`, borderRadius: 7, padding: "5px 12px", color: muted, cursor: "pointer", fontSize: 12, fontFamily: "'JetBrains Mono',monospace", transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#ffa116"; e.currentTarget.style.color = "#ffa116"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = muted; }}
                >
                    <Trophy size={12} />Leaderboard
                </button>
                <ThemeToggle />
            </div>

            {/* ── Body ── */}
            <div className="dl-body">

                {/* ── Host card ── */}
                <div className="dl-card">
                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
                        <div style={{ width: 42, height: 42, background: "rgba(255,161,22,0.1)", border: "1px solid rgba(255,161,22,0.25)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Swords size={19} color="#ffa116" />
                        </div>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: ink }}>Host a Duel</div>
                            <div style={{ fontSize: 11, color: muted, fontFamily: "'JetBrains Mono',monospace", marginTop: 2 }}>
                                {user?.eloRating ?? 1200} ELO · Set your rules
                            </div>
                        </div>
                    </div>

                    {/* Time limit */}
                    <div className="dl-inner">
                        <div className="dl-section-title"><Clock size={11} />Time Limit</div>
                        <div className="dl-preset-grid">
                            {PRESET_TIMES.map(({ label, value }) => (
                                <button key={value} className={`dl-preset-btn${selectedPreset === value ? " active" : ""}`} onClick={() => setSelectedPreset(value)}>
                                    {label}
                                </button>
                            ))}
                        </div>
                        {isCustom && (
                            <input className="dl-custom-input" type="number" placeholder="Enter minutes (1–120)" min={1} max={120} value={customMinutes} onChange={(e) => setCustomMinutes(e.target.value)} />
                        )}
                    </div>

                    {/* Questions */}
                    <div className="dl-inner">
                        <div className="dl-section-title"><Hash size={11} />Questions</div>
                        <div className="dl-count-row">
                            {[1, 2, 3, 4, 5].map((n) => (
                                <button key={n} className={`dl-count-btn${questionCount === n ? " active" : ""}`} onClick={() => setQuestionCount(n)}>{n}</button>
                            ))}
                        </div>
                        <div style={{ fontSize: 11, color: muted, fontFamily: "'JetBrains Mono',monospace", marginTop: 8 }}>
                            Problems picked randomly · most points wins
                        </div>
                    </div>

                    {/* Summary pills */}
                    {!configError && (
                        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                            <span className="dl-pill">
                                <Clock size={10} />
                                {isCustom ? (customMinutes ? `${customMinutes} min` : "Custom") : PRESET_TIMES.find(t => t.value === selectedPreset)?.label}
                            </span>
                            <span className="dl-pill">
                                <Hash size={10} />{questionCount} question{questionCount > 1 ? "s" : ""}
                            </span>
                        </div>
                    )}

                    {configError && <div className="dl-error" style={{ marginBottom: 12 }}>{configError}</div>}
                    {error       && <div className="dl-error" style={{ marginBottom: 12 }}>{error}</div>}

                    <button className="dl-btn dl-btn-primary" onClick={handleCreate} disabled={loading}>
                        {loading ? <span className="dl-spinner" /> : <Swords size={13} />}
                        Create Room
                    </button>
                </div>

                {/* ── Join card ── */}
                <div className="dl-card" style={{ maxWidth: 360 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
                        <div style={{ width: 42, height: 42, background: bg3, border: `1px solid ${border}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Swords size={19} color={muted} />
                        </div>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: ink }}>Join a Duel</div>
                            <div style={{ fontSize: 11, color: muted, fontFamily: "'JetBrains Mono',monospace", marginTop: 2 }}>
                                Enter the code your opponent shared
                            </div>
                        </div>
                    </div>

                    <input
                        className="dl-input"
                        placeholder="Room code (e.g. X4KP2R)"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                        maxLength={6}
                    />
                    {joinError && <div className="dl-error" style={{ marginBottom: 10 }}>{joinError}</div>}
                    <button className="dl-btn dl-btn-outline" onClick={handleJoin} disabled={!joinCode.trim()}>
                        Join Room
                    </button>

                    {/* Leaderboard */}
                    {showBoard && (
                        <div style={{ marginTop: 24, borderTop: `1px solid ${border}`, paddingTop: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: ink, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                                <Trophy size={12} color="#ffa116" />Top Players
                            </div>
                            {leaderboardLoading
                                ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="dl-skel" />)
                                : leaderboard.length === 0
                                    ? <div style={{ fontSize: 12, color: muted, fontFamily: "'JetBrains Mono',monospace" }}>No ranked players yet.</div>
                                    : leaderboard.map((u, i) => (
                                        <div key={u._id} className="dl-board-row">
                                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: muted, width: 22 }}>#{i + 1}</span>
                                            <span style={{ flex: 1, color: ink, fontWeight: 600, fontSize: 13 }}>{u.firstName} {u.lastName}</span>
                                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#ffa116", fontWeight: 700 }}>{u.eloRating} ELO</span>
                                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: muted }}>{u.duelsPlayed}d</span>
                                        </div>
                                    ))
                            }
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}