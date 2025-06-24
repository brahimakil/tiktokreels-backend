const TikTokDL = require('@tobyg74/tiktok-api-dl');

// Utility function (not a method)
function isValidTikTokUrl(url) {
    const tiktokPatterns = [
        /^https?:\/\/(www\.)?tiktok\.com\/@[\w.-]+\/video\/\d+/,
        /^https?:\/\/(www\.)?tiktok\.com\/t\/[\w-]+/,
        /^https?:\/\/vm\.tiktok\.com\/[\w-]+/,
        /^https?:\/\/vt\.tiktok\.com\/[\w-]+/,
        /^https?:\/\/m\.tiktok\.com\/v\/\d+/
    ];
    
    return tiktokPatterns.some(pattern => pattern.test(url));
}

// Export direct functions instead of class methods
const downloadVideoV1 = async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'TikTok URL is required'
            });
        }

        if (!isValidTikTokUrl(url)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid TikTok URL format'
            });
        }

        console.log('🔄 Processing TikTok URL:', url);

        const result = await TikTokDL.Downloader(url, {
            version: "v2"
        });

        console.log('📥 Download result status:', result.status);

        if (result.status === 'success' && result.result) {
            // Extract the actual download URL from playAddr
            let downloadUrl = null;
            
            // Try different possible locations for the download URL
            if (result.result.video?.playAddr && Array.isArray(result.result.video.playAddr)) {
                downloadUrl = result.result.video.playAddr[0]; // Get first URL
            } else if (result.result.video?.downloadAddr) {
                downloadUrl = result.result.video.downloadAddr;
            } else if (result.result.video) {
                downloadUrl = result.result.video;
            } else if (result.result.video1) {
                downloadUrl = result.result.video1;
            } else if (result.result.video_hd) {
                downloadUrl = result.result.video_hd;
            }

            return res.json({
                success: true,
                message: 'Video download URL retrieved successfully',
                data: {
                    // Main download URL
                    downloadUrl: downloadUrl,
                    
                    // Video info
                    id: result.result?.id || 'N/A',
                    title: result.result?.title || result.result?.desc || result.result?.description || 'No title',
                    
                    // Author info
                    author: {
                        username: result.result?.author?.username || result.result?.author?.uniqueId || 'Unknown',
                        nickname: result.result?.author?.nickname || 'Unknown',
                        avatar: result.result?.author?.avatarThumb?.[0] || result.result?.author?.avatar
                    },
                    
                    // Statistics
                    statistics: result.result?.statistics || {
                        playCount: 0,
                        likeCount: 0,
                        shareCount: 0,
                        commentCount: 0,
                        downloadCount: 0
                    },
                    
                    // Additional info
                    createTime: result.result?.createTime || Date.now(),
                    type: result.result?.type || 'video',
                    
                    // Music info if available
                    music: result.result?.music ? {
                        title: result.result.music.title,
                        url: result.result.music.playUrl?.[0] || result.result.music.playUrl
                    } : null
                }
            });
        } else {
            throw new Error(result.message || 'Failed to fetch video data');
        }

    } catch (error) {
        console.error('TikTok V1 Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to process TikTok URL',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

const getVideoInfo = async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'TikTok URL is required'
            });
        }

        console.log('🔍 Getting video info for:', url);

        const result = await TikTokDL.Downloader(url, { version: "v1" });

        if (result.status === 'success' && result.result) {
            return res.json({
                success: true,
                message: 'Video info retrieved successfully',
                data: {
                    id: result.result?.id,
                    title: result.result?.description || result.result?.title,
                    author: result.result?.author,
                    statistics: result.result?.statistics,
                    hashtags: result.result?.hashtag || [],
                    createTime: result.result?.createTime,
                    type: result.result?.type,
                    isADS: result.result?.isADS || false
                }
            });
        } else {
            throw new Error(result.message || 'Failed to fetch video info');
        }

    } catch (error) {
        console.error('Get Video Info Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to get video information',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

const getStats = async (req, res) => {
    try {
        return res.json({
            success: true,
            stats: {
                totalDownloads: req.app?.locals?.downloadCount || 0,
                uptime: Math.floor(process.uptime()),
                memory: process.memoryUsage(),
                availableMethods: ['v1', 'v2', 'auto'],
                supportedFormats: ['video', 'images', 'music'],
                features: [
                    'Direct download URLs',
                    'No watermark downloads',
                    'HD quality support',
                    'Video statistics',
                    'Author information'
                ]
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to get stats',
            error: error.message
        });
    }
};

// Export the functions directly
module.exports = {
    downloadVideoV1,
    getVideoInfo,
    getStats
}; 
 