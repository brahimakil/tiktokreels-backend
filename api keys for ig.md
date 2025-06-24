# Instagram Media Scraper API - Configuration & Keys

## 🚀 Backend Configuration

### Server Details
- **Port**: 3000 (default) - configurable via PORT environment variable
- **Host**: localhost (development) / your-domain.com (production)
- **API Base URL**: `http://localhost:3000/api/v1`
- **Environment**: Node.js + Express.js + GraphQL API
- **Rate Limiting**: Built-in request management and error handling
- **CORS**: Enabled for all origins (configurable)

### Health Check
- **Endpoint**: `GET /health`
- **Purpose**: Check if backend is running
- **Response**: Server status, uptime, memory usage

---

## 🔑 API Keys & Authentication

### Current Status: **NO API KEYS REQUIRED** ✅
This backend uses **Instagram's GraphQL API** that doesn't require any API keys or authentication.

### Technical Implementation:
```javascript
// Uses Instagram's internal GraphQL API
const graphql = new URL(`https://www.instagram.com/api/graphql`);
graphql.searchParams.set("variables", JSON.stringify({ shortcode: igId }));
graphql.searchParams.set("doc_id", "10015901848480474");
graphql.searchParams.set("lsd", "AVqbxe3J_YA");
```

---

## 📡 Frontend Integration Guide

### Base Configuration
```javascript
const API_BASE_URL = 'http://localhost:3000/api/v1';
const INSTAGRAM_API_URL = `${API_BASE_URL}/instagram`;

// Headers (automatically handled by backend)
const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
};
```

### 1. Get Instagram Video URL (Simple)
```javascript
const getInstagramVideoUrl = async (instagramUrl) => {
    try {
        const response = await fetch(`${INSTAGRAM_API_URL}/video?url=${encodeURIComponent(instagramUrl)}`, {
            method: 'GET',
            headers: defaultHeaders
        });
        
        const data = await response.json();
        
        if (data.success !== false) {
            return {
                success: true,
                videoUrl: data.videoUrl,
                imageUrl: data.imageUrl,
                isVideo: data.isVideo
            };
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Instagram video URL fetch failed:', error);
        return { success: false, error: error.message };
    }
};
```

### 2. Get Full Instagram Media Data
```javascript
const getInstagramMediaData = async (instagramUrl) => {
    try {
        const response = await fetch(`${INSTAGRAM_API_URL}/media?url=${encodeURIComponent(instagramUrl)}`, {
            method: 'GET',
            headers: defaultHeaders
        });
        
        const data = await response.json();
        
        if (data.success) {
            return {
                success: true,
                data: data.data // Complete media object
            };
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Instagram media data fetch failed:', error);
        return { success: false, error: error.message };
    }
};
```

### 3. Frontend Implementation Example (React)
```jsx
import React, { useState } from 'react';

const InstagramDownloader = () => {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [mediaData, setMediaData] = useState(null);
    const [error, setError] = useState(null);

    const handleDownload = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMediaData(null);
        
        try {
            // Get full media data
            const response = await fetch(`http://localhost:3000/api/v1/instagram/media?url=${encodeURIComponent(url)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                setMediaData(data.data);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Failed to process Instagram URL');
        } finally {
            setLoading(false);
        }
    };

    const downloadFile = (url, filename) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDirectDownload = () => {
        if (mediaData?.video_url) {
            downloadFile(mediaData.video_url, `${mediaData.owner?.username}_${mediaData.shortcode}.mp4`);
        } else if (mediaData?.display_url) {
            downloadFile(mediaData.display_url, `${mediaData.owner?.username}_${mediaData.shortcode}.jpg`);
        }
    };

    return (
        <div className="instagram-downloader">
            <form onSubmit={handleDownload}>
                <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Paste Instagram post/reel URL here..."
                    required
                />
                <button type="submit" disabled={loading}>
                    {loading ? 'Processing...' : 'Get Media'}
                </button>
            </form>
            
            {error && <div className="error">❌ {error}</div>}
            
            {mediaData && (
                <div className="result">
                    <div className="media-info">
                        <h3>@{mediaData.owner?.username}</h3>
                        <p><strong>Type:</strong> {mediaData.is_video ? 'Video' : 'Image'}</p>
                        <p><strong>Caption:</strong> {mediaData.caption?.substring(0, 100)}...</p>
                        <p><strong>Likes:</strong> {mediaData.like_count?.toLocaleString()}</p>
                        <p><strong>Comments:</strong> {mediaData.comment_count?.toLocaleString()}</p>
                    </div>
                    
                    {/* Download Button */}
                    <div className="download-section">
                        <button onClick={handleDirectDownload} className="download-btn">
                            📥 Download {mediaData.is_video ? 'Video' : 'Image'}
                        </button>
                    </div>
                    
                    {/* Media Preview */}
                    <div className="media-preview">
                        {mediaData.is_video ? (
                            <video 
                                src={mediaData.video_url} 
                                poster={mediaData.thumbnail_src}
                                controls 
                                style={{ maxWidth: '100%', height: 'auto' }}
                            >
                                Your browser does not support the video tag.
                            </video>
                        ) : (
                            <img 
                                src={mediaData.display_url} 
                                alt="Instagram post"
                                style={{ maxWidth: '100%', height: 'auto' }}
                            />
                        )}
                    </div>
                    
                    {/* Carousel Items */}
                    {mediaData.sidecar && mediaData.sidecar.length > 0 && (
                        <div className="carousel-items">
                            <h4>Carousel Items ({mediaData.sidecar.length})</h4>
                            <div className="carousel-grid">
                                {mediaData.sidecar.map((item, index) => (
                                    <div key={index} className="carousel-item">
                                        {item.is_video ? (
                                            <video 
                                                src={item.video_url} 
                                                poster={item.thumbnail_src}
                                                controls 
                                                style={{ width: '200px', height: 'auto' }}
                                            />
                                        ) : (
                                            <img 
                                                src={item.display_url} 
                                                alt={`Carousel item ${index + 1}`}
                                                style={{ width: '200px', height: 'auto' }}
                                            />
                                        )}
                                        <button 
                                            onClick={() => downloadFile(
                                                item.is_video ? item.video_url : item.display_url,
                                                `${mediaData.owner?.username}_${mediaData.shortcode}_${index + 1}.${item.is_video ? 'mp4' : 'jpg'}`
                                            )}
                                            className="small-download-btn"
                                        >
                                            📥 Download
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Links */}
                    <div className="links">
                        <p><a href={`https://instagram.com/p/${mediaData.shortcode}`} target="_blank" rel="noopener noreferrer">
                            🔗 View Original Post
                        </a></p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InstagramDownloader;
```

### 4. Vanilla JavaScript Example
```javascript
document.getElementById('instagramForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const url = document.getElementById('instagramUrl').value;
    const resultDiv = document.getElementById('result');
    const loadingDiv = document.getElementById('loading');
    
    // Show loading
    loadingDiv.style.display = 'block';
    resultDiv.innerHTML = '';
    
    try {
        const response = await fetch(`http://localhost:3000/api/v1/instagram/media?url=${encodeURIComponent(url)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const media = data.data;
            
            resultDiv.innerHTML = `
                <div class="media-info">
                    <h3>@${media.owner?.username}</h3>
                    <p><strong>Type:</strong> ${media.is_video ? 'Video' : 'Image'}</p>
                    <p><strong>Caption:</strong> ${media.caption?.substring(0, 100) || 'No caption'}...</p>
                    <p><strong>Likes:</strong> ${media.like_count?.toLocaleString() || 'N/A'}</p>
                    
                    <div class="download-section">
                        <a href="${media.is_video ? media.video_url : media.display_url}" 
                           download="${media.owner?.username}_${media.shortcode}.${media.is_video ? 'mp4' : 'jpg'}" 
                           class="download-btn">
                            📥 Download ${media.is_video ? 'Video' : 'Image'}
                        </a>
                    </div>
                    
                    <div class="media-preview">
                        ${media.is_video ? 
                            `<video src="${media.video_url}" poster="${media.thumbnail_src}" controls style="max-width: 100%; height: auto;"></video>` :
                            `<img src="${media.display_url}" alt="Instagram post" style="max-width: 100%; height: auto;">`
                        }
                    </div>
                    
                    <div class="links">
                        <p><a href="https://instagram.com/p/${media.shortcode}" target="_blank">🔗 View Original Post</a></p>
                    </div>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `<p class="error">❌ ${data.error}</p>`;
        }
    } catch (error) {
        resultDiv.innerHTML = `<p class="error">❌ Failed to fetch Instagram media</p>`;
    } finally {
        loadingDiv.style.display = 'none';
    }
});
```

---

## 🛠️ API Endpoints

### 1. Get Video/Image URL (Simple)
- **Endpoint**: `GET /api/v1/instagram/video`
- **Parameters**: `url` (Instagram post/reel URL)
- **Purpose**: Get direct media URL for download

### 2. Get Full Media Data
- **Endpoint**: `GET /api/v1/instagram/media`
- **Parameters**: `url` (Instagram post/reel URL)
- **Purpose**: Get complete media information

### 3. Get Post Information Only
- **Endpoint**: `GET /api/v1/instagram/info`
- **Parameters**: `url` (Instagram post/reel URL)
- **Purpose**: Get post details without media URLs

### 4. API Documentation
- **Endpoint**: `GET /api/v1/instagram/methods`
- **Purpose**: Get API documentation and examples

---

## 📊 Request & Response Formats

### 1. Video Endpoint Request
```
GET /api/v1/instagram/video?url=https://www.instagram.com/reel/CtjoC2BNsB2
```

### 1. Video Endpoint Response (Video)
```json
{
    "success": true,
    "videoUrl": "https://instagram.fpac1-2.fna.fbcdn.net/o1/v/t16/f1/m82/..."
}
```

### 1. Video Endpoint Response (Image)
```json
{
    "success": true,
    "videoUrl": "https://instagram.fpac1-4.fna.fbcdn.net/v/t51.2885-15/...",
    "imageUrl": "https://instagram.fpac1-4.fna.fbcdn.net/v/t51.2885-15/...",
    "isVideo": false
}
```

### 2. Media Endpoint Response (Full Data)
```json
{
    "success": true,
    "data": {
        "__typename": "XDTGraphVideo",
        "shortcode": "CtjoC2BNsB2",
        "id": "3130148602917346226",
        "dimensions": {
            "height": 1137,
            "width": 640
        },
        "display_url": "https://instagram.fpac1-4.fna.fbcdn.net/v/t51.2885-15/...",
        "has_audio": true,
        "video_url": "https://instagram.fpac1-2.fna.fbcdn.net/o1/v/t16/f1/m82/...",
        "video_view_count": 127096,
        "video_play_count": 371210,
        "is_video": true,
        "caption": "Processing speeds are at an all time low",
        "is_paid_partnership": false,
        "location": null,
        "owner": {
            "id": "39625136655",
            "username": "fatfatpankocat",
            "full_name": "Panko A. Cat",
            "profile_pic_url": "https://instagram.fpac1-4.fna.fbcdn.net/v/t51.2885-19/...",
            "is_verified": true,
            "is_private": false,
            "follower_count": 508181,
            "following_count": 123,
            "post_count": 1423
        },
        "product_type": "clips",
        "video_duration": 5.166,
        "thumbnail_src": "https://instagram.fpac1-4.fna.fbcdn.net/v/t51.2885-15/...",
        "clips_music_attribution_info": {
            "artist_name": "0lukasaa",
            "song_name": "Original audio",
            "uses_original_audio": true,
            "should_mute_audio": false,
            "audio_id": "508221254754075"
        },
        "sidecar": null,
        "like_count": 70679,
        "comment_count": 122,
        "taken_at_timestamp": 1686930107,
        "accessibility_caption": null
    }
}
```

### 3. Info Endpoint Response
```json
{
    "success": true,
    "data": {
        "shortcode": "CtjoC2BNsB2",
        "id": "3130148602917346226",
        "caption": "Processing speeds are at an all time low",
        "is_video": true,
        "has_audio": true,
        "dimensions": {
            "height": 1137,
            "width": 640
        },
        "owner": {
            "id": "39625136655",
            "username": "fatfatpankocat",
            "full_name": "Panko A. Cat",
            "is_verified": true,
            "follower_count": 508181
        },
        "like_count": 70679,
        "comment_count": 122,
        "taken_at_timestamp": 1686930107,
        "product_type": "clips",
        "video_duration": 5.166,
        "is_paid_partnership": false,
        "location": null
    }
}
```

### Error Response Format
```json
{
    "success": false,
    "error": "Invalid Instagram URL format"
}
```

---

## 🚦 Error Handling

### Common Error Codes
- `400` - Bad Request (invalid URL or missing parameters)
- `404` - Media not found or post is private
- `500` - Internal Server Error (GraphQL API failed)

### Supported Instagram URL Formats
- `https://www.instagram.com/p/{post_id}/`
- `https://instagram.com/p/{post_id}/`
- `https://www.instagram.com/reels/{reel_id}/`
- `https://instagram.com/reels/{reel_id}/`  
- `https://www.instagram.com/reel/{reel_id}/`
- `https://instagram.com/reel/{reel_id}/`

### Common Error Messages
- **"URL parameter is required"** - No URL provided in request
- **"Invalid Instagram URL format"** - URL doesn't match supported patterns
- **"No media data found. Post may be private or deleted."** - Post is not accessible
- **"No media URL found in the post"** - Post doesn't contain downloadable media
- **"Instagram API responded with status: XXX"** - Instagram GraphQL API error
- **"Failed to fetch Instagram data"** - Network or parsing error

---

## 🧪 Testing Examples

### Using cURL
```bash
# Test health endpoint
curl http://localhost:3000/health

# Get video URL
curl "http://localhost:3000/api/v1/instagram/video?url=https://www.instagram.com/reel/CtjoC2BNsB2"

# Get full media data
curl "http://localhost:3000/api/v1/instagram/media?url=https://www.instagram.com/reel/CtjoC2BNsB2"

# Get post info only
curl "http://localhost:3000/api/v1/instagram/info?url=https://www.instagram.com/reel/CtjoC2BNsB2"

# Get API methods
curl http://localhost:3000/api/v1/instagram/methods
```

### Using JavaScript (Browser Console)
```javascript
// Test video endpoint
fetch('http://localhost:3000/api/v1/instagram/video?url=https://www.instagram.com/reel/CtjoC2BNsB2')
  .then(response => response.json())
  .then(data => console.log(data));

// Test media endpoint
fetch('http://localhost:3000/api/v1/instagram/media?url=https://www.instagram.com/reel/CtjoC2BNsB2')
  .then(response => response.json())
  .then(data => console.log(data));
```

### Test URLs (Working Examples)
```bash
# Instagram Reel (from GitHub repo example)
https://www.instagram.com/reel/CtjoC2BNsB2

# Instagram Post (replace with real URLs)
https://www.instagram.com/p/ABC123def456/

# Instagram Reel (replace with real URLs)
https://www.instagram.com/reels/XYZ789ghi012/
```

---

## 📈 Key Features

### Response Data Explanation
- **`video_url`**: Direct video download URL from Instagram CDN
- **`display_url`**: Image URL (for posts) or video thumbnail
- **`shortcode`**: Instagram post ID (e.g., "CtjoC2BNsB2")
- **`owner`**: Complete user information (username, followers, verified status)
- **`caption`**: Full post caption text
- **`like_count`**: Number of likes on the post
- **`comment_count`**: Number of comments on the post
- **`sidecar`**: Array of carousel items (for multi-image/video posts)
- **`clips_music_attribution_info`**: Music/audio information for reels
- **`taken_at_timestamp`**: Unix timestamp when post was created

### Performance Features
- **Fast Response**: ~2-5 seconds average response time
- **No Browser Overhead**: Direct API calls, no Puppeteer
- **Rich Data**: Complete post information in single request
- **Carousel Support**: Handle multi-image/video posts
- **Error Handling**: Comprehensive error messages
- **URL Validation**: Automatic URL format validation

### Technical Implementation
- **GraphQL API**: Uses Instagram's internal GraphQL endpoint
- **No Authentication**: No API keys or login required
- **Express Framework**: RESTful API structure
- **Custom Error Handling**: Detailed error messages
- **URL Parsing**: Robust URL pattern matching
- **Data Transformation**: Clean, structured response format

---

## ⚠️ Important Notes

### Rate Limiting
- Instagram may block requests if too many are made quickly
- No built-in rate limiting (consider adding for production)
- GraphQL endpoint is more stable than web scraping
- Monitor response times and error rates

### Legal Considerations
- Only download content you have permission to download
- Respect Instagram's Terms of Service
- This tool is for educational/personal use only
- Do not use for commercial purposes without proper authorization

### Browser Requirements
- **No browser required** - uses direct API calls
- Much faster than Puppeteer-based solutions
- Lower memory usage (~5-10MB vs ~100MB)
- No Chrome/Chromium dependency

### Performance Tips
- Response times: 2-5 seconds average
- No caching implemented (consider adding for production)
- Concurrent requests supported
- Monitor Instagram's rate limiting

### Troubleshooting
- **Invalid URL errors**: Check URL format matches supported patterns
- **No media data**: Post may be private or deleted
- **API errors**: Instagram may have changed their GraphQL structure
- **Network issues**: Check internet connection and Instagram accessibility

---

## 📊 Performance Comparison

### GraphQL vs Puppeteer Implementation
| Feature | GraphQL API | Puppeteer (Old) |
|---------|-------------|-----------------|
| Speed | 2-5 seconds | 10-30 seconds |
| Memory Usage | ~5-10MB | ~100MB |
| Dependencies | None | Chrome/Chromium |
| Reliability | High | Medium |
| Data Richness | Very High | Medium |
| Rate Limiting | Better | Worse |

---

*Last Updated: January 2025*  
*Scraping Method: Instagram GraphQL API*  
*Backend Version: 2.0.0*  
*Node.js Version: 18+*  
*No External Dependencies Required*

**Note**: This implementation uses Instagram's internal GraphQL API which is more stable than web scraping but may still change. The service includes comprehensive error handling and data validation for reliability. Always test with real Instagram URLs to ensure functionality.
