/**
 * Episodes Endpoint
 * GET /api/episodes/{playletId}
 * 
 * Returns cached episode list with video URLs
 */

import * as cache from '../lib/cache.js';
import * as flickreels from '../lib/flickreels.js';

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Extract playletId from URL
        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathParts = url.pathname.split('/').filter(Boolean);
        const playletId = pathParts[pathParts.length - 1];

        if (!playletId || playletId === 'episodes') {
            return res.status(400).json({
                success: false,
                error: 'playletId is required'
            });
        }

        const cacheKey = `episodes:${playletId}`;

        // Try cache first
        const cached = await cache.get(cacheKey);
        if (cached) {
            const data = typeof cached === 'string' ? JSON.parse(cached) : cached;
            const remainingTtl = await cache.ttl(cacheKey);

            return res.status(200).json({
                success: true,
                source: 'cache',
                ttl: remainingTtl,
                ...data
            });
        }

        // Fetch from API
        console.log(`[Episodes] Cache miss, fetching playletId: ${playletId}`);
        const data = await flickreels.getChapterList(playletId);

        if (!data.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch episodes',
                data
            });
        }

        // Cache the result
        await cache.set(cacheKey, data, cache.TTL.EPISODES);

        return res.status(200).json({
            success: true,
            source: 'live',
            ...data
        });

    } catch (error) {
        console.error('[Episodes] Error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
