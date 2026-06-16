import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { CloudCog, Eye, EyeOff } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Brand */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <CloudCog className="h-10 w-10 text-primary" />
          <div>
            <h1 className="text-h1 text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
              MSP Portal
            </h1>
            <p className="text-label-sm text-on-surface-variant opacity-70">
              Infrastructure Management
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm">
          <h2 className="text-h2 text-primary mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
            Welcome back
          </h2>
          <p className="text-body-md text-on-surface-variant mb-6">
            Sign in to your help desk portal
          </p>

          {error && (
            <div className="mb-4 p-3 bg-error/10 border border-error/20 text-error text-body-md rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-label-md text-on-surface mb-1.5">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 transition-all placeholder:text-on-surface-variant/50"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-label-md text-on-surface mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full px-4 py-2.5 pr-12 border border-outline-variant rounded-lg text-body-md bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 transition-all placeholder:text-on-surface-variant/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 text-body-md text-on-surface-variant cursor-pointer">
                <input type="checkbox" className="rounded border-outline-variant" />
                <span>Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-label-md text-secondary hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary py-2.5 rounded-lg text-label-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-body-md text-on-surface-variant">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-secondary font-medium hover:underline">
              Create account
            </Link>
          </p>
        </div>

        {/* Demo credentials hint */}
        <div className="mt-4 p-3 bg-surface-container border border-outline-variant rounded-lg">
          <p className="text-label-sm text-on-surface-variant text-center">
            <strong>Demo:</strong> admin@msp-helpdesk.com / password123
          </p>
        </div>
      </div>
    </div>
  );
}
