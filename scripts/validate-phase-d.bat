@echo off
REM Phase D Validation Script (Windows)
REM Run this daily to verify all systems are operational
REM Usage: scripts\validate-phase-d.bat

setlocal enabledelayedexpansion
cls

echo Phase D - Daily Validation
echo ===========================
echo.

REM Initialize counters
set PASS=0
set FAIL=0
set WARN=0

REM 1. Dependency Check
echo Checking Dependencies...
if exist node_modules (
  echo [OK] node_modules exists
  set /a PASS+=1
) else (
  echo [WARN] node_modules missing, run: pnpm install
  set /a WARN+=1
)

if exist pnpm-lock.yaml (
  echo [OK] pnpm-lock.yaml exists
  set /a PASS+=1
) else (
  echo [FAIL] pnpm-lock.yaml missing
  set /a FAIL+=1
)

REM 2. Mobile App Structure
echo.
echo Checking Mobile App Structure...
setlocal enabledelayedexpansion
set files=^
  apps/mobile/app/_layout.tsx^
  apps/mobile/app/(auth)/sign-in.tsx^
  apps/mobile/app/(main)/index.tsx^
  apps/mobile/src/services/ItemsService.ts^
  apps/mobile/src/components/ui/Button.tsx

for %%F in (%files%) do (
  if exist "%%F" (
    echo [OK] %%F exists
    set /a PASS+=1
  ) else (
    echo [FAIL] %%F missing
    set /a FAIL+=1
  )
)

REM 3. Backend Structure
echo.
echo Checking Backend Structure...
if exist "infra/cdk/lib/stacks/api-stack.ts" (
  echo [OK] API stack exists
  set /a PASS+=1
) else (
  echo [FAIL] API stack missing
  set /a FAIL+=1
)

if exist "infra/cdk/lib/appsync/lambdas/delete-account-handler.js" (
  echo [OK] Lambda functions exist
  set /a PASS+=1
) else (
  echo [FAIL] Lambda functions missing
  set /a FAIL+=1
)

REM 4. Documentation
echo.
echo Checking Documentation...
if exist "PHASE_D_START_HERE.md" (
  echo [OK] Phase D guide exists
  set /a PASS+=1
) else (
  echo [FAIL] Phase D guide missing
  set /a FAIL+=1
)

REM 5. Git Status
echo.
echo Checking Git Status...
git rev-parse --git-dir >nul 2>&1
if %errorlevel% equ 0 (
  echo [OK] Git repository valid
  set /a PASS+=1

  for /f %%B in ('git branch --show-current') do (
    echo [OK] Current branch: %%B
    set /a PASS+=1
  )
) else (
  echo [FAIL] Not a git repository
  set /a FAIL+=1
)

REM Summary
echo.
echo ===========================
echo Passed: %PASS%
if %WARN% gtr 0 echo Warnings: %WARN%
if %FAIL% gtr 0 echo Failed: %FAIL%

if %FAIL% equ 0 (
  echo.
  echo Phase D validation PASSED!
  echo Ready to start testing. Run: pnpm --filter @wfl/mobile dev
  exit /b 0
) else (
  echo.
  echo Phase D validation FAILED
  echo Fix the issues above and re-run this script
  exit /b 1
)
