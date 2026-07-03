import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import logoUrl from '../assets/logo.png';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { GoogleLoginButton } from '../components/auth/GoogleLoginButton';
import { Input } from '@/components/ui/input';

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
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 transition-colors">
      <div className="w-full max-w-[400px] animate-fade-in">
        {/* Brand */}
        <div className="flex flex-col items-center justify-center mb-8 gap-3">
          <img src={logoUrl} alt="Velmar Technology SRL" className="h-20 w-auto object-contain dark:brightness-110" />
          <div className="text-center">
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-1 rounded-full shadow-sm">
              {t('topNav.portal')}
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 mb-1 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            {t('login.welcome')}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 font-medium">
            {t('login.signInToPortal')}
          </p>

          {error && (
            <Alert variant="destructive" className="mb-5 animate-fade-in py-2.5 px-3">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-xs font-bold mb-0.5">Error</AlertTitle>
              <AlertDescription className="text-[11px] leading-tight">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                {t('login.emailAddress')}
              </label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.emailPlaceholder')}
                required
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-sm"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                {t('login.password')}
              </label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('login.enterPasswordPlaceholder')}
                  required
                  className="w-full px-3 py-2 pr-10 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center pt-1">
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 cursor-pointer">
                <input type="checkbox" className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-0 focus:ring-offset-0 bg-zinc-50 dark:bg-zinc-950" />
                <span>{t('login.rememberMe')}</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:underline"
              >
                {t('login.forgotPassword')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 py-2.5 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-md mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 dark:border-zinc-900/30 border-t-white dark:border-t-zinc-900 rounded-full animate-spin" />
              ) : (
                t('login.signIn')
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-wider">
              <span className="bg-white dark:bg-zinc-900 px-3 text-zinc-400">
                {t('login.or') || 'Or continue with'}
              </span>
            </div>
          </div>

          <GoogleLoginButton
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            text="signin_with"
          />

          <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
            {t('login.dontHaveAccount')}{' '}
            <Link to="/register" className="text-zinc-900 dark:text-zinc-100 font-bold hover:underline">
              {t('login.createAccount')}
            </Link>
          </p>
        </div>

        {/* Demo credentials hint */}
        <div className="mt-6 p-3 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center font-mono">
            <strong>Demo:</strong> admin@msp-helpdesk.com / password123
          </p>
        </div>
      </div>
    </div>
  );
}
