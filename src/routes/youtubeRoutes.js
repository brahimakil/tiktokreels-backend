const express = require('express');
const youtubeController = require('../controllers/youtubeController');

const router = express.Router();

// Basic routes - same pattern as TikTok
router.post('/download', youtubeController.downloadVideoV1);
router.post('/info', youtubeController.getVideoInfo);
router.get('/stats', youtubeController.getStats);

// Proxy route for short URLs
router.get('/proxy/:hash', youtubeController.proxyDownload);

// Debug route - ADD THIS
router.get('/debug', youtubeController.debugYoutube);

// Method info endpoint
router.get('/methods', (req, res) => {
    res.json({
        success: true,
        methods: {
            v1: {
                name: '@distube/ytdl-core',
                description: 'Primary method using ytdl-core with multiple fallbacks',
                endpoint: '/api/v1/youtube/download',
                reliability: 'High',
                features: ['Fast processing', 'Good quality', 'Short URLs', 'Cloud optimized']
            },
            debug: {
                name: 'Debug endpoint',
                description: 'Test what works on hosted environment',
                endpoint: '/api/v1/youtube/debug',
                method: 'GET'
            }
        }
    });
});

module.exports = router; 