/**
 * ========================================
 * Stream Routes
 * ========================================
 * 
 * Unified streaming routes for direct episode access.
 * 
 * Endpoints:
 * - GET /api/stream/:provider/:dramaId/:episodeIndex
 * - GET /api/stream/:provider/:dramaId
 * 
 * Query Parameters:
 * - lang: Language code (id, en, zh, ko) - default: id
 * - quality: Video quality (1080, 720, 540, 360, auto) - default: auto
 * - dubbing: Audio track (original, id, en, zh) - default: original
 * - format: Stream format (hls, mp4, dash) - default: hls
 */

import { Router } from 'express';
import streamController from '../controllers/streamController.js';

const router = Router();

/**
 * GET /api/stream/:provider/:dramaId/:episodeIndex
 * Get direct stream for a specific episode
 * 
 * @example
 * GET /api/stream/dramabox/42000000229/0?quality=720&lang=id
 * GET /api/stream/flickreels/12345/5?quality=1080
 * GET /api/stream/melolo/7123456789/0
 */
router.get('/:provider/:dramaId/:episodeIndex', streamController.getStream);

/**
 * GET /api/stream/:provider/:dramaId
 * Get all episodes with stream information
 * 
 * @example
 * GET /api/stream/dramabox/42000000229
 * GET /api/stream/flickreels/12345?quality=720
 */
router.get('/:provider/:dramaId', streamController.getAllStreams);

export default router;
