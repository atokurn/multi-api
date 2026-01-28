/**
 * ShortMax Controller
 * Express request handlers for ShortMax endpoints
 */

import * as shortmaxService from '../services/shortmaxService.js';

/**
 * GET /shortmax/foryou
 * Get For You recommendations
 */
export async function getForYou(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const result = await shortmaxService.getForYou(page);
        res.json({
            success: true,
            page: page,
            ...result
        });
    } catch (error) {
        console.error('ShortMax getForYou error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * GET /shortmax/ranking
 * Get rankings
 */
export async function getRanking(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const type = req.query.type || 'daily';
        const result = await shortmaxService.getRanking(page, type);
        res.json({
            success: true,
            page: page,
            type: type,
            ...result
        });
    } catch (error) {
        console.error('ShortMax getRanking error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * GET /shortmax/home
 * Get home config with banners
 */
export async function getHomeConfig(req, res) {
    try {
        const result = await shortmaxService.getHomeConfig();
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('ShortMax getHomeConfig error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * GET /shortmax/detail/:code
 * Get drama details
 */
export async function getDetail(req, res) {
    try {
        const { code } = req.params;
        if (!code) {
            return res.status(400).json({
                success: false,
                error: 'Missing drama code'
            });
        }

        const result = await shortmaxService.getDetail(code);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('ShortMax getDetail error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * GET /shortmax/chapters/:id
 * Get episode list by drama ID
 */
export async function getChapters(req, res) {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;

        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Missing drama ID'
            });
        }

        const result = await shortmaxService.getChapters(id, page);
        res.json({
            success: true,
            dramaId: id,
            page: page,
            ...result
        });
    } catch (error) {
        console.error('ShortMax getChapters error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * GET /shortmax/watch/:chapterId
 * Get video URL for an episode
 */
export async function getVideoUrl(req, res) {
    try {
        const { chapterId } = req.params;

        if (!chapterId) {
            return res.status(400).json({
                success: false,
                error: 'Missing chapter ID'
            });
        }

        const result = await shortmaxService.getVideoUrl(chapterId);

        if (!result || !result.videoUrl) {
            return res.status(404).json({
                success: false,
                error: 'Video URL not found or VIP content',
                data: result
            });
        }

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('ShortMax getVideoUrl error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * GET /shortmax/search
 * Search dramas
 */
export async function search(req, res) {
    try {
        const { q, keyword } = req.query;
        const searchTerm = q || keyword;
        const page = parseInt(req.query.page) || 1;

        if (!searchTerm) {
            return res.status(400).json({
                success: false,
                error: 'Missing search keyword'
            });
        }

        const result = await shortmaxService.search(searchTerm, page);
        res.json({
            success: true,
            keyword: searchTerm,
            page: page,
            ...result
        });
    } catch (error) {
        console.error('ShortMax search error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
