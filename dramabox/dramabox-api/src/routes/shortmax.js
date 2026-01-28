/**
 * ShortMax Routes
 * Express router for ShortMax API endpoints
 */

import express from 'express';
import * as shortmaxController from '../controllers/shortmaxController.js';

const router = express.Router();

// For You / Recommendations
router.get('/foryou', shortmaxController.getForYou);

// Rankings
router.get('/ranking', shortmaxController.getRanking);

// Home config with banners
router.get('/home', shortmaxController.getHomeConfig);

// Drama detail by code
router.get('/detail/:code', shortmaxController.getDetail);

// Chapter list by drama ID
router.get('/chapters/:id', shortmaxController.getChapters);

// Video URL by chapter ID
router.get('/watch/:chapterId', shortmaxController.getVideoUrl);

// Search
router.get('/search', shortmaxController.search);

export default router;
