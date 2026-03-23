import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { useParams, NavLink } from "react-router";
import axiosClient from "../utils/axiosClient";
import SubmissionHistory from "../components/SubmissionHistory";
import ChatAi from "../components/ChatAi";
import Editorial from "../components/Editorial";
import HintPanel from "../components/HintPanel";
import {
  Play, Send, ChevronLeft, Terminal, Clock, MemoryStick,
  CheckCircle2, XCircle, Bot, FileText, History, Video,
  Code, Lightbulb, ChevronDown, ChevronUp, Maximize2
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";

const LANG_LABELS = { javascript: "JavaScript", java: "Java", cpp: "C++" };
const LANG_ID     = { cpp: "cpp", java: "java", javascript: "javascript" };
const BACKEND_LANG = { javascript: "javascript", java: "java", cpp: "c++" };

const DIFF = {
  easy:   { color: "#00b8a3", bg: "rgba(0,184,163,0.1)",  label: "Easy"   },
  medium: { color: "#ffc01e", bg: "rgba(255,192,30,0.1)", label: "Medium" },
  hard:   { color: "#ff375f", bg: "rgba(255,55,95,0.1)",  label: "Hard"   },
};

const TABS = [
  { id: "description", icon: <FileText  size={13} />, label: "Description"  },
  { id: "hints",       icon: <Lightbulb size={13} />, label: "Hints"        },
  { id: "editorial",   icon: <Video     size={13} />, label: "Editorial"    },
  { id: "solutions",   icon: <Code      size={13} />, label: "Solutions"    },
  { id: "submissions", icon: <History   size={13} />, label: "Submissions"  },
  { id: "chat",        icon: <Bot       size={13} />, label: "AI Tutor"     },
];

export default function ProblemPage() {
  const { problemId } = useParams();
  // Sync with global theme toggle via DOM class
  const [isDark, setIsDark] = useState(
      !document.documentElement.classList.contains('light')
  );
  useEffect(() => {
      const observer = new MutationObserver(() => {
          setIsDark(!document.documentElement.classList.contains('light'));
      });
      observer.observe(document.documentElement, {
          attributes: true, attributeFilter: ['class']
      });
      return () => observer.disconnect();
  }, []);

  const [problem,      setProblem]      = useState(null);
  const [lang,         setLang]         = useState("javascript");
  const [codeByLang,   setCodeByLang]   = useState({ javascript: "", java: "", cpp: "" });
  const code = codeByLang[lang] || "";

  const [loading,      setLoading]      = useState(false);
  const [pageLoading,  setPageLoading]  = useState(true);
  const [runResult,    setRunResult]    = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [leftTab,      setLeftTab]      = useState("description");
  const [consoleOpen,  setConsoleOpen]  = useState(false);
  const [consoleTab,   setConsoleTab]   = useState("testcase");
  const [aiReview,     setAiReview]     = useState(null);
  const [reviewing,    setReviewing]    = useState(false);
  const editorRef = useRef(null);

  // Fetch problem
  useEffect(() => {
    const fetchProblem = async () => {
      setPageLoading(true);
      try {
        const { data } = await axiosClient.get(`/problem/problemById/${problemId}`);
        setProblem(data);
        const starterByLang = { javascript: "", java: "", cpp: "" };
        const map = { javascript: "javascript", java: "java", "c++": "cpp" };
        (data.startCode || []).forEach((s) => {
          const k = map[s.language];
          if (k) starterByLang[k] = s.initialCode || "";
        });
        setCodeByLang(starterByLang);
      } catch (e) { console.error(e); }
      finally { setPageLoading(false); }
    };
    fetchProblem();
  }, [problemId]);

  const handleRun = async () => {
    setLoading(true); setRunResult(null);
    setConsoleOpen(true); setConsoleTab("testcase");
    try {
      const { data } = await axiosClient.post(`/submission/run/${problemId}`, { code, language: lang });
      setRunResult(data);
    } catch (e) {
      setRunResult({ success: false, testCases: [], error: e.displayMessage });
    } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    setLoading(true); setSubmitResult(null); setAiReview(null);
    setConsoleOpen(true); setConsoleTab("result");
    try {
      const { data } = await axiosClient.post(`/submission/submit/${problemId}`, { code, language: lang });
      setSubmitResult(data);
      setReviewing(true);
      setConsoleTab("review");
      axiosClient.post(`/agent/review/${problemId}`, { code, language: lang, accepted: data.accepted })
        .then(({ data: r }) => setAiReview(r))
        .catch((e) => console.error("Agent review failed:", e.message))
        .finally(() => setReviewing(false));
    } catch (e) {
      setSubmitResult({ accepted: false, error: e.displayMessage });
    } finally { setLoading(false); }
  };

  if (pageLoading) return (
    <div style={{ minHeight: "100vh", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#ffa116", fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>Loading...</div>
    </div>
  );

  const ds = DIFF[problem?.difficulty] || DIFF.easy;
  const tags = Array.isArray(problem?.tags) ? problem.tags : [];
  const testCases = runResult?.testCases || runResult?.testcases || [];

  const testCasePassed = (tc) => {
    if (typeof tc?.passed === "boolean") return tc.passed;
    const s = tc?.status_id ?? tc?.statusId;
    if (s != null) return s === 3 || s === "3";
    return false;
  };

  const CONSOLE_HEIGHT = consoleOpen ? 260 : 0;
  const editorH = `calc(100vh - 46px - 40px - ${CONSOLE_HEIGHT}px - 44px)`;


  return (
    <div style={{ minHeight: "100vh", fontFamily: "'Syne', sans-serif", background: isDark ? "#1a1a1a" : "#ffffff", color: isDark ? "#eff1f6" : "#1a1a1a", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${isDark ? "#3a3a3a" : "#d4d4d4"}; border-radius: 3px; }

        .lc-topbar {
          height: 46px;
          background: ${isDark ? "#282828" : "#f7f8fa"};
          border-bottom: 1px solid ${isDark ? "#3a3a3a" : "#e5e7eb"};
          display: flex; align-items: center;
          padding: 0 16px; gap: 12px;
          position: sticky; top: 0; z-index: 100;
          flex-shrink: 0;
        }
        .lc-back {
          display: inline-flex; align-items: center; gap: 5px;
          color: ${isDark ? "#8d8d8d" : "#6b7280"};
          text-decoration: none; font-size: 12px;
          font-family: 'JetBrains Mono', monospace;
          padding: 5px 8px; border-radius: 6px;
          transition: all 0.15s;
        }
        .lc-back:hover { color: ${isDark ? "#fff" : "#111"}; background: ${isDark ? "#3a3a3a" : "#e5e7eb"}; }
        .lc-topbar-title {
          font-size: 14px; font-weight: 700;
          color: ${isDark ? "#eff1f6" : "#1a1a1a"};
          flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .lc-diff-badge {
          display: inline-flex; align-items: center;
          padding: 3px 10px; border-radius: 999px;
          font-size: 12px; font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
        }

        /* Body split */
        .lc-body {
          flex: 1; display: flex; overflow: hidden;
          height: calc(100vh - 46px);
        }

        /* Left panel */
        .lc-left {
          width: 460px; min-width: 300px; max-width: 600px;
          display: flex; flex-direction: column;
          border-right: 1px solid ${isDark ? "#3a3a3a" : "#e5e7eb"};
          background: ${isDark ? "#1a1a1a" : "#ffffff"};
          overflow: hidden;
        }
        .lc-tabs {
          height: 40px; display: flex; align-items: center;
          border-bottom: 1px solid ${isDark ? "#3a3a3a" : "#e5e7eb"};
          background: ${isDark ? "#282828" : "#f7f8fa"};
          overflow-x: auto; flex-shrink: 0;
          scrollbar-width: none;
        }
        .lc-tabs::-webkit-scrollbar { display: none; }
        .lc-tab {
          height: 40px; padding: 0 14px;
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 600;
          color: ${isDark ? "#8d8d8d" : "#6b7280"};
          background: none; border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer; white-space: nowrap;
          transition: all 0.15s;
        }
        .lc-tab:hover { color: ${isDark ? "#eff1f6" : "#111"}; }
        .lc-tab.active { color: #ffa116; border-bottom-color: #ffa116; }

        .lc-left-body { flex: 1; overflow-y: auto; padding: 20px 24px; }

        /* Problem meta */
        .lc-problem-title { font-size: 19px; font-weight: 800; margin-bottom: 12px; line-height: 1.3; }
        .lc-meta-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
        .lc-tag {
          display: inline-flex; padding: 3px 10px; border-radius: 999px;
          font-size: 12px; font-weight: 600;
          font-family: 'JetBrains Mono', monospace;
          background: ${isDark ? "#3a3a3a" : "#f0f0f0"};
          color: ${isDark ? "#a8a8a8" : "#555"};
        }
        .lc-pts-badge {
          display: inline-flex; padding: 3px 10px; border-radius: 999px;
          font-size: 12px; font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          background: rgba(255,161,22,0.12); color: #ffa116;
        }
        .lc-desc {
          font-size: 14px; line-height: 1.8;
          color: ${isDark ? "#c9ccd3" : "#3d3d3d"};
          white-space: pre-wrap;
        }
        .lc-example {
          background: ${isDark ? "#282828" : "#f7f8fa"};
          border: 1px solid ${isDark ? "#3a3a3a" : "#e5e7eb"};
          border-radius: 10px; padding: 14px 16px; margin-bottom: 12px;
          font-family: 'JetBrains Mono', monospace; font-size: 13px;
        }
        .lc-example-label { font-size: 11px; color: ${isDark ? "#8d8d8d" : "#888"}; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; font-weight: 700; }
        .lc-example-row { display: flex; gap: 8px; margin-bottom: 4px; }
        .lc-example-key { color: ${isDark ? "#8d8d8d" : "#888"}; min-width: 90px; }
        .lc-example-val { color: ${isDark ? "#eff1f6" : "#111"}; }
        .lc-section-title {
          font-size: 12px; font-weight: 800;
          color: ${isDark ? "#8d8d8d" : "#888"};
          text-transform: uppercase; letter-spacing: 0.1em;
          font-family: 'JetBrains Mono', monospace;
          margin: 20px 0 10px;
        }

        /* Right panel */
        .lc-right { flex: 1; display: flex; flex-direction: column; min-width: 0; background: ${isDark ? "#1e1e1e" : "#fafafa"}; }

        /* Lang bar */
        .lc-langbar {
          height: 40px; display: flex; align-items: center; gap: 6px;
          padding: 0 12px;
          background: ${isDark ? "#282828" : "#f7f8fa"};
          border-bottom: 1px solid ${isDark ? "#3a3a3a" : "#e5e7eb"};
          flex-shrink: 0;
        }
        .lc-lang-btn {
          padding: 4px 12px; border-radius: 6px;
          font-size: 12px; font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          background: none;
          border: 1px solid ${isDark ? "#3a3a3a" : "#e5e7eb"};
          color: ${isDark ? "#8d8d8d" : "#6b7280"};
          cursor: pointer; transition: all 0.15s;
        }
        .lc-lang-btn:hover { border-color: #ffa116; color: #ffa116; }
        .lc-lang-btn.active { border-color: #ffa116; color: #ffa116; background: rgba(255,161,22,0.1); }
        .lc-langbar-right { margin-left: auto; display: flex; align-items: center; gap: 8px; }

        /* Console area */
        .lc-console {
          border-top: 1px solid ${isDark ? "#3a3a3a" : "#e5e7eb"};
          background: ${isDark ? "#1a1a1a" : "#ffffff"};
          display: flex; flex-direction: column;
          flex-shrink: 0;
          transition: height 0.2s ease;
        }
        .lc-console-tabs {
          height: 36px; display: flex; align-items: center;
          padding: 0 8px;
          border-bottom: 1px solid ${isDark ? "#3a3a3a" : "#e5e7eb"};
          flex-shrink: 0;
        }
        .lc-console-tab {
          height: 36px; padding: 0 12px;
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 700;
          color: ${isDark ? "#8d8d8d" : "#6b7280"};
          background: none; border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer; white-space: nowrap;
          transition: all 0.15s;
        }
        .lc-console-tab.active { color: #ffa116; border-bottom-color: #ffa116; }
        .lc-console-body { flex: 1; overflow-y: auto; padding: 12px 16px; min-height: 0; }
        .lc-console-spacer { flex: 1; }
        .lc-console-close {
          background: none; border: none;
          color: ${isDark ? "#8d8d8d" : "#999"};
          cursor: pointer; height: 36px; width: 32px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 6px; font-size: 16px; transition: all 0.15s;
        }
        .lc-console-close:hover { color: ${isDark ? "#fff" : "#111"}; background: ${isDark ? "#3a3a3a" : "#e5e7eb"}; }

        /* Action bar */
        .lc-actionbar {
          height: 44px;
          background: ${isDark ? "#282828" : "#f7f8fa"};
          border-top: 1px solid ${isDark ? "#3a3a3a" : "#e5e7eb"};
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 14px; flex-shrink: 0;
        }
        .lc-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 7px 16px; border-radius: 8px;
          font-size: 13px; font-weight: 700;
          font-family: 'Syne', sans-serif;
          cursor: pointer; transition: all 0.15s;
          border: 1px solid ${isDark ? "#3a3a3a" : "#e5e7eb"};
          background: none;
          color: ${isDark ? "#c9ccd3" : "#444"};
        }
        .lc-btn:hover:not(:disabled) { border-color: ${isDark ? "#555" : "#bbb"}; color: ${isDark ? "#fff" : "#111"}; }
        .lc-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .lc-btn-submit {
          background: #ffa116; border-color: #ffa116; color: #000;
        }
        .lc-btn-submit:hover:not(:disabled) { background: #ffb84d; border-color: #ffb84d; }
        .lc-btn-accepted { background: #00b8a3; border-color: #00b8a3; color: #000; }
        .lc-console-toggle {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 7px 14px; border-radius: 8px;
          font-size: 13px; font-weight: 700;
          border: 1px solid ${isDark ? "#3a3a3a" : "#e5e7eb"};
          background: none; cursor: pointer;
          color: ${isDark ? "#8d8d8d" : "#6b7280"};
          transition: all 0.15s;
        }
        .lc-console-toggle:hover { color: ${isDark ? "#fff" : "#111"}; border-color: ${isDark ? "#555" : "#bbb"}; }

        /* Result cards */
        .lc-spinner { width:14px; height:14px; border:2px solid rgba(255,161,22,0.2); border-top-color:#ffa116; border-radius:50%; animation:lc-spin 0.7s linear infinite; flex-shrink: 0; }
        @keyframes lc-spin { to { transform: rotate(360deg); } }
        .lc-status-accept { color: #00b8a3; font-weight: 800; font-size: 16px; }
        .lc-status-reject { color: #ff375f; font-weight: 800; font-size: 16px; }
        .lc-tc-card {
          background: ${isDark ? "#282828" : "#f7f8fa"};
          border: 1px solid ${isDark ? "#3a3a3a" : "#e5e7eb"};
          border-radius: 10px; padding: 12px 14px; margin-bottom: 10px;
          font-family: 'JetBrains Mono', monospace; font-size: 12px;
        }
        .lc-tc-row { display: flex; gap: 10px; margin-bottom: 5px; align-items: flex-start; }
        .lc-tc-key { min-width: 80px; color: ${isDark ? "#8d8d8d" : "#888"}; }
        .lc-pre { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; color: ${isDark ? "#c9ccd3" : "#333"}; line-height: 1.6; }
        .lc-pass-badge { display:inline-flex; align-items:center; gap:5px; padding:3px 8px; border-radius:999px; font-size:11px; font-weight:700; font-family:'JetBrains Mono',monospace; }
        .lc-pass { background:rgba(0,184,163,0.1); color:#00b8a3; }
        .lc-fail { background:rgba(255,55,95,0.1); color:#ff375f; }
        .lc-kv-row { display:flex; gap:16px; flex-wrap:wrap; margin-top: 12px; }
        .lc-kv { background:${isDark ? "#282828" : "#f7f8fa"}; border:1px solid ${isDark ? "#3a3a3a" : "#e5e7eb"}; border-radius:10px; padding:10px 14px; min-width:120px; font-family:'JetBrains Mono',monospace; }
        .lc-kv-k { font-size:11px; color:${isDark ? "#8d8d8d" : "#888"}; text-transform:uppercase; letter-spacing:0.08em; font-weight:700; }
        .lc-kv-v { font-size:14px; font-weight:800; margin-top:4px; color:${isDark ? "#eff1f6" : "#111"}; }
        .lc-review-body { font-size:13px; color:${isDark ? "#c9ccd3" : "#444"}; line-height:1.8; white-space:pre-wrap; font-family:'JetBrains Mono',monospace; }
        .lc-review-meta { font-size:11px; color:#ffa116; font-family:'JetBrains Mono',monospace; margin-bottom:10px; font-weight:700; }
        .lc-review-fix-title { font-size:11px; font-weight:800; color:${isDark ? "#8d8d8d" : "#888"}; font-family:'JetBrains Mono',monospace; text-transform:uppercase; letter-spacing:0.08em; margin:14px 0 6px; }
        .lc-review-code { background:${isDark ? "#282828" : "#f7f8fa"}; border:1px solid ${isDark ? "#3a3a3a" : "#e5e7eb"}; border-radius:8px; padding:12px; font-size:12px; font-family:'JetBrains Mono',monospace; color:${isDark ? "#c9ccd3" : "#333"}; overflow-x:auto; white-space:pre-wrap; }
        .lc-empty { color:${isDark ? "#8d8d8d" : "#999"}; font-family:'JetBrains Mono',monospace; font-size:12px; padding:8px 0; }
        .lc-solution-lang { padding:3px 10px; border-radius:6px; font-size:12px; font-weight:700; background:rgba(255,161,22,0.12); color:#ffa116; font-family:'JetBrains Mono',monospace; display:inline-block; margin-bottom:10px; }
        .lc-solution-code { background:${isDark ? "#282828" : "#f7f8fa"}; border:1px solid ${isDark ? "#3a3a3a" : "#e5e7eb"}; border-radius:10px; padding:16px; font-size:13px; font-family:'JetBrains Mono',monospace; color:${isDark ? "#c9ccd3" : "#333"}; line-height:1.7; overflow-x:auto; white-space:pre-wrap; }
      `}</style>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="lc-topbar">
        <NavLink to="/" className="lc-back"><ChevronLeft size={14} />Problems</NavLink>
        <div className="lc-topbar-title">{problem.title}</div>
        <span className="lc-diff-badge" style={{ color: ds.color, background: ds.bg }}>
          {ds.label}
        </span>
        {problem.points != null && (
          <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", background: "rgba(255,161,22,0.12)", color: "#ffa116" }}>
            {problem.points} pts
          </span>
        )}
        <ThemeToggle />
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="lc-body">

        {/* ── Left panel ───────────────────────────────────────────────── */}
        <div className="lc-left">
          <div className="lc-tabs">
            {TABS.map(({ id, icon, label }) => (
              <button key={id} className={`lc-tab${leftTab === id ? " active" : ""}`} onClick={() => setLeftTab(id)}>
                {icon}{label}
              </button>
            ))}
          </div>

          <div className="lc-left-body">

            {/* Description */}
            {leftTab === "description" && (
              <div>
                <div className="lc-problem-title">{problem.title}</div>
                <div className="lc-meta-row">
                  <span className="lc-diff-badge" style={{ color: ds.color, background: ds.bg }}>{ds.label}</span>
                  {problem.points != null && <span className="lc-pts-badge">{problem.points} pts</span>}
                  {tags.map(t => <span key={t} className="lc-tag">{t}</span>)}
                </div>
                <div className="lc-desc">{problem.description}</div>

                {problem.constraints?.length > 0 && (
                  <>
                    <div className="lc-section-title">Constraints</div>
                    <ul style={{ margin:"0 0 20px", paddingLeft:20, display:"flex", flexDirection:"column", gap:6 }}>
                      {problem.constraints.map((con, i) => (
                        <li key={i} style={{ fontSize:13, fontFamily:"'JetBrains Mono',monospace", color:"var(--lc-text-secondary,#a1a1aa)", lineHeight:1.7 }}>
                          {con}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {problem.visibleTestCases?.length > 0 && (
                  <>
                    <div className="lc-section-title">Examples</div>
                    {problem.visibleTestCases.map((ex, i) => (
                      <div key={i} className="lc-example">
                        <div className="lc-example-label">Example {i + 1}</div>
                        <div className="lc-example-row">
                          <span className="lc-example-key">Input:</span>
                          <span className="lc-example-val">{ex.input}</span>
                        </div>
                        <div className="lc-example-row">
                          <span className="lc-example-key">Output:</span>
                          <span className="lc-example-val">{ex.output}</span>
                        </div>
                        {ex.explanation && (
                          <div className="lc-example-row" style={{ marginBottom: 0 }}>
                            <span className="lc-example-key">Explanation:</span>
                            <span className="lc-example-val">{ex.explanation}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {leftTab === "hints"       && <HintPanel problemId={problemId} />}
            {leftTab === "editorial"   && (
              problem?.secureUrl
                ? <Editorial secureUrl={problem.secureUrl} thumbnailUrl={problem.thumbnailUrl} duration={problem.duration} />
                : <div className="lc-empty">No editorial video available yet.</div>
            )}
            {leftTab === "solutions"   && (
              problem?.referenceSolution?.length > 0
                ? problem.referenceSolution.map((sol, i) => (
                    <div key={i} style={{ marginBottom: 24 }}>
                      <div className="lc-solution-lang">{sol.language}</div>
                      <pre className="lc-solution-code">{sol.completeCode}</pre>
                    </div>
                  ))
                : <div className="lc-empty">Solutions are locked. Solve the problem first.</div>
            )}
            {leftTab === "submissions" && <SubmissionHistory problemId={problemId} />}
            {leftTab === "chat"        && <ChatAi problem={problem} />}
          </div>
        </div>

        {/* ── Right panel ──────────────────────────────────────────────── */}
        <div className="lc-right">

          {/* Lang bar */}
          <div className="lc-langbar">
            {["javascript", "java", "cpp"].map((l) => (
              <button key={l} className={`lc-lang-btn${lang === l ? " active" : ""}`} onClick={() => setLang(l)}>
                {LANG_LABELS[l]}
              </button>
            ))}
            <div className="lc-langbar-right">
              {problem.points != null && (
                <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "#ffa116", fontWeight: 700 }}>
                  {problem.difficulty} · {problem.points}pts
                </span>
              )}
            </div>
          </div>

          {/* Monaco editor */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <Editor
              height={editorH}
              language={LANG_ID[lang]}
              value={code}
              onChange={(v) => setCodeByLang((prev) => ({ ...prev, [lang]: v || "" }))}
              onMount={(e, monaco) => {
                editorRef.current = e;
                e.focus();
                e.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {});
                e.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyA, () => {
                  e.trigger("keyboard", "editor.action.selectAll", null);
                });
              }}
              theme={isDark ? "vs-dark" : "vs"}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: "on",
                lineNumbers: "on",
                renderLineHighlight: "line",
                fontFamily: "'JetBrains Mono', monospace",
                fontLigatures: true,
                padding: { top: 14 },
                fixedOverflowWidgets: true,
              }}
            />
          </div>

          {/* Console panel */}
          {consoleOpen && (
            <div className="lc-console" style={{ height: CONSOLE_HEIGHT }}>
              <div className="lc-console-tabs">
                {[
                  { id: "testcase", label: "Test results",   show: !!runResult              },
                  { id: "result",   label: "Submit result",  show: !!submitResult           },
                  { id: "review",   label: "AI review",      show: reviewing || !!aiReview  },
                ].filter(t => t.show).map(({ id, label }) => (
                  <button key={id} className={`lc-console-tab${consoleTab === id ? " active" : ""}`} onClick={() => setConsoleTab(id)}>
                    {id === "review" && reviewing && <span className="lc-spinner" />}
                    {label}{id === "review" && reviewing ? " ..." : ""}
                  </button>
                ))}
                <div className="lc-console-spacer" />
                <button className="lc-console-close" onClick={() => setConsoleOpen(false)}>×</button>
              </div>

              <div className="lc-console-body">

                {/* Test results */}
                {consoleTab === "testcase" && (
                  <div>
                    {loading && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ffa116", fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>
                        <span className="lc-spinner" />Running...
                      </div>
                    )}
                    {!loading && runResult && (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                          <span className={`lc-pass-badge ${runResult.success ? "lc-pass" : "lc-fail"}`}>
                            {runResult.success ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                            {runResult.success ? "All visible tests passed" : "Some tests failed"}
                          </span>
                        </div>
                        {testCases.map((tc, i) => {
                          const passed   = testCasePassed(tc);
                          const input    = tc?.stdin    ?? tc?.input    ?? "—";
                          const expected = tc?.expected_output ?? tc?.expected ?? "—";
                          const output   = tc?.stdout   ?? tc?.stderr   ?? tc?.output ?? "—";
                          return (
                            <div key={i} className="lc-tc-card">
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? "#8d8d8d" : "#888", fontFamily: "'JetBrains Mono',monospace" }}>Test {i + 1}</span>
                                <span className={`lc-pass-badge ${passed ? "lc-pass" : "lc-fail"}`}>
                                  {passed ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                                  {passed ? "Passed" : "Failed"}
                                </span>
                              </div>
                              <div className="lc-tc-row"><span className="lc-tc-key">Input</span><pre className="lc-pre">{input}</pre></div>
                              <div className="lc-tc-row"><span className="lc-tc-key">Expected</span><pre className="lc-pre">{expected}</pre></div>
                              <div className="lc-tc-row" style={{ marginBottom: 0 }}><span className="lc-tc-key">Output</span><pre className="lc-pre">{output}</pre></div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}

                {/* Submit result */}
                {consoleTab === "result" && (
                  <div>
                    {loading && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ffa116", fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>
                        <span className="lc-spinner" />Submitting...
                      </div>
                    )}
                    {!loading && submitResult && (
                      <>
                        <div className={submitResult.accepted ? "lc-status-accept" : "lc-status-reject"} style={{ marginBottom: 8 }}>
                          {submitResult.accepted ? "✓ Accepted" : "✗ " + (submitResult.error || "Wrong Answer")}
                        </div>
                        {submitResult.passedTestCases != null && (
                          <div style={{ fontSize: 13, color: isDark ? "#8d8d8d" : "#888", fontFamily: "'JetBrains Mono',monospace", marginBottom: 4 }}>
                            {submitResult.passedTestCases} / {submitResult.totalTestCases} test cases passed
                          </div>
                        )}
                        <div className="lc-kv-row">
                          <div className="lc-kv">
                            <div className="lc-kv-k">Runtime</div>
                            <div className="lc-kv-v">{submitResult.runtime != null ? `${Number(submitResult.runtime).toFixed(3)}s` : "—"}</div>
                          </div>
                          <div className="lc-kv">
                            <div className="lc-kv-k">Memory</div>
                            <div className="lc-kv-v">{submitResult.memory != null ? `${submitResult.memory} KB` : "—"}</div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* AI Review */}
                {consoleTab === "review" && (
                  <div>
                    {reviewing && (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ffa116", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, marginBottom: 8 }}>
                          <span className="lc-spinner" />Agent is running your code and analyzing it...
                        </div>
                        <div className="lc-empty">This takes 15–30 seconds. The agent runs your code, reasons about failures, and verifies a fix.</div>
                      </div>
                    )}
                    {!reviewing && aiReview && (
                      <div>
                        <div className="lc-review-meta">
                          ✨ AI Agent · {aiReview.iterations} iteration{aiReview.iterations !== 1 ? "s" : ""} · {aiReview.passedCount}/{aiReview.totalCount} visible tests
                        </div>
                        <div className="lc-review-body">{aiReview.review}</div>
                        {aiReview.fixedCode && (
                          <>
                            <div className="lc-review-fix-title">Agent-verified fix</div>
                            <pre className="lc-review-code">{aiReview.fixedCode}</pre>
                          </>
                        )}
                      </div>
                    )}
                    {!reviewing && !aiReview && (
                      <div className="lc-empty">Submit your code to get an AI agent review.</div>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}

          {/* Action bar */}
          <div className="lc-actionbar">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button className="lc-btn" onClick={handleRun} disabled={loading}>
                <Play size={13} />Run
              </button>
              <button
                className={`lc-btn ${submitResult?.accepted ? "lc-btn-accepted" : "lc-btn-submit"}`}
                onClick={handleSubmit}
                disabled={loading || !!submitResult?.accepted}
              >
                <Send size={13} />
                {submitResult?.accepted ? "Accepted ✓" : "Submit"}
              </button>
            </div>
            <button className="lc-console-toggle" onClick={() => setConsoleOpen((v) => !v)}>
              <Terminal size={13} />Console
              {consoleOpen ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}