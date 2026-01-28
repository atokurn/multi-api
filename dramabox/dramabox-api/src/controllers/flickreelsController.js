/**
 * ========================================
 * FlickReels Controller
 * ========================================
 * 
 * Controller for FlickReels API endpoints.
 * Handles HTTP requests and responses.
 */

import * as flickreelsService from '../services/flickreelsService.js';

/**
 * Helper to create success response
 */
function success(res, message, data) {
    return res.json({
        success: true,
        message,
        data,
        timestamp: new Date().toISOString()
    });
}

/**
 * Helper to create error response
 */
function error(res, status, message, details = null) {
    return res.status(status).json({
        success: false,
        message,
        error: details,
        timestamp: new Date().toISOString()
    });
}

/**
 * GET /api/flickreels/home
 * Get home page data (navigation + first tab content)
 * Query: ?lang=id|en|ja|ko|...
 */
export async function getHome(req, res) {
    try {
        const { lang = 'id' } = req.query;
        const navigation = await flickreelsService.getNavigation(lang);
        return success(res, 'Berhasil mengambil data home', navigation);
    } catch (err) {
        console.error('[FlickReels Controller] getHome error:', err.message);
        return error(res, 500, 'Gagal mengambil data home', err.message);
    }
}

/**
 * GET /api/flickreels/navigation
 * Get navigation tabs
 */
export async function getNavigation(req, res) {
    try {
        const data = await flickreelsService.getNavigation();
        return success(res, 'Berhasil mengambil navigasi', data);
    } catch (err) {
        console.error('[FlickReels Controller] getNavigation error:', err.message);
        return error(res, 500, 'Gagal mengambil navigasi', err.message);
    }
}

/**
 * GET /api/flickreels/foryou
 * Get For You recommendations
 * Query: ?lang=id|en|ja|ko|...
 */
export async function getForYou(req, res) {
    try {
        const { page, page_size, lang = 'id' } = req.query;
        const data = await flickreelsService.getForYou(page || '', parseInt(page_size) || 10, lang);
        return success(res, 'Berhasil mengambil rekomendasi', data);
    } catch (err) {
        console.error('[FlickReels Controller] getForYou error:', err.message);
        return error(res, 500, 'Gagal mengambil rekomendasi', err.message);
    }
}

/**
 * GET /api/flickreels/ranking
 * Get hot ranking
 * Query: ?lang=id|en|ja|ko|...
 */
export async function getRanking(req, res) {
    try {
        const { lang = 'id' } = req.query;
        const data = await flickreelsService.getHotRank(lang);
        return success(res, 'Berhasil mengambil ranking', data);
    } catch (err) {
        console.error('[FlickReels Controller] getRanking error:', err.message);
        return error(res, 500, 'Gagal mengambil ranking', err.message);
    }
}

/**
 * GET /api/flickreels/recommend
 * Get recommended dramas
 * Query: ?lang=id|en|ja|ko|...
 */
export async function getRecommend(req, res) {
    try {
        const { lang = 'id' } = req.query;
        const data = await flickreelsService.getRecommend(lang);
        return success(res, 'Berhasil mengambil rekomendasi', data);
    } catch (err) {
        console.error('[FlickReels Controller] getRecommend error:', err.message);
        return error(res, 500, 'Gagal mengambil rekomendasi', err.message);
    }
}

/**
 * GET /api/flickreels/firstlook
 * Get first look playlet
 */
export async function getFirstLook(req, res) {
    try {
        const data = await flickreelsService.getFirstLookPlaylet();
        return success(res, 'Berhasil mengambil first look', data);
    } catch (err) {
        console.error('[FlickReels Controller] getFirstLook error:', err.message);
        return error(res, 500, 'Gagal mengambil first look', err.message);
    }
}

/**
 * GET /api/flickreels/detail/:playletId
 * Get playlet/drama detail
 */
export async function getDetail(req, res) {
    try {
        const playletId = req.params.playletId || req.query.playletId;

        if (!playletId) {
            return error(res, 400, 'playletId diperlukan');
        }

        const data = await flickreelsService.getPlayletDetail(playletId);
        return success(res, 'Berhasil mengambil detail', data);
    } catch (err) {
        console.error('[FlickReels Controller] getDetail error:', err.message);
        return error(res, 500, 'Gagal mengambil detail', err.message);
    }
}

/**
 * GET /api/flickreels/episodes/:playletId
 * Get episode/chapter list with video URLs (VIP bypass enabled)
 * 
 * Query params:
 * - refresh: true - Force refresh from API (skip cache)
 */
export async function getEpisodes(req, res) {
    try {
        const playletId = req.params.playletId || req.query.playletId;
        const forceRefresh = req.query.refresh === 'true';

        if (!playletId) {
            return error(res, 400, 'playletId diperlukan');
        }

        // Use getAllEpisodesWithVideo for VIP bypass with optional force refresh
        const data = await flickreelsService.getAllEpisodesWithVideo(playletId, forceRefresh);
        return success(res, forceRefresh ? 'Data di-refresh dari API' : 'Berhasil mengambil daftar episode', data);
    } catch (err) {
        console.error('[FlickReels Controller] getEpisodes error:', err.message);
        return error(res, 500, 'Gagal mengambil daftar episode', err.message);
    }
}

/**
 * GET /api/flickreels/search
 * Search playlets using /app/user_search/search
 */
export async function search(req, res) {
    try {
        const { q, query, keyword, page, page_size } = req.query;
        const searchKeyword = q || query || keyword;

        if (!searchKeyword) {
            return error(res, 400, 'Query pencarian diperlukan (q=...)');
        }

        const data = await flickreelsService.search(searchKeyword, page || '', parseInt(page_size) || 10);
        return success(res, 'Berhasil mencari drama', data);
    } catch (err) {
        console.error('[FlickReels Controller] search error:', err.message);
        return error(res, 500, 'Gagal mencari drama', err.message);
    }
}

/**
 * GET /api/flickreels/bootstrap
 * Get app bootstrap/config
 */
export async function getBootstrap(req, res) {
    try {
        const data = await flickreelsService.getBootstrap();
        return success(res, 'Berhasil mengambil config', data);
    } catch (err) {
        console.error('[FlickReels Controller] getBootstrap error:', err.message);
        return error(res, 500, 'Gagal mengambil config', err.message);
    }
}

/**
 * POST /api/flickreels/login
 * Login with device ID
 */
export async function login(req, res) {
    try {
        const data = await flickreelsService.loginWithDeviceId();
        return success(res, 'Berhasil login', data);
    } catch (err) {
        console.error('[FlickReels Controller] login error:', err.message);
        return error(res, 500, 'Gagal login', err.message);
    }
}

/**
 * GET /api/flickreels/languages
 * Get list of supported languages
 */
export async function getLanguages(req, res) {
    try {
        const { SUPPORTED_LANGUAGES } = await import('../lib/flickreelsClient.js');

        const languages = Object.entries(SUPPORTED_LANGUAGES).map(([code, config]) => ({
            code,
            id: config.id,
            name: config.name,
            native: config.native
        }));

        return success(res, 'Berhasil mengambil daftar bahasa', {
            count: languages.length,
            default: 'id',
            languages,
            usage: 'Gunakan parameter ?lang=<code> pada endpoint home, foryou, ranking, recommend'
        });
    } catch (err) {
        console.error('[FlickReels Controller] getLanguages error:', err.message);
        return error(res, 500, 'Gagal mengambil daftar bahasa', err.message);
    }
}
