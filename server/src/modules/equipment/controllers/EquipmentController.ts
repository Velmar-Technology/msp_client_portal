import { Request, Response } from 'express';
import { equipmentService, EquipmentService } from '@modules/equipment/services/EquipmentService';
import { ForbiddenError, ValidationError } from '@shared/errors';
import { env } from '@shared/config/env';

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
    const { deviceName, deviceSerial, tenantId } = req.body;
    const targetTenantId = (tenantId as string) || req.user!.tenantId;

    const device = await this.equipmentSvc.addAdminDevice({
      deviceName: deviceName as string,
      deviceSerial: deviceSerial as string,
      tenantId: targetTenantId,
      adminUserId: req.user!.userId,
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
   * Handles downloading an automated PowerShell deployment script for Nextcloud sync client installation.
   *
   * @param req - Express request with subId and slotIndex in params
   * @param res - Express response returning PowerShell script download attachment
   * @throws {ForbiddenError} When user is not an administrator
   * @throws {ValidationError} When slot lacks provisioned Nextcloud credentials
   */
  async getDeployScript(req: Request, res: Response): Promise<void> {
    if (req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only administrators can generate deployment scripts');
    }
    const subId = req.params.subId as string;
    const slotIndex = parseInt(req.params.slotIndex as string, 10);
    const info = await this.equipmentSvc.getNextcloudInfo(subId, slotIndex, req.user!.tenantId, true);

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

Write-Host "[1/3] Downloading Nextcloud Desktop Client v34.0.3..." -ForegroundColor Green
$msiUrl = "https://download.nextcloud.com/desktop/releases/Windows/Nextcloud-34.0.3-x64.msi"
$tempMsi = "$env:TEMP\\nc.msi"
Invoke-RestMethod -Uri $msiUrl -OutFile $tempMsi

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
Remove-Item $tempMsi -Force

Write-Host "[3/3] Launching Nextcloud..." -ForegroundColor Green
$ncPath = "$env:ProgramFiles\\Nextcloud\\nextcloud.exe"
if (Test-Path $ncPath) {
    Start-Process $ncPath
    Write-Host ""
    Write-Host "Deployment complete! Nextcloud client installed and configured." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Installation complete. Please launch Nextcloud manually." -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")`;

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="deploy-nextcloud.ps1"');
    res.send(script);
  }
}

export const equipmentController = new EquipmentController();
