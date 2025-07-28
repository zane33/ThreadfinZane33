#!/usr/bin/env node

// WebSocket Connection Stability Test for Threadfin
// Tests the fixes for WebSocket reconnection and error handling

const WebSocket = require('ws');

const TEST_CONFIG = {
    url: 'ws://localhost:34400/data/',
    maxConnections: 10,
    testDuration: 30000, // 30 seconds
    reconnectTest: true,
    stressTest: true
};

let testResults = {
    connectionAttempts: 0,
    successfulConnections: 0,
    failedConnections: 0,
    reconnectAttempts: 0,
    averageConnectionTime: 0,
    errors: [],
    warnings: []
};

function logTest(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
        'info': 'ℹ️ ',
        'success': '✅',
        'error': '❌',
        'warning': '⚠️ '
    }[type] || 'ℹ️ ';
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
}

function createWebSocketConnection(testName, connectionId = 1) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        testResults.connectionAttempts++;
        
        logTest(`${testName} - Attempting connection ${connectionId}...`);
        
        try {
            const ws = new WebSocket(TEST_CONFIG.url);
            let connectionEstablished = false;
            
            // Set timeout for connection
            const timeout = setTimeout(() => {
                if (!connectionEstablished) {
                    testResults.failedConnections++;
                    testResults.errors.push(`${testName} - Connection ${connectionId} timeout`);
                    reject(new Error('Connection timeout'));
                }
            }, 10000);
            
            ws.on('open', () => {
                connectionEstablished = true;
                clearTimeout(timeout);
                
                const connectionTime = Date.now() - startTime;
                testResults.successfulConnections++;
                testResults.averageConnectionTime = 
                    (testResults.averageConnectionTime + connectionTime) / testResults.successfulConnections;
                
                logTest(`${testName} - Connection ${connectionId} established in ${connectionTime}ms`, 'success');
                
                // Send a test command
                const testCommand = JSON.stringify({ cmd: 'getServerConfig' });
                ws.send(testCommand);
                
                // Close after a brief period
                setTimeout(() => {
                    ws.close();
                    resolve({
                        connectionId,
                        connectionTime,
                        success: true
                    });
                }, 1000);
            });
            
            ws.on('message', (data) => {
                try {
                    const response = JSON.parse(data);
                    logTest(`${testName} - Connection ${connectionId} received response: ${Object.keys(response).join(', ')}`);
                } catch (e) {
                    testResults.warnings.push(`${testName} - Connection ${connectionId} received invalid JSON`);
                }
            });
            
            ws.on('error', (error) => {
                connectionEstablished = true; // Prevent timeout from also firing
                clearTimeout(timeout);
                testResults.failedConnections++;
                testResults.errors.push(`${testName} - Connection ${connectionId} error: ${error.message}`);
                logTest(`${testName} - Connection ${connectionId} error: ${error.message}`, 'error');
                reject(error);
            });
            
            ws.on('close', (code, reason) => {
                logTest(`${testName} - Connection ${connectionId} closed (code: ${code}, reason: ${reason || 'none'})`);
            });
            
        } catch (error) {
            testResults.failedConnections++;
            testResults.errors.push(`${testName} - Connection ${connectionId} setup error: ${error.message}`);
            logTest(`${testName} - Connection ${connectionId} setup error: ${error.message}`, 'error');
            reject(error);
        }
    });
}

async function testBasicConnectivity() {
    logTest('🔍 Testing Basic WebSocket Connectivity...');
    
    try {
        await createWebSocketConnection('BasicConnectivity');
        logTest('Basic connectivity test passed', 'success');
        return true;
    } catch (error) {
        logTest(`Basic connectivity test failed: ${error.message}`, 'error');
        return false;
    }
}

async function testMultipleConnections() {
    logTest('🔗 Testing Multiple Simultaneous Connections...');
    
    const promises = [];
    for (let i = 1; i <= TEST_CONFIG.maxConnections; i++) {
        promises.push(
            createWebSocketConnection('MultipleConnections', i)
                .catch(error => ({ connectionId: i, success: false, error: error.message }))
        );
    }
    
    try {
        const results = await Promise.all(promises);
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        logTest(`Multiple connections test: ${successful} successful, ${failed} failed`, 
               failed === 0 ? 'success' : 'warning');
        return { successful, failed };
    } catch (error) {
        logTest(`Multiple connections test error: ${error.message}`, 'error');
        return { successful: 0, failed: TEST_CONFIG.maxConnections };
    }
}

async function testReconnectionLogic() {
    logTest('🔄 Testing Reconnection Logic...');
    
    // This test would ideally simulate network interruptions
    // For now, we'll test rapid connect/disconnect cycles
    
    try {
        for (let i = 1; i <= 5; i++) {
            await createWebSocketConnection('ReconnectionTest', i);
            // Small delay between connections
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        logTest('Reconnection logic test completed', 'success');
        return true;
    } catch (error) {
        logTest(`Reconnection logic test error: ${error.message}`, 'error');
        return false;
    }
}

async function testStressConditions() {
    logTest('💪 Testing Stress Conditions...');
    
    // Test rapid connection creation and destruction
    const rapidConnections = [];
    
    try {
        for (let i = 1; i <= 20; i++) {
            rapidConnections.push(
                createWebSocketConnection('StressTest', i)
                    .catch(error => ({ connectionId: i, success: false, error: error.message }))
            );
        }
        
        const results = await Promise.all(rapidConnections);
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        logTest(`Stress test: ${successful} successful, ${failed} failed out of 20 rapid connections`,
               failed <= 5 ? 'success' : 'warning'); // Allow some failures under stress
        
        return { successful, failed };
    } catch (error) {
        logTest(`Stress test error: ${error.message}`, 'error');
        return { successful: 0, failed: 20 };
    }
}

function generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 WEBSOCKET STABILITY TEST REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n📈 Connection Statistics:`);
    console.log(`  • Total Attempts: ${testResults.connectionAttempts}`);
    console.log(`  • Successful: ${testResults.successfulConnections}`);
    console.log(`  • Failed: ${testResults.failedConnections}`);
    console.log(`  • Success Rate: ${Math.round((testResults.successfulConnections / testResults.connectionAttempts) * 100)}%`);
    console.log(`  • Average Connection Time: ${Math.round(testResults.averageConnectionTime)}ms`);
    
    if (testResults.errors.length > 0) {
        console.log(`\n🚨 Errors (${testResults.errors.length}):`);
        testResults.errors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error}`);
        });
    }
    
    if (testResults.warnings.length > 0) {
        console.log(`\n⚠️  Warnings (${testResults.warnings.length}):`);
        testResults.warnings.forEach((warning, index) => {
            console.log(`  ${index + 1}. ${warning}`);
        });
    }
    
    // Assessment
    const successRate = (testResults.successfulConnections / testResults.connectionAttempts) * 100;
    const avgTime = testResults.averageConnectionTime;
    
    console.log(`\n🎯 Assessment:`);
    if (successRate >= 95 && avgTime < 3000) {
        console.log(`✅ EXCELLENT - WebSocket stability is very good`);
    } else if (successRate >= 80 && avgTime < 5000) {
        console.log(`✅ GOOD - WebSocket stability is acceptable`);
    } else if (successRate >= 60) {
        console.log(`⚠️  FAIR - WebSocket stability has some issues`);
    } else {
        console.log(`❌ POOR - WebSocket stability needs improvement`);
    }
    
    console.log(`\n🔧 Recommendations:`);
    if (testResults.failedConnections > testResults.successfulConnections * 0.2) {
        console.log(`  • Review connection timeout settings`);
        console.log(`  • Check server capacity and connection limits`);
    }
    if (testResults.averageConnectionTime > 3000) {
        console.log(`  • Optimize connection handshake process`);
        console.log(`  • Check network latency and server response time`);
    }
    if (testResults.errors.length > testResults.connectionAttempts * 0.1) {
        console.log(`  • Review error handling and retry logic`);
        console.log(`  • Check server logs for connection issues`);
    }
    
    console.log('\n' + '='.repeat(60));
}

async function runAllTests() {
    logTest('🚀 Starting WebSocket Stability Tests...');
    logTest(`Test Configuration: ${JSON.stringify(TEST_CONFIG)}`);
    
    const startTime = Date.now();
    
    try {
        // Test 1: Basic Connectivity
        const basicTest = await testBasicConnectivity();
        if (!basicTest) {
            logTest('Basic connectivity failed - aborting further tests', 'error');
            return;
        }
        
        // Test 2: Multiple Connections
        await testMultipleConnections();
        
        // Test 3: Reconnection Logic
        if (TEST_CONFIG.reconnectTest) {
            await testReconnectionLogic();
        }
        
        // Test 4: Stress Conditions
        if (TEST_CONFIG.stressTest) {
            await testStressConditions();
        }
        
        const totalTime = Date.now() - startTime;
        logTest(`All tests completed in ${totalTime}ms`, 'success');
        
    } catch (error) {
        logTest(`Test suite error: ${error.message}`, 'error');
    } finally {
        generateReport();
    }
}

// Check if WebSocket module is available
if (typeof WebSocket === 'undefined') {
    console.log('❌ WebSocket module not available. Install with: npm install ws');
    console.log('Or run this test in a browser environment.');
    process.exit(1);
}

// Run tests
runAllTests().catch(error => {
    console.error('Critical test error:', error);
    process.exit(1);
});