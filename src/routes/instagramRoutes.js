const express = require('express');
const instagramController = require('../controllers/instagramController');
const scraperMiddleware = require('../middlewares/scraperHandler');
const errorHandler = require('../middlewares/errorHandler');

const router = express.Router();

console.log('🔧 Setting up Instagram routes...');

// Apply scraper middleware to all routes
router.use(scraperMiddleware);
console.log('✅ Scraper middleware applied to Instagram routes');

// Wrap controller functions with try-catch for proper error handling
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Main endpoint - get video URL (backward compatible)
// GET /api/v1/instagram/video?url={POST_URL}
router.get('/video', asyncHandler(instagramController.getVideoUrl));

// New endpoint - get full media data
// GET /api/v1/instagram/media?url={POST_URL}
router.get('/media', asyncHandler(instagramController.getMediaData));

// New endpoint - get post info only
// GET /api/v1/instagram/info?url={POST_URL}
router.get('/info', asyncHandler(instagramController.getPostInfo));

// API info endpoint
router.get('/methods', (req, res) => {
    res.json({
        success: true,
        api: {
            name: 'Instagram Media Scraper API',
            description: 'Advanced Instagram media scraper using GraphQL API - no cookies required',
            version: '2.0.0',
            method: 'GraphQL',
            features: [
                'Video URL extraction',
                'Image URL extraction', 
                'Full media data',
                'Post information',
                'Carousel/sidecar support',
                'Owner details',
                'Engagement metrics',
                'No authentication required'
            ],
            endpoints: {
                video: {
                    path: '/api/v1/instagram/video',
                    method: 'GET',
                    description: 'Get video/image URL (backward compatible)',
                    parameters: { url: 'Instagram post/reel URL' },
                    response: { videoUrl: 'Direct media URL', success: true }
                },
                media: {
                    path: '/api/v1/instagram/media',
                    method: 'GET',
                    description: 'Get complete media data',
                    parameters: { url: 'Instagram post/reel URL' },
                    response: { data: 'Complete media object', success: true }
                },
                info: {
                    path: '/api/v1/instagram/info',
                    method: 'GET',
                    description: 'Get post information only',
                    parameters: { url: 'Instagram post/reel URL' },
                    response: { data: 'Post info object', success: true }
                }
            },
            supportedUrls: [
                'https://www.instagram.com/p/{post_id}/',
                'https://www.instagram.com/reels/{reel_id}/',
                'https://www.instagram.com/reel/{reel_id}/',
                'https://instagram.com/p/{post_id}/',
                'https://instagram.com/reels/{reel_id}/'
            ],
            examples: {
                video: {
                    request: 'GET /api/v1/instagram/video?url=https://www.instagram.com/reel/CtjoC2BNsB2',
                    response: {
                        success: true,
                        videoUrl: 'https://instagram.fpac1-2.fna.fbcdn.net/o1/v/t16/f1/m82/...'
                    }
                },
                media: {
                    request: 'GET /api/v1/instagram/media?url=https://www.instagram.com/reel/CtjoC2BNsB2',
                    response: {
                        success: true,
                        data: {
                            shortcode: 'CtjoC2BNsB2',
                            video_url: 'https://...',
                            owner: { username: 'example', full_name: 'Example User' },
                            caption: 'Post caption...',
                            // ... full data structure
                        }
                    }
                }
            }
        }
    });
});

// Apply error handler
router.use(errorHandler);

console.log('✅ Instagram routes configured with GraphQL scraper');

module.exports = router; 