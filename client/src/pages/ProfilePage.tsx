import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/userService';
import { Save, User, Mail, Shield } from 'lucide-react';

export function ProfilePage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await userService.updateProfile({ name, email });
      setMessage('Profile updated successfully');
    } catch {
      setMessage('Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-h1 text-primary" style={{ fontFamily: 'var(--font-heading)' }}>Profile</h1>
        <p className="text-body-lg text-on-surface-variant mt-1">Manage your account settings</p>
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
        <h3 className="text-h3 text-primary mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Account Details</h3>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-body-md ${message.includes('success') ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
            {message}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-label-md text-on-surface mb-1.5">
              <User className="h-4 w-4" /> Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-label-md text-on-surface mb-1.5">
              <Mail className="h-4 w-4" /> Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-primary text-on-primary px-6 py-2.5 rounded-lg text-label-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
