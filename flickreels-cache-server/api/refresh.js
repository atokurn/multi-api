/**
 * Refresh Endpoint
 * POST /api/cache/refresh
 * 
 * Force refresh cache for a playlet
 */

import * as cache from '../lib/cache.js';
import * as flickreels from '../lib/flickreels.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed. Use POST.'
        });
    }

    try {
        // Parse body
        let body = req.body;
        if (typeof body === 'string') {
            body = JSON.parse(body);
        }

        const playletId = body?.playletId || body?.playlet_id;

        if (!playletId) {
            return res.status(400).json({
                success: false,
                error: 'playletId is required in body'
            });
        }

        console.log(`[Refresh] Force refreshing playletId: ${playletId}`);

        // Delete existing cache
        await cache.del(`episodes:${playletId}`);
        await cache.del(`detail:${playletId}`);

        // Fetch fresh data
        const [episodes, detail] = await Promise.all([
            flickreels.getChapterList(playletId),
            flickreels.getPlayletDetail(playletId)
        ]);

        // Cache fresh data
        if (episodes.success) {
            await cache.set(`episodes:${playletId}`, episodes, cache.TTL.EPISODES);
        }
        if (detail.success) {
            await cache.set(`detail:${playletId}`, detail, cache.TTL.DETAIL);
        }

        return res.status(200).json({
            success: true,
            message: 'Cache refreshed',
            playletId,
            episodesRefreshed: episodes.success,
            detailRefreshed: detail.success,
            episodeCount: episodes.totalEpisodes || 0
        });

    } catch (error) {
        console.error('[Refresh] Error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
