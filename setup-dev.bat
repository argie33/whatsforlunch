@echo off
REM WhatsForLunch Complete Development Setup (Windows)
REM Handles everything: install, Docker, tests, app launch
REM Run once: setup-dev.bat

setlocal enabledelayedexpansion

cls
echo.
echo ╔════════════════════════════════════════╗
echo ║  WhatsForLunch Development Setup      ║
echo ║  Complete Local Environment          ║
echo ╚════════════════════════════════════════╝
echo.

REM ─── Check Prerequisites ────────────────────────────────────────────────────

echo 📋 Checking prerequisites...
echo.

REM Check Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo ❌ Node.js not found. Install from https://nodejs.org
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js %NODE_VERSION%

REM Check pnpm
where pnpm >nul 2>nul
if errorlevel 1 (
    echo ⚠️  pnpm not found. Installing...
    call npm install -g pnpm@9
)
for /f "tokens=*" %%i in ('pnpm --version') do set PNPM_VERSION=%%i
echo ✅ pnpm %PNPM_VERSION%

REM Check Docker
where docker >nul 2>nul
if errorlevel 1 (
    echo ❌ Docker not found. Install Docker Desktop from https://docker.com
    exit /b 1
)
for /f "tokens=*" %%i in ('docker --version') do set DOCKER_VERSION=%%i
echo ✅ %DOCKER_VERSION%

REM Check Docker is running
docker ps >nul 2>nul
if errorlevel 1 (
    echo ❌ Docker is not running. Start Docker Desktop and try again.
    exit /b 1
)
echo ✅ Docker is running

echo.

REM ─── Update Repository ──────────────────────────────────────────────────────

if not exist ".git" (
    echo 📥 Cloning repository...
    REM git clone https://github.com/yourusername/whatsforlunch.git .
) else (
    echo 🔄 Updating repository...
    call git pull origin main
)

echo.

REM ─── Install Dependencies ───────────────────────────────────────────────────

echo 📦 Installing dependencies...
call pnpm install --frozen-lockfile

echo.

REM ─── Start Docker Services ──────────────────────────────────────────────────

echo 🐳 Starting Docker services...
call docker compose -f docker-compose.local.yml up -d

echo ⏳ Waiting for services to be healthy...
set "max_attempts=30"
set "attempt=0"

:wait_docker
set /a attempt+=1
docker compose exec -T dynamodb curl -s http://localhost:8000/ >nul 2>nul
if errorlevel 0 (
    echo ✅ DynamoDB is healthy
    goto db_ready
)

if %attempt% geq %max_attempts% (
    echo ❌ Services failed to start
    call docker compose logs
    exit /b 1
)

timeout /t 1 /nobreak >nul
goto wait_docker

:db_ready
echo.

REM ─── Setup Database ─────────────────────────────────────────────────────────

echo 🗄️  Setting up database tables...
call pnpm local:migrate
echo ✅ Database ready

echo.

REM ─── Run Integration Tests ──────────────────────────────────────────────────

echo 🧪 Running integration tests...
call pnpm local:test

if errorlevel 1 (
    echo ❌ Some tests failed
    exit /b 1
)
echo ✅ All tests passed!

echo.

REM ─── Open Browser Windows ───────────────────────────────────────────────────

echo 🌐 Opening browser windows...

start http://localhost:8001
start http://localhost:4000/graphql

echo ✅ Browser windows opened

echo.

REM ─── Summary ────────────────────────────────────────────────────────────────

echo.
echo ╔════════════════════════════════════════╗
echo ║  ✅ Setup Complete!                  ║
echo ╚════════════════════════════════════════╝
echo.
echo Services running:
echo   • DynamoDB Local:     http://localhost:8000
echo   • DynamoDB Admin UI:  http://localhost:8001
echo   • GraphQL API:        http://localhost:4000/graphql
echo.
echo Next steps:
echo   1. Open a new PowerShell window
echo   2. Run: cd apps\mobile ^&^& pnpm dev
echo   3. Choose: iOS (i), Android (a), or Expo Go (scan QR)
echo   4. Sign in with any email
echo   5. Create household and add food items
echo.
echo Useful commands:
echo   • pnpm local:seed         - Add sample data
echo   • pnpm local:test         - Run integration tests
echo   • pnpm local:down         - Stop services
echo   • pnpm local:reset        - Full clean reset
echo.
echo 🚀 Ready to build!
echo.

pause
