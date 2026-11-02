import React, { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Laptop,
  Ticket,
  KeyRound,
  Download,
  Sparkles,
  Calendar,
  CreditCard,
  Layers,
  HelpCircle,
  Shield,
  Activity,
  Users,
  Moon,
  Sun,
  Palette,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { useAuth } from "@/hooks/useAuth";
import { ThemeProviderContext } from "@/components/shared/useTheme";

interface SpotlightSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function useSafeTheme() {
  const context = React.useContext(ThemeProviderContext);
  return context ?? { theme: "dark" as const, setTheme: () => null };
}

export function SpotlightSearchModal({ open, onOpenChange }: SpotlightSearchModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, setTheme } = useSafeTheme();

  // Listen for Cmd+K / Ctrl+K keyboard shortcuts globally
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const runCommand = useCallback(
    (action: () => void) => {
      onOpenChange(false);
      action();
    },
    [onOpenChange]
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("spotlight.title")}
      description={t("spotlight.description")}
    >
      <CommandInput placeholder={t("spotlight.placeholder")} />
      <CommandList>
        <CommandEmpty>{t("spotlight.noResults")}</CommandEmpty>

        <CommandGroup heading={t("spotlight.groupNavigation")}>
          <CommandItem
            onSelect={() => runCommand(() => navigate(user?.role === "TECHNICIAN" ? "/tech/dashboard" : "/dashboard"))}
          >
            <LayoutDashboard className="size-4" />
            <span>{t("spotlight.dashboard")}</span>
          </CommandItem>

          <CommandItem onSelect={() => runCommand(() => navigate("/tickets"))}>
            <Ticket className="size-4" />
            <span>{t("spotlight.tickets")}</span>
          </CommandItem>

          <CommandItem onSelect={() => runCommand(() => navigate("/devices"))}>
            <Laptop className="size-4" />
            <span>{t("spotlight.devices")}</span>
          </CommandItem>

          <CommandItem onSelect={() => runCommand(() => navigate("/password-manager"))}>
            <KeyRound className="size-4" />
            <span>{t("spotlight.passwordVault")}</span>
          </CommandItem>

          <CommandItem onSelect={() => runCommand(() => navigate("/resources"))}>
            <Download className="size-4" />
            <span>{t("spotlight.storage")}</span>
          </CommandItem>

          <CommandItem onSelect={() => runCommand(() => navigate("/maintenance"))}>
            <Calendar className="size-4" />
            <span>{t("spotlight.maintenance")}</span>
          </CommandItem>

          <CommandItem onSelect={() => runCommand(() => navigate("/settings/ai"))}>
            <Sparkles className="size-4" />
            <span>{t("spotlight.aiDiagnostics")}</span>
          </CommandItem>

          <CommandItem onSelect={() => runCommand(() => navigate("/billing"))}>
            <CreditCard className="size-4" />
            <span>{t("spotlight.billing")}</span>
          </CommandItem>

          <CommandItem onSelect={() => runCommand(() => navigate("/plans"))}>
            <Layers className="size-4" />
            <span>{t("spotlight.plans")}</span>
          </CommandItem>
        </CommandGroup>

        {user?.role === "ADMIN" && (
          <CommandGroup heading={t("spotlight.groupAdministration")}>
            <CommandItem onSelect={() => runCommand(() => navigate("/crm"))}>
              <Users className="size-4" />
              <span>{t("spotlight.crm")}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/financial"))}>
              <Activity className="size-4" />
              <span>{t("spotlight.financial")}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/admin/users"))}>
              <Shield className="size-4" />
              <span>{t("spotlight.users")}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/admin/api-status"))}>
              <Activity className="size-4" />
              <span>{t("spotlight.apiStatus")}</span>
            </CommandItem>
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading={t("spotlight.groupSystemTheme")}>
          <CommandItem onSelect={() => runCommand(() => navigate("/dev/style-guide"))}>
            <Palette className="size-4" />
            <span>{t("spotlight.styleGuide")}</span>
          </CommandItem>

          <CommandItem onSelect={() => runCommand(() => navigate("/help"))}>
            <HelpCircle className="size-4" />
            <span>{t("spotlight.help")}</span>
          </CommandItem>

          <CommandItem
            onSelect={() =>
              runCommand(() => setTheme(theme === "dark" ? "light" : "dark"))
            }
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            <span>
              {t("spotlight.toggleTheme", {
                mode: theme === "dark" ? t("spotlight.themeLight") : t("spotlight.themeDark"),
              })}
            </span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
