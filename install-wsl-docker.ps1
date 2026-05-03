# WSL + Docker Installation Script (Run as Administrator)
# Usage: powershell -ExecutionPolicy Bypass -File "C:\Users\arger\code\whatsforlunch\install-wsl-docker.ps1"

Write-Host "=====================================`nWSL + Docker Setup`n=====================================" -ForegroundColor Green

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] 'Administrator')
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    exit 1
}

Write-Host "`nStep 1: Installing WSL with Ubuntu..." -ForegroundColor Cyan
wsl --install -d Ubuntu --web-download

Write-Host "`nIMPORTANT: WSL may require a system restart." -ForegroundColor Yellow
Write-Host "Checking WSL status..." -ForegroundColor Cyan

# Simple polling without complex variable interpolation
$installed = $false
for ($i = 0; $i -lt 10; $i++) {
    $wslOutput = wsl --list 2>&1
    if ($wslOutput -match "Ubuntu") {
        Write-Host "SUCCESS: Ubuntu is installed!" -ForegroundColor Green
        $installed = $true
        break
    }
    Write-Host "Waiting for WSL... ($($i+1)/10)" -ForegroundColor Yellow
    Start-Sleep -Seconds 3
}

if (-not $installed) {
    Write-Host "`nWSL Ubuntu not ready yet. A system restart may be needed." -ForegroundColor Yellow
    Write-Host "After restart, run this command to install Docker:" -ForegroundColor Cyan
    Write-Host "wsl bash /mnt/c/Users/arger/code/whatsforlunch/setup-wsl-docker.sh" -ForegroundColor White
    exit 1
}

Write-Host "`nStep 2: Installing Docker in WSL..." -ForegroundColor Cyan
wsl bash /mnt/c/Users/arger/code/whatsforlunch/setup-wsl-docker.sh

Write-Host "`nDone! You can now use Docker:" -ForegroundColor Green
Write-Host "  pnpm local:dev" -ForegroundColor White
