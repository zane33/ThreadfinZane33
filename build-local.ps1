# Threadfin Local Build Script for Docker Desktop
# This script handles TLS issues and provides better error reporting

Write-Host "=== Threadfin Docker Build Script ===" -ForegroundColor Green

# Check if Docker is running
try {
    docker version | Out-Null
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Clean up any existing containers and images
Write-Host "Cleaning up existing containers and images..." -ForegroundColor Yellow
docker-compose down 2>$null
docker system prune -f 2>$null

# Set Docker build arguments to avoid TLS issues
$env:DOCKER_BUILDKIT = "1"
$env:COMPOSE_DOCKER_CLI_BUILD = "1"

# Build with specific platform and no cache
Write-Host "Building Threadfin container..." -ForegroundColor Yellow
Write-Host "This may take several minutes on first build..." -ForegroundColor Cyan

try {
    # Build using docker build directly with specific options
    docker build --no-cache --platform linux/amd64 -t threadfinzane33:latest .
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Build completed successfully!" -ForegroundColor Green
        
        # Start the container
        Write-Host "Starting Threadfin container..." -ForegroundColor Yellow
        docker-compose up -d
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Threadfin is now running!" -ForegroundColor Green
            Write-Host "Access Threadfin at: http://localhost:34400" -ForegroundColor Cyan
            Write-Host "Container logs: docker-compose logs -f" -ForegroundColor Cyan
        } else {
            Write-Host "✗ Failed to start container" -ForegroundColor Red
        }
    } else {
        Write-Host "✗ Build failed" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Build error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Trying alternative build method..." -ForegroundColor Yellow
    
    # Alternative: Try building with different options
    try {
        docker build --no-cache --platform linux/amd64 --build-arg BUILDKIT_INLINE_CACHE=1 -t threadfinzane33:latest .
        Write-Host "✓ Alternative build completed!" -ForegroundColor Green
    } catch {
        Write-Host "✗ Alternative build also failed" -ForegroundColor Red
        Write-Host "Please check your Docker Desktop settings and try again." -ForegroundColor Yellow
    }
}

Write-Host "=== Build script completed ===" -ForegroundColor Green 