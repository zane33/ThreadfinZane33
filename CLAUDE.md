# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ThreadfinZane33 is a fork of Threadfin - an M3U Proxy for Plex DVR and Emby/Jellyfin Live TV, originally based on xTeVe. This is an IPTV proxy server written in Go that enables:

- M3U playlist processing and proxying
- XMLTV EPG handling
- Stream buffering and re-streaming 
- Channel mapping and filtering
- Multi-tuner support with stream isolation
- Provider fallback mechanisms for reliability

## Core Architecture

### Main Components

**Entry Point**: `threadfin.go` - Main executable that initializes the system and starts the web server
**Core System**: `src/system.go` - System initialization, settings management, folder/file creation
**Web Server**: `src/webserver.go` - HTTP handlers for streaming, web UI, API, and WebSocket communication
**Stream Buffer**: `src/buffer.go` - Handles stream buffering with FFmpeg/VLC and client connection management
**Data Management**: `src/data.go` - Database operations, M3U/XMLTV parsing, channel mapping
**Authentication**: `src/internal/authentication/` - User authentication and token management

### Key Data Structures

- **StreamInfo**: Contains streaming URL, backup channels, playlist ID, and channel metadata
- **Playlist**: Manages client connections and buffer information per playlist
- **Settings**: Global configuration loaded from JSON files in config folder
- **System**: Runtime system information and folder paths

### Stream Processing Flow

1. Client requests stream via `/stream/{urlID}`
2. `Stream()` handler in webserver.go retrieves StreamInfo from cache
3. Buffer type determined (direct passthrough "-", "threadfin", "ffmpeg", "vlc")
4. For buffered streams, `bufferingStream()` in buffer.go handles transcoding/proxying
5. Client connections tracked per tuner with optional isolation ("1 Request per Tuner")

### Configuration System

- Settings stored in JSON files in config folder (settings.json, authentication.json, etc.)
- Default values set in `loadSettings()` in system.go
- Container detection affects default bindings and auto-update behavior
- Settings can be overridden via command-line flags

## Development Commands

### Build from Source
```bash
# Install dependencies
go mod tidy && go mod vendor

# Standard build
go build threadfin.go

# Development mode (uses local web files)
go build threadfin.go
./threadfin -dev
```

### TypeScript Compilation
```bash
# Compile TypeScript files
cd ts/
tsc -p ./tsconfig.json
# or use the shell script
./compileJS.sh
```

### Docker Development
```bash
# Local build using provided scripts
# Windows:
build-local.bat
# PowerShell:
.\build-local.ps1

# Manual Docker build
docker build -t threadfinzane33:latest .

# Use local compose file
docker-compose -f docker-compose.local.yml up -d
```

### Running in Development Mode
```bash
# Enable development mode - uses local web files instead of embedded
./threadfin -dev

# Set custom config folder
./threadfin -config /path/to/config

# Custom port and bind address  
./threadfin -port 8080 -bind 192.168.1.100

# Set debug level (0-3)
./threadfin -debug 2

# Switch Git branch for updates
./threadfin -branch beta
```

## Important File Locations

### Source Code Structure
- `src/` - Core Go application code
- `html/` - Web UI files (HTML, CSS, JavaScript)
- `ts/` - TypeScript source files (compiled to html/js/)
- `vendor/` - Go module dependencies

### Runtime Directories  
- `threadfin-conf/` - Configuration files and data
- `threadfin-conf/cache/` - Image cache
- `threadfin-conf/backup/` - System backups
- `threadfin-conf/data/` - Generated M3U/XMLTV files

### Configuration Files
- `settings.json` - Main application settings
- `authentication.json` - User accounts and permissions  
- `pms.json` - Plex Media Server configuration
- `xepg.json` - EPG channel mapping
- `urls.json` - Cached streaming URLs

## Key Features for Development

### Stream Isolation
- "1 Request per Tuner" setting ensures each stream gets dedicated tuner slot
- Prevents conflicts when multiple clients access same channel
- Configured in Settings → Streaming

### Provider Reliability
- Automatic fallback to cached M3U/XMLTV when providers are unavailable
- Connection retry with exponential backoff
- Real-time provider health monitoring

### Buffer Management  
- RAM-based buffering system using virtual filesystem (memfs)
- Support for FFmpeg and VLC transcoding
- M3U8 streams forced to MPEG-TS for Plex compatibility
- Automatic RTSP/RTP detection with passthrough

### Authentication System
- Token-based authentication for Web UI and API
- User authorization levels (web, api, pms, m3u, xmltv)
- Cookie and header-based token validation

## Testing and Quality

The codebase does not appear to have formal test commands configured. Test manually by:

1. Running the application in development mode: `./threadfin -dev`
2. Accessing web interface at `http://localhost:34400/web/`
3. Testing stream functionality with actual IPTV providers
4. Verifying Docker builds work correctly

## Fork-Specific Information

This is a fork of the original Threadfin project with custom modifications. The GitHub configuration points to `zane33/ThreadfinZane33` to prevent conflicts with upstream updates. Auto-updates are disabled in Docker environments.

## Common Development Patterns

- Error handling uses `ShowError(err, errorCode)` for consistent logging
- WebSocket communication in `WS()` handler for real-time UI updates  
- Mutex locks (`systemMutex`) protect concurrent access to Settings
- Debug output controlled by debug level flags
- JSON marshaling/unmarshaling for configuration persistence