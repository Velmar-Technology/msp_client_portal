import { Page } from "@/components/Page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Save,
  User,
  Mail,
  ShieldCheck,
  Globe,
  CheckCircle2,
  AlertCircle,
  Lock,
  Key,
  Clock,
  Info,
  Edit,
  Loader2,
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";

/* --- Sub-Components --- */

const StatusAlert = ({ message, type }: { message: string; type: "success" | "error" | "" }) => {
  if (!message || !type) return null;

  return (
    <Alert
      variant={type === "success" ? "default" : "destructive"}
      className={`mb-6 px-3 py-2 ${type === "success" ? "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900" : ""}`}
    >
      {type === "success" ? (
        <CheckCircle2 className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      <AlertTitle className="text-sm font-medium dark:text-zinc-100">
        {type === "success" ? "Success" : "Error"}
      </AlertTitle>
      <AlertDescription className="text-xs dark:text-zinc-300">{message}</AlertDescription>
    </Alert>
  );
};

interface ProfileIdentityCardProps {
  user: any;
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
    <section className="flex flex-col items-center gap-6 rounded-xl border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 bg-white p-6 shadow-sm sm:flex-row sm:items-start">
      <div className="relative shrink-0 group">
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="h-16 w-16 rounded-xl border border-zinc-200 dark:border-zinc-700 object-cover shadow-sm"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-2xl font-bold text-zinc-400 dark:text-zinc-500 shadow-sm">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
        )}
        <button
          type="button"
          onClick={onAvatarClick}
          disabled={uploadingAvatar}
          className="absolute -bottom-2 -right-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-1.5 shadow-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 cursor-pointer"
        >
          {uploadingAvatar ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-900 dark:text-zinc-100" />
          ) : (
            <Edit className="h-3.5 w-3.5 text-zinc-900 dark:text-zinc-100" />
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
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{user?.name}</h2>
        <div className="mt-1 flex items-center justify-center gap-1.5 sm:justify-start">
          <ShieldCheck className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          <span className="text-xs font-semibold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase">
            {user?.role}
          </span>
        </div>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 sm:justify-start">
          <Clock className="h-3.5 w-3.5" />
          {lastLoginText}
        </p>
      </div>
    </section>
  );
};

const AccountDetailsForm = ({ hook }: { hook: ReturnType<typeof useProfile> }) => {
  const { t, name, setName, email, setEmail, language, setLanguage, saving, message, messageType, handleSave } = hook;

  return (
    <form
      onSubmit={handleSave}
      className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm"
    >
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-6 py-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t("profile.accountDetails")}</h3>
      </div>
      <div className="p-6">
        <StatusAlert message={message} type={messageType} />

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label
              htmlFor="profile-name"
              className="mb-1.5 flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              <User className="h-3.5 w-3.5" /> {t("profile.fullName")}
            </label>
            <Input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 transition-all focus:border-zinc-400 dark:focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="profile-email"
              className="mb-1.5 flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              <Mail className="h-3.5 w-3.5" /> {t("profile.email")}
            </label>
            <Input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 transition-all focus:border-zinc-400 dark:focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              <Globe className="h-3.5 w-3.5" /> {t("profile.languageSetting")}
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full cursor-pointer rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 transition-all focus:border-zinc-400 dark:focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
            >
              <option value="en_US">{t("profile.languages.en_US")}</option>
              <option value="es_DO">{t("profile.languages.es_DO")}</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex cursor-pointer items-center gap-2 rounded-md bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-xs font-semibold text-white dark:text-zinc-900 shadow-sm transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? t("profile.saving") : t("profile.saveChanges")}
          </button>
        </div>
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
    pwMessage,
    pwMessageType,
    handlePasswordChange,
  } = hook;

  return (
    <form
      onSubmit={handlePasswordChange}
      className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm"
    >
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-6 py-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t("profile.changePassword")}</h3>
      </div>
      <div className="p-6">
        <StatusAlert message={pwMessage} type={pwMessageType} />

        <div className="space-y-4">
          <div>
            <label
              htmlFor="profile-current-password"
              className="mb-1.5 flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              <Lock className="h-3.5 w-3.5" /> {t("profile.currentPassword")}
            </label>
            <Input
              id="profile-current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 transition-all focus:border-zinc-400 dark:focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
              placeholder="••••••••••••"
              required
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2 pt-2">
            <div>
              <label
                htmlFor="profile-new-password"
                className="mb-1.5 flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                <Key className="h-3.5 w-3.5" /> {t("profile.newPassword")}
              </label>
              <Input
                id="profile-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 transition-all focus:border-zinc-400 dark:focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                placeholder="Min. 8 characters"
                required
              />
            </div>

            <div>
              <label
                htmlFor="profile-confirm-password"
                className="mb-1.5 flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                <Key className="h-3.5 w-3.5" /> {t("profile.confirmPassword")}
              </label>
              <Input
                id="profile-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 transition-all focus:border-zinc-400 dark:focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                placeholder="Repeat new password"
                required
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <Info className="h-3.5 w-3.5 shrink-0" />
            {t("profile.passwordRequirements")}
          </p>
          <button
            type="submit"
            disabled={changingPassword}
            className="flex cursor-pointer self-end sm:self-auto items-center gap-2 rounded-md bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-xs font-semibold text-white dark:text-zinc-900 shadow-sm transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
          >
            {changingPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
            {changingPassword ? t("profile.saving") : t("profile.updatePassword")}
          </button>
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
