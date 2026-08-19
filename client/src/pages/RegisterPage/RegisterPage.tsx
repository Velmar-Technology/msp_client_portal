import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, AlertCircle, User, ShieldCheck } from "lucide-react";
import logoUrl from "@/assets/logo.png";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Field, FieldLabel, FieldError, FieldSet, FieldLegend } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";

export function RegisterPage() {
  const { t, i18n } = useTranslation();
  const { register, verifyEmail, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    const verifyParam = searchParams.get("verify");
    const storedPendingEmail = sessionStorage.getItem("pending_otp_email");

    const activeEmail = emailParam || storedPendingEmail;
    if (activeEmail && (verifyParam === "true" || verifyParam === "1" || storedPendingEmail)) {
      setRegisteredEmail(activeEmail);
      setShowOtpForm(true);
      const msg =
        i18n.language === "es_DO"
          ? `Por favor, ingresa el código OTP de 6 dígitos enviado a tu correo (${activeEmail}).`
          : `Please enter the 6-digit OTP verification code sent to your email (${activeEmail}).`;
      setSuccessMessage(msg);
    }
  }, [searchParams, i18n.language]);

  const schema = useMemo(
    () =>
      z
        .object({
          name: z
            .string()
            .min(2, t("register.nameMin") || "Name must be at least 2 characters")
            .max(255, t("register.nameMax") || "Name must not exceed 255 characters"),
          tenantName: z
            .string()
            .min(2, t("register.tenantMin") || "Company name must be at least 2 characters")
            .max(255, t("register.tenantMax") || "Company name must not exceed 255 characters"),
          clientType: z.enum(["CLIENT", "ENTERPRISE", "STUDENT", "OTHER"], {
            message: "Client type is required",
          }),
          email: z.string().email(t("register.emailInvalid") || "Invalid email address"),
          phoneNumber: z
            .string()
            .max(50, t("register.phoneMax") || "Phone number must not exceed 50 characters")
            .optional(),
          password: z
            .string()
            .min(8, t("register.passwordMin") || "Password must be at least 8 characters")
            .regex(/[A-Z]/, t("register.passwordUppercase") || "Password must contain at least one uppercase letter")
            .regex(/[a-z]/, t("register.passwordLowercase") || "Password must contain at least one lowercase letter")
            .regex(/[0-9]/, t("register.passwordNumber") || "Password must contain at least one number"),
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: t("register.passwordsMismatch") || "Passwords do not match",
          path: ["confirmPassword"],
        }),
    [t],
  );

  type RegisterFormData = z.infer<typeof schema>;

  const { control, handleSubmit, getValues } = useForm<RegisterFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      tenantName: "",
      clientType: "CLIENT",
      email: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleGoogleSuccess = async (idToken: string) => {
    setError("");
    setLoading(true);
    try {
      const tenantNameValue = getValues("tenantName");
      await loginWithGoogle(idToken, tenantNameValue || undefined);
      navigate("/dashboard");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const errorMsg =
        error.response?.data?.message ||
        (i18n.language === "es_DO" ? "Error al registrar la cuenta con Google" : "Google registration failed");
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = (errMsg?: string) => {
    const defaultMsg =
      i18n.language === "es_DO" ? "Error al registrar la cuenta con Google" : "Google registration failed";
    setError(errMsg || defaultMsg);
    toast.error(errMsg || defaultMsg);
  };

  const onSubmit = async (data: RegisterFormData) => {
    setError("");
    setLoading(true);
    try {
      await register(
        data.email,
        data.name,
        data.tenantName,
        data.password,
        data.confirmPassword,
        data.clientType,
        data.phoneNumber,
      );
      setRegisteredEmail(data.email);
      setShowOtpForm(true);
      try {
        sessionStorage.setItem("pending_otp_email", data.email);
      } catch (e) {
        console.error("Failed to save pending OTP email", e);
      }
      const otpSentText = data.email
        ? i18n.language === "es_DO"
          ? `Registro exitoso. Revisa tu correo electrónico (${data.email}) para ingresar el código OTP de 6 dígitos.`
          : `Registration successful. Please enter the 6-digit OTP sent to your email (${data.email}).`
        : i18n.language === "es_DO"
          ? "Registro exitoso. Revisa tu correo electrónico para ingresar el código OTP de 6 dígitos."
          : "Registration successful. Please enter the 6-digit code sent to your email.";
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
        const detailedErrors = errorData.errors.map((e) => e.message).join(". ");
        setError(detailedErrors);
        toast.error(detailedErrors);
      } else {
        const errorMsg =
          errorData?.message || (i18n.language === "es_DO" ? "Error al registrar la cuenta" : "Registration failed");
        setError(errorMsg);

        if (errorMsg.includes("already exists") || errorMsg.includes("ya existe")) {
          toast.error("Registration Failed", {
            description:
              errorMsg +
              (i18n.language === "es_DO"
                ? ". Por favor, inicia sesión con tus credenciales."
                : ". Please log in with your existing credentials instead."),
            action: {
              label: i18n.language === "es_DO" ? "Iniciar sesión" : "Go to Login",
              onClick: () => navigate("/login"),
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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleSubmit(onSubmit)(e);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError("");
    setLoading(true);
    setSuccessMessage("");
    try {
      await verifyEmail(registeredEmail, otp);
      try {
        sessionStorage.removeItem("pending_otp_email");
      } catch (e) {
        console.error("Failed to clear pending OTP email", e);
      }
      setSuccessMessage(t("register.emailVerifiedSuccess"));
      setShowOtpForm(false);
      setShowWelcomeDialog(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const errorMsg =
        error.response?.data?.message ||
        (i18n.language === "es_DO" ? "Error al verificar el correo" : "Verification failed");
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 transition-colors py-4 md:py-6">
      <div className="w-full max-w-2xl md:max-w-3xl animate-fade-in">
        {/* Card */}
        <main className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
          {/* Brand Logo & Header */}
          <header className="flex flex-col items-center justify-center mb-3 gap-2">
            <img
              src={logoUrl}
              alt="Velmar Technology SRL"
              className="h-10 md:h-12 w-auto object-contain dark:brightness-110"
            />
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-2.5 py-0.5 rounded-full shadow-xs">
              {t("topNav.portal")}
            </span>
          </header>

          <div className="mb-4 text-center">
            <h1
              className="text-lg md:text-xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {showOtpForm ? t("register.otpTitle") : t("register.createAccountHeader")}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              {showOtpForm
                ? i18n.language === "es_DO"
                  ? "Ingresa el código OTP enviado a tu correo para activar tu cuenta."
                  : "Enter the OTP verification code sent to your email to activate your account."
                : t("register.registerToPortal")}
            </p>
          </div>

          {error && (
            <Alert variant="destructive" role="alert" aria-live="assertive" className="mb-3 animate-fade-in py-2 px-3">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertTitle className="text-xs font-bold mb-0.5">Error</AlertTitle>
              <AlertDescription className="text-[11px] leading-tight">{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert
              role="status"
              aria-live="polite"
              className="mb-3 animate-fade-in py-2 px-3 bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-900"
            >
              <AlertCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <AlertTitle className="text-xs font-bold mb-0.5">
                {i18n.language === "es_DO" ? "Información" : "Notification"}
              </AlertTitle>
              <AlertDescription className="text-[11px] leading-tight">{successMessage}</AlertDescription>
            </Alert>
          )}

          {showOtpForm && (
            <div className="animate-fade-in max-w-md mx-auto py-2">
              <form onSubmit={handleVerifyOtp} className="space-y-4" autoComplete="off">
                <div>
                  <label
                    htmlFor="otp"
                    className="block text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5"
                  >
                    {t("register.otpTitle")}
                    <span className="text-rose-500 ml-0.5" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <div className="flex justify-center my-3">
                    <InputOTP maxLength={6} value={otp} onChange={(value: string) => setOtp(value)}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 py-2.5 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-md focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                >
                  {loading ? (
                    <div
                      className="w-4 h-4 border-2 border-white/30 dark:border-zinc-900/30 border-t-white dark:border-t-zinc-900 rounded-full animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    t("register.verifyEmail")
                  )}
                </button>
              </form>
              <button
                type="button"
                onClick={() => {
                  try {
                    sessionStorage.removeItem("pending_otp_email");
                  } catch (e) {}
                  setShowOtpForm(false);
                  setSuccessMessage("");
                  setError("");
                }}
                className="w-full text-center text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium transition-colors mt-3 py-1 cursor-pointer"
              >
                {i18n.language === "es_DO" ? "← Modificar datos de registro" : "← Edit registration details"}
              </button>
            </div>
          )}

          {!showOtpForm && (
            <>
              <form onSubmit={handleFormSubmit} className="space-y-4" autoComplete="off" noValidate>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Group 1: Personal & Organization Info */}
                  <FieldSet className="p-3.5 bg-zinc-50/60 dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl space-y-2.5 shadow-xs">
                    <FieldLegend className="flex items-center gap-1.5 pb-2 mb-0.5 border-b border-zinc-200/80 dark:border-zinc-800/80 text-[11px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider w-full">
                      <User className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                      <span>{t("register.personalGroupTitle")}</span>
                    </FieldLegend>

                    <Controller
                      name="name"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel
                            htmlFor="reg-name"
                            className="block text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 flex items-center justify-between"
                          >
                            <span>{t("register.fullName")}</span>
                            <span className="text-rose-500 ml-0.5" aria-hidden="true">
                              *
                            </span>
                          </FieldLabel>
                          <Input
                            {...field}
                            id="reg-name"
                            type="text"
                            autoComplete="name"
                            aria-required="true"
                            aria-invalid={fieldState.invalid}
                            aria-describedby={fieldState.invalid ? "reg-name-error" : undefined}
                            placeholder="John Mitchell"
                            className="w-full h-9 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-xs"
                          />
                          {fieldState.invalid && <FieldError id="reg-name-error" errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <Controller
                        name="tenantName"
                        control={control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel
                              htmlFor="reg-tenant"
                              className="block text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 flex items-center justify-between"
                            >
                              <span>{t("register.companyName")}</span>
                              <span className="text-rose-500 ml-0.5" aria-hidden="true">
                                *
                              </span>
                            </FieldLabel>
                            <Input
                              {...field}
                              id="reg-tenant"
                              type="text"
                              autoComplete="organization"
                              aria-required="true"
                              aria-invalid={fieldState.invalid}
                              aria-describedby={fieldState.invalid ? "reg-tenant-error" : undefined}
                              placeholder={t("register.companyNamePlaceholder")}
                              className="w-full h-9 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-xs"
                            />
                            {fieldState.invalid && <FieldError id="reg-tenant-error" errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />

                      <Controller
                        name="clientType"
                        control={control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel
                              htmlFor="reg-clientType"
                              className="block text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 flex items-center justify-between"
                            >
                              <span>{t("register.clientType")}</span>
                              <span className="text-rose-500 ml-0.5" aria-hidden="true">
                                *
                              </span>
                            </FieldLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger
                                id="reg-clientType"
                                aria-required="true"
                                aria-invalid={fieldState.invalid}
                                aria-describedby={fieldState.invalid ? "reg-clientType-error" : undefined}
                                className="w-full h-9 data-[size=default]:h-9 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 transition-all text-zinc-900 dark:text-zinc-100 shadow-xs cursor-pointer"
                              >
                                <SelectValue placeholder={t("register.clientType")} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CLIENT">{t("register.clientTypeCLIENT")}</SelectItem>
                                <SelectItem value="ENTERPRISE">{t("register.clientTypeENTERPRISE")}</SelectItem>
                                <SelectItem value="STUDENT">{t("register.clientTypeSTUDENT")}</SelectItem>
                                <SelectItem value="OTHER">{t("register.clientTypeOTHER")}</SelectItem>
                              </SelectContent>
                            </Select>
                            {fieldState.invalid && <FieldError id="reg-clientType-error" errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                    </div>

                    <Controller
                      name="phoneNumber"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel
                            htmlFor="reg-phone"
                            className="block text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 flex items-center justify-between"
                          >
                            <span>{t("register.phoneNumber")}</span>
                          </FieldLabel>
                          <Input
                            {...field}
                            id="reg-phone"
                            type="tel"
                            autoComplete="tel"
                            aria-invalid={fieldState.invalid}
                            aria-describedby={fieldState.invalid ? "reg-phone-error" : undefined}
                            placeholder="+1 (809) 000-0000"
                            className="w-full h-9 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-xs"
                          />
                          {fieldState.invalid && <FieldError id="reg-phone-error" errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  </FieldSet>

                  {/* Group 2: Account & Credentials */}
                  <FieldSet className="p-3.5 bg-zinc-50/60 dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl space-y-2.5 shadow-xs flex flex-col justify-between">
                    <div className="space-y-2.5">
                      <FieldLegend className="flex items-center gap-1.5 pb-2 mb-0.5 border-b border-zinc-200/80 dark:border-zinc-800/80 text-[11px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider w-full">
                        <ShieldCheck className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                        <span>{t("register.accountGroupTitle")}</span>
                      </FieldLegend>

                      <Controller
                        name="email"
                        control={control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel
                              htmlFor="reg-email"
                              className="block text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 flex items-center justify-between"
                            >
                              <span>{t("login.emailAddress")}</span>
                              <span className="text-rose-500 ml-0.5" aria-hidden="true">
                                *
                              </span>
                            </FieldLabel>
                            <Input
                              {...field}
                              id="reg-email"
                              type="email"
                              autoComplete="email"
                              aria-required="true"
                              aria-invalid={fieldState.invalid}
                              aria-describedby={fieldState.invalid ? "reg-email-error" : undefined}
                              placeholder={t("login.emailPlaceholder")}
                              className="w-full h-9 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-xs"
                            />
                            {fieldState.invalid && <FieldError id="reg-email-error" errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="col-span-2">
                          <Controller
                            name="password"
                            control={control}
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel
                                  htmlFor="reg-password"
                                  className="block text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 flex items-center justify-between"
                                >
                                  <span>{t("login.password")}</span>
                                  <span className="text-rose-500 ml-0.5" aria-hidden="true">
                                    *
                                  </span>
                                </FieldLabel>
                                <div className="relative w-full">
                                  <Input
                                    {...field}
                                    id="reg-password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    aria-required="true"
                                    aria-invalid={fieldState.invalid}
                                    aria-describedby={fieldState.invalid ? "reg-password-error" : undefined}
                                    placeholder={t("register.passwordPlaceholder")}
                                    className="w-full h-9 px-3 py-1.5 pr-8 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-xs"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? t("register.hidePassword") : t("register.showPassword")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer rounded-xs focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:outline-none"
                                  >
                                    {showPassword ? (
                                      <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                                    ) : (
                                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                    )}
                                  </button>
                                </div>
                                {fieldState.invalid && (
                                  <FieldError id="reg-password-error" errors={[fieldState.error]} />
                                )}
                              </Field>
                            )}
                          />

                          <Controller
                            name="confirmPassword"
                            control={control}
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel
                                  htmlFor="reg-confirm"
                                  className="block text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 mt-3 items-center justify-between"
                                >
                                  <span>{t("register.confirmPassword")}</span>
                                  <span className="text-rose-500 ml-0.5" aria-hidden="true">
                                    *
                                  </span>
                                </FieldLabel>
                                <Input
                                  {...field}
                                  id="reg-confirm"
                                  type="password"
                                  autoComplete="new-password"
                                  aria-required="true"
                                  aria-invalid={fieldState.invalid}
                                  aria-describedby={fieldState.invalid ? "reg-confirm-error" : undefined}
                                  placeholder={t("register.confirmPasswordPlaceholder")}
                                  className="w-full h-9 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-xs"
                                />
                                {fieldState.invalid && (
                                  <FieldError id="reg-confirm-error" errors={[fieldState.error]} />
                                )}
                              </Field>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </FieldSet>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 py-2.5 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-md focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                >
                  {loading ? (
                    <div
                      className="w-4 h-4 border-2 border-white/30 dark:border-zinc-900/30 border-t-white dark:border-t-zinc-900 rounded-full animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    t("register.createAccountHeader")
                  )}
                </button>
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-wider">
                  <span className="bg-white dark:bg-zinc-900 px-3 text-zinc-400">
                    {t("login.or") || "Or continue with"}
                  </span>
                </div>
              </div>

              <div className="max-w-md mx-auto">
                <GoogleLoginButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} text="signup_with" />
              </div>
            </>
          )}

          <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
            {t("register.alreadyHaveAccount")}{" "}
            <Link
              to="/login"
              className="text-zinc-900 dark:text-zinc-100 font-bold hover:underline focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 rounded-xs"
            >
              {t("register.signInLink")}
            </Link>
          </p>
        </main>
      </div>

      <AlertDialog
        open={showWelcomeDialog}
        onOpenChange={(open) => {
          setShowWelcomeDialog(open);
          if (!open) {
            navigate("/login");
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100 font-heading tracking-tight">
              {t("register.welcomeTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-zinc-500 dark:text-zinc-400">
              {t("register.welcomeDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-end mt-4">
            <AlertDialogAction
              type="button"
              onClick={() => {
                setShowWelcomeDialog(false);
                navigate("/login");
              }}
              className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-md border-0"
            >
              {t("register.continueToLogin")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

