const express = require('express');
const tiktokController = require('../controllers/tiktokController');

const router = express.Router();

// Simple routes without rate limiting first (we'll add it back later)
router.post('/download', tiktokController.downloadVideoV1);
router.post('/download/v1', tiktokController.downloadVideoV1);
router.post('/download/v2', tiktokController.downloadVideoV1);
router.post('/info', tiktokController.getVideoInfo);
router.get('/stats', tiktokController.getStats);

// Method testing endpoint
router.get('/methods', (req, res) => {
    res.json({
        success: true,
        methods: {
            'v1': {
                name: '@tobyg74/tiktok-api-dl',
                description: 'Primary method using TobyG74 API',
                endpoint: '/api/v1/tiktok/download/v1',
                reliability: 'High',
                features: ['No watermark', 'HD quality', 'Images', 'Music']
            },
            'auto': {
                name: 'Auto method',
                description: 'Tries the best available method',
                endpoint: '/api/v1/tiktok/download',
                reliability: 'Highest',
                features: ['All features', 'Automatic fallback']
            }
        }
    });
});

module.exports = router; 