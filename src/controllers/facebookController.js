const axios = require('axios');
const cheerio = require('cheerio');

// API Configuration
const API_URL = "https://myapi-2f5b.onrender.com/fbvideo/search";

// Multiple Facebook downloader libraries for redundancy
let fbDownloaderScrapper, fbDownloader;

try {
    fbDownloaderScrapper = require('fb-downloader-scrapper');
    console.log('✅ fb-downloader-scrapper loaded');
} catch (e) {
    console.log('❌ fb-downloader-scrapper not available:', e.message);
}

try {
    fbDownloader = require('fb-downloader');
    console.log('✅ fb-downloader loaded');
} catch (e) {
    console.log('❌ fb-downloader not available:', e.message);
}

// Utility function to validate Facebook URLs
function isValidFacebookUrl(url) {
    const facebookPatterns = [
        /^https?:\/\/(www\.)?facebook\.com\/.*\/videos?\/.*$/,
        /^https?:\/\/(www\.)?facebook\.com\/watch\?v=.*$/,
        /^https?:\/\/(www\.)?facebook\.com\/.*\/posts\/.*$/,
        /^https?:\/\/(www\.)?facebook\.com\/video\.php\?v=.*$/,
        /^https?:\/\/(www\.)?facebook\.com\/.*\/videos\/.*$/,
        /^https?:\/\/(m\.)?facebook\.com\/.*\/videos?\/.*$/,
        /^https?:\/\/fb\.watch\/.*$/,
        /^https?:\/\/(www\.)?facebook\.com\/reel\/.*$/,
        /^https?:\/\/(www\.)?facebook\.com\/share\/r\/.*$/, 
        /^https?:\/\/(www\.)?facebook\.com\/share\/v\/.*$/, 
    ];
    
    return facebookPatterns.some(pattern => pattern.test(url));
}

// Utility function to sanitize title for filename
function sanitizeTitle(title) {
    return title.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim() || 'Facebook_Video';
}

// Main download function
const downloadVideo = async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'Facebook URL is required'
            });
        }

        if (!isValidFacebookUrl(url)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Facebook URL format'
            });
        }

        console.log(`🔄 Fetching video data from API for URL: ${url}`);

        // Call the API
        const response = await axios.get(`${API_URL}?url=${url}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            },
            timeout: 15000
        });

        const videoData = response.data;

        if (!videoData || (!videoData.hd && !videoData.sd)) {
            return res.status(404).json({
                success: false,
                message: 'No video URL available',
                error: 'HD or SD video URL not found in API response'
            });
        }

        // Prepare response data
        const title = videoData.title || 'Facebook Video';
        const safeTitle = sanitizeTitle(title);

        return res.json({
            success: true,
            message: 'Facebook video download URL retrieved successfully',
            data: {
                // Download URLs
                downloadUrl: videoData.hd || videoData.sd,
                downloadUrlHD: videoData.hd,
                downloadUrlSD: videoData.sd,
                
                // Video info
                title: title,
                safeTitle: safeTitle,
                url: url,
                
                // Quality info
                qualities: {
                    hd: videoData.hd ? true : false,
                    sd: videoData.sd ? true : false
                },
                
                // Additional metadata if available
                duration: videoData.duration,
                thumbnail: videoData.thumbnail,
                views: videoData.views,
                likes: videoData.likes,
                author: videoData.author,
                
                // Platform info
                type: 'video',
                platform: 'facebook',
                apiProvider: 'Facebook Video API',
                createTime: Date.now()
            }
        });

    } catch (error) {
        console.error('❌ Facebook API Error:', error.message);
        
        if (error.response) {
            const status = error.response.status;
            if (status === 503) {
                return res.status(503).json({
                    success: false,
                    message: 'Facebook video service temporarily unavailable',
                    error: 'The API service is currently down. Please try again later.'
                });
            } else if (status === 404) {
                return res.status(404).json({
                    success: false,
                    message: 'Video not found',
                    error: 'The video may be private, deleted, or the URL is invalid.'
                });
            }
        }
        
        return res.status(500).json({
            success: false,
            message: 'Failed to process Facebook URL',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Method 2: Using fb-downloader (Alternative method)
const downloadVideoV2 = async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'Facebook URL is required'
            });
        }

        if (!isValidFacebookUrl(url)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Facebook URL format'
            });
        }

        console.log('🔄 Processing Facebook URL (Method V2):', url);

        if (!fbDownloader) {
            throw new Error('fb-downloader library not available - run: npm install fb-downloader');
        }

        // Try to resolve the URL first
        const resolvedUrl = await resolveFacebookUrl(url);
        
        const result = await fbDownloader(resolvedUrl, false); // false for high quality

        if (result && typeof result === 'string') {
            return res.json({
                success: true,
                message: 'Facebook video download URL retrieved successfully',
                method: 'fb-downloader',
                data: {
                    // Main download URL
                    downloadUrl: result,
                    downloadUrlHD: result,
                    
                    // Video info
                    id: extractVideoId(resolvedUrl),
                    title: 'Facebook Video',
                    url: resolvedUrl,
                    originalUrl: url,
                    resolvedUrl: resolvedUrl,
                    
                    // Quality info
                    qualities: {
                        hd: true,
                        sd: false
                    },
                    
                    // Additional info
                    type: 'video',
                    platform: 'facebook',
                    createTime: Date.now()
                }
            });
        } else {
            throw new Error('No video URL found in response');
        }

    } catch (error) {
        console.error('Facebook V2 Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to process Facebook URL with method V2',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Auto method - tries all methods until one works
const downloadVideoAuto = async (req, res) => {
    const methods = [
        { name: 'V1 (fb-downloader-scrapper)', func: downloadVideoV1 },
        { name: 'V2 (fb-downloader)', func: downloadVideoV2 }
    ];

    for (const method of methods) {
        try {
            console.log(`🔄 Trying method: ${method.name}`);
            
            // Create a mock response object to capture the result
            let capturedResult = null;
            let capturedStatus = 200;
            
            const mockRes = {
                json: (data) => { capturedResult = data; },
                status: (code) => { 
                    capturedStatus = code; 
                    return { json: (data) => { capturedResult = data; } };
                }
            };

            await method.func(req, mockRes);
            
            if (capturedResult && capturedResult.success) {
                capturedResult.method = `Auto (${method.name})`;
                return res.status(capturedStatus).json(capturedResult);
            }
        } catch (error) {
            console.log(`❌ Method ${method.name} failed:`, error.message);
            continue;
        }
    }

    // If all methods fail
    return res.status(500).json({
        success: false,
        message: 'All Facebook download methods failed',
        error: 'Unable to process this Facebook URL with any available method. Please check if the video is public and the URL is correct.',
        troubleshooting: {
            possibleCauses: [
                'Video is private or restricted',
                'Invalid Facebook URL format',
                'Facebook has changed their API',
                'Required npm packages not installed',
                'URL needs to be resolved (share links)'
            ],
            solutions: [
                'Make sure the video is public',
                'Try a different Facebook video URL',
                'Run: npm install fb-downloader-scrapper fb-downloader',
                'Check if the URL opens in your browser'
            ]
        }
    });
};

// Get video info only
const getVideoInfo = async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'Facebook URL is required'
            });
        }

        if (!isValidFacebookUrl(url)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Facebook URL format'
            });
        }

        console.log('🔍 Getting Facebook video info:', url);

        const response = await axios.get(`${API_URL}?url=${url}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000
        });

        const videoData = response.data;
        const title = videoData.title || 'Facebook Video';

        return res.json({
            success: true,
            message: 'Facebook video info retrieved',
            data: {
                title: title,
                safeTitle: sanitizeTitle(title),
                url: url,
                thumbnail: videoData.thumbnail,
                duration: videoData.duration,
                views: videoData.views,
                likes: videoData.likes,
                author: videoData.author,
                hasHD: videoData.hd ? true : false,
                hasSD: videoData.sd ? true : false,
                type: 'video',
                platform: 'facebook'
            }
        });

    } catch (error) {
        console.error('⚠️ Facebook get video info error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to get Facebook video info',
            error: error.message
        });
    }
};

// Get API stats
const getStats = async (req, res) => {
    try {
        return res.json({
            success: true,
            stats: {
                apiUrl: API_URL,
                uptime: Math.floor(process.uptime()),
                memory: process.memoryUsage(),
                supportedFormats: ['HD', 'SD', 'MP4'],
                features: [
                    'Direct download URLs',
                    'HD & SD quality support',
                    'Video metadata',
                    'Title sanitization',
                    'Error handling'
                ],
                supportedUrls: [
                    'facebook.com/*/videos/*',
                    'facebook.com/watch?v=*',
                    'facebook.com/*/posts/*',
                    'fb.watch/*',
                    'facebook.com/reel/*',
                    'facebook.com/share/r/*',
                    'facebook.com/share/v/*'
                ]
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to get Facebook API stats',
            error: error.message
        });
    }
};

// Utility function to extract video ID from Facebook URL
function extractVideoId(url) {
    try {
        // Try different patterns to extract video ID
        const patterns = [
            /\/videos\/(\d+)/,
            /[?&]v=(\d+)/,
            /\/posts\/(\d+)/,
            /fb\.watch\/([^/?]+)/,
            /\/reel\/(\d+)/,
            /\/share\/r\/([^/?]+)/,
            /\/share\/v\/([^/?]+)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }
        
        // Fallback: generate ID from URL hash
        return Math.abs(url.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0)).toString();
    } catch (error) {
        return 'unknown';
    }
}

// Export all functions
module.exports = {
    downloadVideo,
    downloadVideoAuto: downloadVideo, // Alias for backward compatibility
    getVideoInfo,
    getStats
}; 