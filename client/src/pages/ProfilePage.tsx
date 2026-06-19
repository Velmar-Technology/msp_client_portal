import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/userService';
import { Save, User, Mail, Shield, Globe, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [language, setLanguage] = useState(user?.language || 'en_US');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await userService.updateProfile({ name, email, language });
      updateUser({ name, email, language });
      await i18n.changeLanguage(language);
      setMessage(t('profile.success'));
    } catch {
      setMessage(t('profile.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="mb-8">
        <h1 className="text-h1 text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
          {t('profile.title')}
        </h1>
        <p className="text-body-lg text-on-surface-variant mt-1">
          {t('profile.subtitle')}
        </p>
      </div>

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

        {message && (
          <Alert variant={message === t('profile.success') ? 'default' : 'destructive'} className="mb-4 animate-fade-in">
            {message === t('profile.success') ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>{message === t('profile.success') ? 'Success' : 'Error'}</AlertTitle>
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
    </div>
  );
}
