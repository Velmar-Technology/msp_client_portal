import React from "react";
import { User, ShieldCheck, Mail, Phone, Lock, Save, Globe, Edit, Clock, Loader2, Info, Key } from "lucide-react";
import { Page } from "@/components/Page";
import { Input } from "@/components/ui/input";
import { useProfile } from "@/hooks/useProfile";
import type { User as UserType } from "@/services/authService";

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
        <button
          type="button"
          onClick={onAvatarClick}
          disabled={uploadingAvatar}
          className="absolute -bottom-2 -right-2 rounded-md border border-border bg-card p-1.5 shadow-xs transition-colors hover:bg-muted disabled:opacity-50 cursor-pointer"
        >
          {uploadingAvatar ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground" />
          ) : (
            <Edit className="h-3.5 w-3.5 text-foreground" />
          )}
        </button>
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
  const { t, name, setName, email, setEmail, phoneNumber, setPhoneNumber, language, setLanguage, saving, isDirty, handleSave } = hook;

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
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground transition-all focus-visible:ring-1 focus-visible:ring-ring"
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
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground transition-all focus-visible:ring-1 focus-visible:ring-ring"
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
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground transition-all focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-foreground">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" /> {t("profile.languageSetting")}
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full cursor-pointer rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground transition-all focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="en_US">{t("profile.languages.en_US")}</option>
              <option value="es_DO">{t("profile.languages.es_DO")}</option>
            </select>
          </div>
        </div>

        {isDirty && (
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex cursor-pointer items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold shadow-xs transition-all hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? t("profile.saving") : t("profile.saveChanges")}
            </button>
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
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground transition-all focus-visible:ring-1 focus-visible:ring-ring"
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
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground transition-all focus-visible:ring-1 focus-visible:ring-ring"
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
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground transition-all focus-visible:ring-1 focus-visible:ring-ring"
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
            <button
              type="submit"
              disabled={changingPassword}
              className="flex cursor-pointer self-end sm:self-auto items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold shadow-xs transition-all hover:bg-primary/90 disabled:opacity-50"
            >
              {changingPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
              {changingPassword ? t("profile.saving") : t("profile.updatePassword")}
            </button>
          )}
        </div>
      </div>
    </form>
  );
};

/* --- Main Component --- */

export function ProfilePage() {
  const profileHook = useProfile();
  const { t, user, lastLoginText, uploadingAvatar, fileInputRef, handleAvatarClick, handleAvatarChange } = profileHook;

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
      </div>
    </Page>
  );
}

export default ProfilePage;
