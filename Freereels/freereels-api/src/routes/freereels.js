/**
 * ========================================
 * FreeReels Routes
 * ========================================
 * 
 * Express routes for FreeReels API.
 * Prefix: /api/freereels
 */

import express from 'express';
import * as freereelsController from '../controllers/freereelsController.js';

const router = express.Router();

// ============================================
// AUTHENTICATION
// ============================================

/**
 * POST /login
 * Perform anonymous login (for testing)
 */
router.post('/login', freereelsController.login);

// ============================================
// HOME & DISCOVERY
// ============================================

/**
 * GET /home
 * Get home feed with sections
 */
router.get('/home', freereelsController.getHome);

/**
 * GET /foryou
 * Get personalized recommendations
 * Query: ?page=1&limit=20
 */
router.get('/foryou', freereelsController.getForYou);

/**
 * GET /trending
 * Get trending/hot dramas
 * Query: ?page=1&limit=20
 */
router.get('/trending', freereelsController.getTrending);

/**
 * GET /ranking
 * Get ranking list
 * Query: ?page=1&limit=20
 */
router.get('/ranking', freereelsController.getRanking);

// ============================================
// SEARCH
// ============================================

/**
 * GET /search
 * Search dramas by keyword
 * Query: ?q=keyword or ?keyword=...&page=1&limit=20
 */
router.get('/search', freereelsController.search);

// ============================================
// DETAIL & EPISODES
// ============================================

/**
 * GET /detail/:id
 * Get drama detail by series ID
 */
router.get('/detail/:id', freereelsController.getDetail);

/**
 * GET /episodes/:id
 * Get episode list for a series
 * Query: ?page=1&limit=100
 */
router.get('/episodes/:id', freereelsController.getEpisodes);

// ============================================
// STREAMING
// ============================================

/**
 * GET /stream/:episodeId
 * Get video stream for an episode
 */
router.get('/stream/:episodeId', freereelsController.getStream);

// ============================================
// NEW CATEGORY FEEDS (based on sapimu.au reference)
// ============================================

/**
 * GET /new
 * Get new releases
 */
router.get('/new', freereelsController.getNewReleases);

/**
 * GET /free
 * Get free (non-VIP) dramas
 */
router.get('/free', freereelsController.getFreeDramas);

/**
 * GET /vip
 * Get VIP exclusive dramas
 */
router.get('/vip', freereelsController.getVipDramas);

/**
 * GET /dubbing
 * Get dubbed dramas
 */
router.get('/dubbing', freereelsController.getDubbingDramas);

/**
 * GET /male
 * Get male audience dramas
 */
router.get('/male', freereelsController.getMaleDramas);

/**
 * GET /female
 * Get female audience dramas
 */
router.get('/female', freereelsController.getFemaleDramas);

/**
 * GET /coming-soon
 * Get coming soon dramas
 */
router.get('/coming-soon', freereelsController.getComingSoon);

/**
 * GET /search/hot
 * Get trending search keywords
 */
router.get('/search/hot', freereelsController.getSearchHot);

/**
 * GET /dramas/:id/play/:episode
 * Play episode by index (1-based)
 */
router.get('/dramas/:id/play/:episode', freereelsController.playEpisodeByIndex);



export default router;

