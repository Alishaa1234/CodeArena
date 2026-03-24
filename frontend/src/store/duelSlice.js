import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosClient from '../utils/axiosClient';

// ── Async thunks ──────────────────────────────────────────────────────────────

export const createRoom = createAsyncThunk(
    'duel/createRoom',
    async ({ timeLimitSeconds, questionCount }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post('/duel/create', {
                timeLimitSeconds,
                questionCount,
            });
            return data; // { roomCode, problems, timeLimitSeconds, totalPoints }
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Failed to create room');
        }
    }
);

export const fetchRecap = createAsyncThunk(
    'duel/fetchRecap',
    async (roomCode, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get(`/duel/recap/${roomCode}`);
            return data.duel;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Failed to fetch recap');
        }
    }
);

export const fetchLeaderboard = createAsyncThunk(
    'duel/fetchLeaderboard',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get('/duel/leaderboard');
            return data.leaderboard;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Failed to fetch leaderboard');
        }
    }
);

// ── Initial state ─────────────────────────────────────────────────────────────

const initialState = {
    // screen: 'lobby' | 'waiting' | 'battle' | 'recap'
    screen: 'lobby',

    // Room
    roomCode:         null,
    timeLimitSeconds: 300,
    totalPoints:      0,       // max possible points in this duel

    // Problems list [{ problemId, title, difficulty, points }]
    problems: [],

    // Which problem is currently open in the editor (index into problems[])
    activeProblemIndex: 0,

    // Opponent info { host: { username, eloRating }, guest: { username, eloRating } }
    opponent: null,

    // My live state
    myPoints:  0,
    mySolved:  [],   // [problemId, ...] — ids I've solved this battle

    // Opponent live state
    oppPoints: 0,
    oppSolved: [],   // [problemId, ...] — ids opponent has solved

    // Per-problem opponent progress { [problemId]: { testsPassed, totalTests } }
    oppProgress: {},

    // Taunt
    lastTaunt: null,

    // Recap — full duel document from MongoDB
    recap: null,

    // Leaderboard
    leaderboard: [],

    // UI
    loading:      false,
    error:        null,
    opponentLeft: false,
};

// ── Slice ─────────────────────────────────────────────────────────────────────

const duelSlice = createSlice({
    name: 'duel',
    initialState,
    reducers: {

        // Host created room — move to waiting screen
        setWaiting(state, { payload }) {
            state.screen           = 'waiting';
            state.roomCode         = payload.roomCode;
            state.problems         = payload.problems;
            state.timeLimitSeconds = payload.timeLimitSeconds;
            state.totalPoints      = payload.totalPoints;
        },

        // Both players joined — battle starts
        duelStarted(state, { payload }) {
            state.screen           = 'battle';
            state.roomCode         = payload.roomCode;
            state.problems         = payload.problems;
            state.timeLimitSeconds = payload.timeLimitSeconds;
            state.totalPoints      = payload.totalPoints;
        },

        // Store opponent identity
        setOpponent(state, { payload }) {
            state.opponent = payload;
        },

        // Switch active problem in editor
        setActiveProblemIndex(state, { payload }) {
            state.activeProblemIndex = payload;
        },

        // Someone solved a problem — update points + solved list
        problemSolved(state, { payload }) {
            // payload: { userId, problemId, points, totalPoints }
            // We'll compare against user id in the component but here we
            // store both sides separately via myId passed from DuelPage
            if (payload.isMe) {
                state.myPoints = payload.totalPoints;
                if (!state.mySolved.includes(payload.problemId)) {
                    state.mySolved.push(payload.problemId);
                }
            } else {
                state.oppPoints = payload.totalPoints;
                if (!state.oppSolved.includes(payload.problemId)) {
                    state.oppSolved.push(payload.problemId);
                }
            }
        },

        // Opponent ran code on a problem — update their progress bar
        updateOppProgress(state, { payload }) {
            // payload: { problemId, testsPassed, totalTests }
            state.oppProgress[payload.problemId] = {
                testsPassed: payload.testsPassed,
                totalTests:  payload.totalTests,
            };
        },

        receiveTaunt(state, { payload }) {
            state.lastTaunt = payload;
        },

        clearTaunt(state) {
            state.lastTaunt = null;
        },

        opponentAbandoned(state) {
            state.opponentLeft = true;
        },

        setRecap(state, { payload }) {
            state.screen = 'recap';
            state.recap  = payload;
        },

        resetDuel() {
            return initialState;
        },

        clearError(state) {
            state.error = null;
        },
    },

    extraReducers: (builder) => {
        // createRoom
        builder
            .addCase(createRoom.pending, (state) => {
                state.loading = true;
                state.error   = null;
            })
            .addCase(createRoom.fulfilled, (state, { payload }) => {
                state.loading          = false;
                state.screen           = 'waiting';
                state.roomCode         = payload.roomCode;
                state.problems         = payload.problems;
                state.timeLimitSeconds = payload.timeLimitSeconds;
                state.totalPoints      = payload.totalPoints;
            })
            .addCase(createRoom.rejected, (state, { payload }) => {
                state.loading = false;
                state.error   = payload;
            });

        // fetchRecap
        builder
            .addCase(fetchRecap.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchRecap.fulfilled, (state, { payload }) => {
                state.loading = false;
                state.screen  = 'recap';
                state.recap   = payload;
            })
            .addCase(fetchRecap.rejected, (state, { payload }) => {
                state.loading = false;
                state.error   = payload;
            });

        // fetchLeaderboard
        builder
            .addCase(fetchLeaderboard.fulfilled, (state, { payload }) => {
                state.leaderboard = payload;
            });
    },
});

export const {
    setWaiting,
    duelStarted,
    setOpponent,
    setActiveProblemIndex,
    problemSolved,
    updateOppProgress,
    receiveTaunt,
    clearTaunt,
    opponentAbandoned,
    setRecap,
    resetDuel,
    clearError,
} = duelSlice.actions;

export default duelSlice.reducer;