const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const API_BASE_URL = 'http://localhost:3000';
const YOUTUBE_API_URL = `${API_BASE_URL}/api/v1/youtube`;

function askQuestion(question) {
    return new Promise(resolve => {
        rl.question(question, resolve);
    });
}

function formatBytes(bytes) {
    if (!bytes || bytes === 'Unknown') return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDuration(seconds) {
    if (!seconds) return 'Unknown';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatNumber(num) {
    if (!num) return '0';
    return num.toLocaleString();
}

async function testYouTubeComplete() {
    console.log('🎬 YouTube Video Downloader - Complete Test\n');
    console.log('='.repeat(60));
    
    try {
        // Test server health first
        console.log('🔍 Checking server health...');
        const healthResponse = await axios.get(`${API_BASE_URL}/health`);
        console.log(`✅ Server Status: ${healthResponse.data.status}`);
        console.log(`🆙 Uptime: ${Math.floor(healthResponse.data.uptime / 60)} minutes`);
        console.log();
    } catch (error) {
        console.log('❌ Server is not running! Please start the server first.');
        console.log('   Run: npm start');
        rl.close();
        return;
    }

    while (true) {
        console.log('='.repeat(60));
        const url = await askQuestion('📋 Enter YouTube URL (or "quit" to exit): ');
        
        if (url.toLowerCase() === 'quit' || url.toLowerCase() === 'q') {
            console.log('👋 Goodbye!');
            break;
        }

        if (!url.trim()) {
            console.log('❌ Please enter a valid URL');
            continue;
        }

        console.log('\n🔄 Processing YouTube URL...\n');

        // Test 1: Get Video Info (lightweight)
        console.log('1️⃣ GETTING VIDEO INFO...');
        console.log('-'.repeat(40));
        try {
            const infoResponse = await axios.post(`${YOUTUBE_API_URL}/info`, { url });
            
            if (infoResponse.data.success) {
                console.log('✅ Video Info Retrieved Successfully');
                const info = infoResponse.data.data;
                
                console.log(`📺 Title: ${info.title}`);
                console.log(`🆔 Video ID: ${info.id}`);
                console.log(`⏱️ Duration: ${formatDuration(info.duration)}`);
                console.log(`👤 Author: ${info.author.name}`);
                console.log(`👀 Views: ${formatNumber(info.statistics.views)}`);
                console.log(`👍 Likes: ${formatNumber(info.statistics.likes)}`);
                console.log(`📅 Upload Date: ${info.uploadDate}`);
                console.log(`📂 Category: ${info.category}`);
                console.log(`🖼️ Thumbnail: ${info.thumbnail}`);
                console.log(`📝 Description: ${info.description}`);
                console.log();
            } else {
                console.log('❌ Failed to get video info:', infoResponse.data.message);
            }
        } catch (error) {
            console.log('❌ Video Info Error:', error.response?.data?.message || error.message);
        }

        // Test 2: Get Download URL (full data)
        console.log('2️⃣ GETTING DOWNLOAD URL & COMPLETE DATA...');
        console.log('-'.repeat(40));
        try {
            const downloadResponse = await axios.post(`${YOUTUBE_API_URL}/download`, { url });
            
            if (downloadResponse.data.success) {
                console.log('✅ Download URL Retrieved Successfully');
                const data = downloadResponse.data.data;
                
                console.log();
                console.log('📋 COMPLETE VIDEO DATA:');
                console.log('='.repeat(50));
                
                // Basic Info
                console.log('📺 BASIC INFORMATION:');
                console.log(`   🆔 Video ID: ${data.id}`);
                console.log(`   📝 Title: ${data.title}`);
                console.log(`   ⏱️ Duration: ${formatDuration(data.duration)}`);
                console.log(`   📅 Upload Date: ${data.uploadDate}`);
                console.log(`   📂 Category: ${data.category}`);
                console.log();
                
                // Author Info
                console.log('👤 AUTHOR INFORMATION:');
                console.log(`   📛 Name: ${data.author.name}`);
                console.log(`   🆔 Channel ID: ${data.author.channelId}`);
                console.log(`   🔗 Channel URL: ${data.author.channel}`);
                if (data.author.thumbnail) {
                    console.log(`   🖼️ Avatar: ${data.author.thumbnail}`);
                }
                console.log();
                
                // Statistics
                console.log('📊 STATISTICS:');
                console.log(`   👀 Views: ${formatNumber(data.statistics.views)}`);
                console.log(`   👍 Likes: ${formatNumber(data.statistics.likes)}`);
                console.log(`   ⭐ Rating: ${data.statistics.rating}/5`);
                console.log();
                
                // Format Details
                console.log('🎬 FORMAT DETAILS:');
                console.log(`   🎯 Quality: ${data.format.quality}`);
                console.log(`   📦 Container: ${data.format.container}`);
                console.log(`   🎥 Video Codec: ${data.format.videoCodec || 'N/A'}`);
                console.log(`   🔊 Audio Codec: ${data.format.audioCodec || 'N/A'}`);
                console.log(`   📏 File Size: ${formatBytes(data.format.filesize)}`);
                console.log();
                
                // Download Info
                console.log('📥 DOWNLOAD INFORMATION:');
                console.log(`   ✅ Method Used: ${downloadResponse.data.method}`);
                console.log(`   🖼️ Thumbnail: ${data.thumbnail}`);
                console.log(`   🔗 Download URL: ${data.downloadUrl.substring(0, 80)}...`);
                console.log();
                
                // Description
                console.log('📝 DESCRIPTION:');
                console.log(`   ${data.description}`);
                console.log();
                
                // Raw Response (optional)
                const showRaw = await askQuestion('🔍 Show raw JSON response? (y/n): ');
                if (showRaw.toLowerCase() === 'y' || showRaw.toLowerCase() === 'yes') {
                    console.log();
                    console.log('📄 RAW JSON RESPONSE:');
                    console.log('='.repeat(50));
                    console.log(JSON.stringify(downloadResponse.data, null, 2));
                }
                
            } else {
                console.log('❌ Failed to get download URL:', downloadResponse.data.message);
            }
        } catch (error) {
            console.log('❌ Download Error:', error.response?.data?.message || error.message);
            
            if (error.response?.data) {
                console.log('📄 Error Details:', JSON.stringify(error.response.data, null, 2));
            }
        }

        // Test 3: Get Available Methods
        console.log();
        console.log('3️⃣ AVAILABLE METHODS:');
        console.log('-'.repeat(40));
        try {
            const methodsResponse = await axios.get(`${YOUTUBE_API_URL}/methods`);
            
            if (methodsResponse.data.success) {
                Object.entries(methodsResponse.data.methods).forEach(([key, method]) => {
                    console.log(`🔧 ${key.toUpperCase()}: ${method.name}`);
                    console.log(`   📝 ${method.description}`);
                    console.log(`   🔗 ${method.endpoint}`);
                    console.log(`   ⭐ Reliability: ${method.reliability}`);
                    console.log(`   ✨ Features: ${method.features.join(', ')}`);
                    console.log();
                });
            }
        } catch (error) {
            console.log('❌ Methods Error:', error.message);
        }

        // Test 4: Get Stats
        console.log('4️⃣ SERVER STATISTICS:');
        console.log('-'.repeat(40));
        try {
            const statsResponse = await axios.get(`${YOUTUBE_API_URL}/stats`);
            
            if (statsResponse.data.success) {
                const stats = statsResponse.data.stats;
                console.log(`📈 Total Downloads: ${stats.totalDownloads}`);
                console.log(`⏰ Server Uptime: ${Math.floor(stats.uptime / 60)} minutes`);
                console.log(`💾 Memory Usage: ${formatBytes(stats.memory.heapUsed)}`);
                console.log(`🛠️ Available Methods: ${stats.availableMethods.join(', ')}`);
                console.log(`📁 Supported Formats: ${stats.supportedFormats.join(', ')}`);
                console.log(`✨ Features: ${stats.features.join(', ')}`);
            }
        } catch (error) {
            console.log('❌ Stats Error:', error.message);
        }

        console.log('\n' + '='.repeat(60));
        const continueTest = await askQuestion('🔄 Test another video? (y/n): ');
        if (continueTest.toLowerCase() !== 'y' && continueTest.toLowerCase() !== 'yes') {
            console.log('👋 Testing completed!');
            break;
        }
        console.log();
    }
    
    rl.close();
}

// Run the complete test
console.log('🚀 Starting YouTube Complete Test...\n');
testYouTubeComplete().catch(error => {
    console.error('💥 Unexpected error:', error.message);
    rl.close();
}); 