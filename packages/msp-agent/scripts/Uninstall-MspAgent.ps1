<#
.SYNOPSIS
    MSP Endpoint Agent — Silent Uninstaller & Service Cleaner

.DESCRIPTION
    Stops the background service, removes it from the Windows Service Control Manager,
    and cleanly cleans up installation artifacts.

.PARAMETER PurgeData
    If specified, deletes persistent logs and config from C:\ProgramData\MSP.

.PARAMETER Silent
    Suppresses console messages.
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory = $false)]
    [switch]$PurgeData,

    [Parameter(Mandatory = $false)]
    [switch]$Silent
)

$ErrorActionPreference = 'SilentlyContinue'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    if (-not $Silent) {
        Write-Error "Administrator privileges are required. Please run PowerShell as Administrator."
    }
    exit 5
}

function Log-Message {
    param([string]$Message, [string]$Color = "White")
    if (-not $Silent) {
        Write-Host "[MSP-UNINSTALL] $Message" -ForegroundColor $Color
    }
}

Log-Message "Stopping and removing MSPEndpointAgent service..." "Yellow"

# 1. Stop and Delete Service via SC.exe or PowerShell
$svc = Get-Service -Name "MSPEndpointAgent" -ErrorAction SilentlyContinue
if ($svc) {
    if ($svc.Status -eq 'Running') {
        Stop-Service -Name "MSPEndpointAgent" -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
    }
    & sc.exe delete "MSPEndpointAgent" | Out-Null
    Log-Message "Service MSPEndpointAgent deleted from SCM." "Green"
}

# 2. Clean Installation Folder
$installDir = "C:\Program Files\MSP\msp-agent"
if (Test-Path $installDir) {
    Remove-Item -Path $installDir -Recurse -Force -ErrorAction SilentlyContinue
    Log-Message "Removed installation directory: $installDir" "Green"
}

# 3. Purge Data Directory (Optional)
if ($PurgeData) {
    $dataDir = "C:\ProgramData\MSP"
    if (Test-Path $dataDir) {
        Remove-Item -Path $dataDir -Recurse -Force -ErrorAction SilentlyContinue
        Log-Message "Purged data directory: $dataDir" "Green"
    }
}

# 4. Remove Firewall Rules
try {
    if (Get-Command "Remove-NetFirewallRule" -ErrorAction SilentlyContinue) {
        Remove-NetFirewallRule -DisplayName "MSP Endpoint Agent Outbound" -ErrorAction SilentlyContinue | Out-Null
    }
} catch {}

Log-Message "MSP Endpoint Agent uninstalled cleanly." "Green"
exit 0
