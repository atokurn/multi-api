/**
 * Shared Redis Cache Client
 * All unlock nodes connect to the same Redis
 */

import { Redis } from '@upstash/redis';

const REDIS_URL = process.env.REDIS_URL || '';

let redis = null;

function getRedis() {
    if (!redis) {
        const match = REDIS_URL.match(/redis:\/\/default:(.+)@(.+):(\d+)/);
        if (match) {
            const [, token, host] = match;
            redis = new Redis({ url: `https://${host}`, token });
        }
    }
    return redis;
}

const TTL = {
    VIDEO: 30 * 24 * 60 * 60,  // 30 days
    LOCK: 60                   // 1 minute (prevent race condition)
};

async function get(key) {
    try {
        const r = getRedis();
        if (!r) return null;
        return await r.get(key);
    } catch (e) {
        console.error('[Cache] Get error:', e.message);
        return null;
    }
}

async function set(key, value, ttl = TTL.VIDEO) {
    try {
        const r = getRedis();
        if (!r) return false;
        await r.set(key, JSON.stringify(value), { ex: ttl });
        return true;
    } catch (e) {
        console.error('[Cache] Set error:', e.message);
        return false;
    }
}

// Atomic lock to prevent duplicate unlocks
async function acquireLock(key) {
    try {
        const r = getRedis();
        if (!r) return true; // Allow if no Redis
        const result = await r.setnx(`lock:${key}`, '1');
        if (result) {
            await r.expire(`lock:${key}`, TTL.LOCK);
        }
        return result === 1;
    } catch (e) {
        return true;
    }
}

async function releaseLock(key) {
    try {
        const r = getRedis();
        if (r) await r.del(`lock:${key}`);
    } catch (e) { }
}

export { get, set, acquireLock, releaseLock, TTL };
