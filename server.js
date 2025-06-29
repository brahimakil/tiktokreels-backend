const express = require('express');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : (process.env.HOST || 'localhost');

// Import the app with error handling
let app;
try {
    app = require('./src/app');
    console.log('✅ App imported successfully');
} catch (error) {
    console.error('❌ Critical error importing app:', error.message);
    
    // Create a minimal app for error reporting
    app = express();
    app.use(express.json());
    
    app.get('/', (req, res) => {
        res.status(503).json({
            success: false,
            message: 'Server startup failed',
            error: error.message,
            status: 'critical_error'
        });
    });
    
    app.get('/health', (req, res) => {
        res.status(503).json({
            success: false,
            status: 'critical_error',
            error: error.message
        });
    });
}

// Start server with error handling
const server = app.listen(PORT, HOST, () => {
    console.log(`🚀 Social Media Downloader Backend running on http://${HOST}:${PORT}`);
    console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⚡ API Base URL: http://${HOST}:${PORT}/api/v1`);
    console.log(`📊 Health Check: http://${HOST}:${PORT}/health`);
}).on('error', (err) => {
    console.error('❌ Server failed to start:', err.message);
    process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    
    server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
        console.log('❌ Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});

module.exports = app;
