// Disable ytdl-core updates
process.env.YTDL_NO_UPDATE = '1';

const ytdl = require('@distube/ytdl-core');
const crypto = require('crypto');
const axios = require('axios');

// In-memory store for URL mapping
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

// Extract video ID from URL
function extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// Generate short hash for URL
function generateShortHash(url, videoId) {
    const hash = crypto.createHash('md5').update(url + Date.now()).digest('hex').substring(0, 8);
    return `${videoId}_${hash}`;
}

// Sanitize filename for HTTP headers
function sanitizeFilename(title) {
    return title
        .replace(/[<>:"/\\|?*\x00-\x1f\x80-\x9f]/g, '')
        .replace(/[^\x20-\x7E]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 100)
        || 'youtube_video';
}

// Alternative method using oEmbed API (works on hosted servers)
const getVideoInfoViaOEmbed = async (videoId) => {
    try {
        console.log('🔄 Using YouTube oEmbed API...');
        
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        
        const response = await axios.get(oembedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9'
            },
            timeout: 15000
        });

        if (response.data && response.data.title) {
            console.log('✅ oEmbed API successful');
            return {
                id: videoId,
                title: response.data.title,
                description: 'Video information retrieved via YouTube oEmbed API',
                duration: response.data.duration || 0,
                thumbnail: response.data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                author: {
                    name: response.data.author_name || 'Unknown',
                    channel: response.data.author_url || `https://youtube.com/watch?v=${videoId}`
                },
                statistics: {
                    views: 0, // Not available in oEmbed
                    likes: 0  // Not available in oEmbed
                },
                uploadDate: 'Unknown',
                category: 'Unknown',
                width: response.data.width,
                height: response.data.height
            };
        }
        
        throw new Error('No valid data in oEmbed response');
        
    } catch (error) {
        console.log('❌ oEmbed API failed:', error.message);
        throw error;
    }
};

// Main getVideoInfo function - PRODUCTION OPTIMIZED
const getVideoInfo = async (req, res) => {
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

        const videoId = extractVideoId(url);
        if (!videoId) {
            return res.status(400).json({
                success: false,
                message: 'Could not extract video ID from URL'
            });
        }

        console.log('🔍 Getting video info for:', url);
        console.log('📋 Video ID:', videoId);

        let videoInfo = null;
        let method = 'unknown';

        // SKIP ytdl-core in production - go straight to oEmbed
        if (process.env.NODE_ENV === 'production') {
            console.log('🌐 Production environment - using oEmbed API only');
            
            try {
                videoInfo = await getVideoInfoViaOEmbed(videoId);
                method = 'youtube-oembed';
            } catch (oembedError) {
                console.log('❌ oEmbed failed, using basic fallback');
                
                // Basic fallback
                videoInfo = {
                    id: videoId,
                    title: `YouTube Video ${videoId}`,
                    description: 'Basic video information - YouTube API access limited on hosted servers',
                    duration: 0,
                    thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    author: {
                        name: 'Unknown Author',
                        channel: `https://youtube.com/watch?v=${videoId}`
                    },
                    statistics: {
                        views: 0,
                        likes: 0
                    },
                    uploadDate: 'Unknown',
                    category: 'Unknown'
                };
                method = 'basic-fallback';
            }
        } else {
            // Development environment - try ytdl-core first
            console.log('🛠️ Development environment - trying ytdl-core');
            
            try {
                const info = await ytdl.getBasicInfo(url);
                
                videoInfo = {
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
                };
                method = 'ytdl-core';
                
            } catch (ytdlError) {
                console.log('❌ ytdl-core failed in dev, trying oEmbed');
                videoInfo = await getVideoInfoViaOEmbed(videoId);
                method = 'youtube-oembed-fallback';
            }
        }

        return res.json({
            success: true,
            message: 'Video info retrieved successfully',
            method: method,
            environment: process.env.NODE_ENV || 'development',
            note: process.env.NODE_ENV === 'production' ? 'Limited functionality due to YouTube restrictions on hosted servers' : undefined,
            data: videoInfo
        });

    } catch (error) {
        console.error('❌ Get Video Info Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to get video information',
            error: process.env.NODE_ENV === 'development' ? error.message : 'YouTube access limited on hosted servers',
            troubleshooting: {
                issue: 'YouTube restricts access from hosted server IPs',
                workaround: 'Basic video information may still be available',
                environment: process.env.NODE_ENV || 'development'
            }
        });
    }
};

// Enhanced download function that actually works
const downloadVideoV1 = async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'URL is required'
            });
        }

        if (!isValidYouTubeUrl(url)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid YouTube URL'
            });
        }

        console.log('🔍 Getting download info for:', url);

        let downloadInfo = null;
        let method = 'unknown';

        // Try different methods based on environment
        if (process.env.NODE_ENV !== 'production') {
            // Development: Try ytdl-core first
            try {
                console.log('🔄 Trying ytdl-core method...');
                const info = await ytdl.getInfo(url);
                const formats = ytdl.filterFormats(info.formats, 'videoandaudio');
                
                if (formats.length > 0) {
                    const bestFormat = formats[0];
                    downloadInfo = {
                        title: info.videoDetails.title,
                        thumbnail: info.videoDetails.thumbnails?.[0]?.url,
                        duration: info.videoDetails.lengthSeconds,
                        author: info.videoDetails.author.name,
                        downloadUrl: bestFormat.url,
                        quality: bestFormat.qualityLabel || 'Unknown',
                        filesize: bestFormat.contentLength || 'Unknown',
                        videoId: info.videoDetails.videoId,
                        method: 'ytdl-core'
                    };
                    method = 'ytdl-core';
                    console.log('✅ ytdl-core method successful');
                }
            } catch (error) {
                console.log('❌ ytdl-core failed:', error.message);
            }
        }

        // Fallback: Use oEmbed for basic info + external download suggestion
        if (!downloadInfo) {
            console.log('🔄 Using oEmbed fallback...');
            const videoId = extractVideoId(url);
            const basicInfo = await getVideoInfoViaOEmbed(videoId);
            
            downloadInfo = {
                title: basicInfo.title,
                thumbnail: basicInfo.thumbnail_url,
                author: basicInfo.author_name,
                videoId: videoId,
                originalUrl: url,
                method: 'oembed-info-only',
                note: process.env.NODE_ENV === 'production' 
                    ? 'Direct download not available on hosted servers due to YouTube restrictions'
                    : 'Using basic info only',
                // Provide alternative download methods
                alternatives: {
                    suggestion: 'Use a YouTube downloader extension or visit youtube-dl websites',
                    directLink: `https://www.youtube.com/watch?v=${videoId}`,
                    ytdlCommand: `yt-dlp "${url}"`,
                    onlineDownloaders: [
                        'https://ytdl-org.github.io/youtube-dl/',
                        'https://github.com/yt-dlp/yt-dlp'
                    ]
                }
            };
            method = 'oembed-fallback';
            console.log('✅ oEmbed fallback successful');
        }

        return res.json({
            success: true,
            message: 'Download information retrieved successfully',
            method: method,
            data: downloadInfo,
            environment: process.env.NODE_ENV || 'development',
            limitations: process.env.NODE_ENV === 'production' 
                ? ['Direct download URLs not available', 'YouTube blocks hosted server IPs']
                : []
        });

    } catch (error) {
        console.error('❌ Download Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to get download information',
            error: process.env.NODE_ENV === 'development' ? error.message : 'YouTube access limited on hosted servers',
            troubleshooting: {
                possibleCauses: [
                    'YouTube blocking server IP',
                    'Rate limiting from YouTube',
                    'Video is private or restricted',
                    'Invalid URL format'
                ],
                solutions: [
                    'Try with a different video URL',
                    'Use localhost for development testing',
                    'Consider using YouTube API key',
                    'Use external download tools'
                ]
            }
        });
    }
};

// Proxy endpoint - disabled in production
const proxyDownload = async (req, res) => {
    return res.status(503).json({
        success: false,
        message: 'YouTube download proxy not available on hosted servers'
    });
};

// Stats endpoint
const getStats = async (req, res) => {
    return res.json({
        success: true,
        stats: {
            environment: process.env.NODE_ENV || 'development',
            status: process.env.NODE_ENV === 'production' ? 'Limited (oEmbed only)' : 'Full functionality',
            availableMethods: process.env.NODE_ENV === 'production' ? ['youtube-oembed', 'basic-fallback'] : ['ytdl-core', 'youtube-oembed'],
            restrictedFeatures: process.env.NODE_ENV === 'production' ? ['download', 'detailed-stats'] : [],
            uptime: Math.floor(process.uptime()),
            memory: process.memoryUsage(),
            note: 'YouTube restricts access from hosted servers'
        }
    });
};

// Debug endpoint to test what's working on hosted environment
const debugYoutube = async (req, res) => {
    const results = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        server: req.get('host'),
        tests: {}
    };

    // Test 1: Basic Node.js modules
    try {
        results.tests.nodeModules = {
            crypto: !!require('crypto'),
            https: !!require('https'),
            status: 'working'
        };
    } catch (error) {
        results.tests.nodeModules = {
            status: 'failed',
            error: error.message
        };
    }

    // Test 2: ytdl-core availability
    try {
        const ytdl = require('@distube/ytdl-core');
        results.tests.ytdlCore = {
            available: true,
            version: ytdl.version || 'unknown',
            status: 'loaded'
        };
    } catch (error) {
        results.tests.ytdlCore = {
            available: false,
            status: 'failed',
            error: error.message
        };
    }

    // Test 3: axios availability
    try {
        const axios = require('axios');
        results.tests.axios = {
            available: true,
            status: 'loaded'
        };
    } catch (error) {
        results.tests.axios = {
            available: false,
            status: 'failed',
            error: error.message
        };
    }

    // Test 4: Simple HTTP request
    try {
        const axios = require('axios');
        const response = await axios.get('https://httpbin.org/ip', { timeout: 5000 });
        results.tests.httpRequest = {
            status: 'working',
            serverIP: response.data.origin
        };
    } catch (error) {
        results.tests.httpRequest = {
            status: 'failed',
            error: error.message
        };
    }

    // Test 5: YouTube oEmbed API
    try {
        const axios = require('axios');
        const testVideoId = 'dQw4w9WgXcQ'; // Rick Roll - always available
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${testVideoId}&format=json`;
        
        const response = await axios.get(oembedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });

        results.tests.youtubeOEmbed = {
            status: 'working',
            title: response.data.title,
            author: response.data.author_name
        };
    } catch (error) {
        results.tests.youtubeOEmbed = {
            status: 'failed',
            error: error.message,
            statusCode: error.response?.status
        };
    }

    // Test 6: ytdl-core with test video
    try {
        const ytdl = require('@distube/ytdl-core');
        const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        
        const info = await ytdl.getBasicInfo(testUrl);
        results.tests.ytdlBasicInfo = {
            status: 'working',
            videoId: info.videoDetails.videoId,
            title: info.videoDetails.title
        };
    } catch (error) {
        results.tests.ytdlBasicInfo = {
            status: 'failed',
            error: error.message,
            errorType: error.name
        };
    }

    return res.json({
        success: true,
        message: 'YouTube debug information',
        debug: results
    });
};

module.exports = {
    downloadVideoV1,
    proxyDownload,
    getVideoInfo,
    getStats,
    debugYoutube
};