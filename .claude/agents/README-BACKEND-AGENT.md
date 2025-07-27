# Threadfin Backend Engineering Guide

## 🎯 Agent Context

This guide is designed for backend engineer agents working with the **Threadfin IPTV Proxy** codebase. Threadfin acts as a middleware layer between IPTV sources and media servers (Plex/Emby/Jellyfin), providing stream processing, EPG integration, and HDHomeRun protocol emulation.

## 🏗️ Backend Architecture Overview

### Core Service Layer
```
threadfin.go (main)
├── webserver.go      → HTTP/WebSocket server + routing
├── authentication.go → User management + sessions
├── m3u.go           → M3U playlist parsing + processing
├── xepg.go          → XMLTV EPG data handling
├── hdhr.go          → HDHomeRun protocol emulation
├── buffer.go        → Stream buffering + caching
└── data.go          → Data persistence + WebSocket commands
```

### Key Backend Components

#### 1. **Web Server (`src/webserver.go`)**
- **HTTP Server**: Native Go `net/http` with custom routing
- **WebSocket Handler**: Real-time client communication via `/data/` endpoint
- **Static File Serving**: HTML/CSS/JS assets from `html/` directory
- **API Endpoints**: RESTful endpoints for configuration management

**Critical Functions:**
- `startWebserver()`: Server initialization and routing setup
- `WS()`: WebSocket message handler and command dispatcher
- `authentication()`: Middleware for request authentication

#### 2. **Data Management (`src/data.go`)**
- **Configuration Persistence**: JSON file storage in `threadfin-conf/`
- **WebSocket Commands**: Client-server communication protocol
- **Data Validation**: Input sanitization and validation

**Key WebSocket Commands:**
- `getServerConfig`: Returns complete server configuration
- `saveXEpgMapping`: Persists channel mapping changes
- `getLocalData`: Retrieves specific data types (playlists, mappings)
- `updateServerConfig`: Updates server settings

#### 3. **M3U Processing (`src/m3u.go`)**
- **Playlist Parsing**: Extracts channel information from M3U files
- **Stream URL Processing**: Handles various stream formats and protocols
- **Channel Filtering**: Selective channel inclusion/exclusion logic

#### 4. **EPG Integration (`src/xepg.go`)**
- **XMLTV Parsing**: Processes electronic program guide data
- **Channel Mapping**: Links EPG data to M3U channels
- **Time Zone Handling**: Converts program times for media servers

#### 5. **HDHomeRun Emulation (`src/hdhr.go`)**
- **Protocol Compatibility**: Emulates HDHomeRun tuner for media servers
- **Device Discovery**: SSDP protocol implementation
- **Stream Endpoints**: Provides tuner-compatible stream URLs

## 🔧 Development Patterns

### Configuration Management
```go
// Configuration files are stored as JSON in threadfin-conf/
type Settings struct {
    Files  FilesStruct  `json:"files"`
    Buffer BufferStruct `json:"buffer"`
    // ... other config fields
}

// Load configuration
func loadSettings() error {
    data, err := readFromFile("threadfin-conf/settings.json")
    if err != nil {
        return err
    }
    return json.Unmarshal(data, &Settings)
}
```

### WebSocket Communication Pattern
```go
// WebSocket command structure
type WSCommand struct {
    Command string      `json:"command"`
    Data    interface{} `json:"data,omitempty"`
}

// Command handler in webserver.go WS() function
switch command {
case "getServerConfig":
    response := createServerConfigResponse()
    sendWebSocketResponse(conn, response)
case "saveXEpgMapping":
    err := saveXEpgMapping(data)
    sendWebSocketAck(conn, err)
}
```

### Data Validation Pattern
```go
// Input validation example from data.go
func validateChannelData(channel ChannelStruct) error {
    if len(channel.Name) == 0 {
        return errors.New("channel name required")
    }
    if !isValidURL(channel.URL) {
        return errors.New("invalid stream URL")
    }
    return nil
}
```

## 📁 File Structure & Responsibilities

### Core Backend Files (`src/`)
```
authentication.go    → User accounts, login, session management
backup.go           → Configuration backup and restore
buffer.go           → Stream buffering and caching logic
compression.go      → Data compression utilities
config.go           → Configuration loading and validation
data.go             → Core data operations and WebSocket handlers
hdhr.go             → HDHomeRun protocol implementation
html-build.go       → HTML template processing
images.go           → Image caching and processing
info.go             → System information and diagnostics
m3u.go              → M3U playlist parsing and processing
maintenance.go      → System maintenance operations
provider.go         → External provider integration
screen.go           → Screen/display utilities
ssdp.go             → SSDP device discovery
system.go           → System-level operations
toolchain.go        → Development and build tools
update.go           → Auto-update functionality
webserver.go        → HTTP server and routing
webUI.go            → Web UI integration
xepg.go             → XMLTV EPG processing
```

### Data Structures (`src/struct-*.go`)
```
struct-buffer.go     → Buffer and stream structures
struct-hdhr.go      → HDHomeRun protocol structures
struct-system.go    → System configuration structures
struct-webserver.go → Web server and request structures
struct-xml.go       → XML/XMLTV data structures
```

### Configuration Directory (`threadfin-conf/`)
```
settings.json       → Global application settings
authentication.json → User accounts and permissions
urls.json          → M3U playlist URLs and XMLTV sources
xepg.json          → Channel mappings and EPG configuration
pms.json           → Media server (Plex/Emby) settings
backup/            → Automatic configuration backups
cache/             → Runtime cache storage
data/              → Application data storage
```

## 🔄 Key Backend Workflows

### 1. **Server Initialization Flow**
```go
// In threadfin.go main()
1. loadSettings()           → Load configuration from JSON files
2. initializeComponents()   → Setup M3U parser, EPG handler, etc.
3. startWebserver()        → Start HTTP server and WebSocket endpoint
4. initializeSSDP()        → Start HDHomeRun device discovery
```

### 2. **M3U Processing Workflow**
```go
// In m3u.go
1. parseM3UFile(url)       → Download and parse M3U playlist
2. extractChannelInfo()    → Extract channel metadata
3. validateStreamURLs()    → Test stream accessibility
4. updateChannelList()     → Update internal channel database
```

### 3. **EPG Integration Workflow**
```go
// In xepg.go
1. downloadXMLTV(url)      → Fetch XMLTV file
2. parseEPGData()          → Extract program information
3. mapChannelsToEPG()      → Link channels to program data
4. convertTimeZones()      → Adjust times for media server
```

### 4. **Stream Request Handling**
```go
// In hdhr.go and buffer.go
1. receiveStreamRequest()  → HDHomeRun protocol request
2. resolveChannelURL()     → Map channel to actual stream URL
3. initializeBuffer()      → Setup stream buffering
4. proxyStreamData()       → Forward stream to media server
```

## 🛠️ Development Guidelines

### Code Organization Principles
- **Single Responsibility**: Each Go file handles one major functional area
- **Configuration Driven**: Behavior controlled through JSON configuration files
- **Error Handling**: Comprehensive error checking with graceful degradation
- **Logging**: Extensive logging for debugging and monitoring

### WebSocket Command Development
When adding new WebSocket commands:

1. **Define Command Structure** in `src/data.go`
2. **Add Handler Logic** in `webserver.go` `WS()` function
3. **Implement Data Processing** in appropriate service file
4. **Update Frontend** to send/receive new command

### Adding New M3U Providers
To support new M3U playlist formats:

1. **Extend Parser Logic** in `src/m3u.go`
2. **Add Format Detection** for new playlist types
3. **Update Channel Mapping** in `src/xepg.go` if needed
4. **Test with Sample Files** in development environment

### EPG Data Source Integration
For new XMLTV sources:

1. **Extend XMLTV Parser** in `src/xepg.go`
2. **Add Time Zone Handling** for different regions
3. **Implement Channel Matching** algorithms
4. **Update Configuration Schema** in relevant struct files

## 🔍 Debugging and Monitoring

### Logging Strategy
- **Application Logs**: Comprehensive logging throughout codebase
- **Error Tracking**: Detailed error messages with context
- **Performance Metrics**: Stream performance and buffer statistics

### Common Debug Points
- **WebSocket Communication**: Check `WS()` function in `webserver.go`
- **M3U Parsing Issues**: Debug in `m3u.go` parsing functions
- **Stream Buffering**: Monitor buffer performance in `buffer.go`
- **EPG Mapping**: Verify channel mapping logic in `xepg.go`

### Configuration Troubleshooting
```bash
# Check configuration files
ls -la threadfin-conf/
cat threadfin-conf/settings.json | jq

# Verify stream connectivity
curl -I "http://localhost:34400/stream/channel123"

# Test HDHomeRun discovery
curl "http://localhost:34400/hdhr/discover.json"
```

## 🧪 Testing Approach

### Unit Testing Areas
- **M3U Parser**: Test with various playlist formats
- **EPG Mapping**: Verify channel matching algorithms
- **Configuration Loading**: Test JSON parsing and validation
- **Stream Processing**: Test buffer management and stream proxying

### Integration Testing
- **WebSocket Communication**: Test client-server message flow
- **HDHomeRun Protocol**: Verify media server compatibility
- **End-to-End Streaming**: Test complete stream delivery pipeline

### Test Data Requirements
- **Sample M3U Files**: Various format examples in `src/internal/m3u-parser/`
- **XMLTV Test Data**: EPG data samples for parser testing
- **Configuration Examples**: Valid/invalid configuration test cases

## 🚀 Deployment Considerations

### Build Process
```bash
# Local development build
go build -o threadfin threadfin.go

# Docker multi-architecture build
docker buildx build --platform linux/amd64,linux/arm64 .
```

### Environment Variables
- **Configuration Path**: `THREADFIN_CONF` for custom config directory
- **Port Configuration**: `THREADFIN_PORT` for custom web server port
- **Debug Mode**: `THREADFIN_DEBUG` for enhanced logging

### Performance Tuning
- **Buffer Size**: Adjust stream buffer sizes in `settings.json`
- **Connection Limits**: Configure max concurrent streams
- **Cache Settings**: Tune image and data cache parameters

## 🔐 Security Considerations

### Authentication Flow
- **Session Management**: JWT-based session tokens
- **Password Security**: Bcrypt hashing for stored passwords
- **Access Control**: Role-based permission system

### Network Security
- **HTTPS Support**: TLS configuration for secure connections
- **CORS Handling**: Cross-origin request security
- **Stream Security**: Secure stream URL generation and validation

## 📊 Performance Optimization

### Critical Performance Areas
- **Stream Buffering**: Efficient memory management for concurrent streams
- **EPG Processing**: Optimized XMLTV parsing and channel matching
- **WebSocket Performance**: Efficient message serialization and handling
- **Cache Management**: Intelligent caching for images and configuration data

### Monitoring Metrics
- **Stream Performance**: Buffer utilization and stream quality
- **Memory Usage**: Go garbage collection and memory allocation
- **Response Times**: WebSocket command processing times
- **Error Rates**: Failed stream requests and parsing errors

---

## 🎯 Agent Development Workflow

When working as a backend engineer agent on this codebase:

1. **Understand the Request**: Identify which backend component needs modification
2. **Locate Relevant Code**: Use the file structure guide to find appropriate files
3. **Follow Patterns**: Maintain existing code patterns and conventions
4. **Test Changes**: Verify functionality with appropriate test methods
5. **Update Configuration**: Modify JSON schemas if needed
6. **Document Changes**: Update relevant documentation and comments

This codebase uses a modular, configuration-driven architecture that makes it well-suited for incremental improvements and feature additions while maintaining stability and performance. 