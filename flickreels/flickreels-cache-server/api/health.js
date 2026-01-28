/**
 * Health Check Endpoint
 */

export default function handler(req, res) {
    res.status(200).json({
        success: true,
        service: 'flickreels-cache-server',
        status: 'healthy',
        version: '1.0.0',
        endpoints: {
            '/api/episodes/{playletId}': 'Get cached episodes with video URLs',
            '/api/watch/{playletId}/{episodeId}': 'Get video URL',
            '/api/detail/{playletId}': 'Get playlet metadata',
            '/api/cache/refresh': 'Force refresh cache'
        }
    });
}
