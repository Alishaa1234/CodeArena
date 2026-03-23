import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NavLink } from "react-router";
import { ChevronLeft, Copy, Check } from "lucide-react";
import { resetDuel } from "../store/duelSlice";
import ThemeToggle from "./ThemeToggle";

export default function DuelWaiting({ socket }) {
    const dispatch            = useDispatch();
    const { roomCode, problem } = useSelector((s) => s.duel);
    const [copied, setCopied] = useState(false);
    const [dots,   setDots]   = useState(".");

    // Animated waiting dots
    useEffect(() => {
        const id = setInterval(() => setDots((d) => d.length >= 3 ? "." : d + "."), 500);
        return () => clearInterval(id);
    }, []);

    const handleCopy = () => {
        navigator.clipboard.writeText(roomCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCancel = () => {
        socket?.emit('duel:abandon', { roomCode });
        dispatch(resetDuel());
    };

    const DIFF_STYLE = {
        easy:   { color: "var(--success)",  bg: "var(--success-bg)",  border: "var(--success-border)" },
        medium: { color: "var(--accent)",   bg: "var(--accent-bg)",   border: "var(--accent-border)" },
        hard:   { color: "var(--danger)",   bg: "var(--danger-bg)",   border: "var(--danger-border)" },
    };
    const ds = problem ? (DIFF_STYLE[problem.difficulty] || DIFF_STYLE.easy) : DIFF_STYLE.easy;

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
            <style>{`
                .dw-nav { height:56px; background:var(--nav-bg); border-bottom:1px solid var(--border); display:flex; align-items:center; padding:0 16px; gap:12px; }
                .dw-back { color:var(--text-muted); text-decoration:none; display:flex; align-items:center; gap:4px; font-size:13px; font-family:'JetBrains Mono',monospace; padding:6px 10px; border-radius:7px; transition:all 0.2s; }
                .dw-back:hover { color:var(--accent); background:var(--accent-bg); }
                @keyframes dw-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
                @keyframes dw-spin { to{transform:rotate(360deg)} }
            `}</style>

            <nav className="dw-nav">
                <button onClick={handleCancel} className="dw-back" style={{ background: "none", border: "none", cursor: "pointer" }}>
                    <ChevronLeft size={15} />Cancel
                </button>
                <span style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 700, flex: 1 }}>Waiting for opponent</span>
                <ThemeToggle />
            </nav>

            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
                <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 16, padding: 32, width: "100%", maxWidth: 420, textAlign: "center" }}>

                    {/* Spinner */}
                    <div style={{ width: 52, height: 52, border: "3px solid var(--accent-bg)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "dw-spin 0.9s linear infinite", margin: "0 auto 24px" }} />

                    <p style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 6px" }}>
                        Waiting for opponent{dots}
                    </p>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 28px" }}>
                        Share the code below with your friend
                    </p>

                    {/* Room code */}
                    <div style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 28, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.18em", flex: 1, textAlign: "center" }}>
                            {roomCode}
                        </span>
                        <button
                            onClick={handleCopy}
                            style={{ background: copied ? "var(--success-bg)" : "var(--accent-bg)", border: `1px solid ${copied ? "var(--success-border)" : "var(--accent-border)"}`, borderRadius: 7, padding: "7px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: copied ? "var(--success)" : "var(--accent)", fontFamily: "'JetBrains Mono',monospace", transition: "all 0.2s" }}
                        >
                            {copied ? <><Check size={13} />Copied</> : <><Copy size={13} />Copy</>}
                        </button>
                    </div>

                    {/* Problem preview */}
                    {problem && (
                        <div style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ textAlign: "left" }}>
                                <p style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace", margin: "0 0 3px" }}>Problem</p>
                                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{problem.title}</p>
                            </div>
                            <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: ds.color, background: ds.bg, border: `1px solid ${ds.border}` }}>
                                {problem.difficulty}
                            </span>
                        </div>
                    )}

                    {/* Pulsing indicator */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 12, color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", animation: "dw-pulse 1.2s ease-in-out infinite", display: "inline-block" }} />
                        Room expires in 10 minutes
                    </div>
                </div>
            </div>
        </div>
    );
}