const express = require('express');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Import the app
let app;
try {
    app = require('./src/app');
    console.log('✅ App imported successfully');
} catch (error) {
    console.error('❌ Error importing app:', error.message);
    process.exit(1);
}

// Start server
app.listen(PORT, HOST, () => {
    console.log(`🚀 TikTok Reels Backend Server running on http://${HOST}:${PORT}`);
    console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⚡ API Base URL: http://${HOST}:${PORT}/api/v1`);
    console.log(`📊 Health Check: http://${HOST}:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});
