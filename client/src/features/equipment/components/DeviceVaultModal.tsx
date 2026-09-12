import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  KeyRound,
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  AlertTriangle,
  RefreshCw,
  Lock,
  ExternalLink,
  Building2,
  RotateCcw,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  useDeviceVault,
  useProvisionDeviceVault,
  useRevokeDeviceVault,
  useResetDeviceVault,
} from '../api/useEquipmentQueries';

export interface DeviceVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipmentId: string | null;
  deviceName?: string | null;
  isLocked?: boolean;
}

/**
 * Modal component allowing Client Administrators to inspect, provision,
 * and execute emergency session revocations on device-scoped Vaultwarden password vaults.
 */
export function DeviceVaultModal({
  isOpen,
  onClose,
  equipmentId,
  deviceName,
  isLocked = false,
}: DeviceVaultModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);

  const { data: vault, isLoading, refetch } = useDeviceVault(
    isOpen && equipmentId && !isLocked ? equipmentId : undefined
  );

  const provisionMutation = useProvisionDeviceVault();
  const revokeMutation = useRevokeDeviceVault();
  const resetMutation = useResetDeviceVault();

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleProvision = async () => {
    if (!equipmentId) return;
    await provisionMutation.mutateAsync(equipmentId);
  };

  const handleReset = async () => {
    if (!equipmentId) return;
    await resetMutation.mutateAsync(equipmentId);
  };

  const handleRevoke = async () => {
    if (!equipmentId) return;
    await revokeMutation.mutateAsync({
      equipmentId,
      reason: 'Emergency lock executed by client administrator via portal',
    });
    setConfirmingRevoke(false);
  };

  const getStatusBadge = () => {
    const status = vault?.status || 'UNPROVISIONED';
    switch (status) {
      case 'ACTIVE':
        if (vault?.activationUrl && !vault?.isActivated) {
          return (
            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1.5 py-0.5 px-2.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t('equipment.vault.statusPendingActivation', 'Pending Activation')}
            </Badge>
          );
        }
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1.5 py-0.5 px-2.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t('equipment.vault.statusActive', 'Active & Protected')}
          </Badge>
        );
      case 'LOCKED':
        return (
          <Badge variant="destructive" className="gap-1.5 py-0.5 px-2.5">
            <ShieldAlert className="h-3.5 w-3.5" />
            {t('equipment.vault.statusLocked', 'Locked / Revoked')}
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1.5 py-0.5 px-2.5">
            <ShieldOff className="h-3.5 w-3.5" />
            {t('equipment.vault.statusUnprovisioned', 'Not Configured')}
          </Badge>
        );
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setConfirmingRevoke(false);
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-135 p-0 overflow-hidden border border-border/60 bg-background shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border/40 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold tracking-tight">
                  {t('equipment.vault.modalTitle', 'Device Password Vault')}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {deviceName || vault?.deviceName || t('equipment.vault.deviceGeneric', 'Managed Endpoint')}
                </DialogDescription>
              </div>
            </div>
            {isLocked ? (
              <Badge variant="outline" className="gap-1 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-xs py-0.5">
                <Lock className="h-3 w-3" aria-hidden="true" />
                {t('featureLocked.badge', 'Plan Upgrade Required')}
              </Badge>
            ) : (
              getStatusBadge()
            )}
          </div>
        </DialogHeader>

        {isLocked ? (
          <div className="p-6 space-y-4">
            <div className="rounded-lg bg-muted/40 p-4 border border-border/60 space-y-3">
              <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                <KeyRound className="h-4 w-4 text-primary" />
                <span>{t('featureLocked.passwordManager.title', 'Enterprise Password Manager')}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t(
                  'featureLocked.passwordManager.desc',
                  'Zero-knowledge encrypted password and secret vault powered by Bitwarden. Store, generate, and securely share credentials across your team.'
                )}
              </p>
              <div className="pt-2 border-t border-border/40 space-y-2">
                <div className="text-[11px] font-semibold text-foreground">
                  {t('featureLocked.whatsIncluded', 'What you unlock with this feature:')}
                </div>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{t('equipment.vault.perk1', 'Workstation credential autofill with zero plaintext exposure')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{t('equipment.vault.perk2', 'Device-scoped Bitwarden collections & machine identity escrow')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{t('equipment.vault.perk3', '1-click remote emergency session revocation killswitch')}</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="text-xs text-center text-muted-foreground">
              <span>{t('featureLocked.availableOn', 'Available on:')} </span>
              <span className="font-semibold text-foreground">
                {t('featureLocked.passwordManager.tier', 'Advanced Plan or Corporate')}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs">{t('equipment.vault.loading', 'Loading device vault status...')}</p>
              </div>
            ) : (
              <>
                {/* Informational Guidance Box */}
                <div className="p-3.5 rounded-lg border border-border/60 bg-muted/30 text-xs text-muted-foreground space-y-1.5 leading-relaxed">
                  <p className="font-medium text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    {t('equipment.vault.guidanceTitle', 'Endpoint-Scoped Credential Vault')}
                  </p>
                  <p>
                    {t(
                      'equipment.vault.guidanceDesc',
                      'Passwords assigned to this workstation can be automatically autofilled by workers without exposing raw credentials. Client admins retain 1-click remote killswitch rights.'
                    )}
                  </p>
                </div>

                {/* Setup Required: Set Master Password */}
                {vault?.status === 'ACTIVE' && vault?.activationUrl && !vault?.isActivated && (
                  <div className="p-3.5 rounded-lg border border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/20 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{t('equipment.vault.activationRequiredTitle', 'Setup Required: Set Workstation Master Password')}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 shrink-0">
                        {t('equipment.vault.statusPendingActivation', 'Pending Activation')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t(
                        'equipment.vault.activationRequiredDesc',
                        'This machine account needs an initial master password before workstation login. Click below to set the master password and activate the vault on this endpoint.'
                      )}
                    </p>

                    <div className="rounded-md bg-background/70 border border-border/50 p-2.5 text-[11px] text-muted-foreground space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-600 dark:text-amber-400">1</span>
                        <span>{t('equipment.vault.step1', 'Open activation link & set the master password.')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-600 dark:text-amber-400">2</span>
                        <span>{t('equipment.vault.step2', 'On the PC, sign in to Bitwarden with this machine user and your password.')}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <Button
                        variant="default"
                        size="sm"
                        className="h-7 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium cursor-pointer shadow-xs"
                        onClick={() => window.open(vault.activationUrl!, '_blank')}
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        {t('equipment.vault.btnSetPassword', 'Set Master Password')}
                        <ExternalLink className="h-3 w-3 opacity-70" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5 cursor-pointer"
                        onClick={() => {
                          handleCopy(vault.activationUrl!, 'activationUrl');
                          toast.success(t('equipment.vault.linkCopied', 'Activation link copied to clipboard!'));
                        }}
                      >
                        {copiedField === 'activationUrl' ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        {t('equipment.vault.btnCopyActivationLink', 'Copy Activation Link')}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Already Activated Confirmation */}
                {vault?.status === 'ACTIVE' && vault?.isActivated && (
                  <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-xs text-muted-foreground space-y-1">
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4" />
                      {t('equipment.vault.statusActivatedTitle', 'Workstation Vault Enrolled & Active')}
                    </p>
                    <p>
                      {t(
                        'equipment.vault.statusActivatedDesc',
                        'The machine identity is registered. Workers can unlock Bitwarden on this PC using the assigned email and master password.'
                      )}
                    </p>
                  </div>
                )}

                {/* Administrative Oversight & Master Escrow */}
                {vault?.status === 'ACTIVE' && (
                  <div className="p-3.5 rounded-lg border border-primary/30 bg-primary/5 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span>{t('equipment.vault.adminControlTitle', 'Administrative Oversight & Escrow')}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/40 text-primary bg-primary/10">
                        {vault.accessLevel || t('equipment.vault.roleOwner', 'Organization Owner (Full Access)')}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {t(
                        'equipment.vault.adminControlDesc',
                        'As Organization Owner in Bitwarden, you have full view, edit, and escrow access over this machine\'s collection and credentials. Workers autofill without seeing raw passwords.'
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5 cursor-pointer font-medium border-primary/40 text-primary hover:bg-primary/10"
                        onClick={() => window.open(vault?.adminVaultUrl || 'https://helpdesk.velmartech.com.do/vault/#/vault', '_blank')}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {t('equipment.vault.btnOpenWebVault', 'Manage in Bitwarden Web Vault')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={handleReset}
                        disabled={resetMutation.isPending}
                      >
                        {resetMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3 w-3" />
                        )}
                        {t('equipment.vault.btnResetPassword', 'Reset Master Password')}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Identity & Collection Details */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                    {t('equipment.vault.identityHeader', 'Device Vault Identity')}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2.5 rounded-md border border-border/50 bg-background hover:bg-muted/10 transition-colors">
                      <span className="text-xs text-muted-foreground">
                        {t('equipment.vault.fieldAccount', 'Machine User')}
                      </span>
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono font-medium text-foreground">
                          {vault?.deviceEmail || t('equipment.vault.notAssigned', 'Not Assigned')}
                        </code>
                        {vault?.deviceEmail && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => handleCopy(vault.deviceEmail!, 'email')}
                            title={t('common.copy', 'Copy')}
                          >
                            {copiedField === 'email' ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-md border border-border/50 bg-background hover:bg-muted/10 transition-colors">
                      <span className="text-xs text-muted-foreground">
                        {t('equipment.vault.fieldCollection', 'Bitwarden Collection')}
                      </span>
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono text-muted-foreground">
                          {vault?.collectionId
                            ? `${vault.collectionId.slice(0, 12)}...`
                            : t('equipment.vault.notAssigned', 'Not Assigned')}
                        </code>
                        {vault?.collectionId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => handleCopy(vault.collectionId!, 'collection')}
                            title={t('common.copy', 'Copy')}
                          >
                            {copiedField === 'collection' ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-md border border-border/50 bg-background hover:bg-muted/10 transition-colors">
                      <span className="text-xs text-muted-foreground">
                        {t('equipment.vault.fieldLastSync', 'Last Synced')}
                      </span>
                      <span className="text-xs font-medium text-foreground">
                        {vault?.lastSyncedAt
                          ? new Date(vault.lastSyncedAt).toLocaleString()
                          : t('equipment.vault.notAssigned', 'Not Assigned')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Confirm Revocation Box */}
                {confirmingRevoke ? (
                  <div className="p-3.5 rounded-lg border border-destructive/30 bg-destructive/5 space-y-3">
                    <div className="flex items-start gap-2.5 text-xs text-destructive">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-semibold">
                          {t('equipment.vault.confirmRevokeTitle', 'Confirm Emergency Revocation')}
                        </p>
                        <p className="text-muted-foreground leading-relaxed">
                          {t(
                            'equipment.vault.confirmRevokeDesc',
                            'This will instantly invalidate all active Bitwarden sessions on this PC. Passwords will no longer autofill until re-provisioned.'
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setConfirmingRevoke(false)}
                      >
                        {t('common.cancel', 'Cancel')}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={handleRevoke}
                        disabled={revokeMutation.isPending}
                      >
                        {revokeMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ShieldAlert className="h-3.5 w-3.5" />
                        )}
                        {t('equipment.vault.btnConfirmRevoke', 'Revoke Access Now')}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}

        {isLocked ? (
          <DialogFooter className="p-4 border-t border-border/40 bg-muted/20 flex flex-row items-center justify-between sm:justify-between">
            <DialogClose asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                {t('common.close', 'Close')}
              </Button>
            </DialogClose>
            <Button
              variant="default"
              size="sm"
              className="h-7 text-xs gap-1.5 cursor-pointer font-medium"
              onClick={() => {
                onClose();
                navigate('/plans?highlight=PL-003');
              }}
            >
              <span>{t('featureLocked.viewPlans', 'View Plans & Upgrade')}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </DialogFooter>
        ) : (
          <DialogFooter className="p-4 border-t border-border/40 bg-muted/20 flex flex-row items-center justify-between sm:justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              {t('common.refresh', 'Refresh')}
            </Button>

            <div className="flex items-center gap-2">
              <DialogClose asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  {t('common.close', 'Close')}
                </Button>
              </DialogClose>

              {vault?.status === 'ACTIVE' && !confirmingRevoke && vault?.activationUrl && !vault?.isActivated && (
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium cursor-pointer shadow-xs"
                  onClick={() => window.open(vault.activationUrl!, '_blank')}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  {t('equipment.vault.btnSetPassword', 'Set Master Password')}
                  <ExternalLink className="h-3 w-3 opacity-70" />
                </Button>
              )}

              {vault?.status === 'ACTIVE' && !confirmingRevoke && vault?.isActivated && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5 cursor-pointer border-primary/40 text-primary hover:bg-primary/10"
                  onClick={() => window.open(vault?.adminVaultUrl || 'https://helpdesk.velmartech.com.do/vault/#/vault', '_blank')}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t('equipment.vault.btnOpenWebVault', 'Manage in Web Vault')}
                </Button>
              )}

              {vault?.status === 'ACTIVE' && !confirmingRevoke && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => setConfirmingRevoke(true)}
                >
                  <Lock className="h-3.5 w-3.5" />
                  {t('equipment.vault.btnRevoke', 'Revoke Device Vault')}
                </Button>
              )}

              {(vault?.status === 'UNPROVISIONED' || vault?.status === 'LOCKED') && (
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={handleProvision}
                  disabled={provisionMutation.isPending}
                >
                  {provisionMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="h-3.5 w-3.5" />
                  )}
                  {vault?.status === 'LOCKED'
                    ? t('equipment.vault.btnReEnroll', 'Re-enroll Vault')
                    : t('equipment.vault.btnProvision', 'Provision Vault')}
                </Button>
              )}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
