import { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/userService';
import { Save, User, Mail, ShieldCheck, Globe, CheckCircle2, AlertCircle, Lock, Key, Clock, Info, Edit } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Page } from '@/components/Page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';

export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [language, setLanguage] = useState(user?.language || 'en_US');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setMessage('');
    setMessageType('');
    try {
      const result = await userService.uploadAvatar(file);
      updateUser({ avatarUrl: result.avatarUrl });
      setMessage(t('profile.avatarSuccess', 'Profile picture updated successfully'));
      setMessageType('success');
    } catch {
      setMessage(t('profile.avatarError', 'Failed to upload profile picture'));
      setMessageType('error');
    } finally {
      setUploadingAvatar(false);
      if (e.target) e.target.value = '';
    }
  };

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwMessage, setPwMessage] = useState('');
  const [pwMessageType, setPwMessageType] = useState<'success' | 'error' | ''>('');

  function formatRelativeTime(isoDate: string): string {
    const now = Date.now();
    const then = new Date(isoDate).getTime();
    const diffMs = now - then;

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);

    if (i18n.language?.startsWith('es')) {
      if (seconds < 60) return 'hace unos segundos';
      if (minutes === 1) return 'hace 1 minuto';
      if (minutes < 60) return `hace ${minutes} minutos`;
      if (hours === 1) return 'hace 1 hora';
      if (hours < 24) return `hace ${hours} horas`;
      if (days === 1) return 'hace 1 día';
      if (days < 7) return `hace ${days} días`;
      if (weeks === 1) return 'hace 1 semana';
      if (weeks < 4) return `hace ${weeks} semanas`;
      if (months === 1) return 'hace 1 mes';
      return `hace ${months} meses`;
    }

    if (seconds < 60) return 'just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    if (weeks === 1) return '1 week ago';
    if (weeks < 4) return `${weeks} weeks ago`;
    if (months === 1) return '1 month ago';
    return `${months} months ago`;
  }

  const lastLoginText = user?.lastLoginAt
    ? t('profile.lastLogin', {
        time: formatRelativeTime(user.lastLoginAt),
        ip: user.lastLoginIp || 'unknown',
      })
    : t('profile.lastLoginNever');

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPwMessage(t('profile.passwordMin'));
      setPwMessageType('error');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage(t('profile.passwordsMismatch'));
      setPwMessageType('error');
      return;
    }
    setChangingPassword(true);
    setPwMessage('');
    setPwMessageType('');
    try {
      await userService.changePassword({ currentPassword, newPassword, confirmPassword });
      setPwMessage(t('profile.passwordSuccess'));
      setPwMessageType('success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      const errMsg = error?.response?.data?.message || t('profile.passwordError');
      setPwMessage(errMsg);
      setPwMessageType('error');
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setMessageType('');
    try {
      await userService.updateProfile({ name, email, language });
      updateUser({ name, email, language });
      await i18n.changeLanguage(language);
      setMessage(t('profile.success'));
      setMessageType('success');
    } catch {
      setMessage(t('profile.error'));
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page
      className="max-w-5xl"
      title={t('profile.title')}
      subtitle={t('profile.subtitle')}
    >
      <div className="grid gap-6">
        {/* Profile Identity Card */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col sm:flex-row items-center sm:items-start gap-6 shadow-sm p-6">
          <div className="relative group shrink-0">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="rounded-2xl shadow-lg w-16 h-16 object-cover border border-outline-variant"
              />
            ) : (
              <div className="rounded-2xl bg-primary-container flex items-center justify-center text-white text-4xl font-bold shadow-lg w-16 h-16">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={uploadingAvatar}
              className="absolute -bottom-2 -right-2 bg-white border border-outline-variant p-2 rounded-lg shadow-md hover:bg-surface-container-high transition-all cursor-pointer disabled:opacity-50"
            >
              <Edit className="h-4 w-4 text-primary" />
            </button>
            <Input
              id="profile-avatar-upload"
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="hidden"
            />
          </div>
          <div className="text-center sm:text-left flex-1">
            <h2 className="font-h2 text-h2 text-on-surface">{user?.name}</h2>
            <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
              <ShieldCheck className="h-4 w-4 text-secondary" />
              <span className="font-label-md text-label-md text-secondary font-bold tracking-wider uppercase">
                {user?.role}
              </span>
            </div>
            <p className="text-on-surface-variant font-label-sm text-label-sm mt-3 flex items-center justify-center sm:justify-start gap-2 opacity-80">
              <Clock className="h-3.5 w-3.5" />
              {lastLoginText}
            </p>
          </div>
        </section>

        {/* Account Details Form */}
        <form onSubmit={handleSave} className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          <div className="px-8 py-5 border-b border-outline-variant bg-surface-container-low/30">
            <h3 className="font-h3 text-h3 text-on-surface">
              {t('profile.accountDetails')}
            </h3>
          </div>
          <div className="p-6 space-y-6">
            {message && messageType && (
              <Alert variant={messageType === 'success' ? 'success' : 'destructive'} className="animate-fade-in">
                {messageType === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>{messageType === 'success' ? 'Success' : 'Error'}</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="profile-name" className="flex items-center gap-2 font-label-md text-label-md text-on-surface mb-1.5">
                  <User className="h-4 w-4" /> {t('profile.fullName')}
                </label>
                <Input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-outline-variant rounded-lg font-body-md text-body-md bg-surface-container-lowest text-on-surface focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
                  required
                />
              </div>

              <div>
                <label htmlFor="profile-email" className="flex items-center gap-2 font-label-md text-label-md text-on-surface mb-1.5">
                  <Mail className="h-4 w-4" /> {t('profile.email')}
                </label>
                <Input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-outline-variant rounded-lg font-body-md text-body-md bg-surface-container-lowest text-on-surface focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2 font-label-md text-label-md text-on-surface mb-1.5">
                  <Globe className="h-4 w-4" /> {t('profile.languageSetting')}
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 cursor-pointer transition-all"
                >
                  <option value="en_US">{t('profile.languages.en_US')}</option>
                  <option value="es_DO">{t('profile.languages.es_DO')}</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-primary text-on-primary font-label-md text-label-md px-6 py-2.5 rounded-lg hover:opacity-90 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? t('profile.saving') : t('profile.saveChanges')}
              </button>
            </div>
          </div>
        </form>

        {/* Change Password Form */}
        <form onSubmit={handlePasswordChange} className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          <div className="px-8 py-5 border-b border-outline-variant bg-surface-container-low/30">
            <h3 className="font-h3 text-h3 text-on-surface">
              {t('profile.changePassword')}
            </h3>
          </div>
          <div className="p-6 space-y-6">
            {pwMessage && pwMessageType && (
              <Alert variant={pwMessageType === 'success' ? 'success' : 'destructive'} className="animate-fade-in">
                {pwMessageType === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>{pwMessageType === 'success' ? 'Success' : 'Error'}</AlertTitle>
                <AlertDescription>{pwMessage}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="profile-current-password" className="flex items-center gap-2 font-label-md text-label-md text-on-surface mb-1.5">
                  <Lock className="h-4 w-4" /> {t('profile.currentPassword')}
                </label>
                <Input
                  id="profile-current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-outline-variant rounded-lg font-body-md text-body-md bg-surface-container-lowest text-on-surface focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
                  placeholder="••••••••••••"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6 pt-2">
                <div>
                  <label htmlFor="profile-new-password" className="flex items-center gap-2 font-label-md text-label-md text-on-surface mb-1.5">
                    <Key className="h-4 w-4" /> {t('profile.newPassword')}
                  </label>
                  <Input
                    id="profile-new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-outline-variant rounded-lg font-body-md text-body-md bg-surface-container-lowest text-on-surface focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
                    placeholder="Min. 8 characters"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="profile-confirm-password" className="flex items-center gap-2 font-label-md text-label-md text-on-surface mb-1.5">
                    <Key className="h-4 w-4" /> {t('profile.confirmPassword')}
                  </label>
                  <Input
                    id="profile-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-outline-variant rounded-lg font-body-md text-body-md bg-surface-container-lowest text-on-surface focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
                    placeholder="Repeat new password"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <p className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-2 opacity-85">
                <Info className="h-4 w-4 text-secondary shrink-0" />
                {t('profile.passwordRequirements')}
              </p>
              <button
                type="submit"
                disabled={changingPassword}
                className="flex items-center gap-2 bg-primary text-on-primary font-label-md text-label-md px-6 py-2.5 rounded-lg hover:opacity-90 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50 self-end sm:self-auto"
              >
                <Key className="h-4 w-4" />
                {changingPassword ? t('profile.saving') : t('profile.updatePassword')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Page>
  );
}
