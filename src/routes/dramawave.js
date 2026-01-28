/**
 * ========================================
 * DramaWave Routes
 * ========================================
 * 
 * Express routes for DramaWave API.
 * Prefix: /api/dramawave
 */

import express from 'express';
import * as dramawaveController from '../controllers/dramawaveController.js';

const router = express.Router();

// ============================================
// AUTHENTICATION
// ============================================

/**
 * POST /login
 * Perform anonymous login (for testing)
 */
router.post('/login', dramawaveController.login);

// ============================================
// HOME & DISCOVERY
// ============================================

/**
 * GET /home
 * Get home feed with sections
 */
router.get('/home', dramawaveController.getHome);

/**
 * GET /foryou
 * Get personalized recommendations
 * Query: ?page=1&limit=20
 */
router.get('/foryou', dramawaveController.getForYou);

/**
 * GET /trending
 * Get trending/hot dramas
 * Query: ?page=1&limit=20
 */
router.get('/trending', dramawaveController.getTrending);

/**
 * GET /ranking
 * Get ranking list
 * Query: ?page=1&limit=20
 */
router.get('/ranking', dramawaveController.getRanking);

// ============================================
// SEARCH
// ============================================

/**
 * GET /search
 * Search dramas by keyword
 * Query: ?q=keyword or ?keyword=...&page=1&limit=20
 */
router.get('/search', dramawaveController.search);

// ============================================
// DETAIL & EPISODES
// ============================================

/**
 * GET /detail/:id
 * Get drama detail by series ID
 */
router.get('/detail/:id', dramawaveController.getDetail);

/**
 * GET /episodes/:id
 * Get episode list for a series
 * Query: ?page=1&limit=100
 */
router.get('/episodes/:id', dramawaveController.getEpisodes);

// ============================================
// STREAMING
// ============================================

/**
 * GET /stream/:episodeId
 * Get video stream for an episode
 */
router.get('/stream/:episodeId', dramawaveController.getStream);

// ============================================
// NEW CATEGORY FEEDS (based on sapimu.au reference)
// ============================================

/**
 * GET /new
 * Get new releases
 */
router.get('/new', dramawaveController.getNewReleases);

/**
 * GET /free
 * Get free (non-VIP) dramas
 */
router.get('/free', dramawaveController.getFreeDramas);

/**
 * GET /vip
 * Get VIP exclusive dramas
 */
router.get('/vip', dramawaveController.getVipDramas);

/**
 * GET /dubbing
 * Get dubbed dramas
 */
router.get('/dubbing', dramawaveController.getDubbingDramas);

/**
 * GET /male
 * Get male audience dramas
 */
router.get('/male', dramawaveController.getMaleDramas);

/**
 * GET /female
 * Get female audience dramas
 */
router.get('/female', dramawaveController.getFemaleDramas);

/**
 * GET /coming-soon
 * Get coming soon dramas
 */
router.get('/coming-soon', dramawaveController.getComingSoon);

/**
 * GET /search/hot
 * Get trending search keywords
 */
router.get('/search/hot', dramawaveController.getSearchHot);

/**
 * GET /dramas/:id/play/:episode
 * Play episode by index (1-based)
 */
router.get('/dramas/:id/play/:episode', dramawaveController.playEpisodeByIndex);

// ============================================
// V2 ENDPOINTS - Sapimu Proxy (Full Episode List)
// ============================================

/**
 * GET /v2/detail/:id
 * Get full drama details with complete episode list (via sapimu.au)
 * Returns video URLs for free episodes (typically 1-10)
 * Query: ?lang=id-ID
 */
router.get('/v2/detail/:id', dramawaveController.getDetailV2);

/**
 * GET /v2/play/:id/:episode
 * Play episode by index via sapimu.au
 * Works for free episodes (typically 1-10)
 * Query: ?lang=id-ID
 */
router.get('/v2/play/:id/:episode', dramawaveController.playEpisodeV2);

/**
 * GET /v2/episode/:id/:index
 * Get specific episode data by index (via sapimu.au)
 * Query: ?lang=id-ID
 */
router.get('/v2/episode/:id/:index', dramawaveController.getEpisodeV2);

/**
 * GET /v2/stats
 * Get rate limit and cache statistics
 */
router.get('/v2/stats', dramawaveController.getStatsV2);

export default router;

