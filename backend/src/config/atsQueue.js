const { Queue } = require("bullmq");

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Parse Redis URL into IORedis-compatible connection object
const parseRedisUrl = (url) => {
    try {
        const parsed = new URL(url);
        return {
            host: parsed.hostname || "localhost",
            port: parseInt(parsed.port, 10) || 6379,
            password: parsed.password || undefined,
            maxRetriesPerRequest: null, // Required by BullMQ
        };
    } catch {
        return { host: "localhost", port: 6379, maxRetriesPerRequest: null };
    }
};

const connection = parseRedisUrl(REDIS_URL);

const atsQueue = new Queue("ats-analysis", { connection });

module.exports = { atsQueue, connection };
