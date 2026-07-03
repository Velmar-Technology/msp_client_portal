import { Outlet, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Shield } from "lucide-react";
import { AppSidebar } from "./app-sidebar";
import { TopNav } from "./TopNav";
import { SidebarProvider, SidebarInset } from "../ui/sidebar";
import { ToastContainer } from "./ToastContainer";
import { useAppLayout } from "../../hooks/useAppLayout";

// 1. High-Density Footer Sub-component
export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="flex flex-col md:flex-row justify-between items-center px-4 md:px-8 py-1.5 mt-auto bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 w-full gap-2 text-[10px] md:text-xs">
      <span className="text-zinc-500">
        {t("footer.copyright")}
      </span>
      <div className="flex gap-4">
        <Link to="/help" className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">
          {t("footer.help")}
        </Link>
        <Link to="/terms" className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">
          {t("footer.terms")}
        </Link>
        <Link to="/privacy" className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">
          {t("footer.privacy")}
        </Link>
      </div>
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
    <div className="max-w-sm w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 text-center shadow-sm animate-fade-in">
      <div className="w-10 h-10 bg-amber-500/10 text-amber-500 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-3">
        <Shield className="h-5 w-5" />
      </div>
      <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-1">
        Active Plan Required
      </h2>
      <p className="text-xs text-zinc-500 leading-relaxed mb-4">
        To access the portal, manage tickets, and request support, please subscribe to an active support plan.
      </p>
      <button
        onClick={onChoosePlan}
        className="w-full bg-zinc-900 dark:bg-zinc-100 hover:opacity-90 text-white dark:text-zinc-900 py-1.5 rounded text-xs font-semibold transition-opacity flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
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
      <SidebarInset className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-900">
        <TopNav />
        <main className={`flex-1 p-4 md:px-8 md:py-4 bg-zinc-50 dark:bg-zinc-900 overflow-x-hidden ${isBlocked ? "flex items-center justify-center" : ""}`}>
          {isBlocked ? (
            <BlockedPortalAlert
              onChoosePlan={() => navigate("/plans")}
              choosePlanLabel="Choose a Support Plan"
            />
          ) : (
            <Outlet />
          )}
        </main>
        <Footer />
      </SidebarInset>
      <ToastContainer />
    </SidebarProvider>
  );
}
