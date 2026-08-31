import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, AlertCircle, Globe, User, ShieldCheck } from "lucide-react";
import logoUrl from "@/assets/logo.png";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Field, FieldLabel, FieldError, FieldSet, FieldLegend } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
      } else {
        const errorMsg =
          errorData?.message || (i18n.language === "es_DO" ? "Error al registrar la cuenta" : "Registration failed");
        setError(errorMsg);

        if (errorMsg.toLowerCase().includes("already exists")) {
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
    } finally {
      setLoading(false);
    }
  };

return (
     <div className="min-h-screen flex items-center justify-center bg-background px-4 transition-colors py-4 md:py-6">
       {/* Top Bar Language Selector */}
       <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center gap-1.5 bg-card/80 backdrop-blur-sm border border-border rounded-full p-1 pl-2 shadow-xs">
         <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
         <Select
           value={i18n.language || "en_US"}
           onValueChange={(newLang) => i18n.changeLanguage(newLang)}
         >
           <SelectTrigger size="sm" className="border-0 bg-transparent text-xs font-semibold text-foreground shadow-none px-2 focus:ring-0 cursor-pointer">
             <SelectValue />
           </SelectTrigger>
           <SelectContent align="end">
             <SelectItem value="en_US">English (US)</SelectItem>
             <SelectItem value="es_DO">Español (DO)</SelectItem>
           </SelectContent>
         </Select>
       </div>
       <div className="w-full max-w-2xl md:max-w-3xl animate-fade-in">
         {/* Card */}
         <main className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
          {/* Brand Logo & Header */}
          <header className="flex flex-col items-center justify-center mb-3 gap-2">
            <img
              src={logoUrl}
              alt="Velmar Technology SRL"
              className="h-10 md:h-12 w-auto object-contain dark:brightness-110"
            />
            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground bg-muted border border-border px-2.5 py-0.5 rounded-full shadow-xs">
              {t("topNav.portal")}
            </span>
          </header>

          <div className="mb-4 text-center">
            <h1
              className="text-lg md:text-xl font-extrabold text-foreground font-heading tracking-tight"
            >
              {showOtpForm ? t("register.otpTitle") : t("register.createAccountHeader")}
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
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
              className="mb-3 animate-fade-in py-2 px-3 bg-primary/10 text-primary border-primary/20"
            >
              <AlertCircle className="h-4 w-4 text-primary" aria-hidden="true" />
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
                    className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1.5"
                  >
                    {t("register.otpTitle")}
                    <span className="text-destructive ml-0.5" aria-hidden="true">
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
                <Button
                  type="submit"
                  size="sm"
                  disabled={loading || otp.length !== 6}
                  className="w-full text-xs font-bold shadow-md cursor-pointer h-9"
                >
                  {loading ? (
                    <div
                      className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    t("register.verifyEmail")
                  )}
                </Button>
              </form>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  try {
                    sessionStorage.removeItem("pending_otp_email");
                  } catch {
                    // Ignore sessionStorage access errors
                  }
                  setShowOtpForm(false);
                  setSuccessMessage("");
                  setError("");
                }}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground font-medium transition-colors mt-3 py-1 cursor-pointer"
              >
                {t("register.editRegistrationDetails")}
              </Button>
            </div>
          )}

          {!showOtpForm && (
            <>
              <form onSubmit={handleFormSubmit} className="space-y-4" autoComplete="off" noValidate>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Group 1: Personal & Organization Info */}
                  <FieldSet className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-2.5 shadow-xs flex flex-col justify-between">
                    <div className="space-y-2.5">
                      <FieldLegend className="flex items-center gap-1.5 pb-2 mb-0.5 border-b border-border text-[11px] font-bold text-foreground uppercase tracking-wider w-full font-heading">
                        <User className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                        <span>{t("register.personalGroupTitle")}</span>
                      </FieldLegend>

                    <Controller
                      name="name"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel
                            htmlFor="reg-name"
                            className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-1 flex items-center justify-between"
                          >
                            <span>{t("register.fullName")}</span>
                            <span className="text-destructive ml-0.5" aria-hidden="true">
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
                            className="w-full h-9 px-3 py-1.5 border border-input rounded-lg text-xs bg-background focus-visible:ring-1 focus-visible:ring-ring transition-all placeholder:text-muted-foreground text-foreground shadow-xs"
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
                              className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-1 flex items-center justify-between"
                            >
                              <span>{t("register.companyName")}</span>
                              <span className="text-destructive ml-0.5" aria-hidden="true">
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
                              className="w-full h-9 px-3 py-1.5 border border-input rounded-lg text-xs bg-background focus-visible:ring-1 focus-visible:ring-ring transition-all placeholder:text-muted-foreground text-foreground shadow-xs"
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
                              className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-1 flex items-center justify-between"
                            >
                              <span>{t("register.clientType")}</span>
                              <span className="text-destructive ml-0.5" aria-hidden="true">
                                *
                              </span>
                            </FieldLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
<SelectTrigger
                                 id="reg-clientType"
                                 aria-required="true"
                                 aria-invalid={fieldState.invalid}
                                 aria-describedby={fieldState.invalid ? "reg-clientType-error" : undefined}
                                 size="lg"
                                 className="w-full px-3 py-1.5 data-[size=lg]:px-3 data-[size=lg]:py-1.5 data-[size=lg]:h-9 border border-input rounded-lg text-xs bg-background focus-visible:ring-1 focus-visible:ring-ring transition-all text-foreground shadow-xs cursor-pointer"
                               >
                                <SelectValue placeholder={t("register.clientType")} />
                              </SelectTrigger>
                              <SelectContent className="bg-card border-border">
                                <SelectItem value="CLIENT">{t("register.clientTypeCLIENT")}</SelectItem>
                                <SelectItem value="ENTERPRISE">{t("register.clientTypeENTERPRISE")}</SelectItem>
                                <SelectItem value="STUDENT">{t("register.clientTypeSTUDENT")}</SelectItem>
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
                            className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-1 flex items-center justify-between"
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
                            className="w-full h-9 px-3 py-1.5 border border-input rounded-lg text-xs bg-background focus-visible:ring-1 focus-visible:ring-ring transition-all placeholder:text-muted-foreground text-foreground shadow-xs"
                          />
                          {fieldState.invalid && <FieldError id="reg-phone-error" errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    </div>
                  </FieldSet>

                  {/* Group 2: Account & Credentials */}
                  <FieldSet className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-2.5 shadow-xs flex flex-col justify-between">
                    <div className="space-y-2.5">
                      <FieldLegend className="flex items-center gap-1.5 pb-2 mb-0.5 border-b border-border text-[11px] font-bold text-foreground uppercase tracking-wider w-full font-heading">
                        <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                        <span>{t("register.accountGroupTitle")}</span>
                      </FieldLegend>

                      <Controller
                        name="email"
                        control={control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel
                              htmlFor="reg-email"
                              className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-1 flex items-center justify-between"
                            >
                              <span>{t("login.emailAddress")}</span>
                              <span className="text-destructive ml-0.5" aria-hidden="true">
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
                              className="w-full h-9 px-3 py-1.5 border border-input rounded-lg text-xs bg-background focus-visible:ring-1 focus-visible:ring-ring transition-all placeholder:text-muted-foreground text-foreground shadow-xs"
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
                                  className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-1 flex items-center justify-between"
                                >
                                  <span>{t("login.password")}</span>
                                  <span className="text-destructive ml-0.5" aria-hidden="true">
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
                                    className="w-full h-9 px-3 py-1.5 pr-8 border border-input rounded-lg text-xs bg-background focus-visible:ring-1 focus-visible:ring-ring transition-all placeholder:text-muted-foreground text-foreground shadow-xs"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? t("register.hidePassword") : t("register.showPassword")}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                  >
                                    {showPassword ? (
                                      <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                                    ) : (
                                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                    )}
                                  </Button>
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
                                  className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1 mt-2.5 items-center justify-between"
                                >
                                  <span>{t("register.confirmPassword")}</span>
                                  <span className="text-destructive ml-0.5" aria-hidden="true">
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
                                  className="w-full h-9 px-3 py-1.5 border border-input rounded-lg text-xs bg-background focus-visible:ring-1 focus-visible:ring-ring transition-all placeholder:text-muted-foreground text-foreground shadow-xs"
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

                <Button
                  type="submit"
                  size="sm"
                  disabled={loading}
                  className="w-full text-xs font-bold shadow-md cursor-pointer h-9"
                >
                  {loading ? (
                    <div
                      className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    t("register.createAccountHeader")
                  )}
                </Button>
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-wider">
                  <span className="bg-card px-3 text-muted-foreground">
                    {t("login.or") || "Or continue with"}
                  </span>
                </div>
              </div>

              <div className="max-w-md mx-auto">
                <GoogleLoginButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} text="signup_with" />
              </div>
            </>
          )}

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {t("register.alreadyHaveAccount")}{" "}
            <Link
              to="/login"
              className="text-primary font-bold hover:underline focus-visible:ring-2 focus-visible:ring-ring rounded-xs"
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
        <AlertDialogContent className="sm:max-w-md bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-extrabold text-foreground font-heading tracking-tight">
              {t("register.welcomeTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
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
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-bold transition-opacity cursor-pointer shadow-md border-0"
            >
              {t("register.continueToLogin")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default RegisterPage;
