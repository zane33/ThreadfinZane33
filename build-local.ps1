Write-Host "Building ThreadfinZane33 Docker image..." -ForegroundColor Green
Write-Host ""

# Build the Docker image
Write-Host "Running: docker build -t threadfinzane33:latest ." -ForegroundColor Yellow
docker build -t threadfinzane33:latest .

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Build completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To run the container:" -ForegroundColor Cyan
    Write-Host "  docker-compose up -d" -ForegroundColor White
    Write-Host ""
    Write-Host "Or to run manually:" -ForegroundColor Cyan
    Write-Host "  docker run -d --name threadfin -p 34400:34400 threadfinzane33:latest" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Build failed! Check the error messages above." -ForegroundColor Red
    Write-Host ""
}

Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 