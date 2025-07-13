# Local Build Guide

If you're having issues with Portainer deployment, you can build and run ThreadfinZane33 locally.

## Quick Start

### Option 1: Using Build Scripts (Recommended)

**Windows Command Prompt:**
```cmd
build-local.bat
```

**PowerShell:**
```powershell
.\build-local.ps1
```

### Option 2: Manual Build

1. **Build the Docker image:**
   ```cmd
   docker build -t threadfinzane33:latest .
   ```

2. **Run with Docker Compose:**
   ```cmd
   docker-compose -f docker-compose.local.yml up -d
   ```

3. **Or run manually:**
   ```cmd
   docker run -d --name threadfin -p 34400:34400 -v threadfin_conf:/home/threadfin/conf -v threadfin_temp:/tmp/threadfin threadfinzane33:latest
   ```

## Troubleshooting Portainer Issues

### Common Problems:

1. **Pull Access Denied Error**
   - This happens when Portainer tries to pull a non-existent image
   - Use the `docker-compose.yml` with `build:` section instead of `image:`

2. **Git Repository Issues**
   - Ensure your repository is public or properly authenticated
   - Make sure all changes are committed and pushed to GitHub

3. **Build Context Issues**
   - Verify the Dockerfile exists in the repository root
   - Check that all source files are present in the repository

### Solutions:

1. **Use Web Editor in Portainer:**
   - Copy the content from `docker-compose.yml`
   - Create a new stack using "Web editor" instead of Git
   - Paste the content directly

2. **Build Locally First:**
   - Use the build scripts to create the image locally
   - Push to a Docker registry if needed
   - Update docker-compose.yml to use your registry image

3. **Force Refresh:**
   - Delete the existing stack in Portainer
   - Clear browser cache
   - Recreate the stack

## Files Explained

- `docker-compose.yml` - Main compose file with build configuration
- `docker-compose.local.yml` - Simplified version for local pre-built images
- `build-local.bat` - Windows batch script for building
- `build-local.ps1` - PowerShell script for building
- `Dockerfile` - Main Docker build configuration
- `Dockerfile.arm` - ARM-specific build configuration

## Access Application

Once running, access ThreadfinZane33 at:
- **URL:** http://localhost:34400
- **Initial setup:** Follow the configuration wizard

## Need Help?

If you continue having issues:
1. Check Docker Desktop is running
2. Verify you have sufficient disk space
3. Try building with `--no-cache` flag: `docker build --no-cache -t threadfinzane33:latest .` 