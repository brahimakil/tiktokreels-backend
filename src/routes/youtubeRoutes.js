const express = require('express');
const youtubeController = require('../controllers/youtubeController');

const router = express.Router();

// Basic routes - same pattern as TikTok
router.post('/download', youtubeController.downloadVideoV1);
router.post('/info', youtubeController.getVideoInfo);
router.get('/stats', youtubeController.getStats);

// Proxy route for short URLs
router.get('/proxy/:hash', youtubeController.proxyDownload);

// Method info endpoint
router.get('/methods', (req, res) => {
    res.json({
        success: true,
        methods: {
            v1: {
                name: '@distube/ytdl-core',
                description: 'Primary method using ytdl-core with URL compression',
                endpoint: '/api/v1/youtube/download',
                reliability: 'High',
                features: ['Fast processing', 'Good quality', 'Short URLs (90%+ compression)', 'Direct URLs available']
            }
        }
    });
});

module.exports = router; 