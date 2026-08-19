import { Outlet, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Shield } from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopNav } from "@/components/layout/TopNav";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useAppLayout } from "@/hooks/useAppLayout";
import { MaxWidthWrapper } from "@/components/max-width-wrapper";

// 1. High-Density Footer Sub-component
export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="w-full mt-auto bg-card border-t border-border py-3">
      <MaxWidthWrapper className="flex flex-col md:flex-row justify-between items-center gap-2 text-[10px] md:text-xs">
        <span className="text-muted-foreground">{t("footer.copyright")}</span>
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
  choosePlanLabel: string;
}

export function BlockedPortalAlert({ onChoosePlan, choosePlanLabel }: BlockedPortalAlertProps) {
  return (
    <div className="max-w-sm w-full bg-card border border-border rounded-sm p-5 text-center shadow-xs animate-fade-in">
      <div className="w-10 h-10 bg-secondary/10 text-secondary rounded-full flex items-center justify-center mx-auto mb-3">
        <Shield className="h-5 w-5" />
      </div>
      <h2 className="text-sm font-bold text-foreground font-heading mb-1">Active Plan Required</h2>
      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
        To access the portal, manage tickets, and request support, please subscribe to an active support plan.
      </p>
      <button
        onClick={onChoosePlan}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-1.5 rounded-sm text-xs font-semibold transition-opacity flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
      >
        {choosePlanLabel}
      </button>
    </div>
  );
}

// 3. Parent Layout Wrapper
export function AppLayout() {
  const { navigate, isBlocked } = useAppLayout();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen bg-background">
        <TopNav />
        <main
          className={`flex-1 p-4 md:px-8 md:py-4 bg-background overflow-x-hidden ${isBlocked ? "flex items-center justify-center" : ""}`}
        >
          {isBlocked ? (
            <BlockedPortalAlert onChoosePlan={() => navigate("/plans")} choosePlanLabel="Choose a Support Plan" />
          ) : (
            <Outlet />
          )}
        </main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  );
}
