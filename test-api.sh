#!/bin/bash

# TikTok API Test Script
# Usage: ./test-api.sh [BASE_URL]

BASE_URL=${1:-"http://localhost:3000"}
API_URL="$BASE_URL/api/v1/tiktok"

echo "🚀 Testing TikTok API at: $BASE_URL"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0

run_test() {
    local test_name="$1"
    local command="$2"
    local expected_status="${3:-200}"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${BLUE}Testing: $test_name${NC}"
    
    # Run the command and capture both output and status
    response=$(eval "$command" 2>&1)
    status=$?
    
    if [ $status -eq 0 ] && echo "$response" | grep -q "success.*true\|\"status\":.*200"; then
        echo -e "${GREEN}✅ PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAILED${NC}"
        echo "Response: $response"
    fi
}

# Test 1: Health Check
run_test "Health Check" "curl -s -X GET $BASE_URL/health"

# Test 2: Root Endpoint
run_test "Root Endpoint" "curl -s -X GET $BASE_URL/"

# Test 3: Methods Info
run_test "Available Methods" "curl -s -X GET $API_URL/methods"

# Test 4: Statistics
run_test "API Statistics" "curl -s -X GET $API_URL/stats"

# Test 5: Auto Download (use a real TikTok URL here)
TIKTOK_URL="https://www.tiktok.com/@tiktok/video/7016181462140628225"
run_test "Auto Download" "curl -s -X POST $API_URL/download -H 'Content-Type: application/json' -d '{\"url\":\"$TIKTOK_URL\"}'"

# Test 6: V1 Download
run_test "V1 Download" "curl -s -X POST $API_URL/download/v1 -H 'Content-Type: application/json' -d '{\"url\":\"$TIKTOK_URL\"}'"

# Test 7: Video Info
run_test "Video Info" "curl -s -X POST $API_URL/info -H 'Content-Type: application/json' -d '{\"url\":\"$TIKTOK_URL\"}'"

# Test 8: Invalid URL (should fail gracefully)
run_test "Invalid URL Handling" "curl -s -X POST $API_URL/download -H 'Content-Type: application/json' -d '{\"url\":\"https://invalid-url.com\"}'"

# Test 9: Missing URL parameter
run_test "Missing URL Parameter" "curl -s -X POST $API_URL/download -H 'Content-Type: application/json' -d '{}'"

# Test 10: 404 Not Found
run_test "404 Not Found" "curl -s -X GET $API_URL/nonexistent"

# Summary
echo -e "\n=================================="
echo -e "${BLUE}📊 TEST RESULTS SUMMARY${NC}"
echo -e "=================================="
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $((TOTAL_TESTS - PASSED_TESTS))${NC}"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi 