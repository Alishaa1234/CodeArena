import { Routes, Route, Navigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { checkAuth } from "./authSlice";
import { useEffect } from "react";
import { Code2 } from "lucide-react";

import Login        from "./pages/Login";
import Signup       from "./pages/Signup";
import Homepage     from "./pages/Homepage";
import ProblemPage  from "./pages/ProblemPage";
import ProfilePage  from "./pages/ProfilePage";
import Admin        from "./pages/Admin";
import AdminPanel   from "./components/AdminPanel";
import AdminDelete  from "./components/AdminDelete";
import AdminVideo   from "./components/AdminVideo";
import AdminUpload  from "./components/AdminUpload";
import DuelPage from "./pages/DuelPage";




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
            <Route path="/"                        element={isAuthenticated ? <Homepage />    : <Navigate to="/signup" />} />
            <Route path="/login"                   element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
            <Route path="/signup"                  element={isAuthenticated ? <Navigate to="/" /> : <Signup />} />
            <Route path="/profile"                 element={isAuthenticated ? <ProfilePage /> : <Navigate to="/login" />} /> 
            <Route path="/problem/:problemId"      element={isAuthenticated ? <ProblemPage /> : <Navigate to="/login" />} />
            <Route path="/admin"                   element={isAdmin ? <Admin />       : <Navigate to="/" />} />
            <Route path="/admin/create"            element={isAdmin ? <AdminPanel />  : <Navigate to="/" />} />
            <Route path="/admin/delete"            element={isAdmin ? <AdminDelete /> : <Navigate to="/" />} />
            <Route path="/admin/video"             element={isAdmin ? <AdminVideo />  : <Navigate to="/" />} />
            <Route path="/admin/upload/:problemId" element={isAdmin ? <AdminUpload /> : <Navigate to="/" />} />
            <Route path="/duel" element={isAuthenticated ? <DuelPage /> : <Navigate to="/login" />} />

            
        </Routes>
    );
}

export default App;