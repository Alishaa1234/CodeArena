import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, NavLink } from "react-router";
import { loginUser } from "../authSlice";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Code2, Terminal } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";

const loginSchema = z.object({
  emailId: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, loading, error } = useSelector((s) => s.auth);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (isAuthenticated) navigate("/");
  }, [isAuthenticated, navigate]);

  const onSubmit = (data) => dispatch(loginUser(data));

  return (
    <div className="lc-auth-root">
      <div style={{ position: "absolute", right: 16, top: 16, zIndex: 5 }}>
        <ThemeToggle />
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@400;600;700;800&display=swap');
        .lc-auth-root {
          min-height: 100vh;
          background: var(--bg-primary);
          display: flex;
          font-family: 'Syne', sans-serif;
          position: relative;
          overflow: hidden;
        }
        .lc-auth-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 60% 50% at 70% 20%, rgba(255,161,22,0.07) 0%, transparent 70%),
            radial-gradient(ellipse 40% 60% at 20% 80%, rgba(255,87,34,0.05) 0%, transparent 60%);
          pointer-events: none;
        }
        .lc-grid-bg {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
        }
        .lc-left-panel {
          flex: 1;
          display: none;
          flex-direction: column;
          justify-content: center;
          padding: 80px;
          position: relative;
        }
        @media (min-width: 1024px) { .lc-left-panel { display: flex; } }
        .lc-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 64px;
        }
        .lc-brand-icon {
          width: 40px; height: 40px;
          background: #ffa116;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
        }
        .lc-brand-name {
          font-size: 22px;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.5px;
        }
        .lc-hero-title {
          font-size: 52px;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1.1;
          margin-bottom: 20px;
          letter-spacing: -1.5px;
        }
        .lc-hero-title span { color: #ffa116; }
        .lc-hero-sub {
          font-size: 16px;
          color: var(--text-muted);
          line-height: 1.7;
          max-width: 380px;
          font-family: 'JetBrains Mono', monospace;
        }
        .lc-stats {
          display: flex;
          gap: 40px;
          margin-top: 56px;
        }
        .lc-stat-num {
          font-size: 28px;
          font-weight: 800;
          color: #ffa116;
        }
        .lc-stat-label {
          font-size: 12px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 1px;
          font-family: 'JetBrains Mono', monospace;
        }
        .lc-code-decoration {
          margin-top: 64px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px 24px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          line-height: 1.8;
          color: var(--text-secondary);
        }
        .lc-code-decoration .kw { color: #c792ea; }
        .lc-code-decoration .fn { color: #82aaff; }
        .lc-code-decoration .str { color: #c3e88d; }
        .lc-code-decoration .num { color: #f78c6c; }
        .lc-right-panel {
          width: 100%;
          max-width: 480px;
          margin: auto;
          padding: 40px 32px;
          position: relative;
          z-index: 1;
        }
        @media (min-width: 1024px) { .lc-right-panel { padding: 60px 48px; } }
        .lc-form-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 40px;
        }
        .lc-form-title {
          font-size: 28px;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 6px;
          letter-spacing: -0.5px;
        }
        .lc-form-sub {
          font-size: 14px;
          color: var(--text-muted);
          margin-bottom: 32px;
          font-family: 'JetBrains Mono', monospace;
        }
        .lc-field { margin-bottom: 20px; }
        .lc-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 8px;
          font-family: 'JetBrains Mono', monospace;
        }
        .lc-input-wrap { position: relative; }
        .lc-input {
          width: 100%;
          background: var(--input-bg);
          border: 1px solid var(--border-mid);
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 15px;
          color: var(--text-primary);
          outline: none;
          transition: border-color 0.2s;
          font-family: 'Syne', sans-serif;
          box-sizing: border-box;
        }
        .lc-input:focus { border-color: var(--accent); }
        .lc-input.err { border-color: #ef4444; }
        .lc-input.has-icon { padding-right: 44px; }
        .lc-input-icon {
          position: absolute;
          right: 14px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          color: var(--text-muted); cursor: pointer;
          padding: 0; display: flex;
        }
        .lc-input-icon:hover { color: var(--text-primary); }
        .lc-err-msg {
          font-size: 12px;
          color: #ef4444;
          margin-top: 6px;
          font-family: 'JetBrains Mono', monospace;
        }
        .lc-alert {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 13px;
          color: #ef4444;
          margin-bottom: 20px;
          font-family: 'JetBrains Mono', monospace;
        }
        .lc-btn-primary {
          width: 100%;
          background: #ffa116;
          color: #000;
          border: none;
          border-radius: 10px;
          padding: 14px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
          font-family: 'Syne', sans-serif;
          letter-spacing: 0.3px;
          margin-top: 8px;
        }
        .lc-btn-primary:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .lc-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .lc-divider {
          display: flex; align-items: center; gap: 12px;
          margin: 24px 0;
        }
        .lc-divider-line { flex: 1; height: 1px; background: var(--border); }
        .lc-divider-text { font-size: 12px; color: var(--text-faint); font-family: 'JetBrains Mono', monospace; }
        .lc-link-row {
          text-align: center;
          font-size: 14px;
          color: var(--text-muted);
          font-family: 'JetBrains Mono', monospace;
        }
        .lc-link { color: #ffa116; text-decoration: none; font-weight: 600; }
        .lc-link:hover { text-decoration: underline; }
        .lc-spinner {
          display: inline-block;
          width: 16px; height: 16px;
          border: 2px solid rgba(0,0,0,0.3);
          border-top-color: #000;
          border-radius: 50%;
          animation: lc-spin 0.7s linear infinite;
          vertical-align: middle;
          margin-right: 8px;
        }
        @keyframes lc-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="lc-grid-bg" />

      {/* Left panel */}
      <div className="lc-left-panel">
        <div className="lc-brand">
          <div className="lc-brand-icon"><Code2 size={22} color="#000" /></div>
          <span className="lc-brand-name">LeetCode</span>
        </div>
        <div className="lc-hero-title">
          Level up your<br /><span>coding skills.</span>
        </div>
        <p className="lc-hero-sub">
          Solve DSA problems, track progress, and ace your next interview — all in one place.
        </p>
        <div className="lc-stats">
          <div>
            <div className="lc-stat-num">2000+</div>
            <div className="lc-stat-label">Problems</div>
          </div>
          <div>
            <div className="lc-stat-num">3</div>
            <div className="lc-stat-label">Languages</div>
          </div>
          <div>
            <div className="lc-stat-num">AI</div>
            <div className="lc-stat-label">Tutor</div>
          </div>
        </div>
        <div className="lc-code-decoration">
          <div><span className="kw">function</span> <span className="fn">twoSum</span>(nums, target) {'{'}</div>
          <div>&nbsp;&nbsp;<span className="kw">const</span> map = <span className="kw">new</span> <span className="fn">Map</span>();</div>
          <div>&nbsp;&nbsp;<span className="kw">for</span> (<span className="kw">let</span> i = <span className="num">0</span>; i &lt; nums.length; i++) {'{'}</div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">const</span> diff = target - nums[i];</div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">if</span> (map.<span className="fn">has</span>(diff)) <span className="kw">return</span> [map.<span className="fn">get</span>(diff), i];</div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;map.<span className="fn">set</span>(nums[i], i);</div>
          <div>&nbsp;&nbsp;{'}'}</div>
          <div>{'}'}</div>
        </div>
      </div>

      {/* Right panel */}
      <div className="lc-right-panel">
        <div className="lc-form-card">
          <div className="lc-form-title">Welcome back</div>
          <div className="lc-form-sub">// sign in to continue</div>

          {error && <div className="lc-alert">⚠ {error}</div>}

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="lc-field">
              <label className="lc-label">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                className={`lc-input${errors.emailId ? " err" : ""}`}
                {...register("emailId")}
              />
              {errors.emailId && <div className="lc-err-msg">{errors.emailId.message}</div>}
            </div>

            <div className="lc-field">
              <label className="lc-label">Password</label>
              <div className="lc-input-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className={`lc-input has-icon${errors.password ? " err" : ""}`}
                  {...register("password")}
                />
                <button type="button" className="lc-input-icon" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <div className="lc-err-msg">{errors.password.message}</div>}
            </div>

            <button type="submit" className="lc-btn-primary" disabled={loading}>
              {loading ? <><span className="lc-spinner" />Signing in...</> : "Sign In"}
            </button>
          </form>

          <div className="lc-divider">
            <div className="lc-divider-line" />
            <span className="lc-divider-text">or</span>
            <div className="lc-divider-line" />
          </div>

          <div className="lc-link-row">
            No account?{" "}
            <NavLink to="/signup" className="lc-link">Create one</NavLink>
          </div>
        </div>
      </div>
    </div>
  );
}
