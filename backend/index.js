const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
require('dotenv').config();

// Validate required env vars at startup
const REQUIRED_ENV = ['JWT_KEY', 'DB_CONNECT_STRING', 'OPENROUTER_KEY', 'JUDGE0_KEY',
    'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
        console.error(`Missing required environment variable: ${key}`);
        process.exit(1);
    }
}

const main = require('./src/config/db');
const { redisClient } = require('./src/config/redis');
const cookieParser = require('cookie-parser');
const authRouter    = require('./src/routes/userAuth');
const problemRouter = require('./src/routes/problemCreator');
const submitRouter  = require('./src/routes/submit');
const aiRouter      = require('./src/routes/aiChatting');
const videoRouter   = require('./src/routes/videoCreator');
const profileRouter = require('./src/routes/profile');
const duelRouter    = require('./src/routes/duel');
const agentRouter   = require('./src/routes/agent');   // ← Code Execution Agent
const hintRouter    = require('./src/routes/hint');    // ← AI Hints
const duelHandler   = require('./src/socket/duelHandler');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const User = require('./src/models/user');

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5174'];


// ── Rate limiters ─────────────────────────────────────────────────────────────

// Global — 100 requests per minute per IP
const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please slow down.' },
});

// Auth routes — 10 attempts per 15 minutes (brute force protection)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many login attempts, please try again later.' },
});

// AI routes — 20 requests per minute (OpenRouter cost protection)
const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'AI rate limit reached, please wait a moment.' },
});

// Code execution — 30 runs per minute per IP
const judgeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many code submissions, please slow down.' },
});

// ── HTTP server + Socket.io ───────────────────────────────────────────────────

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ALLOWED_ORIGINS,
        credentials: true,
    },
});

// ── Socket.io auth middleware ─────────────────────────────────────────────────

io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error('Authentication required'));

        const decoded = jwt.verify(token, process.env.JWT_KEY);
        const user = await User.findById(decoded._id).select('firstName lastName role eloRating duelsPlayed');
        if (!user) return next(new Error('User not found'));

        socket.user = user;
        next();
    } catch (err) {
        next(new Error('Invalid token'));
    }
});

// ── Socket.io connection ──────────────────────────────────────────────────────

io.on('connection', (socket) => {
    console.log(`[Socket.io] Connected: ${socket.user.firstName} (${socket.id})`);
    duelHandler(io, socket);

    socket.on('disconnect', () => {
        console.log(`[Socket.io] Disconnected: ${socket.user.firstName} (${socket.id})`);
    });
});

// ── Express middleware ────────────────────────────────────────────────────────

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(globalLimiter); // Apply global rate limit to all routes
app.use(express.json());
app.use(cookieParser());

// ── Routes ────────────────────────────────────────────────────────────────────

app.use('/user',       authLimiter, authRouter);   // strict — login/register
app.use('/problem',    problemRouter);
app.use('/submission', judgeLimiter, submitRouter); // Judge0 cost protection
app.use('/ai',         aiLimiter, aiRouter);       // OpenRouter cost protection
app.use('/video',      videoRouter);
app.use('/profile',    profileRouter);
app.use('/duel',       duelRouter);
app.use('/agent',      aiLimiter, agentRouter);    // OpenRouter cost protection
app.use('/hint',       aiLimiter, hintRouter);     // OpenRouter cost protection

// ── Global error handler ──────────────────────────────────────────────────────

app.use((err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} —`, err.message);
    const statusCode = err.statusCode || 500;
    const message = statusCode < 500 ? err.message : 'Internal server error';
    res.status(statusCode).json({ message });
});

// ── Startup ───────────────────────────────────────────────────────────────────

const initializeConnection = async () => {
    try {
        await main();
        console.log('[MongoDB] Connected');
    } catch (err) {
        console.error('[MongoDB] Connection failed:', err.message);
        process.exit(1);
    }

    try {
        await redisClient.connect();
    } catch (err) {
        console.warn('[Redis] Unavailable — logout token blocklisting disabled. App will still work.');
        console.warn('[Redis] To enable: install Redis (brew install redis && brew services start redis)');
    }

    server.listen(process.env.PORT || 3000, () => {
        console.log(`Server listening on port ${process.env.PORT || 3000}`);
    });
};

initializeConnection();