/**
 * ========================================
 * Sapimu DramaWave Proxy Service
 * ========================================
 * 
 * Proxies requests to sapimu.au's DramaWave API
 * with Redis-based caching and rate limiting:
 * - 100 requests/minute
 * - 2000 requests/day
 * - Persistent cache via Upstash Redis
 * 
 * Endpoints:
 *   GET /dramawave/api/v1/dramas/:id - Full drama details with episode list
 *   GET /dramawave/api/v1/dramas/:id/episodes/:index - Specific episode
 *   GET /dramawave/api/v1/dramas/:id/play/:index - Episode with video URL
 */

import axios from 'axios';
import * as rateLimiter from '../lib/sapimuRateLimiter.js';

const SAPIMU_BASE_URL = 'https://sapimu.au/dramawave/api/v1';
const SAPIMU_TOKEN = process.env.SAPIMU_TOKEN || '7a8afe6e16e01f607c82e19f035956e0492163c986f6f9654bfa822a1010a087';

// Create axios instance for sapimu
const sapimuClient = axios.create({
    baseURL: SAPIMU_BASE_URL,
    timeout: 30000,
    headers: {
        'Authorization': `Bearer ${SAPIMU_TOKEN}`,
        'Content-Type': 'application/json'
    }
});

/**
 * Normalize episode data from API response
 */
function normalizeEpisode(ep) {
    return {
        id: ep.id,
        index: ep.index,
        name: ep.name,
        cover: ep.cover,
        duration: ep.duration,
        unlock: ep.unlock,
        videoType: ep.video_type,
        videoUrl: ep.external_audio_h264_m3u8 || ep.m3u8_url || ep.video_url || null,
        videoUrlH265: ep.external_audio_h265_m3u8 || null,
        subtitles: ep.subtitle_list || [],
        playload: ep.playload
    };
}

/**
 * Get full drama details including all episodes
 * CACHED: 30 minutes TTL (Redis persistent)
 * @param {string} dramaId - Drama ID (e.g., 'xuyr3DtXPt')
 * @param {string} lang - Language code (default: 'id-ID')
 * @returns {Object} Drama details with episode_list
 */
async function getDramaDetails(dramaId, lang = 'id-ID') {
    // Check Redis cache first
    const cached = await rateLimiter.getCachedDrama(dramaId);
    if (cached) {
        console.log(`[SapimuDramawave] Redis Cache HIT for drama: ${dramaId}`);
        return {
            success: true,
            data: cached,
            source: 'redis_cache'
        };
    }

    // Check rate limit
    const rateCheck = await rateLimiter.checkRateLimit();
    if (!rateCheck.canRequest) {
        console.warn(`[SapimuDramawave] Rate limit reached: ${rateCheck.reason}`);
        return {
            success: false,
            error: `Rate limit reached (${rateCheck.reason}). Try again in ${Math.ceil(rateCheck.waitMs / 1000)}s`,
            rateLimited: true,
            waitMs: rateCheck.waitMs,
            stats: rateCheck.stats
        };
    }

    try {
        // Record the request
        await rateLimiter.recordRequest();

        const response = await sapimuClient.get(`/dramas/${dramaId}`, {
            params: { lang }
        });

        if (response.data?.code === 200) {
            const info = response.data.data?.info || {};
            const episodeList = info.episode_list || [];

            const normalizedEpisodes = episodeList.map(normalizeEpisode);

            const data = {
                id: info.id,
                name: info.name,
                description: info.desc,
                cover: info.cover,
                episodeCount: info.episode_count,
                viewCount: info.view_count,
                followCount: info.follow_count,
                finishStatus: info.finish_status,
                payMode: info.pay_mode,
                payIndex: info.pay_index,
                performers: info.performers || [],
                hotScore: info.hot_score,
                episodes: normalizedEpisodes,
                freeEpisodeCount: normalizedEpisodes.filter(ep => ep.unlock).length
            };

            // Cache the result to Redis
            await rateLimiter.cacheDrama(dramaId, data);

            return {
                success: true,
                data,
                source: 'api'
            };
        }

        return {
            success: false,
            error: response.data?.message || 'Failed to get drama details'
        };
    } catch (error) {
        console.error('[SapimuDramawave] getDramaDetails error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get specific episode by index
 * Uses Redis drama cache first to avoid extra API calls
 * @param {string} dramaId - Drama ID
 * @param {number} episodeIndex - Episode index (1-based)
 * @param {string} lang - Language code
 * @returns {Object} Episode data
 */
async function getEpisode(dramaId, episodeIndex, lang = 'id-ID') {
    // Try to get from Redis drama cache first (no API call needed)
    const cachedEpisode = await rateLimiter.getEpisodeFromDramaCache(dramaId, episodeIndex);
    if (cachedEpisode) {
        console.log(`[SapimuDramawave] Redis Cache HIT for episode: ${dramaId}:${episodeIndex}`);
        return {
            success: true,
            data: cachedEpisode,
            source: 'redis_cache'
        };
    }

    // Check rate limit
    const rateCheck = await rateLimiter.checkRateLimit();
    if (!rateCheck.canRequest) {
        return {
            success: false,
            error: `Rate limit reached (${rateCheck.reason}). Try again in ${Math.ceil(rateCheck.waitMs / 1000)}s`,
            rateLimited: true,
            waitMs: rateCheck.waitMs
        };
    }

    try {
        await rateLimiter.recordRequest();

        const response = await sapimuClient.get(`/dramas/${dramaId}/episodes/${episodeIndex}`, {
            params: { lang }
        });

        if (response.data?.code === 200) {
            const ep = response.data.data || {};
            return {
                success: true,
                data: normalizeEpisode(ep),
                source: 'api'
            };
        }

        return {
            success: false,
            error: response.data?.message || 'Episode not found'
        };
    } catch (error) {
        console.error('[SapimuDramawave] getEpisode error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get episode with video URL for playback
 * CACHED: 1 hour TTL (Redis persistent)
 * @param {string} dramaId - Drama ID
 * @param {number} episodeIndex - Episode index (1-based)
 * @param {string} lang - Language code
 * @returns {Object} Episode with video_url
 */
async function playEpisode(dramaId, episodeIndex, lang = 'id-ID') {
    // Check Redis play cache first
    const cachedPlay = await rateLimiter.getCachedEpisodePlay(dramaId, episodeIndex);
    if (cachedPlay) {
        console.log(`[SapimuDramawave] Redis Cache HIT for play: ${dramaId}:${episodeIndex}`);
        return {
            success: true,
            data: cachedPlay,
            source: 'redis_cache'
        };
    }

    // Fallback: Try to get video URL from Redis drama cache (episodes have videoUrl)
    const cachedEpisodeFromDrama = await rateLimiter.getEpisodeFromDramaCache(dramaId, episodeIndex);
    if (cachedEpisodeFromDrama && cachedEpisodeFromDrama.videoUrl) {
        console.log(`[SapimuDramawave] Using drama cache for play: ${dramaId}:${episodeIndex}`);
        // Cache this as play data too
        await rateLimiter.cacheEpisodePlay(dramaId, episodeIndex, cachedEpisodeFromDrama);
        return {
            success: true,
            data: cachedEpisodeFromDrama,
            source: 'drama_cache'
        };
    }

    // Check rate limit
    const rateCheck = await rateLimiter.checkRateLimit();
    if (!rateCheck.canRequest) {
        return {
            success: false,
            error: `Rate limit reached (${rateCheck.reason}). Try again in ${Math.ceil(rateCheck.waitMs / 1000)}s`,
            rateLimited: true,
            waitMs: rateCheck.waitMs,
            stats: rateCheck.stats
        };
    }

    try {
        await rateLimiter.recordRequest();

        const response = await sapimuClient.get(`/dramas/${dramaId}/play/${episodeIndex}`, {
            params: { lang }
        });

        if (response.data?.code === 200) {
            const ep = response.data.data || {};
            const playData = {
                id: ep.id,
                index: ep.index,
                name: ep.name,
                cover: ep.cover,
                duration: ep.duration,
                unlock: ep.unlock,
                videoType: ep.video_type,
                videoUrl: ep.video_url || ep.external_audio_h264_m3u8 || ep.m3u8_url || null,
                videoUrlH265: ep.external_audio_h265_m3u8 || null,
                m3u8Url: ep.m3u8_url,
                subtitles: ep.subtitle_list || [],
                playload: ep.playload
            };

            // Cache the play data to Redis
            await rateLimiter.cacheEpisodePlay(dramaId, episodeIndex, playData);

            return {
                success: true,
                data: playData,
                source: 'api'
            };
        }

        return {
            success: false,
            error: response.data?.message || 'Failed to play episode'
        };
    } catch (error) {
        console.error('[SapimuDramawave] playEpisode error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Parse M3U8 URL to get quality options
 * @param {string} m3u8Url - M3U8 video URL
 * @param {string} lang - Language code
 * @returns {Object} Quality options and segments
 */
async function parseVideo(m3u8Url, lang = 'id-ID') {
    // Check rate limit
    const rateCheck = await rateLimiter.checkRateLimit();
    if (!rateCheck.canRequest) {
        return {
            success: false,
            error: `Rate limit reached (${rateCheck.reason})`,
            rateLimited: true,
            waitMs: rateCheck.waitMs
        };
    }

    try {
        await rateLimiter.recordRequest();

        const response = await sapimuClient.get('/video/parse', {
            params: { url: m3u8Url, lang }
        });

        if (response.data?.code === 200) {
            return {
                success: true,
                data: response.data.data,
                source: 'api'
            };
        }

        return {
            success: false,
            error: response.data?.message || 'Failed to parse video'
        };
    } catch (error) {
        console.error('[SapimuDramawave] parseVideo error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get rate limit and cache statistics from Redis
 * @returns {Promise<Object>}
 */
async function getStats() {
    return await rateLimiter.getCacheStats();
}

export {
    getDramaDetails,
    getEpisode,
    playEpisode,
    parseVideo,
    getStats
};
