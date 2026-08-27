import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUrlState } from "@/hooks/useUrlState";
import { authService } from "@/services/authService";
import {
  Eye,
  EyeOff,
  AlertCircle,
  Globe,
  ShieldCheck,
  Mail,
  Lock,
  CheckCircle2,
} from "lucide-react";
import logoUrl from "@/assets/logo.png";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { getRememberMe } from "@/lib/authStorage";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8)
      .regex(/[A-Z]/)
      .regex(/[a-z]/)
      .regex(/[0-9]/),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
  });

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const { login, verifyEmail, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { getParam, setParam, removeParam, removeParams } = useUrlState();

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(getRememberMe);

  // Email OTP verification state
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpNotice, setOtpNotice] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  // Forgot password dialog state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState("");

  // Reset password with token dialog state
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  // URL-synced modal dialog triggers
  const openModal = getParam("openModal", "");
  const tokenFromUrl = getParam("token", "") || getParam("resetToken", "");
  const prevModalRef = useRef(openModal);

  useEffect(() => {
    if (tokenFromUrl) {
      setResetToken(tokenFromUrl);
      if (openModal !== "reset-password") {
        setParam("openModal", "reset-password");
      }
    }
  }, [tokenFromUrl, openModal, setParam]);

  // Sync initial forgot email with login email only when modal opens
  useEffect(() => {
    if (openModal === "forgot-password" && prevModalRef.current !== "forgot-password") {
      if (email) {
        setForgotEmail(email);
      }
    }
    prevModalRef.current = openModal;
  }, [openModal, email]);

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
        const errorMsg = extractedMessage || t("passwordReset.googleAuthError");
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [loginWithGoogle, navigate, rememberMe, t],
  );

  const handleGoogleError = useCallback(
    (errMsg?: string) => {
      const defaultMsg = t("passwordReset.googleAuthError");
      setError(errMsg || defaultMsg);
      toast.error(errMsg || defaultMsg);
    },
    [t],
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
      const errorMsg = extractedMessage || t("passwordReset.invalidCredentials");

      if (errorMsg.toLowerCase().includes("verify your email")) {
        setShowOtpForm(true);
        const notice = t("passwordReset.unverifiedAccountNotice", { email });
        setOtpNotice(notice);
        toast.error(t("passwordReset.verificationRequiredTitle"), {
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
    setOtpLoading(true);
    try {
      await verifyEmail(email, otp);
      toast.success(t("passwordReset.verifySuccess"));
      await login(email, password, rememberMe);
      navigate("/dashboard");
    } catch (err: unknown) {
      const extractedMessage =
        (err instanceof Error && err.message) ||
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      const errorMsg = extractedMessage || t("passwordReset.otpVerifyFailed");
      setError(errorMsg);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");

    const validation = forgotPasswordSchema.safeParse({ email: forgotEmail });
    if (!validation.success) {
      setForgotError(t("passwordReset.invalidEmail"));
      return;
    }

    setForgotLoading(true);
    try {
      await authService.forgotPassword(forgotEmail);
      setForgotSent(true);
      toast.success(t("passwordReset.requestSuccessToast"));
    } catch (err: unknown) {
      const extractedMessage =
        (err instanceof Error && err.message) ||
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setForgotError(extractedMessage || t("passwordReset.invalidCredentials"));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");

    const activeToken = (resetToken || tokenFromUrl).trim();

    if (!activeToken) {
      setResetError(t("passwordReset.missingLinkError"));
      return;
    }

    const validation = resetPasswordSchema.safeParse({
      token: activeToken,
      password: newPassword,
      confirmPassword: confirmNewPassword,
    });

    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      if (firstIssue.path.includes("token")) {
        setResetError(t("passwordReset.missingLinkError"));
      } else if (firstIssue.path.includes("confirmPassword")) {
        setResetError(t("passwordReset.passwordMismatch"));
      } else if (firstIssue.path.includes("password")) {
        if (newPassword.length < 8) {
          setResetError(t("passwordReset.passwordMinLength"));
        } else if (!/[A-Z]/.test(newPassword)) {
          setResetError(t("passwordReset.passwordUppercase"));
        } else if (!/[a-z]/.test(newPassword)) {
          setResetError(t("passwordReset.passwordLowercase"));
        } else if (!/[0-9]/.test(newPassword)) {
          setResetError(t("passwordReset.passwordNumber"));
        } else {
          setResetError(t("passwordReset.passwordMinLength"));
        }
      }
      return;
    }

    setResetLoading(true);
    try {
      await authService.resetPassword(activeToken, newPassword, confirmNewPassword);
      toast.success(t("passwordReset.successToast"));
      // Reset form state and close modal
      setResetToken("");
      setNewPassword("");
      setConfirmNewPassword("");
      removeParams(["openModal", "token", "resetToken"]);
      if (forgotEmail && !email) {
        setEmail(forgotEmail);
      }
    } catch (err: unknown) {
      const extractedMessage =
        (err instanceof Error && err.message) ||
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setResetError(extractedMessage || t("passwordReset.invalidTokenError"));
    } finally {
      setResetLoading(false);
    }
  };

  const closeForgotDialog = () => {
    removeParam("openModal");
    setForgotError("");
    setForgotSent(false);
  };

  const closeResetDialog = () => {
    removeParams(["openModal", "token", "resetToken"]);
    setResetError("");
  };

  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center bg-background p-4 sm:p-6 transition-colors">
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
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight mb-1 text-foreground font-heading">
                    {showOtpForm ? t("passwordReset.accountVerificationTitle") : t("login.welcome")}
                  </h1>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {showOtpForm ? t("passwordReset.enterOtpPrompt") : t("login.signInToPortal")}
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
                    {t("passwordReset.verificationRequiredTitle")}
                  </AlertTitle>
                  <AlertDescription className="text-[11px] leading-tight">{otpNotice}</AlertDescription>
                </Alert>
              )}

              {showOtpForm ? (
                <form onSubmit={handleVerifyAndLogin} className="space-y-3 sm:space-y-4 animate-fade-in">
                  <div>
                    <Label htmlFor="login-otp" className="block text-xs font-bold text-foreground mb-2 text-center">
                      {t("register.otpTitle")}
                    </Label>
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
                    disabled={otpLoading || otp.length !== 6}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 sm:h-10 rounded-lg text-sm font-bold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    {otpLoading ? (
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      t("passwordReset.verifyAndSignIn")
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowOtpForm(false);
                      setError("");
                      setOtpNotice("");
                    }}
                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground font-medium transition-colors mt-2 cursor-pointer h-8"
                  >
                    {`← ${t("passwordReset.backToSignIn")}`}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                  <div>
                    <Label htmlFor="login-email" className="block text-xs font-bold text-foreground mb-1">
                      {t("login.emailAddress")}
                    </Label>
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
                      <Label htmlFor="login-password" className="block text-xs font-bold text-foreground">
                        {t("login.password")}
                      </Label>
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => {
                          setForgotEmail(email);
                          setParam("openModal", "forgot-password");
                        }}
                        className="p-0 h-auto text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                      >
                        {t("login.forgotPassword")}
                      </Button>
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="sr-only">Toggle password visibility</span>
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-0.5 pb-1">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                    />
                    <Label
                      htmlFor="remember"
                      className="text-xs font-medium text-muted-foreground cursor-pointer select-none"
                    >
                      {t("login.rememberMe")}
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 sm:h-10 rounded-lg text-sm font-bold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      t("login.signIn")
                    )}
                  </Button>
                </form>
              )}

              <div className="relative my-4 sm:my-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-3 text-muted-foreground font-medium">{t("login.or")}</span>
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

      {/* Account Verification Dialog */}
      <AlertDialog open={showOtpForm} onOpenChange={setShowOtpForm}>
        <AlertDialogContent size="sm" className="p-6 bg-card border-border shadow-2xl rounded-2xl sm:max-w-[440px]">
          <AlertDialogHeader className="items-center text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 text-secondary mb-2">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-lg font-bold tracking-tight font-heading">
              {t("passwordReset.accountVerificationTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground mt-1 text-center">
              {otpNotice || t("passwordReset.accountVerificationDesc", { email })}
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
                className="w-1/2 sm:w-auto cursor-pointer"
              >
                {t("passwordReset.cancel")}
              </AlertDialogCancel>
              <Button
                type="submit"
                disabled={otpLoading || otp.length !== 6}
                className="w-1/2 sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 font-bold transition-opacity cursor-pointer"
              >
                {otpLoading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  t("passwordReset.verifyAndSignIn")
                )}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      {/* Forgot Password Request Dialog (?openModal=forgot-password) */}
      <AlertDialog
        open={openModal === "forgot-password"}
        onOpenChange={(open) => {
          if (!open) closeForgotDialog();
        }}
      >
        <AlertDialogContent size="sm" className="p-6 bg-card border-border shadow-2xl rounded-2xl sm:max-w-[440px]">
          <AlertDialogHeader className="items-center text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
              <Mail className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-lg font-bold tracking-tight font-heading">
              {t("passwordReset.forgotPasswordTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground mt-1 text-center">
              {t("passwordReset.forgotPasswordDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {forgotError && (
            <Alert variant="destructive" className="py-2 px-3 my-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-xs font-bold mb-0.5">Error</AlertTitle>
              <AlertDescription className="text-[11px] leading-tight">{forgotError}</AlertDescription>
            </Alert>
          )}

          {forgotSent ? (
            <div className="space-y-4 my-2 text-center">
              <div className="flex flex-col items-center justify-center p-4 bg-primary/5 rounded-xl border border-primary/10">
                <CheckCircle2 className="h-10 w-10 text-primary mb-2" />
                <h4 className="text-sm font-bold text-foreground">{t("passwordReset.resetEmailSentTitle")}</h4>
                <p className="text-xs text-muted-foreground mt-1">{t("passwordReset.resetEmailSentDesc")}</p>
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  onClick={closeForgotDialog}
                  className="w-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 cursor-pointer"
                >
                  {t("passwordReset.backToSignIn")}
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 my-2">
              <div>
                <Label htmlFor="forgot-email" className="block text-xs font-bold text-foreground mb-1">
                  {t("passwordReset.emailLabel")}
                </Label>
                <Input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder={t("passwordReset.emailPlaceholder")}
                  required
                  className="w-full h-10 px-3 py-2 border-input rounded-lg text-sm bg-background"
                />
              </div>

              <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
                <AlertDialogCancel
                  type="button"
                  onClick={closeForgotDialog}
                  className="w-full sm:w-auto cursor-pointer"
                >
                  {t("passwordReset.cancel")}
                </AlertDialogCancel>
                <Button
                  type="submit"
                  disabled={forgotLoading || !forgotEmail}
                  className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 font-bold cursor-pointer"
                >
                  {forgotLoading ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    t("passwordReset.sendResetLink")
                  )}
                </Button>
              </AlertDialogFooter>
            </form>
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog (?openModal=reset-password) */}
      <AlertDialog
        open={openModal === "reset-password"}
        onOpenChange={(open) => {
          if (!open) closeResetDialog();
        }}
      >
        <AlertDialogContent size="sm" className="p-6 bg-card border-border shadow-2xl rounded-2xl sm:max-w-[440px]">
          <AlertDialogHeader className="items-center text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
              <Lock className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-lg font-bold tracking-tight font-heading">
              {t("passwordReset.resetPasswordTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground mt-1 text-center">
              {t("passwordReset.resetPasswordDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {resetError && (
            <Alert variant="destructive" className="py-2 px-3 my-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-xs font-bold mb-0.5">Error</AlertTitle>
              <AlertDescription className="text-[11px] leading-tight">{resetError}</AlertDescription>
            </Alert>
          )}

          {!resetToken && !tokenFromUrl ? (
            <div className="space-y-4 my-2 text-center">
              <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-xl border border-border">
                <AlertCircle className="h-10 w-10 text-amber-500 mb-2" />
                <p className="text-xs text-muted-foreground">{t("passwordReset.missingLinkError")}</p>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  type="button"
                  onClick={() => setParam("openModal", "forgot-password")}
                  className="w-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 cursor-pointer"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {t("passwordReset.requestNewLink")}
                </Button>
                <Button type="button" variant="outline" onClick={closeResetDialog} className="w-full cursor-pointer">
                  {t("passwordReset.backToSignIn")}
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-3 sm:space-y-4 my-2">
              <div>
                <Label htmlFor="reset-new-password" className="block text-xs font-bold text-foreground mb-1">
                  {t("passwordReset.newPasswordLabel")}
                </Label>
                <div className="relative">
                  <Input
                    id="reset-new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t("passwordReset.newPasswordPlaceholder")}
                    required
                    className="w-full h-10 px-3 py-2 pr-10 border-input rounded-lg text-sm bg-background"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="sr-only">Toggle new password visibility</span>
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="reset-confirm-password" className="block text-xs font-bold text-foreground mb-1">
                  {t("passwordReset.confirmNewPasswordLabel")}
                </Label>
                <div className="relative">
                  <Input
                    id="reset-confirm-password"
                    type={showConfirmNewPassword ? "text" : "password"}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder={t("passwordReset.confirmNewPasswordPlaceholder")}
                    required
                    className="w-full h-10 px-3 py-2 pr-10 border-input rounded-lg text-sm bg-background"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="sr-only">Toggle confirm password visibility</span>
                  </Button>
                </div>
              </div>

              <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
                <AlertDialogCancel
                  type="button"
                  onClick={closeResetDialog}
                  className="w-full sm:w-auto cursor-pointer"
                >
                  {t("passwordReset.cancel")}
                </AlertDialogCancel>
                <Button
                  type="submit"
                  disabled={resetLoading || !newPassword || !confirmNewPassword}
                  className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 font-bold cursor-pointer"
                >
                  {resetLoading ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    t("passwordReset.resetSubmitButton")
                  )}
                </Button>
              </AlertDialogFooter>

              <div className="pt-2 text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={closeResetDialog}
                  className="text-xs text-primary font-semibold hover:underline p-0 h-auto cursor-pointer"
                >
                  {t("passwordReset.backToSignIn")}
                </Button>
              </div>
            </form>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default LoginPage;
