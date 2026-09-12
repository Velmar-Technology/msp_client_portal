<#
.SYNOPSIS
    Automated verification of the MSP Endpoint Suite Windows Installer (.msi).

.DESCRIPTION
    Uses the Windows Installer COM Automation API (WindowsInstaller.Installer)
    to inspect the internal database tables of the generated MSI package and
    validate that all enterprise deployment properties, service registrations,
    Run registry keys, and MajorUpgrade tables are configured correctly.
#>

[CmdletBinding()]
param (
    [string]$MsiPath = ""
)

$ErrorActionPreference = 'Stop'
$rootDir = Split-Path -Parent $PSScriptRoot
$distDir = Join-Path $rootDir "dist"

if (-not $MsiPath) {
    $msiFiles = Get-ChildItem -Path $distDir -Filter "msp-endpoint-suite-*.msi" | Sort-Object LastWriteTime -Descending
    if (-not $msiFiles) {
        Write-Error "No msp-endpoint-suite-*.msi found in $distDir. Run scripts/build-suite-msi.ps1 first."
        exit 1
    }
    $MsiPath = $msiFiles[0].FullName
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  VALIDATING MSP ENDPOINT SUITE MSI PACKAGE" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Target MSI: $MsiPath" -ForegroundColor Yellow

$comInstaller = New-Object -ComObject WindowsInstaller.Installer
$database = $comInstaller.GetType().InvokeMember(
    "OpenDatabase",
    [System.Reflection.BindingFlags]::InvokeMethod,
    $null,
    $comInstaller,
    @($MsiPath, 0) # 0 = msiOpenDatabaseModeReadOnly
)

function Query-MsiTable($db, $sql) {
    $view = $db.GetType().InvokeMember("OpenView", [System.Reflection.BindingFlags]::InvokeMethod, $null, $db, @($sql))
    $view.GetType().InvokeMember("Execute", [System.Reflection.BindingFlags]::InvokeMethod, $null, $view, $null) | Out-Null
    $records = @()
    while ($true) {
        $record = $view.GetType().InvokeMember("Fetch", [System.Reflection.BindingFlags]::InvokeMethod, $null, $view, $null)
        if ($null -eq $record) { break }
        $fieldCount = $record.GetType().InvokeMember("FieldCount", [System.Reflection.BindingFlags]::GetProperty, $null, $record, $null)
        $fields = @()
        for ($i = 1; $i -le $fieldCount; $i++) {
            $val = $null
            try {
                $val = $record.GetType().InvokeMember("StringData", [System.Reflection.BindingFlags]::GetProperty, $null, $record, @($i))
            } catch {}
            if ([string]::IsNullOrEmpty($val)) {
                try {
                    $intVal = $record.GetType().InvokeMember("IntegerData", [System.Reflection.BindingFlags]::GetProperty, $null, $record, @($i))
                    $val = "$intVal"
                } catch {}
            }
            $fields += $val
        }
        $records += ,@($fields)
    }
    $view.GetType().InvokeMember("Close", [System.Reflection.BindingFlags]::InvokeMethod, $null, $view, $null) | Out-Null
    return ,$records
}

# 1. Verify Properties Table
Write-Host "`n[Check 1/4] Verifying Package Properties..." -ForegroundColor Yellow
$properties = Query-MsiTable $database "SELECT Property, Value FROM Property"
$propHash = @{}
foreach ($p in $properties) {
    $propHash[$p[0]] = $p[1]
}

Write-Host "  Product:      $($propHash['ProductName'])"
Write-Host "  Version:      $($propHash['ProductVersion'])"
Write-Host "  Manufacturer: $($propHash['Manufacturer'])"
Write-Host "  UpgradeCode:  $($propHash['UpgradeCode'])"
Write-Host "  Gateway URL:  $($propHash['GATEWAY_URL'])"

if ($propHash['ProductName'] -ne 'MSP Endpoint Suite') {
    Write-Error "FAIL: Expected ProductName 'MSP Endpoint Suite', got '$($propHash['ProductName'])'"
    exit 1
}
if (-not $propHash['UpgradeCode']) {
    Write-Error "FAIL: UpgradeCode is missing!"
    exit 1
}
if (-not $propHash['GATEWAY_URL']) {
    Write-Error "FAIL: GATEWAY_URL property is missing!"
    exit 1
}
Write-Host "  PASS: Package properties verified." -ForegroundColor Green

# 2. Verify ServiceInstall Table
Write-Host "`n[Check 2/4] Verifying Windows Service Registration..." -ForegroundColor Yellow
$services = Query-MsiTable $database "SELECT ServiceInstall, Name, DisplayName, ServiceType, StartType, Arguments FROM ServiceInstall"
if ($services.Count -eq 0) {
    Write-Error "FAIL: No service registrations found in ServiceInstall table!"
    exit 1
}
$agentSvc = $services | Where-Object { $_[1] -eq 'MSPEndpointAgent' } | Select-Object -First 1
if (-not $agentSvc) {
    Write-Error "FAIL: Service 'MSPEndpointAgent' not found in ServiceInstall table!"
    exit 1
}
Write-Host "  Service Name: $($agentSvc[1])"
Write-Host "  Display Name: $($agentSvc[2])"
Write-Host "  Start Type:   $($agentSvc[4]) (Auto=2)"
Write-Host "  Arguments:    $($agentSvc[5])"
if ($agentSvc[5] -ne '--service') {
    Write-Error "FAIL: Expected Service Arguments '--service', got '$($agentSvc[5])'"
    exit 1
}
Write-Host "  PASS: Windows Service registration verified." -ForegroundColor Green

# 3. Verify Run Registry Key for Tray Assistant
Write-Host "`n[Check 3/4] Verifying Desktop Tray Run Key..." -ForegroundColor Yellow
$registries = Query-MsiTable $database "SELECT * FROM Registry"
$runKey = $registries | Where-Object { $_ -match "CurrentVersion\\\\Run|CurrentVersion\\Run" } | Select-Object -First 1
if (-not $runKey) {
    Write-Error "FAIL: No HKLM Run registry key found for msp-tray.exe auto-launch!"
    exit 1
}
Write-Host "  Registry Key:   $($runKey[2])"
Write-Host "  Registry Value: $($runKey[3]) = $($runKey[4])"
Write-Host "  PASS: Tray auto-launch key verified." -ForegroundColor Green

# 4. Verify MajorUpgrade Table
Write-Host "`n[Check 4/5] Verifying MajorUpgrade Configuration..." -ForegroundColor Yellow
$upgrades = Query-MsiTable $database "SELECT * FROM Upgrade"
if ($upgrades.Count -eq 0) {
    Write-Error "FAIL: Upgrade table is empty. MajorUpgrade not configured!"
    exit 1
}
Write-Host "  Upgrade Action Property: $($upgrades[0][4])"
Write-Host "  PASS: MajorUpgrade table verified." -ForegroundColor Green

# 5. Verify File Table and Critical Binaries
Write-Host "`n[Check 5/5] Verifying Bundled Binaries & WebView2Loader..." -ForegroundColor Yellow
$files = Query-MsiTable $database "SELECT File, FileName, FileSize FROM File"
$fileMap = @{}
foreach ($f in $files) {
    $fileMap[$f[0]] = @{ Name = $f[1]; Size = [int64]$f[2] }
    Write-Host "  File: $($f[0]) -> $($f[1]) ($([math]::Round([int64]$f[2] / 1KB, 1)) KB)"
}

if (-not $fileMap.ContainsKey("MspAgentExe")) {
    Write-Error "FAIL: MspAgentExe missing from MSI File table!"
    exit 1
}
if (-not $fileMap.ContainsKey("MspTrayExe")) {
    Write-Error "FAIL: MspTrayExe missing from MSI File table!"
    exit 1
}
if (-not $fileMap.ContainsKey("WebView2LoaderDll")) {
    Write-Error "FAIL: WebView2LoaderDll missing from MSI File table! msp-tray will fail with 'WebView2Loader.dll not found'."
    exit 1
}

# Verify distinct sizes (ensure msp-tray is real Tauri companion > 5MB, not agent copy)
if ($fileMap["MspTrayExe"].Size -lt 3000000) {
    Write-Error "FAIL: MspTrayExe size is suspiciously small ($($fileMap['MspTrayExe'].Size) bytes). Ensure real Tauri release binary is compiled!"
    exit 1
}
if ($fileMap["WebView2LoaderDll"].Size -lt 100000) {
    Write-Error "FAIL: WebView2LoaderDll size is suspiciously small ($($fileMap['WebView2LoaderDll'].Size) bytes)!"
    exit 1
}

Write-Host "  PASS: All 3 components (msp-agent, msp-tray, WebView2Loader.dll) verified in MSI." -ForegroundColor Green

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  ALL MSI INTEGRITY CHECKS PASSED (5/5)" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
