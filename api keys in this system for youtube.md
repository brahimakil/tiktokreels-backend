# YouTube Video Downloader Backend API - Configuration & Keys

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
- **Response**: Server status, uptime, memory usage, services status

---

## 🔑 API Keys & Authentication

### Current Status: **NO API KEYS REQUIRED** ✅
This backend uses **completely free** methods for YouTube video downloading:

1. **@distube/ytdl-core**: Free, open-source YouTube downloader (DisTube fork)
2. **URL Compression**: 95% shorter URLs via proxy system
3. **No rate limits**: Only basic protection against spam

### Why No API Keys?
- ✅ **100% Free**: No costs, no registration required
- ✅ **No Limits**: Download as many videos as needed
- ✅ **Privacy**: No tracking, no data collection
- ✅ **Reliable**: Built-in fallback and proxy system
- ✅ **Short URLs**: 95% compression for better frontend experience

---

## 📋 API Endpoints

### **Base URL**: `http://localhost:3000/api/v1/youtube`

### 1. **Download Video** 📥
- **Endpoint**: `POST /api/v1/youtube/download`
- **Method**: POST
- **Description**: Gets YouTube video download URL with compression proxy
- **Body**:
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

**Response**:
```json
{
  "success": true,
  "message": "YouTube video URL retrieved successfully",
  "method": "ytdl-core (distube)",
  "data": {
    "downloadUrl": "http://localhost:3000/api/v1/youtube/proxy/dQw4w9WgXcQ_a1b2c3d4",
    "originalUrlLength": 1247,
    "shortUrlLength": 67,
    "compressionRatio": "95% shorter",
    "directUrl": "https://rr3---sn-ab5l6ne7.googlevideo.com/videoplayback?expire=1750560667&ei=...",
    "id": "dQw4w9WgXcQ",
    "title": "Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)",
    "description": "The official video for \"Never Gonna Give You Up\" by Rick Astley...",
    "duration": 214,
    "author": {
      "name": "Rick Astley",
      "channel": "https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw",
      "channelId": "UCuAXFkgsw1L7xaCfnd5JJOw",
      "thumbnail": "https://yt3.ggpht.com/a/AATXAJwFt03RAznOsPjPp8S_aTOcJ-M="
    },
    "statistics": {
      "views": 1667012053,
      "likes": 15234567,
      "rating": 4.8
    },
    "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    "uploadDate": "2009-10-25",
    "category": "Music",
    "format": {
      "quality": "360p",
      "container": "mp4",
      "videoCodec": "avc1.42001E",
      "audioCodec": "mp4a.40.2",
      "filesize": "52428800"
    }
  }
}
```

### 2. **Get Video Info** ℹ️
- **Endpoint**: `POST /api/v1/youtube/info`
- **Method**: POST
- **Description**: Get video information without download URL (lightweight)
- **Body**:
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Video info retrieved successfully",
  "data": {
    "id": "dQw4w9WgXcQ",
    "title": "Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)",
    "description": "The official video for \"Never Gonna Give You Up\" by Rick Astley. \"Never Gonna Give You Up\" was a global smash on its release in July 1987...",
    "duration": 214,
    "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    "author": {
      "name": "Rick Astley",
      "channel": "https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw"
    },
    "statistics": {
      "views": 1667012053,
      "likes": 15234567
    },
    "uploadDate": "2009-10-25",
    "category": "Music"
  }
}
```

### 3. **Proxy Download** 🔗
- **Endpoint**: `GET /api/v1/youtube/proxy/:hash`
- **Method**: GET
- **Description**: Redirects short proxy URL to actual YouTube download URL
- **Usage**: Automatically used when clicking downloadUrl from download endpoint
- **Response**: HTTP 302 Redirect to actual video file

**Error Responses**:
```json
{
  "success": false,
  "message": "Download link not found or expired"
}
```

```json
{
  "success": false,
  "message": "Download link has expired"
}
```

---

## 🌐 Frontend Integration

### React/JavaScript Example:
```javascript
// Download YouTube video
const downloadYouTubeVideo = async (url) => {
  try {
    const response = await fetch('http://localhost:3000/api/v1/youtube/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Use data.data.downloadUrl to download the video
      console.log('Download URL:', data.data.downloadUrl);
      console.log('Video Title:', data.data.title);
      console.log('Author:', data.data.author.name);
      
      // Open download URL in new tab
      window.open(data.data.downloadUrl, '_blank');
    } else {
      console.error('Error:', data.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};

// Get video info only
const getVideoInfo = async (url) => {
  try {
    const response = await fetch('http://localhost:3000/api/v1/youtube/info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Video Info:', data.data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### cURL Examples:
```bash
# Download video
curl -X POST http://localhost:3000/api/v1/youtube/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'

# Get video info
curl -X POST http://localhost:3000/api/v1/youtube/info \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'

# Get available methods
curl -X GET http://localhost:3000/api/v1/youtube/methods
```

---

## 🔧 Configuration Options

### Environment Variables:
```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# YouTube Specific (Optional)
YTDL_NO_UPDATE=1  # Disable ytdl-core update checks
```

### Supported URL Formats:
