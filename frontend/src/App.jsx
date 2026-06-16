import { Routes, Route, Navigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { checkAuth } from "./authSlice";
import { useEffect } from "react";
import { Code2 } from "lucide-react";

import Login        from "./pages/Login";
import Signup       from "./pages/Signup";
import Dashboard    from "./pages/Dashboard";
import PracticePage from "./pages/PracticePage";
import LandingPage  from "./pages/LandingPage";
import ProblemPage  from "./pages/ProblemPage";
import ProfilePage  from "./pages/ProfilePage";
import Admin        from "./pages/Admin";
import AdminPanel   from "./components/AdminPanel";
import AdminDelete  from "./components/AdminDelete";
import AdminVideo   from "./components/AdminVideo";
import AdminUpload  from "./components/AdminUpload";
import DuelPage     from "./pages/DuelPage";

// ── Interview pages (integrated from interview app) ───────────────────────────
import InterviewEntry     from "./pages/InterviewEntry";
import InterviewSetup     from "./pages/InterviewSetup";
import InterviewLive      from "./pages/InterviewLive";
import InterviewReport    from "./pages/InterviewReport";
import InterviewHistory   from "./pages/InterviewHistory";
import InterviewCoding    from "./pages/InterviewCoding";
import ATSAnalyzer        from "./pages/ATSAnalyzer";
import InterviewAnalytics from "./pages/InterviewAnalytics";

function App() {
    const dispatch = useDispatch();
    const { isAuthenticated, user, loading } = useSelector((s) => s.auth);

    useEffect(() => { dispatch(checkAuth()); }, [dispatch]);

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
                <div style={{ width: 36, height: 36, background: "var(--accent)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Code2 size={20} color="#000" />
                </div>
                <div style={{ width: 20, height: 20, border: "2px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
            </div>
        );
    }

    const isAdmin = isAuthenticated && user?.role === "admin";

    return (
        <Routes>
            {/* ── Core routes ── */}
            <Route path="/"                        element={isAuthenticated ? <Dashboard />    : <LandingPage />} />
            <Route path="/practice"                element={isAuthenticated ? <PracticePage /> : <Navigate to="/login" />} />
            <Route path="/login"                   element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
            <Route path="/signup"                  element={isAuthenticated ? <Navigate to="/" /> : <Signup />} />
            <Route path="/profile"                 element={isAuthenticated ? <ProfilePage /> : <Navigate to="/login" />} />
            <Route path="/problem/:problemId"      element={isAuthenticated ? <ProblemPage /> : <Navigate to="/login" />} />

            {/* ── Admin routes ── */}
            <Route path="/admin"                   element={isAdmin ? <Admin />       : <Navigate to="/" />} />
            <Route path="/admin/create"            element={isAdmin ? <AdminPanel />  : <Navigate to="/" />} />
            <Route path="/admin/delete"            element={isAdmin ? <AdminDelete /> : <Navigate to="/" />} />
            <Route path="/admin/video"             element={isAdmin ? <AdminVideo />  : <Navigate to="/" />} />
            <Route path="/admin/upload/:problemId" element={isAdmin ? <AdminUpload /> : <Navigate to="/" />} />

            {/* ── Duel route ── */}
            <Route path="/duel"                    element={isAuthenticated ? <DuelPage />        : <Navigate to="/login" />} />

            {/* ── Interview routes ── */}
            {/* /interview        → bridge auth (auto-login to interview backend) */}
            {/* /interview/setup  → Step 1: setup form */}
            {/* /interview/live   → Step 2: live interview with AI */}
            {/* /interview/report → Step 3: report after finishing */}
            {/* /interview/report/:id → report from history */}
            {/* /interview/history → all past interviews */}
            <Route path="/interview"               element={isAuthenticated ? <InterviewEntry />   : <Navigate to="/login" />} />
            <Route path="/interview/setup"         element={isAuthenticated ? <InterviewSetup />   : <Navigate to="/login" />} />
            <Route path="/interview/live"          element={isAuthenticated ? <InterviewLive />    : <Navigate to="/login" />} />
            <Route path="/interview/report"        element={isAuthenticated ? <InterviewReport />  : <Navigate to="/login" />} />
            <Route path="/interview/report/:id"    element={isAuthenticated ? <InterviewReport />  : <Navigate to="/login" />} />
            <Route path="/interview/history"       element={isAuthenticated ? <InterviewHistory /> : <Navigate to="/login" />} />
            <Route path="/interview/analytics"     element={isAuthenticated ? <InterviewAnalytics /> : <Navigate to="/login" />} />
            <Route path="/interview/coding"        element={isAuthenticated ? <InterviewCoding />  : <Navigate to="/login" />} />
            <Route path="/ats"                     element={isAuthenticated ? <ATSAnalyzer />    : <Navigate to="/login" />} />
        </Routes>
    );
}

export default App;