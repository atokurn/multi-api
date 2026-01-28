/**
 * Detail Endpoint
 * GET /api/detail/{playletId}
 * 
 * Returns playlet metadata
 */

import * as cache from '../lib/cache.js';
import * as flickreels from '../lib/flickreels.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathParts = url.pathname.split('/').filter(Boolean);
        const playletId = pathParts[pathParts.length - 1];

        if (!playletId || playletId === 'detail') {
            return res.status(400).json({
                success: false,
                error: 'playletId is required'
            });
        }

        const cacheKey = `detail:${playletId}`;

        // Try cache first
        const cached = await cache.get(cacheKey);
        if (cached) {
            const data = typeof cached === 'string' ? JSON.parse(cached) : cached;
            return res.status(200).json({
                success: true,
                source: 'cache',
                ...data
            });
        }

        // Fetch from API
        console.log(`[Detail] Fetching playletId: ${playletId}`);
        const data = await flickreels.getPlayletDetail(playletId);

        if (!data.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch detail',
                data
            });
        }

        // Cache the result
        await cache.set(cacheKey, data, cache.TTL.DETAIL);

        return res.status(200).json({
            success: true,
            source: 'live',
            ...data
        });

    } catch (error) {
        console.error('[Detail] Error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
