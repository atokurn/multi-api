/**
 * ========================================
 * Melolo Routes
 * ========================================
 * 
 * Route definitions for Melolo API endpoints.
 * Prefix: /api/melolo
 * 
 * Simplified API - works without manual token refresh
 * Stream endpoint uses direct API with ByteDance signatures for video URLs
 */

import express from 'express';
import * as controller from '../controllers/meloloController.js';

const router = express.Router();

// ============================================
// HOME & BROWSE
// ============================================

router.get('/languages', controller.getLanguages);
router.get('/home', controller.getHome);
router.get('/foryou', controller.getForYou);
router.get('/ranking', controller.getRanking);
router.get('/latest', controller.getLatest);
router.get('/trending', controller.getTrending);
router.get('/categories', controller.getCategories);

// ============================================
// SEARCH
// ============================================

router.get('/search', controller.search);
router.get('/search/suggestions', controller.getSearchSuggestions);
router.get('/search/popular', controller.getSearchPopular);

// ============================================
// DETAIL & EPISODES
// ============================================

router.get('/detail/:bookId', controller.getDetail);
router.get('/detail', controller.getDetail);  // Support query param
router.get('/episodes/:seriesId', controller.getEpisodes);
router.get('/episodes', controller.getEpisodes);  // Support query param
router.get('/directory/:bookId', controller.getDirectory);
router.get('/directory', controller.getDirectory);  // Support query param

// ============================================
// VIDEO STREAMING (Direct API + Signature Server)
// ============================================

// Primary stream endpoint - uses direct API with fallback to signature server
router.get('/stream', controller.getStream);
router.get('/stream/:videoId', controller.getStream);

// Legacy video endpoint - uses direct API
router.get('/video/:seriesId', controller.getVideo);
router.get('/video', controller.getVideo);  // Support query param

// ============================================
// USER DATA (May require auth)
// ============================================

router.get('/bookshelf', controller.getBookshelf);
router.get('/history', controller.getHistory);

export default router;

