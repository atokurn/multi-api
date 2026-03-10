import express from 'express';
import cors from 'cors';
import dramanovaRoutes from './src/routes/dramanova.js';

const app = express();

app.use(cors());
app.use(express.json());

// Main unified API
app.use('/api', dramanovaRoutes);

app.get('/', (req, res) => {
    res.json({
        name: 'dramanova-api',
        status: 'ok',
        endpoints: {
            wrapper: '/api/*'
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════╗
║       🎬 DramaNova Unofficial API 🎬               ║
╠════════════════════════════════════════════════════╣
║  Local:    http://localhost:${PORT}                    ║
║  Prefix:   /api/*                                  ║
╚════════════════════════════════════════════════════╝
    `);
});
