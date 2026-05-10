@echo off
REM WhatsForLunch Local Stack Integration Tests — Windows
REM Run from repo root: run-local-tests.bat

setlocal enabledelayedexpansion

echo.
echo 🧪 WhatsForLunch Local Stack Integration Tests
echo ==============================================
echo.

REM Check Docker is available
where docker >nul 2>nul
if errorlevel 1 (
    echo ❌ Docker is not installed. Please install Docker Desktop for Windows.
    exit /b 1
)

REM Check we're in repo root
if not exist "docker-compose.local.yml" (
    echo ❌ docker-compose.local.yml not found. Run from repo root.
    exit /b 1
)

echo 📦 Starting local stack...
docker compose -f docker-compose.local.yml up -d

echo ⏳ Waiting for services to be healthy...
set "max_attempts=30"
set "attempt=0"

:wait_loop
set /a attempt+=1
docker compose exec -T dynamodb curl -s http://localhost:8000/ >nul 2>&1
if errorlevel 0 (
    echo ✅ DynamoDB is ready
    goto services_ready
)

if %attempt% geq %max_attempts% (
    echo ❌ DynamoDB failed to start after %max_attempts% seconds
    docker compose logs dynamodb
    exit /b 1
)

timeout /t 1 /nobreak >nul
goto wait_loop

:services_ready
echo.
echo 📡 Service Status:
docker compose ps

echo.
echo 🧬 Installing dependencies...
cd services\local-mock
call pnpm install --frozen-lockfile

echo.
echo 🚀 Running integration tests...
echo.

call pnpm integration-test
set test_result=%errorlevel%

echo.
echo ==============================================
if %test_result% equ 0 (
    echo ✅ All integration tests passed!
    echo.
    echo Local stack is ready:
    echo   - GraphQL API: http://localhost:4000/graphql
    echo   - DynamoDB Admin: http://localhost:8001
    echo   - Start developing: pnpm dev:mobile
) else (
    echo ❌ Some tests failed. Check the output above.
    echo.
    echo Debugging tips:
    echo   - View logs: docker compose logs wfl-mock-api
    echo   - Check health: docker compose ps
    echo   - Stop stack: docker compose down -v
)

exit /b %test_result%
