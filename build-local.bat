@echo off
echo Building ThreadfinZane33 Docker image...
echo.

REM Build the Docker image
docker build -t threadfinzane33:latest .

if %ERRORLEVEL% equ 0 (
    echo.
    echo ✅ Build completed successfully!
    echo.
    echo To run the container:
    echo   docker-compose up -d
    echo.
    echo Or to run manually:
    echo   docker run -d --name threadfin -p 34400:34400 threadfinzane33:latest
    echo.
) else (
    echo.
    echo ❌ Build failed! Check the error messages above.
    echo.
)

pause 