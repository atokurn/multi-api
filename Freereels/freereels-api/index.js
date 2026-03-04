/**
 * ========================================
 * FreeReels API - Standalone Service
 * ========================================
 * 
 * Drama streaming API with full episode access.
 * Endpoints:
 *   /docs - Swagger UI documentation
 *   /api/freereels/* - FreeReels endpoints
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger.js';
import freereelsRoutes from './src/routes/freereels.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Swagger UI with CDN assets (fixes blank page on Vercel)
const swaggerOptions = {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'FreeReels API Docs',
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
        name: 'FreeReels API',
        version: '1.0.0',
        status: 'running',
        docs: '/docs'
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// FreeReels routes
app.use('/api/freereels', freereelsRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        docs: '/docs',
        availableRoutes: [
            '/docs',
            '/api/freereels/home',
            '/api/freereels/foryou',
            '/api/freereels/detail/:id',
            '/api/freereels/dramas/:id/play/:episode',
            '/api/freereels/v2/detail/:id',
            '/api/freereels/v2/play/:id/:episode',
            '/api/freereels/v2/stats'
        ]
    });
});

// Start server (for local development)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`FreeReels API running on http://localhost:${PORT}`);
        console.log(`Swagger docs at http://localhost:${PORT}/docs`);
    });
}

export default app;
