# Requires -RunAsAdministrator
$ErrorActionPreference = 'Stop'

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Updating Local MSP Endpoint Agent Binary " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$sourceExe = "c:\Users\PC\Workspace\msp_client_portal\packages\msp-agent\target\release\msp-agent.exe"
$target1 = "C:\Program Files\MSP\EndpointSuite\msp-agent.exe"
$target2 = "C:\Program Files\MSP\msp-agent\msp-agent.exe"

if (-not (Test-Path $sourceExe)) {
    Write-Error "Source binary not found at $sourceExe! Please build first."
    exit 1
}

$sourceInfo = Get-Item $sourceExe
Write-Host "Source binary: $sourceExe"
Write-Host "  Size: $([math]::Round($sourceInfo.Length / 1MB, 2)) MB | Compiled: $($sourceInfo.LastWriteTime)" -ForegroundColor Gray

Write-Host "`n[1/3] Stopping MSPEndpointAgent service..." -ForegroundColor Yellow
try {
    Stop-Service -Name MSPEndpointAgent -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
} catch {
    Write-Warning "Service was not running or failed to stop: $_"
}

Write-Host "[2/3] Replacing executable binaries..." -ForegroundColor Yellow
if (Test-Path "C:\Program Files\MSP\EndpointSuite") {
    Copy-Item -Path $sourceExe -Destination $target1 -Force
    Write-Host "  Updated: $target1" -ForegroundColor Green
}
if (Test-Path "C:\Program Files\MSP\msp-agent") {
    Copy-Item -Path $sourceExe -Destination $target2 -Force
    Write-Host "  Updated: $target2" -ForegroundColor Green
}

Write-Host "[3/3] Starting MSPEndpointAgent service..." -ForegroundColor Yellow
Start-Service -Name MSPEndpointAgent
Start-Sleep -Seconds 1

$svc = Get-Service -Name MSPEndpointAgent
Write-Host "`nService Status: $($svc.Status)" -ForegroundColor Cyan
if ($svc.Status -eq 'Running') {
    Write-Host "SUCCESS: MSP Endpoint Agent updated and running!" -ForegroundColor Green
} else {
    Write-Warning "Service is in state: $($svc.Status)"
}
