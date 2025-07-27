# Threadfin Test Engineering Guide

## 🎯 Agent Context

This guide is designed for **Test Engineer Agents** working with the **Threadfin IPTV Proxy** application. Threadfin is a complex system that bridges IPTV sources with media servers, requiring comprehensive testing across multiple layers: backend API functionality, stream processing, web interface interactions, and integration with external services.

## 🧪 Testing Architecture Overview

### System Under Test
```
External IPTV Sources → Threadfin Proxy → Media Servers (Plex/Emby/Jellyfin)
         ↓                    ↓                      ↓
    M3U Playlists      Stream Processing         HDHomeRun Protocol
    XMLTV EPG Data     WebSocket API             DVR Integration
    Stream URLs        Web Interface             Live TV Delivery
```

### Testing Pyramid Structure
```
                    E2E Tests
                  ┌─────────────┐
                 │ Integration  │
               ┌─────────────────┐
              │  Component Tests │
            ┌─────────────────────┐
           │     Unit Tests       │
         ┌─────────────────────────┐
        │   Static Analysis       │
      └─────────────────────────────┘
```

## 🔍 Testing Scope & Strategy

### Core Testing Areas

#### 1. **Backend API Testing**
- **WebSocket Communication**: Real-time message handling
- **M3U Parsing**: Playlist format validation and processing
- **EPG Integration**: XMLTV data processing and channel mapping
- **Stream Proxying**: IPTV stream buffering and delivery
- **Authentication**: User session management and security
- **Configuration Management**: JSON persistence and validation

#### 2. **Frontend Interface Testing**
- **User Interface**: Component rendering and interaction
- **Real-time Updates**: WebSocket message handling
- **Form Validation**: Input sanitization and error handling
- **Responsive Design**: Multi-device compatibility
- **Accessibility**: Screen reader and keyboard navigation
- **Cross-browser Compatibility**: Modern browser support

#### 3. **Integration Testing**
- **External API Integration**: M3U and XMLTV source connectivity
- **Media Server Compatibility**: Plex/Emby/Jellyfin integration
- **HDHomeRun Protocol**: Tuner emulation and stream delivery
- **SSDP Discovery**: Network device discovery protocol
- **Stream Performance**: End-to-end streaming validation

#### 4. **System Testing**
- **Performance**: Load testing and stress testing
- **Security**: Authentication and authorization testing
- **Reliability**: Error handling and recovery testing
- **Scalability**: Multiple concurrent streams
- **Compatibility**: Operating system and platform testing

## 🛠️ Testing Framework Architecture

### Go Backend Testing (`src/`)

#### **Unit Test Structure**
```go
// Example test file: src/m3u_test.go
package main

import (
    "testing"
    "strings"
)

func TestM3UParser(t *testing.T) {
    tests := []struct {
        name     string
        input    string
        expected int
        wantErr  bool
    }{
        {
            name: "Valid M3U playlist",
            input: `#EXTM3U
#EXTINF:-1,Channel 1
http://example.com/stream1.m3u8
#EXTINF:-1,Channel 2
http://example.com/stream2.m3u8`,
            expected: 2,
            wantErr:  false,
        },
        {
            name:     "Invalid M3U format",
            input:    "Invalid content",
            expected: 0,
            wantErr:  true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            channels, err := parseM3UContent(tt.input)
            
            if (err != nil) != tt.wantErr {
                t.Errorf("parseM3UContent() error = %v, wantErr %v", err, tt.wantErr)
                return
            }
            
            if len(channels) != tt.expected {
                t.Errorf("parseM3UContent() got %v channels, want %v", len(channels), tt.expected)
            }
        })
    }
}
```

#### **Integration Test Pattern**
```go
// Example: src/webserver_integration_test.go
func TestWebSocketCommunication(t *testing.T) {
    // Setup test server
    server := startTestServer()
    defer server.Close()
    
    // Connect WebSocket client
    conn, err := websocket.Dial(server.URL+"/data/", "", "http://localhost/")
    if err != nil {
        t.Fatal("Failed to connect:", err)
    }
    defer conn.Close()
    
    // Test command execution
    command := WSCommand{
        Command: "getServerConfig",
        Data:    nil,
    }
    
    err = websocket.JSON.Send(conn, command)
    if err != nil {
        t.Fatal("Failed to send command:", err)
    }
    
    var response WSResponse
    err = websocket.JSON.Receive(conn, &response)
    if err != nil {
        t.Fatal("Failed to receive response:", err)
    }
    
    // Validate response
    if response.Status != "success" {
        t.Errorf("Expected success, got %s", response.Status)
    }
}
```

### Frontend Testing (`html/js/`, `ts/`)

#### **JavaScript Unit Testing Framework**
```javascript
// Example test file: html/js/test/menu_test.js
describe('Menu System', function() {
    beforeEach(function() {
        // Setup DOM for testing
        document.body.innerHTML = `
            <div id="content"></div>
            <div id="menu"></div>
        `;
        
        // Mock WebSocket
        global.WebSocket = jest.fn().mockImplementation(() => ({
            send: jest.fn(),
            close: jest.fn(),
            addEventListener: jest.fn()
        }));
    });

    describe('openThisMenu', function() {
        it('should load content for valid menu type', function() {
            // Arrange
            const menuType = 'playlists';
            const element = document.createElement('div');
            element.setAttribute('data-id', 'test-menu');
            
            // Mock data
            window.Data = {
                playlists: [
                    { id: '1', name: 'Test Playlist', url: 'http://test.m3u' }
                ]
            };
            
            // Act
            openThisMenu(menuType, element);
            
            // Assert
            const content = document.getElementById('content');
            expect(content.innerHTML).toContain('Test Playlist');
        });

        it('should handle invalid menu type gracefully', function() {
            // Arrange
            const menuType = 'invalid';
            const element = document.createElement('div');
            
            // Act & Assert
            expect(() => openThisMenu(menuType, element)).not.toThrow();
        });
    });
});
```

#### **TypeScript Testing Pattern**
```typescript
// Example: ts/test/configuration_test.ts
import { ChannelManager, ChannelData } from '../configuration_ts';

describe('ChannelManager', () => {
    let channelManager: ChannelManager;
    
    beforeEach(() => {
        channelManager = new ChannelManager();
        
        // Mock DOM elements
        document.body.innerHTML = '<div id="channel-list"></div>';
    });
    
    describe('addChannel', () => {
        it('should add valid channel successfully', () => {
            // Arrange
            const channel: ChannelData = {
                id: '1',
                name: 'Test Channel',
                url: 'http://example.com/stream.m3u8'
            };
            
            // Act
            channelManager.addChannel(channel);
            
            // Assert
            expect(channelManager.getChannelCount()).toBe(1);
            expect(channelManager.getChannel('1')).toEqual(channel);
        });
        
        it('should reject channel without required fields', () => {
            // Arrange
            const invalidChannel: ChannelData = {
                id: '1',
                name: '',
                url: 'http://example.com/stream.m3u8'
            };
            
            // Act & Assert
            expect(() => channelManager.addChannel(invalidChannel))
                .toThrow('Channel name and URL required');
        });
    });
});
```

## 🔄 End-to-End Testing Strategy

### E2E Test Framework Setup
```javascript
// Example: e2e/playwright.config.js
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',
    timeout: 30000,
    retries: 2,
    use: {
        baseURL: 'http://localhost:34400',
        headless: true,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure'
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] }
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] }
        },
        {
            name: 'mobile',
            use: { ...devices['iPhone 12'] }
        }
    ]
});
```

### E2E Test Scenarios
```javascript
// Example: e2e/tests/playlist_management.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Playlist Management', () => {
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto('/login.html');
        await page.fill('#username', 'admin');
        await page.fill('#password', 'password');
        await page.click('#login-button');
        
        // Wait for dashboard
        await page.waitForSelector('#content');
    });

    test('should add new M3U playlist', async ({ page }) => {
        // Navigate to playlists
        await page.click('[data-menu="playlists"]');
        await page.waitForSelector('#playlist-table');
        
        // Add new playlist
        await page.click('#add-playlist-button');
        await page.fill('#playlist-name', 'Test Playlist');
        await page.fill('#playlist-url', 'http://example.com/test.m3u');
        await page.click('#save-playlist-button');
        
        // Verify playlist appears in table
        await expect(page.locator('#playlist-table')).toContainText('Test Playlist');
    });

    test('should edit existing playlist', async ({ page }) => {
        // Navigate to playlists
        await page.click('[data-menu="playlists"]');
        await page.waitForSelector('#playlist-table');
        
        // Click on first playlist row
        await page.click('#playlist-table tbody tr:first-child');
        
        // Edit playlist name
        await page.fill('#playlist-name', 'Updated Playlist Name');
        await page.click('#save-playlist-button');
        
        // Verify update
        await expect(page.locator('#playlist-table')).toContainText('Updated Playlist Name');
    });

    test('should validate M3U URL format', async ({ page }) => {
        // Navigate to playlists
        await page.click('[data-menu="playlists"]');
        
        // Try to add invalid URL
        await page.click('#add-playlist-button');
        await page.fill('#playlist-name', 'Invalid Playlist');
        await page.fill('#playlist-url', 'invalid-url');
        await page.click('#save-playlist-button');
        
        // Verify error message
        await expect(page.locator('.error-message')).toContainText('Invalid URL format');
    });
});
```

## 📊 Performance Testing

### Load Testing Framework
```javascript
// Example: performance/k6_load_test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export let errorRate = new Rate('errors');

export let options = {
    stages: [
        { duration: '2m', target: 10 }, // Ramp up
        { duration: '5m', target: 50 }, // Stay at 50 users
        { duration: '2m', target: 0 },  // Ramp down
    ],
    thresholds: {
        errors: ['rate<0.1'], // Error rate should be less than 10%
        http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    },
};

export default function() {
    // Test stream request
    let streamResponse = http.get('http://localhost:34400/stream/1');
    check(streamResponse, {
        'stream status is 200': (r) => r.status === 200,
        'stream response time < 500ms': (r) => r.timings.duration < 500,
    }) || errorRate.add(1);

    // Test WebSocket connection
    let wsResponse = http.get('http://localhost:34400/data/', {
        headers: { 'Upgrade': 'websocket' }
    });
    check(wsResponse, {
        'websocket upgrade successful': (r) => r.status === 101,
    }) || errorRate.add(1);

    sleep(1);
}
```

### Stream Performance Testing
```go
// Example: performance/stream_test.go
func TestStreamPerformance(t *testing.T) {
    const (
        numConcurrentStreams = 10
        testDuration        = 30 * time.Second
    )

    var wg sync.WaitGroup
    errors := make(chan error, numConcurrentStreams)
    
    start := time.Now()
    
    for i := 0; i < numConcurrentStreams; i++ {
        wg.Add(1)
        go func(streamID int) {
            defer wg.Done()
            
            streamURL := fmt.Sprintf("http://localhost:34400/stream/%d", streamID)
            
            for time.Since(start) < testDuration {
                resp, err := http.Get(streamURL)
                if err != nil {
                    errors <- err
                    return
                }
                
                if resp.StatusCode != 200 {
                    errors <- fmt.Errorf("stream %d returned status %d", streamID, resp.StatusCode)
                    return
                }
                
                resp.Body.Close()
                time.Sleep(1 * time.Second)
            }
        }(i)
    }
    
    wg.Wait()
    close(errors)
    
    // Check for errors
    for err := range errors {
        t.Errorf("Stream error: %v", err)
    }
}
```

## 🔒 Security Testing

### Authentication Testing
```javascript
// Example: security/auth_test.js
describe('Authentication Security', () => {
    test('should prevent unauthorized access', async ({ page }) => {
        // Try to access protected page without login
        const response = await page.goto('/configuration.html');
        expect(response.status()).toBe(401);
    });

    test('should handle SQL injection attempts', async ({ page }) => {
        await page.goto('/login.html');
        
        // Try SQL injection in username field
        await page.fill('#username', "admin'; DROP TABLE users; --");
        await page.fill('#password', 'password');
        await page.click('#login-button');
        
        // Should show invalid credentials, not crash
        await expect(page.locator('.error-message')).toContainText('Invalid credentials');
    });

    test('should enforce session timeout', async ({ page }) => {
        // Login successfully
        await page.goto('/login.html');
        await page.fill('#username', 'admin');
        await page.fill('#password', 'password');
        await page.click('#login-button');
        
        // Wait for session timeout (mock by clearing cookies)
        await page.context().clearCookies();
        
        // Try to access protected resource
        const response = await page.goto('/configuration.html');
        expect(response.status()).toBe(401);
    });
});
```

### Input Validation Testing
```go
// Example: security/validation_test.go
func TestInputValidation(t *testing.T) {
    tests := []struct {
        name     string
        input    string
        expected bool
    }{
        {"Valid M3U URL", "http://example.com/playlist.m3u", true},
        {"XSS attempt", "<script>alert('xss')</script>", false},
        {"SQL injection", "'; DROP TABLE channels; --", false},
        {"Path traversal", "../../../etc/passwd", false},
        {"Oversized input", strings.Repeat("a", 10000), false},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            valid := validateUserInput(tt.input)
            if valid != tt.expected {
                t.Errorf("validateUserInput(%s) = %v, want %v", tt.name, valid, tt.expected)
            }
        })
    }
}
```

## 🌐 Cross-Platform Testing

### Browser Compatibility Matrix
```javascript
// Example: compatibility/browser_test_matrix.js
const browsers = [
    { name: 'Chrome', version: 'latest' },
    { name: 'Firefox', version: 'latest' },
    { name: 'Safari', version: 'latest' },
    { name: 'Edge', version: 'latest' },
    { name: 'Chrome Mobile', version: 'latest' },
    { name: 'Safari Mobile', version: 'latest' }
];

const features = [
    'websocket-connection',
    'form-validation',
    'responsive-layout',
    'media-playback',
    'local-storage'
];

browsers.forEach(browser => {
    describe(`${browser.name} ${browser.version}`, () => {
        features.forEach(feature => {
            test(`should support ${feature}`, async ({ page }) => {
                // Test feature compatibility
                await testFeatureSupport(page, feature);
            });
        });
    });
});
```

### Operating System Testing
```bash
#!/bin/bash
# Example: compatibility/os_test_runner.sh

OS_MATRIX=(
    "ubuntu:20.04"
    "ubuntu:22.04"
    "debian:11"
    "centos:8"
    "alpine:latest"
    "windows:latest"
    "macos:latest"
)

for os in "${OS_MATRIX[@]}"; do
    echo "Testing on $os"
    
    # Build for target OS
    GOOS=$(echo $os | cut -d: -f1) go build -o threadfin-$os threadfin.go
    
    # Run basic functionality tests
    docker run --rm -v $(pwd):/app $os /app/test_basic_functionality.sh
done
```

## 📋 Test Data Management

### Test Data Fixtures
```go
// Example: testdata/fixtures.go
package testdata

var SampleM3UPlaylist = `#EXTM3U
#EXTINF:-1 tvg-id="channel1" tvg-logo="http://example.com/logo1.png",Channel 1
http://example.com/stream1.m3u8
#EXTINF:-1 tvg-id="channel2" tvg-logo="http://example.com/logo2.png",Channel 2
http://example.com/stream2.m3u8`

var SampleXMLTVData = `<?xml version="1.0" encoding="UTF-8"?>
<tv>
    <channel id="channel1">
        <display-name>Channel 1</display-name>
    </channel>
    <programme start="20240101120000 +0000" stop="20240101130000 +0000" channel="channel1">
        <title>Test Program</title>
        <desc>Test program description</desc>
    </programme>
</tv>`

var TestConfiguration = map[string]interface{}{
    "port": 34400,
    "authentication": true,
    "buffer": map[string]interface{}{
        "size": "1MB",
        "timeout": 30,
    },
}
```

### Mock Data Generators
```javascript
// Example: testdata/mock_generators.js
class MockDataGenerator {
    static generatePlaylist(channelCount = 10) {
        const channels = [];
        for (let i = 1; i <= channelCount; i++) {
            channels.push({
                id: `channel${i}`,
                name: `Test Channel ${i}`,
                url: `http://example.com/stream${i}.m3u8`,
                logo: `http://example.com/logo${i}.png`
            });
        }
        return channels;
    }

    static generateEPGData(channelId, dayCount = 7) {
        const programs = [];
        const startDate = new Date();
        
        for (let day = 0; day < dayCount; day++) {
            for (let hour = 0; hour < 24; hour++) {
                const programStart = new Date(startDate);
                programStart.setDate(startDate.getDate() + day);
                programStart.setHours(hour);
                
                programs.push({
                    channelId: channelId,
                    title: `Program ${hour}:00`,
                    description: `Test program at ${hour}:00`,
                    start: programStart.toISOString(),
                    duration: 3600000 // 1 hour in milliseconds
                });
            }
        }
        return programs;
    }
}
```

## 🔧 Continuous Integration Testing

### GitHub Actions Workflow
```yaml
# Example: .github/workflows/test.yml
name: Comprehensive Testing

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Go
      uses: actions/setup-go@v3
      with:
        go-version: 1.19
    
    - name: Run unit tests
      run: |
        go test -v -race -coverprofile=coverage.out ./...
        go tool cover -html=coverage.out -o coverage.html
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: |
        cd ts/
        npm install
    
    - name: Run TypeScript tests
      run: |
        cd ts/
        npm test
    
    - name: Build JavaScript
      run: |
        cd ts/
        ./compileJS.sh

  e2e-tests:
    runs-on: ubuntu-latest
    services:
      threadfin:
        image: threadfin:test
        ports:
          - 34400:34400
    steps:
    - uses: actions/checkout@v3
    
    - name: Install Playwright
      run: |
        npm install @playwright/test
        npx playwright install
    
    - name: Run E2E tests
      run: |
        npx playwright test

  security-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Run security scan
      uses: securecodewarrior/github-action-add-sarif@v1
      with:
        sarif-file: 'security-results.sarif'
    
    - name: Run dependency check
      run: |
        go list -json -m all | nancy sleuth
```

## 🎯 Test Engineer Agent Workflow

When working as a test engineer agent on this codebase:

### 1. **Requirement Analysis**
- Understand the feature/change being tested
- Identify test scenarios and edge cases
- Determine appropriate testing levels (unit, integration, E2E)
- Assess security and performance implications

### 2. **Test Design**
- Create test cases based on user stories
- Design test data and mock scenarios
- Plan for positive and negative test cases
- Consider accessibility and cross-platform requirements

### 3. **Test Implementation**
- Write unit tests for backend Go code
- Create frontend tests for TypeScript/JavaScript
- Implement integration tests for API endpoints
- Develop E2E tests for user workflows

### 4. **Test Execution & Monitoring**
- Run tests in CI/CD pipeline
- Monitor test results and coverage metrics
- Investigate and report test failures
- Maintain test environment stability

### 5. **Quality Assurance**
- Verify test coverage meets standards (>80%)
- Ensure test reliability and consistency
- Document test procedures and findings
- Update test cases for new features

### Key Testing Principles for Threadfin
- **Comprehensive Coverage**: Test all critical user journeys
- **Real-world Scenarios**: Use actual M3U playlists and XMLTV data
- **Performance Validation**: Ensure stream quality under load
- **Security First**: Validate authentication and input sanitization
- **Cross-platform Compatibility**: Test on multiple OS and browsers

This testing architecture ensures robust quality assurance for the Threadfin IPTV proxy system, covering all aspects from unit testing to end-to-end validation while maintaining high performance and security standards. 