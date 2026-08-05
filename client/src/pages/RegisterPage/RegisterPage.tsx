import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import logoUrl from "@/assets/logo.png";
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function RegisterPage() {
  const { t, i18n } = useTranslation();
  const { register, verifyEmail, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);

  const schema = useMemo(() => z.object({
    name: z.string().min(2, t('register.nameMin') || 'Name must be at least 2 characters'),
    tenantName: z.string().min(2, t('register.tenantMin') || 'Company name must be at least 2 characters'),
    clientType: z.enum(['CLIENT', 'ENTERPRISE', 'STUDENT', 'OTHER'], {
      message: 'Client type is required',
    }),
    email: z.string().email(t('register.emailInvalid') || 'Invalid email address'),
    phoneNumber: z.string().optional(),
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
      phoneNumber: '',
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
      const errorMsg = error.response?.data?.message || 
        (i18n.language === 'es_DO' ? 'Error al registrar la cuenta con Google' : 'Google registration failed');
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = (errMsg?: string) => {
    const defaultMsg = i18n.language === 'es_DO' ? 'Error al registrar la cuenta con Google' : 'Google registration failed';
    setError(errMsg || defaultMsg);
    toast.error(errMsg || defaultMsg);
  };

  const onSubmit = async (data: RegisterFormData) => {
    setError('');
    setLoading(true);
    try {
      await register(data.email, data.name, data.tenantName, data.password, data.confirmPassword, data.clientType, data.phoneNumber);
      setRegisteredEmail(data.email);
      setShowOtpForm(true);
      const otpSentText = data.phoneNumber
        ? (i18n.language === 'es_DO'
            ? 'Registro exitoso. Revisa tu WhatsApp o correo electrónico para ingresar el código OTP de 6 dígitos.'
            : 'Registration successful. Please enter the 6-digit OTP sent to your WhatsApp / email.')
        : (i18n.language === 'es_DO'
            ? 'Registro exitoso. Revisa tu correo electrónico para ingresar el código OTP de 6 dígitos.'
            : 'Registration successful. Please enter the 6-digit code sent to your email.');
      setSuccessMessage(otpSentText);
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
        const detailedErrors = errorData.errors.map((e) => e.message).join('. ');
        setError(detailedErrors);
        toast.error(detailedErrors);
      } else {
        const errorMsg = errorData?.message ||
          (i18n.language === 'es_DO' ? 'Error al registrar la cuenta' : 'Registration failed');
        setError(errorMsg);
        
        if (errorMsg.includes('already exists') || errorMsg.includes('ya existe')) {
          toast.error('Registration Failed', {
            description: errorMsg + (i18n.language === 'es_DO' 
              ? '. Por favor, inicia sesión con tus credenciales.' 
              : '. Please log in with your existing credentials instead.'),
            action: {
              label: i18n.language === 'es_DO' ? 'Iniciar sesión' : 'Go to Login',
              onClick: () => navigate('/login'),
            },
            duration: 6000,
          });
        } else {
          toast.error(errorMsg);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSuccessMessage('');
    try {
      await verifyEmail(registeredEmail, otp);
      setSuccessMessage('Email verified successfully. You can now log in.');
      setShowOtpForm(false);
      setShowWelcomeDialog(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const errorMsg = error.response?.data?.message || 
        (i18n.language === 'es_DO' ? 'Error al verificar el correo' : 'Verification failed');
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 transition-colors py-12">
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
            {t('register.createAccountHeader')}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 font-medium">
            {t('register.registerToPortal')}
          </p>

          {error && (
            <Alert variant="destructive" className="mb-5 animate-fade-in py-2.5 px-3">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-xs font-bold mb-0.5">Error</AlertTitle>
              <AlertDescription className="text-[11px] leading-tight">{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert className="mb-5 animate-fade-in py-2.5 px-3 bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-900">
              <AlertCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <AlertTitle className="text-xs font-bold mb-0.5">Success</AlertTitle>
              <AlertDescription className="text-[11px] leading-tight">{successMessage}</AlertDescription>
            </Alert>
          )}

          {showOtpForm && (
            <form onSubmit={handleVerifyOtp} className="space-y-4 animate-fade-in">
              <div>
                <label htmlFor="otp" className="block text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  Verification Code (OTP)
                </label>
                <Input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  required
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-sm text-center tracking-[0.5em] font-mono text-lg"
                />
              </div>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 py-2.5 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 dark:border-zinc-900/30 border-t-white dark:border-t-zinc-900 rounded-full animate-spin" />
                ) : (
                  'Verify Email'
                )}
              </button>
            </form>
          )}

          {!showOtpForm && !successMessage && (
            <>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="reg-name" className="block text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                    {t('register.fullName')}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="reg-name"
                    type="text"
                    placeholder="John Mitchell"
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-sm"
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
                  <FieldLabel htmlFor="reg-tenant" className="block text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                    {t('register.companyName')}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="reg-tenant"
                    type="text"
                    placeholder={t('register.companyNamePlaceholder')}
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-sm"
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
                  <FieldLabel htmlFor="reg-clientType" className="block text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                    {t('register.clientType')}
                  </FieldLabel>
                  <select
                    {...field}
                    id="reg-clientType"
                    className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-all text-zinc-900 dark:text-zinc-100 shadow-sm cursor-pointer"
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
                  <FieldLabel htmlFor="reg-email" className="block text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                    {t('login.emailAddress')}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="reg-email"
                    type="email"
                    placeholder={t('login.emailPlaceholder')}
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="phoneNumber"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="reg-phone" className="block text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>{t('register.phoneNumber', 'Phone Number (WhatsApp OTP)')}</span>
                    <span className="text-[9px] font-normal text-emerald-600 dark:text-emerald-400 lowercase">{t('register.whatsappOtpBadge', 'OTP via WhatsApp')}</span>
                  </FieldLabel>
                  <Input
                    {...field}
                    id="reg-phone"
                    type="tel"
                    placeholder="+1 (809) 000-0000"
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-sm"
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
                  <FieldLabel htmlFor="reg-password" className="block text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                    {t('login.password')}
                  </FieldLabel>
                  <div className="relative w-full">
                    <Input
                      {...field}
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('register.passwordPlaceholder')}
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
                  <FieldLabel htmlFor="reg-confirm" className="block text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                    {t('register.confirmPassword')}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="reg-confirm"
                    type="password"
                    placeholder={t('register.confirmPasswordPlaceholder')}
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-sm"
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
              className="w-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 py-2.5 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-md mt-4"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 dark:border-zinc-900/30 border-t-white dark:border-t-zinc-900 rounded-full animate-spin" />
              ) : (
                t('register.createAccountHeader')
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
            text="signup_with"
          />
          </>
          )}

          <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
            {t('register.alreadyHaveAccount')}{' '}
            <Link to="/login" className="text-zinc-900 dark:text-zinc-100 font-bold hover:underline">
              {t('register.signInLink')}
            </Link>
          </p>
        </div>
      </div>

      <Dialog open={showWelcomeDialog} onOpenChange={(open) => {
        setShowWelcomeDialog(open);
        if (!open) {
          navigate('/login');
        }
      }}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100 font-heading tracking-tight">
              ¡Bienvenido a Velmar!
            </DialogTitle>
            <DialogDescription className="text-sm text-zinc-500 dark:text-zinc-400">
              Tu cuenta ha sido creada exitosamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end mt-4">
            <button
              onClick={() => {
                setShowWelcomeDialog(false);
                navigate('/login');
              }}
              className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-md"
            >
              Continuar al Login
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
