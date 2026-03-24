/* COMPONENT: AdminPanel
   PURPOSE: Main dashboard view for administrators to monitor system stats and manage features.
*/

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axiosClient from "../utils/axiosClient";
import { useNavigate } from "react-router";
import { Plus, Minus, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import AdminLayout from "./AdminLayout";

const schema = z.object({
  title: z.string().min(1, "Required"),
  description: z.string().min(1, "Required"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  points: z.coerce.number().min(10).max(1000),
  tags: z.array(z.string()).min(1, "Select at least one tag"),
  constraints: z.array(z.object({
    value: z.string().min(1, "Required"),
  })).optional(),
  visibleTestCases: z.array(z.object({
    input: z.string().min(1), output: z.string().min(1), explanation: z.string().min(1),
  })).min(1),
  hiddenTestCases: z.array(z.object({
    input: z.string().min(1), output: z.string().min(1),
  })).min(1),
  startCode: z.array(z.object({ language: z.string(), initialCode: z.string().min(1) })).length(3),
  referenceSolution: z.array(z.object({ language: z.string(), completeCode: z.string().min(1) })).length(3),
});

const LANGS = [
  { label: "C++",        value: "c++" },
  { label: "Java",       value: "java" },
  { label: "JavaScript", value: "javascript" },
];
const TAGS = ["array", "linkedList", "graph", "dp", "string", "tree", "math"];

const inputStyle = { width: "100%", background: "var(--input-bg)", border: "1px solid var(--border-mid)", borderRadius: 9, padding: "10px 14px", fontSize: 13, color: "var(--text-primary)", outline: "none", fontFamily: "'JetBrains Mono',monospace", boxSizing: "border-box" };
const labelStyle = { display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6, fontFamily: "'JetBrains Mono',monospace" };
const sectionStyle = { background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, marginBottom: 20 };
const sectionTitle = { fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginBottom: 18 };

export default function AdminPanel() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  const { register, control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      tags: [],
      points: 100,
      constraints: [],
      startCode: LANGS.map((l) => ({ language: l.value, initialCode: "" })),
      referenceSolution: LANGS.map((l) => ({ language: l.value, completeCode: "" })),
    },
  });

  const { fields: visFields,  append: appVis,  remove: remVis  } = useFieldArray({ control, name: "visibleTestCases" });
  const { fields: hidFields,  append: appHid,  remove: remHid  } = useFieldArray({ control, name: "hiddenTestCases" });
  const { fields: conFields,  append: appCon,  remove: remCon  } = useFieldArray({ control, name: "constraints" });

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      // Flatten constraints from [{ value }] → ["string"]
      const payload = {
        ...data,
        constraints: (data.constraints || []).map(c => c.value).filter(Boolean),
      };
      await axiosClient.post("/problem/create", payload);
      setSubmitted(true);
      setTimeout(() => navigate("/admin"), 1500);
    } catch (e) {
      alert(e.displayMessage || "Failed to create problem");
    } finally { setSubmitting(false); }
  };

  const addBtn = (onClick, label) => (
    <button type="button" onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "rgba(255,161,22,0.08)", border: "1px solid rgba(255,161,22,0.2)", borderRadius: 7, color: "#ffa116", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne',sans-serif" }}>
      <Plus size={12} />{label}
    </button>
  );

  const remBtn = (onClick) => (
    <button type="button" onClick={onClick} style={{ padding: "4px 8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center" }}>
      <Minus size={12} />
    </button>
  );

  if (submitted) return (
    <AdminLayout title="Problem Created!" subtitle="// redirecting to admin...">
      <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--success)", fontSize: 16, fontWeight: 700 }}>
        <CheckCircle2 size={24} />Problem saved successfully!
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="Create Problem" subtitle="// add a new DSA problem">
      <form onSubmit={handleSubmit(onSubmit)} style={{ maxWidth: 800 }}>

        {/* ── Basic Info ── */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>Basic Information</div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Title</label>
            <input {...register("title")} placeholder="Two Sum" style={{ ...inputStyle, borderColor: errors.title ? "#ef4444" : "var(--border-mid)" }} />
            {errors.title && <div style={{ color: "#ef4444", fontSize: 11, marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>{errors.title.message}</div>}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Description</label>
            <textarea {...register("description")} rows={5} placeholder="Problem description..." style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }} />
          </div>

          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Difficulty</label>
              <select {...register("difficulty")} style={{ ...inputStyle, appearance: "none" }}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div style={{ width: 140 }}>
              <label style={labelStyle}>Points (duel)</label>
              <input
                type="number"
                {...register("points")}
                min={10} max={1000} step={10}
                placeholder="100"
                style={inputStyle}
              />
              {errors.points && <div style={{ color: "#ef4444", fontSize: 11, marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>{errors.points.message}</div>}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Tags (select multiple)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {TAGS.map((t) => (
                <label key={t} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input type="checkbox" value={t} {...register("tags")} style={{ accentColor: "#ffa116" }} />
                  <span style={{ fontSize: 12, color: "#888", fontFamily: "'JetBrains Mono',monospace" }}>{t}</span>
                </label>
              ))}
            </div>
            {errors.tags && <div style={{ color: "#ef4444", fontSize: 11, marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>{errors.tags.message}</div>}
          </div>
        </div>

        {/* ── Constraints ── */}
        <div style={sectionStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={sectionTitle}>Constraints</div>
            {addBtn(() => appCon({ value: "" }), "Add Constraint")}
          </div>
          {conFields.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace", padding: "12px 0" }}>
              No constraints added yet. Click "Add Constraint" to add one.<br/>
              <span style={{ opacity: 0.6 }}>e.g. "2 &lt;= nums.length &lt;= 10⁴"</span>
            </div>
          )}
          {conFields.map((f, i) => (
            <div key={f.id} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <input
                  {...register(`constraints.${i}.value`)}
                  placeholder={`e.g. 1 <= nums.length <= 10^4`}
                  style={inputStyle}
                />
                {errors.constraints?.[i]?.value && (
                  <div style={{ color: "#ef4444", fontSize: 11, marginTop: 3, fontFamily: "'JetBrains Mono',monospace" }}>Required</div>
                )}
              </div>
              {remBtn(() => remCon(i))}
            </div>
          ))}
        </div>

        {/* ── Visible Test Cases ── */}
        <div style={sectionStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={sectionTitle}>Visible Test Cases</div>
            {addBtn(() => appVis({ input: "", output: "", explanation: "" }), "Add Case")}
          </div>
          {visFields.map((f, i) => (
            <div key={f.id} style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace" }}>Case {i + 1}</span>
                {remBtn(() => remVis(i))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div><label style={labelStyle}>Input</label><input {...register(`visibleTestCases.${i}.input`)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Output</label><input {...register(`visibleTestCases.${i}.output`)} style={inputStyle} /></div>
              </div>
              <div><label style={labelStyle}>Explanation</label><input {...register(`visibleTestCases.${i}.explanation`)} style={inputStyle} /></div>
            </div>
          ))}
        </div>

        {/* ── Hidden Test Cases ── */}
        <div style={sectionStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={sectionTitle}>Hidden Test Cases</div>
            {addBtn(() => appHid({ input: "", output: "" }), "Add Case")}
          </div>
          {hidFields.map((f, i) => (
            <div key={f.id} style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace" }}>Case {i + 1}</span>
                {remBtn(() => remHid(i))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={labelStyle}>Input</label><input {...register(`hiddenTestCases.${i}.input`)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Output</label><input {...register(`hiddenTestCases.${i}.output`)} style={inputStyle} /></div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Code Templates ── */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>Code Templates & Reference Solutions</div>
          {LANGS.map((lang, i) => (
            <div key={lang.value} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#ffa116", fontFamily: "'JetBrains Mono',monospace", marginBottom: 12, padding: "4px 10px", background: "rgba(255,161,22,0.08)", borderRadius: 6, display: "inline-block" }}>
                {lang.label}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Starter Code</label>
                  <textarea {...register(`startCode.${i}.initialCode`)} rows={8} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6, fontSize: 12 }} />
                </div>
                <div>
                  <label style={labelStyle}>Reference Solution</label>
                  <textarea {...register(`referenceSolution.${i}.completeCode`)} rows={8} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6, fontSize: 12 }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button type="submit" disabled={submitting} style={{ width: "100%", background: submitting ? "var(--bg-secondary)" : "#ffa116", color: submitting ? "var(--text-muted)" : "#000", border: "none", borderRadius: 10, padding: 14, fontSize: 15, fontWeight: 800, cursor: submitting ? "not-allowed" : "pointer", fontFamily: "'Syne',sans-serif" }}>
          {submitting ? "Creating Problem..." : "Create Problem"}
        </button>
      </form>
    </AdminLayout>
  );
}