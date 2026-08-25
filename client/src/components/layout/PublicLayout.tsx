import { Link, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Globe, ArrowRight, LayoutDashboard, Headphones, FileText, Lock, CreditCard } from "lucide-react";
import logoUrl from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { APP_METADATA } from "@/config/metadata";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PublicLayout() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, user } = useAuth();

  const getDashboardLink = () => {
    if (user?.role === "TECHNICIAN") return "/tech/dashboard";
    return "/dashboard";
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors">
      {/* Standalone Public Header Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 group focus:outline-none">
            <img
              src={logoUrl}
              alt="Velmar Logo"
              className="h-8 w-auto object-contain dark:brightness-110 group-hover:opacity-90 transition-opacity"
            />
            <div className="flex flex-col">
              <span
                className="text-base sm:text-lg font-bold tracking-tight text-foreground leading-tight font-heading"
              >
                {t("home.title")}
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider hidden sm:block">
                {t("home.badge")}
              </span>
            </div>
          </Link>

          {/* Header Action Items */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Selector */}
            <Select
              value={i18n.language?.startsWith("es") ? "es_DO" : "en_US"}
              onValueChange={(val) => i18n.changeLanguage(val)}
            >
              <SelectTrigger
                aria-label="Select Language"
                className="h-8 rounded-full border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-3 text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <Globe className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="en_US" className="text-xs font-medium">EN</SelectItem>
                <SelectItem value="es_DO" className="text-xs font-medium">ES</SelectItem>
              </SelectContent>
            </Select>

            {isAuthenticated ? (
              <Button asChild size="sm" className="gap-1.5 rounded-full font-bold">
                <Link to={getDashboardLink()}>
                  <LayoutDashboard className="h-4 w-4" />
                  <span>{t("home.goToDashboard")}</span>
                </Link>
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex rounded-full text-xs font-semibold">
                  <Link to="/login">{t("login.signIn")}</Link>
                </Button>
                <Button asChild size="sm" className="rounded-full text-xs font-bold gap-1">
                  <Link to="/register">
                    <span>{t("home.register")}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Standalone Public Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-8 text-xs text-zinc-500 dark:text-zinc-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="space-y-1">
            <p className="font-bold text-zinc-800 dark:text-zinc-200">{APP_METADATA.appName}</p>
            <p>© 2026 {APP_METADATA.company}. All rights reserved.</p>
            <p className="text-[11px] text-zinc-400">{APP_METADATA.address} | Support: {APP_METADATA.email}</p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 font-semibold text-zinc-600 dark:text-zinc-400">
            <Link to="/plans" className="hover:underline flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5" />
              <span>{t("home.navPlans")}</span>
            </Link>
            <Link to="/help" className="hover:underline flex items-center gap-1">
              <Headphones className="h-3.5 w-3.5" />
              <span>{t("footer.help")}</span>
            </Link>
            <Link to="/terms" className="hover:underline flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              <span>{t("footer.terms")}</span>
            </Link>
            <Link to="/privacy" className="hover:underline flex items-center gap-1">
              <Lock className="h-3.5 w-3.5" />
              <span>{t("footer.privacy")}</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
