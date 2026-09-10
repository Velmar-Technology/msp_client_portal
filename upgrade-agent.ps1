# Requires -RunAsAdministrator
[CmdletBinding()]
param ()

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Upgrading MSP Endpoint Agent & Tray Companion" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Ensure Administrator Privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[MSP-UPGRADE] Elevation required. Spawning elevated PowerShell..." -ForegroundColor Yellow
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

# 2. Stop Service & Running Processes
Write-Host "[1/5] Stopping MSPEndpointAgent service..." -ForegroundColor Yellow
Stop-Service -Name MSPEndpointAgent -Force -ErrorAction SilentlyContinue
Stop-Process -Name msp-agent, msp-tray -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# 3. Prepare Target Directory
$targetDir = "C:\Program Files\MSP\msp-agent"
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

# 4. Backup Existing Binary
$targetExe = Join-Path $targetDir "msp-agent.exe"
if (Test-Path $targetExe) {
    Write-Host "[2/5] Backing up existing agent binary..." -ForegroundColor Gray
    Copy-Item -Path $targetExe -Destination "$targetExe.bak" -Force
}

# 5. Deploy New Binaries
$workspaceDir = $PSScriptRoot
$releaseAgent = Join-Path $workspaceDir "packages\msp-agent\target\release\msp-agent.exe"
$releaseTray = Join-Path $workspaceDir "packages\msp-agent\target\release\msp-tray.exe"

Write-Host "[3/5] Deploying newly compiled msp-agent.exe..." -ForegroundColor Green
Copy-Item -Path $releaseAgent -Destination $targetExe -Force

if (Test-Path $releaseTray) {
    Write-Host "[4/5] Deploying newly compiled msp-tray.exe..." -ForegroundColor Green
    Copy-Item -Path $releaseTray -Destination (Join-Path $targetDir "msp-tray.exe") -Force
}

# 6. Start Service
Write-Host "[5/5] Starting MSPEndpointAgent service..." -ForegroundColor Cyan
Start-Service -Name MSPEndpointAgent

# 7. Verification
$svc = Get-Service -Name MSPEndpointAgent
Write-Host ""
Write-Host "Service Status: $($svc.Status)" -ForegroundColor ($svc.Status -eq 'Running' ? 'Green' : 'Red')
Write-Host "[MSP-UPGRADE] Upgrade completed successfully!" -ForegroundColor Green
