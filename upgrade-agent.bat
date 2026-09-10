@echo off
:: Check for administrative privileges and self-elevate if needed
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [MSP-UPGRADE] Requesting Administrator privileges...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList '/c \"\"%~fn0\"\"' -Verb RunAs"
    exit /b
)

echo ========================================================
echo   Upgrading MSP Endpoint Agent & Tray Companion
echo ========================================================

echo [1/5] Stopping MSPEndpointAgent service...
net stop MSPEndpointAgent >nul 2>&1
timeout /t 1 /nobreak >nul
taskkill /F /IM msp-agent.exe >nul 2>&1
taskkill /F /IM msp-tray.exe >nul 2>&1

if not exist "C:\Program Files\MSP\msp-agent" mkdir "C:\Program Files\MSP\msp-agent"

echo [2/5] Backing up current agent binary...
if exist "C:\Program Files\MSP\msp-agent\msp-agent.exe" (
    copy /Y "C:\Program Files\MSP\msp-agent\msp-agent.exe" "C:\Program Files\MSP\msp-agent\msp-agent.exe.bak" >nul
)

echo [3/5] Deploying newly compiled msp-agent.exe (v1.10.2)...
copy /Y "%~dp0packages\msp-agent\target\release\msp-agent.exe" "C:\Program Files\MSP\msp-agent\msp-agent.exe"

if exist "%~dp0packages\msp-agent\target\release\msp-tray.exe" (
    echo [4/5] Deploying newly compiled msp-tray.exe...
    copy /Y "%~dp0packages\msp-agent\target\release\msp-tray.exe" "C:\Program Files\MSP\msp-agent\msp-tray.exe"
)

echo [5/5] Starting MSPEndpointAgent Windows Service...
net start MSPEndpointAgent

echo.
echo ========================================================
echo   Service Verification:
echo ========================================================
sc query MSPEndpointAgent
echo.
echo [MSP-UPGRADE] Successfully upgraded to latest build!
timeout /t 5
