
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as flickreelsService from './src/services/flickreelsService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Helper for consistency
const success = (res, msg, data) => res.json({ code: 200, message: msg, ...data });
const error = (res, msg = 'Internal Server Error', code = 500) => res.status(code).json({ code, message: msg });

app.get('/', (req, res) => {
    res.json({
        message: 'FlickReels API is running',
        endpoints: [
            '/api/flickreels/home',
            '/api/flickreels/navigation',
            '/api/flickreels/foryou',
            '/api/flickreels/ranking',
            '/api/flickreels/detail/:playletId',
            '/api/flickreels/episodes/:playletId'
        ]
    });
});

// ============================================
// HOME & BROWSE
// ============================================

app.get('/api/flickreels/home', async (req, res) => {
    try {
        const { lang = 'id' } = req.query;
        const result = await flickreelsService.getNavigation(lang);
        res.json(result);
    } catch (e) {
        error(res, e.message);
    }
});

app.get('/api/flickreels/navigation', async (req, res) => {
    try {
        const result = await flickreelsService.getNavigation();
        res.json(result);
    } catch (e) {
        error(res, e.message);
    }
});

app.get('/api/flickreels/foryou', async (req, res) => {
    try {
        const { page, page_size, lang = 'id' } = req.query;
        const result = await flickreelsService.getForYou(page || '', parseInt(page_size) || 10, lang);
        res.json(result);
    } catch (e) {
        error(res, e.message);
    }
});

app.get('/api/flickreels/ranking', async (req, res) => {
    try {
        const { lang = 'id' } = req.query;
        const result = await flickreelsService.getHotRank(lang);
        res.json(result);
    } catch (e) {
        error(res, e.message);
    }
});

app.get('/api/flickreels/recommend', async (req, res) => {
    try {
        const { lang = 'id' } = req.query;
        const result = await flickreelsService.getRecommend(lang);
        res.json(result);
    } catch (e) {
        error(res, e.message);
    }
});

// ============================================
// DETAIL & EPISODES
// ============================================

app.get('/api/flickreels/detail/:playletId', async (req, res) => {
    try {
        const { playletId } = req.params;
        const result = await flickreelsService.getPlayletDetail(playletId);
        res.json(result);
    } catch (e) {
        error(res, e.message);
    }
});

app.get('/api/flickreels/episodes/:playletId', async (req, res) => {
    try {
        const { playletId } = req.params;
        const result = await flickreelsService.getAllEpisodesWithVideo(playletId);
        res.json(result);
    } catch (e) {
        error(res, e.message);
    }
});

// ============================================
// SEARCH
// ============================================

app.get('/api/flickreels/search', async (req, res) => {
    try {
        const { q, keyword, page, page_size } = req.query;
        const query = q || keyword;
        if (!query) return error(res, 'Missing keyword', 400);

        const result = await flickreelsService.search(query, page || '', parseInt(page_size) || 10);
        res.json(result);
    } catch (e) {
        error(res, e.message);
    }
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default app;
