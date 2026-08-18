import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { LifeBuoy, Activity, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { APP_METADATA } from "@/config/metadata";

export function HomePage() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();

  const getDashboardLink = () => {
    if (user?.role === "TECHNICIAN") return "/tech/dashboard";
    return "/dashboard";
  };

  return (
    <div className="w-full font-sans">
      {/* Authenticated Quick Notification Banner */}
      {isAuthenticated && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2.5 text-center text-xs font-medium text-emerald-700 dark:text-emerald-300">
          <span>
            Logged in as <strong>{user?.name}</strong> ({user?.email}).{" "}
          </span>
          <Link
            to={getDashboardLink()}
            className="underline font-bold hover:text-emerald-800 dark:hover:text-emerald-200"
          >
            {t("home.goToDashboard")} &rarr;
          </Link>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden border-b border-zinc-200 dark:border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <Badge
            variant="outline"
            className="mb-4 px-3 py-1 text-xs font-semibold rounded-full border-primary/30 text-primary bg-primary/5"
          >
            {t("home.badge")}
          </Badge>
          <h1
            className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight mb-6 text-zinc-900 dark:text-white"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {t("home.title")}
          </h1>
          <p className="text-base sm:text-xl text-zinc-600 dark:text-zinc-300 max-w-3xl mx-auto mb-8 font-normal leading-relaxed">
            {t("home.tagline")}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
            <Button asChild size="lg" className="rounded-full px-6 font-bold shadow-lg gap-2 text-sm">
              <Link to="/login">
                <span>{t("home.signIn")}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full px-6 font-semibold border-zinc-300 dark:border-zinc-700 text-sm"
            >
              <Link to="/plans">{t("home.explorePlans")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Application Purpose Section - Directly addressing Google Verification Requirements */}
      <section className="py-14 md:py-20 bg-white dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <Badge className="mb-3 px-3 py-0.5 text-[11px] uppercase tracking-wider font-bold bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900">
              {t("home.purposeBadge")}
            </Badge>
            <h2
              className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {t("home.purposeTitle")}
            </h2>
          </div>

          <Card className="border-zinc-200 dark:border-zinc-800 shadow-xl bg-zinc-50/50 dark:bg-zinc-950/50 rounded-2xl overflow-hidden">
            <CardContent className="p-6 sm:p-8 md:p-10 space-y-6">
              <p className="text-base sm:text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal">
                {t("home.purposeDescription")}
              </p>

              <Separator className="bg-zinc-200 dark:bg-zinc-800" />

              <div className="grid sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-zinc-600 dark:text-zinc-400">
                    <strong>Multi-Tenant Client Portal</strong>: Isolated corporate accounts for clients, technicians,
                    and administrators.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-zinc-600 dark:text-zinc-400">
                    <strong>1-Hour SLA Guarantee</strong>: Automated escalation logic for high-priority warranty and
                    outage tickets.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-zinc-600 dark:text-zinc-400">
                    <strong>Automated Billing & Invoicing</strong>: Integrated PayPal REST capture and offline wire
                    transfer verification.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-zinc-600 dark:text-zinc-400">
                    <strong>Security Standard</strong>: Encrypted communications with {APP_METADATA.securityStandard}.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Platform Modules & Feature Cards */}
      <section className="py-14 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2
            className="text-2xl sm:text-3xl font-bold tracking-tight mb-3 text-zinc-900 dark:text-white"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {t("home.featuresTitle")}
          </h2>
          <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">
            {t("home.featuresSubtitle")}
          </p>
        </div>

        <div className="grid justify-center grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Feature 1 */}
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                <LifeBuoy className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-bold leading-snug">{t("home.feature1Title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {t("home.feature1Desc")}
              </p>
            </CardContent>
          </Card>

          {/* Feature 2 */}
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <Activity className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-bold leading-snug">{t("home.feature2Title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {t("home.feature2Desc")}
              </p>
            </CardContent>
          </Card>

          {/* Feature 3 */}
          {/* <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                <CreditCard className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-bold leading-snug">
                {t("home.feature3Title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {t("home.feature3Desc")}
              </p>
            </CardContent>
          </Card> */}

          {/* Feature 4 */}
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-bold leading-snug">{t("home.feature4Title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {t("home.feature4Desc")}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-14 bg-zinc-900 text-white dark:bg-zinc-900 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2
            className="text-2xl sm:text-3xl font-bold tracking-tight mb-3"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {t("home.ctaTitle")}
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto mb-6">{t("home.ctaSubtitle")}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-white text-zinc-900 hover:bg-zinc-100 font-bold px-6 text-sm"
            >
              <Link to="/login">{t("home.signIn")}</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full border-zinc-700 text-white hover:bg-zinc-800 font-semibold px-6 text-sm"
            >
              <Link to="/plans">{t("home.explorePlans")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
