/**
 * ========================================
 * Database Connection (Neon Serverless)
 * ========================================
 * 
 * PostgreSQL connection using Neon serverless driver.
 * Optimized for serverless environments like Vercel.
 */

import { neon } from '@neondatabase/serverless';

// Lazy-initialized SQL function
let _sql = null;

function getSql() {
    if (!_sql) {
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            throw new Error('DATABASE_URL not configured');
        }
        _sql = neon(dbUrl);
    }
    return _sql;
}

/**
 * Initialize database schema
 */
async function initSchema() {
    try {
        await getSql()`
            CREATE TABLE IF NOT EXISTS flickreels_episodes (
                id SERIAL PRIMARY KEY,
                playlet_id VARCHAR(20) NOT NULL,
                chapter_id VARCHAR(20) NOT NULL,
                chapter_num INTEGER,
                title VARCHAR(255),
                hls_url TEXT,
                cover_url TEXT,
                duration INTEGER,
                is_vip BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(playlet_id, chapter_id)
            )
        `;

        await getSql()`
            CREATE INDEX IF NOT EXISTS idx_playlet_chapter 
            ON flickreels_episodes(playlet_id, chapter_id)
        `;

        console.log('[DB] Schema initialized');
        return true;
    } catch (error) {
        console.error('[DB] Schema init error:', error.message);
        return false;
    }
}

/**
 * Get cached episodes for a playlet
 */
async function getCachedEpisodes(playletId) {
    try {
        const rows = await getSql()`
            SELECT * FROM flickreels_episodes 
            WHERE playlet_id = ${String(playletId)}
            ORDER BY chapter_num ASC
        `;
        return rows;
    } catch (error) {
        console.error('[DB] getCachedEpisodes error:', error.message);
        return [];
    }
}

/**
 * Get single cached episode
 */
async function getCachedEpisode(playletId, chapterId) {
    try {
        const rows = await getSql()`
            SELECT * FROM flickreels_episodes 
            WHERE playlet_id = ${String(playletId)} 
            AND chapter_id = ${String(chapterId)}
            LIMIT 1
        `;
        return rows[0] || null;
    } catch (error) {
        console.error('[DB] getCachedEpisode error:', error.message);
        return null;
    }
}

/**
 * Cache multiple episodes (upsert)
 * @param {string} playletId - Drama ID
 * @param {Array} episodes - Episodes to cache
 * @param {string} source - URL source: 'vip' or 'ad_reward'
 */
async function cacheEpisodes(playletId, episodes, source = 'vip') {
    if (!episodes || episodes.length === 0) return 0;

    let cached = 0;

    for (const ep of episodes) {
        // Only cache episodes with valid hls_url
        if (!ep.hls_url || ep.hls_url.trim() === '') continue;

        try {
            await getSql()`
                INSERT INTO flickreels_episodes 
                (playlet_id, chapter_id, chapter_num, title, hls_url, cover_url, duration, is_vip, source)
                VALUES (
                    ${String(playletId)},
                    ${String(ep.chapter_id)},
                    ${ep.chapter_num || 0},
                    ${ep.chapter_title || ep.title || ''},
                    ${ep.hls_url},
                    ${ep.chapter_cover || ''},
                    ${ep.duration || 0},
                    ${ep.is_vip_episode === 1 || ep.isVip === true},
                    ${source}
                )
                ON CONFLICT (playlet_id, chapter_id) 
                DO UPDATE SET 
                    hls_url = EXCLUDED.hls_url,
                    source = EXCLUDED.source,
                    updated_at = NOW()
            `;
            cached++;
        } catch (error) {
            console.error(`[DB] Cache episode ${ep.chapter_id} error:`, error.message);
        }
    }

    console.log(`[DB] Cached ${cached}/${episodes.length} episodes (source=${source}) for playlet ${playletId}`);
    return cached;
}

/**
 * Get cache statistics with source breakdown
 */
async function getCacheStats() {
    try {
        const stats = await getSql()`
            SELECT 
                COUNT(DISTINCT playlet_id) as total_dramas,
                COUNT(*) as total_episodes,
                COUNT(CASE WHEN is_vip THEN 1 END) as vip_episodes,
                COUNT(CASE WHEN source = 'vip' THEN 1 END) as vip_source_count,
                COUNT(CASE WHEN source = 'ad_reward' THEN 1 END) as ad_reward_source_count,
                MAX(created_at) as last_cached
            FROM flickreels_episodes
        `;
        return stats[0];
    } catch (error) {
        console.error('[DB] getCacheStats error:', error.message);
        return null;
    }
}

/**
 * Invalidate cache for a playlet (delete all episodes)
 */
async function invalidateCache(playletId) {
    try {
        const result = await getSql()`
            DELETE FROM flickreels_episodes 
            WHERE playlet_id = ${String(playletId)}
            RETURNING id
        `;
        console.log(`[DB] Invalidated ${result.length} episodes for playlet ${playletId}`);
        return result.length;
    } catch (error) {
        console.error('[DB] invalidateCache error:', error.message);
        return 0;
    }
}

/**
 * Invalidate single episode from cache
 */
async function invalidateEpisode(playletId, chapterId) {
    try {
        const result = await getSql()`
            DELETE FROM flickreels_episodes 
            WHERE playlet_id = ${String(playletId)} 
            AND chapter_id = ${String(chapterId)}
            RETURNING id
        `;
        return result.length > 0;
    } catch (error) {
        console.error('[DB] invalidateEpisode error:', error.message);
        return false;
    }
}

export {
    getSql,
    initSchema,
    getCachedEpisodes,
    getCachedEpisode,
    cacheEpisodes,
    getCacheStats,
    invalidateCache,
    invalidateEpisode
};
