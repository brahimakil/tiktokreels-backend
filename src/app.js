const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// CORS Configuration - IMPORTANT: This must be before other middleware
const getAllowedOrigins = () => {
    const baseOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:3001',
        'http://localhost:8080',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000'
    ];

    const productionOrigins = [
        'https://tiktokreels-backend.onrender.com'
    ];

    // In production, allow both local (for testing) and production origins
    if (process.env.NODE_ENV === 'production') {
        return [...baseOrigins, ...productionOrigins];
    }

    // In development, be more permissive
    return [...baseOrigins, ...productionOrigins];
};

const corsOptions = {
    origin: [
        'http://localhost:3000',   // Backend itself
        'http://localhost:5173',   // Vite React dev server
        'http://localhost:3001',   // Alternative React port
        'http://localhost:8080',   // Alternative dev port
        'http://127.0.0.1:5173',   // IPv4 version
        'http://127.0.0.1:3000',   // IPv4 version
        'https://tiktokreels.vercel.app',           // ADD THIS LINE
        'https://tiktokreels-backend.vercel.app',   // ADD THIS LINE
        'https://tiktokreels.com',                  // ADD THIS LINE
        'https://www.tiktokreels.com'               // ADD THIS LINE
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
        message: 'TikTok & YouTube Downloader Backend API',
        version: '1.0.0',
        status: 'Server is running',
        services: ['TikTok', 'YouTube']
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
            youtube: 'active'
        }
    });
});

// Try to import routes with error handling
try {
    const tiktokRoutes = require('./routes/tiktokRoutes');
    app.use('/api/v1/tiktok', tiktokRoutes);
    console.log('✅ TikTok routes loaded successfully');
} catch (error) {
    console.error('❌ Error loading TikTok routes:', error.message);
}

try {
    const youtubeRoutes = require('./routes/youtubeRoutes');
    app.use('/api/v1/youtube', youtubeRoutes);
    console.log('✅ YouTube routes loaded successfully');
} catch (error) {
    console.error('❌ Error loading YouTube routes:', error.message);
}

try {
    const facebookRoutes = require('./routes/facebookRoutes');
    app.use('/api/v1/facebook', facebookRoutes);
    console.log('✅ Facebook routes loaded successfully');
} catch (error) {
    console.error('❌ Error loading Facebook routes:', error.message);
}

try {
    const instagramRoutes = require('./routes/instagramRoutes');
    app.use('/api/v1/instagram', instagramRoutes);
    console.log('✅ Instagram routes loaded successfully');
} catch (error) {
    console.error('❌ Error loading Instagram routes:', error.message);
}

// API info endpoint
app.get('/api/v1', (req, res) => {
    res.json({
        success: true,
        message: 'Social Media Downloader API',
        version: '1.0.0',
        services: {
            tiktok: {
                endpoint: '/api/v1/tiktok',
                methods: ['download', 'info', 'stats']
            },
            youtube: {
                endpoint: '/api/v1/youtube', 
                methods: ['download', 'info', 'stats', 'v1', 'v2', 'auto']
            },
            facebook: {
                endpoint: '/api/v1/facebook',
                methods: ['download', 'info', 'stats', 'v1', 'v2', 'v3', 'auto']
            },
            instagram: {
                endpoint: '/api/v1/instagram',
                methods: ['download', 'info', 'stats']
            }
        }
    });
});

// Basic error handling
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.path,
        availableEndpoints: [
            '/api/v1/tiktok',
            '/api/v1/youtube',
            '/api/v1/facebook',
            '/api/v1/instagram',
            '/health'
        ]
    });
});

app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

module.exports = app;
