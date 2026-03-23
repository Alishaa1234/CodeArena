import { useEffect, useState } from "react";
import { NavLink } from "react-router";
import axiosClient from "../utils/axiosClient";
import { Upload, Trash2, AlertTriangle } from "lucide-react";
import AdminLayout from "./AdminLayout";

export default function AdminVideo() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    axiosClient.get("/problem/getAllProblem")
      .then(({ data }) => setProblems(data))
      .catch(() => setError("Failed to fetch problems"))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    try {
      await axiosClient.delete(`/video/delete/${id}`);
    } catch (e) { setError(e.displayMessage || "Failed to delete video"); }
    finally { setConfirm(null); }
  };

  const DIFF = { easy: "#00b8a3", medium: "#ffa116", hard: "#ef4444" };

  return (
    <AdminLayout title="Manage Videos" subtitle="// upload and delete editorial videos">
      {loading && <div style={{ color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>Loading...</div>}
      {error && <div style={{ color: "#ef4444", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, marginBottom: 16 }}>⚠ {error}</div>}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["#", "Title", "Difficulty", "Tags", "Actions"].map((h) => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px", fontFamily: "'JetBrains Mono',monospace", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {problems.map((p, i) => {
              const tags = Array.isArray(p.tags) ? p.tags : [p.tags];
              return (
                <tr key={p._id} style={{ borderBottom: "1px solid var(--bg-tertiary)" }}>
                  <td style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: 12, fontFamily: "'JetBrains Mono',monospace" }}>{i + 1}</td>
                  <td style={{ padding: "12px 16px", color: "var(--text-primary)", fontSize: 14, fontWeight: 600 }}>{p.title}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: DIFF[p.difficulty] || "#888", background: `${DIFF[p.difficulty] || "#888"}15` }}>
                      {p.difficulty?.charAt(0).toUpperCase() + p.difficulty?.slice(1)}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 4 }}>{tags.map((t) => <span key={t} style={{ padding: "2px 7px", borderRadius: 5, fontSize: 10, fontFamily: "'JetBrains Mono',monospace", background: "rgba(255,255,255,0.04)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>{t}</span>)}</div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <NavLink to={`/admin/upload/${p._id}`} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "rgba(255,161,22,0.1)", border: "1px solid rgba(255,161,22,0.25)", borderRadius: 7, color: "#ffa116", fontSize: 12, fontWeight: 700, textDecoration: "none", fontFamily: "'Syne',sans-serif" }}>
                        <Upload size={12} />Upload
                      </NavLink>
                      <button onClick={() => setConfirm(p._id)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 7, color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne',sans-serif" }}>
                        <Trash2 size={12} />Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {confirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 32, maxWidth: 380, width: "100%", textAlign: "center" }}>
            <AlertTriangle size={36} color="#ef4444" style={{ margin: "0 auto 16px" }} />
            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>Delete Video?</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace", marginBottom: 24 }}>This will permanently remove the editorial video.</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setConfirm(null)} style={{ padding: "8px 20px", background: "none", border: "1px solid var(--border-mid)", borderRadius: 8, color: "var(--text-muted)", cursor: "pointer", fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={() => handleDelete(confirm)} style={{ padding: "8px 20px", background: "#ef4444", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700 }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
