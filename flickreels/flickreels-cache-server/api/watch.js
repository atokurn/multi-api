/**
 * Watch Endpoint
 * GET /api/watch/{playletId}/{episodeId}
 * 
 * Returns video URL for specific episode
 */

import * as cache from '../lib/cache.js';
import * as flickreels from '../lib/flickreels.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Parse URL: /api/watch/{playletId}/{episodeId}
        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathParts = url.pathname.split('/').filter(Boolean);

        // pathParts = ['api', 'watch', playletId, episodeId]
        const playletId = pathParts[2];
        const episodeId = pathParts[3] || url.searchParams.get('episode');

        if (!playletId) {
            return res.status(400).json({
                success: false,
                error: 'playletId is required'
            });
        }

        // Check video URL cache first
        const videoCacheKey = `video:${playletId}:${episodeId || 'all'}`;
        const cachedVideo = await cache.get(videoCacheKey);

        if (cachedVideo) {
            const data = typeof cachedVideo === 'string' ? JSON.parse(cachedVideo) : cachedVideo;
            return res.status(200).json({
                success: true,
                source: 'cache',
                ...data
            });
        }

        // Get from episodes cache or fetch
        const episodesCacheKey = `episodes:${playletId}`;
        let episodes = await cache.get(episodesCacheKey);

        if (!episodes) {
            // Fetch and cache
            console.log(`[Watch] Fetching episodes for playletId: ${playletId}`);
            episodes = await flickreels.getChapterList(playletId);

            if (episodes.success) {
                await cache.set(episodesCacheKey, episodes, cache.TTL.EPISODES);
            }
        } else {
            episodes = typeof episodes === 'string' ? JSON.parse(episodes) : episodes;
        }

        if (!episodes?.episodes) {
            return res.status(404).json({
                success: false,
                error: 'Episodes not found'
            });
        }

        // Find specific episode or return first with video
        let targetEpisode = null;

        if (episodeId) {
            targetEpisode = episodes.episodes.find(
                ep => ep.id === episodeId || ep.index === parseInt(episodeId)
            );
        } else {
            targetEpisode = episodes.episodes.find(ep => ep.hasVideo);
        }

        if (!targetEpisode) {
            return res.status(404).json({
                success: false,
                error: 'Episode not found'
            });
        }

        if (!targetEpisode.videoUrl) {
            return res.status(404).json({
                success: false,
                error: 'Video URL not available for this episode',
                episode: targetEpisode
            });
        }

        // Cache the video URL
        const videoData = {
            playletId,
            episode: targetEpisode,
            videoUrl: targetEpisode.videoUrl
        };

        await cache.set(videoCacheKey, videoData, cache.TTL.VIDEO);

        return res.status(200).json({
            success: true,
            source: 'live',
            ...videoData
        });

    } catch (error) {
        console.error('[Watch] Error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
