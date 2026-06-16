/* PAGE: Login / Signup
   PURPOSE: Authenticates users into CodeArena — coding practice, mock interviews, ATS resume analysis.
*/

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, NavLink } from "react-router";
import { loginUser, loginGoogle } from "../authSlice";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Terminal, Code2, FileSearch, Video } from "lucide-react";

const loginSchema = z.object({
  emailId: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [activeLine, setActiveLine] = useState(0);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, loading, error } = useSelector((s) => s.auth);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (isAuthenticated) navigate("/");
  }, [isAuthenticated, navigate]);

  // animated terminal lines
  useEffect(() => {
    const id = setInterval(() => setActiveLine((p) => (p + 1) % 5), 1400);
    return () => clearInterval(id);
  }, []);

  const onSubmit = (data) => dispatch(loginUser(data));

  const handleGoogleLogin = (response) => {
    dispatch(loginGoogle(response.credential));
  };

  useEffect(() => {
    const initGoogle = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
          callback: handleGoogleLogin,
        });
        const btnContainer = document.getElementById("google-signin-btn");
        if (btnContainer) {
          window.google.accounts.id.renderButton(btnContainer, {
            theme: "outline",
            size: "large",
            width: 176,
            text: "signin_with",
          });
        }
      }
    };

    initGoogle();
    const interval = setInterval(() => {
      if (window.google) {
        initGoogle();
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [dispatch]);

  const terminalLines = [
    { p: "~/codearena", c: "$ auth --login", t: "cmd" },
    { p: "system", c: "› verifying credentials...", t: "log" },
    { p: "system", c: "› loading 2000+ problems", t: "log" },
    { p: "system", c: "› warming up AI interviewer", t: "log" },
    { p: "system", c: "✓ ready. happy coding!", t: "ok" },
  ];

  return (
    <div className="ca-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Sora:wght@400;600;700;800&display=swap');

        :root {
          --bg: #0a0b10;
          --panel: #11121a;
          --panel-2: #161823;
          --border: #1f2030;
          --border-hi: #2a2c40;
          --text: #e6e6ef;
          --muted: #8a8ba3;
          --faint: #50526a;
          --accent: #6366f1;
          --accent-2: #a855f7;
          --ok: #46d39a;
          --err: #ff5d6c;
        }

        * { box-sizing: border-box; }

        .ca-root {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          font-family: 'Sora', sans-serif;
          display: grid;
          grid-template-columns: 1fr;
          position: relative;
          overflow: hidden;
        }
        @media (min-width: 1024px) {
          .ca-root { grid-template-columns: 1.1fr 1fr; }
        }

        /* ambient background */
        .ca-bg {
          position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 50% 40% at 15% 20%, rgba(99,102,241,0.12), transparent 70%),
            radial-gradient(ellipse 40% 50% at 85% 80%, rgba(168,85,247,0.08), transparent 70%);
        }
        .ca-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(ellipse 80% 60% at 50% 50%, #000 40%, transparent 100%);
        }

        /* ───── LEFT ───── */
        .ca-left {
          display: none;
          position: relative;
          padding: 56px 64px;
          flex-direction: column;
          justify-content: space-between;
          border-right: 1px solid var(--border);
        }
        @media (min-width: 1024px) { .ca-left { display: flex; } }

        .ca-brand {
          display: flex; align-items: center; gap: 12px;
          font-weight: 800; font-size: 20px; letter-spacing: -0.3px;
        }
        .ca-brand-mark {
          width: 38px; height: 38px; border-radius: 10px;
          background: linear-gradient(135deg, var(--accent), #818cf8);
          display: grid; place-items: center; color: #fff;
          box-shadow: 0 8px 30px rgba(99,102,241,0.35);
        }
        .ca-brand-name span { color: var(--accent); }

        .ca-hero h1 {
          font-size: 56px; line-height: 1.05; font-weight: 800;
          letter-spacing: -2px; margin: 0 0 18px;
        }
        .ca-hero h1 .grad {
          background: linear-gradient(90deg, var(--accent), var(--accent-2));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .ca-hero p {
          max-width: 420px; color: var(--muted);
          font-family: 'JetBrains Mono', monospace; font-size: 14px; line-height: 1.7;
        }

        .ca-features {
          display: grid; grid-template-columns: repeat(3,1fr); gap: 14px;
          margin-top: 36px;
        }
        .ca-feat {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px;
          transition: transform .2s, border-color .2s;
        }
        .ca-feat:hover { transform: translateY(-3px); border-color: var(--border-hi); }
        .ca-feat-ico {
          width: 34px; height: 34px; border-radius: 8px;
          display: grid; place-items: center; margin-bottom: 10px;
          background: rgba(255,161,22,0.12); color: var(--accent);
        }
        .ca-feat h4 { margin: 0 0 4px; font-size: 14px; font-weight: 700; }
        .ca-feat p { margin: 0; font-size: 11px; color: var(--faint);
          font-family: 'JetBrains Mono', monospace; }

        /* terminal */
        .ca-term {
          margin-top: 36px;
          background: var(--panel-2);
          border: 1px solid var(--border);
          border-radius: 14px;
          overflow: hidden;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12.5px;
        }
        .ca-term-bar {
          display: flex; align-items: center; gap: 6px;
          padding: 10px 14px; border-bottom: 1px solid var(--border);
          background: rgba(255,255,255,0.02);
        }
        .ca-dot { width: 11px; height: 11px; border-radius: 50%; }
        .ca-dot.r { background: #ff5d5d; }
        .ca-dot.y { background: #ffbd2e; }
        .ca-dot.g { background: #27c93f; }
        .ca-term-title {
          margin-left: 10px; color: var(--faint); font-size: 11px;
        }
        .ca-term-body { padding: 16px 18px; min-height: 150px; }
        .ca-term-line {
          opacity: 0.35; transition: opacity .3s;
          display: flex; gap: 10px; padding: 2px 0;
        }
        .ca-term-line.active { opacity: 1; }
        .ca-term-line .path { color: var(--accent); }
        .ca-term-line.ok .txt { color: var(--ok); }
        .ca-term-line .txt { color: var(--muted); }

        /* ───── RIGHT ───── */
        .ca-right {
          display: flex; align-items: center; justify-content: center;
          padding: 32px 20px; position: relative; z-index: 1;
        }
        .ca-card {
          width: 100%; max-width: 440px;
          background: linear-gradient(180deg, var(--panel), var(--panel-2));
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 36px 32px;
          box-shadow: 0 30px 80px rgba(0,0,0,0.5);
          position: relative;
        }
        .ca-card::before {
          content: ""; position: absolute; inset: -1px;
          border-radius: 20px; padding: 1px;
          background: linear-gradient(135deg, rgba(255,161,22,0.4), transparent 50%, rgba(255,92,138,0.3));
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
          pointer-events: none;
        }

        .ca-card-head { margin-bottom: 28px; }
        .ca-tag {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(255,161,22,0.1); color: var(--accent);
          border: 1px solid rgba(255,161,22,0.25);
          border-radius: 999px; padding: 4px 10px;
          font-size: 11px; font-family: 'JetBrains Mono', monospace;
          margin-bottom: 14px;
        }
        .ca-card h2 {
          margin: 0 0 6px; font-size: 28px; font-weight: 800; letter-spacing: -0.6px;
        }
        .ca-card-sub {
          color: var(--muted); font-size: 13px;
          font-family: 'JetBrains Mono', monospace;
        }

        .ca-field { margin-bottom: 18px; }
        .ca-label {
          display: flex; justify-content: space-between; align-items: center;
          font-size: 11px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: var(--muted);
          margin-bottom: 8px; font-family: 'JetBrains Mono', monospace;
        }
        .ca-label .hint { color: var(--faint); text-transform: none; letter-spacing: 0; }
        .ca-input-wrap { position: relative; }
        .ca-input {
          width: 100%; background: #0c0d15;
          border: 1px solid var(--border-hi);
          border-radius: 12px; padding: 13px 16px; font-size: 14px;
          color: var(--text); outline: none; transition: border-color .2s, box-shadow .2s;
          font-family: 'Sora', sans-serif;
        }
        .ca-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 4px rgba(255,161,22,0.12);
        }
        .ca-input.err { border-color: var(--err); }
        .ca-input.has-icon { padding-right: 46px; }
        .ca-eye {
          position: absolute; right: 12px; top: 50%;
          transform: translateY(-50%); background: none; border: none;
          color: var(--muted); cursor: pointer; padding: 6px; display: flex;
        }
        .ca-eye:hover { color: var(--text); }
        .ca-err {
          font-size: 11px; color: var(--err); margin-top: 6px;
          font-family: 'JetBrains Mono', monospace;
        }
        .ca-alert {
          background: rgba(255,93,108,0.1); border: 1px solid rgba(255,93,108,0.3);
          color: var(--err); border-radius: 12px; padding: 10px 14px;
          font-size: 12.5px; margin-bottom: 18px;
          font-family: 'JetBrains Mono', monospace;
        }

        .ca-btn {
          width: 100%; border: none; cursor: pointer;
          background: linear-gradient(135deg, var(--accent), #ff7a00);
          color: #0a0a0f; font-weight: 700; font-size: 15px;
          padding: 14px; border-radius: 12px;
          font-family: 'Sora', sans-serif; letter-spacing: 0.2px;
          transition: transform .15s, box-shadow .2s, opacity .2s;
          box-shadow: 0 10px 30px rgba(255,161,22,0.25);
          margin-top: 6px;
        }
        .ca-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 14px 36px rgba(255,161,22,0.35); }
        .ca-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .ca-divider {
          display: flex; align-items: center; gap: 12px; margin: 22px 0;
          color: var(--faint); font-size: 11px; font-family: 'JetBrains Mono', monospace;
        }
        .ca-divider::before, .ca-divider::after {
          content: ""; flex: 1; height: 1px; background: var(--border);
        }

        .ca-socials { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .ca-soc {
          background: #0c0d15; border: 1px solid var(--border-hi);
          color: var(--text); border-radius: 10px; padding: 11px;
          font-size: 13px; cursor: pointer; transition: border-color .2s;
          font-family: 'JetBrains Mono', monospace;
        }
        .ca-soc:hover { border-color: var(--accent); }

        .ca-foot {
          text-align: center; margin-top: 22px; font-size: 13px;
          color: var(--muted); font-family: 'JetBrains Mono', monospace;
        }
        .ca-foot a { color: var(--accent); text-decoration: none; font-weight: 600; }
        .ca-foot a:hover { text-decoration: underline; }

        .ca-spin {
          display: inline-block; width: 14px; height: 14px;
          border: 2px solid rgba(0,0,0,0.3); border-top-color: #0a0a0f;
          border-radius: 50%; animation: ca-spin .7s linear infinite;
          vertical-align: middle; margin-right: 8px;
        }
        @keyframes ca-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="ca-bg" />
      <div className="ca-grid" />

      {/* LEFT — brand + features + terminal */}
      <aside className="ca-left">
        <div className="ca-brand">
          <div className="ca-brand-mark"><Code2 size={20} /></div>
          <div className="ca-brand-name">Code<span>Arena</span></div>
        </div>

        <div className="ca-hero">
          <h1>Where coders <span className="grad">level up</span>.</h1>
          <p>// Practice DSA, take AI-powered mock interviews, and score your resume against any job — all in one arena.</p>

          <div className="ca-features">
            <div className="ca-feat">
              <div className="ca-feat-ico"><Terminal size={18} /></div>
              <h4>2000+ Problems</h4>
              <p>DSA · SQL · System Design</p>
            </div>
            <div className="ca-feat">
              <div className="ca-feat-ico"><Video size={18} /></div>
              <h4>AI Mock Interviews</h4>
              <p>Real-time feedback</p>
            </div>
            <div className="ca-feat">
              <div className="ca-feat-ico"><FileSearch size={18} /></div>
              <h4>ATS Resume Scan</h4>
              <p>Beat the bots</p>
            </div>
          </div>

          <div className="ca-term">
            <div className="ca-term-bar">
              <span className="ca-dot r" /><span className="ca-dot y" /><span className="ca-dot g" />
              <span className="ca-term-title">codearena — bash</span>
            </div>
            <div className="ca-term-body">
              {terminalLines.map((l, i) => (
                <div key={i} className={`ca-term-line ${i === activeLine ? "active" : ""} ${l.t === "ok" ? "ok" : ""}`}>
                  <span className="path">{l.p}</span>
                  <span className="txt">{l.c}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: "var(--faint)", fontFamily: "'JetBrains Mono', monospace" }}>
          © {new Date().getFullYear()} CodeArena · built for builders
        </div>
      </aside>

      {/* RIGHT — auth form */}
      <main className="ca-right">
        <div className="ca-card">
          <div className="ca-card-head">
            <div className="ca-tag"><Terminal size={12} /> auth/login.sh</div>
            <h2>Welcome back, dev.</h2>
            <div className="ca-card-sub">// sign in to resume your streak</div>
          </div>

          {error && <div className="ca-alert">⚠ {error}</div>}

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="ca-field">
              <label className="ca-label">Email <span className="hint">required</span></label>
              <div className="ca-input-wrap">
                <input
                  type="email"
                  placeholder="you@example.com"
                  className={`ca-input${errors.emailId ? " err" : ""}`}
                  {...register("emailId")}
                />
              </div>
              {errors.emailId && <div className="ca-err">{errors.emailId.message}</div>}
            </div>

            <div className="ca-field">
              <label className="ca-label">
                Password
                <NavLink to="/forgot" className="hint" style={{ color: "var(--accent)" }}>forgot?</NavLink>
              </label>
              <div className="ca-input-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className={`ca-input has-icon${errors.password ? " err" : ""}`}
                  {...register("password")}
                />
                <button type="button" className="ca-eye" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <div className="ca-err">{errors.password.message}</div>}
            </div>

            <button type="submit" className="ca-btn" disabled={loading}>
              {loading ? <><span className="ca-spin" />Signing in...</> : "Sign In →"}
            </button>
          </form>

          <div className="ca-divider">or continue with</div>

          <div className="ca-socials">
            <button type="button" className="ca-soc">{"<>"} GitHub</button>
            <div id="google-signin-btn" style={{ display: "flex", justifyContent: "center" }}></div>
          </div>

          <div className="ca-foot">
            New to CodeArena?{" "}
            <NavLink to="/signup" className="ca-link">Create account →</NavLink>
          </div>
        </div>
      </main>
    </div>
  );
}
