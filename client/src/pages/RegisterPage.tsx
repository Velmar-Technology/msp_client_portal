import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { CloudCog, Eye, EyeOff } from 'lucide-react';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register(email, name, password, confirmPassword);
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex items-center gap-3 justify-center mb-8">
          <CloudCog className="h-10 w-10 text-primary" />
          <div>
            <h1 className="text-h1 text-primary" style={{ fontFamily: 'var(--font-heading)' }}>MSP Portal</h1>
            <p className="text-label-sm text-on-surface-variant opacity-70">Infrastructure Management</p>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm">
          <h2 className="text-h2 text-primary mb-1" style={{ fontFamily: 'var(--font-heading)' }}>Create Account</h2>
          <p className="text-body-md text-on-surface-variant mb-6">Register for your help desk portal</p>

          {error && <div className="mb-4 p-3 bg-error/10 border border-error/20 text-error text-body-md rounded-lg">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reg-name" className="block text-label-md text-on-surface mb-1.5">Full Name</label>
              <input id="reg-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Mitchell" required minLength={2} className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 transition-all" />
            </div>
            <div>
              <label htmlFor="reg-email" className="block text-label-md text-on-surface mb-1.5">Email Address</label>
              <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 transition-all" />
            </div>
            <div>
              <label htmlFor="reg-password" className="block text-label-md text-on-surface mb-1.5">Password</label>
              <div className="relative">
                <input id="reg-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" required minLength={8} className="w-full px-4 py-2.5 pr-12 border border-outline-variant rounded-lg text-body-md bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 transition-all" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="reg-confirm" className="block text-label-md text-on-surface mb-1.5">Confirm Password</label>
              <input id="reg-confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat your password" required className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 transition-all" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-primary text-on-primary py-2.5 rounded-lg text-label-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" /> : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-body-md text-on-surface-variant">
            Already have an account? <Link to="/login" className="text-secondary font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
