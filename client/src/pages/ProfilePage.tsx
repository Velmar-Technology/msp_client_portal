import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/userService';
import { Save, User, Mail, Shield, Globe, CheckCircle2, AlertCircle, Lock, Key } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Page } from '@/components/Page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [language, setLanguage] = useState(user?.language || 'en_US');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwMessage, setPwMessage] = useState('');
  const [pwMessageType, setPwMessageType] = useState<'success' | 'error' | ''>('');

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
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || t('profile.passwordError');
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
      className="max-w-3xl"
      title={t('profile.title')}
      subtitle={t('profile.subtitle')}
    >

      {/* Avatar */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <span className="text-on-primary text-2xl font-bold">{user?.name?.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h2 className="text-h3 text-on-surface" style={{ fontFamily: 'var(--font-heading)' }}>{user?.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Shield className="h-4 w-4 text-secondary" />
              <span className="text-label-md text-secondary">{user?.role}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSave} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
        <h3 className="text-h3 text-primary mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
          {t('profile.accountDetails')}
        </h3>

        {message && messageType && (
          <Alert variant={messageType === 'success' ? 'success' : 'destructive'} className="mb-4 animate-fade-in">
            {messageType === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>{messageType === 'success' ? 'Success' : 'Error'}</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-label-md text-on-surface mb-1.5">
              <User className="h-4 w-4" /> {t('profile.fullName')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 bg-surface-container-lowest text-on-surface"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-label-md text-on-surface mb-1.5">
              <Mail className="h-4 w-4" /> {t('profile.email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 bg-surface-container-lowest text-on-surface"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-label-md text-on-surface mb-1.5">
              <Globe className="h-4 w-4" /> {t('profile.languageSetting')}
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 cursor-pointer text-on-surface"
            >
              <option value="en_US">{t('profile.languages.en_US')}</option>
              <option value="es_DO">{t('profile.languages.es_DO')}</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-primary text-on-primary px-6 py-2.5 rounded-lg text-label-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            {saving ? t('profile.saving') : t('profile.saveChanges')}
          </button>
        </div>
      </form>

      {/* Change Password Form */}
      <form onSubmit={handlePasswordChange} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mt-6 shadow-sm">
        <h3 className="text-h3 text-primary mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
          {t('profile.changePassword')}
        </h3>

        {pwMessage && pwMessageType && (
          <Alert variant={pwMessageType === 'success' ? 'success' : 'destructive'} className="mb-4 animate-fade-in">
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
            <label className="flex items-center gap-2 text-label-md text-on-surface mb-1.5">
              <Lock className="h-4 w-4" /> {t('profile.currentPassword')}
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 bg-surface-container-lowest text-on-surface"
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-label-md text-on-surface mb-1.5">
              <Key className="h-4 w-4" /> {t('profile.newPassword')}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 bg-surface-container-lowest text-on-surface"
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-label-md text-on-surface mb-1.5">
              <Key className="h-4 w-4" /> {t('profile.confirmPassword')}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 bg-surface-container-lowest text-on-surface"
              required
            />
          </div>

          <button
            type="submit"
            disabled={changingPassword}
            className="bg-primary text-on-primary px-6 py-2.5 rounded-lg text-label-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            {changingPassword ? t('profile.saving') : t('profile.saveChanges')}
          </button>
        </div>
      </form>
    </Page>
  );
}
