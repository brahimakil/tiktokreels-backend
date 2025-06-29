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
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
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

// Enhanced User-Agent rotation for better server compatibility
const getUserAgent = () => {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
};

// Alternative method using YouTube API (fallback)
const getVideoInfoAlternative = async (videoId) => {
    try {
        // Method 1: Try YouTube oEmbed API (no API key required)
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        
        const response = await axios.get(oembedUrl, {
            headers: {
                'User-Agent': getUserAgent(),
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            timeout: 10000
        });

        if (response.data) {
            return {
                videoId: videoId,
                title: response.data.title,
                author: {
                    name: response.data.author_name,
                    channel: response.data.author_url
                },
                thumbnail: response.data.thumbnail_url,
                duration: null, // oEmbed doesn't provide duration
                description: 'Video information retrieved via alternative method'
            };
        }
    } catch (error) {
        console.log('oEmbed method failed:', error.message);
    }

    // Method 2: Try scraping basic info from YouTube page
    try {
        const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const response = await axios.get(pageUrl, {
            headers: {
                'User-Agent': getUserAgent()
            },
            timeout: 15000
        });

        const html = response.data;
        
        // Extract title using regex
        const titleMatch = html.match(/<title>([^<]+)<\/title>/);
        const title = titleMatch ? titleMatch[1].replace(' - YouTube', '') : `Video ${videoId}`;

        return {
            videoId: videoId,
            title: title,
            author: {
                name: 'Unknown Author',
                channel: `https://youtube.com/watch?v=${videoId}`
            },
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            duration: null,
            description: 'Basic video information retrieved via web scraping'
        };
    } catch (error) {
        console.log('Web scraping method failed:', error.message);
    }

    return null;
};

// Enhanced getVideoInfo with multiple fallback methods
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

        console.log('🔍 Getting video info for:', url);

        let videoInfo = null;
        let method = 'unknown';

        // Method 1: Try ytdl-core (primary) with enhanced headers
        try {
            console.log('🔄 Trying ytdl-core method...');
            const info = await ytdl.getBasicInfo(url, {
                requestOptions: {
                    headers: {
                        'User-Agent': getUserAgent(),
                        'Accept': '*/*',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'DNT': '1',
                        'Connection': 'keep-alive'
                    }
                }
            });
            
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
            console.log('✅ ytdl-core method successful');
            
        } catch (ytdlError) {
            console.log('❌ ytdl-core failed:', ytdlError.message);
            
            // Method 2: Try alternative methods
            const videoId = extractVideoId(url);
            if (videoId) {
                console.log('🔄 Trying alternative methods...');
                const altInfo = await getVideoInfoAlternative(videoId);
                
                if (altInfo) {
                    videoInfo = {
                        id: altInfo.videoId,
                        title: altInfo.title,
                        description: altInfo.description,
                        duration: altInfo.duration || 0,
                        thumbnail: altInfo.thumbnail,
                        author: altInfo.author,
                        statistics: {
                            views: 0,
                            likes: 0
                        },
                        uploadDate: 'Unknown',
                        category: 'Unknown'
                    };
                    method = 'alternative-api';
                    console.log('✅ Alternative method successful');
                }
            }
        }

        if (!videoInfo) {
            throw new Error('All methods failed to retrieve video information');
        }

        return res.json({
            success: true,
            message: 'Video info retrieved successfully',
            method: method,
            data: videoInfo
        });

    } catch (error) {
        console.error('❌ Get Video Info Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to get video information',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            troubleshooting: {
                possibleCauses: [
                    'YouTube blocking cloud server IPs',
                    'Video is private or restricted',
                    'Invalid YouTube URL',
                    'Network connectivity issues'
                ],
                solutions: [
                    'Try a different YouTube video',
                    'Check if the video is public',
                    'Ensure stable internet connection',
                    'YouTube may be temporarily blocking requests'
                ]
            }
        });
    }
};

// RESTORED ORIGINAL: Enhanced download method - BACK TO WORKING VERSION
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

        console.log('🔄 Processing YouTube URL:', url);

        // Try to get video info first with enhanced headers
        const info = await ytdl.getInfo(url, {
            requestOptions: {
                headers: {
                    'User-Agent': getUserAgent(),
                    'Accept': '*/*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            }
        });
        
        // Choose format - EXACTLY like localhost version
        const formats = info.formats.filter(format => 
            format.hasVideo && format.hasAudio && format.container === 'mp4'
        );
        
        let selectedFormat = formats.find(f => f.qualityLabel === '720p') || 
                           formats.find(f => f.qualityLabel === '480p') || 
                           formats[0];

        if (!selectedFormat) {
            selectedFormat = ytdl.chooseFormat(info.formats, { quality: 'highest' });
        }

        if (!selectedFormat || !selectedFormat.url) {
            throw new Error('No suitable format found');
        }

        console.log('📥 Download format found:', selectedFormat.qualityLabel || selectedFormat.quality);

        // Create short proxy URL - EXACTLY like localhost version
        const videoId = info.videoDetails.videoId;
        const shortHash = generateShortHash(selectedFormat.url, videoId);
        
        urlStore.set(shortHash, {
            url: selectedFormat.url,
            title: info.videoDetails.title,
            sanitizedTitle: sanitizeFilename(info.videoDetails.title),
            expires: Date.now() + (6 * 60 * 60 * 1000),
            videoId: videoId
        });

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const shortUrl = `${baseUrl}/api/v1/youtube/proxy/${shortHash}`;

        return res.json({
            success: true,
            message: 'YouTube video URL retrieved successfully',
            method: 'ytdl-core (enhanced)',
            data: {
                downloadUrl: shortUrl,
                directUrl: selectedFormat.url,
                id: videoId,
                title: info.videoDetails.title,
                description: info.videoDetails.description?.slice(0, 500) + '...' || 'No description',
                duration: parseInt(info.videoDetails.lengthSeconds),
                author: {
                    name: info.videoDetails.author.name,
                    channel: info.videoDetails.author.channel_url,
                    channelId: info.videoDetails.author.id,
                    thumbnail: info.videoDetails.author.thumbnails?.[0]?.url
                },
                statistics: {
                    views: parseInt(info.videoDetails.viewCount) || 0,
                    likes: parseInt(info.videoDetails.likes) || 0,
                    rating: parseFloat(info.videoDetails.averageRating) || 0
                },
                thumbnail: info.videoDetails.thumbnails?.[0]?.url,
                uploadDate: info.videoDetails.uploadDate,
                category: info.videoDetails.category,
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
        console.error('❌ YouTube Download Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to process YouTube URL',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            troubleshooting: {
                possibleCauses: [
                    'YouTube blocking server IPs',
                    'Video is private, restricted, or deleted',
                    'Geographic restrictions',
                    'YouTube API changes',
                    'Network connectivity issues'
                ],
                solutions: [
                    'Try a different YouTube video',
                    'Check if the video is public and accessible',
                    'YouTube may be temporarily blocking requests from this server',
                    'Try again in a few minutes'
                ]
            }
        });
    }
};

// RESTORED ORIGINAL: Proxy endpoint - EXACTLY like localhost version
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
        
        if (Date.now() > urlData.expires) {
            urlStore.delete(hash);
            return res.status(410).json({
                success: false,
                message: 'Download link has expired'
            });
        }
        
        console.log(`📥 Redirecting download: ${urlData.title}`);
        
        try {
            const filename = `${urlData.sanitizedTitle}.mp4`;
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Type', 'video/mp4');
            res.redirect(urlData.url);
        } catch (headerError) {
            console.error('Header Error:', headerError.message);
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

// Clean up expired URLs
const cleanupExpiredUrls = () => {
    const now = Date.now();
    for (const [hash, data] of urlStore.entries()) {
        if (now > data.expires) {
            urlStore.delete(hash);
        }
    }
};

// Get stats
const getStats = async (req, res) => {
    try {
        cleanupExpiredUrls();
        
        return res.json({
            success: true,
            stats: {
                totalDownloads: req.app?.locals?.youtubeDownloadCount || 0,
                activeProxyUrls: urlStore.size,
                uptime: Math.floor(process.uptime()),
                memory: process.memoryUsage(),
                availableMethods: ['v1 (ytdl-core)', 'alternative-api', 'web-scraping'],
                supportedFormats: ['mp4', 'webm', 'audio-only'],
                features: [
                    'Multiple fallback methods',
                    'Enhanced headers for server compatibility',
                    'Short proxy URLs',
                    'Direct download URLs',
                    'Enhanced error handling'
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
                'User-Agent': getUserAgent()
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
        
        const info = await ytdl.getBasicInfo(testUrl, {
            requestOptions: {
                headers: {
                    'User-Agent': getUserAgent()
                }
            }
        });
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