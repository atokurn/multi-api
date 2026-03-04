/**
 * ========================================
 * DramaWave Data Cache
 * ========================================
 * 
 * In-memory cache for DramaWave drama data.
 * Stores data from /foryou feed to enable accurate
 * /detail and /stream lookups since upstream API
 * doesn't return detail data for string IDs.
 */

// Cache storage
const dramaCache = new Map();
const episodeCache = new Map();
const episodeIndexCache = new Map(); // key: "seriesId:index" -> episode
let lastCacheUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Store drama data in cache
 * @param {Object} drama - Drama object with id, key, title, etc.
 */
function cacheDrama(drama) {
    if (!drama) return;

    const id = drama.id || drama.key;
    if (!id) return;

    // Store by both id and key if different
    dramaCache.set(id, drama);
    if (drama.key && drama.key !== id) {
        dramaCache.set(drama.key, drama);
    }

    // Also cache current episode if present
    if (drama.currentEpisode?.id) {
        const epData = {
            ...drama.currentEpisode,
            seriesId: id,
            seriesTitle: drama.title,
            seriesCover: drama.cover
        };
        episodeCache.set(drama.currentEpisode.id, epData);
        if (drama.currentEpisode.index) {
            episodeIndexCache.set(`${id}:${drama.currentEpisode.index}`, epData);
        }
    }

    // Cache episodes from episode_list if present
    if (Array.isArray(drama.episodes)) {
        cacheEpisodeList(id, drama.title, drama.cover, drama.episodes);
    }
}

/**
 * Store multiple dramas from foryou/search results
 * @param {Array} dramas - Array of drama objects
 */
function cacheDramas(dramas) {
    if (!Array.isArray(dramas)) return;

    dramas.forEach(drama => cacheDrama(drama));
    lastCacheUpdate = Date.now();

    console.log(`[DramaCache] Cached ${dramas.length} dramas, total: ${dramaCache.size}`);
}

/**
 * Get drama from cache by ID or key
 * @param {string} id - Drama ID or key
 * @returns {Object|null} Drama object or null
 */
function getDrama(id) {
    return dramaCache.get(id) || null;
}

/**
 * Get episode from cache by ID
 * @param {string} episodeId - Episode ID
 * @returns {Object|null} Episode object or null
 */
function getEpisode(episodeId) {
    return episodeCache.get(episodeId) || null;
}

/**
 * Get episode from cache by series ID and episode index
 * @param {string} seriesId - Series ID or key
 * @param {number} index - Episode index (1-based)
 * @returns {Object|null} Episode object or null
 */
function getEpisodeByIndex(seriesId, index) {
    return episodeIndexCache.get(`${seriesId}:${index}`) || null;
}

/**
 * Cache all episodes from an episode list
 * @param {string} seriesId - Series ID
 * @param {string} seriesTitle - Series title
 * @param {string} seriesCover - Series cover URL
 * @param {Array} episodes - Array of episode objects
 */
function cacheEpisodeList(seriesId, seriesTitle, seriesCover, episodes) {
    if (!Array.isArray(episodes) || !seriesId) return;

    let cached = 0;
    for (const ep of episodes) {
        const epData = {
            ...ep,
            seriesId,
            seriesTitle: seriesTitle || '',
            seriesCover: seriesCover || ''
        };

        if (ep.id) {
            episodeCache.set(ep.id, epData);
        }
        if (ep.index) {
            episodeIndexCache.set(`${seriesId}:${ep.index}`, epData);
        }
        cached++;
    }

    if (cached > 0) {
        console.log(`[DramaCache] Cached ${cached} episodes for series: ${seriesId}`);
    }
}

/**
 * Check if cache is stale
 * @returns {boolean}
 */
function isCacheStale() {
    return Date.now() - lastCacheUpdate > CACHE_TTL;
}

/**
 * Get cache stats
 * @returns {Object}
 */
function getCacheStats() {
    return {
        dramaCount: dramaCache.size,
        episodeCount: episodeCache.size,
        episodeIndexCount: episodeIndexCache.size,
        lastUpdate: lastCacheUpdate,
        isStale: isCacheStale(),
        ttlRemaining: Math.max(0, CACHE_TTL - (Date.now() - lastCacheUpdate))
    };
}

/**
 * Clear all cache
 */
function clearCache() {
    dramaCache.clear();
    episodeCache.clear();
    episodeIndexCache.clear();
    lastCacheUpdate = 0;
    console.log('[DramaCache] Cache cleared');
}

/**
 * Get all cached dramas (for debugging)
 * @returns {Array}
 */
function getAllDramas() {
    return Array.from(dramaCache.values());
}

export {
    cacheDrama,
    cacheDramas,
    getDrama,
    getEpisode,
    getEpisodeByIndex,
    cacheEpisodeList,
    isCacheStale,
    getCacheStats,
    clearCache,
    getAllDramas
};
