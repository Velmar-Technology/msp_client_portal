import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import logoUrl from '../assets/logo.png';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { GoogleLoginButton } from '../components/auth/GoogleLoginButton';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export function RegisterPage() {
  const { t, i18n } = useTranslation();
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const schema = useMemo(() => z.object({
    name: z.string().min(2, t('register.nameMin') || 'Name must be at least 2 characters'),
    tenantName: z.string().min(2, t('register.tenantMin') || 'Company name must be at least 2 characters'),
    clientType: z.enum(['CLIENT', 'ENTERPRISE', 'STUDENT', 'OTHER'], {
      required_error: 'Client type is required',
    }),
    email: z.string().email(t('register.emailInvalid') || 'Invalid email address'),
    password: z.string().min(8, t('register.passwordMin') || 'Password must be at least 8 characters'),
    confirmPassword: z.string()
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('register.passwordsMismatch') || 'Passwords do not match',
    path: ['confirmPassword']
  }), [t]);

  type RegisterFormData = z.infer<typeof schema>;

  const {
    control,
    handleSubmit,
    getValues,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      tenantName: '',
      clientType: 'CLIENT',
      email: '',
      password: '',
      confirmPassword: ''
    }
  });

  const handleGoogleSuccess = async (idToken: string) => {
    setError('');
    setLoading(true);
    try {
      const tenantNameValue = getValues('tenantName');
      await loginWithGoogle(idToken, tenantNameValue || undefined);
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message || 
        (i18n.language === 'es_DO' ? 'Error al registrar la cuenta con Google' : 'Google registration failed')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = (errMsg?: string) => {
    setError(errMsg || (i18n.language === 'es_DO' ? 'Error al registrar la cuenta con Google' : 'Google registration failed'));
  };

  const onSubmit = async (data: RegisterFormData) => {
    setError('');
    setLoading(true);
    try {
      await register(data.email, data.name, data.tenantName, data.password, data.confirmPassword, data.clientType);
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as {
        response?: {
          data?: {
            message?: string;
            errors?: Array<{ field: string; message: string }>;
          };
        };
      };
      const errorData = error.response?.data;
      if (errorData?.errors && errorData.errors.length > 0) {
        // Concatenate detailed validation errors
        const detailedErrors = errorData.errors.map((e) => e.message).join('. ');
        setError(detailedErrors);
        console.log(detailedErrors);
      } else {
        setError(
          errorData?.message ||
          (i18n.language === 'es_DO' ? 'Error al registrar la cuenta' : 'Registration failed')
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex flex-col items-center justify-center mb-8 gap-3">
          <img src={logoUrl} alt="Velmar Technology SRL" className="h-24 w-auto object-contain dark:brightness-110" />
          <div className="text-center">
            <span className="text-xs uppercase tracking-widest text-brand-gradient font-bold bg-muted dark:bg-muted/30 px-3 py-1 rounded-full">
              {t('topNav.portal')}
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm">
          <h2 className="text-h2 text-primary mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
            {t('register.createAccountHeader')}
          </h2>
          <p className="text-body-md text-on-surface-variant mb-6">
            {t('register.registerToPortal')}
          </p>

          {error && (
            <Alert variant="destructive" className="mb-4 animate-fade-in">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="reg-name">
                    {t('register.fullName')}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="reg-name"
                    type="text"
                    placeholder="John Mitchell"
                    className="w-full h-10 px-4 py-2.5 border border-outline-variant rounded-lg text-body-md bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 transition-all text-on-surface"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="tenantName"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="reg-tenant">
                    {t('register.companyName')}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="reg-tenant"
                    type="text"
                    placeholder={t('register.companyNamePlaceholder')}
                    className="w-full h-10 px-4 py-2.5 border border-outline-variant rounded-lg text-body-md bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 transition-all text-on-surface"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="clientType"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="reg-clientType">
                    {t('register.clientType')}
                  </FieldLabel>
                  <select
                    {...field}
                    id="reg-clientType"
                    className="w-full h-10 px-4 py-2 border border-outline-variant rounded-lg text-body-md bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 transition-all text-on-surface"
                  >
                    <option value="CLIENT">{t('register.clientTypeCLIENT')}</option>
                    <option value="ENTERPRISE">{t('register.clientTypeENTERPRISE')}</option>
                    <option value="STUDENT">{t('register.clientTypeSTUDENT')}</option>
                    <option value="OTHER">{t('register.clientTypeOTHER')}</option>
                  </select>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="email"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="reg-email">
                    {t('login.emailAddress')}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="reg-email"
                    type="email"
                    placeholder={t('login.emailPlaceholder')}
                    className="w-full h-10 px-4 py-2.5 border border-outline-variant rounded-lg text-body-md bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 transition-all text-on-surface"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="password"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="reg-password">
                    {t('login.password')}
                  </FieldLabel>
                  <div className="relative w-full">
                    <Input
                      {...field}
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('register.passwordPlaceholder')}
                      className="w-full h-10 px-4 py-2.5 pr-12 border border-outline-variant rounded-lg text-body-md bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 transition-all text-on-surface"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="confirmPassword"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="reg-confirm">
                    {t('register.confirmPassword')}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="reg-confirm"
                    type="password"
                    placeholder={t('register.confirmPasswordPlaceholder')}
                    className="w-full h-10 px-4 py-2.5 border border-outline-variant rounded-lg text-body-md bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 transition-all text-on-surface"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary py-2.5 rounded-lg text-label-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
              ) : (
                t('register.createAccountHeader')
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
            text="signup_with"
          />

          <p className="mt-6 text-center text-body-md text-on-surface-variant">
            {t('register.alreadyHaveAccount')}{' '}
            <Link to="/login" className="text-secondary font-medium hover:underline">
              {t('register.signInLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
