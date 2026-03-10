import express from 'express';
import { callDramaNovaApi } from '../services/dramanova.js';

const router = express.Router();

// Simple in-memory cache for playlet details to prevent spamming the upstream server
// Key: dramaId, Value: { data: <drama_detail_object>, timestamp: <time_fetched> }
const playletCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache TTL

// Helper to get or fetch playlet detail
async function getPlayletDetail(dramaId, token) {
    const now = Date.now();
    
    // Check cache
    if (playletCache.has(dramaId)) {
        const cached = playletCache.get(dramaId);
        if (now - cached.timestamp < CACHE_TTL_MS) {
            console.log(`[Cache] HIT for dramaId: ${dramaId}`);
            return cached.data;
        } else {
            console.log(`[Cache] EXPIRED for dramaId: ${dramaId}`);
            playletCache.delete(dramaId);
        }
    }
    
    // Fetch from upstream
    console.log(`[Cache] MISS for dramaId: ${dramaId}, fetching from upstream...`);
    const result = await callDramaNovaApi(`/playlet/drama/${dramaId}`, 'GET', {}, { language: 'en' }, token);
    
    // Save to cache if successful
    if (result && result.code === 200 && result.data) {
        playletCache.set(dramaId, {
            data: result.data,
            timestamp: now
        });
        return result.data;
    }
    
    // Throw error or return null if failed
    if (result && result.code !== 200) {
        throw new Error(result.msg || 'Failed to fetch drama details');
    }
    return null;
}

// Define blocked endpoints (those that are broken/returning 404/500 on the server side)
const BLOCKED_ENDPOINTS = [
    // Standard drama detail is broken with a 500 SQL syntax error
    { pattern: /^\/drama\/\d+$/, method: 'GET', reason: 'Endpoint is broken on the upstream server (SQL Syntax Error 500)' },
    // These endpoints return 404 Not Found from the upstream server
    { pattern: /^\/drama\/new\/list$/, method: 'GET', reason: 'Endpoint not found on the upstream server (404)' },
    { pattern: /^\/drama\/recommend\/list$/, method: 'GET', reason: 'Endpoint not found on the upstream server (404)' }
];

// --- Custom Endpoints ---

// 1. Get playlet detail WITHOUT episodes (lightweight)
router.get('/custom/playlet/:dramaId/info', async (req, res) => {
    try {
        const dramaId = req.params.dramaId;
        let token = req.headers['authorization'] || req.headers['token'];
        if (token && token.startsWith('Bearer ')) token = token.substring(7);

        const data = await getPlayletDetail(dramaId, token);
        if (!data) {
            return res.status(404).json({ success: false, message: 'Drama not found' });
        }

        // Strip heavy episode data
        const lightData = { ...data };
        delete lightData.episodes;
        delete lightData.videos;

        res.json({
            success: true,
            data: lightData
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// 2. Get a specific episode by index (1-based)
router.get('/custom/playlet/:dramaId/episode/:episodeIndex', async (req, res) => {
    try {
        const dramaId = req.params.dramaId;
        const episodeIndex = parseInt(req.params.episodeIndex, 10);
        let token = req.headers['authorization'] || req.headers['token'];
        if (token && token.startsWith('Bearer ')) token = token.substring(7);

        if (isNaN(episodeIndex) || episodeIndex < 1) {
            return res.status(400).json({ success: false, message: 'Invalid episode index. Must be a positive integer.' });
        }

        const data = await getPlayletDetail(dramaId, token);
        if (!data) {
            return res.status(404).json({ success: false, message: 'Drama not found' });
        }

        const episodes = data.episodes || data.videos || [];
        
        // Find the specific episode
        // Assuming episodeNumber is the actual episode index, or fallback to array index if episodeNumber is missing
        const episode = episodes.find(ep => ep.episodeNumber === episodeIndex) || episodes[episodeIndex - 1];

        if (!episode) {
            return res.status(404).json({ 
                success: false, 
                message: `Episode ${episodeIndex} not found. Total episodes: ${episodes.length}` 
            });
        }

        res.json({
            success: true,
            dramaId: dramaId,
            totalEpisodes: data.totalEpisodes,
            data: episode
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});


// Generic proxy route that acts as a plain JSON API wrapper
router.use('/', async (req, res) => {
    try {
        const path = req.path; // e.g., /drama/list
        const method = req.method;
        
        // Check if the endpoint is in the blocked list
        const blockedRule = BLOCKED_ENDPOINTS.find(rule => 
            rule.method === method && rule.pattern.test(path)
        );
        
        if (blockedRule) {
            console.log(`[Router] Blocked request to ${method} ${path}: ${blockedRule.reason}`);
            return res.status(403).json({
                success: false,
                message: `This endpoint has been disabled by the proxy: ${blockedRule.reason}`
            });
        }

        const data = req.body;
        const query = req.query;
        let token = req.headers['authorization'] || req.headers['token'];
        if (token && token.startsWith('Bearer ')) {
            token = token.substring(7);
        }

        console.log(`[Router] Calling upstream API for ${method} ${path}`);
        const result = await callDramaNovaApi(path, method, data, query, token);
        console.log(`[Router] Upstream API call successful, sending response`);
        res.json(result);
    } catch (e) {
        let msg = e.message;
        if (e.response && e.response.data) {
            msg = e.response.data;
        }
        res.status(e.response?.status || 500).json({
            success: false,
            message: msg
        });
    }
});

export default router;
