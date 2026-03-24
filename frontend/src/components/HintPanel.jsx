/* COMPONENT: HintPanel
   PURPOSE: A slide-out or toggleable panel that provides progressive hints to the user.
*/

import { useState } from "react";
import axiosClient from "../utils/axiosClient";
import { Lightbulb, ChevronDown, ChevronUp, Lock } from "lucide-react";

const HINT_LABELS = {
    1: { label: "Hint 1",  desc: "A gentle nudge"       },
    2: { label: "Hint 2",  desc: "More specific"        },
    3: { label: "Hint 3",  desc: "Almost the approach"  },
};

export default function HintPanel({ problemId }) {
    // { 1: string, 2: string, 3: string } — only populated after unlock
    const [hints,     setHints]     = useState({});
    const [loading,   setLoading]   = useState(null);  // which hint is loading
    const [expanded,  setExpanded]  = useState(null);  // which hint is open
    const [errors,    setErrors]    = useState({});

    const handleUnlock = async (hintNumber) => {
        // Already unlocked — just toggle open/close
        if (hints[hintNumber]) {
            setExpanded((prev) => prev === hintNumber ? null : hintNumber);
            return;
        }

        setLoading(hintNumber);
        setErrors((prev) => ({ ...prev, [hintNumber]: null }));
        try {
            const { data } = await axiosClient.post(`/hint/${problemId}`, { hintNumber });
            setHints((prev) => ({ ...prev, [hintNumber]: data.hint }));
            setExpanded(hintNumber);
        } catch (e) {
            setErrors((prev) => ({ ...prev, [hintNumber]: e.displayMessage || 'Failed to load hint' }));
        } finally {
            setLoading(null);
        }
    };

    const unlockedCount = Object.keys(hints).length;

    return (
        <div style={{ padding: "0 0 16px" }}>
            <style>{`
                .hp-hint-btn { width:100%; background:none; border:1px solid var(--border); border-radius:10px; padding:12px 14px; cursor:pointer; display:flex; align-items:center; gap:10px; transition:all 0.15s; margin-bottom:8px; text-align:left; }
                .hp-hint-btn:hover { border-color:var(--accent-border); background:var(--accent-bg); }
                .hp-hint-btn.unlocked { border-color:var(--accent-border); }
                .hp-hint-btn.open { border-color:var(--accent-border); background:var(--accent-bg); border-bottom-left-radius:0; border-bottom-right-radius:0; margin-bottom:0; }
                .hp-hint-body { background:var(--accent-bg); border:1px solid var(--accent-border); border-top:none; border-bottom-left-radius:10px; border-bottom-right-radius:10px; padding:14px 16px; margin-bottom:8px; font-size:14px; color:var(--text-secondary); line-height:1.7; }
                .hp-spinner { display:inline-block; width:13px; height:13px; border:2px solid var(--accent-bg); border-top-color:var(--accent); border-radius:50%; animation:hp-spin 0.7s linear infinite; }
                @keyframes hp-spin { to{transform:rotate(360deg)} }
            `}</style>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <Lightbulb size={15} color="var(--accent)" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Hints</span>
                </div>
                {unlockedCount > 0 && (
                    <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "var(--text-muted)" }}>
                        {unlockedCount} / 3 unlocked
                    </span>
                )}
            </div>

            <p style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace", marginBottom: 14, lineHeight: 1.6 }}>
                Hints are AI-generated. Each one gives a little more away — use wisely.
            </p>

            {[1, 2, 3].map((n) => {
                const isUnlocked = !!hints[n];
                const isOpen     = expanded === n;
                const isLoading  = loading === n;
                const isLocked   = n > 1 && !hints[n - 1]; // must unlock in order

                return (
                    <div key={n}>
                        <button
                            className={`hp-hint-btn${isUnlocked ? " unlocked" : ""}${isOpen ? " open" : ""}`}
                            onClick={() => !isLocked && handleUnlock(n)}
                            disabled={isLocked || isLoading}
                            style={{ opacity: isLocked ? 0.45 : 1, cursor: isLocked ? "not-allowed" : "pointer" }}
                        >
                            {/* Icon */}
                            <div style={{ width: 28, height: 28, borderRadius: 7, background: isUnlocked ? "var(--accent-bg)" : "var(--bg-tertiary)", border: `1px solid ${isUnlocked ? "var(--accent-border)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                {isLocked
                                    ? <Lock size={12} color="var(--text-muted)" />
                                    : isLoading
                                        ? <span className="hp-spinner" />
                                        : <Lightbulb size={12} color={isUnlocked ? "var(--accent)" : "var(--text-muted)"} />
                                }
                            </div>

                            {/* Label */}
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: isUnlocked ? "var(--accent)" : "var(--text-primary)" }}>
                                    {HINT_LABELS[n].label}
                                </div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace" }}>
                                    {isLocked ? `Unlock hint ${n - 1} first` : isLoading ? "Generating..." : HINT_LABELS[n].desc}
                                </div>
                            </div>

                            {/* Chevron */}
                            {isUnlocked && (
                                isOpen
                                    ? <ChevronUp  size={14} color="var(--accent)" />
                                    : <ChevronDown size={14} color="var(--accent)" />
                            )}

                            {/* Unlock label */}
                            {!isUnlocked && !isLocked && !isLoading && (
                                <span style={{ fontSize: 11, color: "var(--accent)", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, flexShrink: 0 }}>
                                    Unlock →
                                </span>
                            )}
                        </button>

                        {/* Hint body */}
                        {isOpen && hints[n] && (
                            <div className="hp-hint-body">
                                {hints[n]}
                            </div>
                        )}

                        {/* Error */}
                        {errors[n] && (
                            <div style={{ fontSize: 12, color: "var(--danger)", fontFamily: "'JetBrains Mono',monospace", padding: "6px 14px", marginBottom: 8 }}>
                                {errors[n]}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}