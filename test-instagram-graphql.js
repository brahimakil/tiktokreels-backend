#!/usr/bin/env node

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

const colorize = (text, color) => `${colors[color]}${text}${colors.reset}`;

// Test URLs - mix of posts, reels, and different formats
const testUrls = [
    'https://www.instagram.com/reel/CtjoC2BNsB2', // Example from the GitHub repo
    'https://www.instagram.com/p/C1234567890', // Example post (may not exist)
    'https://instagram.com/reels/C9876543210', // Example reel (may not exist)
];

// Test server health
async function testHealth() {
    try {
        console.log(colorize('🔍 Testing server health...', 'cyan'));
        const response = await axios.get(`${API_BASE_URL}/health`);
        
        if (response.data.success) {
            console.log(colorize('✅ Server is healthy!', 'green'));
            return true;
        }
    } catch (error) {
        console.log(colorize('❌ Server is not running', 'red'));
        console.log(colorize('💡 Start the server with: npm start', 'yellow'));
        return false;
    }
}

// Test Instagram API methods endpoint
async function testMethods() {
    try {
        console.log(colorize('\n🔍 Testing Instagram API methods...', 'cyan'));
        const response = await axios.get(`${INSTAGRAM_API_URL}/methods`);
        
        if (response.data.success) {
            console.log(colorize('✅ Methods endpoint working!', 'green'));
            console.log(`   API: ${response.data.api.name}`);
            console.log(`   Version: ${response.data.api.version || 'N/A'}`);
            console.log(`   Method: ${response.data.api.method || 'N/A'}`);
            return true;
        }
    } catch (error) {
        console.log(colorize('❌ Methods endpoint failed', 'red'));
        console.log(colorize(`   Error: ${error.message}`, 'red'));
        return false;
    }
}

// Test video endpoint
async function testVideoEndpoint(url) {
    try {
        console.log(colorize(`\n🎬 Testing video endpoint with: ${url}`, 'yellow'));
        
        const startTime = Date.now();
        const response = await axios.get(`${INSTAGRAM_API_URL}/video`, {
            params: { url },
            timeout: 30000
        });
        const endTime = Date.now();
        
        if (response.data.success !== false) {
            console.log(colorize(`✅ Success! (${((endTime - startTime) / 1000).toFixed(2)}s)`, 'green'));
            console.log(`   Video URL: ${response.data.videoUrl ? 'Found' : 'Not found'}`);
            if (response.data.imageUrl) {
                console.log(`   Image URL: Found`);
                console.log(`   Is Video: ${response.data.isVideo}`);
            }
            return true;
        } else {
            console.log(colorize(`❌ Failed: ${response.data.error}`, 'red'));
            return false;
        }
    } catch (error) {
        console.log(colorize(`❌ Error: ${error.response?.data?.error || error.message}`, 'red'));
        return false;
    }
}

// Test media endpoint
async function testMediaEndpoint(url) {
    try {
        console.log(colorize(`\n📊 Testing media endpoint with: ${url}`, 'yellow'));
        
        const startTime = Date.now();
        const response = await axios.get(`${INSTAGRAM_API_URL}/media`, {
            params: { url },
            timeout: 30000
        });
        const endTime = Date.now();
        
        if (response.data.success) {
            console.log(colorize(`✅ Success! (${((endTime - startTime) / 1000).toFixed(2)}s)`, 'green'));
            const data = response.data.data;
            console.log(`   Post ID: ${data.shortcode}`);
            console.log(`   Type: ${data.__typename}`);
            console.log(`   Is Video: ${data.is_video}`);
            console.log(`   Owner: ${data.owner?.username}`);
            console.log(`   Caption: ${data.caption ? data.caption.substring(0, 50) + '...' : 'None'}`);
            console.log(`   Likes: ${data.like_count || 'N/A'}`);
            console.log(`   Comments: ${data.comment_count || 'N/A'}`);
            if (data.sidecar && data.sidecar.length > 0) {
                console.log(`   Carousel Items: ${data.sidecar.length}`);
            }
            return true;
        } else {
            console.log(colorize(`❌ Failed: ${response.data.error}`, 'red'));
            return false;
        }
    } catch (error) {
        console.log(colorize(`❌ Error: ${error.response?.data?.error || error.message}`, 'red'));
        return false;
    }
}

// Test info endpoint
async function testInfoEndpoint(url) {
    try {
        console.log(colorize(`\n📋 Testing info endpoint with: ${url}`, 'yellow'));
        
        const startTime = Date.now();
        const response = await axios.get(`${INSTAGRAM_API_URL}/info`, {
            params: { url },
            timeout: 30000
        });
        const endTime = Date.now();
        
        if (response.data.success) {
            console.log(colorize(`✅ Success! (${((endTime - startTime) / 1000).toFixed(2)}s)`, 'green'));
            const data = response.data.data;
            console.log(`   Post ID: ${data.shortcode}`);
            console.log(`   Owner: ${data.owner?.username} (${data.owner?.full_name})`);
            console.log(`   Verified: ${data.owner?.is_verified ? 'Yes' : 'No'}`);
            console.log(`   Followers: ${data.owner?.follower_count || 'N/A'}`);
            return true;
        } else {
            console.log(colorize(`❌ Failed: ${response.data.error}`, 'red'));
            return false;
        }
    } catch (error) {
        console.log(colorize(`❌ Error: ${error.response?.data?.error || error.message}`, 'red'));
        return false;
    }
}

// Test with custom URL
async function testCustomUrl() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(colorize('\n🔗 Enter Instagram URL to test (or press Enter to skip): ', 'cyan'), async (url) => {
            rl.close();
            
            if (!url.trim()) {
                resolve();
                return;
            }

            console.log(colorize('\n🧪 Testing custom URL...', 'magenta'));
            await testVideoEndpoint(url);
            await testMediaEndpoint(url);
            await testInfoEndpoint(url);
            resolve();
        });
    });
}

// Main test function
async function main() {
    console.log(colorize('🧪 Instagram GraphQL Scraper Test', 'magenta'));
    console.log(colorize('=' .repeat(50), 'magenta'));
    
    // Test server health
    if (!(await testHealth())) {
        process.exit(1);
    }
    
    // Test methods endpoint
    await testMethods();
    
    // Test with a known working URL (from the GitHub repo example)
    const workingUrl = 'https://www.instagram.com/reel/CtjoC2BNsB2';
    console.log(colorize('\n🎯 Testing with known working URL...', 'magenta'));
    
    await testVideoEndpoint(workingUrl);
    await testMediaEndpoint(workingUrl);
    await testInfoEndpoint(workingUrl);
    
    // Test custom URL
    await testCustomUrl();
    
    console.log(colorize('\n✅ Test completed!', 'green'));
    console.log(colorize('\n📝 API Endpoints Available:', 'cyan'));
    console.log(`   GET ${INSTAGRAM_API_URL}/video?url=<URL>    - Get video/image URL`);
    console.log(`   GET ${INSTAGRAM_API_URL}/media?url=<URL>    - Get full media data`);
    console.log(`   GET ${INSTAGRAM_API_URL}/info?url=<URL>     - Get post info only`);
    console.log(`   GET ${INSTAGRAM_API_URL}/methods           - Get API documentation`);
}

// Run the test
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { testVideoEndpoint, testMediaEndpoint, testInfoEndpoint }; 