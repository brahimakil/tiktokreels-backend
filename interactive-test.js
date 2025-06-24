const readline = require('readline');
const axios = require('axios');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

class InteractiveTester {
    constructor() {
        this.history = [];
    }

    async askQuestion(question) {
        return new Promise(resolve => {
            rl.question(question, resolve);
        });
    }

    async makeRequest(method, endpoint, data = null) {
        const startTime = Date.now(); // Move this OUTSIDE the try block
        let result;
        
        try {
            const config = {
                method,
                url: `${API_BASE_URL}${endpoint}`,
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 second timeout for downloads
            };

            if (data) {
                config.data = data;
            }

            const response = await axios(config);
            const duration = Date.now() - startTime;

            result = {
                success: true,
                status: response.status,
                data: response.data,
                duration,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            const duration = Date.now() - startTime; // Now startTime is accessible
            result = {
                success: false,
                status: error.response?.status || 0,
                data: error.response?.data || { error: error.message },
                duration,
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }

        // Log the request/response
        this.history.push({
            request: { method, endpoint, data },
            response: result
        });

        return result;
    }

    displayResponse(response) {
        console.log('\n' + '='.repeat(60));
        console.log(`Status: ${response.status} | Duration: ${response.duration}ms`);
        if (response.error) {
            console.log(`Error: ${response.error}`);
        }
        console.log('='.repeat(60));
        console.log(JSON.stringify(response.data, null, 2));
        console.log('='.repeat(60) + '\n');
    }

    showMenu() {
        console.log('\n🧪 TikTok API Interactive Tester');
        console.log(`🌐 API URL: ${API_BASE_URL}`);
        console.log('\nAvailable Commands:');
        console.log('1. health    - Test health endpoint');
        console.log('2. methods   - Get available methods');
        console.log('3. stats     - Get API statistics');
        console.log('4. download  - Download TikTok video (auto method)');
        console.log('5. download1 - Download using V1 method');
        console.log('6. download2 - Download using V2 method');
        console.log('7. info      - Get video info only');
        console.log('8. custom    - Custom request');
        console.log('9. history   - Show request history');
        console.log('10. clear    - Clear history');
        console.log('0. exit      - Exit tester');
        console.log('\nEnter command number or name:');
    }

    async handleCommand(command) {
        const cmd = command.toLowerCase().trim();

        try {
            switch (cmd) {
                case '1':
                case 'health':
                    const health = await this.makeRequest('GET', '/health');
                    this.displayResponse(health);
                    break;

                case '2':
                case 'methods':
                    const methods = await this.makeRequest('GET', '/api/v1/tiktok/methods');
                    this.displayResponse(methods);
                    break;

                case '3':
                case 'stats':
                    const stats = await this.makeRequest('GET', '/api/v1/tiktok/stats');
                    this.displayResponse(stats);
                    break;

                case '4':
                case 'download':
                    const url1 = await this.askQuestion('Enter TikTok URL: ');
                    console.log('🔄 Downloading... This may take a moment...');
                    const download = await this.makeRequest('POST', '/api/v1/tiktok/download', { url: url1 });
                    this.displayResponse(download);
                    break;

                case '5':
                case 'download1':
                    const url2 = await this.askQuestion('Enter TikTok URL: ');
                    console.log('🔄 Downloading with V1 method... This may take a moment...');
                    const download1 = await this.makeRequest('POST', '/api/v1/tiktok/download/v1', { url: url2 });
                    this.displayResponse(download1);
                    break;

                case '6':
                case 'download2':
                    const url3 = await this.askQuestion('Enter TikTok URL: ');
                    console.log('🔄 Downloading with V2 method... This may take a moment...');
                    const download2 = await this.makeRequest('POST', '/api/v1/tiktok/download/v2', { url: url3 });
                    this.displayResponse(download2);
                    break;

                case '7':
                case 'info':
                    const url4 = await this.askQuestion('Enter TikTok URL: ');
                    console.log('🔄 Getting video info...');
                    const info = await this.makeRequest('POST', '/api/v1/tiktok/info', { url: url4 });
                    this.displayResponse(info);
                    break;

                case '8':
                case 'custom':
                    const method = await this.askQuestion('Method (GET/POST): ');
                    const endpoint = await this.askQuestion('Endpoint (e.g., /api/v1/tiktok/stats): ');
                    let data = null;
                    if (method.toUpperCase() === 'POST') {
                        const bodyInput = await this.askQuestion('JSON body (or press enter for empty): ');
                        if (bodyInput.trim()) {
                            try {
                                data = JSON.parse(bodyInput);
                            } catch (e) {
                                console.log('Invalid JSON, sending empty body');
                            }
                        }
                    }
                    const custom = await this.makeRequest(method, endpoint, data);
                    this.displayResponse(custom);
                    break;

                case '9':
                case 'history':
                    console.log('\n📜 Request History:');
                    this.history.forEach((item, index) => {
                        console.log(`\n${index + 1}. ${item.request.method} ${item.request.endpoint}`);
                        console.log(`   Status: ${item.response.status} | Duration: ${item.response.duration}ms`);
                        console.log(`   Time: ${item.response.timestamp}`);
                        if (item.response.error) {
                            console.log(`   Error: ${item.response.error}`);
                        }
                    });
                    if (this.history.length === 0) {
                        console.log('No requests made yet.');
                    }
                    console.log();
                    break;

                case '10':
                case 'clear':
                    this.history = [];
                    console.log('✅ History cleared!');
                    break;

                case '0':
                case 'exit':
                    console.log('👋 Goodbye!');
                    rl.close();
                    return false;

                default:
                    console.log('❌ Invalid command. Please try again.');
            }
        } catch (error) {
            console.error('❌ Command failed:', error.message);
            console.log('Please try again or use a different command.');
        }

        return true;
    }

    async start() {
        console.log('🚀 Starting Interactive TikTok API Tester...');
        
        // Test connection first
        console.log('Testing connection...');
        const health = await this.makeRequest('GET', '/health');
        if (health.success) {
            console.log('✅ Connected successfully!');
        } else {
            console.log('❌ Connection failed. Make sure the server is running.');
            console.log(`   Trying to connect to: ${API_BASE_URL}`);
        }

        let running = true;
        while (running) {
            this.showMenu();
            const command = await this.askQuestion('> ');
            running = await this.handleCommand(command);
        }
    }
}

// Start the interactive tester
if (require.main === module) {
    const tester = new InteractiveTester();
    tester.start().catch(error => {
        console.error('Error:', error);
        rl.close();
    });
}

module.exports = InteractiveTester; 