/**
 * NetShort API Controller
 * Request handlers for all API routes.
 */

import * as netshortService from '../services/netshortService.js';

class NetshortController {
    /**
     * GET /api/home
     * Get home feed / recommendations
     */
    async getHome(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const result = await netshortService.getHome(page);
            res.status(200).json(result);
        } catch (error) {
            console.error('[Controller] getHome error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * GET /api/search?keyword=...&page=1
     * Search for dramas
     */
    async search(req, res) {
        try {
            const { keyword, page } = req.query;
            if (!keyword) {
                return res.status(400).json({ success: false, error: 'keyword parameter is required' });
            }
            const result = await netshortService.search(keyword, parseInt(page) || 1);
            res.status(200).json(result);
        } catch (error) {
            console.error('[Controller] search error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * GET /api/detail/:id
     * Get drama detail by ID
     */
    async getDetail(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({ success: false, error: 'Drama ID is required' });
            }
            const result = await netshortService.getDetail(id);
            res.status(200).json(result);
        } catch (error) {
            console.error('[Controller] getDetail error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * GET /api/chapters/:id?page=1
     * Get episode list for a drama
     */
    async getChapters(req, res) {
        try {
            const { id } = req.params;
            const page = parseInt(req.query.page) || 1;
            if (!id) {
                return res.status(400).json({ success: false, error: 'Drama ID is required' });
            }
            const result = await netshortService.getChapters(id, page);
            res.status(200).json(result);
        } catch (error) {
            console.error('[Controller] getChapters error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * GET /api/play/:dramaId/:episodeId
     * Get video URL for an episode
     */
    async play(req, res) {
        try {
            const { dramaId, episodeId } = req.params;
            if (!dramaId || !episodeId) {
                return res.status(400).json({
                    success: false,
                    error: 'Both dramaId and episodeId are required'
                });
            }
            const result = await netshortService.getVideoUrl(dramaId, episodeId);
            res.status(200).json(result);
        } catch (error) {
            console.error('[Controller] play error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * GET /api/history
     * Get play history
     */
    async getHistory(req, res) {
        try {
            const result = await netshortService.getPlayHistory();
            res.status(200).json(result);
        } catch (error) {
            console.error('[Controller] getHistory error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

export default new NetshortController();
