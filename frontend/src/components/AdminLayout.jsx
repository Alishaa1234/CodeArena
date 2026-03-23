import { NavLink } from "react-router";
import { ArrowLeft, Code2 } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function AdminLayout({ title, subtitle, children }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", fontFamily: "'Syne',sans-serif" }}>
      <nav style={{ height: 56, background: "var(--nav-bg)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 24px", gap: 12, position: "sticky", top: 0, zIndex: 50 }}>
        <NavLink to="/admin" style={{ color: "var(--text-muted)", textDecoration: "none", display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontFamily: "'JetBrains Mono',monospace", padding: "6px 10px", borderRadius: 7, border: "1px solid var(--border-mid)", background: "none" }}>
          <ArrowLeft size={14} />Admin
        </NavLink>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 30, height: 30, background: "var(--accent)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}><Code2 size={16} color="#000" /></div>
          <span style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>LeetCode</span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <ThemeToggle />
        </div>
      </nav>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace", marginBottom: 32 }}>{subtitle}</div>
        {children}
      </div>
    </div>
  );
}
