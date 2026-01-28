/**
 * Unlock Endpoint with Cache-Check
 * POST /api/unlock
 * 
 * 1. Check Redis cache first (prevent duplicate unlocks)
 * 2. Acquire lock (prevent race conditions)
 * 3. Call FlickReels API
 * 4. Save to shared cache
 */

import * as cache from '../lib/cache.js';
import * as flickreels from '../lib/flickreels.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Use POST' });
    }

    try {
        let body = req.body;
        if (typeof body === 'string') body = JSON.parse(body);

        const playletId = body?.playletId || body?.playlet_id;
        const chapterId = body?.chapterId || body?.chapter_id;

        if (!playletId || !chapterId) {
            return res.status(400).json({ success: false, error: 'playletId and chapterId required' });
        }

        const cacheKey = `video:${playletId}:${chapterId}`;

        // 1. Check cache first (prevent duplicate unlocks)
        const cached = await cache.get(cacheKey);
        if (cached) {
            const data = typeof cached === 'string' ? JSON.parse(cached) : cached;
            console.log(`[Unlock] Cache hit for ${cacheKey}`);
            return res.status(200).json({
                success: true,
                source: 'cache',
                videoUrl: data.videoUrl,
                cachedAt: data.cachedAt
            });
        }

        // 2. Acquire lock (prevent race conditions between nodes)
        const hasLock = await cache.acquireLock(cacheKey);
        if (!hasLock) {
            // Another node is currently unlocking this episode
            console.log(`[Unlock] Lock exists for ${cacheKey}, waiting...`);
            await new Promise(r => setTimeout(r, 2000));

            // Check cache again
            const cached2 = await cache.get(cacheKey);
            if (cached2) {
                const data = typeof cached2 === 'string' ? JSON.parse(cached2) : cached2;
                return res.status(200).json({
                    success: true,
                    source: 'cache',
                    videoUrl: data.videoUrl
                });
            }
        }

        try {
            // 3. Call FlickReels unlock API
            console.log(`[Unlock] Calling FlickReels API for ${cacheKey}`);
            const result = await flickreels.unlockChapter(playletId, chapterId);

            if (result.success && result.videoUrl) {
                // 4. Save to shared cache
                await cache.set(cacheKey, {
                    videoUrl: result.videoUrl,
                    nodeId: flickreels.NODE_ID,
                    cachedAt: new Date().toISOString()
                }, cache.TTL.VIDEO);

                return res.status(200).json({
                    success: true,
                    source: 'live',
                    nodeId: flickreels.NODE_ID,
                    videoUrl: result.videoUrl
                });
            }

            // Handle errors
            if (result.error === 'LIMIT_REACHED') {
                return res.status(429).json({
                    success: false,
                    error: 'LIMIT_REACHED',
                    message: result.message,
                    nodeId: flickreels.NODE_ID
                });
            }

            return res.status(500).json({
                success: false,
                error: result.error || 'UNLOCK_FAILED',
                nodeId: flickreels.NODE_ID,
                debug: result
            });

        } finally {
            // Always release lock
            await cache.releaseLock(cacheKey);
        }

    } catch (error) {
        console.error('[Unlock] Error:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
}
