const notFound = (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        availableEndpoints: {
            health: '/health',
            tiktokDownload: '/api/v1/tiktok/download',
            tiktokInfo: '/api/v1/tiktok/info',
            tiktokStats: '/api/v1/tiktok/stats',
            tiktokMethods: '/api/v1/tiktok/methods'
        }
    });
};

module.exports = notFound; 