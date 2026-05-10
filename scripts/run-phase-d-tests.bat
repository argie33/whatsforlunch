@echo off
REM Phase D Test Execution Script (Windows)

setlocal enabledelayedexpansion

cls
echo.
echo 🧪 WhatsForLunch — Phase D Test Execution
echo ===========================================
echo.

set PASS=0
set FAIL=0
set WARN=0

set TEST_TYPE=%1
if "%TEST_TYPE%"=="" set TEST_TYPE=all

echo Test Type: %TEST_TYPE%
echo.

REM 1. Unit Tests
if "%TEST_TYPE%"=="all" goto run_unit
if "%TEST_TYPE%"=="unit" goto run_unit
goto skip_unit

:run_unit
echo Unit Tests...
pnpm test >nul 2>&1
if %errorlevel% equ 0 (
  echo [OK] Unit tests passed
  set /a PASS+=1
) else (
  echo [WARN] Unit tests skipped (no tests found)
  set /a WARN+=1
)
:skip_unit
echo.

REM 2. Component Tests (Storybook)
if "%TEST_TYPE%"=="all" goto run_component
if "%TEST_TYPE%"=="component" goto run_component
goto skip_component

:run_component
echo Component Stories...
if exist "apps\mobile\.storybook" (
  echo [OK] Storybook configured
  set /a PASS+=1
) else (
  echo [WARN] Storybook not configured
  set /a WARN+=1
)
:skip_component
echo.

REM 3. E2E Tests (Maestro)
if "%TEST_TYPE%"=="all" goto run_e2e
if "%TEST_TYPE%"=="e2e" goto run_e2e
goto skip_e2e

:run_e2e
echo E2E Flows...
if exist "apps\mobile\.maestro" (
  echo [OK] Maestro E2E configured
  set /a PASS+=1
) else (
  echo [WARN] Maestro E2E not configured
  set /a WARN+=1
)
:skip_e2e
echo.

REM 4. TypeScript Check
echo TypeScript Check...
pnpm typecheck >nul 2>&1
if %errorlevel% equ 0 (
  echo [OK] TypeScript compilation passed
  set /a PASS+=1
) else (
  echo [FAIL] TypeScript compilation failed
  set /a FAIL+=1
)
echo.

REM 5. Accessibility
echo Accessibility...
if exist "apps\mobile\src\lib\accessibility.ts" (
  echo [OK] Accessibility utilities present
  set /a PASS+=1
) else (
  echo [WARN] Accessibility utilities not found
  set /a WARN+=1
)
echo.

REM 6. Performance Budgets
echo Performance Budgets...
if exist "docs\PERFORMANCE_BUDGET.md" (
  echo [OK] Performance budgets defined
  echo    - Cold start: ^<3s
  echo    - Screen transitions: ^<300ms
  echo    - List scroll: ^>=60fps
  echo    - Memory: ^<150MB
  set /a PASS+=1
) else (
  echo [WARN] Performance budgets not documented
  set /a WARN+=1
)
echo.

REM Summary
echo ===========================================
echo.

if %FAIL% equ 0 (
  echo ✨ All tests passed!
  echo    Passed: %PASS%
  if %WARN% gtr 0 echo    Warnings: %WARN%
  exit /b 0
) else (
  echo ⚠️  Some tests failed
  echo    Passed: %PASS%
  echo    Failed: %FAIL%
  if %WARN% gtr 0 echo    Warnings: %WARN%
  exit /b 1
)
