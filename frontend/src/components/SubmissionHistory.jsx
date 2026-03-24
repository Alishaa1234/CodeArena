/* COMPONENT: SubmissionHistory
   PURPOSE: Fetches and displays a list of previous code submissions or user actions.
*/

import { useState, useEffect } from "react";
import axiosClient from "../utils/axiosClient";
import { CheckCircle2, XCircle, AlertCircle, Clock, MemoryStick, X } from "lucide-react";

const STATUS_CONFIG = {
  accepted: { color: "#00b8a3", bg: "rgba(0,184,163,0.1)", icon: <CheckCircle2 size={12} /> },
  wrong:    { color: "#ef4444", bg: "rgba(239,68,68,0.1)",  icon: <XCircle size={12} /> },
  error:    { color: "#ffa116", bg: "rgba(255,161,22,0.1)", icon: <AlertCircle size={12} /> },
  pending:  { color: "#888",    bg: "rgba(136,136,136,0.1)",icon: <Clock size={12} /> },
};

export default function SubmissionHistory({ problemId }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const { data } = await axiosClient.get(`/problem/submittedProblem/${problemId}`);
        setSubmissions(data);
      } catch (e) { setError("Failed to load submissions"); }
      finally { setLoading(false); }
    };
    fetch();
  }, [problemId]);

  if (loading) return <div style={{ color: "#555", fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>Loading submissions...</div>;
  if (error) return <div style={{ color: "#ef4444", fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>{error}</div>;

  return (
    <div style={{ fontFamily: "'Syne',sans-serif" }}>
      <style>{`
        .sh-table { width:100%; border-collapse:collapse; }
        .sh-th { padding:8px 12px; text-align:left; font-size:11px; color:#555; text-transform:uppercase; letter-spacing:0.7px; font-family:'JetBrains Mono',monospace; border-bottom:1px solid #1a1a1a; font-weight:500; }
        .sh-tr { border-bottom:1px solid #111; transition:background 0.15s; cursor:pointer; }
        .sh-tr:hover { background:rgba(255,255,255,0.02); }
        .sh-td { padding:10px 12px; font-size:13px; color:#888; }
        .sh-status { display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:700; font-family:'JetBrains Mono',monospace; }
        .sh-lang { font-family:'JetBrains Mono',monospace; font-size:12px; color:#777; }
        .sh-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:100; display:flex; align-items:center; justify-content:center; padding:20px; }
        .sh-modal { background:#111; border:1px solid #1e1e1e; border-radius:14px; width:100%; max-width:800px; max-height:90vh; display:flex; flex-direction:column; }
        .sh-modal-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid #1a1a1a; }
        .sh-modal-title { font-size:15px; font-weight:700; color:#e0e0e0; }
        .sh-modal-close { background:none; border:none; color:#555; cursor:pointer; padding:4px; border-radius:6px; transition:all 0.15s; display:flex; }
        .sh-modal-close:hover { color:#fff; background:#1a1a1a; }
        .sh-modal-meta { display:flex; gap:12px; flex-wrap:wrap; padding:12px 20px; border-bottom:1px solid #1a1a1a; }
        .sh-meta-badge { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:7px; font-size:12px; font-family:'JetBrains Mono',monospace; background:#161616; border:1px solid #1e1e1e; color:#888; }
        .sh-code-wrap { flex:1; overflow:auto; padding:16px 20px; }
        .sh-code { background:#0a0a0a; border-radius:10px; padding:16px; font-family:'JetBrains Mono',monospace; font-size:13px; color:#bbb; line-height:1.7; white-space:pre-wrap; word-break:break-word; }
      `}</style>

      {submissions.length === 0 ? (
        <div style={{ color: "#555", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, paddingTop: 8 }}>
          No submissions yet. Write some code and hit Submit!
        </div>
      ) : (
        <table className="sh-table">
          <thead>
            <tr>
              <th className="sh-th">#</th>
              <th className="sh-th">Status</th>
              <th className="sh-th">Lang</th>
              <th className="sh-th">Runtime</th>
              <th className="sh-th">Memory</th>
              <th className="sh-th">Tests</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((sub, i) => {
              const sc = STATUS_CONFIG[sub.status] || STATUS_CONFIG.pending;
              return (
                <tr key={sub._id} className="sh-tr" onClick={() => setSelected(sub)}>
                  <td className="sh-td" style={{ color: "#444", fontSize: 12 }}>{i + 1}</td>
                  <td className="sh-td">
                    <span className="sh-status" style={{ color: sc.color, background: sc.bg }}>
                      {sc.icon}{sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                    </span>
                  </td>
                  <td className="sh-td"><span className="sh-lang">{sub.language}</span></td>
                  <td className="sh-td" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>{sub.runtime != null ? `${Number(sub.runtime).toFixed(3)}s` : "—"}</td>
                  <td className="sh-td" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>{sub.memory != null ? `${sub.memory}KB` : "—"}</td>
                  <td className="sh-td" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>{sub.testCasesPassed}/{sub.testCasesTotal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {selected && (
        <div className="sh-modal-overlay" onClick={() => setSelected(null)}>
          <div className="sh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sh-modal-header">
              <div className="sh-modal-title">Submission — {selected.language}</div>
              <button className="sh-modal-close" onClick={() => setSelected(null)}><X size={18} /></button>
            </div>
            <div className="sh-modal-meta">
              {[
                { icon: <CheckCircle2 size={12} />, label: `${selected.testCasesPassed}/${selected.testCasesTotal} tests` },
                { icon: <Clock size={12} />, label: `${selected.runtime != null ? Number(selected.runtime).toFixed(3) : "—"}s` },
                { icon: <MemoryStick size={12} />, label: `${selected.memory != null ? selected.memory : "—"}KB` },
              ].map(({ icon, label }, i) => (
                <span key={i} className="sh-meta-badge">{icon}{label}</span>
              ))}
              {selected.errorMessage && (
                <span className="sh-meta-badge" style={{ color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                  {selected.errorMessage}
                </span>
              )}
            </div>
            <div className="sh-code-wrap">
              <pre className="sh-code">{selected.code}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
