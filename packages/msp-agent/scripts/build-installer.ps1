<#
.SYNOPSIS
    Builds and packages the MSP Endpoint Agent standalone installer distribution.

.DESCRIPTION
    Compiles msp-agent in release mode with size/LTO optimizations, gathers deployment
    scripts, and produces a self-contained installation bundle.
#>

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$agentRoot = Resolve-Path (Join-Path $scriptDir "..")
$distDir = Join-Path $agentRoot "dist"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  BUILDING MSP ENDPOINT AGENT RELEASE BUNDLE" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Compile Release Binary
Write-Host "Compiling Rust release binary (opt-level='z', LTO=true)..." -ForegroundColor Yellow
Set-Location $agentRoot
cargo build --release

$releaseExe = Join-Path $agentRoot "target\release\msp-agent.exe"
if (-not (Test-Path $releaseExe)) {
    Write-Error "Release build failed. msp-agent.exe not found at $releaseExe"
    exit 1
}

$exeSizeMb = [math]::Round(((Get-Item $releaseExe).Length / 1MB), 2)
Write-Host "Compiled binary successfully: $releaseExe ($exeSizeMb MB)" -ForegroundColor Green

# 2. Prepare Dist Directory
if (Test-Path $distDir) {
    Remove-Item -Path $distDir -Recurse -Force
}
New-Item -ItemType Directory -Path $distDir -Force | Out-Null

$bundleDir = Join-Path $distDir "msp-agent-installer"
New-Item -ItemType Directory -Path $bundleDir -Force | Out-Null

# 3. Copy Assets into Dist Bundle
Copy-Item -Path $releaseExe -Destination (Join-Path $bundleDir "msp-agent.exe")
Copy-Item -Path (Join-Path $scriptDir "Install-MspAgent.ps1") -Destination (Join-Path $bundleDir "Install-MspAgent.ps1")
Copy-Item -Path (Join-Path $scriptDir "Uninstall-MspAgent.ps1") -Destination (Join-Path $bundleDir "Uninstall-MspAgent.ps1")

# Create a sample silent-install.bat for double-click or standard CMD runners
$batContent = @"
@echo off
REM MSP Endpoint Agent Silent Installation Batch Runner
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0Install-MspAgent.ps1" -Silent %*
"@
Set-Content -Path (Join-Path $bundleDir "silent-install.bat") -Value $batContent

# 4. Create ZIP Distribution Archive
$zipFile = Join-Path $distDir "msp-agent-v1.8.4-windows-x64.zip"
Write-Host "Creating distribution archive: $zipFile..." -ForegroundColor Yellow
Compress-Archive -Path "$bundleDir\*" -DestinationPath $zipFile -Force

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  BUILD & PACKAGING COMPLETE" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host "Standalone Binary:  $(Join-Path $bundleDir "msp-agent.exe") ($exeSizeMb MB)"
Write-Host "Silent Script:      $(Join-Path $bundleDir "Install-MspAgent.ps1")"
Write-Host "Distribution ZIP:   $zipFile"
Write-Host "==================================================" -ForegroundColor Green
