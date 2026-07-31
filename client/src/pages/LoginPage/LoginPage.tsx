import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, AlertCircle, Globe } from "lucide-react";
import logoUrl from "@/assets/logo.png";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleSuccess = async (idToken: string) => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle(idToken);
      navigate("/dashboard");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const errorMsg =
        error.response?.data?.message ||
        (i18n.language === "es_DO" ? "Error al autenticar con Google" : "Google authentication failed");
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = (errMsg?: string) => {
    const defaultMsg = i18n.language === "es_DO" ? "Error al autenticar con Google" : "Google authentication failed";
    setError(errMsg || defaultMsg);
    toast.error(errMsg || defaultMsg);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const errorMsg =
        error.response?.data?.message ||
        (i18n.language === "es_DO" ? "Correo o contraseña incorrectos" : "Invalid email or password");
      setError(errorMsg);

      if (errorMsg.includes("verify your email") || errorMsg.includes("verificar tu correo")) {
        toast.error("Authentication Failed", {
          description: errorMsg,
          action: {
            label: i18n.language === "es_DO" ? "Ir a Registro" : "Go to Register",
            onClick: () => navigate("/register"),
          },
          duration: 6000,
        });
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen h-dvh w-full items-center justify-center overflow-hidden bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-6 transition-colors">
      {/* Top Bar Language Selector */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center gap-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 rounded-full px-3 py-1 shadow-sm">
        <Globe className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
        <select
          id="login-language-select"
          aria-label="Language Selector"
          value={i18n.language || "en_US"}
          onChange={(e) => {
            const newLang = e.target.value;
            i18n.changeLanguage(newLang);
          }}
          className="bg-transparent text-xs font-semibold text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
        >
          <option value="en_US" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
            English (US)
          </option>
          <option value="es_DO" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
            Español (DO)
          </option>
        </select>
      </div>

      <div className="w-full max-w-sm md:max-w-4xl max-h-full overflow-y-auto custom-scrollbar animate-fade-in">
        <Card className="overflow-hidden p-0 border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl">
          <CardContent className="grid p-0 md:grid-cols-2">
            {/* Form Section */}
            <div className="p-5 sm:p-6 md:p-8 flex flex-col justify-center bg-white dark:bg-zinc-900">
              <div className="flex flex-col items-center justify-center mb-4 sm:mb-6 gap-3">
                <img
                  src={logoUrl}
                  alt="Velmar Technology SRL"
                  className="h-10 md:h-12 w-auto object-contain dark:brightness-110"
                />
                <div className="text-center">
                  <h1
                    className="text-xl md:text-2xl font-bold tracking-tight mb-1"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {t("login.welcome")}
                  </h1>
                  <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400">{t("login.signInToPortal")}</p>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-4 py-2 px-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="text-xs font-bold mb-0.5">Error</AlertTitle>
                  <AlertDescription className="text-[11px] leading-tight">{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1"
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
                    className="w-full h-9 sm:h-10 px-3 py-2 border-zinc-200 dark:border-zinc-800 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-950! focus-visible:ring-1 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
                    >
                      {t("login.password")}
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 hover:underline"
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
                      className="w-full h-9 sm:h-10 px-3 py-2 pr-10 border-zinc-200 dark:border-zinc-800 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-950 focus-visible:ring-1 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
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

                <div className="flex items-center gap-2 pt-0.5 pb-1">
                  <input
                    type="checkbox"
                    id="remember"
                    className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-0 focus:ring-offset-0 bg-zinc-50 dark:bg-zinc-950 cursor-pointer"
                  />
                  <label
                    htmlFor="remember"
                    className="text-xs font-medium text-zinc-600 dark:text-zinc-400 cursor-pointer"
                  >
                    {t("login.rememberMe")}
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 h-9 sm:h-10 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 dark:border-zinc-900/30 border-t-white dark:border-t-zinc-900 rounded-full animate-spin" />
                  ) : (
                    t("login.signIn")
                  )}
                </button>
              </form>

              <div className="relative my-4 sm:my-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white dark:bg-zinc-900 px-3 text-zinc-500 dark:text-zinc-400 font-medium">
                    {t("login.or") || "Or continue with"}
                  </span>
                </div>
              </div>

              <GoogleLoginButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} text="signin_with" />

              <p className="mt-4 sm:mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                {t("login.dontHaveAccount")}{" "}
                <Link to="/register" className="text-zinc-900 dark:text-zinc-100 font-bold hover:underline">
                  {t("login.createAccount")}
                </Link>
              </p>
            </div>

            {/* Image/Visual Section */}
            <div className="relative hidden bg-zinc-900 md:flex flex-col items-center justify-center p-8 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop"
                alt="Workspace"
                className="absolute inset-0 h-full w-full object-cover opacity-50 dark:opacity-40 grayscale-[0.3]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/40 to-transparent mix-blend-multiply" />

              {/* <div className="relative z-10 mt-auto w-full max-w-sm flex flex-col gap-3">
                <div className="bg-zinc-950/50 backdrop-blur-md border border-white/10 rounded-xl p-5 shadow-2xl">
                  <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    Portal Demo Access
                  </h3>
                  <div className="space-y-1.5 font-mono text-[11px] text-zinc-300">
                    <div className="flex items-center justify-between bg-black/40 rounded py-1 px-2">
                      <span>User:</span>
                      <span className="text-white font-medium">admin@msp-helpdesk.com</span>
                    </div>
                    <div className="flex items-center justify-between bg-black/40 rounded py-1 px-2">
                      <span>Pass:</span>
                      <span className="text-white font-medium">password123</span>
                    </div>
                  </div>
                </div>
              </div> */}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
