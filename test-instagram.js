#!/usr/bin/env node

const readline = require('readline');
const axios = require('axios');
    
// Configuration
const API_BASE_URL = 'http://localhost:3000';
const INSTAGRAM_API_URL = `${API_BASE_URL}/api/v1/instagram`;

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

// Helper function to colorize console output
const colorize = (text, color) => `${colors[color]}${text}${colors.reset}`;

// Helper function to wrap long URLs
const wrapUrl = (url, maxLength = 80) => {
    if (url.length <= maxLength) return url;
    
    const chunks = [];
    for (let i = 0; i < url.length; i += maxLength) {
        chunks.push(url.slice(i, i + maxLength));
    }
    return chunks.join('\n     '); // 5 spaces for indentation
};

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Test server health
async function testHealth() {
    try {
        console.log(colorize('\n🔍 Testing server health...', 'cyan'));
        const response = await axios.get(`${API_BASE_URL}/health`);
        
        if (response.data.success) {
            console.log(colorize('✅ Server is healthy!', 'green'));
            console.log(`   Status: ${response.data.status}`);
            console.log(`   Uptime: ${response.data.uptime} seconds`);
            return true;
        } else {
            console.log(colorize('❌ Server health check failed', 'red'));
            return false;
        }
    } catch (error) {
        console.log(colorize('❌ Server is not running or not accessible', 'red'));
        console.log(colorize(`   Error: ${error.message}`, 'red'));
        console.log(colorize('\n💡 Make sure to start the server with: npm start', 'yellow'));
        return false;
    }
}

// Test Instagram API methods
async function testInstagramMethods() {
    try {
        console.log(colorize('\n🔍 Testing Instagram API methods...', 'cyan'));
        const response = await axios.get(`${INSTAGRAM_API_URL}/methods`);
        
        if (response.data.success) {
            console.log(colorize('✅ Instagram API methods loaded!', 'green'));
            console.log(`   API Name: ${response.data.api.name}`);
            console.log(`   Description: ${response.data.api.description}`);
            console.log(`   Endpoint: ${response.data.api.endpoint}`);
            console.log(`   Features: ${response.data.api.features.join(', ')}`);
            return true;
        }
    } catch (error) {
        console.log(colorize('❌ Instagram API methods not available', 'red'));
        console.log(colorize(`   Error: ${error.message}`, 'red'));
        return false;
    }
}

// Download Instagram video
async function downloadInstagramVideo(url) {
    try {
        console.log(colorize(`\n🔄 Processing Instagram URL: ${url}`, 'yellow'));
        console.log(colorize('⏳ Using Puppeteer scraping - this may take 10-30 seconds...', 'yellow'));
        
        const startTime = Date.now();
        
        const response = await axios.post(`${INSTAGRAM_API_URL}/download`, {
            url: url
        }, {
            timeout: 60000 // 60 second timeout for Puppeteer
        });
        
        const endTime = Date.now();
        const processingTime = ((endTime - startTime) / 1000).toFixed(2);
        
        if (response.data.success) {
            console.log(colorize(`\n✅ Success! (${processingTime}s)`, 'green'));
            console.log(colorize('📹 Video Details:', 'bright'));
            console.log(`   Post ID: ${response.data.data.postId}`);
            console.log(`   Title: ${response.data.data.title}`);
            console.log(`   Platform: ${response.data.data.platform}`);
            console.log(`   Method: ${response.data.data.method}`);
            
            console.log(colorize('\n🔗 URLs:', 'bright'));
            console.log(`   Original: ${wrapUrl(response.data.data.url)}`);
            console.log(`   Post URL: ${wrapUrl(response.data.data.postUrl)}`);
            
            console.log(colorize('\n📥 Download URL (FULL):', 'green'));
            console.log(`${wrapUrl(response.data.data.downloadUrl, 100)}`);
            
            console.log(colorize('\n📋 Copy-Paste Ready:', 'cyan'));
            console.log(response.data.data.downloadUrl);
            
            console.log(colorize('\n💡 Usage Tips:', 'cyan'));
            console.log('   • Copy the full Download URL above to download the video');
            console.log('   • Paste it in your browser or use wget/curl to download');
            console.log('   • Use the Post URL to view the original post');
            console.log('   • Video is cached for 1 hour for faster subsequent requests');
            console.log('   • This uses Puppeteer browser automation for reliable scraping');
            
            console.log(colorize('\n🔧 Download Commands:', 'yellow'));
            console.log(`   wget "${response.data.data.downloadUrl}" -O instagram_video.mp4`);
            console.log(`   curl "${response.data.data.downloadUrl}" -o instagram_video.mp4`);
            
            return true;
        } else {
            console.log(colorize('❌ Failed to process Instagram URL', 'red'));
            console.log(colorize(`   Error: ${response.data.message}`, 'red'));
            return false;
        }
        
    } catch (error) {
        console.log(colorize('❌ Error downloading Instagram video', 'red'));
        
        if (error.response) {
            console.log(colorize(`   Status: ${error.response.status}`, 'red'));
            console.log(colorize(`   Message: ${error.response.data.message || error.response.data.error}`, 'red'));
        } else if (error.code === 'ECONNABORTED') {
            console.log(colorize('   Error: Request timeout - Puppeteer scraping took too long', 'red'));
            console.log(colorize('   💡 Try again with a different URL or check if the post is public', 'yellow'));
        } else {
            console.log(colorize(`   Error: ${error.message}`, 'red'));
        }
        
        return false;
    }
}

// Get Instagram stats
async function getInstagramStats() {
    try {
        console.log(colorize('\n📊 Getting Instagram API stats...', 'cyan'));
        const response = await axios.get(`${INSTAGRAM_API_URL}/stats`);
        
        if (response.data.success) {
            console.log(colorize('✅ Stats retrieved!', 'green'));
            console.log(`   Cache Keys: ${response.data.data.cache.keys}`);
            console.log(`   Cache Hits: ${response.data.data.cache.hits}`);
            console.log(`   Cache Misses: ${response.data.data.cache.misses}`);
            console.log(`   Active Posts: ${response.data.data.activePosts}`);
            console.log(`   Browser Active: ${response.data.data.browserActive}`);
            console.log(`   Method: ${response.data.data.method}`);
            console.log(`   Uptime: ${response.data.data.uptime} seconds`);
            return true;
        }
    } catch (error) {
        console.log(colorize('❌ Failed to get stats', 'red'));
        console.log(colorize(`   Error: ${error.message}`, 'red'));
        return false;
    }
}

// Validate Instagram URL
function isValidInstagramUrl(url) {
    const instagramPatterns = [
        /^https?:\/\/(www\.)?instagram\.com\/p\/([a-zA-Z0-9_-]+)\/?/,
        /^https?:\/\/(www\.)?instagram\.com\/reels?\/([a-zA-Z0-9_-]+)\/?/,
        /^https?:\/\/(www\.)?instagram\.com\/tv\/([a-zA-Z0-9_-]+)\/?/
    ];
    
    return instagramPatterns.some(pattern => pattern.test(url));
}

// Main interactive function
async function main() {
    console.log(colorize('🎬 Instagram Video Downloader - Test Script', 'magenta'));
    console.log(colorize('🤖 Using Puppeteer Browser Automation', 'magenta'));
    console.log(colorize('=' .repeat(50), 'magenta'));
    
    // Test server health first
    const serverHealthy = await testHealth();
    if (!serverHealthy) {
        rl.close();
        return;
    }
    
    // Test Instagram API methods
    await testInstagramMethods();
    
    console.log(colorize('\n📝 Supported Instagram URL formats:', 'cyan'));
    console.log('   • https://www.instagram.com/p/{post_id}/');
    console.log('   • https://www.instagram.com/reels/{reel_id}/');
    console.log('   • https://www.instagram.com/tv/{tv_id}/');
    
    console.log(colorize('\n💡 Example URLs to test:', 'yellow'));
    console.log('   • https://www.instagram.com/p/ABC123def456/');
    console.log('   • https://www.instagram.com/reels/XYZ789ghi012/');
    
    console.log(colorize('\n🤖 Technical Notes:', 'cyan'));
    console.log('   • Uses Puppeteer headless browser for reliable scraping');
    console.log('   • Blocks unnecessary resources for better performance');
    console.log('   • Built-in caching system for faster repeated requests');
    console.log('   • Browser instance is reused across requests');
    console.log('   • May take 10-30 seconds for first-time scraping');
    
    console.log(colorize('\n⚠️  Important:', 'yellow'));
    console.log('   • Make sure Puppeteer is installed: npm install puppeteer');
    console.log('   • First run may download Chromium (~170MB)');
    console.log('   • Subsequent runs will be faster');
    
    // Interactive loop
    const askForUrl = () => {
        rl.question(colorize('\n🔗 Enter Instagram URL (or "stats" for API stats, "quit" to exit): ', 'bright'), async (input) => {
            const url = input.trim();
            
            if (url.toLowerCase() === 'quit' || url.toLowerCase() === 'exit') {
                console.log(colorize('\n👋 Goodbye!', 'green'));
                rl.close();
                return;
            }
            
            if (url.toLowerCase() === 'stats') {
                await getInstagramStats();
                askForUrl();
                return;
            }
            
            if (!url) {
                console.log(colorize('❌ Please enter a valid Instagram URL', 'red'));
                askForUrl();
                return;
            }
            
            if (!isValidInstagramUrl(url)) {
                console.log(colorize('❌ Invalid Instagram URL format', 'red'));
                console.log(colorize('   Please use: https://www.instagram.com/p/{post_id}/', 'yellow'));
                askForUrl();
                return;
            }
            
            await downloadInstagramVideo(url);
            askForUrl();
        });
    };
    
    askForUrl();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log(colorize('\n\n👋 Goodbye!', 'green'));
    rl.close();
    process.exit(0);
});

// Start the script
main().catch(error => {
    console.error(colorize('❌ Script error:', 'red'), error);
    rl.close();
    process.exit(1);
}); 