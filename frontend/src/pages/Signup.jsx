import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router";
import { registerUser, loginGoogle } from "../authSlice";
import { Eye, EyeOff } from "lucide-react";
import "./LandingPage.css";

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
        const btnContainer = document.getElementById("google-signup-btn");
        if (btnContainer) {
          window.google.accounts.id.renderButton(btnContainer, {
            theme: "outline",
            size: "large",
            width: 176,
            text: "signup_with",
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

  return (
    <div className="landing-page">
      <div className="lp-page">
        <div className="lp-bg-layer lp-bg-grid" />
        <div className="lp-bg-layer lp-bg-hero-glow" />

        <Link to="/" className="lp-top-brand" style={{ textDecoration: "none", color: "inherit" }}>
          <span className="lp-brand-mark lp-bg-gradient-to-br-primary">{"<<>"}</span>
          <span className="lp-brand-name">CodeArena</span>
        </Link>

        <div className="lp-card">
          <span className="lp-eyebrow">
            <span className="lp-eyebrow-dot" />
            Create your account
          </span>

          <h1 className="lp-title">
            Start coding.{" "}
            <span className="lp-bg-gradient-to-br-primary lp-bg-clip-text lp-text-transparent">
              Land the offer.
            </span>
          </h1>
          <p className="lp-subtitle">
            Join CodeArena to practice problems, simulate AI interviews, and beat the ATS.
          </p>

          {error && <div className="lp-alert">⚠ {error}</div>}

          <form className="lp-form" onSubmit={handleSubmit(onSubmit)}>
            <div className="lp-field">
              <label className="lp-label" htmlFor="firstName">Full name</label>
              <input
                id="firstName"
                type="text"
                className={`lp-input${errors.firstName ? " err" : ""}`}
                placeholder="Ada Lovelace"
                {...register("firstName")}
              />
              {errors.firstName && <div className="lp-err">{errors.firstName.message}</div>}
            </div>

            <div className="lp-field">
              <label className="lp-label" htmlFor="emailId">Work email</label>
              <input
                id="emailId"
                type="email"
                className={`lp-input${errors.emailId ? " err" : ""}`}
                placeholder="you@company.com"
                {...register("emailId")}
              />
              {errors.emailId && <div className="lp-err">{errors.emailId.message}</div>}
            </div>

            <div className="lp-field">
              <label className="lp-label" htmlFor="password">Password</label>
              <div className="lp-input-wrap" style={{ position: "relative" }}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className={`lp-input${errors.password ? " err" : ""}`}
                  placeholder="At least 8 characters"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--lp-muted-foreground)",
                    cursor: "pointer",
                    padding: "6px",
                    display: "flex",
                    alignItems: "center"
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <div className="lp-err">{errors.password.message}</div>}
            </div>

            <button type="submit" className="lp-btn lp-btn-primary lp-btn-full" style={{ marginTop: "0.25rem" }} disabled={loading}>
              {loading ? <><span className="lp-spin" />Creating account...</> : "Create account →"}
            </button>
          </form>

          <div className="lp-divider">OR CONTINUE WITH</div>

          <div className="lp-oauth">
            <div id="google-signup-btn" style={{ display: "flex", justifyContent: "center" }}></div>
            <button type="button" className="lp-btn lp-btn-ghost">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2 1-.3 2-.4 3-.4s2 .1 3 .4c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.3.8 1 .8 2v3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z"/>
              </svg>
              GitHub
            </button>
          </div>

          <p className="lp-meta">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
          <p className="lp-fineprint">
            By creating an account, you agree to our <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
