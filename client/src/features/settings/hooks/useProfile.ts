import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { userService, type ApiKeySummary, type ApiKeyExpiry } from "@/features/users";
import { useUrlState } from "@/hooks/useUrlState";

/**
 * Manages profile settings, credentials, avatar upload, and API key management.
 * @returns Profile state, actions, and localized helpers.
 */
export function useProfile() {
  const { t, i18n } = useTranslation();
  const { user, updateUser, logout } = useAuth();
  const { getParam, setParam } = useUrlState();

  const rawTab = getParam("tab", "profile");
  const activeTab = rawTab === "account" ? "profile" : rawTab;

  const setActiveTab = useCallback(
    (tab: string) => {
      setParam("tab", tab === "profile" ? null : tab);
    },
    [setParam]
  );

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [rnc, setRnc] = useState(user?.rnc || "");
  const [language, setLanguage] = useState(user?.language || "en_US");
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const handleAvatarClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAvatarChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const result = await userService.uploadAvatar(file);
      updateUser({ avatarUrl: result.avatarUrl });
      toast.success(t("profile.avatarSuccess", "Profile picture updated successfully"));
    } catch {
      toast.error(t("profile.avatarError", "Failed to upload profile picture"));
    } finally {
      setUploadingAvatar(false);
      if (e.target) e.target.value = "";
    }
  }, [t, updateUser]);

  const handlePasswordChange = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error(t("profile.passwordMin"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("profile.passwordsMismatch"));
      return;
    }
    setChangingPassword(true);
    try {
      await userService.changePassword({ currentPassword, newPassword, confirmPassword });
      toast.success(t("profile.passwordSuccess"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      const errMsg = error?.response?.data?.message || t("profile.passwordError");
      toast.error(errMsg);
    } finally {
      setChangingPassword(false);
    }
  }, [currentPassword, newPassword, confirmPassword, t]);

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await userService.updateProfile({ name, email, language, phoneNumber, rnc });
      updateUser({ name, email, language, phoneNumber, rnc });
      await i18n.changeLanguage(language);
      toast.success(t("profile.success"));
    } catch {
      toast.error(t("profile.error"));
    } finally {
      setSaving(false);
    }
  }, [name, email, language, phoneNumber, rnc, t, i18n, updateUser]);

  const updateSingleField = useCallback(
    async (patch: { name?: string; email?: string; language?: string; phoneNumber?: string; rnc?: string }): Promise<boolean> => {
      setSaving(true);
      try {
        await userService.updateProfile(patch);
        updateUser(patch);
        if (patch.language) {
          await i18n.changeLanguage(patch.language);
        }
        if (patch.name !== undefined) setName(patch.name);
        if (patch.email !== undefined) setEmail(patch.email);
        if (patch.phoneNumber !== undefined) setPhoneNumber(patch.phoneNumber);
        if (patch.rnc !== undefined) setRnc(patch.rnc);
        if (patch.language !== undefined) setLanguage(patch.language);
        toast.success(t("profile.success"));
        return true;
      } catch {
        toast.error(t("profile.error"));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [t, i18n, updateUser]
  );

  const currentLocale = i18n.language?.startsWith("es") ? "es-DO" : "en-US";

  const formatRelativeTime = useCallback((isoDate: string): string => {
    const now = Date.now();
    const then = new Date(isoDate).getTime();
    const diffMs = now - then;

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    const locale = i18n.language?.startsWith("es") ? "es-DO" : "en-US";
    try {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
      if (seconds < 60) {
        return rtf.format(-Math.max(seconds, 0), "second");
      }
      if (minutes < 60) {
        return rtf.format(-minutes, "minute");
      }
      if (hours < 24) {
        return rtf.format(-hours, "hour");
      }
      if (days < 30) {
        return rtf.format(-days, "day");
      }
      if (months < 12) {
        return rtf.format(-months, "month");
      }
      return rtf.format(-years, "year");
    } catch {
      return new Date(isoDate).toLocaleDateString(locale);
    }
  }, [i18n.language]);

  const lastLoginText = user?.lastLoginAt
    ? t("profile.lastLogin", {
        time: formatRelativeTime(user.lastLoginAt),
        ip: user.lastLoginIp || "unknown",
      })
    : t("profile.lastLoginNever");

  const isDirty =
    name !== (user?.name || "") ||
    email !== (user?.email || "") ||
    phoneNumber !== (user?.phoneNumber || "") ||
    rnc !== (user?.rnc || "") ||
    language !== (user?.language || "en_US");

  const isPasswordDirty =
    currentPassword.length > 0 ||
    newPassword.length > 0 ||
    confirmPassword.length > 0;

  const [apiKeys, setApiKeys] = useState<ApiKeySummary[]>([]);
  const [generatingApiKey, setGeneratingApiKey] = useState(false);
  const [loadingApiKeys, setLoadingApiKeys] = useState(false);
  const [viewingApiKeyId, setViewingApiKeyId] = useState<string | null>(null);
  const [fullApiKey, setFullApiKey] = useState<string | null>(null);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [apiKeyName, setApiKeyName] = useState("");
  const [apiKeyDescription, setApiKeyDescription] = useState("");
  const [apiKeyExpiresIn, setApiKeyExpiresIn] = useState<ApiKeyExpiry>("30d");

  const loadApiKeys = useCallback(async () => {
    if (!user?.id) return;
    setLoadingApiKeys(true);
    try {
      const keys = await userService.getApiKeys();
      setApiKeys(keys);
    } catch {
      toast.error(t("profile.apiKeyListError", "Failed to load API keys"));
    } finally {
      setLoadingApiKeys(false);
    }
  }, [user?.id, t]);

  // Load API keys on mount and when user changes
  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  const handleOpenGenerateDialog = useCallback(() => {
    setApiKeyName("");
    setApiKeyDescription("");
    setApiKeyExpiresIn("30d");
    setGenerateDialogOpen(true);
  }, []);

  const handleCloseGenerateDialog = useCallback(() => {
    setGenerateDialogOpen(false);
  }, []);

  const handleGenerateApiKey = useCallback(async () => {
    setGeneratingApiKey(true);
    try {
      const generated = await userService.generateApiKey({
        name: apiKeyName.trim() || undefined,
        description: apiKeyDescription.trim() || undefined,
        expiresIn: apiKeyExpiresIn,
      });
      // The full key is only shown once at creation time; it cannot be retrieved later
      setViewingApiKeyId(generated.id);
      setFullApiKey(generated.fullKey);
      setGenerateDialogOpen(false);
      // Fetch updated list to include the new key
      await loadApiKeys();
      toast.success(t("profile.apiKeySuccess", "API key generated successfully"));
    } catch {
      toast.error(t("profile.apiKeyError", "Failed to generate API key"));
    } finally {
      setGeneratingApiKey(false);
    }
  }, [apiKeyName, apiKeyDescription, apiKeyExpiresIn, t, loadApiKeys]);

  const handleDeleteApiKey = useCallback(async (keyId: string) => {
    if (!window.confirm(t("profile.deleteApiKeyConfirm", "Are you sure you want to delete this API key? This action cannot be undone."))) {
      return;
    }

    try {
      await userService.deleteApiKey(keyId);
      // Fetch updated list after deletion
      await loadApiKeys();
      toast.success(t("profile.apiKeyDeleted", "API key deleted successfully"));
    } catch {
      toast.error(t("profile.apiKeyDeleteError", "Failed to delete API key"));
    }
  }, [loadApiKeys, t]);

  const handleCloseApiKeyView = useCallback(() => {
    setViewingApiKeyId(null);
    setFullApiKey(null);
  }, []);

return {
     t,
     user,
     activeTab,
     setActiveTab,
     name, setName,
     email, setEmail,
     phoneNumber, setPhoneNumber,
     rnc, setRnc,
     language, setLanguage,
     saving,
     isDirty,
     fileInputRef,
     uploadingAvatar,
     currentPassword, setCurrentPassword,
     newPassword, setNewPassword,
     confirmPassword, setConfirmPassword,
     changingPassword,
     isPasswordDirty,
     lastLoginText,
     currentLocale,
     apiKeys,
     generatingApiKey,
     loadingApiKeys,
     viewingApiKeyId,
     fullApiKey,
     generateDialogOpen,
     apiKeyName, setApiKeyName,
     apiKeyDescription, setApiKeyDescription,
     apiKeyExpiresIn, setApiKeyExpiresIn,
     handleAvatarClick,
     handleAvatarChange,
     handlePasswordChange,
     handleSave,
     updateSingleField,
     logout,
     handleOpenGenerateDialog,
     handleCloseGenerateDialog,
     handleGenerateApiKey,
     handleDeleteApiKey,
     handleCloseApiKeyView,
   };
}
