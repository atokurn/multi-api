/**
 * ========================================
 * Drama Controller
 * ========================================
 * 
 * Controller bertanggung jawab untuk:
 * - Menerima HTTP request
 * - Validasi input
 * - Memanggil service
 * - Mengirim HTTP response
 * 
 * Controller adalah "jembatan" antara routes dan services.
 * Controller TAHU tentang req/res, tapi TIDAK tahu detail
 * bagaimana data diambil (itu tugas service).
 */

import * as dramaService from '../services/dramaService.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';

/**
 * GET /api/drama/trending
 * Mengambil daftar drama trending
 */
const getTrending = async (req, res) => {
    try {
        const data = await dramaService.getTrending();
        return successResponse(res, data, 'Berhasil mengambil drama trending');
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

/**
 * GET /api/drama/latest
 * Mengambil daftar drama terbaru
 */
const getLatest = async (req, res) => {
    try {
        const data = await dramaService.getLatest();
        return successResponse(res, data, 'Berhasil mengambil drama terbaru');
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

/**
 * GET /api/drama/foryou
 * Mengambil rekomendasi drama
 */
const getForYou = async (req, res) => {
    try {
        const data = await dramaService.getForYou();
        return successResponse(res, data, 'Berhasil mengambil rekomendasi drama');
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

/**
 * GET /api/drama/vip
 * Mengambil daftar drama VIP
 */
const getVip = async (req, res) => {
    try {
        const data = await dramaService.getVip();
        return successResponse(res, data, 'Berhasil mengambil drama VIP');
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

/**
 * GET /api/drama/search?query=...
 * Mencari drama berdasarkan query
 */
const search = async (req, res) => {
    try {
        const { query } = req.query;

        // Validasi: query wajib ada
        if (!query) {
            return errorResponse(res, 'Parameter "query" diperlukan', 400);
        }

        const data = await dramaService.search(query);
        return successResponse(res, data, `Berhasil mencari drama dengan kata kunci: ${query}`);
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

/**
 * GET /api/drama/popular-search
 * Mengambil daftar pencarian populer
 */
const getPopularSearch = async (req, res) => {
    try {
        const data = await dramaService.getPopularSearch();
        return successResponse(res, data, 'Berhasil mengambil pencarian populer');
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

/**
 * GET /api/drama/detail/:bookId
 * Mengambil detail drama berdasarkan bookId
 */
const getDetail = async (req, res) => {
    try {
        const { bookId } = req.params;

        // Validasi: bookId wajib ada
        if (!bookId) {
            return errorResponse(res, 'Parameter "bookId" diperlukan', 400);
        }

        const data = await dramaService.getDetail(bookId);
        return successResponse(res, data, 'Berhasil mengambil detail drama');
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

/**
 * GET /api/drama/episodes/:bookId
 * Mengambil semua episode dari drama
 */
const getAllEpisodes = async (req, res) => {
    try {
        const { bookId } = req.params;

        // Validasi: bookId wajib ada
        if (!bookId) {
            return errorResponse(res, 'Parameter "bookId" diperlukan', 400);
        }

        const data = await dramaService.getAllEpisodes(bookId);
        return successResponse(res, data, 'Berhasil mengambil daftar episode');
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

/**
 * GET /api/drama/dubindo?classify=...&page=...
 * Mengambil drama dub Indonesia
 */
const getDubIndo = async (req, res) => {
    try {
        const { classify = 'terpopuler', page = 1 } = req.query;

        // Validasi classify
        if (!['terpopuler', 'terbaru'].includes(classify)) {
            return errorResponse(res, 'Parameter "classify" harus "terpopuler" atau "terbaru"', 400);
        }

        const data = await dramaService.getDubIndo(classify, parseInt(page));
        return successResponse(res, data, `Berhasil mengambil drama dub indo (${classify})`);
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

/**
 * GET /api/drama/random
 * Mengambil random drama video
 */
const getRandomDrama = async (req, res) => {
    try {
        const data = await dramaService.getRandomDrama();
        return successResponse(res, data, 'Berhasil mengambil random drama');
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

// Export semua controller functions
export {
    getTrending,
    getLatest,
    getForYou,
    getVip,
    search,
    getPopularSearch,
    getDetail,
    getAllEpisodes,
    getDubIndo,
    getRandomDrama
};
