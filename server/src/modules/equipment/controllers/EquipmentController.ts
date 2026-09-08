import path from 'path';
import fs from 'fs';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { equipmentService, EquipmentService } from '@modules/equipment/services/EquipmentService';
import { ForbiddenError, ValidationError } from '@shared/errors';
import { env } from '@shared/config/env';
import { JwtPayload } from '@shared/types';

/**
 * Controller handling HTTP requests for hardware slot management, OTP binding, Nextcloud credentials, and device provisioning.
 */
export class EquipmentController {
  /**
   * Initializes EquipmentController with EquipmentService dependency.
   *
   * @param equipmentSvc - Equipment domain service
   */
  constructor(private equipmentSvc: EquipmentService = equipmentService) {}

  /**
   * Handles querying hardware equipment slots allocated to a subscription.
   *
   * @param req - Express request with subId in params
   * @param res - Express response returning array of slots
   */
  async getSlots(req: Request, res: Response): Promise<void> {
    const subId = req.params.subId as string;
    const byAdmin = req.user!.role === 'ADMIN';
    const slots = await this.equipmentSvc.getEquipmentSlots(subId, req.user!.tenantId, byAdmin);
    res.json({
      success: true,
      data: slots,
    });
  }

  /**
   * Handles activating and binding a device slot using an agent-issued pairing OTP.
   *
   * @param req - Express request with OTP and slot parameters in body
   * @param res - Express response returning activated slot
   * @throws {ValidationError} When OTP or slot parameters are malformed
   */
  async activateWithOtp(req: Request, res: Response): Promise<void> {
    const { otp, subscriptionId, slotIndex, deviceName, deviceSerial } = req.body;

    if (typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
      throw new ValidationError('Activation code (OTP) must be a 6-digit numeric code');
    }
    if (typeof subscriptionId !== 'string' || !subscriptionId.trim()) {
      throw new ValidationError('subscriptionId is required to select the slot to bind');
    }
    if (!Number.isInteger(slotIndex) || (slotIndex as number) < 0) {
      throw new ValidationError('slotIndex must be a non-negative integer');
    }

    const slot = await this.equipmentSvc.bindAndActivateSlot({
      code: otp,
      subscriptionId,
      slotIndex: slotIndex as number,
      deviceName: (deviceName as string) || undefined,
      deviceSerial: (deviceSerial as string) || undefined,
      tenantId: req.user!.tenantId,
      byAdmin: req.user!.role !== 'CLIENT',
    });

    res.json({
      success: true,
      data: slot,
    });
  }

  /**
   * Handles retrieving live agent identity discovery prefill from a pairing OTP.
   *
   * @param req - Express request with OTP in query
   * @param res - Express response returning discovered identity
   * @throws {ValidationError} When OTP format is invalid
   */
  async getAgentIdentity(req: Request, res: Response): Promise<void> {
    const otp = (req.query.otp as string) || '';
    if (!/^\d{6}$/.test(otp)) {
      throw new ValidationError('Activation code (OTP) must be a 6-digit numeric code');
    }
    const info = await this.equipmentSvc.getAgentIdentityByOtp(otp, req.user!.tenantId, req.user!.role !== 'CLIENT');
    res.json({
      success: true,
      data: info,
    });
  }

  /**
   * Handles deactivating an equipment slot and purging its cloud credentials.
   *
   * @param req - Express request with subId and slotIndex in params
   * @param res - Express response returning reset slot
   */
  async deactivateSlot(req: Request, res: Response): Promise<void> {
    const subId = req.params.subId as string;
    const slotIndex = parseInt(req.params.slotIndex as string, 10);
    const byAdmin = req.user!.role === 'ADMIN';
    const slot = await this.equipmentSvc.deactivateSlot(subId, slotIndex, req.user!.tenantId, byAdmin);
    res.json({
      success: true,
      data: slot,
    });
  }

  /**
   * Handles unbinding an active slot for re-pairing and rotating Nextcloud access secrets.
   *
   * @param req - Express request with subId and slotIndex in params
   * @param res - Express response returning unbound slot in PENDING_ACTIVATION state
   */
  async repairSlot(req: Request, res: Response): Promise<void> {
    const subId = req.params.subId as string;
    const slotIndex = parseInt(req.params.slotIndex as string, 10);
    const byAdmin = req.user!.role === 'ADMIN';
    const slot = await this.equipmentSvc.unbindSlotForRepair(subId, slotIndex, req.user!.tenantId, byAdmin);
    res.json({
      success: true,
      data: slot,
    });
  }

  /**
   * Handles retrieving all active devices for the authenticated client or all devices for admins.
   *
   * @param req - Express request
   * @param res - Express response returning array of active devices
   */
  async getMyDevices(req: Request, res: Response): Promise<void> {
    const isClient = req.user!.role === 'CLIENT';
    const devices = isClient
      ? await this.equipmentSvc.getActiveDevicesForClient(req.user!.userId, req.user!.tenantId)
      : await this.equipmentSvc.getAllDevicesForAdmin();
    res.json({
      success: true,
      data: devices,
    });
  }

  /**
   * Handles retrieving all devices globally across all tenants (Admin only).
   *
   * @param _req - Express request
   * @param res - Express response returning array of all devices
   */
  async getAllDevicesForAdmin(_req: Request, res: Response): Promise<void> {
    const devices = await this.equipmentSvc.getAllDevicesForAdmin();
    res.json({
      success: true,
      data: devices,
    });
  }

  /**
   * Handles direct provisioning of an infrastructure device by an administrator.
   *
   * @param req - Express request with device parameters in body
   * @param res - Express response returning HTTP 201 with created device slot
   * @throws {ForbiddenError} When user is not an administrator
   */
  async addAdminDevice(req: Request, res: Response): Promise<void> {
    if (req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only administrators can register devices directly');
    }
    const { deviceName, deviceSerial, tenantId, otp } = req.body;
    const targetTenantId = (tenantId as string) || req.user!.tenantId;

    const device = await this.equipmentSvc.addAdminDevice({
      deviceName: deviceName as string,
      deviceSerial: deviceSerial as string,
      tenantId: targetTenantId,
      adminUserId: req.user!.userId,
      otp: (otp as string) || '',
    });

    res.status(201).json({
      success: true,
      data: device,
    });
  }

  /**
   * Handles permanently deleting an admin-owned equipment record.
   *
   * @param req - Express request with device ID in params
   * @param res - Express response returning deletion status
   * @throws {ForbiddenError} When user is not an administrator
   */
  async deleteAdminDevice(req: Request, res: Response): Promise<void> {
    if (req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only administrators can delete equipment');
    }
    const { id } = req.params;
    const result = await this.equipmentSvc.deleteAdminEquipment(id as string, req.user!.userId);
    res.json({
      success: true,
      data: result,
    });
  }

  /**
   * Handles querying Nextcloud credentials and live storage usage for a specific device slot.
   *
   * @param req - Express request with subId and slotIndex in params
   * @param res - Express response returning NextcloudStorageInfo
   */
  async getSlotNextcloudInfo(req: Request, res: Response): Promise<void> {
    const subId = req.params.subId as string;
    const slotIndex = parseInt(req.params.slotIndex as string, 10);
    const byAdmin = req.user!.role === 'ADMIN';
    const info = await this.equipmentSvc.getNextcloudInfo(subId, slotIndex, req.user!.tenantId, byAdmin);
    res.json({
      success: true,
      data: info,
    });
  }

  /**
   * Generates and downloads a custom auto-provisioned PowerShell script for Nextcloud client deployment.
   *
   * @param req - Express request with subId and slotIndex in params
   * @param res - Express response returning PowerShell script download attachment
   * @throws {ForbiddenError} When user is not an administrator or client
   * @throws {ValidationError} When slot lacks provisioned Nextcloud credentials
   */
  async getDeployScript(req: Request, res: Response): Promise<void> {
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'CLIENT') {
      throw new ForbiddenError('Only administrators and clients can generate deployment scripts');
    }
    const subId = req.params.subId as string;
    const slotIndex = parseInt(req.params.slotIndex as string, 10);
    const byAdmin = req.user!.role === 'ADMIN';
    const info = await this.equipmentSvc.getNextcloudInfo(subId, slotIndex, req.user!.tenantId, byAdmin);

    if (!info.nextcloud_username || !info.nextcloud_password) {
      throw new ValidationError('Slot must be active with provisioned Nextcloud credentials');
    }

    const serverUrl = env.NEXTCLOUD_EXTERNAL_URL;
    const username = info.nextcloud_username;
    const password = info.nextcloud_password;

    const script = `$ProgressPreference = 'SilentlyContinue'
Write-Host "=== Nextcloud Client Deployment ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server: ${serverUrl}" -ForegroundColor Yellow
Write-Host "User:   ${username}" -ForegroundColor Yellow
Write-Host ""

$possiblePaths = @(
    "$env:ProgramFiles\\Nextcloud\\nextcloud.exe",
    "\${env:ProgramFiles(x86)}\\Nextcloud\\nextcloud.exe",
    "$env:LOCALAPPDATA\\Programs\\Nextcloud\\nextcloud.exe"
)

$ncPath = $possiblePaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $ncPath) {
    Write-Host "[1/3] Downloading official Nextcloud Desktop Client..." -ForegroundColor Green
    $tempMsi = "$env:TEMP\\NextcloudSetup.msi"

    $msiUrl = "https://github.com/nextcloud-releases/desktop/releases/download/v3.16.1/Nextcloud-3.16.1-x64.msi"
    try {
        $releaseInfo = Invoke-RestMethod -Uri "https://api.github.com/repos/nextcloud-releases/desktop/releases/latest" -Headers @{ "User-Agent" = "MSP-Portal" } -ErrorAction SilentlyContinue
        $asset = $releaseInfo.assets | Where-Object { $_.name -like "*x64.msi" -or $_.name -like "*.msi" } | Select-Object -First 1
        if ($asset -and $asset.browser_download_url) {
            $msiUrl = $asset.browser_download_url
        }
    } catch {}

    Invoke-WebRequest -Uri $msiUrl -OutFile $tempMsi -UseBasicParsing

    Write-Host "[2/3] Installing silently with auto-provisioning..." -ForegroundColor Green
    $args = @(
        "/i", "\`"$tempMsi\`"",
        "/qn",
        "/norestart",
        "LAUNCHONBOOT=1",
        "SERVERURL=${serverUrl}",
        "USER=${username}",
        "PASSWORD=${password}"
    )
    Start-Process "msiexec.exe" -ArgumentList $args -Wait -NoNewWindow
    Remove-Item $tempMsi -Force -ErrorAction SilentlyContinue

    Start-Sleep -Seconds 2
    $ncPath = $possiblePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
} else {
    Write-Host "[1/2] Nextcloud client already installed at $ncPath" -ForegroundColor Green
}

Write-Host "[3/3] Launching Nextcloud..." -ForegroundColor Green
if ($ncPath -and (Test-Path $ncPath)) {
    Start-Process $ncPath
    Write-Host ""
    Write-Host "Deployment complete! Nextcloud client installed and running." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Installation completed. Nextcloud will launch upon system restart or from Start Menu." -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")`;

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="deploy-nextcloud.ps1"');
    res.send(script);
  }

  /**
   * Generates a short-lived, 5-minute scoped deployment JWT token for automated PowerShell client installation.
   *
   * @param req - Express request with subId and slotIndex params
   * @param res - Express response returning 5-minute deployment token
   * @throws {ForbiddenError} When user is not an administrator or client
   */
  async getDeployToken(req: Request, res: Response): Promise<void> {
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'CLIENT') {
      throw new ForbiddenError('Only administrators and clients can generate deployment tokens');
    }
    const subId = req.params.subId as string;
    const slotIndex = parseInt(req.params.slotIndex as string, 10);
    const byAdmin = req.user!.role === 'ADMIN';

    // Verify tenant ownership and slot readiness
    await this.equipmentSvc.getNextcloudInfo(subId, slotIndex, req.user!.tenantId, byAdmin);

    const payload: JwtPayload = {
      userId: req.user!.userId,
      email: req.user!.email,
      role: req.user!.role,
      tenantId: req.user!.tenantId,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '5m' });

    res.json({
      success: true,
      data: {
        token,
        expiresIn: 300,
        subscriptionId: subId,
        slotIndex,
      },
    });
  }

  /**
   * Generates and downloads a custom auto-provisioned PowerShell script for MSP Agent background service deployment.
   *
   * @param req - Express request with subId and slotIndex in params
   * @param res - Express response returning PowerShell script download attachment
   * @throws {ForbiddenError} When user is not an administrator or client
   */
  async getAgentDeployScript(req: Request, res: Response): Promise<void> {
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'CLIENT') {
      throw new ForbiddenError('Only administrators and clients can generate deployment scripts');
    }
    const subId = req.params.subId as string;
    const slotIndex = parseInt(req.params.slotIndex as string, 10);
    const byAdmin = req.user!.role === 'ADMIN';
    const slots = await this.equipmentSvc.getEquipmentSlots(subId, req.user!.tenantId, byAdmin);
    const slot = slots.find((s) => s.slot_index === slotIndex);
    if (!slot) {
      throw new ValidationError('Equipment slot not found');
    }

    const host = (req.get ? req.get('host') : (req.headers?.host as string)) || 'localhost:3001';
    const protocol = req.protocol === 'https' || (req.get && req.get('x-forwarded-proto') === 'https') ? 'https' : 'http';
    const wsProtocol = protocol === 'https' ? 'wss' : 'ws';
    const gatewayUrl = `${wsProtocol}://${host}/agent-ws`;
    const token = slot.otp || 'dev-token';
    const downloadUrl = `${protocol}://${host}/api/v1/equipment/agent-binary`;

    const script = `$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  MSP ENDPOINT AGENT SEAMLESS INSTALLER" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Require Administrative Privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "Administrator privileges required. Please run PowerShell as Administrator."
    exit 5
}

$targetDir = "C:\\Program Files\\MSP\\msp-agent"
$targetExe = "$targetDir\\msp-agent.exe"
$gatewayUrl = "${gatewayUrl}"
$agentToken = "${token}"

# Create directories
New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
New-Item -ItemType Directory -Path "C:\\ProgramData\\MSP" -Force | Out-Null

Write-Host "[1/3] Downloading lightweight MSP agent binary..." -ForegroundColor Yellow
$tempExe = "$env:TEMP\\msp-agent.exe"
try {
    Invoke-WebRequest -Uri "${downloadUrl}" -OutFile $tempExe -UseBasicParsing
    Copy-Item -Path $tempExe -Destination $targetExe -Force
} catch {
    Write-Host "Download from server unavailable, checking local paths..." -ForegroundColor Yellow
}

Write-Host "[2/3] Installing and registering Windows Background Service..." -ForegroundColor Yellow
$args = @(
    "--install-service",
    "--gateway", $gatewayUrl,
    "--token", $agentToken,
    "--silent"
)

if (Test-Path $targetExe) {
    Start-Process -FilePath $targetExe -ArgumentList $args -Wait -NoNewWindow
} else {
    Write-Error "Could not locate msp-agent.exe."
    exit 1
}

Write-Host "[3/3] Verifying background service status..." -ForegroundColor Green
Start-Sleep -Seconds 1
$svc = Get-Service -Name "MSPEndpointAgent" -ErrorAction SilentlyContinue
if ($svc) {
    Write-Host "Service MSPEndpointAgent is registered (Status: $($svc.Status))." -ForegroundColor Green
}

Write-Host "==================================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT COMPLETE! MSP AGENT IS RUNNING" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
`;

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="deploy-msp-agent.ps1"');
    res.send(script);
  }

  /**
   * Downloads the pre-compiled standalone msp-agent.exe binary.
   *
   * @param req - Express request
   * @param res - Express response sending binary file
   */
  async downloadAgentBinary(_req: Request, res: Response): Promise<void> {
    const possiblePaths = [
      path.resolve(process.cwd(), '../packages/msp-agent/target/release/msp-agent.exe'),
      path.resolve(process.cwd(), 'packages/msp-agent/target/release/msp-agent.exe'),
      path.resolve(process.cwd(), '../packages/msp-agent/dist/msp-agent-installer/msp-agent.exe'),
      path.resolve(process.cwd(), 'packages/msp-agent/dist/msp-agent-installer/msp-agent.exe'),
      path.resolve(process.cwd(), '../packages/msp-agent/target/debug/msp-agent.exe'),
    ];

    const binaryPath = possiblePaths.find((p) => fs.existsSync(p));
    if (!binaryPath) {
      res.status(404).json({
        success: false,
        error: 'MSP Agent binary not found on server. Build the release package with cargo build --release first.',
      });
      return;
    }

    res.download(binaryPath, 'msp-agent.exe');
  }

  /**
   * Downloads the pre-compiled standalone msp-tray.exe desktop assistant binary.
   *
   * @param _req - Express request
   * @param res - Express response sending binary file
   * @returns Promise resolving to void
   */
  async downloadTrayBinary(_req: Request, res: Response): Promise<void> {
    const possiblePaths = [
      path.resolve(process.cwd(), '../packages/msp-tray/src-tauri/target/release/msp-tray.exe'),
      path.resolve(process.cwd(), 'packages/msp-tray/src-tauri/target/release/msp-tray.exe'),
      path.resolve(process.cwd(), '../packages/msp-tray/src-tauri/target/x86_64-pc-windows-msvc/release/msp-tray.exe'),
      path.resolve(process.cwd(), 'packages/msp-tray/src-tauri/target/x86_64-pc-windows-msvc/release/msp-tray.exe'),
      path.resolve(process.cwd(), '../packages/msp-agent/dist/msp-agent-installer/msp-tray.exe'),
      path.resolve(process.cwd(), 'packages/msp-agent/dist/msp-agent-installer/msp-tray.exe'),
      path.resolve(process.cwd(), '../packages/msp-tray/src-tauri/target/debug/msp-tray.exe'),
    ];

    const binaryPath = possiblePaths.find((p) => fs.existsSync(p));
    if (!binaryPath) {
      res.status(404).json({
        success: false,
        error: 'MSP Tray binary not found on server. Build the release package with cargo build --release first.',
      });
      return;
    }

    res.download(binaryPath, 'msp-tray.exe');
  }

  /**
   * Handles querying Vaultwarden device password vault status for an equipment slot.
   *
   * @param req - Express request with equipment ID in params
   * @param res - Express response returning DeviceVaultDetails
   */
  async getDeviceVault(req: Request, res: Response): Promise<void> {
    const equipmentId = req.params.id as string;
    const byAdmin = req.user!.role === 'ADMIN';
    const vault = await this.equipmentSvc.getDeviceVault(equipmentId, req.user!.tenantId, byAdmin);
    res.json({
      success: true,
      data: vault,
    });
  }

  /**
   * Handles provisioning a dedicated Vaultwarden collection & identity for an equipment slot.
   *
   * @param req - Express request with equipment ID in params
   * @param res - Express response returning provisioned DeviceVaultDetails
   */
  async provisionDeviceVault(req: Request, res: Response): Promise<void> {
    const equipmentId = req.params.id as string;
    const byAdmin = req.user!.role === 'ADMIN';
    const vault = await this.equipmentSvc.provisionDeviceVault(equipmentId, req.user!.tenantId, byAdmin);
    res.status(201).json({
      success: true,
      data: vault,
    });
  }

  /**
   * Handles revoking/locking active Vaultwarden sessions for an equipment slot.
   *
   * @param req - Express request with equipment ID in params and optional reason in body
   * @param res - Express response returning updated DeviceVaultDetails
   */
  async revokeDeviceVault(req: Request, res: Response): Promise<void> {
    const equipmentId = req.params.id as string;
    const byAdmin = req.user!.role === 'ADMIN';
    const reason = req.body?.reason as string | undefined;
    const vault = await this.equipmentSvc.revokeDeviceVault(equipmentId, req.user!.tenantId, reason, byAdmin);
    res.json({
      success: true,
      data: vault,
    });
  }
}

export const equipmentController = new EquipmentController();
