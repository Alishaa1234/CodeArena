import { useState } from "react";
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
    const dispatch  = useDispatch();
    const { loading, error, leaderboard } = useSelector((s) => s.duel);
    const { user }  = useSelector((s) => s.auth);

    // ── Host config state ─────────────────────────────────────────────────────
    const [selectedPreset,   setSelectedPreset]   = useState(300);
    const [customMinutes,    setCustomMinutes]     = useState("");
    const [questionCount,    setQuestionCount]     = useState(1);
    const [configError,      setConfigError]       = useState("");

    // ── Join state ────────────────────────────────────────────────────────────
    const [joinCode,   setJoinCode]   = useState("");
    const [joinError,  setJoinError]  = useState("");

    // ── Leaderboard ───────────────────────────────────────────────────────────
    const [showBoard,  setShowBoard]  = useState(false);
    const [leaderboardLoading, setLeaderboardLoading] = useState(false);

    const isCustom = selectedPreset === 0;

    const getTimeLimitSeconds = () => {
        if (!isCustom) return selectedPreset;
        const mins = parseInt(customMinutes, 10);
        if (isNaN(mins) || mins < 1 || mins > 120) return null;
        return mins * 60;
    };

    // ── Create room ───────────────────────────────────────────────────────────
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
            s.emit('duel:create', { roomCode });
        }
    };

    // ── Join room ─────────────────────────────────────────────────────────────
    const handleJoin = () => {
        const code = joinCode.trim().toUpperCase();
        if (code.length !== 6) {
            setJoinError("Room code must be 6 characters");
            return;
        }
        setJoinError("");
        const s = socket || getSocket();
        s.emit('duel:join', { roomCode: code });
    };

    // ── Leaderboard ───────────────────────────────────────────────────────────
    const handleShowBoard = async () => {
        if (!showBoard) {
            setLeaderboardLoading(true);
            try {
                await dispatch(fetchLeaderboard());
            } finally {
                setLeaderboardLoading(false);
            }
        }
        setShowBoard((v) => !v);
    };

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
            <style>{`
                .dl-nav { height:56px; background:var(--nav-bg); border-bottom:1px solid var(--border); display:flex; align-items:center; padding:0 16px; gap:12px; }
                .dl-back { color:var(--text-muted); text-decoration:none; display:flex; align-items:center; gap:4px; font-size:13px; font-family:'JetBrains Mono',monospace; padding:6px 10px; border-radius:7px; transition:all 0.2s; }
                .dl-back:hover { color:var(--accent); background:var(--accent-bg); }
                .dl-body { flex:1; display:flex; align-items:flex-start; justify-content:center; padding:40px 16px; gap:20px; flex-wrap:wrap; }
                .dl-card { background:var(--bg-secondary); border:1px solid var(--border); border-radius:16px; padding:28px; width:100%; max-width:460px; }
                .dl-inner { background:var(--bg-card); border:1px solid var(--border); border-radius:10px; padding:18px 20px; margin-bottom:12px; }
                .dl-section-title { font-size:12px; font-weight:700; color:var(--text-muted); font-family:'JetBrains Mono',monospace; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:10px; display:flex; align-items:center; gap:6px; }
                .dl-preset-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:10px; }
                .dl-preset-btn { padding:8px 4px; border-radius:8px; font-size:13px; font-weight:700; font-family:'JetBrains Mono',monospace; cursor:pointer; border:1px solid var(--border); background:var(--bg-primary); color:var(--text-muted); transition:all 0.15s; text-align:center; }
                .dl-preset-btn:hover { border-color:var(--accent-border); color:var(--accent); }
                .dl-preset-btn.active { background:var(--accent-bg); border-color:var(--accent-border); color:var(--accent); }
                .dl-custom-input { width:100%; padding:9px 14px; border-radius:8px; border:1px solid var(--border); background:var(--bg-primary); color:var(--text-primary); font-size:14px; font-family:'JetBrains Mono',monospace; outline:none; transition:border 0.15s; margin-top:8px; }
                .dl-custom-input:focus { border-color:var(--accent); }
                .dl-count-row { display:flex; gap:8px; }
                .dl-count-btn { flex:1; padding:9px 4px; border-radius:8px; font-size:14px; font-weight:700; font-family:'JetBrains Mono',monospace; cursor:pointer; border:1px solid var(--border); background:var(--bg-primary); color:var(--text-muted); transition:all 0.15s; text-align:center; }
                .dl-count-btn:hover { border-color:var(--accent-border); color:var(--accent); }
                .dl-count-btn.active { background:var(--accent-bg); border-color:var(--accent-border); color:var(--accent); }
                .dl-btn { width:100%; padding:11px; border-radius:8px; font-size:14px; font-weight:700; font-family:'Syne',sans-serif; cursor:pointer; transition:all 0.15s; border:none; display:flex; align-items:center; justify-content:center; gap:6px; }
                .dl-btn-primary { background:var(--accent); color:#000; }
                .dl-btn-primary:hover:not(:disabled) { opacity:0.88; }
                .dl-btn-outline { background:none; border:1px solid var(--border-strong); color:var(--text-secondary); }
                .dl-btn-outline:hover:not(:disabled) { border-color:var(--accent); color:var(--accent); background:var(--accent-bg); }
                .dl-btn:disabled { opacity:0.4; cursor:not-allowed; }
                .dl-divider { display:flex; align-items:center; gap:10px; margin:16px 0; }
                .dl-divider-line { flex:1; border:none; border-top:1px solid var(--border); }
                .dl-input { width:100%; padding:10px 14px; border-radius:8px; border:1px solid var(--border); background:var(--bg-primary); color:var(--text-primary); font-size:16px; font-family:'JetBrains Mono',monospace; letter-spacing:0.14em; text-transform:uppercase; outline:none; transition:border 0.15s; text-align:center; margin-bottom:10px; }
                .dl-input:focus { border-color:var(--accent); }
                .dl-input::placeholder { text-transform:none; letter-spacing:normal; color:var(--text-muted); font-size:13px; }
                .dl-error { font-size:12px; color:var(--danger); font-family:'JetBrains Mono',monospace; margin-top:6px; }
                .dl-spinner { display:inline-block; width:14px; height:14px; border:2px solid var(--accent-bg); border-top-color:var(--accent); border-radius:50%; animation:dl-spin 0.7s linear infinite; }
                .dl-board-row { display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--border); font-size:13px; }
                .dl-board-row:last-child { border-bottom:none; }
                .dl-summary-pill { display:inline-flex; align-items:center; gap:5px; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700; font-family:'JetBrains Mono',monospace; background:var(--accent-bg); border:1px solid var(--accent-border); color:var(--accent); }
                .dl-skel-row { height: 34px; border-radius: 10px; border: 1px solid var(--border-mid); background: rgba(255,255,255,0.03); position: relative; overflow: hidden; }
                .dl-skel-row::after { content:''; position:absolute; inset:0; transform: translateX(-100%); background: linear-gradient(90deg, rgba(255,161,22,0) 0%, rgba(255,161,22,0.22) 50%, rgba(255,161,22,0) 100%); animation: dl-skel 1.1s infinite; }
                @keyframes dl-skel { to { transform: translateX(100%); } }
                @keyframes dl-spin { to { transform:rotate(360deg); } }
            `}</style>

            {/* Navbar */}
            <nav className="dl-nav">
                <NavLink to="/" className="dl-back"><ChevronLeft size={15} />Home</NavLink>
                <span style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 700, flex: 1 }}>Code duel</span>
                <ThemeToggle />
                <button onClick={handleShowBoard} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 7, padding: "5px 12px", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "'JetBrains Mono',monospace" }}>
                    <Trophy size={13} />Leaderboard
                </button>
            </nav>

            <div className="dl-body">

                {/* ── Host card ─────────────────────────────────────────────── */}
                <div className="dl-card">
                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
                        <div style={{ width: 44, height: 44, background: "var(--accent-bg)", border: "1px solid var(--accent-border)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Swords size={20} color="var(--accent)" />
                        </div>
                        <div>
                            <p style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Host a duel</p>
                            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, fontFamily: "'JetBrains Mono',monospace" }}>
                                {user?.eloRating ?? 1200} ELO · Set your rules
                            </p>
                        </div>
                    </div>

                    {/* Time limit */}
                    <div className="dl-inner">
                        <div className="dl-section-title"><Clock size={12} />Time limit</div>
                        <div className="dl-preset-grid">
                            {PRESET_TIMES.map(({ label, value }) => (
                                <button
                                    key={value}
                                    className={`dl-preset-btn${selectedPreset === value ? " active" : ""}`}
                                    onClick={() => setSelectedPreset(value)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        {isCustom && (
                            <input
                                className="dl-custom-input"
                                type="number"
                                placeholder="Enter minutes (1–120)"
                                min={1}
                                max={120}
                                value={customMinutes}
                                onChange={(e) => setCustomMinutes(e.target.value)}
                            />
                        )}
                    </div>

                    {/* Question count */}
                    <div className="dl-inner">
                        <div className="dl-section-title"><Hash size={12} />Questions</div>
                        <div className="dl-count-row">
                            {[1, 2, 3, 4, 5].map((n) => (
                                <button
                                    key={n}
                                    className={`dl-count-btn${questionCount === n ? " active" : ""}`}
                                    onClick={() => setQuestionCount(n)}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace", margin: "8px 0 0" }}>
                            Problems are picked randomly · most points wins
                        </p>
                    </div>

                    {/* Config summary */}
                    {!configError && (
                        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                            <span className="dl-summary-pill">
                                <Clock size={11} />
                                {isCustom
                                    ? (customMinutes ? `${customMinutes} min` : "Custom")
                                    : PRESET_TIMES.find(t => t.value === selectedPreset)?.label}
                            </span>
                            <span className="dl-summary-pill">
                                <Hash size={11} />{questionCount} question{questionCount > 1 ? "s" : ""}
                            </span>
                        </div>
                    )}

                    {configError && <p className="dl-error" style={{ marginBottom: 12 }}>{configError}</p>}
                    {error      && <p className="dl-error" style={{ marginBottom: 12 }}>{error}</p>}

                    <button className="dl-btn dl-btn-primary" onClick={handleCreate} disabled={loading}>
                        {loading ? <span className="dl-spinner" /> : <Swords size={14} />}
                        Create room
                    </button>
                </div>

                {/* ── Join card ─────────────────────────────────────────────── */}
                <div className="dl-card" style={{ maxWidth: 360 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
                        <div style={{ width: 44, height: 44, background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Swords size={20} color="var(--text-muted)" />
                        </div>
                        <div>
                            <p style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Join a duel</p>
                            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, fontFamily: "'JetBrains Mono',monospace" }}>
                                Enter the code your opponent shared
                            </p>
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
                    {joinError && <p className="dl-error" style={{ marginBottom: 10 }}>{joinError}</p>}
                    <button className="dl-btn dl-btn-outline" onClick={handleJoin} disabled={!joinCode.trim()}>
                        Join room
                    </button>

                    {/* Leaderboard */}
                    {showBoard && (
                        <div style={{ marginTop: 24, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                                <Trophy size={13} color="var(--accent)" />Top players
                            </p>
                            {leaderboardLoading ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <div key={i} className="dl-skel-row" />
                                    ))}
                                </div>
                            ) : leaderboard.length === 0 ? (
                                <p style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace" }}>No ranked players yet.</p>
                            ) : (
                                leaderboard.map((u, i) => (
                                    <div key={u._id} className="dl-board-row">
                                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--text-muted)", width: 24 }}>#{i + 1}</span>
                                        <span style={{ flex: 1, color: "var(--text-primary)", fontWeight: 600 }}>{u.firstName} {u.lastName}</span>
                                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "var(--accent)" }}>{u.eloRating} ELO</span>
                                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--text-muted)" }}>{u.duelsPlayed}d</span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}