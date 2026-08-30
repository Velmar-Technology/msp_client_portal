import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services/userService";
import { useUrlState } from "@/hooks/useUrlState";

export function useProfile() {
  const { t, i18n } = useTranslation();
  const { user, updateUser } = useAuth();
  const { getParam, setParam } = useUrlState();

  const activeTab = getParam("tab", "account");

  const setActiveTab = useCallback(
    (tab: string) => {
      setParam("tab", tab === "account" ? null : tab);
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

  const formatRelativeTime = useCallback((isoDate: string): string => {
    const now = Date.now();
    const then = new Date(isoDate).getTime();
    const diffMs = now - then;

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);

    if (i18n.language?.startsWith("es")) {
      if (seconds < 60) return "hace unos segundos";
      if (minutes === 1) return "hace 1 minuto";
      if (minutes < 60) return `hace ${minutes} minutos`;
      if (hours === 1) return "hace 1 hora";
      if (hours < 24) return `hace ${hours} horas`;
      if (days === 1) return "hace 1 día";
      if (days < 7) return `hace ${days} días`;
      if (weeks === 1) return "hace 1 semana";
      if (weeks < 4) return `hace ${weeks} semanas`;
      if (months === 1) return "hace 1 mes";
      return `hace ${months} meses`;
    }

    if (seconds < 60) return "just now";
    if (minutes === 1) return "1 minute ago";
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours === 1) return "1 hour ago";
    if (hours < 24) return `${hours} hours ago`;
    if (days === 1) return "1 day ago";
    if (days < 7) return `${days} days ago`;
    if (weeks === 1) return "1 week ago";
    if (weeks < 4) return `${weeks} weeks ago`;
    if (months === 1) return "1 month ago";
    return `${months} months ago`;
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

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [generatingApiKey, setGeneratingApiKey] = useState(false);

  const handleGenerateApiKey = useCallback(async () => {
    setGeneratingApiKey(true);
    try {
      const key = await userService.generateApiKey();
      setApiKey(key);
      toast.success(t("profile.apiKeySuccess", "API key generated successfully"));
    } catch {
      toast.error(t("profile.apiKeyError", "Failed to generate API key"));
    } finally {
      setGeneratingApiKey(false);
    }
  }, [t]);

  const handleCopyApiKey = useCallback(async () => {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      toast.success(t("profile.apiKeyCopied", "API key copied to clipboard!"));
    } catch {
      toast.error(t("common.copyFailed", "Failed to copy to clipboard"));
    }
  }, [apiKey, t]);

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
    apiKey,
    generatingApiKey,
    handleAvatarClick,
    handleAvatarChange,
    handlePasswordChange,
    handleSave,
    handleGenerateApiKey,
    handleCopyApiKey,
  };
}
