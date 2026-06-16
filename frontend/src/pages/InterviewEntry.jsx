import { useEffect } from "react";
import { useNavigate } from "react-router";
import { BrainCircuit } from "lucide-react";

/**
 * Since both projects are now on the same backend,
 * no bridge auth needed. Just redirect to /interview/setup.
 */
export default function InterviewEntry() {
    const navigate = useNavigate();

    useEffect(() => {
        navigate("/interview/setup", { replace: true });
    }, []);

    return (
        <div style={{ minHeight:"100vh", background:"#1e1e1e", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <BrainCircuit size={32} color="#a855f7"/>
        </div>
    );
}