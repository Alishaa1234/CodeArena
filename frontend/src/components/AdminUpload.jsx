import { useParams } from "react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import axiosClient from "../utils/axiosClient";
import { Upload, CheckCircle2, AlertCircle, Film } from "lucide-react";
import AdminLayout from "./AdminLayout";

const formatSize = (bytes) => {
  if (!bytes) return "0 B";
  const k = 1024, units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(1)} ${units[i]}`;
};
const formatDur = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function AdminUpload() {
  const { problemId } = useParams();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(null);

  const { register, handleSubmit, watch, formState: { errors }, reset, setError, clearErrors } = useForm();
  const file = watch("videoFile")?.[0];

  const onSubmit = async (data) => {
    const f = data.videoFile[0];
    setUploading(true); setProgress(0); clearErrors(); setSuccess(null);
    try {
      const { data: sig } = await axiosClient.get(`/video/create/${problemId}`);
      const form = new FormData();
      form.append("file", f);
      form.append("signature", sig.signature);
      form.append("timestamp", sig.timestamp);
      form.append("public_id", sig.public_id);
      form.append("api_key", sig.api_key);

      const { data: cloud } = await axios.post(sig.upload_url, form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / e.total)),
      });

      const { data: meta } = await axiosClient.post("/video/save", {
        problemId, cloudinaryPublicId: cloud.public_id,
        secureUrl: cloud.secure_url, duration: cloud.duration,
      });
      setSuccess(meta.videoSolution);
      reset();
    } catch (e) {
      setError("root", { message: e.displayMessage || "Upload failed. Try again." });
    } finally { setUploading(false); setProgress(0); }
  };

  return (
    <AdminLayout title="Upload Video" subtitle={`// editorial for problem ${problemId.slice(-6)}`}>
      <div style={{ maxWidth: 520 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 32 }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Dropzone */}
            <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, border: "2px dashed var(--border-mid)", borderRadius: 12, padding: "36px 24px", cursor: "pointer", marginBottom: 20, transition: "border-color 0.2s", background: file ? "rgba(255,161,22,0.04)" : "transparent", borderColor: file ? "rgba(255,161,22,0.4)" : "var(--border-mid)" }}>
              <Film size={32} color={file ? "#ffa116" : "#333"} />
              {file ? (
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{file.name}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: 12, fontFamily: "'JetBrains Mono',monospace" }}>{formatSize(file.size)}</div>
                </div>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "var(--text-muted)", fontSize: 14, fontFamily: "'JetBrains Mono',monospace" }}>Click to select a video file</div>
                  <div style={{ color: "var(--text-faint)", fontSize: 12, fontFamily: "'JetBrains Mono',monospace", marginTop: 4 }}>Max 100MB · MP4, MOV, AVI</div>
                </div>
              )}
              <input type="file" accept="video/*" style={{ display: "none" }} disabled={uploading}
                {...register("videoFile", {
                  required: "Please select a video file",
                  validate: {
                    isVideo: (f) => !f?.[0] || f[0].type.startsWith("video/") || "Must be a video file",
                    size: (f) => !f?.[0] || f[0].size <= 100 * 1024 * 1024 || "Max 100MB",
                  },
                })}
              />
            </label>
            {errors.videoFile && <div style={{ color: "#ef4444", fontSize: 12, fontFamily: "'JetBrains Mono',monospace", marginBottom: 16 }}>{errors.videoFile.message}</div>}

            {/* Progress */}
            {uploading && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: "'JetBrains Mono',monospace", color: "var(--text-muted)", marginBottom: 8 }}>
                  <span>Uploading to Cloudinary...</span><span>{progress}%</span>
                </div>
                <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${progress}%`, background: "#ffa116", borderRadius: 2, transition: "width 0.3s" }} />
                </div>
              </div>
            )}

            {errors.root && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 9, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "#ef4444", fontFamily: "'JetBrains Mono',monospace" }}>
                <AlertCircle size={14} />{errors.root.message}
              </div>
            )}

            {success && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", background: "rgba(0,184,163,0.08)", border: "1px solid rgba(0,184,163,0.2)", borderRadius: 9, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "#00b8a3", fontFamily: "'JetBrains Mono',monospace" }}>
                <CheckCircle2 size={14} />Upload successful! Duration: {formatDur(success.duration)}
              </div>
            )}

            <button type="submit" disabled={uploading} style={{ width: "100%", background: uploading ? "#1a1a1a" : "#ffa116", color: uploading ? "#666" : "#000", border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 800, cursor: uploading ? "not-allowed" : "pointer", fontFamily: "'Syne',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {uploading ? (
                <><span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #444", borderTopColor: "#888", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Uploading...</>
              ) : (
                <><Upload size={15} />Upload Video</>
              )}
            </button>
          </form>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </AdminLayout>
  );
}
