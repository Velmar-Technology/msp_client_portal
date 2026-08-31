import { User, ShieldCheck, Mail, Phone, Lock, Save, Globe, Edit, Clock, Loader2, Info, Key, KeyRound, FileText, Eye, X } from "lucide-react";
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
import { useProfile } from "@/hooks/useProfile";
import type { User as UserType } from "@/services/authService";
import { DataTable } from "@/components/ui/data-table";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

/* --- Sub-components to keep functions < 40 lines --- */

interface ProfileIdentityCardProps {
  user: UserType | null;
  lastLoginText: string;
  uploadingAvatar: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onAvatarClick: () => void;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  t: (key: string) => string;
}

const ProfileIdentityCard = ({
  user,
  lastLoginText,
  uploadingAvatar,
  fileInputRef,
  onAvatarClick,
  onAvatarChange,
  t,
}: ProfileIdentityCardProps) => {
  return (
    <section className="flex flex-col items-center gap-6 rounded-xl border border-border bg-card p-6 shadow-xs sm:flex-row sm:items-start">
      <div className="relative shrink-0 group">
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="h-16 w-16 rounded-xl border border-border object-cover shadow-xs"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-muted text-2xl font-bold text-muted-foreground shadow-xs">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={onAvatarClick}
          disabled={uploadingAvatar}
          className="absolute -bottom-2 -right-2 rounded-md border border-border bg-card shadow-xs transition-colors hover:bg-muted disabled:opacity-50 cursor-pointer"
        >
          {uploadingAvatar ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground" />
          ) : (
            <Edit className="h-3.5 w-3.5 text-foreground" />
          )}
        </Button>
        <Input
          id="profile-avatar-upload"
          type="file"
          ref={fileInputRef}
          onChange={onAvatarChange}
          accept="image/*"
          className="hidden"
          aria-label={t("profile.avatarInput")}
        />
      </div>
      <div className="flex-1 text-center sm:text-left">
        <h2 className="text-lg font-semibold text-foreground font-heading">{user?.name}</h2>
        <div className="mt-1 flex items-center justify-center gap-1.5 sm:justify-start">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {user?.role}
          </span>
        </div>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground sm:justify-start">
          <Clock className="h-3.5 w-3.5" />
          {lastLoginText}
        </p>
      </div>
    </section>
  );
};

const AccountDetailsForm = ({ hook }: { hook: ReturnType<typeof useProfile> }) => {
  const { t, name, setName, email, setEmail, phoneNumber, setPhoneNumber, rnc, setRnc, language, setLanguage, saving, isDirty, handleSave } = hook;

  return (
    <form
      onSubmit={handleSave}
      className="overflow-hidden rounded-xl border border-border bg-card shadow-xs"
    >
      <div className="border-b border-border bg-muted/30 px-6 py-4">
        <h3 className="text-sm font-semibold text-foreground font-heading">{t("profile.accountDetails")}</h3>
      </div>
      <div className="p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label
              htmlFor="profile-name"
              className="mb-1.5 flex items-center gap-2 text-xs font-medium text-foreground"
            >
              <User className="h-3.5 w-3.5 text-muted-foreground" /> {t("profile.fullName")}
            </label>
            <Input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label
              htmlFor="profile-email"
              className="mb-1.5 flex items-center gap-2 text-xs font-medium text-foreground"
            >
              <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {t("profile.email")}
            </label>
            <Input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label
              htmlFor="profile-phone"
              className="mb-1.5 flex items-center gap-2 text-xs font-medium text-foreground"
            >
              <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {t("profile.phoneNumber", "Phone Number (WhatsApp)")}
            </label>
            <Input
              id="profile-phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 (809) 000-0000"
            />
          </div>

          <div>
            <label
              htmlFor="profile-rnc"
              className="mb-1.5 flex items-center gap-2 text-xs font-medium text-foreground"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground" /> {t("billing.rncLabel", "RNC / Cédula (NCF)")}
            </label>
            <Input
              id="profile-rnc"
              type="text"
              value={rnc}
              onChange={(e) => setRnc(e.target.value)}
              placeholder={t("billing.rncPlaceholder", "e.g. 1-32-12345-6 or 402-0000000-0")}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="profile-language-select" className="mb-1.5 flex items-center gap-2 text-xs font-medium text-foreground">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" /> {t("profile.languageSetting")}
            </label>
            <Select value={language} onValueChange={(val) => setLanguage(val)}>
              <SelectTrigger id="profile-language-select" size="lg" className="w-full text-xs">
                <SelectValue placeholder={t("profile.languageSetting")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en_US">{t("profile.languages.en_US")}</SelectItem>
                <SelectItem value="es_DO">{t("profile.languages.es_DO")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isDirty && (
          <div className="mt-6 flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? t("profile.saving") : t("profile.saveChanges")}
            </Button>
          </div>
        )}
      </div>
    </form>
  );
};

const ChangePasswordForm = ({ hook }: { hook: ReturnType<typeof useProfile> }) => {
  const {
    t,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    changingPassword,
    isPasswordDirty,
    handlePasswordChange,
  } = hook;

  return (
    <form
      onSubmit={handlePasswordChange}
      className="overflow-hidden rounded-xl border border-border bg-card shadow-xs"
    >
      <div className="border-b border-border bg-muted/30 px-6 py-4">
        <h3 className="text-sm font-semibold text-foreground font-heading">{t("profile.changePassword")}</h3>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          <div>
            <label
              htmlFor="profile-current-password"
              className="mb-1.5 flex items-center gap-2 text-xs font-medium text-foreground"
            >
              <Lock className="h-3.5 w-3.5 text-muted-foreground" /> {t("profile.currentPassword")}
            </label>
            <Input
              id="profile-current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2 pt-2">
            <div>
              <label
                htmlFor="profile-new-password"
                className="mb-1.5 flex items-center gap-2 text-xs font-medium text-foreground"
              >
                <Key className="h-3.5 w-3.5 text-muted-foreground" /> {t("profile.newPassword")}
              </label>
              <Input
                id="profile-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
              />
            </div>

            <div>
              <label
                htmlFor="profile-confirm-password"
                className="mb-1.5 flex items-center gap-2 text-xs font-medium text-foreground"
              >
                <Key className="h-3.5 w-3.5 text-muted-foreground" /> {t("profile.confirmPassword")}
              </label>
              <Input
                id="profile-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 shrink-0" />
            {t("profile.passwordRequirements")}
          </p>
          {isPasswordDirty && (
            <Button
              type="submit"
              disabled={changingPassword}
              className="flex self-end sm:self-auto items-center gap-2"
            >
              {changingPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
              {changingPassword ? t("profile.saving") : t("profile.updatePassword")}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
};

   /* --- Main Component --- */

export function ProfilePage() {
  const profileHook = useProfile();
  const { t, user, lastLoginText, uploadingAvatar, fileInputRef, handleAvatarClick, handleAvatarChange, apiKeys, generatingApiKey, loadingApiKeys, viewingApiKeyId, fullApiKey, handleGenerateApiKey, handleDeleteApiKey, handleViewApiKey, handleCloseApiKeyView } = profileHook;

  // Only show API key management for ADMIN users
  const isAdmin = user?.role === 'ADMIN';

  return (
    <Page className="max-w-4xl" title={t("profile.title")} subtitle={t("profile.subtitle")}>
      <div className="grid gap-6">
        <ProfileIdentityCard
          user={user}
          lastLoginText={lastLoginText}
          uploadingAvatar={uploadingAvatar}
          fileInputRef={fileInputRef}
          onAvatarClick={handleAvatarClick}
          onAvatarChange={handleAvatarChange}
          t={t}
        />
        <AccountDetailsForm hook={profileHook} />
        <ChangePasswordForm hook={profileHook} />
        
        {/* API Key Management - ADMIN Only */}
        {isAdmin && (
          <>
            {/* API Key DataTable */}
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <div className="border-b border-border bg-muted/30 px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground font-heading flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-primary" />
                    {t("profile.apiKeyTitle")}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("profile.apiKeyDesc")}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleGenerateApiKey}
                  disabled={generatingApiKey}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  {generatingApiKey ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Key className="h-3.5 w-3.5" />
                  )}
                  {generatingApiKey ? t("profile.generatingApiKey") : t("profile.generateApiKey")}
                </Button>
              </div>

              {/* API Key DataTable */}
              <div className="p-6">
                <DataTable
                  columns={[
                    {
                      accessorKey: "name",
                      header: "Key Name",
                      cell: ({ row }) => (
                        <span className="font-mono">{row.original.name}</span>
                      ),
                    },
                    {
                      accessorKey: "createdAt",
                      header: "Created",
                      cell: ({ row }) => (
                        <span className="text-[10px]">
                          {new Date(row.original.createdAt).toLocaleDateString()}{
                          " "
                        }
                        {new Date(row.original.createdAt).toLocaleTimeString()}
                        </span>
                      ),
                    },
                    {
                      accessorKey: "actions",
                      header: "Actions",
                      cell: ({ row }) => (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewApiKey(row.original.id)}
                            className="hover:text-primary"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDeleteApiKey(row.original.id)}
                            className="hover:text-destructive"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ),
                    },
                  ]}
                  data={apiKeys}
                  loading={loadingApiKeys}
                  noDataMessage={t("profile.noApiKeys", "No API keys found. Generate one to get started.")}
                  enableRowSelection={false}
                />
              </div>

              {/* Security Warning */}
              {!loadingApiKeys && apiKeys.length > 0 && (
                <div className="p-6 space-y-2 bg-muted/10 border-t border-border">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Info className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    {t("profile.apiKeyWarning")}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* API Key View Dialog */}
      <AlertDialog
        open={viewingApiKeyId !== null}
        onOpenChange={(open) => { if (!open) handleCloseApiKeyView(); }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("profile.apiKeyViewTitle", "API Key")}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogContent>
            <div className="space-y-4">
              <div>
                <Label
                  htmlFor="view-api-key-output"
                  className="mb-2 text-xs font-medium text-foreground"
                >
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
          </AlertDialogContent>
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
