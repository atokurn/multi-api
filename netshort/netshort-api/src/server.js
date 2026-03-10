import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import netshortRoutes from './routes/netshortRoutes.js';
import { responseCache } from './lib/responseCache.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api', netshortRoutes);

// Capture endpoint - receives decrypted data from Frida hook
app.post('/api/_capture', (req, res) => {
    try {
        const { originalUrl, method, responseBody, timestamp } = req.body;
        if (originalUrl && responseBody) {
            responseCache.store(originalUrl, responseBody, timestamp);
            console.log(`[Cache] Stored response for: ${originalUrl} (${responseBody.length} chars)`);
            res.status(200).json({ status: 'stored', url: originalUrl });
        } else {
            res.status(400).json({ error: 'Missing originalUrl or responseBody' });
        }
    } catch (error) {
        console.error('[Cache] Store error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// View cache contents
app.get('/api/_cache', (req, res) => {
    const entries = responseCache.list();
    res.status(200).json({
        status: 'ok',
        count: entries.length,
        entries: entries
    });
});

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'NetShort API Provider',
        cacheSize: responseCache.size(),
        endpoints: [
            'GET /api/home',
            'GET /api/search?keyword=...',
            'GET /api/detail/:id',
            'GET /api/chapters/:id',
            'GET /api/play/:dramaId/:episodeId',
            'GET /api/history',
            'POST /api/_capture (Frida hook receiver)',
            'GET /api/_cache (view cached responses)'
        ]
    });
});

// Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(PORT, () => {
    console.log(`\n🚀 NetShort API Provider running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   API:    http://localhost:${PORT}/api/`);
    console.log(`   Cache:  http://localhost:${PORT}/api/_cache\n`);
});
