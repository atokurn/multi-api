/**
 * ========================================
 * DramaWave API - Standalone Service
 * ========================================
 * 
 * Drama streaming API with full episode access.
 * Endpoints:
 *   /docs - Swagger UI documentation
 *   /api/dramawave/* - DramaWave endpoints
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger.js';
import dramawaveRoutes from './src/routes/dramawave.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Swagger UI with CDN assets (fixes blank page on Vercel)
const swaggerOptions = {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'DramaWave API Docs',
    customCssUrl: 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css',
    customJs: [
        'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js',
        'https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js'
    ]
};
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));


// Health check
app.get('/', (req, res) => {
    res.json({
        name: 'DramaWave API',
        version: '1.0.0',
        status: 'running',
        docs: '/docs'
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// DramaWave routes
app.use('/api/dramawave', dramawaveRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        docs: '/docs',
        availableRoutes: [
            '/docs',
            '/api/dramawave/home',
            '/api/dramawave/foryou',
            '/api/dramawave/detail/:id',
            '/api/dramawave/dramas/:id/play/:episode',
            '/api/dramawave/v2/detail/:id',
            '/api/dramawave/v2/play/:id/:episode',
            '/api/dramawave/v2/stats'
        ]
    });
});

// Start server (for local development)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`DramaWave API running on http://localhost:${PORT}`);
        console.log(`Swagger docs at http://localhost:${PORT}/docs`);
    });
}

export default app;
