/**
 * ========================================
 * DramaBox Direct Controller
 * ========================================
 * 
 * Controller untuk endpoint yang mengakses DramaBox API secara langsung.
 * 
 * Query Parameters:
 * - lang: Language code ('id', 'en', 'zh', 'ko') - default: 'id'
 */

import * as dramaboxService from '../services/dramaboxDirectService.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';

/**
 * GET /api/dramabox/home
 * Get theater/home page data
 */
export const getHome = async (req, res) => {
    try {
        const { page = 1, lang = 'id' } = req.query;
        const data = await dramaboxService.getTheater(parseInt(page), lang);
        return successResponse(res, data, 'Berhasil mengambil data home');
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

/**
 * GET /api/dramabox/recommend
 * Get recommended dramas
 */
export const getRecommend = async (req, res) => {
    try {
        const { page = 1, lang = 'id' } = req.query;
        const data = await dramaboxService.getRecommended(parseInt(page), lang);
        return successResponse(res, data, 'Berhasil mengambil rekomendasi drama');
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

/**
 * GET /api/dramabox/latest
 * Get latest dramas
 */
export const getLatest = async (req, res) => {
    try {
        const { page = 1 } = req.query;
        const data = await dramaboxService.getLatest(parseInt(page));
        return successResponse(res, data, 'Berhasil mengambil drama terbaru');
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

/**
 * GET /api/dramabox/search?q=...
 * Search dramas
 */
export const search = async (req, res) => {
    try {
        const { q, query } = req.query;
        const keyword = q || query;

        if (!keyword) {
            return errorResponse(res, 'Parameter "q" atau "query" diperlukan', 400);
        }

        const data = await dramaboxService.search(keyword);
        return successResponse(res, data, `Berhasil mencari: ${keyword}`);
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

/**
 * GET /api/dramabox/search-index
 * Get hot searches and trending
 */
export const getSearchIndex = async (req, res) => {
    try {
        const data = await dramaboxService.getSearchIndex();
        return successResponse(res, data, 'Berhasil mengambil search index');
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

/**
 * GET /api/dramabox/detail/:bookId or /api/dramabox/detail?bookId=...
 * Get drama detail
 */
export const getDetail = async (req, res) => {
    try {
        const bookId = req.params.bookId || req.query.bookId;

        if (!bookId) {
            return errorResponse(res, 'Parameter "bookId" diperlukan', 400);
        }

        const data = await dramaboxService.getDetail(bookId);

        // Check if book was found
        if (!data.book || !data.book.bookName) {
            return errorResponse(res, `Drama dengan bookId "${bookId}" tidak ditemukan`, 404);
        }

        return successResponse(res, data, 'Berhasil mengambil detail drama');
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

/**
 * GET /api/dramabox/episodes/:bookId or /api/dramabox/allepisode?bookId=...
 * Get ALL episodes with streaming links (fully paginated)
 */
export const getEpisodes = async (req, res) => {
    try {
        const bookId = req.params.bookId || req.query.bookId;

        if (!bookId) {
            return errorResponse(res, 'Parameter "bookId" diperlukan', 400);
        }

        // Use getAllEpisodesWithVideo for full pagination
        const data = await dramaboxService.getAllEpisodesWithVideo(bookId);
        return successResponse(res, data, 'Berhasil mengambil daftar episode');
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

/**
 * GET /api/dramabox/ranking
 * Get ranking list
 */
export const getRanking = async (req, res) => {
    try {
        const { type = 1 } = req.query;
        const data = await dramaboxService.getRanking(parseInt(type));
        return successResponse(res, data, 'Berhasil mengambil ranking');
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

/**
 * GET /api/dramabox/vip or /dramabox/vip
 * Get VIP content
 */
export const getVip = async (req, res) => {
    try {
        const { page = 1 } = req.query;
        const data = await dramaboxService.getVip(parseInt(page));
        return successResponse(res, data, 'Berhasil mengambil konten VIP');
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

/**
 * GET /api/dramabox/dubindo or /dramabox/dubindo
 * Get Indonesian dubbed content
 */
export const getDubindo = async (req, res) => {
    try {
        const { page = 1 } = req.query;
        const data = await dramaboxService.getDubIndo(parseInt(page));
        return successResponse(res, data, 'Berhasil mengambil drama dub Indo');
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

/**
 * GET /api/dramabox/foryou or /dramabox/foryou
 * Get "For You" personalized content
 */
export const getForYou = async (req, res) => {
    try {
        const { page = 1 } = req.query;
        const data = await dramaboxService.getForYou(parseInt(page));
        return successResponse(res, data, 'Berhasil mengambil For You');
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

/**
 * GET /api/dramabox/trending or /dramabox/trending
 * Get trending dramas
 */
export const getTrending = async (req, res) => {
    try {
        const data = await dramaboxService.getTrending();
        return successResponse(res, data, 'Berhasil mengambil trending drama');
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

/**
 * GET /api/dramabox/randomdrama or /dramabox/randomdrama
 * Get random drama
 */
export const getRandomDrama = async (req, res) => {
    try {
        const data = await dramaboxService.getRandomDrama();
        return successResponse(res, data, 'Berhasil mengambil random drama');
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

/**
 * GET /api/dramabox/populersearch or /dramabox/populersearch
 * Get popular searches (alias for search-index)
 */
export const getPopulerSearch = async (req, res) => {
    try {
        const data = await dramaboxService.getSearchIndex();
        return successResponse(res, data, 'Berhasil mengambil pencarian populer');
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

/**
 * GET /api/dramabox/classify
 * Get dramas filtered by genre/category
 * Query params: genre, sort, page, lang
 */
export const getClassify = async (req, res) => {
    try {
        const { genre, sort = 1, page = 1, lang = 'id' } = req.query;
        const data = await dramaboxService.getClassify({
            genre: parseInt(genre) || 0,
            sort: parseInt(sort),
            pageNo: parseInt(page),
            lang
        });
        return successResponse(res, data, 'Berhasil mengambil drama berdasarkan kategori');
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

/**
 * GET /api/dramabox/watch/:bookId/:episodeIndex
 * Get video URL for a specific episode
 */
export const getWatchVideo = async (req, res) => {
    try {
        const { bookId, episodeIndex } = req.params;

        if (!bookId) {
            return errorResponse(res, 'Parameter "bookId" diperlukan', 400);
        }

        const epIndex = parseInt(episodeIndex) || 0;
        const data = await dramaboxService.getWatchVideo(bookId, epIndex);
        return successResponse(res, data, `Berhasil mengambil video episode ${epIndex}`);
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

/**
 * GET /api/dramabox/suggest?q=...
 * Get search suggestions
 */
export const getSuggest = async (req, res) => {
    try {
        const { q, query, lang = 'id' } = req.query;
        const keyword = q || query;

        if (!keyword) {
            return errorResponse(res, 'Parameter "q" atau "query" diperlukan', 400);
        }

        const data = await dramaboxService.getSuggest(keyword, lang);
        return successResponse(res, data, `Saran pencarian untuk: ${keyword}`);
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

/**
 * GET /api/dramabox/genres
 * Get list of available genres
 */
export const getGenres = async (req, res) => {
    try {
        const data = await dramaboxService.getGenres();
        return successResponse(res, data, 'Berhasil mengambil daftar genre');
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

export default {
    getHome,
    getRecommend,
    getLatest,
    search,
    getSearchIndex,
    getDetail,
    getEpisodes,
    getRanking,
    getVip,
    getDubindo,
    getForYou,
    getTrending,
    getRandomDrama,
    getPopulerSearch,
    // New endpoints
    getClassify,
    getWatchVideo,
    getSuggest,
    getGenres
};
