const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TIKTOK_API_URL = `${API_BASE_URL}/api/v1/tiktok`;

// Test TikTok URLs (replace with actual working URLs)
const TEST_URLS = [
    'https://www.tiktok.com/@tiktok/video/7016181462140628225', // Video
    'https://vm.tiktok.com/ZMNkr3cj5/', // Short URL
    'https://vt.tiktok.com/ZS84BnrU9/', // Another short URL
    'https://www.tiktok.com/@test/video/1234567890', // Invalid URL for error testing
];

class TikTokAPITester {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            details: []
        };
        this.startTime = Date.now();
    }

    // Utility methods
    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const colors = {
            info: '\x1b[36m',    // Cyan
            success: '\x1b[32m', // Green
            error: '\x1b[31m',   // Red
            warning: '\x1b[33m', // Yellow
            reset: '\x1b[0m'     // Reset
        };
        
        console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
    }

    async makeRequest(method, endpoint, data = null, expectedStatus = 200) {
        const startTime = Date.now();
        try {
            const config = {
                method,
                url: `${API_BASE_URL}${endpoint}`,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'TikTok-API-Tester/1.0.0'
                }
            };

            if (data) {
                config.data = data;
            }

            const response = await axios(config);
            const duration = Date.now() - startTime;

            return {
                success: true,
                status: response.status,
                data: response.data,
                duration,
                headers: response.headers
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            return {
                success: false,
                status: error.response?.status || 0,
                data: error.response?.data || { message: error.message },
                duration,
                error: error.message
            };
        }
    }

    async runTest(testName, testFunction) {
        this.results.total++;
        this.log(`Running: ${testName}`, 'info');
        
        try {
            const result = await testFunction();
            if (result.passed) {
                this.results.passed++;
                this.log(`✅ PASSED: ${testName} (${result.duration}ms)`, 'success');
            } else {
                this.results.failed++;
                this.log(`❌ FAILED: ${testName} - ${result.reason}`, 'error');
            }
            
            this.results.details.push({
                name: testName,
                passed: result.passed,
                duration: result.duration,
                reason: result.reason || 'Success',
                data: result.data
            });
        } catch (error) {
            this.results.failed++;
            this.log(`❌ ERROR: ${testName} - ${error.message}`, 'error');
            this.results.details.push({
                name: testName,
                passed: false,
                duration: 0,
                reason: error.message,
                data: null
            });
        }
    }

    // Test Cases
    async testHealthEndpoint() {
        return this.runTest('Health Check', async () => {
            const response = await this.makeRequest('GET', '/health');
            
            return {
                passed: response.success && response.status === 200 && response.data.success,
                duration: response.duration,
                reason: response.success ? null : `Status: ${response.status}`,
                data: response.data
            };
        });
    }

    async testRootEndpoint() {
        return this.runTest('Root Endpoint', async () => {
            const response = await this.makeRequest('GET', '/');
            
            return {
                passed: response.success && response.status === 200 && response.data.success,
                duration: response.duration,
                reason: response.success ? null : `Status: ${response.status}`,
                data: response.data
            };
        });
    }

    async testMethodsEndpoint() {
        return this.runTest('Available Methods', async () => {
            const response = await this.makeRequest('GET', '/api/v1/tiktok/methods');
            
            return {
                passed: response.success && response.status === 200 && response.data.success,
                duration: response.duration,
                reason: response.success ? null : `Status: ${response.status}`,
                data: response.data
            };
        });
    }

    async testStatsEndpoint() {
        return this.runTest('Statistics', async () => {
            const response = await this.makeRequest('GET', '/api/v1/tiktok/stats');
            
            return {
                passed: response.success && response.status === 200 && response.data.success,
                duration: response.duration,
                reason: response.success ? null : `Status: ${response.status}`,
                data: response.data
            };
        });
    }

    async testAutoDownload() {
        return this.runTest('Auto Download Method', async () => {
            const response = await this.makeRequest('POST', '/api/v1/tiktok/download', {
                url: TEST_URLS[0]
            });
            
            const isValid = response.data && (response.data.success || response.status === 200);
            
            return {
                passed: isValid,
                duration: response.duration,
                reason: isValid ? null : `Response: ${JSON.stringify(response.data)}`,
                data: response.data
            };
        });
    }

    async testV1Download() {
        return this.runTest('V1 Download Method', async () => {
            const response = await this.makeRequest('POST', '/api/v1/tiktok/download/v1', {
                url: TEST_URLS[0]
            });
            
            const isValid = response.data && (response.data.success || response.status === 200);
            
            return {
                passed: isValid,
                duration: response.duration,
                reason: isValid ? null : `Response: ${JSON.stringify(response.data)}`,
                data: response.data
            };
        });
    }

    async testV2Download() {
        return this.runTest('V2 Download Method', async () => {
            const response = await this.makeRequest('POST', '/api/v1/tiktok/download/v2', {
                url: TEST_URLS[0]
            });
            
            const isValid = response.data && (response.data.success || response.status === 200);
            
            return {
                passed: isValid,
                duration: response.duration,
                reason: isValid ? null : `Response: ${JSON.stringify(response.data)}`,
                data: response.data
            };
        });
    }

    async testVideoInfo() {
        return this.runTest('Video Info', async () => {
            const response = await this.makeRequest('POST', '/api/v1/tiktok/info', {
                url: TEST_URLS[0]
            });
            
            const isValid = response.data && (response.data.success || response.status === 200);
            
            return {
                passed: isValid,
                duration: response.duration,
                reason: isValid ? null : `Response: ${JSON.stringify(response.data)}`,
                data: response.data
            };
        });
    }

    async testInvalidUrl() {
        return this.runTest('Invalid URL Handling', async () => {
            const response = await this.makeRequest('POST', '/api/v1/tiktok/download', {
                url: 'https://invalid-url.com'
            });
            
            // Should return 400 or success: false
            const isValid = response.status === 400 || (response.data && !response.data.success);
            
            return {
                passed: isValid,
                duration: response.duration,
                reason: isValid ? null : 'Should reject invalid URLs',
                data: response.data
            };
        });
    }

    async testMissingUrl() {
        return this.runTest('Missing URL Parameter', async () => {
            const response = await this.makeRequest('POST', '/api/v1/tiktok/download', {});
            
            // Should return 400
            const isValid = response.status === 400;
            
            return {
                passed: isValid,
                duration: response.duration,
                reason: isValid ? null : 'Should require URL parameter',
                data: response.data
            };
        });
    }

    async testRateLimit() {
        return this.runTest('Rate Limiting', async () => {
            this.log('Testing rate limiting (making multiple requests)...', 'warning');
            
            const requests = [];
            const maxRequests = 12; // Above the 10/minute limit
            
            for (let i = 0; i < maxRequests; i++) {
                requests.push(
                    this.makeRequest('POST', '/api/v1/tiktok/download', {
                        url: TEST_URLS[0]
                    })
                );
            }
            
            const responses = await Promise.all(requests);
            const rateLimited = responses.some(r => r.status === 429);
            
            return {
                passed: rateLimited,
                duration: responses.reduce((sum, r) => sum + r.duration, 0) / responses.length,
                reason: rateLimited ? null : 'Rate limiting not working',
                data: { responses: responses.length, rateLimited: rateLimited }
            };
        });
    }

    async testNotFoundEndpoint() {
        return this.runTest('404 Not Found', async () => {
            const response = await this.makeRequest('GET', '/api/v1/nonexistent');
            
            return {
                passed: response.status === 404,
                duration: response.duration,
                reason: response.status === 404 ? null : `Expected 404, got ${response.status}`,
                data: response.data
            };
        });
    }

    // Performance test
    async testPerformance() {
        return this.runTest('Performance Test', async () => {
            const startTime = Date.now();
            const promises = [];
            
            // Make 5 concurrent requests
            for (let i = 0; i < 5; i++) {
                promises.push(
                    this.makeRequest('POST', '/api/v1/tiktok/download', {
                        url: TEST_URLS[0]
                    })
                );
            }
            
            const responses = await Promise.all(promises);
            const totalTime = Date.now() - startTime;
            const avgTime = totalTime / responses.length;
            
            // Consider it passing if average response time is under 5 seconds
            const passed = avgTime < 5000;
            
            return {
                passed,
                duration: totalTime,
                reason: passed ? null : `Average response time too slow: ${avgTime}ms`,
                data: {
                    totalTime,
                    avgTime,
                    requests: responses.length,
                    successful: responses.filter(r => r.success).length
                }
            };
        });
    }

    // Run all tests
    async runAllTests() {
        this.log('🚀 Starting TikTok API Test Suite', 'info');
        this.log(`Testing against: ${API_BASE_URL}`, 'info');
        this.log('=' * 60, 'info');

        // Basic endpoint tests
        await this.testHealthEndpoint();
        await this.testRootEndpoint();
        await this.testMethodsEndpoint();
        await this.testStatsEndpoint();
        await this.testNotFoundEndpoint();

        // Functional tests
        await this.testAutoDownload();
        await this.testV1Download();
        await this.testV2Download();
        await this.testVideoInfo();

        // Error handling tests
        await this.testInvalidUrl();
        await this.testMissingUrl();

        // Security and performance tests
        await this.testRateLimit();
        await this.testPerformance();

        // Generate report
        this.generateReport();
    }

    generateReport() {
        const totalTime = Date.now() - this.startTime;
        
        this.log('=' * 60, 'info');
        this.log('📊 TEST RESULTS SUMMARY', 'info');
        this.log('=' * 60, 'info');
        
        this.log(`Total Tests: ${this.results.total}`, 'info');
        this.log(`Passed: ${this.results.passed}`, 'success');
        this.log(`Failed: ${this.results.failed}`, this.results.failed > 0 ? 'error' : 'info');
        this.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`, 'info');
        this.log(`Total Time: ${totalTime}ms`, 'info');

        if (this.results.failed > 0) {
            this.log('\n❌ FAILED TESTS:', 'error');
            this.results.details
                .filter(test => !test.passed)
                .forEach(test => {
                    this.log(`  - ${test.name}: ${test.reason}`, 'error');
                });
        }

        // Save detailed results to file
        const reportData = {
            summary: {
                total: this.results.total,
                passed: this.results.passed,
                failed: this.results.failed,
                successRate: ((this.results.passed / this.results.total) * 100).toFixed(1),
                totalTime: totalTime,
                timestamp: new Date().toISOString()
            },
            tests: this.results.details
        };

        const reportPath = path.join(process.cwd(), 'test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
        this.log(`\n📋 Detailed report saved to: ${reportPath}`, 'info');

        // Exit with appropriate code
        process.exit(this.results.failed > 0 ? 1 : 0);
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new TikTokAPITester();
    
    // Handle command line arguments
    const args = process.argv.slice(2);
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
TikTok API Test Suite

Usage: node test-api.js [options]

Options:
  --help, -h     Show this help message
  --url <url>    Set custom API base URL (default: http://localhost:3000)

Environment Variables:
  API_BASE_URL   Set the base URL for the API to test

Examples:
  node test-api.js
  node test-api.js --url http://localhost:3001
  API_BASE_URL=https://your-api.com node test-api.js
        `);
        process.exit(0);
    }

    // Override URL if provided
    const urlIndex = args.indexOf('--url');
    if (urlIndex > -1 && args[urlIndex + 1]) {
        process.env.API_BASE_URL = args[urlIndex + 1];
    }

    tester.runAllTests().catch(error => {
        console.error('Test suite failed:', error);
        process.exit(1);
    });
}

module.exports = TikTokAPITester; 