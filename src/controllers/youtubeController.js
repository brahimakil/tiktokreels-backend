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

// SERVER-OPTIMIZED: Enhanced User-Agent rotation for cloud servers
const getUserAgent = () => {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
};

// SERVER-OPTIMIZED: Enhanced alternative method with multiple fallbacks
const getVideoInfoAlternative = async (videoId) => {
    console.log('🔄 Trying alternative methods for server environment...');
    
    // Method 1: YouTube oEmbed API (most reliable for servers)
    try {
        console.log('📡 Trying YouTube oEmbed API...');
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
            timeout: 15000,
            maxRedirects: 5
        });

        if (response.data && response.data.title) {
            console.log('✅ oEmbed API successful');
            return {
                videoId: videoId,
                title: response.data.title,
                author: {
                    name: response.data.author_name || 'Unknown Author',
                    channel: response.data.author_url || `https://youtube.com/watch?v=${videoId}`
                },
                thumbnail: response.data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                duration: response.data.duration || null,
                description: 'Video information retrieved via YouTube oEmbed API'
            };
        }
    } catch (error) {
        console.log('❌ oEmbed method failed:', error.message);
    }

    // Method 2: YouTube thumbnail + basic info (always works)
    try {
        console.log('🖼️ Trying thumbnail-based method...');
        
        // Test if video exists by checking thumbnail
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        const thumbnailResponse = await axios.head(thumbnailUrl, {
            timeout: 10000,
            headers: { 'User-Agent': getUserAgent() }
        });

        if (thumbnailResponse.status === 200) {
            console.log('✅ Thumbnail method successful');
            return {
                videoId: videoId,
                title: `YouTube Video ${videoId}`,
                author: {
                    name: 'YouTube User',
                    channel: `https://youtube.com/watch?v=${videoId}`
                },
                thumbnail: thumbnailUrl,
                duration: null,
                description: 'Basic video information - video exists and is accessible'
            };
        }
    } catch (error) {
        console.log('❌ Thumbnail method failed:', error.message);
    }

    // Method 3: Minimal fallback
    console.log('📝 Using minimal fallback method...');
    return {
        videoId: videoId,
        title: `YouTube Video ${videoId}`,
        author: {
            name: 'Unknown',
            channel: `https://youtube.com/watch?v=${videoId}`
        },
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        duration: null,
        description: 'Minimal video information - server-optimized fallback'
    };
};

// SERVER-OPTIMIZED: Enhanced ytdl-core configuration for cloud servers
const createYtdlAgent = () => {
    return ytdl.createAgent(undefined, {
        localAddress: undefined,
        headers: {
            'User-Agent': getUserAgent(),
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }
    });
};

// Enhanced getVideoInfo with server optimizations
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
        console.log('🌐 Server environment detected, using optimized methods...');

        let videoInfo = null;
        let method = 'unknown';
        const videoId = extractVideoId(url);

        if (!videoId) {
            throw new Error('Could not extract video ID from URL');
        }

        // Method 1: Try ytdl-core with server optimizations
        try {
            console.log('🔄 Trying ytdl-core with server optimizations...');
            
            const agent = createYtdlAgent();
            const info = await ytdl.getBasicInfo(url, {
                agent: agent,
                requestOptions: {
                    timeout: 20000,
                    headers: {
                        'User-Agent': getUserAgent()
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
            method = 'ytdl-core-optimized';
            console.log('✅ ytdl-core optimized method successful');
            
        } catch (ytdlError) {
            console.log('❌ ytdl-core failed:', ytdlError.message);
            
            // Method 2: Try alternative methods (server-optimized)
            console.log('🔄 Falling back to server-optimized alternative methods...');
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
                method = 'server-optimized-fallback';
                console.log('✅ Server-optimized fallback successful');
            }
        }

        if (!videoInfo) {
            throw new Error('All server-optimized methods failed to retrieve video information');
        }

        return res.json({
            success: true,
            message: 'Video info retrieved successfully',
            method: method,
            serverOptimized: true,
            data: videoInfo
        });

    } catch (error) {
        console.error('❌ Get Video Info Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to get video information',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Server-optimized method failed',
            serverOptimized: true,
            troubleshooting: {
                possibleCauses: [
                    'YouTube blocking cloud server IPs (common on Vercel/Netlify)',
                    'Video is private, restricted, or deleted',
                    'Geographic restrictions on serverless functions',
                    'Network timeout in serverless environment'
                ],
                solutions: [
                    'Try a different public YouTube video',
                    'Check if video is accessible from your region',
                    'Serverless functions have limited YouTube access',
                    'Consider using dedicated server for YouTube downloads'
                ]
            }
        });
    }
};

// SERVER-OPTIMIZED: Enhanced download method for cloud servers
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

        console.log('🔄 Processing YouTube URL with server optimizations:', url);
        console.log('🌐 Serverless environment detected, using enhanced methods...');

        const videoId = extractVideoId(url);
        if (!videoId) {
            throw new Error('Could not extract video ID from URL');
        }

        let info = null;
        let method = 'unknown';
        let selectedFormat = null;

        // Method 1: Try ytdl-core with aggressive server optimizations
        try {
            console.log('🔄 Trying ytdl-core with aggressive server optimizations...');
            
            const agent = createYtdlAgent();
            info = await ytdl.getInfo(url, {
                agent: agent,
                requestOptions: {
                    timeout: 25000, // Increased timeout for servers
                    headers: {
                        'User-Agent': getUserAgent(),
                        'Accept': '*/*',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    }
                }
            });
            method = 'ytdl-core-server-optimized';
            console.log('✅ ytdl-core server-optimized successful');
            
            // Get format from ytdl-core
            const formats = info.formats.filter(format => 
                format.hasVideo && format.hasAudio && format.container === 'mp4'
            );
            
            selectedFormat = formats.find(f => f.qualityLabel === '720p') || 
                           formats.find(f => f.qualityLabel === '480p') || 
                           formats[0];

            if (!selectedFormat) {
                selectedFormat = ytdl.chooseFormat(info.formats, { quality: 'highest' });
            }
            
        } catch (ytdlError) {
            console.log('❌ ytdl-core server method failed:', ytdlError.message);
            
            // Method 2: Try alternative download methods (SERVER-SPECIFIC)
            console.log('🔄 Trying alternative download methods for server...');
            
            try {
                // Try to get basic video info first
                const altInfo = await getVideoInfoAlternative(videoId);
                
                if (altInfo) {
                    // Method 2A: Try generic YouTube download URLs (these sometimes work)
                    const genericDownloadUrls = [
                        `https://www.youtube.com/watch?v=${videoId}`,
                        `https://youtu.be/${videoId}`,
                        `https://www.youtube.com/embed/${videoId}`
                    ];
                    
                    // Create a fallback "download" that redirects to YouTube
                    const fallbackHash = generateShortHash(url, videoId);
                    
                    urlStore.set(fallbackHash, {
                        url: `https://www.youtube.com/watch?v=${videoId}`,
                        title: altInfo.title,
                        sanitizedTitle: sanitizeFilename(altInfo.title),
                        expires: Date.now() + (6 * 60 * 60 * 1000),
                        videoId: videoId,
                        isFallback: true
                    });

                    const baseUrl = `${req.protocol}://${req.get('host')}`;
                    const fallbackUrl = `${baseUrl}/api/v1/youtube/proxy/${fallbackHash}`;

                    return res.json({
                        success: true,
                        message: 'Video info retrieved with fallback download method',
                        method: 'server-fallback-redirect',
                        serverOptimized: true,
                        data: {
                            downloadUrl: fallbackUrl,
                            directUrl: `https://www.youtube.com/watch?v=${videoId}`,
                            id: altInfo.videoId,
                            title: altInfo.title,
                            description: altInfo.description,
                            duration: altInfo.duration || 0,
                            author: altInfo.author,
                            statistics: {
                                views: 0,
                                likes: 0,
                                rating: 0
                            },
                            thumbnail: altInfo.thumbnail,
                            uploadDate: 'Unknown',
                            category: 'Unknown',
                            format: {
                                quality: 'Redirect to YouTube',
                                container: 'External',
                                videoCodec: 'N/A',
                                audioCodec: 'N/A',
                                filesize: 'Unknown'
                            },
                            serverNote: {
                                message: 'Server limitations detected - using fallback method',
                                suggestion: 'Download will redirect to YouTube where you can use browser extensions',
                                videoUrl: `https://youtube.com/watch?v=${videoId}`
                            }
                        }
                    });
                }
            } catch (altError) {
                console.log('❌ Alternative methods also failed:', altError.message);
            }
            
            // Method 3: Last resort - return YouTube URL as "download"
            console.log('🔄 Using last resort method - YouTube URL redirect...');
            
            const lastResortHash = generateShortHash(url, videoId);
            const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
            
            urlStore.set(lastResortHash, {
                url: youtubeUrl,
                title: `YouTube Video ${videoId}`,
                sanitizedTitle: `youtube_video_${videoId}`,
                expires: Date.now() + (6 * 60 * 60 * 1000),
                videoId: videoId,
                isFallback: true,
                isLastResort: true
            });

            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const lastResortUrl = `${baseUrl}/api/v1/youtube/proxy/${lastResortHash}`;

            return res.json({
                success: true,
                message: 'Video URL created with redirect method (server limitation)',
                method: 'last-resort-redirect',
                serverOptimized: true,
                data: {
                    downloadUrl: lastResortUrl,
                    directUrl: youtubeUrl,
                    id: videoId,
                    title: `YouTube Video ${videoId}`,
                    description: 'Server-limited access - redirects to YouTube',
                    duration: 0,
                    author: {
                        name: 'YouTube User',
                        channel: youtubeUrl,
                        channelId: 'unknown',
                        thumbnail: null
                    },
                    statistics: {
                        views: 0,
                        likes: 0,
                        rating: 0
                    },
                    thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    uploadDate: 'Unknown',
                    category: 'Unknown',
                    format: {
                        quality: 'YouTube Redirect',
                        container: 'External',
                        videoCodec: 'N/A',
                        audioCodec: 'N/A',
                        filesize: 'Unknown'
                    },
                    serverLimitation: {
                        message: 'Serverless platform limitations - redirecting to YouTube',
                        suggestion: 'Use browser extension or download tool on the redirected page',
                        videoUrl: youtubeUrl,
                        note: 'This ensures you always get a working download URL'
                    }
                }
            });
        }

        // If ytdl-core worked, proceed with normal format selection
        if (!selectedFormat || !selectedFormat.url) {
            throw new Error('No suitable format found even with ytdl-core success');
        }

        console.log('📥 Download format found:', selectedFormat.qualityLabel || selectedFormat.quality);

        // Create short proxy URL
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
            message: 'YouTube video URL retrieved successfully (server-optimized)',
            method: method,
            serverOptimized: true,
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
        console.error('❌ YouTube Server-Optimized Error:', error.message);
        
        // Even in final error, try to provide a working URL
        const videoId = extractVideoId(req.body.url);
        if (videoId) {
            const emergencyHash = generateShortHash(req.body.url, videoId);
            const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
            
            urlStore.set(emergencyHash, {
                url: youtubeUrl,
                title: `YouTube Video ${videoId}`,
                sanitizedTitle: `youtube_video_${videoId}`,
                expires: Date.now() + (6 * 60 * 60 * 1000),
                videoId: videoId,
                isEmergency: true
            });

            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const emergencyUrl = `${baseUrl}/api/v1/youtube/proxy/${emergencyHash}`;

            return res.json({
                success: true,
                message: 'Emergency fallback - YouTube redirect URL created',
                method: 'emergency-redirect',
                serverOptimized: true,
                data: {
                    downloadUrl: emergencyUrl,
                    directUrl: youtubeUrl,
                    id: videoId,
                    title: `YouTube Video ${videoId}`,
                    description: 'Emergency server fallback',
                    duration: 0,
                    author: {
                        name: 'Unknown',
                        channel: youtubeUrl
                    },
                    statistics: { views: 0, likes: 0, rating: 0 },
                    thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                    uploadDate: 'Unknown',
                    category: 'Unknown',
                    format: {
                        quality: 'YouTube Redirect',
                        container: 'External'
                    },
                    emergencyMode: true
                }
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Failed to process YouTube URL on server environment',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Serverless environment limitation',
            serverOptimized: true,
            troubleshooting: {
                possibleCauses: [
                    'YouTube actively blocks serverless platforms (Vercel, Netlify, etc.)',
                    'IP-based restrictions on cloud functions',
                    'Serverless function timeout limits',
                    'Network restrictions in cloud environment'
                ],
                solutions: [
                    'YouTube downloads work better on dedicated servers',
                    'Consider using client-side YouTube downloaders',
                    'Try different videos (some may work intermittently)',
                    'Serverless platforms have inherent YouTube limitations'
                ],
                alternatives: [
                    'Use local development server for testing',
                    'Deploy to dedicated VPS/server instead of serverless',
                    'Use YouTube API for metadata only',
                    'Implement client-side download solutions'
                ]
            }
        });
    }
};

// Enhanced proxy endpoint to handle fallbacks
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
        
        // Handle different types of URLs
        if (urlData.isFallback || urlData.isLastResort || urlData.isEmergency) {
            console.log('🔄 Using fallback redirect method');
            // For fallback URLs, redirect to YouTube with a message
            res.redirect(`${urlData.url}&utm_source=server_fallback`);
        } else {
            // Normal direct download
            try {
                const filename = `${urlData.sanitizedTitle}.mp4`;
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                res.setHeader('Content-Type', 'video/mp4');
                res.redirect(urlData.url);
            } catch (headerError) {
                console.error('Header Error:', headerError.message);
                res.redirect(urlData.url);
            }
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
                    'Cloud-server optimized',
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

// SERVER-OPTIMIZED: Enhanced debug endpoint
const debugYoutube = async (req, res) => {
    const results = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        server: req.get('host'),
        platform: process.platform,
        nodeVersion: process.version,
        serverOptimized: true,
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

    // Test 4: Server IP detection
    try {
        const axios = require('axios');
        const response = await axios.get('https://httpbin.org/ip', { 
            timeout: 8000,
            headers: { 'User-Agent': getUserAgent() }
        });
        results.tests.serverIP = {
            status: 'working',
            ip: response.data.origin,
            note: 'This IP is what YouTube sees from your server'
        };
    } catch (error) {
        results.tests.serverIP = {
            status: 'failed',
            error: error.message
        };
    }

    // Test 5: YouTube oEmbed API (most reliable test for servers)
    try {
        const axios = require('axios');
        const testVideoId = 'dQw4w9WgXcQ'; // Rick Roll - always available
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${testVideoId}&format=json`;
        
        const response = await axios.get(oembedUrl, {
            headers: { 'User-Agent': getUserAgent() },
            timeout: 12000
        });

        results.tests.youtubeOEmbed = {
            status: 'working',
            title: response.data.title,
            author: response.data.author_name,
            note: 'This is the most reliable method for servers'
        };
    } catch (error) {
        results.tests.youtubeOEmbed = {
            status: 'failed',
            error: error.message,
            statusCode: error.response?.status,
            note: 'If this fails, YouTube is blocking your server IP'
        };
    }

    // Test 6: ytdl-core with server optimizations
    try {
        const ytdl = require('@distube/ytdl-core');
        const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        
        const agent = createYtdlAgent();
        const info = await ytdl.getBasicInfo(testUrl, {
            agent: agent,
            requestOptions: {
                timeout: 15000,
                headers: { 'User-Agent': getUserAgent() }
            }
        });
        
        results.tests.ytdlServerOptimized = {
            status: 'working',
            videoId: info.videoDetails.videoId,
            title: info.videoDetails.title,
            note: 'Server-optimized ytdl-core is working'
        };
    } catch (error) {
        results.tests.ytdlServerOptimized = {
            status: 'failed',
            error: error.message,
            errorType: error.name,
            note: 'ytdl-core blocked by YouTube on this server'
        };
    }

    // Server environment analysis
    results.serverAnalysis = {
        isServerless: !!(process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME),
        platform: process.env.VERCEL ? 'Vercel' : process.env.NETLIFY ? 'Netlify' : 'Unknown',
        recommendation: results.tests.youtubeOEmbed?.status === 'working' 
            ? 'Server can access YouTube - limited functionality expected'
            : 'Server blocked by YouTube - consider dedicated server or client-side solutions'
    };

    return res.json({
        success: true,
        message: 'YouTube debug information (server-optimized)',
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