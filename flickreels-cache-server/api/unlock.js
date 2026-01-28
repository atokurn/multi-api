/**
 * Unlock Endpoint
 * POST /api/unlock
 * 
 * Unlocks a VIP episode by simulating ad watch
 */

import * as cache from '../lib/cache.js';
import * as flickreels from '../lib/flickreels.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
        let body = req.body;
        if (typeof body === 'string') {
            body = JSON.parse(body);
        }

        const playletId = body?.playletId || body?.playlet_id;
        const chapterId = body?.chapterId || body?.chapter_id;

        if (!playletId || !chapterId) {
            return res.status(400).json({
                success: false,
                error: 'playletId and chapterId are required'
            });
        }

        console.log(`[Unlock] Attempting to unlock playlet=${playletId}, chapter=${chapterId}`);

        // Try to unlock via ad reward simulation
        const result = await flickreels.unlockChapterWithAd(playletId, chapterId);

        // Check if we got a video URL
        const chapterData = result.chapter?.data?.chapter_info || result.chapter?.data;
        const videoUrl = chapterData?.hls_url;

        if (videoUrl) {
            // Cache the unlocked video URL
            const cacheKey = `video:${playletId}:${chapterId}`;
            await cache.set(cacheKey, {
                playletId,
                chapterId,
                videoUrl,
                unlockedAt: new Date().toISOString()
            }, cache.TTL.VIDEO);

            return res.status(200).json({
                success: true,
                message: 'Episode unlocked successfully',
                videoUrl,
                cached: true
            });
        }

        // Return raw result for debugging
        return res.status(200).json({
            success: false,
            message: 'Could not get video URL after unlock attempt',
            debug: result
        });

    } catch (error) {
        console.error('[Unlock] Error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
