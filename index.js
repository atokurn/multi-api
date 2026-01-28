/**
 * ========================================
 * DramaBox, FlickReels & Melolo API - Main Entry Point
 * ========================================
 * 
 * Multi-platform drama streaming API.
 * Mendukung:
 * - DramaBox API (/api/dramabox)
 * - FlickReels API (/api/flickreels)
 * - Melolo API (/api/melolo)
 * - Unified Stream API (/api/stream)
 */

// Load environment variables
import 'dotenv/config';

// Import dependencies
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import dramaboxRoutes from './src/routes/dramabox.js';
import flickreelsRoutes from './src/routes/flickreels.js';
import shortmaxRoutes from './src/routes/shortmax.js';
import meloloRoutes from './src/routes/melolo.js';

import dramawaveRoutes from './src/routes/dramawave.js';
import streamRoutes from './src/routes/stream.js';

// Import credentials manager for /token endpoint
import { getCredentials, buildTnHeader } from './src/lib/credentialsManager.js';

// Initialize Express app
const app = express();

// ============================================
// MIDDLEWARE SETUP
// ============================================

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// ROUTES
// ============================================

/**
 * DramaBox API Routes
 * Prefix: /api/dramabox
 */
app.use('/api/dramabox', dramaboxRoutes);

/**
 * FlickReels API Routes
 * Prefix: /api/flickreels
 */
app.use('/api/flickreels', flickreelsRoutes);

/**
 * ShortMax API Routes
 * Prefix: /api/shortmax
 */
app.use('/api/shortmax', shortmaxRoutes);

/**
 * Melolo API Routes
 * Prefix: /api/melolo
 */
app.use('/api/melolo', meloloRoutes);

/**
 * DramaWave API Routes
 * Prefix: /api/dramawave
 * Uses OAuth signature with MD5
 */
app.use('/api/dramawave', dramawaveRoutes);



/**
 * Unified Stream API Routes
 * Prefix: /api/stream
 * Direct episode streaming with quality/language selection
 */
app.use('/api/stream', streamRoutes);

/**
 * Root - Serve documentation
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '2.5.0',
        endpoints: {
            dramabox: '/api/dramabox/*',
            flickreels: '/api/flickreels/*',
            shortmax: '/api/shortmax/*',
            melolo: '/api/melolo/*',

            dramawave: '/api/dramawave/*',
            stream: '/api/stream/:provider/:dramaId/:episodeIndex',
            token: '/token'
        }
    });
});

/**
 * Token endpoint - returns credentials like dramabox-token.vercel.app
 * GET /token
 */
app.get('/token', async (req, res) => {
    try {
        const credentials = await getCredentials();

        // Return in same format as dramabox-token.vercel.app
        res.json({
            token: buildTnHeader(credentials.token).replace('Bearer ', ''),  // Just the Base64 part
            deviceid: credentials.deviceId,
            androidid: credentials.androidId
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to get credentials',
            message: error.message
        });
    }
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Endpoint ${req.method} ${req.path} tidak ditemukan`,
        availableEndpoints: {
            stream: [
                'GET /api/stream/:provider/:dramaId/:episodeIndex',
                'GET /api/stream/:provider/:dramaId',
                'Query: ?lang=id&quality=720&dubbing=original'
            ],
            dramabox: [
                'GET /api/dramabox/home',
                'GET /api/dramabox/trending',
                'GET /api/dramabox/latest',
                'GET /api/dramabox/recommend',
                'GET /api/dramabox/ranking',
                'GET /api/dramabox/search?q=...',
                'GET /api/dramabox/detail/:bookId',
                'GET /api/dramabox/episodes/:bookId'
            ],
            flickreels: [
                'GET /api/flickreels/languages',
                'GET /api/flickreels/home',
                'GET /api/flickreels/foryou',
                'GET /api/flickreels/ranking',
                'GET /api/flickreels/recommend',
                'GET /api/flickreels/search?q=...',
                'GET /api/flickreels/detail/:playletId',
                'GET /api/flickreels/episodes/:playletId'
            ],
            shortmax: [
                'GET /api/shortmax/foryou',
                'GET /api/shortmax/ranking',
                'GET /api/shortmax/home',
                'GET /api/shortmax/detail/:code',
                'GET /api/shortmax/chapters/:id',
                'GET /api/shortmax/watch/:chapterId'
            ],
            melolo: [
                'GET /api/melolo/languages',
                'GET /api/melolo/home',
                'GET /api/melolo/foryou',
                'GET /api/melolo/ranking',
                'GET /api/melolo/categories',
                'GET /api/melolo/search?q=...',
                'GET /api/melolo/detail/:bookId',
                'GET /api/melolo/episodes/:seriesId',
                'GET /api/melolo/video/:seriesId'
            ],

            dramawave: [
                'GET /api/dramawave/home',
                'GET /api/dramawave/foryou',
                'GET /api/dramawave/trending',
                'GET /api/dramawave/ranking',
                'GET /api/dramawave/search?q=...',
                'GET /api/dramawave/detail/:id',
                'GET /api/dramawave/episodes/:id',
                'GET /api/dramawave/stream/:episodeId',
                'POST /api/dramawave/login'
            ]
        }
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan pada server',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════╗
║       🎬 Drama Streaming API v2.5 🎬               ║
╠════════════════════════════════════════════════════╣
║  Local:    http://localhost:${PORT}                    ║
║  Docs:     http://localhost:${PORT}/                   ║
╠════════════════════════════════════════════════════╣
║  Endpoints:                                        ║
║  • DramaBox:   /api/dramabox/*                     ║
║  • FlickReels: /api/flickreels/*                   ║
║  • ShortMax:   /api/shortmax/*                     ║
║  • Melolo:     /api/melolo/*                       ║

║  • DramaWave:  /api/dramawave/*  (OAuth MD5)      ║
╚════════════════════════════════════════════════════╝
    `);
});

export default app;
