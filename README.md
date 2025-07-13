<div align="center" style="background-color: #111; padding: 100;">
    <a href="https://github.com/Threadfin/Threadfin"><img width="285" height="80" src="html/img/threadfin.png" alt="Threadfin" /></a>
</div>
<br>

# ThreadfinZane33
## M3U Proxy for Plex DVR and Emby/Jellyfin Live TV. Based on xTeVe.

**This is a fork of [Threadfin](https://github.com/Threadfin/Threadfin) with custom modifications.**

You can follow the old xTeVe documentation for now until I update it for Threadfin. Documentation for setup and configuration is [here](https://github.com/xteve-project/xTeVe-Documentation/blob/master/en/configuration.md).

### Original Threadfin Support
- [Discord](https://discord.gg/CNaSkER2zD)

## Requirements
### Plex
* Plex Media Server (1.11.1.4730 or newer)
* Plex Client with DVR support
* Plex Pass

### Emby
* Emby Server (3.5.3.0 or newer)
* Emby Client with Live-TV support
* Emby Premiere

### Jellyfin
* Jellyfin Server (10.7.1 or newer)
* Jellyfin Client with Live-TV support

--- 

## Threadfin Features

* New Bootstrap based UI
* RAM based buffer instead of File based

#### Streaming
* **1 Request per Tuner**: Option to ensure each stream request uses a separate tuner/backend process for complete isolation
  - Prevents stream conflicts when multiple clients access the same channel
  - Each stream gets its own dedicated tuner slot instead of sharing
  - Improves stability and reduces buffering issues with multiple concurrent viewers
  - Configurable in Settings → Streaming → "1 Request per Tuner"
* Multiple client support with shared or dedicated tuner allocation
* Better stream isolation reduces interference between different client requests

#### Filter Group
* Can now add a starting channel number for the filter group

#### Map Editor
* Can now multi select Bulk Edit by holding shift
* Now has a separate table for inactive channels
* Can add 3 backup channels for an active channel (backup channels do NOT have to be active)
* Alpha Numeric sorting now sorts correctly
* Can now add a starting channel number for Bulk Edit to renumber multiple channels at a time
* PPV channels can now map the channel name to an EPG
* Removed old Threadfin buffer option, since FFMPEG/VLC will always be a better solution

## xTeVe Features

#### Files
* Merge external M3U files
* Merge external XMLTV files
* Automatic M3U and XMLTV update
* M3U and XMLTV export

#### Channel management
* Filtering streams
* Channel mapping
* Channel order
* Channel logos
* Channel categories

#### Streaming
* Buffer with HLS / M3U8 support
* Re-streaming
* Number of tuners adjustable
* Configurable tuner allocation (shared or dedicated per request)
* Compatible with Plex / Emby / Jellyfin EPG

---

## Docker Deployment

### Using Docker Compose (Recommended)

This fork builds from source code rather than pulling from Docker Hub. Use the provided `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  threadfin:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: threadfin
    restart: unless-stopped
    
    ports:
      - "34400:34400"
    
    volumes:
      - threadfin_conf:/home/threadfin/conf
      - threadfin_temp:/tmp/threadfin
      - threadfin_cache:/home/threadfin/cache
      - threadfin_logs:/var/log
    
    environment:
      - THREADFIN_PORT=34400
      - THREADFIN_BIND_IP_ADDRESS=0.0.0.0
      - THREADFIN_DEBUG=0
      - THREADFIN_BRANCH=main
      - TZ=Pacific/Auckland # Set your timezone
    
    labels:
      - "traefik.enable=false"
      - "com.centurylinklabs.watchtower.enable=true"
    
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.1'

volumes:
  threadfin_conf:
    driver: local
  threadfin_temp:
    driver: local
  threadfin_cache:
    driver: local
  threadfin_logs:
    driver: local
```

### Deployment Steps

1. **Clone this repository:**
   ```bash
   git clone https://github.com/zane33/ThreadfinZane33.git
   cd ThreadfinZane33
   ```

2. **Deploy using Docker Compose:**
   ```bash
   docker-compose up -d
   ```

3. **Or deploy via Portainer:**
   - Use the "Git" deployment option in Portainer
   - Repository URL: `https://github.com/zane33/ThreadfinZane33`
   - Compose file path: `docker-compose.yml`

The first build will take several minutes as it compiles the Go application and processes the web UI files.

### Important Configuration Settings

After deployment, access the web interface at `http://your-server-ip:34400` and configure these key settings:

#### Stream Isolation (Recommended)
- Navigate to **Settings → Streaming**
- Enable **"1 Request per Tuner"** to ensure each stream request uses a separate tuner
- This prevents conflicts when multiple clients watch the same channel simultaneously
- Improves stability and reduces buffering issues with concurrent viewers
- Set the number of tuners based on your expected concurrent streams

#### Tuner Configuration
- Go to **Settings → Tuner**
- Set the number of tuners to match your IPTV provider's concurrent stream limit
- With "1 Request per Tuner" enabled, each active stream consumes one tuner slot
- Example: If your provider allows 5 concurrent streams, set tuners to 5

### Manual Docker Build

If you prefer to build manually:

```bash
# Build the image
docker build -t threadfinzane33:latest .

# Run the container
docker run -d \
  --name threadfin \
  -p 34400:34400 \
  -v threadfin_conf:/home/threadfin/conf \
  -v threadfin_temp:/tmp/threadfin \
  -v threadfin_cache:/home/threadfin/cache \
  -e TZ=Pacific/Auckland \
  threadfinzane33:latest
```

### ARM Architecture Support

For ARM-based systems (like Raspberry Pi), use the ARM-specific Dockerfile:

```yaml
build:
  context: .
  dockerfile: Dockerfile.arm
```

---

## Original Docker Image (Upstream)
[Threadfin](https://hub.docker.com/r/fyb3roptik/threadfin)

* Original docker compose example for upstream version:

```
version: "2.3"
services:
  threadfin:
    image: fyb3roptik/threadfin
    container_name: threadfin
    ports:
      - 34400:34400
    environment:
      - PUID=1001
      - PGID=1001
      - TZ=America/Los_Angeles
    volumes:
      - ./data/conf:/home/threadfin/conf
      - ./data/temp:/tmp/threadfin:rw
    restart: unless-stopped
```

---                                                                                             

## Helm Chart on Kubernetes using TrueCharts
[Threadfin](https://truecharts.org/charts/stable/threadfin/)

* Helm-Chart Installation
```helm install threadfin oci://tccr.io/truecharts/threadfin```

---

### Threadfin Beta branch
New features and bug fixes are only available in beta branch. Only after successful testing are they are merged into the main branch.

**It is not recommended to use the beta version in a production system.**  

With the command line argument `branch` the Git Branch can be changed. Threadfin must be started via the terminal.  

#### Switch from master to beta branch:
```
threadfin -branch beta

...
[Threadfin] GitHub:                https://github.com/Threadfin/Threadfin
[Threadfin] Git Branch:            beta [Threadfin]
...
```

#### Switch from beta to master branch:
```
threadfin -branch main

...
[Threadfin] GitHub:                https://github.com/Threadfin/Threadfin
[Threadfin] Git Branch:            main [Threadfin]
...
```

When the branch is changed, an update is only performed if there is a new version and the update function is activated in the settings.  

---

## Build from source code [Go / Golang]

#### Requirements
* [Go](https://golang.org) (go1.18 or newer)

#### Dependencies
* [go-ssdp](https://github.com/koron/go-ssdp)
* [websocket](https://github.com/gorilla/websocket)
* [osext](https://github.com/kardianos/osext)
* [avfs](github.com/avfs/avfs)

#### Build
1. Download source code
2. Install dependencies
```
go mod tidy && go mod vendor
```
3. Build Threadfin
```
go build threadfin.go
```

4. Update web files (optional)

If TypeScript files were changed, run:

```sh
tsc -p ./ts/tsconfig.json
```

Then, to embed updated JavaScript files into the source code (src/webUI.go), run it in development mode at least once:

```sh
go build threadfin.go
threadfin -dev
```

---

## Fork Information :mega:
This is a fork of the original Threadfin project. The GitHub configuration has been updated to point to this repository to prevent conflicts with the upstream project.

threadfin.go - Line: 29
```Go
var GitHub = GitHubStruct{Branch: "main", User: "zane33", Repo: "ThreadfinZane33", Update: true}

/*
  Branch: GitHub Branch
  User:   GitHub Username
  Repo:   GitHub Repository
  Update: Automatic updates from the GitHub repository [true|false]
*/

```


