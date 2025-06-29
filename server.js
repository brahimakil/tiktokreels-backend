const express = require('express');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

// Import the app
let app;
try {
    app = require('./src/app');
    console.log('✅ App imported successfully');
} catch (error) {
    console.error('❌ Error importing app:', error.message);
    process.exit(1);
}

// Start server - no HOST parameter = binds to 0.0.0.0 automatically
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⚡ Local: http://localhost:${PORT}/api/v1`);
    console.log(`📊 Health: http://localhost:${PORT}/health`);
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
