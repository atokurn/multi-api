/**
 * ========================================
 * FreeReels Controller
 * ========================================
 * 
 * REST API handlers for FreeReels endpoints.
 */

import * as freereelsService from '../services/freereelsService.js';

/**
 * GET /freereels/home
 * Get home feed with sections
 */
async function getHome(req, res) {
    try {
        const result = await freereelsService.getHome();

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            provider: 'freereels',
            data: result.data
        });
    } catch (error) {
        console.error('[FreeReelsController] getHome error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get home feed',
            error: error.message
        });
    }
}

/**
 * GET /freereels/foryou
 * Get personalized recommendations
 */
async function getForYou(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const result = await freereelsService.getForYou(page, limit);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            provider: 'freereels',
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('[FreeReelsController] getForYou error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get recommendations',
            error: error.message
        });
    }
}

/**
 * GET /freereels/trending
 * Get trending/hot dramas
 */
async function getTrending(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const result = await freereelsService.getTrending(page, limit);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            provider: 'freereels',
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('[FreeReelsController] getTrending error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get trending dramas',
            error: error.message
        });
    }
}

/**
 * GET /freereels/ranking
 * Get ranking list
 */
async function getRanking(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const result = await freereelsService.getRanking(page, limit);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            provider: 'freereels',
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('[FreeReelsController] getRanking error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get ranking',
            error: error.message
        });
    }
}

/**
 * GET /freereels/search
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

        const result = await freereelsService.search(searchKeyword, page, limit);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            provider: 'freereels',
            keyword: searchKeyword,
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('[FreeReelsController] search error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to search',
            error: error.message
        });
    }
}

/**
 * GET /freereels/detail/:id
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

        const result = await freereelsService.getDetail(id);

        if (!result.success) {
            return res.status(404).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            provider: 'freereels',
            data: result.data
        });
    } catch (error) {
        console.error('[FreeReelsController] getDetail error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get detail',
            error: error.message
        });
    }
}

/**
 * GET /freereels/episodes/:id
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

        const result = await freereelsService.getEpisodes(id, page, limit);

        if (!result.success) {
            return res.status(404).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            provider: 'freereels',
            seriesId: id,
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('[FreeReelsController] getEpisodes error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get episodes',
            error: error.message
        });
    }
}

/**
 * GET /freereels/stream/:episodeId
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

        const result = await freereelsService.getVideo(episodeId);

        if (!result.success) {
            return res.status(404).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            provider: 'freereels',
            episodeId: episodeId,
            data: result.data
        });
    } catch (error) {
        console.error('[FreeReelsController] getStream error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get stream',
            error: error.message
        });
    }
}

/**
 * POST /freereels/login
 * Perform anonymous login to get token (for testing)
 */
async function login(req, res) {
    try {
        const { anonymousLogin, getCredentials } = await import('../lib/freereelsClient.js');

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
            provider: 'freereels',
            message: 'Login successful',
            data: {
                deviceId: credentials.deviceId,
                hasToken: !!credentials.token
            }
        });
    } catch (error) {
        console.error('[FreeReelsController] login error:', error.message);
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
 * GET /freereels/new
 * Get new releases
 */
async function getNewReleases(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await freereelsService.getNewReleases(page, limit);
        res.json({ success: true, provider: 'freereels', data: result.data, pagination: result.pagination });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get new releases', error: error.message });
    }
}

/**
 * GET /freereels/free
 */
async function getFreeDramas(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await freereelsService.getFreeDramas(page, limit);
        res.json({ success: true, provider: 'freereels', data: result.data, pagination: result.pagination });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get free dramas', error: error.message });
    }
}

/**
 * GET /freereels/vip
 */
async function getVipDramas(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await freereelsService.getVipDramas(page, limit);
        res.json({ success: true, provider: 'freereels', data: result.data, pagination: result.pagination });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get VIP dramas', error: error.message });
    }
}

/**
 * GET /freereels/dubbing
 */
async function getDubbingDramas(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await freereelsService.getDubbingDramas(page, limit);
        res.json({ success: true, provider: 'freereels', data: result.data, pagination: result.pagination });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get dubbing dramas', error: error.message });
    }
}

/**
 * GET /freereels/male
 */
async function getMaleDramas(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await freereelsService.getMaleDramas(page, limit);
        res.json({ success: true, provider: 'freereels', data: result.data, pagination: result.pagination });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get male dramas', error: error.message });
    }
}

/**
 * GET /freereels/female
 */
async function getFemaleDramas(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await freereelsService.getFemaleDramas(page, limit);
        res.json({ success: true, provider: 'freereels', data: result.data, pagination: result.pagination });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get female dramas', error: error.message });
    }
}

/**
 * GET /freereels/coming-soon
 */
async function getComingSoon(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await freereelsService.getComingSoon(page, limit);
        res.json({ success: true, provider: 'freereels', data: result.data, pagination: result.pagination });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get coming soon', error: error.message });
    }
}

/**
 * GET /freereels/search/hot
 */
async function getSearchHot(req, res) {
    try {
        const result = await freereelsService.getSearchHot();
        res.json({ success: true, provider: 'freereels', data: result.data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get hot words', error: error.message });
    }
}

/**
 * GET /freereels/dramas/:id/play/:episode
 */
async function playEpisodeByIndex(req, res) {
    try {
        const { id, episode } = req.params;
        const episodeIndex = parseInt(episode) || 1;
        const result = await freereelsService.playEpisodeByIndex(id, episodeIndex);

        if (!result.success) {
            return res.status(404).json({ success: false, message: result.error });
        }
        res.json({ success: true, provider: 'freereels', data: result.data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to play episode', error: error.message });
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
    playEpisodeByIndex
};

