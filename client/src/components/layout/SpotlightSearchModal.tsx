import React, { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  CommandShortcut,
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
      title="Quick Navigation"
      description="Search across portal workspaces, tools, and actions"
    >
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No matching results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => runCommand(() => navigate(user?.role === "TECHNICIAN" ? "/tech/dashboard" : "/dashboard"))}
          >
            <LayoutDashboard className="size-4" />
            <span>Dashboard</span>
            <CommandShortcut>⌘D</CommandShortcut>
          </CommandItem>

          <CommandItem onSelect={() => runCommand(() => navigate("/tickets"))}>
            <Ticket className="size-4" />
            <span>Support Tickets</span>
            <CommandShortcut>⌘T</CommandShortcut>
          </CommandItem>

          <CommandItem onSelect={() => runCommand(() => navigate("/devices"))}>
            <Laptop className="size-4" />
            <span>Devices & RMM Telemetry</span>
          </CommandItem>

          <CommandItem onSelect={() => runCommand(() => navigate("/password-manager"))}>
            <KeyRound className="size-4" />
            <span>Password Vault</span>
          </CommandItem>

          <CommandItem onSelect={() => runCommand(() => navigate("/resources"))}>
            <Download className="size-4" />
            <span>Cloud Storage Resources</span>
          </CommandItem>

          <CommandItem onSelect={() => runCommand(() => navigate("/maintenance"))}>
            <Calendar className="size-4" />
            <span>Maintenance Schedule</span>
          </CommandItem>

          <CommandItem onSelect={() => runCommand(() => navigate("/settings/ai"))}>
            <Sparkles className="size-4" />
            <span>Conversational AI Diagnostics</span>
          </CommandItem>

          <CommandItem onSelect={() => runCommand(() => navigate("/billing"))}>
            <CreditCard className="size-4" />
            <span>Billing & Invoices</span>
          </CommandItem>

          <CommandItem onSelect={() => runCommand(() => navigate("/plans"))}>
            <Layers className="size-4" />
            <span>Subscription Plans</span>
          </CommandItem>
        </CommandGroup>

        {user?.role === "ADMIN" && (
          <CommandGroup heading="Administration">
            <CommandItem onSelect={() => runCommand(() => navigate("/crm"))}>
              <Users className="size-4" />
              <span>CRM & Client Leads</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/financial"))}>
              <Activity className="size-4" />
              <span>Financial Dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/admin/users"))}>
              <Shield className="size-4" />
              <span>User & Role Management</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/admin/api-status"))}>
              <Activity className="size-4" />
              <span>API Gateway Health</span>
            </CommandItem>
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading="System & Theme">
          <CommandItem onSelect={() => runCommand(() => navigate("/dev/style-guide"))}>
            <Palette className="size-4" />
            <span>ElevenLabs Style Guide Showcase</span>
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>

          <CommandItem onSelect={() => runCommand(() => navigate("/help"))}>
            <HelpCircle className="size-4" />
            <span>Help Center & Knowledge Base</span>
          </CommandItem>

          <CommandItem
            onSelect={() =>
              runCommand(() => setTheme(theme === "dark" ? "light" : "dark"))
            }
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            <span>Toggle Theme ({theme === "dark" ? "Light Mode" : "Dark Mode"})</span>
            <CommandShortcut>⌘M</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
