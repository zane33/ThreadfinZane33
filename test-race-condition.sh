#!/bin/bash

# Test script to validate race condition fixes in ThreadfinZane33
# This script simulates concurrent requests to the same stream

echo "=== ThreadfinZane33 Race Condition Fix Test ==="
echo "Testing concurrent stream requests to validate atomic operations..."

THREADFIN_URL="http://localhost:34400"
TEST_STREAM_ID="TEST_STREAM_123"
CONCURRENT_REQUESTS=10

echo "Starting Threadfin container for testing..."

# Start the container in test mode
docker-compose up -d

# Wait for container to start
echo "Waiting for Threadfin to start..."
sleep 10

# Test function to make concurrent requests
test_concurrent_requests() {
    echo "Making $CONCURRENT_REQUESTS concurrent requests to the same stream..."
    
    for i in $(seq 1 $CONCURRENT_REQUESTS); do
        (
            curl -s -o /dev/null -w "Request $i: HTTP Status %{http_code}, Time: %{time_total}s\n" \
                "$THREADFIN_URL/stream/$TEST_STREAM_ID" &
        )
    done
    
    # Wait for all background jobs to complete
    wait
}

# Test discovery endpoints
test_discovery() {
    echo "Testing HDHR discovery endpoints..."
    
    echo "Testing /discover.json:"
    curl -s "$THREADFIN_URL/discover.json" | jq '.' || echo "Discovery endpoint failed"
    
    echo "Testing /lineup_status.json:"
    curl -s "$THREADFIN_URL/lineup_status.json" | jq '.' || echo "Lineup status endpoint failed"
    
    echo "Testing /device.xml:"
    curl -s "$THREADFIN_URL/device.xml" | head -5 || echo "Device XML endpoint failed"
}

# Main test execution
echo "=== Testing Discovery Endpoints ==="
test_discovery

echo ""
echo "=== Testing Concurrent Stream Requests ==="
test_concurrent_requests

echo ""
echo "=== Checking Container Logs for Race Conditions ==="
docker logs threadfin 2>&1 | grep -i "playlist" | tail -10

echo ""
echo "=== Test Results Summary ==="
echo "✅ If you see consistent HTTP 302/404 responses above, the race condition is fixed"
echo "✅ If you see only ONE 'Creating new playlist' message in logs, atomic operations work"
echo "❌ If you see multiple 'Creating new playlist' messages, race condition still exists"

echo ""
echo "Test completed. Check the logs above for any issues."