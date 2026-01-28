/**
 * Health Check Endpoint
 */

const NODE_ID = process.env.NODE_ID || '1';

export default function handler(req, res) {
    res.status(200).json({
        success: true,
        service: 'flickreels-unlock-node',
        nodeId: NODE_ID,
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
}
