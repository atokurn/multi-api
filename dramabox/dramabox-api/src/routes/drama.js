/**
 * ========================================
 * Drama Routes
 * ========================================
 * 
 * Routes mendefinisikan URL endpoints dan menghubungkannya
 * dengan controller functions.
 * 
 * Struktur URL:
 * - Method: GET, POST, PUT, DELETE, dll
 * - Path: URL path setelah base URL
 * - Handler: Function yang memproses request
 * 
 * Routes HANYA bertugas mapping URL → Controller.
 * Tidak ada logic di sini.
 */

import express from 'express';
const router = express.Router();

// Import controller
import * as dramaController from '../controllers/dramaController.js';

// ============================================
// ROUTE DEFINITIONS
// ============================================

/**
 * GET /api/drama/trending
 * Mendapatkan daftar drama yang sedang trending
 */
router.get('/trending', dramaController.getTrending);

/**
 * GET /api/drama/latest
 * Mendapatkan daftar drama terbaru
 */
router.get('/latest', dramaController.getLatest);

/**
 * GET /api/drama/foryou
 * Mendapatkan rekomendasi drama untuk user
 */
router.get('/foryou', dramaController.getForYou);

/**
 * GET /api/drama/vip
 * Mendapatkan daftar drama VIP
 */
router.get('/vip', dramaController.getVip);

/**
 * GET /api/drama/search?query=...
 * Mencari drama berdasarkan kata kunci
 * Query params:
 * - query (required): Kata kunci pencarian
 */
router.get('/search', dramaController.search);

/**
 * GET /api/drama/popular-search
 * Mendapatkan daftar pencarian populer
 */
router.get('/popular-search', dramaController.getPopularSearch);

/**
 * GET /api/drama/dubindo?classify=...&page=...
 * Mendapatkan drama dubbing Indonesia
 * Query params:
 * - classify: 'terpopuler' atau 'terbaru'
 * - page: Nomor halaman (opsional)
 */
router.get('/dubindo', dramaController.getDubIndo);

/**
 * GET /api/drama/random
 * Mendapatkan random drama video
 */
router.get('/random', dramaController.getRandomDrama);

/**
 * GET /api/drama/detail/:bookId
 * Mendapatkan detail drama berdasarkan bookId
 * Route params:
 * - bookId (required): ID unik drama
 */
router.get('/detail/:bookId', dramaController.getDetail);

/**
 * GET /api/drama/episodes/:bookId
 * Mendapatkan semua episode dari drama
 * Route params:
 * - bookId (required): ID unik drama
 */
router.get('/episodes/:bookId', dramaController.getAllEpisodes);

// Export router
export default router;
