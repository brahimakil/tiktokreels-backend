const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// CORS Configuration - IMPORTANT: This must be before other middleware
const corsOptions = {
    origin: [
        'http://localhost:3000',   // Backend itself
        'http://localhost:5173',   // Vite React dev server
        'http://localhost:3001',   // Alternative React port
        'http://localhost:8080',   // Alternative dev port
        'http://127.0.0.1:5173',   // IPv4 version
        'http://127.0.0.1:3000',   // IPv4 version
        'https://tiktokreels.vercel.app',           // Production frontend
        'https://tiktokreels-backend.vercel.app'    // Production backend
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
};

// Apply CORS middleware FIRST
app.use(cors(corsOptions));

// Add explicit OPTIONS handling for preflight requests
app.options('*', cors(corsOptions));

// Basic middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Add request logging for debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin || 'None'}`);
    next();
});

// Test if basic routes work first
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Social Media Downloader Backend API',
        version: '1.0.0',
        status: 'Server is running',
        services: ['TikTok', 'YouTube', 'Instagram'] // Removed Facebook temporarily
    });
});

// Health check route
app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        memory: process.memoryUsage(),
        version: '1.0.0',
        cors: 'enabled',
        services: {
            tiktok: 'active',
            youtube: 'active',
            instagram: 'active'
            // facebook: 'disabled' // Commented out for now
        }
    });
});

// Service loading with improved error handling
const services = [];

// TikTok Routes
try {
    const tiktokRoutes = require('./routes/tiktokRoutes');
    app.use('/api/v1/tiktok', tiktokRoutes);
    console.log('✅ TikTok routes loaded successfully');
    services.push({
        name: 'tiktok',
        endpoint: '/api/v1/tiktok',
        status: 'active',
        methods: ['download', 'info', 'stats']
    });
} catch (error) {
    console.error('❌ Error loading TikTok routes:', error.message);
    services.push({
        name: 'tiktok',
        endpoint: '/api/v1/tiktok',
        status: 'error',
        error: error.message
    });
}

// YouTube Routes
try {
    const youtubeRoutes = require('./routes/youtubeRoutes');
    app.use('/api/v1/youtube', youtubeRoutes);
    console.log('✅ YouTube routes loaded successfully');
    services.push({
        name: 'youtube',
        endpoint: '/api/v1/youtube',
        status: 'active',
        methods: ['download', 'info', 'stats', 'v1', 'v2', 'auto']
    });
} catch (error) {
    console.error('❌ Error loading YouTube routes:', error.message);
    services.push({
        name: 'youtube',
        endpoint: '/api/v1/youtube',
        status: 'error',
        error: error.message
    });
}

// Facebook Routes - TEMPORARILY DISABLED
/*
try {
    const facebookRoutes = require('./routes/facebookRoutes');
    app.use('/api/v1/facebook', facebookRoutes);
    console.log('✅ Facebook routes loaded successfully');
    services.push({
        name: 'facebook',
        endpoint: '/api/v1/facebook',
        status: 'active',
        methods: ['download', 'info', 'stats', 'v1', 'v2', 'v3', 'auto']
    });
} catch (error) {
    console.error('❌ Error loading Facebook routes:', error.message);
    services.push({
        name: 'facebook',
        endpoint: '/api/v1/facebook',
        status: 'error',
        error: error.message
    });
}
*/

// Add Facebook as disabled service
services.push({
    name: 'facebook',
    endpoint: '/api/v1/facebook',
    status: 'disabled',
    message: 'Temporarily disabled due to external API issues'
});

// Instagram Routes
try {
    const instagramRoutes = require('./routes/instagramRoutes');
    app.use('/api/v1/instagram', instagramRoutes);
    console.log('✅ Instagram routes loaded successfully');
    services.push({
        name: 'instagram',
        endpoint: '/api/v1/instagram',
        status: 'active',
        methods: ['video', 'media', 'info', 'methods']
    });
} catch (error) {
    console.error('❌ Error loading Instagram routes:', error.message);
    services.push({
        name: 'instagram',
        endpoint: '/api/v1/instagram',
        status: 'error',
        error: error.message
    });
}

// API info endpoint with dynamic service status
app.get('/api/v1', (req, res) => {
    const activeServices = services.filter(s => s.status === 'active');
    const errorServices = services.filter(s => s.status === 'error');
    const disabledServices = services.filter(s => s.status === 'disabled');

    res.json({
        success: true,
        message: 'Social Media Downloader API',
        version: '1.0.0',
        status: {
            total: services.length,
            active: activeServices.length,
            errors: errorServices.length,
            disabled: disabledServices.length
        },
        services: services.reduce((acc, service) => {
            acc[service.name] = {
                endpoint: service.endpoint,
                status: service.status,
                methods: service.methods || [],
                ...(service.error && { error: service.error }),
                ...(service.message && { message: service.message })
            };
            return acc;
        }, {}),
        availableEndpoints: activeServices.map(s => s.endpoint)
    });
});

// Facebook disabled endpoint - return helpful message
app.use('/api/v1/facebook', (req, res) => {
    res.status(503).json({
        success: false,
        message: 'Facebook service temporarily disabled',
        reason: 'External API issues - service will be restored once stable APIs are found',
        alternatives: [
            'Use TikTok downloader: /api/v1/tiktok',
            'Use Instagram downloader: /api/v1/instagram',
            'Use YouTube downloader: /api/v1/youtube'
        ],
        status: 'disabled'
    });
});

// Enhanced 404 handler
app.use((req, res) => {
    const activeEndpoints = services
        .filter(s => s.status === 'active')
        .map(s => s.endpoint);

    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.path,
        method: req.method,
        availableEndpoints: [
            ...activeEndpoints,
            '/health',
            '/api/v1'
        ],
        disabledEndpoints: services
            .filter(s => s.status === 'disabled')
            .map(s => `${s.endpoint} (${s.message || 'disabled'})`)
    });
});

// Enhanced error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    
    // Don't let one service error crash the whole server
    if (err.code === 'MODULE_NOT_FOUND') {
        return res.status(503).json({
            success: false,
            message: 'Service temporarily unavailable',
            error: 'Required dependencies missing',
            path: req.path
        });
    }

    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        path: req.path,
        timestamp: new Date().toISOString()
    });
});

module.exports = app;
