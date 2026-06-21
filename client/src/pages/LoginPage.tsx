import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import logoUrl from '../assets/logo.png';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { GoogleLoginButton } from '../components/auth/GoogleLoginButton';

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSuccess = async (idToken: string) => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle(idToken);
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message || 
        (i18n.language === 'es_DO' ? 'Error al autenticar con Google' : 'Google authentication failed')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = (errMsg?: string) => {
    setError(errMsg || (i18n.language === 'es_DO' ? 'Error al autenticar con Google' : 'Google authentication failed'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message || 
        (i18n.language === 'es_DO' ? 'Correo o contraseña incorrectos' : 'Invalid email or password')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Brand */}
        <div className="flex flex-col items-center justify-center mb-8 gap-3">
          <img src={logoUrl} alt="Velmar Technology SRL" className="h-24 w-auto object-contain dark:brightness-110" />
          <div className="text-center">
            <span className="text-xs uppercase tracking-widest text-brand-gradient font-bold bg-muted dark:bg-muted/30 px-3 py-1 rounded-full">
              {t('topNav.portal')}
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm">
          <h2 className="text-h2 text-primary mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
            {t('login.welcome')}
          </h2>
          <p className="text-body-md text-on-surface-variant mb-6">
            {t('login.signInToPortal')}
          </p>

          {error && (
            <Alert variant="destructive" className="mb-4 animate-fade-in">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-label-md text-on-surface mb-1.5">
                {t('login.emailAddress')}
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.emailPlaceholder')}
                required
                className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 transition-all placeholder:text-on-surface-variant/50 text-on-surface"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-label-md text-on-surface mb-1.5">
                {t('login.password')}
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('login.enterPasswordPlaceholder')}
                  required
                  className="w-full px-4 py-2.5 pr-12 border border-outline-variant rounded-lg text-body-md bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 transition-all placeholder:text-on-surface-variant/50 text-on-surface"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 text-body-md text-on-surface-variant cursor-pointer">
                <input type="checkbox" className="rounded border-outline-variant" />
                <span>{t('login.rememberMe')}</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-label-md text-secondary hover:underline"
              >
                {t('login.forgotPassword')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary py-2.5 rounded-lg text-label-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
              ) : (
                t('login.signIn')
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-outline-variant" />
            </div>
            <div className="relative flex justify-center text-label-sm uppercase">
              <span className="bg-surface-container-lowest px-2 text-on-surface-variant/70">
                {t('login.or') || 'Or continue with'}
              </span>
            </div>
          </div>

          <GoogleLoginButton
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            text="signin_with"
          />

          <p className="mt-6 text-center text-body-md text-on-surface-variant">
            {t('login.dontHaveAccount')}{' '}
            <Link to="/register" className="text-secondary font-medium hover:underline">
              {t('login.createAccount')}
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
