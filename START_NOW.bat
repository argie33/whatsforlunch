@echo off
REM WhatsForLunch — Start Everything Now (Windows)
REM Run this once, see the entire app working locally

setlocal enabledelayedexpansion

echo.
echo 🚀 WhatsForLunch — Starting Local Stack
echo ========================================
echo.

REM 1. Start backend
echo 📦 Starting backend services (DynamoDB + GraphQL API)...
docker compose -f docker-compose.local.yml up -d
timeout /t 3 /nobreak > nul

REM 2. Wait for services
echo ⏳ Waiting for services to be healthy...
set "max_attempts=30"
set "attempt=0"

:wait_loop
set /a attempt+=1
docker compose exec -T dynamodb curl -s http://localhost:8000/ > nul 2>&1
if errorlevel 0 (
    echo ✅ Backend is ready
    goto backend_ready
)

if %attempt% geq %max_attempts% (
    echo ❌ Services failed to start
    exit /b 1
)

timeout /t 1 /nobreak > nul
goto wait_loop

:backend_ready
echo.
echo 🧪 Running integration tests (validating everything works)...
cd services\local-mock
call pnpm install --silent
call pnpm integration-test

echo.
echo ✅ Backend validated!
echo.

REM 3. Start the app
echo 📱 Launching mobile app...
echo =============================================
echo.
echo Choose your option:
echo   i = iOS Simulator (press 'i' below)
echo   a = Android Emulator (press 'a' below)
echo   q = Quit and scan QR code with Expo Go
echo.
echo =============================================
echo.

cd ..\..\apps\mobile
call pnpm dev
