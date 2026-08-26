import { Request, Response } from 'express';
import { equipmentService, EquipmentService } from '@modules/equipment/services/EquipmentService';
import { ForbiddenError, ValidationError } from '@shared/errors';
import { env } from '@shared/config/env';

export class EquipmentController {
  constructor(private equipmentSvc: EquipmentService = equipmentService) {}

  async getSlots(req: Request, res: Response): Promise<void> {
    const subId = req.params.subId as string;
    const byAdmin = req.user!.role === 'ADMIN';
    const slots = await this.equipmentSvc.getEquipmentSlots(subId, req.user!.tenantId, byAdmin);
    res.json({
      success: true,
      data: slots,
    });
  }

  async generateOTP(req: Request, res: Response): Promise<void> {
    if (req.user!.role === 'CLIENT') {
      throw new ForbiddenError('Client users are not authorized to generate activation codes');
    }
    const subId = req.params.subId as string;
    const slotIndex = parseInt(req.params.slotIndex as string, 10);
    const byAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'TECHNICIAN';
    const slot = await this.equipmentSvc.generateSlotOTP(subId, slotIndex, req.user!.tenantId, byAdmin);
    res.json({
      success: true,
      data: slot,
    });
  }

  async activateSlot(req: Request, res: Response): Promise<void> {
    const subId = req.params.subId as string;
    const slotIndex = parseInt(req.params.slotIndex as string, 10);
    const { deviceName, deviceSerial } = req.body;
    const byAdmin = req.user!.role === 'ADMIN';

    const slot = await this.equipmentSvc.activateSlot({
      subscriptionId: subId,
      slotIndex,
      deviceName: (deviceName as string) || `Workstation-${slotIndex + 1}`,
      deviceSerial: (deviceSerial as string) || `SN-SIM-${Math.floor(100000 + Math.random() * 900000)}`,
      tenantId: req.user!.tenantId,
      byAdmin,
    });

    res.json({
      success: true,
      data: slot,
    });
  }

  async activateWithOtp(req: Request, res: Response): Promise<void> {
    const { otp, deviceName, deviceSerial } = req.body;

    if (typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
      throw new ValidationError('Activation code (OTP) must be a 6-digit numeric code');
    }

    const slot = await this.equipmentSvc.activateSlot({
      otp,
      deviceName: (deviceName as string) || `Workstation-${Math.floor(100000 + Math.random() * 900000)}`,
      deviceSerial: (deviceSerial as string) || `SN-SIM-${Math.floor(100000 + Math.random() * 900000)}`,
      tenantId: req.user!.tenantId,
      byAdmin: req.user!.role !== 'CLIENT',
    });

    res.json({
      success: true,
      data: slot,
    });
  }

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

  async getAllDevicesForAdmin(_req: Request, res: Response): Promise<void> {
    const devices = await this.equipmentSvc.getAllDevicesForAdmin();
    res.json({
      success: true,
      data: devices,
    });
  }

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
