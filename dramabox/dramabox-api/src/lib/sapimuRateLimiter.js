/**
 * ========================================
 * Sapimu Rate Limiter & Cache (Upstash HTTP)
 * ========================================
 * 
 * Persistent rate limiting and caching using Upstash Redis (HTTP).
 * Parses REDIS_URL to extract Upstash credentials.
 * Works with Vercel Serverless functions.
 * 
 * Handles sapimu.au rate limits:
 * - 100 requests/minute
 * - 2000 requests/day
 * 
 * Features:
 * - Persistent cache across serverless instances
 * - Drama cache (30 min TTL)
 * - Episode play cache (1 hour TTL)  
 * - Request counting per minute/day
 */

import { Redis } from '@upstash/redis';

// Rate limit constants (from sapimu.au Free tier)
const RATE_LIMIT_PER_MINUTE = 100;
const RATE_LIMIT_PER_DAY = 2000;

// Cache TTL (in seconds for Redis)
const DRAMA_CACHE_TTL = 30 * 60; // 30 minutes
const EPISODE_CACHE_TTL = 60 * 60; // 1 hour

// Redis key prefixes
const KEYS = {
    DRAMA: 'sapimu:drama:',
    EPISODE_PLAY: 'sapimu:episode:',
    RATE_MINUTE: 'sapimu:rate:minute',
    RATE_DAY: 'sapimu:rate:day:',
};

// Initialize Redis client
let redis = null;
let redisError = null;

/**
 * Parse REDIS_URL to Upstash format
 * REDIS_URL format: redis://default:PASSWORD@HOST:PORT
 * Upstash REST URL format: https://HOST
 */
function parseRedisUrl(url) {
    try {
        const parsed = new URL(url);
        const host = parsed.hostname; // e.g. neat-mongoose-9050.upstash.io
        const password = parsed.password; // The auth token

        // Upstash REST URL format
        const restUrl = `https://${host}`;

        return { url: restUrl, token: password };
    } catch (error) {
        console.error('[SapimuRedis] Failed to parse REDIS_URL:', error.message);
        return null;
    }
}

function getRedis() {
    if (redis) return redis;

    // Try environment variables in order of preference

    // 1. Direct Upstash env vars (preferred)
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        try {
            redis = new Redis({
                url: process.env.UPSTASH_REDIS_REST_URL,
                token: process.env.UPSTASH_REDIS_REST_TOKEN
            });
            console.log('[SapimuRedis] Using UPSTASH_REDIS_REST_* env vars');
            return redis;
        } catch (error) {
            console.error('[SapimuRedis] Upstash env init error:', error.message);
        }
    }

    // 2. Parse standard REDIS_URL
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
        const parsed = parseRedisUrl(redisUrl);
        if (parsed) {
            try {
                redis = new Redis({
                    url: parsed.url,
                    token: parsed.token
                });
                console.log('[SapimuRedis] Using parsed REDIS_URL');
                return redis;
            } catch (error) {
                console.error('[SapimuRedis] Redis init error:', error.message);
                redisError = error.message;
            }
        }
    }

    redisError = 'REDIS_URL or UPSTASH_REDIS_REST_* not configured';
    console.error('[SapimuRedis]', redisError);
    return null;
}

/**
 * Get current day key (YYYY-MM-DD)
 */
function getDayKey() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Check if we can make a request (rate limiting)
 * @returns {Promise<{canRequest: boolean, waitMs: number, stats: Object}>}
 */
async function checkRateLimit() {
    const client = getRedis();

    // If Redis unavailable, allow request but track locally
    if (!client) {
        return {
            canRequest: true,
            waitMs: 0,
            reason: null,
            stats: { error: redisError, storage: 'unavailable' },
            redisError: true
        };
    }

    try {
        const dayKey = getDayKey();
        const minuteKey = KEYS.RATE_MINUTE;
        const dayRateKey = KEYS.RATE_DAY + dayKey;

        // Get current counts using pipeline
        const pipe = client.pipeline();
        pipe.get(minuteKey);
        pipe.get(dayRateKey);
        const results = await pipe.exec();

        const requestsLastMinute = parseInt(results[0]) || 0;
        const requestsToday = parseInt(results[1]) || 0;

        const stats = {
            requestsLastMinute,
            requestsToday,
            limitPerMinute: RATE_LIMIT_PER_MINUTE,
            limitPerDay: RATE_LIMIT_PER_DAY,
            remainingMinute: Math.max(0, RATE_LIMIT_PER_MINUTE - requestsLastMinute),
            remainingDay: Math.max(0, RATE_LIMIT_PER_DAY - requestsToday),
            storage: 'redis'
        };

        // Check minute limit
        if (requestsLastMinute >= RATE_LIMIT_PER_MINUTE) {
            const ttl = await client.ttl(minuteKey);
            return {
                canRequest: false,
                waitMs: (ttl > 0 ? ttl : 60) * 1000,
                reason: 'minute_limit',
                stats
            };
        }

        // Check daily limit
        if (requestsToday >= RATE_LIMIT_PER_DAY) {
            const now = new Date();
            const midnight = new Date(now);
            midnight.setHours(24, 0, 0, 0);
            const msUntilMidnight = midnight.getTime() - now.getTime();

            return {
                canRequest: false,
                waitMs: msUntilMidnight,
                reason: 'daily_limit',
                stats
            };
        }

        return { canRequest: true, waitMs: 0, reason: null, stats };
    } catch (error) {
        console.error('[SapimuRedis] checkRateLimit error:', error.message);
        return {
            canRequest: true,
            waitMs: 0,
            reason: null,
            stats: { error: error.message, storage: 'redis_error' },
            redisError: true
        };
    }
}

/**
 * Record a request (for rate limiting)
 */
async function recordRequest() {
    const client = getRedis();
    if (!client) return;

    try {
        const dayKey = getDayKey();
        const minuteKey = KEYS.RATE_MINUTE;
        const dayRateKey = KEYS.RATE_DAY + dayKey;

        // Use pipeline for efficiency
        const pipe = client.pipeline();
        pipe.incr(minuteKey);
        pipe.expire(minuteKey, 60); // 1 minute TTL
        pipe.incr(dayRateKey);
        pipe.expire(dayRateKey, 86400 + 3600); // 25 hours TTL
        await pipe.exec();

        console.log('[SapimuRedis] Request recorded');
    } catch (error) {
        console.error('[SapimuRedis] recordRequest error:', error.message);
    }
}

/**
 * Get cached drama details
 * @param {string} dramaId 
 * @returns {Promise<Object|null>}
 */
async function getCachedDrama(dramaId) {
    const client = getRedis();
    if (!client) return null;

    try {
        const key = KEYS.DRAMA + dramaId;
        const cached = await client.get(key);

        if (cached) {
            console.log(`[SapimuRedis] Cache HIT drama: ${dramaId}`);
            // Upstash returns parsed JSON directly
            return typeof cached === 'string' ? JSON.parse(cached) : cached;
        }

        return null;
    } catch (error) {
        console.error('[SapimuRedis] getCachedDrama error:', error.message);
        return null;
    }
}

/**
 * Cache drama details
 * @param {string} dramaId 
 * @param {Object} data 
 */
async function cacheDrama(dramaId, data) {
    const client = getRedis();
    if (!client) return;

    try {
        const key = KEYS.DRAMA + dramaId;
        await client.set(key, JSON.stringify(data), { ex: DRAMA_CACHE_TTL });
        console.log(`[SapimuRedis] Cached drama: ${dramaId} (TTL: ${DRAMA_CACHE_TTL}s)`);
    } catch (error) {
        console.error('[SapimuRedis] cacheDrama error:', error.message);
    }
}

/**
 * Get cached episode play data
 * @param {string} dramaId 
 * @param {number} episodeIndex 
 * @returns {Promise<Object|null>}
 */
async function getCachedEpisodePlay(dramaId, episodeIndex) {
    const client = getRedis();
    if (!client) return null;

    try {
        const key = `${KEYS.EPISODE_PLAY}${dramaId}:${episodeIndex}`;
        const cached = await client.get(key);

        if (cached) {
            console.log(`[SapimuRedis] Cache HIT episode: ${dramaId}:${episodeIndex}`);
            return typeof cached === 'string' ? JSON.parse(cached) : cached;
        }

        return null;
    } catch (error) {
        console.error('[SapimuRedis] getCachedEpisodePlay error:', error.message);
        return null;
    }
}

/**
 * Cache episode play data
 * @param {string} dramaId 
 * @param {number} episodeIndex 
 * @param {Object} data 
 */
async function cacheEpisodePlay(dramaId, episodeIndex, data) {
    const client = getRedis();
    if (!client) return;

    try {
        const key = `${KEYS.EPISODE_PLAY}${dramaId}:${episodeIndex}`;
        await client.set(key, JSON.stringify(data), { ex: EPISODE_CACHE_TTL });
        console.log(`[SapimuRedis] Cached episode: ${dramaId}:${episodeIndex} (TTL: ${EPISODE_CACHE_TTL}s)`);
    } catch (error) {
        console.error('[SapimuRedis] cacheEpisodePlay error:', error.message);
    }
}

/**
 * Get episode from drama cache (without separate API call)
 * @param {string} dramaId 
 * @param {number} episodeIndex 
 * @returns {Promise<Object|null>}
 */
async function getEpisodeFromDramaCache(dramaId, episodeIndex) {
    try {
        const drama = await getCachedDrama(dramaId);
        if (!drama || !drama.episodes) return null;

        return drama.episodes.find(ep => ep.index === episodeIndex) || null;
    } catch (error) {
        console.error('[SapimuRedis] getEpisodeFromDramaCache error:', error.message);
        return null;
    }
}

/**
 * Get cache statistics
 * @returns {Promise<Object>}
 */
async function getCacheStats() {
    const client = getRedis();

    if (!client) {
        return {
            error: redisError || 'Redis not connected',
            storage: 'unavailable',
            connected: false
        };
    }

    try {
        const rateLimit = await checkRateLimit();

        return {
            connected: true,
            rateLimit: rateLimit.stats,
            canMakeRequest: rateLimit.canRequest,
            waitMs: rateLimit.waitMs,
            limitReason: rateLimit.reason,
            storage: 'redis'
        };
    } catch (error) {
        console.error('[SapimuRedis] getCacheStats error:', error.message);
        return { error: error.message, storage: 'redis_error', connected: false };
    }
}

/**
 * Clear all caches
 */
async function clearCache() {
    const client = getRedis();
    if (!client) return;

    try {
        // Use SCAN to find and delete keys (safe for production)
        let cursor = 0;
        let deleted = 0;

        do {
            const result = await client.scan(cursor, { match: 'sapimu:*', count: 100 });
            cursor = result[0];
            const keys = result[1];

            if (keys.length > 0) {
                await client.del(...keys);
                deleted += keys.length;
            }
        } while (cursor !== 0);

        console.log(`[SapimuRedis] Cleared ${deleted} cached items`);
    } catch (error) {
        console.error('[SapimuRedis] clearCache error:', error.message);
    }
}

/**
 * Export for use
 */
export {
    checkRateLimit,
    recordRequest,
    getCachedDrama,
    cacheDrama,
    getCachedEpisodePlay,
    cacheEpisodePlay,
    getEpisodeFromDramaCache,
    getCacheStats,
    clearCache,
    DRAMA_CACHE_TTL,
    EPISODE_CACHE_TTL
};
