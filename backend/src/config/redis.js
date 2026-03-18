const { createClient } = require('redis');

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        reconnectStrategy: (retries) => {
            // Stop retrying after 3 attempts — avoids infinite spam on startup
            if (retries >= 3) {
                console.warn('[Redis] Could not connect after 3 attempts. Token blocklist (logout invalidation) disabled.');
                return false; // stops reconnecting
            }
            return Math.min(retries * 500, 2000);
        }
    }
});

let isConnected = false;

redisClient.on('connect', () => {
    isConnected = true;
    console.log('[Redis] Connected');
});

redisClient.on('error', (err) => {
    // Only log once, not on every retry
    if (isConnected || err.code !== 'ECONNREFUSED') {
        console.error('[Redis] Error:', err.message);
    }
    isConnected = false;
});

// Safe wrappers — if Redis is down, silently degrade instead of crashing
const safeSet = async (key, value) => {
    if (!isConnected) return null;
    try { return await redisClient.set(key, value); } catch { return null; }
};

const safeExists = async (key) => {
    if (!isConnected) return 0; // treat as "not blocked" if Redis unavailable
    try { return await redisClient.exists(key); } catch { return 0; }
};

const safeExpireAt = async (key, timestamp) => {
    if (!isConnected) return null;
    try { return await redisClient.expireAt(key, timestamp); } catch { return null; }
};

module.exports = { redisClient, safeSet, safeExists, safeExpireAt, isConnected: () => isConnected };
