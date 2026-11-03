const Redis = require("ioredis");

const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;

// Redis is optional: when it is unreachable every helper degrades to a no-op.
const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 2000)),
});

let warned = false;
redis.on("error", (err) => {
  if (!warned) {
    console.warn("Redis unavailable, caching and queues fall back:", err.message);
    warned = true;
  }
});

const isRedisReady = () => redis.status === "ready";

const connectRedis = async () => {
  try {
    await redis.connect();
    console.log("Redis connected");
    return true;
  } catch (e) {
    return false;
  }
};

const getCached = async (key) => {
  if (!isRedisReady()) return null;
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

const setCached = async (key, value, ttlSeconds = 300) => {
  if (!isRedisReady()) return;
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (e) {
    // cache write failures are non-fatal
  }
};

// SCAN instead of KEYS so invalidation never blocks Redis
const invalidateCache = async (pattern) => {
  if (!isRedisReady()) return;
  try {
    const stream = redis.scanStream({ match: pattern, count: 100 });
    for await (const keys of stream) {
      if (keys.length) await redis.del(...keys);
    }
  } catch (e) {
    // ignore
  }
};

module.exports = { redis, connectRedis, isRedisReady, getCached, setCached, invalidateCache };
