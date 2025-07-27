#!/bin/bash

# ThreadfinZane33 Performance Test Script
# Tests concurrent connections, memory usage, and response times

THREADFIN_URL="http://localhost:34400"
CONCURRENT_CLIENTS=5
TEST_DURATION=30

echo "ThreadfinZane33 Performance Test"
echo "================================="
echo "Target URL: $THREADFIN_URL"
echo "Concurrent clients: $CONCURRENT_CLIENTS"
echo "Test duration: ${TEST_DURATION}s"
echo ""

# Test 1: Basic endpoint response times
echo "Test 1: Basic Endpoint Response Times"
echo "-------------------------------------"
for endpoint in "/discover.json" "/lineup_status.json" "/web/" "/m3u/threadfin.m3u"; do
    echo -n "Testing $endpoint... "
    response_time=$(curl -w "%{time_total}" -s -o /dev/null "$THREADFIN_URL$endpoint")
    echo "${response_time}s"
done

echo ""

# Test 2: API Response Times
echo "Test 2: API Response Times"
echo "--------------------------"
echo -n "API Status command... "
response_time=$(curl -w "%{time_total}" -s -o /dev/null -X POST -H "Content-Type: application/json" -d '{"cmd":"status"}' "$THREADFIN_URL/api/")
echo "${response_time}s"

echo ""

# Test 3: Container resource usage
echo "Test 3: Container Resource Usage"
echo "--------------------------------"
docker stats threadfin-test --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}"

echo ""

# Test 4: Concurrent request handling
echo "Test 4: Concurrent Request Test"
echo "-------------------------------"
echo "Sending $CONCURRENT_CLIENTS concurrent requests to discovery endpoint..."

start_time=$(date +%s)
for i in $(seq 1 $CONCURRENT_CLIENTS); do
    curl -s -o /dev/null "$THREADFIN_URL/discover.json" &
done
wait
end_time=$(date +%s)
total_time=$((end_time - start_time))

echo "All $CONCURRENT_CLIENTS requests completed in ${total_time}s"

echo ""

# Test 5: Memory leak detection (basic)
echo "Test 5: Memory Usage Over Time"
echo "------------------------------"
echo "Monitoring memory usage over 30 seconds..."

initial_mem=$(docker stats threadfin-test --no-stream --format "{{.MemUsage}}" | cut -d'/' -f1)
echo "Initial memory: $initial_mem"

# Send requests continuously for 30 seconds
end_time=$(($(date +%s) + TEST_DURATION))
request_count=0
while [ $(date +%s) -lt $end_time ]; do
    curl -s -o /dev/null "$THREADFIN_URL/discover.json" &
    curl -s -o /dev/null -X POST -H "Content-Type: application/json" -d '{"cmd":"status"}' "$THREADFIN_URL/api/" &
    request_count=$((request_count + 2))
    sleep 0.1
done
wait

final_mem=$(docker stats threadfin-test --no-stream --format "{{.MemUsage}}" | cut -d'/' -f1)
echo "Final memory: $final_mem"
echo "Total requests sent: $request_count"

echo ""
echo "Performance test completed!"