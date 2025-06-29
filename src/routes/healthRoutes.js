const express = require('express');
const router = express.Router();

// Detailed health check
router.get('/', (req, res) => {
    const healthData = {
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        memory: process.memoryUsage(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {}
    };

    // Check each service
    const services = ['tiktok', 'youtube', 'instagram'];
    
    services.forEach(service => {
        try {
            // Try to require the controller to see if it loads
            require(`../controllers/${service}Controller`);
            healthData.services[service] = {
                status: 'active',
                endpoint: `/api/v1/${service}`
            };
        } catch (error) {
            healthData.services[service] = {
                status: 'error',
                error: error.message,
                endpoint: `/api/v1/${service}`
            };
        }
    });

    // Facebook is disabled
    healthData.services.facebook = {
        status: 'disabled',
        message: 'Temporarily disabled due to external API issues',
        endpoint: '/api/v1/facebook'
    };

    res.json(healthData);
});

// Individual service health checks
router.get('/tiktok', async (req, res) => {
    try {
        const controller = require('../controllers/tiktokController');
        res.json({
            success: true,
            service: 'tiktok',
            status: 'active',
            endpoint: '/api/v1/tiktok'
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            service: 'tiktok',
            status: 'error',
            error: error.message
        });
    }
});

router.get('/youtube', async (req, res) => {
    try {
        const controller = require('../controllers/youtubeController');
        res.json({
            success: true,
            service: 'youtube',
            status: 'active',
            endpoint: '/api/v1/youtube'
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            service: 'youtube',
            status: 'error',
            error: error.message
        });
    }
});

router.get('/instagram', async (req, res) => {
    try {
        const controller = require('../controllers/instagramController');
        res.json({
            success: true,
            service: 'instagram',
            status: 'active',
            endpoint: '/api/v1/instagram'
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            service: 'instagram',
            status: 'error',
            error: error.message
        });
    }
});

router.get('/facebook', (req, res) => {
    res.status(503).json({
        success: false,
        service: 'facebook',
        status: 'disabled',
        message: 'Temporarily disabled due to external API issues',
        endpoint: '/api/v1/facebook'
    });
});

module.exports = router; 