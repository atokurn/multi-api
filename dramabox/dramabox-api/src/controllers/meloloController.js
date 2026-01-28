/**
 * ========================================
 * Melolo Controller
 * ========================================
 * 
 * Controller for Melolo API endpoints.
 * Handles HTTP requests and responses.
 */

import * as meloloService from '../services/meloloService.js';
import * as meloloClient from '../lib/meloloClient.js';

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
 * GET /api/melolo/home
 * Get home page data
 * Query: ?lang=id|en|zh|ko|...
 */
export async function getHome(req, res) {
    try {
        const { lang = 'id' } = req.query;
        const data = await meloloService.getHomePage(lang);
        return success(res, 'Berhasil mengambil data home', data);
    } catch (err) {
        console.error('[Melolo Controller] getHome error:', err.message);
        return error(res, 500, 'Gagal mengambil data home', err.message);
    }
}

/**
 * GET /api/melolo/foryou
 * Get For You recommendations
 * Query: ?lang=id|en|zh|ko|...
 */
export async function getForYou(req, res) {
    try {
        const { lang = 'id' } = req.query;
        const data = await meloloService.getForYou(lang);
        return success(res, 'Berhasil mengambil rekomendasi', data);
    } catch (err) {
        console.error('[Melolo Controller] getForYou error:', err.message);
        return error(res, 500, 'Gagal mengambil rekomendasi', err.message);
    }
}

/**
 * GET /api/melolo/ranking
 * Get ranking/trending
 * Query: ?lang=id|en|zh|ko|...
 */
export async function getRanking(req, res) {
    try {
        const { lang = 'id' } = req.query;
        const data = await meloloService.getRanking(lang);
        return success(res, 'Berhasil mengambil ranking', data);
    } catch (err) {
        console.error('[Melolo Controller] getRanking error:', err.message);
        return error(res, 500, 'Gagal mengambil ranking', err.message);
    }
}

/**
 * GET /api/melolo/categories
 * Get category list
 */
export async function getCategories(req, res) {
    try {
        const data = await meloloService.getCategoryList();
        return success(res, 'Berhasil mengambil kategori', data);
    } catch (err) {
        console.error('[Melolo Controller] getCategories error:', err.message);
        return error(res, 500, 'Gagal mengambil kategori', err.message);
    }
}

/**
 * GET /api/melolo/search
 * Search for dramas
 */
export async function search(req, res) {
    try {
        const { q, query, keyword, cursor } = req.query;
        const searchKeyword = q || query || keyword;

        if (!searchKeyword) {
            return error(res, 400, 'Query pencarian diperlukan (q=...)');
        }

        const data = await meloloService.search(searchKeyword, cursor || '');
        return success(res, 'Berhasil mencari drama', data);
    } catch (err) {
        console.error('[Melolo Controller] search error:', err.message);
        return error(res, 500, 'Gagal mencari drama', err.message);
    }
}

/**
 * GET /api/melolo/search/suggestions
 * Get search suggestions
 */
export async function getSearchSuggestions(req, res) {
    try {
        const { q, query, keyword } = req.query;
        const searchKeyword = q || query || keyword;

        if (!searchKeyword) {
            return error(res, 400, 'Query pencarian diperlukan (q=...)');
        }

        const data = await meloloService.getSearchSuggestions(searchKeyword);
        return success(res, 'Berhasil mengambil saran pencarian', data);
    } catch (err) {
        console.error('[Melolo Controller] getSearchSuggestions error:', err.message);
        return error(res, 500, 'Gagal mengambil saran pencarian', err.message);
    }
}

/**
 * GET /api/melolo/search/popular
 * Get popular searches
 */
export async function getSearchPopular(req, res) {
    try {
        const data = await meloloService.getSearchFrontPage();
        return success(res, 'Berhasil mengambil pencarian populer', data);
    } catch (err) {
        console.error('[Melolo Controller] getSearchPopular error:', err.message);
        return error(res, 500, 'Gagal mengambil pencarian populer', err.message);
    }
}

/**
 * GET /api/melolo/detail/:bookId
 * Get book/series detail
 */
export async function getDetail(req, res) {
    try {
        const bookId = req.params.bookId || req.query.bookId || req.query.book_id;

        if (!bookId) {
            return error(res, 400, 'bookId diperlukan');
        }

        const data = await meloloService.getDetail(bookId);
        return success(res, 'Berhasil mengambil detail', data);
    } catch (err) {
        console.error('[Melolo Controller] getDetail error:', err.message);
        return error(res, 500, 'Gagal mengambil detail', err.message);
    }
}

/**
 * GET /api/melolo/episodes/:seriesId
 * Get episode list with video URLs
 */
export async function getEpisodes(req, res) {
    try {
        const seriesId = req.params.seriesId || req.query.seriesId || req.query.series_id;

        if (!seriesId) {
            return error(res, 400, 'seriesId diperlukan');
        }

        const data = await meloloService.getAllEpisodesWithVideo(seriesId);
        return success(res, 'Berhasil mengambil daftar episode dengan video URL', data);
    } catch (err) {
        console.error('[Melolo Controller] getEpisodes error:', err.message);
        return error(res, 500, 'Gagal mengambil daftar episode', err.message);
    }
}

/**
 * GET /api/melolo/video/:seriesId
 * Get video stream URLs directly (proxied to Sansekai)
 * Alias: /api/melolo/stream
 */
export async function getVideo(req, res) {
    try {
        const videoId = req.params.seriesId || req.params.videoId || req.query.videoId || req.query.video_id;

        if (!videoId) {
            return error(res, 400, 'videoId diperlukan');
        }

        const data = await meloloService.getStream(videoId);

        if (data.success === false) {
            return error(res, 500, data.message || 'Gagal mengambil video URL', data.error);
        }

        return success(res, 'Berhasil mengambil video URL', data);
    } catch (err) {
        console.error('[Melolo Controller] getVideo error:', err.message);
        return error(res, 500, 'Gagal mengambil video URL', err.message);
    }
}

/**
 * GET /api/melolo/stream
 * Alias for getVideo - Get video stream URLs
 */
export async function getStream(req, res) {
    try {
        const videoId = req.params.videoId || req.query.videoId || req.query.video_id;

        if (!videoId) {
            return error(res, 400, 'videoId diperlukan');
        }

        const data = await meloloService.getStream(videoId);

        if (data.success === false) {
            return error(res, 500, data.message || 'Gagal mengambil video URL', data.error);
        }

        return success(res, 'Berhasil mengambil video URL', data);
    } catch (err) {
        console.error('[Melolo Controller] getStream error:', err.message);
        return error(res, 500, 'Gagal mengambil video URL', err.message);
    }
}

/**
 * GET /api/melolo/directory/:bookId
 * Get directory/chapter list
 */
export async function getDirectory(req, res) {
    try {
        const bookId = req.params.bookId || req.query.bookId || req.query.book_id;
        const { cursor } = req.query;

        if (!bookId) {
            return error(res, 400, 'bookId diperlukan');
        }

        const data = await meloloService.getDirectoryInfo(bookId, cursor || '');
        return success(res, 'Berhasil mengambil daftar chapter', data);
    } catch (err) {
        console.error('[Melolo Controller] getDirectory error:', err.message);
        return error(res, 500, 'Gagal mengambil daftar chapter', err.message);
    }
}

/**
 * GET /api/melolo/bookshelf
 * Get user bookshelf
 */
export async function getBookshelf(req, res) {
    try {
        const data = await meloloService.getBookshelf();
        return success(res, 'Berhasil mengambil bookshelf', data);
    } catch (err) {
        console.error('[Melolo Controller] getBookshelf error:', err.message);
        return error(res, 500, 'Gagal mengambil bookshelf', err.message);
    }
}

/**
 * GET /api/melolo/history
 * Get read history
 */
export async function getHistory(req, res) {
    try {
        const { cursor } = req.query;
        const data = await meloloService.getReadHistory(cursor || '');
        return success(res, 'Berhasil mengambil history', data);
    } catch (err) {
        console.error('[Melolo Controller] getHistory error:', err.message);
        return error(res, 500, 'Gagal mengambil history', err.message);
    }
}

/**
 * GET /api/melolo/latest
 * Get latest dramas
 * Query: ?lang=id|en|zh|ko|...
 */
export async function getLatest(req, res) {
    try {
        const { lang = 'id' } = req.query;
        const data = await meloloService.getLatest(lang);
        return success(res, 'Berhasil mengambil drama terbaru', data);
    } catch (err) {
        console.error('[Melolo Controller] getLatest error:', err.message);
        return error(res, 500, 'Gagal mengambil drama terbaru', err.message);
    }
}

/**
 * GET /api/melolo/trending
 * Get trending dramas
 * Query: ?lang=id|en|zh|ko|...
 */
export async function getTrending(req, res) {
    try {
        const { lang = 'id' } = req.query;
        const data = await meloloService.getTrending(lang);
        return success(res, 'Berhasil mengambil drama trending', data);
    } catch (err) {
        console.error('[Melolo Controller] getTrending error:', err.message);
        return error(res, 500, 'Gagal mengambil drama trending', err.message);
    }
}

/**
 * GET /api/melolo/languages
 * Get list of supported languages
 */
export async function getLanguages(req, res) {
    try {
        const { SUPPORTED_LANGUAGES } = await import('../lib/meloloClient.js');

        // Transform to array format with code and display name
        const languages = Object.entries(SUPPORTED_LANGUAGES).map(([code, config]) => {
            // Map language codes to display names
            const displayNames = {
                'en': { name: 'English', native: 'English' },
                'id': { name: 'Indonesian', native: 'Bahasa Indonesia' },
                'th': { name: 'Thai', native: 'ประเทศไทย' },
                'pt': { name: 'Portuguese', native: 'Português' },
                'es': { name: 'Spanish', native: 'Español' },
                'vi': { name: 'Vietnamese', native: 'Tiếng Việt' },
                'my': { name: 'Burmese', native: 'မြန်မာစာ' },
                'km': { name: 'Khmer', native: 'ភាសាខ្មែរ' },
                'ms': { name: 'Malay', native: 'Bahasa Melayu' },
                'ja': { name: 'Japanese', native: '日本語' },
                'ko': { name: 'Korean', native: '한국어' },
                'fr': { name: 'French', native: 'Français' },
                'de': { name: 'German', native: 'Deutsch' },
                'it': { name: 'Italian', native: 'Italiano' },
                'zh': { name: 'Chinese', native: '中文' },
                'zh-TW': { name: 'Traditional Chinese', native: '繁體中文' },
                'ar': { name: 'Arabic', native: 'العربية' },
                'tr': { name: 'Turkish', native: 'Türkçe' },
                'pl': { name: 'Polish', native: 'Polski' }
            };

            const display = displayNames[code] || { name: code, native: code };

            return {
                code,
                name: display.name,
                native: display.native,
                region: config.region,
                timezone: config.timezone
            };
        });

        // Sort: primary languages first (from Melolo app), then fallbacks
        const primaryCodes = ['en', 'id', 'th', 'pt', 'es', 'vi', 'my', 'km', 'ms', 'ja', 'ko', 'fr', 'de', 'it'];
        const primary = languages.filter(l => primaryCodes.includes(l.code));
        const fallback = languages.filter(l => !primaryCodes.includes(l.code));

        return success(res, 'Berhasil mengambil daftar bahasa', {
            count: languages.length,
            default: 'id',
            languages: [...primary, ...fallback],
            usage: 'Gunakan parameter ?lang=<code> pada endpoint home, foryou, ranking, latest, trending'
        });
    } catch (err) {
        console.error('[Melolo Controller] getLanguages error:', err.message);
        return error(res, 500, 'Gagal mengambil daftar bahasa', err.message);
    }
}

