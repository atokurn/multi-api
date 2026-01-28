
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as shortmaxService from './src/services/shortmaxService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Helper for consistency
const success = (data) => ({ code: 200, message: 'Success', ...data });
const error = (msg = 'Internal Server Error', code = 500) => ({ code, message: msg });

app.get('/', (req, res) => {
    res.json({
        message: 'ShortMax API is running',
        endpoints: [
            '/api/search?q=keyword',
            '/api/ranking',
            '/api/detail/:code',
            '/api/chapters/:code',
            '/api/play/:code/:index' // Note: Sapimu uses index, not chapter ID?
        ]
    });
});

app.get('/api/search', async (req, res) => {
    try {
        const { q, page } = req.query;
        if (!q) return res.json(error('Missing keyword'));
        const result = await shortmaxService.search(q, page);
        res.json(success(result));
    } catch (e) {
        res.status(500).json(error(e.message));
    }
});

app.get('/api/ranking', async (req, res) => {
    try {
        const result = await shortmaxService.getRanking();
        res.json(success(result));
    } catch (e) {
        res.status(500).json(error(e.message));
    }
});

app.get('/api/detail/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const result = await shortmaxService.getDetail(code);
        if (!result) return res.status(404).json(error('Drama not found', 404));
        res.json(success({ data: result }));
    } catch (e) {
        res.status(500).json(error(e.message));
    }
});

app.get('/api/chapters/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const result = await shortmaxService.getChapters(code);
        res.json(success(result)); // getChapters returns { data: [] }
    } catch (e) {
        res.status(500).json(error(e.message));
    }
});

app.get('/api/play/:code/:index', async (req, res) => {
    try {
        const { code, index } = req.params;
        const result = await shortmaxService.getVideoUrl(code, index);
        if (!result) return res.status(404).json(error('Video not found or VIP locked', 404));
        res.json(success({ data: result }));
    } catch (e) {
        res.status(500).json(error(e.message));
    }
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default app;
