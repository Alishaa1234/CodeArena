import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import axiosClient from "../utils/axiosClient";
import { getSocket, disconnectSocket } from "../socket/socket";
import {
    duelStarted,
    setOpponent,
    updateOppProgress,
    problemSolved,
    receiveTaunt,
    opponentAbandoned,
    fetchRecap,
    resetDuel,
} from "../store/duelSlice";

import DuelLobby   from "../components/DuelLobby";
import DuelBattle  from "../components/DuelBattle";
import DuelRecap   from "../components/DuelRecap";
import DuelWaiting from "../components/DuelWaiting";

export default function DuelPage() {
    const dispatch  = useDispatch();
    const navigate  = useNavigate();
    const socketRef = useRef(null);
    const { screen, roomCode } = useSelector((s) => s.duel);
    const { user }             = useSelector((s) => s.auth);

    useEffect(() => {
        let mounted = true;

        const initSocket = async () => {
            try {
                const { data } = await axiosClient.get('/user/get-token');
                if (!mounted) return;

                const socket = getSocket(data.token);
                socketRef.current = socket;

                // ── duel:start ────────────────────────────────────────────────
                socket.on('duel:start', (payload) => {
                    dispatch(duelStarted(payload));
                    dispatch(setOpponent(payload.opponent));
                });

                // ── duel:opponent-status ──────────────────────────────────────
                // Opponent ran code — update their per-problem progress bar
                socket.on('duel:opponent-status', ({ problemId, testsPassed, totalTests }) => {
                    dispatch(updateOppProgress({ problemId, testsPassed, totalTests }));
                });

                // ── duel:problem-solved ───────────────────────────────────────
                // Someone got AC on a problem — update points for the right player
                socket.on('duel:problem-solved', (payload) => {
                    const myId = user?._id?.toString();
                    dispatch(problemSolved({
                        ...payload,
                        isMe: payload.userId === myId,
                    }));
                });

                // ── duel:finished ─────────────────────────────────────────────
                // Battle over (AC win, early end, or timeout) — fetch recap
                socket.on('duel:finished', () => {
                    if (roomCode) dispatch(fetchRecap(roomCode));
                });

                // ── duel:taunt ────────────────────────────────────────────────
                socket.on('duel:taunt', (payload) => {
                    dispatch(receiveTaunt(payload));
                });

                // ── duel:opponent-abandoned ───────────────────────────────────
                socket.on('duel:opponent-abandoned', () => {
                    dispatch(opponentAbandoned());
                });

                // ── duel:error ────────────────────────────────────────────────
                socket.on('duel:error', ({ message }) => {
                    console.error('[Duel error]', message);
                    alert(message);
                });

            } catch (err) {
                console.error('[DuelPage] Could not init socket:', err.message);
            }
        };

        initSocket();

        return () => {
            mounted = false;
            const s = socketRef.current;
            if (s) {
                s.off('duel:start');
                s.off('duel:opponent-status');
                s.off('duel:problem-solved');
                s.off('duel:finished');
                s.off('duel:taunt');
                s.off('duel:opponent-abandoned');
                s.off('duel:error');
            }
        };
    }, [dispatch, roomCode, user]);

    // Cleanup on page leave
    useEffect(() => {
        return () => {
            if (screen === 'battle' && roomCode) {
                socketRef.current?.emit('duel:abandon', { roomCode });
            }
            disconnectSocket();
            dispatch(resetDuel());
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const renderScreen = () => {
        switch (screen) {
            case 'lobby':   return <DuelLobby   socket={socketRef.current} />;
            case 'waiting': return <DuelWaiting socket={socketRef.current} />;
            case 'battle':  return <DuelBattle  socket={socketRef.current} />;
            case 'recap':   return <DuelRecap   />;
            default:        return <DuelLobby   socket={socketRef.current} />;
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg-primary)", fontFamily: "'Syne', sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@400;600;700;800&display=swap');
                * { box-sizing: border-box; }
            `}</style>
            {renderScreen()}
        </div>
    );
}