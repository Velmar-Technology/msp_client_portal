import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, AlertCircle, Globe, ShieldCheck } from "lucide-react";
import logoUrl from "@/assets/logo.png";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { getRememberMe } from "@/lib/authStorage";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const { login, verifyEmail, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(getRememberMe);
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpNotice, setOtpNotice] = useState("");

  const handleGoogleSuccess = useCallback(
    async (idToken: string) => {
      setError("");
      setLoading(true);
      try {
        await loginWithGoogle(idToken, undefined, rememberMe);
        navigate("/dashboard");
      } catch (err: unknown) {
        const extractedMessage =
          (err instanceof Error && err.message) ||
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        const errorMsg =
          extractedMessage ||
          (i18n.language === "es_DO" ? "Error al autenticar con Google" : "Google authentication failed");
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [loginWithGoogle, navigate, rememberMe, i18n.language]
  );

  const handleGoogleError = useCallback(
    (errMsg?: string) => {
      const defaultMsg = i18n.language === "es_DO" ? "Error al autenticar con Google" : "Google authentication failed";
      setError(errMsg || defaultMsg);
      toast.error(errMsg || defaultMsg);
    },
    [i18n.language]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password, rememberMe);
      navigate("/dashboard");
    } catch (err: unknown) {
      const extractedMessage =
        (err instanceof Error && err.message) ||
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      const errorMsg =
        extractedMessage ||
        (i18n.language === "es_DO" ? "Correo o contraseña incorrectos" : "Invalid email or password");

      if (errorMsg.toLowerCase().includes("verify your email")) {
        setShowOtpForm(true);
        const notice =
          i18n.language === "es_DO"
            ? `Cuenta no verificada. Ingresa el código OTP de 6 dígitos enviado a tu correo (${email}) para activar tu cuenta e iniciar sesión.`
            : `Account not verified. Enter the 6-digit OTP code sent to your email (${email}) to activate your account and log in.`;
        setOtpNotice(notice);
        toast.error(i18n.language === "es_DO" ? "Verificación requerida" : "Verification Required", {
          description: notice,
          duration: 8000,
        });
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await verifyEmail(email, otp);
      toast.success(
        i18n.language === "es_DO"
          ? "Correo verificado exitosamente. Iniciando sesión..."
          : "Email verified successfully. Logging in...",
      );
      await login(email, password, rememberMe);
      navigate("/dashboard");
    } catch (err: unknown) {
      const extractedMessage =
        (err instanceof Error && err.message) ||
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      const errorMsg =
        extractedMessage ||
        (i18n.language === "es_DO" ? "Error al verificar el código OTP" : "OTP verification failed");
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center bg-background p-4 sm:p-6 transition-colors">
      {/* Top Bar Language Selector */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center gap-2 bg-card/80 backdrop-blur-sm border border-border rounded-full px-3 py-1 shadow-xs">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <select
          id="login-language-select"
          aria-label="Language Selector"
          value={i18n.language || "en_US"}
          onChange={(e) => {
            const newLang = e.target.value;
            i18n.changeLanguage(newLang);
          }}
          className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
        >
          <option value="en_US" className="bg-card text-foreground">
            English (US)
          </option>
          <option value="es_DO" className="bg-card text-foreground">
            Español (DO)
          </option>
        </select>
      </div>

      <div className="w-full max-w-sm md:max-w-4xl animate-fade-in">
        <Card className="overflow-hidden p-0 border-border shadow-2xl rounded-2xl">
          <CardContent className="grid p-0 md:grid-cols-2">
            {/* Form Section */}
            <div className="p-5 sm:p-6 md:p-8 flex flex-col justify-center bg-card">
              <div className="flex flex-col items-center justify-center mb-4 sm:mb-6 gap-3">
                <img
                  src={logoUrl}
                  alt="Velmar Technology SRL"
                  className="h-10 md:h-12 w-auto object-contain dark:brightness-110"
                />
                <div className="text-center">
                  <h1
                    className="text-xl md:text-2xl font-bold tracking-tight mb-1 text-foreground font-heading"
                  >
                    {showOtpForm
                      ? i18n.language === "es_DO"
                        ? "Verificación de Cuenta"
                        : "Account Verification"
                      : t("login.welcome")}
                  </h1>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {showOtpForm
                      ? i18n.language === "es_DO"
                        ? "Ingresa el código OTP para continuar"
                        : "Enter the OTP code to continue"
                      : t("login.signInToPortal")}
                  </p>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-4 py-2 px-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="text-xs font-bold mb-0.5">Error</AlertTitle>
                  <AlertDescription className="text-[11px] leading-tight">{error}</AlertDescription>
                </Alert>
              )}

              {otpNotice && showOtpForm && (
                <Alert className="mb-4 py-2 px-3 bg-secondary/10 text-secondary-foreground border-secondary/20">
                  <AlertCircle className="h-4 w-4 text-secondary" />
                  <AlertTitle className="text-xs font-bold mb-0.5">
                    {i18n.language === "es_DO" ? "Acción Requerida" : "Action Required"}
                  </AlertTitle>
                  <AlertDescription className="text-[11px] leading-tight">{otpNotice}</AlertDescription>
                </Alert>
              )}

              {showOtpForm ? (
                <form onSubmit={handleVerifyAndLogin} className="space-y-3 sm:space-y-4 animate-fade-in">
                  <div>
                    <label
                      htmlFor="login-otp"
                      className="block text-xs font-bold text-foreground mb-2 text-center"
                    >
                      {t("register.otpTitle")}
                    </label>
                    <div className="flex justify-center my-2">
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
                    disabled={loading || otp.length !== 6}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 sm:h-10 rounded-lg text-sm font-bold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : i18n.language === "es_DO" ? (
                      "Verificar e Iniciar Sesión"
                    ) : (
                      "Verify & Sign In"
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowOtpForm(false);
                      setError("");
                      setOtpNotice("");
                    }}
                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground font-medium transition-colors mt-2 cursor-pointer"
                  >
                    {i18n.language === "es_DO" ? "← Volver a iniciar sesión" : "← Back to Sign In"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                  <div>
                    <label
                      htmlFor="login-email"
                      className="block text-xs font-bold text-foreground mb-1"
                    >
                      {t("login.emailAddress")}
                    </label>
                    <Input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t("login.emailPlaceholder")}
                      required
                      className="w-full h-9 sm:h-10 px-3 py-2 border-input rounded-lg text-sm bg-background focus-visible:ring-1 focus-visible:ring-ring transition-all placeholder:text-muted-foreground"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label
                        htmlFor="login-password"
                        className="block text-xs font-bold text-foreground"
                      >
                        {t("login.password")}
                      </label>
                      <Link
                        to="/forgot-password"
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        {t("login.forgotPassword")}
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t("login.enterPasswordPlaceholder")}
                        required
                        className="w-full h-9 sm:h-10 px-3 py-2 pr-10 border-input rounded-lg text-sm bg-background focus-visible:ring-1 focus-visible:ring-ring transition-all placeholder:text-muted-foreground"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-0.5 pb-1">
                    <input
                      type="checkbox"
                      id="remember"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-0 focus:ring-offset-0 bg-background cursor-pointer"
                    />
                    <label
                      htmlFor="remember"
                      className="text-xs font-medium text-muted-foreground cursor-pointer"
                    >
                      {t("login.rememberMe")}
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 sm:h-10 rounded-lg text-sm font-bold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      t("login.signIn")
                    )}
                  </button>
                </form>
              )}

              <div className="relative my-4 sm:my-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-3 text-muted-foreground font-medium">
                    {t("login.or") || "Or continue with"}
                  </span>
                </div>
              </div>

              <GoogleLoginButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} text="signin_with" />

              <p className="mt-4 sm:mt-6 text-center text-xs text-muted-foreground">
                {t("login.dontHaveAccount")}{" "}
                <Link to="/register" className="text-primary font-bold hover:underline">
                  {t("login.createAccount")}
                </Link>
              </p>
            </div>

            {/* Image/Visual Section */}
            <div className="relative hidden bg-muted md:flex flex-col items-center justify-center p-8 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop"
                alt="Workspace"
                className="absolute inset-0 h-full w-full object-cover opacity-50 dark:opacity-40 grayscale-[0.3]"
              />
              <div className="absolute inset-0 bg-linear-to-t from-background/90 via-background/40 to-transparent mix-blend-multiply" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Verification Modal */}
      <AlertDialog open={showOtpForm} onOpenChange={setShowOtpForm}>
        <AlertDialogContent className="max-w-sm p-6 bg-card border-border shadow-2xl rounded-2xl">
          <AlertDialogHeader className="items-center text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 text-secondary mb-2">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-lg font-bold tracking-tight font-heading">
              {i18n.language === "es_DO" ? "Verificación de Cuenta" : "Account Verification"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground mt-1 text-center">
              {otpNotice ||
                (i18n.language === "es_DO"
                  ? `Ingresa el código OTP de 6 dígitos enviado a tu correo (${email}) para activar tu cuenta.`
                  : `Enter the 6-digit OTP code sent to your email (${email}) to activate your account.`)}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {error && (
            <Alert variant="destructive" className="py-2 px-3 my-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-xs font-bold mb-0.5">Error</AlertTitle>
              <AlertDescription className="text-[11px] leading-tight">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleVerifyAndLogin} className="space-y-4 my-2">
            <div className="flex justify-center py-2">
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

            <AlertDialogFooter className="flex-row gap-2 sm:justify-end">
              <AlertDialogCancel
                type="button"
                onClick={() => {
                  setShowOtpForm(false);
                  setError("");
                  setOtpNotice("");
                }}
                className="w-1/2 sm:w-auto"
              >
                {i18n.language === "es_DO" ? "Cancelar" : "Cancel"}
              </AlertDialogCancel>
              <Button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-1/2 sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 font-bold transition-opacity"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : i18n.language === "es_DO" ? (
                  "Verificar"
                ) : (
                  "Verify & Sign In"
                )}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default LoginPage;
