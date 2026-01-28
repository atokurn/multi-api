/**
 * ========================================
 * DramaBox Direct Routes
 * ========================================
 * 
 * Routes untuk mengakses DramaBox API secara langsung.
 * Endpoint prefix: /api/dramabox
 * 
 * Compatible with strim project endpoints
 */

import express from 'express';
import * as controller from '../controllers/dramaboxDirectController.js';

const router = express.Router();

// ============================================
// HOME & BROWSE
// ============================================

router.get('/home', controller.getHome);
router.get('/recommend', controller.getRecommend);
router.get('/latest', controller.getLatest);
router.get('/ranking', controller.getRanking);

// New endpoints for strim compatibility
router.get('/vip', controller.getVip);
router.get('/dubindo', controller.getDubindo);
router.get('/foryou', controller.getForYou);
router.get('/trending', controller.getTrending);
router.get('/randomdrama', controller.getRandomDrama);

// ============================================
// SEARCH
// ============================================

router.get('/search', controller.search);
router.get('/search-index', controller.getSearchIndex);
router.get('/populersearch', controller.getPopulerSearch);

// ============================================
// DETAIL & EPISODES
// ============================================

router.get('/detail/:bookId', controller.getDetail);
router.get('/detail', controller.getDetail);  // Support query param: ?bookId=...
router.get('/episodes/:bookId', controller.getEpisodes);
router.get('/allepisode/:bookId', controller.getEpisodes);  // Alias for strim
router.get('/allepisode', controller.getEpisodes);  // Support query param

// ============================================
// NEW ENDPOINTS (Based on DramaHub API)
// ============================================

// Genre/Category filter
router.get('/classify', controller.getClassify);
router.get('/genres', controller.getGenres);

// Direct video URL for specific episode
router.get('/watch/:bookId/:episodeIndex', controller.getWatchVideo);
router.get('/watch/:bookId', controller.getWatchVideo);  // Default to episode 0

// Search suggestions
router.get('/suggest', controller.getSuggest);

export default router;

