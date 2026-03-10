/**
 * NetShort API Routes
 */

import express from 'express';
import netshortController from '../controllers/netshortController.js';

const router = express.Router();

// Home / Recommendations
router.get('/home', netshortController.getHome);

// Search
router.get('/search', netshortController.search);

// Drama Detail
router.get('/detail/:id', netshortController.getDetail);

// Episode List (Chapters)
router.get('/chapters/:id', netshortController.getChapters);

// Play / Video URL
router.get('/play/:dramaId/:episodeId', netshortController.play);

// Play History
router.get('/history', netshortController.getHistory);

export default router;
