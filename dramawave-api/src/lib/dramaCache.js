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
        episodeCache.set(drama.currentEpisode.id, {
            ...drama.currentEpisode,
            seriesId: id,
            seriesTitle: drama.title,
            seriesCover: drama.cover
        });
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
    isCacheStale,
    getCacheStats,
    clearCache,
    getAllDramas
};
