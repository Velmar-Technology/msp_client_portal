<#
.SYNOPSIS
    MSP Endpoint Agent — Enterprise Silent Deployment & Service Installer

.DESCRIPTION
    Installs, configures, and starts the Velmar Technology MSP Endpoint Agent as an
    automatic background Windows Service. Suitable for Microsoft Intune, Group Policy (GPO),
    NinjaOne, Datto RMM, ConnectWise Automate, or manual deployment.

.PARAMETER GatewayUrl
    WebSocket Gateway endpoint (e.g. wss://helpdesk.velmartech.com.do/agent-ws or ws://localhost:3001/agent-ws).

.PARAMETER AgentToken
    Pre-shared agent authentication secret / OTP token.

.PARAMETER BinaryPath
    Local path to msp-agent.exe. If omitted, checks current directory or downloads from DownloadUrl.

.PARAMETER DownloadUrl
    Optional URL to download msp-agent.exe if not present locally.

.PARAMETER Silent
    Suppresses verbose console output and user confirmation dialogs.

.PARAMETER NoAutoStart
    Skips starting the service immediately after installation.

.EXAMPLE
    .\Install-MspAgent.ps1 -GatewayUrl "wss://helpdesk.velmartech.com.do/agent-ws" -AgentToken "tok_live_abc123" -Silent
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory = $false)]
    [string]$GatewayUrl = "wss://helpdesk.velmartech.com.do/agent-ws",

    [Parameter(Mandatory = $false)]
    [string]$AgentToken = "",

    [Parameter(Mandatory = $false)]
    [string]$BinaryPath = "",

    [Parameter(Mandatory = $false)]
    [string]$DownloadUrl = "",

    [Parameter(Mandatory = $false)]
    [switch]$Silent,

    [Parameter(Mandatory = $false)]
    [switch]$NoAutoStart
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# 1. Require Administrative Privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    if (-not $Silent) {
        Write-Error "Administrator privileges are required to install Windows Services. Please run PowerShell as Administrator."
    }
    exit 5
}

function Log-Message {
    param([string]$Message, [string]$Color = "White")
    if (-not $Silent) {
        Write-Host "[MSP-DEPLOY] $Message" -ForegroundColor $Color
    }
}

Log-Message "Initializing MSP Endpoint Agent Silent Installer..." "Cyan"

# 2. Locate or Download msp-agent.exe
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$resolvedExe = ""

if ($BinaryPath -and (Test-Path $BinaryPath)) {
    $resolvedExe = (Resolve-Path $BinaryPath).Path
} elseif (Test-Path (Join-Path $scriptDir "msp-agent.exe")) {
    $resolvedExe = (Join-Path $scriptDir "msp-agent.exe")
} elseif (Test-Path (Join-Path $scriptDir "..\target\release\msp-agent.exe")) {
    $resolvedExe = (Resolve-Path (Join-Path $scriptDir "..\target\release\msp-agent.exe")).Path
} elseif (Test-Path (Join-Path $scriptDir "..\target\debug\msp-agent.exe")) {
    $resolvedExe = (Resolve-Path (Join-Path $scriptDir "..\target\debug\msp-agent.exe")).Path
} elseif ($DownloadUrl) {
    Log-Message "Downloading agent binary from $DownloadUrl..." "Yellow"
    $tempExe = Join-Path $env:TEMP "msp-agent-setup.exe"
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $tempExe -UseBasicParsing
    $resolvedExe = $tempExe
} else {
    Log-Message "Error: msp-agent.exe not found. Please provide -BinaryPath or -DownloadUrl." "Red"
    exit 2
}

Log-Message "Using Agent Binary: $resolvedExe" "Green"

# 3. Build Arguments for Standalone Installer Invocation
$installerArgs = @("--install-service")

if ($GatewayUrl) {
    $installerArgs += "--gateway"
    $installerArgs += $GatewayUrl
}

if ($AgentToken) {
    $installerArgs += "--token"
    $installerArgs += $AgentToken
}

if ($Silent) {
    $installerArgs += "--silent"
}

if ($NoAutoStart) {
    $installerArgs += "--no-autostart"
}

# 4. Execute Service Registration & Relocation
Log-Message "Executing internal Windows Service registration..." "Yellow"
$process = Start-Process -FilePath $resolvedExe -ArgumentList $installerArgs -Wait -PassThru -NoNewWindow

if ($process.ExitCode -ne 0) {
    Log-Message "Installation failed with exit code: $($process.ExitCode)" "Red"
    exit $process.ExitCode
}

# 5. Configure Windows Defender / Firewall Exclusions (Optional Silent Hardening)
try {
    $targetPath = "C:\Program Files\MSP\msp-agent\msp-agent.exe"
    if (Test-Path $targetPath) {
        if (Get-Command "New-NetFirewallRule" -ErrorAction SilentlyContinue) {
            $existingRule = Get-NetFirewallRule -DisplayName "MSP Endpoint Agent Outbound" -ErrorAction SilentlyContinue
            if (-not $existingRule) {
                New-NetFirewallRule -DisplayName "MSP Endpoint Agent Outbound" `
                    -Direction Outbound `
                    -Program $targetPath `
                    -Action Allow `
                    -Profile Any `
                    -ErrorAction SilentlyContinue | Out-Null
                Log-Message "Outbound firewall rule configured." "Green"
            }
        }
    }
} catch {
    # Non-fatal firewall rule exception
}

# 6. Deploy and Register Desktop Assistant Tray Companion (if bundled)
try {
    $traySourceCandidates = @(
        (Join-Path $scriptDir "msp-tray.exe"),
        (Join-Path (Split-Path -Parent $resolvedExe) "msp-tray.exe")
    )
    $foundTraySource = $traySourceCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($foundTraySource) {
        $trayTargetDir = "C:\Program Files\MSP\msp-agent"
        if (-not (Test-Path $trayTargetDir)) {
            New-Item -ItemType Directory -Path $trayTargetDir -Force | Out-Null
        }
        $trayTargetPath = Join-Path $trayTargetDir "msp-tray.exe"
        Copy-Item -Path $foundTraySource -Destination $trayTargetPath -Force
        Log-Message "Deployed Tray Companion: $trayTargetPath" "Green"

        # Register auto-run for all interactive desktop logins
        $runKeyPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
        if (Test-Path $runKeyPath) {
            Set-ItemProperty -Path $runKeyPath -Name "MSPSupportAssistant" -Value "`"$trayTargetPath`"" -ErrorAction SilentlyContinue
            Log-Message "Configured auto-start Run key for MSP Support Assistant." "Green"
        }
    }
} catch {
    # Non-fatal tray installation exception
}

# 7. Verify Service Running Status
try {
    $service = Get-Service -Name "MSPEndpointAgent" -ErrorAction SilentlyContinue
    if ($service) {
        Log-Message "Service 'MSPEndpointAgent' status: $($service.Status)" "Green"
    }
} catch {
    # Ignored
}

Log-Message "MSP Endpoint Agent successfully deployed." "Green"
exit 0
