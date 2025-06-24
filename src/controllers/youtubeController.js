const ytdl = require('@distube/ytdl-core');
const crypto = require('crypto');

// In-memory store for URL mapping (in production, use Redis or database)
const urlStore = new Map();

// Utility function to validate YouTube URLs
function isValidYouTubeUrl(url) {
    const youtubePatterns = [
        /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
        /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/,
        /^https?:\/\/(www\.)?youtube\.com\/v\/[\w-]+/,
        /^https?:\/\/youtu\.be\/[\w-]+/,
        /^https?:\/\/(www\.)?youtube\.com\/shorts\/[\w-]+/,
        /^https?:\/\/(m\.)?youtube\.com\/watch\?v=[\w-]+/
    ];
    
    return youtubePatterns.some(pattern => pattern.test(url));
}

// Generate short hash for URL
function generateShortHash(url, videoId) {
    const hash = crypto.createHash('md5').update(url + Date.now()).digest('hex').substring(0, 8);
    return `${videoId}_${hash}`;
}

// Sanitize filename for HTTP headers
function sanitizeFilename(title) {
    return title
        .replace(/[<>:"/\\|?*\x00-\x1f\x80-\x9f]/g, '') // Remove invalid characters
        .replace(/[^\x20-\x7E]/g, '') // Remove non-ASCII characters
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim()
        .substring(0, 100) // Limit length
        || 'youtube_video'; // Fallback if title becomes empty
}

// Method 1: Using @distube/ytdl-core (Primary method)
const downloadVideoV1 = async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'YouTube URL is required'
            });
        }

        if (!isValidYouTubeUrl(url)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid YouTube URL format'
            });
        }

        console.log('🔄 Processing YouTube URL (ytdl-core):', url);

        // Get video info
        const info = await ytdl.getInfo(url);
        
        // Choose format - get the best quality with both audio and video
        const formats = info.formats.filter(format => 
            format.hasVideo && format.hasAudio && format.container === 'mp4'
        );
        
        let selectedFormat = formats.find(f => f.qualityLabel === '720p') || 
                           formats.find(f => f.qualityLabel === '480p') || 
                           formats[0];

        // If no combined format, get separate video and audio (best available)
        if (!selectedFormat) {
            selectedFormat = ytdl.chooseFormat(info.formats, { quality: 'highest' });
        }

        if (!selectedFormat || !selectedFormat.url) {
            throw new Error('No suitable format found');
        }

        console.log('📥 Download format found:', selectedFormat.qualityLabel || selectedFormat.quality);

        // Create short proxy URL
        const videoId = info.videoDetails.videoId;
        const shortHash = generateShortHash(selectedFormat.url, videoId);
        
        // Store the mapping (expires in 6 hours like YouTube URLs)
        urlStore.set(shortHash, {
            url: selectedFormat.url,
            title: info.videoDetails.title,
            sanitizedTitle: sanitizeFilename(info.videoDetails.title),
            expires: Date.now() + (6 * 60 * 60 * 1000), // 6 hours
            videoId: videoId
        });

        // Create short proxy URL
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const shortUrl = `${baseUrl}/api/v1/youtube/proxy/${shortHash}`;

        return res.json({
            success: true,
            message: 'YouTube video URL retrieved successfully',
            method: 'ytdl-core (distube)',
            data: {
                // Short proxy URL instead of long URL
                downloadUrl: shortUrl,
                
                // Original URL info (optional, for debugging)
                originalUrlLength: selectedFormat.url.length,
                shortUrlLength: shortUrl.length,
                compressionRatio: `${Math.round((1 - shortUrl.length / selectedFormat.url.length) * 100)}% shorter`,
                
                // Alternative: direct URL (if frontend wants it)
                directUrl: selectedFormat.url,
                
                // Video info
                id: videoId,
                title: info.videoDetails.title,
                description: info.videoDetails.description?.slice(0, 500) + '...' || 'No description',
                duration: parseInt(info.videoDetails.lengthSeconds),
                
                // Author info
                author: {
                    name: info.videoDetails.author.name,
                    channel: info.videoDetails.author.channel_url,
                    channelId: info.videoDetails.author.id,
                    thumbnail: info.videoDetails.author.thumbnails?.[0]?.url
                },
                
                // Statistics
                statistics: {
                    views: parseInt(info.videoDetails.viewCount) || 0,
                    likes: parseInt(info.videoDetails.likes) || 0,
                    rating: parseFloat(info.videoDetails.averageRating) || 0
                },
                
                // Video details
                thumbnail: info.videoDetails.thumbnails?.[0]?.url,
                uploadDate: info.videoDetails.uploadDate,
                category: info.videoDetails.category,
                
                // Format details
                format: {
                    quality: selectedFormat.qualityLabel || selectedFormat.quality,
                    container: selectedFormat.container || selectedFormat.ext,
                    videoCodec: selectedFormat.videoCodec,
                    audioCodec: selectedFormat.audioCodec,
                    filesize: selectedFormat.contentLength || 'Unknown'
                }
            }
        });

    } catch (error) {
        console.error('YouTube V1 (ytdl-core) Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to process YouTube URL with ytdl-core',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Proxy endpoint to redirect to actual URL
const proxyDownload = async (req, res) => {
    try {
        const { hash } = req.params;
        
        if (!urlStore.has(hash)) {
            return res.status(404).json({
                success: false,
                message: 'Download link not found or expired'
            });
        }
        
        const urlData = urlStore.get(hash);
        
        // Check if expired
        if (Date.now() > urlData.expires) {
            urlStore.delete(hash);
            return res.status(410).json({
                success: false,
                message: 'Download link has expired'
            });
        }
        
        console.log(`📥 Redirecting download: ${urlData.title}`);
        
        try {
            // Set headers for download with sanitized filename
            const filename = `${urlData.sanitizedTitle}.mp4`;
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Type', 'video/mp4');
            
            // Redirect to actual YouTube URL
            res.redirect(urlData.url);
            
        } catch (headerError) {
            console.error('Header Error:', headerError.message);
            
            // Fallback: redirect without custom headers
            res.redirect(urlData.url);
        }
        
    } catch (error) {
        console.error('Proxy Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Proxy error',
            error: error.message
        });
    }
};

// Clean up expired URLs (call this periodically)
const cleanupExpiredUrls = () => {
    const now = Date.now();
    for (const [hash, data] of urlStore.entries()) {
        if (now > data.expires) {
            urlStore.delete(hash);
        }
    }
};

// Get video info only (lightweight)
const getVideoInfo = async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'YouTube URL is required'
            });
        }

        console.log('🔍 Getting video info for:', url);

        // Use ytdl-core for info (faster)
        const info = await ytdl.getBasicInfo(url);

        return res.json({
            success: true,
            message: 'Video info retrieved successfully',
            data: {
                id: info.videoDetails.videoId,
                title: info.videoDetails.title,
                description: info.videoDetails.description?.slice(0, 200) + '...' || 'No description',
                duration: parseInt(info.videoDetails.lengthSeconds),
                thumbnail: info.videoDetails.thumbnails?.[0]?.url,
                author: {
                    name: info.videoDetails.author.name,
                    channel: info.videoDetails.author.channel_url
                },
                statistics: {
                    views: parseInt(info.videoDetails.viewCount) || 0,
                    likes: parseInt(info.videoDetails.likes) || 0
                },
                uploadDate: info.videoDetails.uploadDate,
                category: info.videoDetails.category
            }
        });

    } catch (error) {
        console.error('Get Video Info Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to get video information',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Get stats
const getStats = async (req, res) => {
    try {
        // Clean up expired URLs
        cleanupExpiredUrls();
        
        return res.json({
            success: true,
            stats: {
                totalDownloads: req.app?.locals?.youtubeDownloadCount || 0,
                activeProxyUrls: urlStore.size,
                uptime: Math.floor(process.uptime()),
                memory: process.memoryUsage(),
                availableMethods: ['v1 (ytdl-core)'],
                supportedFormats: ['mp4', 'webm', 'audio-only'],
                features: [
                    'Short proxy URLs (90%+ compression)',
                    'Direct download URLs',
                    'Multiple quality options', 
                    'Video statistics',
                    'Author information',
                    'Thumbnail extraction',
                    'Header-safe filenames'
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
    proxyDownload,
    getVideoInfo,
    getStats
}; 