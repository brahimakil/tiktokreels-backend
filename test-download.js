#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const INSTAGRAM_API_URL = `${API_BASE_URL}/api/v1/instagram`;
const DOWNLOAD_DIR = './downloads';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

const colorize = (text, color) => `${colors[color]}${text}${colors.reset}`;

// Create downloads directory if it doesn't exist
if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
    console.log(colorize(`📁 Created downloads directory: ${DOWNLOAD_DIR}`, 'cyan'));
}

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to ask for URL
const askForUrl = () => {
    return new Promise((resolve) => {
        rl.question(colorize('\n🔗 Enter Instagram URL to download: ', 'cyan'), (url) => {
            resolve(url.trim());
        });
    });
};

// Function to download file
async function downloadFile(url, filename) {
    try {
        console.log(colorize(`📥 Downloading: ${filename}`, 'yellow'));
        
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const filePath = path.join(DOWNLOAD_DIR, filename);
        const writer = fs.createWriteStream(filePath);

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                const stats = fs.statSync(filePath);
                const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
                console.log(colorize(`✅ Downloaded: ${filename} (${fileSizeInMB} MB)`, 'green'));
                console.log(colorize(`📂 Saved to: ${filePath}`, 'green'));
                resolve(filePath);
            });
            writer.on('error', reject);
        });

    } catch (error) {
        console.log(colorize(`❌ Download failed: ${error.message}`, 'red'));
        throw error;
    }
}

// Function to get file extension from URL
function getFileExtension(url, isVideo = false) {
    if (isVideo) {
        return '.mp4';
    }
    
    // Try to get extension from URL
    const urlPath = new URL(url).pathname;
    const ext = path.extname(urlPath);
    
    if (ext) {
        return ext;
    }
    
    // Default to jpg for images
    return '.jpg';
}

// Function to generate filename
function generateFilename(data, isVideo = false) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const username = data.owner?.username || 'unknown';
    const postId = data.shortcode || 'unknown';
    
    const ext = isVideo ? '.mp4' : '.jpg';
    return `${username}_${postId}_${timestamp}${ext}`;
}

// Main download function
async function downloadInstagramMedia(url) {
    try {
        console.log(colorize(`\n🔍 Getting media info for: ${url}`, 'yellow'));
        
        // Get media data first
        const response = await axios.get(`${INSTAGRAM_API_URL}/media`, {
            params: { url },
            timeout: 30000
        });

        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to get media data');
        }

        const data = response.data.data;
        
        console.log(colorize(`\n📊 Media Info:`, 'cyan'));
        console.log(`   Post ID: ${data.shortcode}`);
        console.log(`   Type: ${data.__typename}`);
        console.log(`   Is Video: ${data.is_video}`);
        console.log(`   Owner: ${data.owner?.username} (${data.owner?.full_name})`);
        console.log(`   Caption: ${data.caption ? data.caption.substring(0, 100) + '...' : 'None'}`);
        
        const downloads = [];
        
        // Download main media
        if (data.is_video && data.video_url) {
            console.log(colorize(`\n🎬 Downloading video...`, 'magenta'));
            const filename = generateFilename(data, true);
            const filePath = await downloadFile(data.video_url, filename);
            downloads.push({ type: 'video', path: filePath });
        } else if (data.display_url) {
            console.log(colorize(`\n🖼️  Downloading image...`, 'magenta'));
            const filename = generateFilename(data, false);
            const filePath = await downloadFile(data.display_url, filename);
            downloads.push({ type: 'image', path: filePath });
        }
        
        // Download carousel items if present
        if (data.sidecar && data.sidecar.length > 0) {
            console.log(colorize(`\n📸 Found ${data.sidecar.length} carousel items`, 'cyan'));
            
            for (let i = 0; i < data.sidecar.length; i++) {
                const item = data.sidecar[i];
                const itemNum = i + 1;
                
                if (item.is_video && item.video_url) {
                    console.log(colorize(`\n🎬 Downloading carousel video ${itemNum}/${data.sidecar.length}...`, 'magenta'));
                    const filename = `${data.owner?.username || 'unknown'}_${data.shortcode}_carousel_${itemNum}.mp4`;
                    const filePath = await downloadFile(item.video_url, filename);
                    downloads.push({ type: 'carousel-video', path: filePath, index: itemNum });
                } else if (item.display_url) {
                    console.log(colorize(`\n🖼️  Downloading carousel image ${itemNum}/${data.sidecar.length}...`, 'magenta'));
                    const filename = `${data.owner?.username || 'unknown'}_${data.shortcode}_carousel_${itemNum}.jpg`;
                    const filePath = await downloadFile(item.display_url, filename);
                    downloads.push({ type: 'carousel-image', path: filePath, index: itemNum });
                }
            }
        }
        
        // Summary
        console.log(colorize(`\n✅ Download completed!`, 'green'));
        console.log(colorize(`📁 Downloaded ${downloads.length} file(s):`, 'green'));
        downloads.forEach((download, index) => {
            console.log(`   ${index + 1}. ${download.type}: ${path.basename(download.path)}`);
        });
        
        console.log(colorize(`\n📂 All files saved to: ${path.resolve(DOWNLOAD_DIR)}`, 'cyan'));
        
        return downloads;
        
    } catch (error) {
        console.log(colorize(`❌ Error: ${error.message}`, 'red'));
        if (error.response) {
            console.log(colorize(`   Status: ${error.response.status}`, 'red'));
            console.log(colorize(`   Error: ${error.response.data?.error || 'Unknown error'}`, 'red'));
        }
        throw error;
    }
}

// Main interactive function
async function main() {
    console.log(colorize('📥 Instagram Media Downloader', 'magenta'));
    console.log(colorize('=' .repeat(50), 'magenta'));
    
    try {
        while (true) {
            const url = await askForUrl();
            
            if (!url) {
                console.log(colorize('👋 Goodbye!', 'yellow'));
                break;
            }
            
            if (!url.includes('instagram.com')) {
                console.log(colorize('❌ Please enter a valid Instagram URL', 'red'));
                continue;
            }
            
            try {
                await downloadInstagramMedia(url);
                
                // Ask if user wants to download another
                const another = await new Promise((resolve) => {
                    rl.question(colorize('\n🔄 Download another? (y/n): ', 'cyan'), (answer) => {
                        resolve(answer.toLowerCase().trim());
                    });
                });
                
                if (another !== 'y' && another !== 'yes') {
                    console.log(colorize('👋 Goodbye!', 'yellow'));
                    break;
                }
                
            } catch (error) {
                console.log(colorize('💡 Try with a different URL', 'yellow'));
            }
        }
    } finally {
        rl.close();
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { downloadInstagramMedia }; 