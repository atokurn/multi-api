/**
 * ========================================
 * FlickReels Routes
 * ========================================
 * 
 * Route definitions for FlickReels API endpoints.
 * Prefix: /api/flickreels
 */

import express from 'express';
import * as controller from '../controllers/flickreelsController.js';

const router = express.Router();

// ============================================
// HOME & BROWSE
// ============================================

router.get('/languages', controller.getLanguages);
router.get('/home', controller.getHome);
router.get('/navigation', controller.getNavigation);
router.get('/foryou', controller.getForYou);
router.get('/ranking', controller.getRanking);
router.get('/recommend', controller.getRecommend);
router.get('/firstlook', controller.getFirstLook);

// ============================================
// SEARCH
// ============================================

router.get('/search', controller.search);

// ============================================
// DETAIL & EPISODES
// ============================================

router.get('/detail/:playletId', controller.getDetail);
router.get('/detail', controller.getDetail);  // Support query param
router.get('/episodes/:playletId', controller.getEpisodes);
router.get('/episodes', controller.getEpisodes);  // Support query param

// ============================================
// CONFIG & AUTH
// ============================================

router.get('/bootstrap', controller.getBootstrap);
router.post('/login', controller.login);
router.get('/login', controller.login);  // Allow GET for easy testing

export default router;
