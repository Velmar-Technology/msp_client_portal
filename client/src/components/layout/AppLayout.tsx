import { Outlet, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Shield, AlertTriangle } from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopNav } from "@/components/layout/TopNav";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAppLayout } from "@/hooks/useAppLayout";
import { MaxWidthWrapper } from "@/components/max-width-wrapper";

// 1. High-Density Footer Sub-component
export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="w-full mt-auto bg-card border-t border-border py-3">
      <MaxWidthWrapper className="flex flex-col md:flex-row justify-between items-center gap-2 text-[10px] md:text-xs">
        <span className="text-muted-foreground">{t("footer.copyright", { company: "Velmar Technology SRL" })}</span>
        <div className="flex gap-4">
          <Link to="/help" className="text-muted-foreground hover:text-foreground transition-colors">
            {t("footer.help")}
          </Link>
          <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
            {t("footer.terms")}
          </Link>
          <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
            {t("footer.privacy")}
          </Link>
        </div>
      </MaxWidthWrapper>
    </footer>
  );
}

// 2. High-Density Monochromatic Access Gate Card Sub-component
interface BlockedPortalAlertProps {
  onChoosePlan: () => void;
  choosePlanLabel?: string;
}

export function BlockedPortalAlert({ onChoosePlan, choosePlanLabel }: BlockedPortalAlertProps) {
  const { t } = useTranslation();

  return (
    <div className="max-w-sm w-full bg-card border border-border rounded-sm p-5 text-center shadow-xs animate-fade-in">
      <div className="w-10 h-10 bg-secondary/10 text-secondary rounded-full flex items-center justify-center mx-auto mb-3">
        <Shield className="h-5 w-5" />
      </div>
      <h2 className="text-sm font-bold text-foreground font-heading mb-1">{t("layout.blockedTitle")}</h2>
      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
        {t("layout.blockedDescription")}
      </p>
      <Button
        size="sm"
        onClick={onChoosePlan}
        className="w-full text-xs font-semibold"
      >
        {choosePlanLabel || t("layout.choosePlan")}
      </Button>
    </div>
  );
}

export function ReadOnlyNoticeBanner({ onGoToBilling }: { onGoToBilling: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="mb-4 bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-3 rounded-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-fade-in shadow-xs">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
        <div>
          <span className="font-semibold">{t("billing.readOnlyBannerTitle")}: </span>
          <span className="text-amber-800/90 dark:text-amber-300/90">{t("billing.readOnlyBannerDesc")}</span>
        </div>
      </div>
      <Button
        variant="outline"
        size="xs"
        onClick={onGoToBilling}
        className="shrink-0 border-amber-500/40 text-amber-900 dark:text-amber-100 hover:bg-amber-500/20"
      >
        {t("billing.viewInvoices")}
      </Button>
    </div>
  );
}

// 3. Parent Layout Wrapper
export function AppLayout() {
  const { t } = useTranslation();
  const { navigate, isBlocked, isReadOnly } = useAppLayout();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen bg-background">
        <TopNav />
        <main
          className={`flex-1 p-4 md:px-8 md:py-4 bg-background overflow-x-hidden ${isBlocked ? "flex items-center justify-center" : ""}`}
        >
          {isBlocked ? (
            <BlockedPortalAlert onChoosePlan={() => navigate("/plans")} choosePlanLabel={t("layout.choosePlan")} />
          ) : (
            <>
              {isReadOnly && <ReadOnlyNoticeBanner onGoToBilling={() => navigate("/billing")} />}
              <Outlet />
            </>
          )}
        </main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  );
}
