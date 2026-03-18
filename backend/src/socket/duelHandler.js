const { redisClient } = require('../config/redis');
const Duel = require('../models/Duel');
const User = require('../models/user');
const { calculateElo } = require('../utils/elo');

// ── Redis helpers ─────────────────────────────────────────────────────────────

async function getRoom(roomCode) {
    const raw = await redisClient.get(`duel:${roomCode}`);
    return raw ? JSON.parse(raw) : null;
}

async function saveRoom(room) {
    const ttl = await redisClient.ttl(`duel:${room.roomCode}`);
    const remaining = ttl > 0 ? ttl : 600;
    await redisClient.setEx(`duel:${room.roomCode}`, remaining, JSON.stringify(room));
}

async function deleteRoom(roomCode) {
    await redisClient.del(`duel:${roomCode}`);
}

// ── Points helpers ────────────────────────────────────────────────────────────

// Points remaining for a player (problems not yet solved)
function remainingPoints(room, player) {
    const solvedIds = new Set(player.solved.map(s => s.problemId));
    return room.problems
        .filter(p => !solvedIds.has(p.problemId))
        .reduce((sum, p) => sum + p.points, 0);
}

// Check if the battle can end early:
// If leader's points > opponent's current + all remaining = opponent can never catch up
function canEndEarly(room) {
    const [p1, p2] = [room.host, room.guest];
    const p1Max = p1.totalPoints + remainingPoints(room, p1);
    const p2Max = p2.totalPoints + remainingPoints(room, p2);

    if (p1.totalPoints > p2Max) return { end: true, winnerId: p1.userId };
    if (p2.totalPoints > p1Max) return { end: true, winnerId: p2.userId };
    if (p1Max === 0 && p2Max === 0) return { end: true, winnerId: null }; // all solved, draw

    // Check if all problems solved by both
    const allSolved = room.problems.every(prob => {
        const p1Solved = p1.solved.some(s => s.problemId === prob.problemId);
        const p2Solved = p2.solved.some(s => s.problemId === prob.problemId);
        return p1Solved && p2Solved;
    });
    if (allSolved) {
        if (p1.totalPoints > p2.totalPoints) return { end: true, winnerId: p1.userId };
        if (p2.totalPoints > p1.totalPoints) return { end: true, winnerId: p2.userId };
        return { end: true, winnerId: null }; // draw
    }

    return { end: false };
}

// ── Finish duel — shared by submit, timeout, abandon ─────────────────────────

async function finishDuel(io, room, winnerId) {
    const host  = room.host;
    const guest = room.guest;
    const isDraw = winnerId === null;

    const isHostWinner = winnerId === host.userId;

    let hostEloAfter  = host.eloRating;
    let guestEloAfter = guest.eloRating;
    let eloDelta      = 0;

    if (!isDraw) {
        const wRating = isHostWinner ? host.eloRating  : guest.eloRating;
        const lRating = isHostWinner ? guest.eloRating : host.eloRating;
        const result  = calculateElo(wRating, lRating);
        eloDelta      = result.delta;
        hostEloAfter  = isHostWinner  ? result.winnerNew : result.loserNew;
        guestEloAfter = !isHostWinner ? result.winnerNew : result.loserNew;
    }

    // Persist to MongoDB
    await Duel.create({
        roomCode:         room.roomCode,
        problems:         room.problems.map(p => ({
            problemId:  p.problemId,
            title:      p.title,
            difficulty: p.difficulty,
            points:     p.points,
        })),
        timeLimitSeconds: room.timeLimitSeconds,
        status:           'finished',
        isDraw,
        winnerId:         winnerId || null,
        startedAt:        room.startedAt,
        finishedAt:       new Date().toISOString(),
        players: [
            {
                userId:      host.userId,
                username:    host.username,
                eloAtStart:  host.eloRating,
                eloAfter:    hostEloAfter,
                eloDelta:    isDraw ? 0 : (isHostWinner ? +eloDelta : -eloDelta),
                totalPoints: host.totalPoints,
                solved:      host.solved.map(s => ({ ...s, problemId: s.problemId?.toString() })),
                status:      isDraw ? 'draw' : (isHostWinner ? 'won' : 'lost'),
            },
            {
                userId:      guest.userId,
                username:    guest.username,
                eloAtStart:  guest.eloRating,
                eloAfter:    guestEloAfter,
                eloDelta:    isDraw ? 0 : (!isHostWinner ? +eloDelta : -eloDelta),
                totalPoints: guest.totalPoints,
                solved:      guest.solved.map(s => ({ ...s, problemId: s.problemId?.toString() })),
                status:      isDraw ? 'draw' : (!isHostWinner ? 'won' : 'lost'),
            },
        ],
    });

    // Update ELO + duelsPlayed in MongoDB
    if (!isDraw) {
        await Promise.all([
            User.findByIdAndUpdate(host.userId,  { eloRating: hostEloAfter,  $inc: { duelsPlayed: 1 } }),
            User.findByIdAndUpdate(guest.userId, { eloRating: guestEloAfter, $inc: { duelsPlayed: 1 } }),
        ]);
    } else {
        await Promise.all([
            User.findByIdAndUpdate(host.userId,  { $inc: { duelsPlayed: 1 } }),
            User.findByIdAndUpdate(guest.userId, { $inc: { duelsPlayed: 1 } }),
        ]);
    }

    await deleteRoom(room.roomCode);

    // Notify both players
    io.to(room.roomCode).emit('duel:finished', {
        isDraw,
        winnerId,
        winnerName: isDraw ? null : (isHostWinner ? host.username : guest.username),
        delta: eloDelta,
        players: [
            {
                userId:      host.userId,
                totalPoints: host.totalPoints,
                eloAfter:    hostEloAfter,
                eloDelta:    isDraw ? 0 : (isHostWinner ? +eloDelta : -eloDelta),
            },
            {
                userId:      guest.userId,
                totalPoints: guest.totalPoints,
                eloAfter:    guestEloAfter,
                eloDelta:    isDraw ? 0 : (!isHostWinner ? +eloDelta : -eloDelta),
            },
        ],
    });
}

// ── Main handler ──────────────────────────────────────────────────────────────

function duelHandler(io, socket) {
    const userId   = socket.user._id.toString();
    const username = `${socket.user.firstName} ${socket.user.lastName || ''}`.trim();

    // ── duel:create ───────────────────────────────────────────────────────────

    socket.on('duel:create', async ({ roomCode }) => {
        try {
            const room = await getRoom(roomCode);
            if (!room) return socket.emit('duel:error', { message: 'Room not found or expired' });
            if (room.host.userId !== userId) return socket.emit('duel:error', { message: 'Not your room' });

            socket.join(roomCode);
            socket.emit('duel:waiting', {
                roomCode,
                problems:         room.problems,
                timeLimitSeconds: room.timeLimitSeconds,
            });
        } catch (err) {
            console.error('[duel:create]', err);
            socket.emit('duel:error', { message: 'Server error' });
        }
    });

    // ── duel:join ─────────────────────────────────────────────────────────────

    socket.on('duel:join', async ({ roomCode }) => {
        try {
            const room = await getRoom(roomCode.toUpperCase());
            if (!room)                       return socket.emit('duel:error', { message: 'Room not found or expired' });
            if (room.status !== 'waiting')   return socket.emit('duel:error', { message: 'Duel already started or finished' });
            if (room.host.userId === userId) return socket.emit('duel:error', { message: 'Cannot join your own room' });

            const guestUser = await User.findById(userId).select('firstName lastName eloRating');
            if (!guestUser) return socket.emit('duel:error', { message: 'User not found' });

            room.guest = {
                userId,
                username,
                eloRating:   guestUser.eloRating ?? 1200,
                totalPoints: 0,
                solved:      [],
                status:      'coding',
            };
            room.host.status = 'coding';
            room.status      = 'active';
            room.startedAt   = new Date().toISOString();

            await saveRoom(room);
            socket.join(room.roomCode);

            io.to(room.roomCode).emit('duel:start', {
                roomCode:         room.roomCode,
                problems:         room.problems,
                timeLimitSeconds: room.timeLimitSeconds,
                totalPoints:      room.totalPoints,
                opponent: {
                    host:  { userId: room.host.userId,  username: room.host.username,  eloRating: room.host.eloRating  },
                    guest: { userId: room.guest.userId, username: room.guest.username, eloRating: room.guest.eloRating },
                },
            });
        } catch (err) {
            console.error('[duel:join]', err);
            socket.emit('duel:error', { message: 'Server error' });
        }
    });

    // ── duel:submit ───────────────────────────────────────────────────────────
    // Called when a player gets full AC on a specific problem.
    // Payload: { roomCode, problemId, language, code }

    socket.on('duel:submit', async ({ roomCode, problemId, language, code }) => {
        try {
            const room = await getRoom(roomCode);
            if (!room || room.status !== 'active') return;

            const isHost  = room.host.userId  === userId;
            const isGuest = room.guest?.userId === userId;
            if (!isHost && !isGuest) return;

            const player = isHost ? room.host : room.guest;

            // Idempotency — ignore if this problem already solved by this player
            const alreadySolved = player.solved.some(s => s.problemId === problemId);
            if (alreadySolved) return;

            // Find the problem in room to get its points
            const prob = room.problems.find(p => p.problemId === problemId);
            if (!prob) return;

            // Award points
            player.solved.push({
                problemId,
                points:   prob.points,
                solvedAt: new Date().toISOString(),
                code,
                language,
            });
            player.totalPoints += prob.points;

            await saveRoom(room);

            // Broadcast solve event to both players
            io.to(roomCode).emit('duel:problem-solved', {
                userId,
                username:    player.username,
                problemId,
                points:      prob.points,
                totalPoints: player.totalPoints,
            });

            // Check for early end
            const { end, winnerId } = canEndEarly(room);
            if (end) {
                room.status = 'finished';
                await saveRoom(room);
                await finishDuel(io, room, winnerId);
            }
        } catch (err) {
            console.error('[duel:submit]', err);
            socket.emit('duel:error', { message: 'Server error during submission' });
        }
    });

    // ── duel:update-status ────────────────────────────────────────────────────
    // Called on every run — broadcasts test progress to opponent (no code)

    socket.on('duel:update-status', async ({ roomCode, problemId, testsPassed, totalTests }) => {
        try {
            const room = await getRoom(roomCode);
            if (!room || room.status !== 'active') return;

            const isParticipant = room.host.userId === userId || room.guest?.userId === userId;
            if (!isParticipant) return;

            socket.to(roomCode).emit('duel:opponent-status', {
                userId,
                problemId,
                testsPassed,
                totalTests,
            });
        } catch (err) {
            console.error('[duel:update-status]', err);
        }
    });

    // ── duel:timeout ─────────────────────────────────────────────────────────
    // Emitted by the frontend when the countdown hits zero.
    // Most points wins. Equal points = draw.

    socket.on('duel:timeout', async ({ roomCode }) => {
        try {
            const room = await getRoom(roomCode);
            if (!room || room.status !== 'active') return;

            const isParticipant = room.host.userId === userId || room.guest?.userId === userId;
            if (!isParticipant) return;

            // Idempotency — mark finished before async work
            room.status = 'finished';
            await saveRoom(room);

            const hostPoints  = room.host.totalPoints;
            const guestPoints = room.guest.totalPoints;

            let winnerId = null;
            if (hostPoints > guestPoints)       winnerId = room.host.userId;
            else if (guestPoints > hostPoints)  winnerId = room.guest.userId;
            // else draw — winnerId stays null

            await finishDuel(io, room, winnerId);
        } catch (err) {
            console.error('[duel:timeout]', err);
        }
    });

    // ── duel:recap ────────────────────────────────────────────────────────────

    socket.on('duel:recap', async ({ roomCode }) => {
        try {
            const duel = await Duel.findOne({ roomCode: roomCode.toUpperCase() })
                .lean();

            if (!duel) return socket.emit('duel:error', { message: 'Recap not found' });

            const isParticipant = duel.players.some(p => p.userId.toString() === userId);
            if (!isParticipant) return socket.emit('duel:error', { message: 'Not your duel' });

            socket.emit('duel:recap-data', { duel });
        } catch (err) {
            console.error('[duel:recap]', err);
            socket.emit('duel:error', { message: 'Server error' });
        }
    });

    // ── duel:taunt ────────────────────────────────────────────────────────────

    socket.on('duel:taunt', async ({ roomCode, emoji }) => {
        try {
            const ALLOWED_TAUNTS = ['👀', '😈', '🔥', '💀', '⚡', '🤡', '😎', '🫡'];
            if (!ALLOWED_TAUNTS.includes(emoji)) return;

            const room = await getRoom(roomCode);
            if (!room || room.status !== 'active') return;

            const isParticipant = room.host.userId === userId || room.guest?.userId === userId;
            if (!isParticipant) return;

            socket.to(roomCode).emit('duel:taunt', { from: username, emoji });
        } catch (err) {
            console.error('[duel:taunt]', err);
        }
    });

    // ── duel:abandon ─────────────────────────────────────────────────────────

    socket.on('duel:abandon', async ({ roomCode }) => {
        try {
            const room = await getRoom(roomCode);
            if (!room) return;

            const isParticipant = room.host.userId === userId || room.guest?.userId === userId;
            if (!isParticipant) return;

            if (room.status === 'waiting') {
                await deleteRoom(roomCode);
                return;
            }

            if (room.status === 'active') {
                room.status = 'abandoned';
                await saveRoom(room);
                socket.to(roomCode).emit('duel:opponent-abandoned', {
                    username,
                    message: `${username} abandoned the duel. You win! (no ELO change)`,
                });
            }
        } catch (err) {
            console.error('[duel:abandon]', err);
        }
    });
}

module.exports = duelHandler;