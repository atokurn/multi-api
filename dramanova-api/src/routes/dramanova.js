import express from 'express';
import { callDramaNovaApi } from '../services/dramanova.js';

const router = express.Router();

// Generic proxy route that acts as a plain JSON API wrapper
router.use('/', async (req, res) => {
    try {
        const path = req.path; // e.g., /drama/list
        const method = req.method;
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
