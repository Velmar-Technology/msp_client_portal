import * as React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  ShieldCheck,
  KeyRound,
  Clock,
  Loader2,
  Info,
  CheckCircle2,
  X,
  Camera,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/Page";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/dialog";
import { useProfile } from "../hooks/useProfile";
import type { ApiKeyExpiry } from "@/features/users";

/* --- Dialog Modals for Focused Row Actions --- */

interface UpdateFieldModalProps {
  open: boolean;
  title: string;
  description: string;
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  saving: boolean;
  onClose: () => void;
  onSave: (val: string) => Promise<void>;
}

function UpdateFieldModal({
  open,
  title,
  description,
  label,
  value: initialValue,
  placeholder,
  type = "text",
  saving,
  onClose,
  onSave,
}: UpdateFieldModalProps) {
  const [val, setVal] = useState(initialValue);

  React.useEffect(() => {
    setVal(initialValue);
  }, [initialValue, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(val);
  };

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="field-modal-input" className="mb-1.5 text-xs font-medium text-foreground">
              {label}
            </Label>
            <Input
              id="field-modal-input"
              type={type}
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder={placeholder}
              required
            />
          </div>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex items-center gap-2">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Changes
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
  hook: ReturnType<typeof useProfile>;
}

function ChangePasswordModal({ open, onClose, hook }: ChangePasswordModalProps) {
  const {
    t,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    changingPassword,
    handlePasswordChange,
  } = hook;

  const handleSubmit = async (e: React.FormEvent) => {
    await handlePasswordChange(e);
    if (!hook.changingPassword) {
      onClose();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("profile.changePassword", "Change Password")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("profile.passwordSubtitle", "Ensure your account is protected with a secure password.")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <Label htmlFor="modal-curr-pwd" className="mb-1.5 text-xs font-medium text-foreground">
              {t("profile.currentPassword", "Current Password")}
            </Label>
            <Input
              id="modal-curr-pwd"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />
          </div>
          <div>
            <Label htmlFor="modal-new-pwd" className="mb-1.5 text-xs font-medium text-foreground">
              {t("profile.newPassword", "New Password")}
            </Label>
            <Input
              id="modal-new-pwd"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
            />
          </div>
          <div>
            <Label htmlFor="modal-confirm-pwd" className="mb-1.5 text-xs font-medium text-foreground">
              {t("profile.confirmPassword", "Confirm New Password")}
            </Label>
            <Input
              id="modal-confirm-pwd"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              required
            />
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 shrink-0" />
            {t("profile.passwordRequirements", "Must be at least 8 characters long.")}
          </p>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={changingPassword}>
              {t("profile.apiKeyCancel", "Cancel")}
            </Button>
            <Button type="submit" disabled={changingPassword} className="flex items-center gap-2">
              {changingPassword && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("profile.updatePassword", "Update Password")}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* --- Main Profile Page --- */

export function ProfilePage() {
  const navigate = useNavigate();
  const profileHook = useProfile();
  const {
    t,
    user,
    activeTab,
    setActiveTab,
    lastLoginText,
    uploadingAvatar,
    fileInputRef,
    handleAvatarClick,
    handleAvatarChange,
    updateSingleField,
    logout,
    apiKeys,
    generatingApiKey,
    loadingApiKeys,
    viewingApiKeyId,
    fullApiKey,
    generateDialogOpen,
    apiKeyName,
    setApiKeyName,
    apiKeyDescription,
    setApiKeyDescription,
    apiKeyExpiresIn,
    setApiKeyExpiresIn,
    handleOpenGenerateDialog,
    handleCloseGenerateDialog,
    handleGenerateApiKey,
    handleDeleteApiKey,
    handleCloseApiKeyView,
  } = profileHook;

  const isAdmin = user?.role === "ADMIN";

  // Modal visibility states
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [rncModalOpen, setRncModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [savingField, setSavingField] = useState(false);

  // Field update handlers
  const handleSaveName = async (newName: string) => {
    setSavingField(true);
    const success = await updateSingleField({ name: newName });
    setSavingField(false);
    if (success) setNameModalOpen(false);
  };

  const handleSavePhone = async (newPhone: string) => {
    setSavingField(true);
    const success = await updateSingleField({ phoneNumber: newPhone });
    setSavingField(false);
    if (success) setPhoneModalOpen(false);
  };

  const handleSaveRnc = async (newRnc: string) => {
    setSavingField(true);
    const success = await updateSingleField({ rnc: newRnc });
    setSavingField(false);
    if (success) setRncModalOpen(false);
  };

  const handleLanguageChange = async (newLang: string) => {
    await updateSingleField({ language: newLang });
  };

  const tabs = [
    { id: "profile", label: t("profile.tabProfile", "Profile"), icon: User },
    { id: "security", label: t("profile.tabSecurity", "Security & Password"), icon: ShieldCheck },
    ...(isAdmin ? [{ id: "api-keys", label: t("profile.tabApiKeys", "API Keys"), icon: KeyRound }] : []),
  ];

  return (
    <Page>
      <div className="max-w-3xl space-y-6">
        <div>
          <Page.Breadcrumbs className="mb-2 text-muted-foreground text-xs" />
          <h1 className="text-xl font-bold tracking-tight text-foreground font-heading">
            {t("profile.settingsTitle", "Settings")}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t("profile.settingsSubtitle", "Manage your profile, credentials, and account preferences.")}
          </p>

          {/* Bubble Tabs - ElevenLabs style */}
          <div className="mt-6">
            <Page.Tabs
              variant="bubble"
              tabs={tabs}
              activeTab={activeTab === "account" ? "profile" : activeTab}
              onTabChange={setActiveTab}
            />
          </div>
        </div>

        {/* --- TAB 1: PROFILE --- */}
        {(activeTab === "profile" || activeTab === "account") && (
          <div className="divide-y divide-border/50">
            {/* Row 1: Profile Picture & Identity */}
            <Page.SettingRow
              label={t("profile.avatarTitle", "Profile Picture & Identity")}
              description={
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="relative group shrink-0">
                    {user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="h-11 w-11 rounded-full border border-border object-cover shadow-2xs"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-muted text-base font-bold text-muted-foreground shadow-2xs">
                        {user?.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">{user?.name}</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0">
                        {user?.role}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" /> {lastLoginText}
                    </p>
                  </div>
                </div>
              }
              action={
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAvatarClick}
                    disabled={uploadingAvatar}
                    className="h-8 px-3 text-xs font-medium cursor-pointer"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Camera className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {t("profile.updatePicture", "Update Picture")}
                  </Button>
                  <input
                    id="profile-avatar-upload"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    accept="image/*"
                    className="hidden"
                    aria-label={t("profile.avatarInput", "Upload profile picture")}
                  />
                </>
              }
            />

            {/* Row 2: E-Mail Address */}
            <Page.SettingRow
              label={t("profile.email", "E-Mail Address")}
              description={user?.email || "—"}
              action={
                <Badge variant="secondary" className="text-[11px] gap-1 px-2 py-0.5 font-normal">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  {t("profile.emailVerified", "Verified")}
                </Badge>
              }
            />

            {/* Row 3: Full Name */}
            <Page.SettingRow
              label={t("profile.fullName", "Full Name")}
              description={user?.name || "—"}
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setNameModalOpen(true)}
                  className="h-8 px-3 text-xs font-medium cursor-pointer"
                >
                  {t("profile.updateName", "Update Name")}
                </Button>
              }
            />

            {/* Row 4: Current Plan */}
            <Page.SettingRow
              label={t("profile.currentPlan", "Current Plan")}
              description={
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-medium text-foreground">{user?.clientType || "Standard"}</span>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                    {user?.accountStatus || "ACTIVE"}
                  </Badge>
                </div>
              }
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/billing")}
                  className="h-8 px-3 text-xs font-medium cursor-pointer"
                >
                  {t("profile.manageSubscription", "Manage Subscription")}
                </Button>
              }
            />

            {/* Row 5: Phone Number */}
            <Page.SettingRow
              label={t("profile.phoneNumber", "Phone Number (WhatsApp)")}
              description={user?.phoneNumber || t("profile.notConfigured", "Not configured")}
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPhoneModalOpen(true)}
                  className="h-8 px-3 text-xs font-medium cursor-pointer"
                >
                  {t("profile.updatePhone", "Update Phone")}
                </Button>
              }
            />

            {/* Row 6: RNC / Cédula */}
            <Page.SettingRow
              label={t("billing.rncLabel", "RNC / Cédula (NCF)")}
              description={user?.rnc || t("profile.notConfigured", "Not configured")}
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRncModalOpen(true)}
                  className="h-8 px-3 text-xs font-medium cursor-pointer"
                >
                  {t("profile.updateRnc", "Update RNC")}
                </Button>
              }
            />

            {/* Row 7: Application Language */}
            <Page.SettingRow
              label={t("profile.languageSetting", "Application language")}
              description={
                user?.language === "es_DO"
                  ? "Español (República Dominicana)"
                  : "English (United States)"
              }
              action={
                <Select
                  value={user?.language || "en_US"}
                  onValueChange={handleLanguageChange}
                >
                  <SelectTrigger className="h-8 w-[170px] text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en_US">🇺🇸 English (US)</SelectItem>
                    <SelectItem value="es_DO">🇩🇴 Español (DO)</SelectItem>
                  </SelectContent>
                </Select>
              }
            />

            {/* Row 8: Sign out of all devices */}
            <Page.SettingRow
              label={t("profile.signOutAllDevices", "Sign out of all devices")}
              description={t(
                "profile.signOutAllDevicesDesc",
                "Sign out of all active sessions and refresh tokens across your devices."
              )}
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="h-8 px-3 text-xs font-medium cursor-pointer"
                >
                  {t("profile.signOut", "Sign out")}
                </Button>
              }
            />

            {/* Row 9: Delete Account (Danger Zone) */}
            <Page.SettingRow
              danger
              label={t("profile.deleteAccount", "Delete Entire Account")}
              description={t(
                "profile.deleteAccountDesc",
                "Permanently delete your entire account across all workspaces. This action cannot be reversed."
              )}
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteModalOpen(true)}
                  className="h-8 px-3 text-xs font-medium border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                >
                  {t("profile.deleteAccountBtn", "Delete Account")}
                </Button>
              }
            />
          </div>
        )}

        {/* --- TAB 2: SECURITY & PASSWORD --- */}
        {activeTab === "security" && (
          <div className="divide-y divide-border/50">
            {/* Row 1: Change Password */}
            <Page.SettingRow
              label={t("profile.passwordTitle", "Account Password")}
              description={t(
                "profile.passwordDesc",
                "Ensure your account is protected with a strong, rotating password."
              )}
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPasswordModalOpen(true)}
                  className="h-8 px-3 text-xs font-medium cursor-pointer"
                >
                  {t("profile.changePassword", "Change Password")}
                </Button>
              }
            />

            {/* Row 2: Two-Factor Authentication */}
            <Page.SettingRow
              label={t("profile.twoFactor", "Two-Factor Authentication (2FA)")}
              description={t(
                "profile.twoFactorDesc",
                "Enforce high-assurance TOTP authenticator verification on login."
              )}
              action={
                <Badge variant="outline" className="text-xs px-2 py-0.5 text-muted-foreground">
                  {t("profile.twoFactorManaged", "Managed via IdP")}
                </Badge>
              }
            />

            {/* Row 3: Active Session Telemetry */}
            <Page.SettingRow
              label={t("profile.activeSession", "Active Session & Security Log")}
              description={
                <span className="font-mono text-xs">
                  IP: {user?.lastLoginIp || "127.0.0.1"} • {lastLoginText}
                </span>
              }
              action={
                <Badge variant="secondary" className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  {t("profile.sessionActive", "Current Session")}
                </Badge>
              }
            />
          </div>
        )}

        {/* --- TAB 3: API KEYS (ADMIN ONLY) --- */}
        {activeTab === "api-keys" && isAdmin && (
          <div className="space-y-6">
            <Page.Banner
              icon={KeyRound}
              title={t("profile.apiKeyTitle", "Developer API Keys")}
              description={t(
                "profile.apiKeyBannerDesc",
                "Generate cryptographic bearer keys to integrate with external CI/CD, backup daemons, and internal scripts."
              )}
              action={{
                label: t("profile.generateApiKey", "Generate API Key"),
                onClick: handleOpenGenerateDialog,
              }}
            />

            <div className="rounded-xl border border-border/50 overflow-hidden bg-card shadow-2xs">
              <DataTable
                columns={[
                  {
                    accessorKey: "name",
                    header: t("profile.apiKeyName", "Key Name"),
                    cell: ({ row }) => <span className="font-mono font-medium">{row.original.name}</span>,
                  },
                  {
                    accessorKey: "description",
                    header: t("profile.apiKeyDescriptionCol", "Description"),
                    cell: ({ row }) => (
                      <span className="max-w-[220px] truncate text-xs text-muted-foreground">
                        {row.original.description ?? "—"}
                      </span>
                    ),
                  },
                  {
                    accessorKey: "expiresIn",
                    header: t("profile.apiKeyExpiresCol", "Expires"),
                    cell: ({ row }) => (
                      <span className="text-xs">
                        {row.original.expiresIn === "forever"
                          ? t("profile.apiKeyDurationForever", "Forever (never expires)")
                          : t("profile.apiKeyDuration30d", "30 days")}
                      </span>
                    ),
                  },
                  {
                    accessorKey: "createdAt",
                    header: "Created",
                    cell: ({ row }) => (
                      <span className="text-xs text-muted-foreground font-mono">
                        {new Date(row.original.createdAt).toLocaleDateString()}
                      </span>
                    ),
                  },
                  {
                    accessorKey: "actions",
                    header: "Actions",
                    cell: ({ row }) => (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDeleteApiKey(row.original.id)}
                        className="hover:text-destructive cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    ),
                  },
                ]}
                data={apiKeys}
                loading={loadingApiKeys}
                noDataMessage={t("profile.noApiKeys", "No API keys found. Generate one to get started.")}
                enableRowSelection={false}
              />
            </div>
          </div>
        )}
      </div>

      {/* --- MODAL DIALOGS --- */}

      {/* 1. Update Full Name Dialog */}
      <UpdateFieldModal
        open={nameModalOpen}
        title={t("profile.updateNameTitle", "Update Full Name")}
        description={t("profile.updateNameDesc", "Enter your legal full name or display name.")}
        label={t("profile.fullName", "Full Name")}
        value={user?.name || ""}
        saving={savingField}
        onClose={() => setNameModalOpen(false)}
        onSave={handleSaveName}
      />

      {/* 2. Update Phone Dialog */}
      <UpdateFieldModal
        open={phoneModalOpen}
        title={t("profile.updatePhoneTitle", "Update Phone Number")}
        description={t("profile.updatePhoneDesc", "Enter your mobile contact or WhatsApp support number.")}
        label={t("profile.phoneNumber", "Phone Number (WhatsApp)")}
        value={user?.phoneNumber || ""}
        placeholder="+1 (809) 000-0000"
        type="tel"
        saving={savingField}
        onClose={() => setPhoneModalOpen(false)}
        onSave={handleSavePhone}
      />

      {/* 3. Update RNC Dialog */}
      <UpdateFieldModal
        open={rncModalOpen}
        title={t("profile.updateRncTitle", "Update Tax ID (RNC / Cédula)")}
        description={t("profile.updateRncDesc", "Required for official DGII Dominican B01 Tax Invoices.")}
        label={t("billing.rncLabel", "RNC / Cédula (NCF)")}
        value={user?.rnc || ""}
        placeholder="1-32-12345-6 or 402-0000000-0"
        saving={savingField}
        onClose={() => setRncModalOpen(false)}
        onSave={handleSaveRnc}
      />

      {/* 4. Change Password Dialog */}
      <ChangePasswordModal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        hook={profileHook}
      />

      {/* 5. Delete Account Confirmation Dialog */}
      <AlertDialog
        open={deleteModalOpen}
        onOpenChange={(isOpen) => { if (!isOpen) setDeleteModalOpen(false); }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              {t("profile.deleteAccountConfirmTitle", "Delete Entire Account")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "profile.deleteAccountWarning",
                "This action is permanent and cannot be undone. All personal settings, session tokens, and workspace ties will be erased."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
            >
              {t("profile.apiKeyCancel", "Cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                toast.error(
                  t("profile.deleteAccountBlocked", "Self-service account deletion is governed by organization policy. Please contact your administrator.")
                );
                setDeleteModalOpen(false);
              }}
            >
              {t("profile.confirmDelete", "I understand, delete my account")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 6. Generate API Key Dialog (Admin Only) */}
      {isAdmin && (
        <AlertDialog
          open={generateDialogOpen}
          onOpenChange={(open) => { if (!open) handleCloseGenerateDialog(); }}
        >
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>{t("profile.apiKeyGenerateDialogTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("profile.apiKeyGenerateDialogDesc")}</AlertDialogDescription>
            </AlertDialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleGenerateApiKey();
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="api-key-name" className="mb-1.5 text-xs font-medium text-foreground">
                  {t("profile.apiKeyName")}
                </Label>
                <Input
                  id="api-key-name"
                  type="text"
                  value={apiKeyName}
                  onChange={(e) => setApiKeyName(e.target.value)}
                  placeholder={t("profile.apiKeyNamePlaceholder")}
                  maxLength={100}
                />
              </div>
              <div>
                <Label htmlFor="api-key-description" className="mb-1.5 text-xs font-medium text-foreground">
                  {t("profile.apiKeyDescription")}
                </Label>
                <Textarea
                  id="api-key-description"
                  value={apiKeyDescription}
                  onChange={(e) => setApiKeyDescription(e.target.value)}
                  placeholder={t("profile.apiKeyDescriptionPlaceholder")}
                  maxLength={255}
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="api-key-expires" className="mb-1.5 text-xs font-medium text-foreground">
                  {t("profile.apiKeyExpires")}
                </Label>
                <Select
                  value={apiKeyExpiresIn}
                  onValueChange={(val) => setApiKeyExpiresIn(val as ApiKeyExpiry)}
                >
                  <SelectTrigger id="api-key-expires" className="h-8 w-full text-xs">
                    <SelectValue placeholder={t("profile.apiKeyExpires")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30d">{t("profile.apiKeyDuration30d")}</SelectItem>
                    <SelectItem value="forever">{t("profile.apiKeyDurationForever")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {apiKeyExpiresIn === "forever" && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  {t("profile.apiKeyForeverWarning")}
                </p>
              )}
              <AlertDialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseGenerateDialog}
                  disabled={generatingApiKey}
                >
                  {t("profile.apiKeyCancel")}
                </Button>
                <Button type="submit" disabled={generatingApiKey} className="flex items-center gap-2">
                  {generatingApiKey && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {generatingApiKey ? t("profile.generatingApiKey") : t("profile.generateApiKey")}
                </Button>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* 7. View Generated API Key Dialog (One-time only) */}
      <AlertDialog
        open={viewingApiKeyId !== null}
        onOpenChange={(open) => { if (!open) handleCloseApiKeyView(); }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("profile.apiKeyViewTitle", "API Key Created")}</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="view-api-key-output" className="mb-2 text-xs font-medium text-foreground">
                {t("profile.apiKeyLabel")}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="view-api-key-output"
                  type="text"
                  value={fullApiKey || ""}
                  readOnly
                  className="font-mono text-xs bg-muted/40 select-all w-full"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(fullApiKey || "");
                    toast.success(t("profile.apiKeyCopied", "API key copied to clipboard!"));
                  }}
                  disabled={!fullApiKey}
                >
                  {t("profile.copyApiKey")}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("profile.apiKeyWarning")}
            </p>
          </div>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseApiKeyView}
              className="w-full"
            >
              {t("profile.close")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}

export default ProfilePage;
