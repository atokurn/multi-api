/**
 * Upstash Redis Cache Client
 */

import { Redis } from '@upstash/redis';

// Parse Redis URL for Upstash
const REDIS_URL = process.env.REDIS_URL || '';

let redis = null;

function getRedis() {
    if (!redis) {
        // Parse redis:// URL to get REST URL and token
        // Format: redis://default:TOKEN@HOST:PORT
        const match = REDIS_URL.match(/redis:\/\/default:(.+)@(.+):(\d+)/);

        if (match) {
            const [, token, host] = match;
            redis = new Redis({
                url: `https://${host}`,
                token: token
            });
        } else if (process.env.UPSTASH_REDIS_REST_URL) {
            // Direct Upstash format
            redis = new Redis({
                url: process.env.UPSTASH_REDIS_REST_URL,
                token: process.env.UPSTASH_REDIS_REST_TOKEN
            });
        } else {
            console.error('[Cache] No valid Redis credentials found');
            return null;
        }
    }
    return redis;
}

// Cache TTL in seconds
const TTL = {
    EPISODES: 7 * 24 * 60 * 60,    // 7 days
    VIDEO: 30 * 24 * 60 * 60,      // 30 days
    DETAIL: 24 * 60 * 60,          // 24 hours
    SEARCH: 30 * 60                 // 30 minutes
};

/**
 * Get cached data
 */
async function get(key) {
    try {
        const r = getRedis();
        if (!r) return null;

        const data = await r.get(key);
        return data;
    } catch (error) {
        console.error('[Cache] Get error:', error.message);
        return null;
    }
}

/**
 * Set cached data with TTL
 */
async function set(key, value, ttl = TTL.EPISODES) {
    try {
        const r = getRedis();
        if (!r) return false;

        await r.set(key, JSON.stringify(value), { ex: ttl });
        return true;
    } catch (error) {
        console.error('[Cache] Set error:', error.message);
        return false;
    }
}

/**
 * Delete cached data
 */
async function del(key) {
    try {
        const r = getRedis();
        if (!r) return false;

        await r.del(key);
        return true;
    } catch (error) {
        console.error('[Cache] Del error:', error.message);
        return false;
    }
}

/**
 * Check if key exists
 */
async function exists(key) {
    try {
        const r = getRedis();
        if (!r) return false;

        const result = await r.exists(key);
        return result === 1;
    } catch (error) {
        console.error('[Cache] Exists error:', error.message);
        return false;
    }
}

/**
 * Get TTL of key
 */
async function ttl(key) {
    try {
        const r = getRedis();
        if (!r) return -1;

        return await r.ttl(key);
    } catch (error) {
        console.error('[Cache] TTL error:', error.message);
        return -1;
    }
}

export {
    get,
    set,
    del,
    exists,
    ttl,
    TTL,
    getRedis
};
