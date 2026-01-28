/**
 * ========================================
 * DramaWave Controller
 * ========================================
 * 
 * REST API handlers for DramaWave endpoints.
 */

import * as dramawaveService from '../services/dramawaveService.js';

/**
 * GET /dramawave/home
 * Get home feed with sections
 */
async function getHome(req, res) {
    try {
        const result = await dramawaveService.getHome();

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            provider: 'dramawave',
            data: result.data
        });
    } catch (error) {
        console.error('[DramaWaveController] getHome error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get home feed',
            error: error.message
        });
    }
}

/**
 * GET /dramawave/foryou
 * Get personalized recommendations
 */
async function getForYou(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const result = await dramawaveService.getForYou(page, limit);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            provider: 'dramawave',
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('[DramaWaveController] getForYou error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get recommendations',
            error: error.message
        });
    }
}

/**
 * GET /dramawave/trending
 * Get trending/hot dramas
 */
async function getTrending(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const result = await dramawaveService.getTrending(page, limit);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            provider: 'dramawave',
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('[DramaWaveController] getTrending error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get trending dramas',
            error: error.message
        });
    }
}

/**
 * GET /dramawave/ranking
 * Get ranking list
 */
async function getRanking(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const result = await dramawaveService.getRanking(page, limit);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            provider: 'dramawave',
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('[DramaWaveController] getRanking error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get ranking',
            error: error.message
        });
    }
}

/**
 * GET /dramawave/search
 * Search dramas by keyword
 */
async function search(req, res) {
    try {
        const { q, keyword } = req.query;
        const searchKeyword = q || keyword;

        if (!searchKeyword) {
            return res.status(400).json({
                success: false,
                message: 'Search keyword is required (use ?q=... or ?keyword=...)'
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const result = await dramawaveService.search(searchKeyword, page, limit);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            provider: 'dramawave',
            keyword: searchKeyword,
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('[DramaWaveController] search error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to search',
            error: error.message
        });
    }
}

/**
 * GET /dramawave/detail/:id
 * Get drama detail by series ID
 */
async function getDetail(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Series ID is required'
            });
        }

        const result = await dramawaveService.getDetail(id);

        if (!result.success) {
            return res.status(404).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            provider: 'dramawave',
            data: result.data
        });
    } catch (error) {
        console.error('[DramaWaveController] getDetail error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get detail',
            error: error.message
        });
    }
}

/**
 * GET /dramawave/episodes/:id
 * Get episode list for a series
 */
async function getEpisodes(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Series ID is required'
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;

        const result = await dramawaveService.getEpisodes(id, page, limit);

        if (!result.success) {
            return res.status(404).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            provider: 'dramawave',
            seriesId: id,
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('[DramaWaveController] getEpisodes error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get episodes',
            error: error.message
        });
    }
}

/**
 * GET /dramawave/stream/:episodeId
 * Get video stream for an episode
 */
async function getStream(req, res) {
    try {
        const { episodeId } = req.params;

        if (!episodeId) {
            return res.status(400).json({
                success: false,
                message: 'Episode ID is required'
            });
        }

        const result = await dramawaveService.getVideo(episodeId);

        if (!result.success) {
            return res.status(404).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            provider: 'dramawave',
            episodeId: episodeId,
            data: result.data
        });
    } catch (error) {
        console.error('[DramaWaveController] getStream error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get stream',
            error: error.message
        });
    }
}

/**
 * POST /dramawave/login
 * Perform anonymous login to get token (for testing)
 */
async function login(req, res) {
    try {
        const { anonymousLogin, getCredentials } = await import('../lib/dramawaveClient.js');

        const result = await anonymousLogin();

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        const credentials = getCredentials();

        res.json({
            success: true,
            provider: 'dramawave',
            message: 'Login successful',
            data: {
                deviceId: credentials.deviceId,
                hasToken: !!credentials.token
            }
        });
    } catch (error) {
        console.error('[DramaWaveController] login error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to login',
            error: error.message
        });
    }
}

// ============================================
// NEW CATEGORY FEED HANDLERS
// ============================================

/**
 * GET /dramawave/new
 * Get new releases
 */
async function getNewReleases(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await dramawaveService.getNewReleases(page, limit);
        res.json({ success: true, provider: 'dramawave', data: result.data, pagination: result.pagination });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get new releases', error: error.message });
    }
}

/**
 * GET /dramawave/free
 */
async function getFreeDramas(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await dramawaveService.getFreeDramas(page, limit);
        res.json({ success: true, provider: 'dramawave', data: result.data, pagination: result.pagination });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get free dramas', error: error.message });
    }
}

/**
 * GET /dramawave/vip
 */
async function getVipDramas(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await dramawaveService.getVipDramas(page, limit);
        res.json({ success: true, provider: 'dramawave', data: result.data, pagination: result.pagination });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get VIP dramas', error: error.message });
    }
}

/**
 * GET /dramawave/dubbing
 */
async function getDubbingDramas(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await dramawaveService.getDubbingDramas(page, limit);
        res.json({ success: true, provider: 'dramawave', data: result.data, pagination: result.pagination });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get dubbing dramas', error: error.message });
    }
}

/**
 * GET /dramawave/male
 */
async function getMaleDramas(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await dramawaveService.getMaleDramas(page, limit);
        res.json({ success: true, provider: 'dramawave', data: result.data, pagination: result.pagination });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get male dramas', error: error.message });
    }
}

/**
 * GET /dramawave/female
 */
async function getFemaleDramas(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await dramawaveService.getFemaleDramas(page, limit);
        res.json({ success: true, provider: 'dramawave', data: result.data, pagination: result.pagination });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get female dramas', error: error.message });
    }
}

/**
 * GET /dramawave/coming-soon
 */
async function getComingSoon(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await dramawaveService.getComingSoon(page, limit);
        res.json({ success: true, provider: 'dramawave', data: result.data, pagination: result.pagination });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get coming soon', error: error.message });
    }
}

/**
 * GET /dramawave/search/hot
 */
async function getSearchHot(req, res) {
    try {
        const result = await dramawaveService.getSearchHot();
        res.json({ success: true, provider: 'dramawave', data: result.data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get hot words', error: error.message });
    }
}

/**
 * GET /dramawave/dramas/:id/play/:episode
 */
async function playEpisodeByIndex(req, res) {
    try {
        const { id, episode } = req.params;
        const episodeIndex = parseInt(episode) || 1;
        const result = await dramawaveService.playEpisodeByIndex(id, episodeIndex);

        if (!result.success) {
            return res.status(404).json({ success: false, message: result.error });
        }
        res.json({ success: true, provider: 'dramawave', data: result.data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to play episode', error: error.message });
    }
}

// ============================================
// V2 ENDPOINTS - Using Sapimu Proxy for Full Episode List
// ============================================

import * as sapimuService from '../services/sapimuDramawaveService.js';

/**
 * GET /dramawave/v2/detail/:id
 * Get full drama details with complete episode list (via sapimu.au)
 * Returns video URLs for free episodes (typically 1-10)
 */
async function getDetailV2(req, res) {
    try {
        const { id } = req.params;
        const lang = req.query.lang || 'id-ID';

        const result = await sapimuService.getDramaDetails(id, lang);

        if (!result.success) {
            return res.status(404).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            provider: 'dramawave-v2',
            source: 'sapimu',
            data: result.data
        });
    } catch (error) {
        console.error('[DramaWaveController] getDetailV2 error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get drama details',
            error: error.message
        });
    }
}

/**
 * GET /dramawave/v2/play/:id/:episode
 * Play specific episode by index (via sapimu.au)
 * Works for free episodes (typically 1-10)
 */
async function playEpisodeV2(req, res) {
    try {
        const { id, episode } = req.params;
        const lang = req.query.lang || 'id-ID';
        const episodeIndex = parseInt(episode) || 1;

        const result = await sapimuService.playEpisode(id, episodeIndex, lang);

        if (!result.success) {
            return res.status(404).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            provider: 'dramawave-v2',
            source: 'sapimu',
            data: result.data
        });
    } catch (error) {
        console.error('[DramaWaveController] playEpisodeV2 error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to play episode',
            error: error.message
        });
    }
}

/**
 * GET /dramawave/v2/episode/:id/:index
 * Get episode data by index (via sapimu.au)
 */
async function getEpisodeV2(req, res) {
    try {
        const { id, index } = req.params;
        const lang = req.query.lang || 'id-ID';
        const episodeIndex = parseInt(index) || 1;

        const result = await sapimuService.getEpisode(id, episodeIndex, lang);

        if (!result.success) {
            return res.status(404).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            provider: 'dramawave-v2',
            source: 'sapimu',
            data: result.data
        });
    } catch (error) {
        console.error('[DramaWaveController] getEpisodeV2 error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get episode',
            error: error.message
        });
    }
}

/**
 * GET /dramawave/v2/stats
 * Get rate limit and cache statistics
 */
async function getStatsV2(req, res) {
    try {
        const stats = await sapimuService.getStats();

        // Add env var debug info
        const envDebug = {
            hasUpstashUrl: !!process.env.UPSTASH_REDIS_REST_URL,
            hasUpstashToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
            hasRedisUrl: !!process.env.REDIS_URL,
            upstashUrlPrefix: process.env.UPSTASH_REDIS_REST_URL?.substring(0, 30) || null
        };

        res.json({
            success: true,
            provider: 'dramawave-v2',
            stats,
            envDebug
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get stats',
            error: error.message
        });
    }
}

export {
    getHome,
    getForYou,
    getTrending,
    getRanking,
    search,
    getDetail,
    getEpisodes,
    getStream,
    login,
    // New endpoints
    getNewReleases,
    getFreeDramas,
    getVipDramas,
    getDubbingDramas,
    getMaleDramas,
    getFemaleDramas,
    getComingSoon,
    getSearchHot,
    playEpisodeByIndex,
    // V2 endpoints (sapimu proxy)
    getDetailV2,
    playEpisodeV2,
    getEpisodeV2,
    getStatsV2
};

