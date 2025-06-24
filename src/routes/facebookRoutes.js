const express = require('express');
const facebookController = require('../controllers/facebookController');

const router = express.Router();

// Main download endpoints
router.post('/download', facebookController.downloadVideo);
router.post('/download/auto', facebookController.downloadVideo);

// Info endpoint
router.post('/info', facebookController.getVideoInfo);

// Stats endpoint
router.get('/stats', facebookController.getStats);

// API info endpoint
router.get('/methods', (req, res) => {
    res.json({
        success: true,
        api: {
            name: 'Facebook Video Downloader API',
            description: 'Clean and simple Facebook video downloading service',
            endpoint: '/api/v1/facebook/download',
            method: 'POST',
            features: ['HD quality', 'SD quality', 'Video metadata', 'Title sanitization']
        }
    });
});

module.exports = router; 