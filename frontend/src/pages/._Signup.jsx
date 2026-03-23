import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, NavLink } from "react-router";
import { registerUser } from "../authSlice";
import { Eye, EyeOff, Code2 } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";

const signupSchema = z.object({
  firstName: z.string().min(3, "Name must be at least 3 characters"),
  emailId: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, loading, error } = useSelector((s) => s.auth);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(signupSchema),
  });

  useEffect(() => {
    if (isAuthenticated) navigate("/");
  }, [isAuthenticated, navigate]);

  const onSubmit = (data) => dispatch(registerUser(data));

  return (
    <div className="lc-auth-root">
      <div style={{ position: "absolute", right: 16, top: 16, zIndex: 5 }}>
        <ThemeToggle />
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@400;600;700;800&display=swap');
        .lc-auth-root { min-height:100vh; background:var(--bg-primary); display:flex; font-family:'Syne',sans-serif; position:relative; overflow:hidden; align-items:center; justify-content:center; }
        .lc-auth-root::before { content:''; position:absolute; inset:0; background: radial-gradient(ellipse 60% 50% at 30% 30%, rgba(255,161,22,0.07) 0%, transparent 70%), radial-gradient(ellipse 40% 60% at 80% 80%, rgba(255,87,34,0.05) 0%, transparent 60%); pointer-events:none; }
        .lc-grid-bg { position:absolute; inset:0; background-image:linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px); background-size:48px 48px; pointer-events:none; }
        .lc-card { background:var(--bg-card); border:1px solid var(--border); border-radius:16px; padding:40px; width:100%; max-width:440px; position:relative; z-index:1; }
        .lc-brand { display:flex; align-items:center; gap:10px; margin-bottom:28px; }
        .lc-brand-icon { width:36px; height:36px; background:#ffa116; border-radius:8px; display:flex; align-items:center; justify-content:center; }
        .lc-brand-name { font-size:20px; font-weight:800; color:var(--text-primary); letter-spacing:-0.5px; }
        .lc-title { font-size:26px; font-weight:800; color:var(--text-primary); margin-bottom:6px; letter-spacing:-0.5px; }
        .lc-sub { font-size:13px; color:var(--text-muted); margin-bottom:28px; font-family:'JetBrains Mono',monospace; }
        .lc-field { margin-bottom:18px; }
        .lc-label { display:block; font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.8px; margin-bottom:7px; font-family:'JetBrains Mono',monospace; }
        .lc-input-wrap { position:relative; }
        .lc-input { width:100%; background:var(--input-bg); border:1px solid var(--border-mid); border-radius:10px; padding:12px 16px; font-size:14px; color:var(--text-primary); outline:none; transition:border-color 0.2s; font-family:'Syne',sans-serif; box-sizing:border-box; }
        .lc-input:focus { border-color:var(--accent); }
        .lc-input.err { border-color:#ef4444; }
        .lc-input.has-icon { padding-right:44px; }
        .lc-input-icon { position:absolute; right:14px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--text-muted); cursor:pointer; padding:0; display:flex; }
        .lc-input-icon:hover { color:var(--text-primary); }
        .lc-err { font-size:11px; color:#ef4444; margin-top:5px; font-family:'JetBrains Mono',monospace; }
        .lc-alert { background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:10px; padding:12px 16px; font-size:13px; color:#ef4444; margin-bottom:18px; font-family:'JetBrains Mono',monospace; }
        .lc-btn { width:100%; background:#ffa116; color:#000; border:none; border-radius:10px; padding:13px; font-size:15px; font-weight:700; cursor:pointer; transition:opacity 0.2s, transform 0.1s; font-family:'Syne',sans-serif; margin-top:6px; }
        .lc-btn:hover:not(:disabled) { opacity:0.9; transform:translateY(-1px); }
        .lc-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .lc-divider { display:flex; align-items:center; gap:12px; margin:22px 0; }
        .lc-divider-line { flex:1; height:1px; background:var(--border); }
        .lc-divider-text { font-size:11px; color:var(--text-faint); font-family:'JetBrains Mono',monospace; }
        .lc-link-row { text-align:center; font-size:13px; color:var(--text-muted); font-family:'JetBrains Mono',monospace; }
        .lc-link { color:#ffa116; text-decoration:none; font-weight:600; }
        .lc-link:hover { text-decoration:underline; }
        .lc-spinner { display:inline-block; width:14px; height:14px; border:2px solid rgba(0,0,0,0.3); border-top-color:#000; border-radius:50%; animation:lc-spin 0.7s linear infinite; vertical-align:middle; margin-right:7px; }
        @keyframes lc-spin { to { transform:rotate(360deg); } }
      `}</style>
      <div className="lc-grid-bg" />
      <div className="lc-card">
        <div className="lc-brand">
          <div className="lc-brand-icon"><Code2 size={20} color="#000" /></div>
          <span className="lc-brand-name">LeetCode</span>
        </div>
        <div className="lc-title">Create account</div>
        <div className="lc-sub">// start your coding journey</div>

        {error && <div className="lc-alert">⚠ {error}</div>}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="lc-field">
            <label className="lc-label">First Name</label>
            <input type="text" placeholder="John" className={`lc-input${errors.firstName ? " err" : ""}`} {...register("firstName")} />
            {errors.firstName && <div className="lc-err">{errors.firstName.message}</div>}
          </div>
          <div className="lc-field">
            <label className="lc-label">Email</label>
            <input type="email" placeholder="you@example.com" className={`lc-input${errors.emailId ? " err" : ""}`} {...register("emailId")} />
            {errors.emailId && <div className="lc-err">{errors.emailId.message}</div>}
          </div>
          <div className="lc-field">
            <label className="lc-label">Password</label>
            <div className="lc-input-wrap">
              <input type={showPassword ? "text" : "password"} placeholder="••••••••" className={`lc-input has-icon${errors.password ? " err" : ""}`} {...register("password")} />
              <button type="button" className="lc-input-icon" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && <div className="lc-err">{errors.password.message}</div>}
          </div>
          <button type="submit" className="lc-btn" disabled={loading}>
            {loading ? <><span className="lc-spinner" />Creating account...</> : "Create Account"}
          </button>
        </form>

        <div className="lc-divider">
          <div className="lc-divider-line" />
          <span className="lc-divider-text">or</span>
          <div className="lc-divider-line" />
        </div>
        <div className="lc-link-row">
          Already have an account?{" "}<NavLink to="/login" className="lc-link">Sign in</NavLink>
        </div>
      </div>
    </div>
  );
}
