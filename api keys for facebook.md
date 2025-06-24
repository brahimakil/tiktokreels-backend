# Facebook Reels Backend API - Configuration & Keys

## 🚀 Backend Configuration

### Server Details
- **Port**: 3000 (default) - configurable via PORT environment variable
- **Host**: localhost (development) / your-domain.com (production)
- **API Base URL**: `http://localhost:3000/api/v1`
- **Environment**: Node.js + Express.js
- **Rate Limiting**: 10 requests per minute per IP (for download endpoints)
- **CORS**: Enabled for all origins (configurable)

### Health Check
- **Endpoint**: `GET /health`
- **Purpose**: Check if backend is running
- **Response**: Server status, uptime, memory usage

---

## 🔑 API Keys & Authentication

### Current Status: **NO API KEYS REQUIRED** ✅
This backend uses the **myapi-2f5b.onrender.com** API service that doesn't require any API keys or authentication.

### API Configuration:
```javascript
const API_URL = "https://myapi-2f5b.onrender.com/fbvideo/search";
```

---

## 📡 Frontend Integration Guide

### Base Configuration
```javascript
const API_BASE_URL = 'http://localhost:3000/api/v1';
const FACEBOOK_API_URL = `${API_BASE_URL}/facebook`;

// CORS headers (automatically handled by backend)
const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
};
```

### 1. Download Facebook Video
```javascript
const downloadFacebookVideo = async (facebookUrl) => {
    try {
        const response = await fetch(`${FACEBOOK_API_URL}/download`, {
            method: 'POST',
            headers: defaultHeaders,
            body: JSON.stringify({ url: facebookUrl })
        });
        
        const data = await response.json();
        
        if (data.success) {
            return {
                success: true,
                message: data.message,
                // Direct access to HD and SD URLs
                hd: data.data.hd,
                sd: data.data.sd,
                downloadUrl: data.data.downloadUrl,
                downloadUrlHD: data.data.downloadUrlHD,
                downloadUrlSD: data.data.downloadUrlSD,
                // Video information
                title: data.data.title,
                safeTitle: data.data.safeTitle,
                url: data.data.url,
                qualities: data.data.qualities
            };
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Facebook download failed:', error);
        return { success: false, error: error.message };
    }
};
```

### 2. Frontend Implementation Example (React)
```jsx
import React, { useState } from 'react';

const FacebookDownloader = () => {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleDownload = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch('http://localhost:3000/api/v1/facebook/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url })
            });
            
            const data = await response.json();
            
            if (data.success) {
                setResult(data.data);
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError('Failed to process Facebook URL');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="facebook-downloader">
            <form onSubmit={handleDownload}>
                <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Paste Facebook video URL here..."
                    required
                />
                <button type="submit" disabled={loading}>
                    {loading ? 'Processing...' : 'Download'}
                </button>
            </form>
            
            {error && <div className="error">{error}</div>}
            
            {result && (
                <div className="result">
                    <h3>{result.title}</h3>
                    
                    {/* Quality Options */}
                    <div className="quality-options">
                        {result.hd && (
                            <a 
                                href={result.hd} 
                                download={`${result.safeTitle}-HD.mp4`}
                                className="download-btn hd"
                            >
                                📥 Download HD Quality
                            </a>
                        )}
                        {result.sd && (
                            <a 
                                href={result.sd} 
                                download={`${result.safeTitle}-SD.mp4`}
                                className="download-btn sd"
                            >
                                📥 Download SD Quality
                            </a>
                        )}
                    </div>
                    
                    {/* Available Qualities Info */}
                    <div className="qualities-info">
                        <p>Available Qualities:</p>
                        <ul>
                            {result.qualities?.hd && <li>✅ HD Quality</li>}
                            {result.qualities?.sd && <li>✅ SD Quality</li>}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FacebookDownloader;
```

### 3. Vanilla JavaScript Example
```javascript
document.getElementById('facebookDownloadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const url = document.getElementById('facebookUrl').value;
    const resultDiv = document.getElementById('result');
    const loadingDiv = document.getElementById('loading');
    
    // Show loading
    loadingDiv.style.display = 'block';
    resultDiv.innerHTML = '';
    
    try {
        const response = await fetch('http://localhost:3000/api/v1/facebook/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url })
        });
        
        const data = await response.json();
        
        if (data.success) {
            resultDiv.innerHTML = `
                <div class="video-info">
                    <h3>${data.data.title}</h3>
                    
                    <div class="download-section">
                        ${data.data.hd ? `
                            <a href="${data.data.hd}" download="${data.data.safeTitle}-HD.mp4" class="download-btn hd">
                                📥 Download HD Quality
                            </a>
                        ` : ''}
                        ${data.data.sd ? `
                            <a href="${data.data.sd}" download="${data.data.safeTitle}-SD.mp4" class="download-btn sd">
                                📥 Download SD Quality
                            </a>
                        ` : ''}
                    </div>
                    
                    <div class="qualities-info">
                        <p><strong>Available Qualities:</strong></p>
                        <ul>
                            ${data.data.qualities?.hd ? '<li>✅ HD Quality</li>' : ''}
                            ${data.data.qualities?.sd ? '<li>✅ SD Quality</li>' : ''}
                        </ul>
                    </div>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `<p class="error">❌ ${data.message}</p>`;
        }
    } catch (error) {
        resultDiv.innerHTML = `<p class="error">❌ Failed to download Facebook video</p>`;
    } finally {
        loadingDiv.style.display = 'none';
    }
});
```

---

## 🛠️ API Endpoints

### Main Endpoint
- `POST /api/v1/facebook/download` - Download Facebook video

### Request Format
```json
{
    "url": "https://www.facebook.com/share/r/12L5qo9veSo/"
}
```

### Response Format (Success)
```json
{
    "success": true,
    "message": "Facebook video download URL retrieved successfully",
    "data": {
        "hd": "https://video-sea1-1.xx.fbcdn.net/o1/v/t2/f2/m69/AQOzo3tt1dM93SGR1CoMARLfjitRx8V2Axnu08r5sXXFQ2qnbaF57Q5krTYR7CYwmtIvUjk1EilT_nKAu22pojl9.mp4?strext=1&_nc_cat=103&_nc_sid=5e9851&_nc_ht=video-sea1-1.xx.fbcdn.net&_nc_ohc=YeLSQEJtSHwQ7kNvwEEEymN&efg=eyJ2ZW5jb2RlX3RhZyI6Inhwdl9wcm9ncmVzc2l2ZS5GQUNFQk9PSy4uQzMuNDgwLmRhc2hfaDI2NC1iYXNpY",
        "sd": "https://video-sea1-1.xx.fbcdn.net/o1/v/t2/f2/m69/AQOzo3tt1dM93SGR1CoMARLfjitRx8V2Axnu08r5sXXFQ2qnbaF57Q5krTYR7CYwmtIvUjk1EilT_nKAu22pojl9.mp4?strext=1&_nc_cat=103&_nc_sid=5e9851&_nc_ht=video-sea1-1.xx.fbcdn.net",
        "downloadUrl": "https://video-sea1-1.xx.fbcdn.net/o1/v/t2/f2/m69/AQOzo3tt1dM93SGR1CoMARLfjitRx8V2Axnu08r5sXXFQ2qnbaF57Q5krTYR7CYwmtIvUjk1EilT_nKAu22pojl9.mp4?strext=1&_nc_cat=103&_nc_sid=5e9851&_nc_ht=video-sea1-1.xx.fbcdn.net&_nc_ohc=YeLSQEJtSHwQ7kNvwEEEymN&efg=eyJ2ZW5jb2RlX3RhZyI6Inhwdl9wcm9ncmVzc2l2ZS5GQUNFQk9PSy4uQzMuNDgwLmRhc2hfaDI2NC1iYXNpY",
        "downloadUrlHD": "https://video-sea1-1.xx.fbcdn.net/o1/v/t2/f2/m69/AQOzo3tt1dM93SGR1CoMARLfjitRx8V2Axnu08r5sXXFQ2qnbaF57Q5krTYR7CYwmtIvUjk1EilT_nKAu22pojl9.mp4?strext=1&_nc_cat=103&_nc_sid=5e9851&_nc_ht=video-sea1-1.xx.fbcdn.net&_nc_ohc=YeLSQEJtSHwQ7kNvwEEEymN&efg=eyJ2ZW5jb2RlX3RhZyI6Inhwdl9wcm9ncmVzc2l2ZS5GQUNFQk9PSy4uQzMuNDgwLmRhc2hfaDI2NC1iYXNpY",
        "downloadUrlSD": "https://video-sea1-1.xx.fbcdn.net/o1/v/t2/f2/m69/AQOzo3tt1dM93SGR1CoMARLfjitRx8V2Axnu08r5sXXFQ2qnbaF57Q5krTYR7CYwmtIvUjk1EilT_nKAu22pojl9.mp4?strext=1&_nc_cat=103&_nc_sid=5e9851&_nc_ht=video-sea1-1.xx.fbcdn.net",
        "title": "Facebook Video",
        "safeTitle": "Facebook_Video",
        "url": "https://www.facebook.com/share/r/12L5qo9veSo/",
        "qualities": {
            "hd": true,
            "sd": true
        }
    }
}
```

### Response Format (Error)
```json
{
    "success": false,
    "message": "No HD video URL available"
}
```

### Response Format (Service Unavailable)
```json
{
    "success": false,
    "message": "Facebook video service temporarily unavailable",
    "error": "The API service is currently down. Please try again later."
}
```

---

## 🚦 Error Handling

### Common Error Codes
- `400` - Bad Request (invalid URL or missing parameters)
- `404` - Video not found or no HD URL available
- `503` - Service unavailable (API service down)
- `500` - Internal Server Error (processing failed)

### Supported Facebook URL Formats
- `https://www.facebook.com/*/videos/*`
- `https://www.facebook.com/watch?v=*`
- `https://www.facebook.com/*/posts/*` 
- `https://www.facebook.com/video.php?v=*`
- `https://m.facebook.com/*/videos/*`
- `https://fb.watch/*`
- `https://www.facebook.com/reel/*`
- `https://www.facebook.com/share/r/*`
- `https://www.facebook.com/share/v/*`

---

## 🧪 Testing Examples

### Using cURL
```bash
# Test health endpoint
curl http://localhost:3000/health

# Download Facebook video
curl -X POST http://localhost:3000/api/v1/facebook/download \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.facebook.com/share/r/12L5qo9veSo/"}'
```

### Using Postman
1. **Method**: POST
2. **URL**: `http://localhost:3000/api/v1/facebook/download`
3. **Headers**: `Content-Type: application/json`
4. **Body** (raw JSON):
```json
{
    "url": "https://www.facebook.com/share/r/12L5qo9veSo/"
}
```

### Test URLs (Examples - replace with real URLs)
```bash
# Facebook Share URL (New format)
https://www.facebook.com/share/r/12L5qo9veSo/

# Facebook Watch URL
https://www.facebook.com/watch?v=1234567890

# Facebook Video URL
https://www.facebook.com/username/videos/1234567890

# Facebook Short URL
https://fb.watch/abcd123
```

---

## 📈 Key Features

### Response Keys Explanation
- **`hd`**: Direct HD quality download URL
- **`sd`**: Direct SD quality download URL (if available)
- **`downloadUrl`**: Primary download URL (usually HD)
- **`downloadUrlHD`**: Same as `hd` key
- **`downloadUrlSD`**: Same as `sd` key
- **`title`**: Video title from Facebook
- **`safeTitle`**: Sanitized title safe for filenames
- **`url`**: Original Facebook URL provided
- **`qualities`**: Object showing available quality options

### Quality Options
- **HD Quality**: High definition video (when available)
- **SD Quality**: Standard definition video (fallback option)
- **Auto Selection**: Uses HD if available, falls back to SD

---

*Last Updated: January 2025*
*API Provider: myapi-2f5b.onrender.com*
*Backend Version: 1.0.0*
*Node.js Version: 18+*

**Note**: This API uses the external service at `myapi-2f5b.onrender.com` which may occasionally be unavailable (503 errors). The service typically returns both HD and SD quality options when available.
