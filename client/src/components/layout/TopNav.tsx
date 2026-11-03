import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Settings,
  LogOut,
  Search,
  CreditCard,
  User as UserIcon,
  Bell,
  HelpCircle,
  Loader2,
  Navigation,
  Sun,
  Moon,
  Laptop,
} from "lucide-react";
import { useTopNav, type FlatItem } from "@/hooks/useTopNav";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/shared/useTheme";
import { TopNavBreadcrumbs } from "@/components/layout/TopNavBreadcrumbs";
import { FeedbackDialog } from "@/components/layout/FeedbackDialog";
import { AiCopilotDrawer } from "@/components/layout/AiCopilotDrawer";
import { FolderMenu } from "@/components/layout/FolderMenu";
import { UserPresenceAvatar } from "@/components/shared/UserPresenceAvatar";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";

// 1. SearchBar Sub-component
interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isLoading: boolean;
  selectedIndex: number;
  flatItems: FlatItem[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  prefetchInvoices: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  t: (key: string) => string;
}

/**
 * Pill-shaped global search bar with keyboard shortcut hints and grouped quick-action dropdown.
 *
 * @param props - SearchBar props
 * @returns JSX.Element
 */
export function SearchBar({
  searchQuery,
  setSearchQuery,
  isOpen,
  setIsOpen,
  isLoading,
  selectedIndex,
  flatItems,
  containerRef,
  prefetchInvoices,
  handleKeyDown,
  t,
}: SearchBarProps) {
  return (
    <div ref={containerRef} className="hidden md:flex items-center relative">
      <div className="relative flex items-center">
        <Search className="absolute left-2.5 size-3.5 text-muted-foreground/70 pointer-events-none" />
        <input
          id="topnav-search"
          placeholder={t("topNav.search")}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
            prefetchInvoices();
          }}
          onFocus={() => {
            setIsOpen(true);
            prefetchInvoices();
          }}
          onKeyDown={handleKeyDown}
          className="h-7 w-56 lg:w-64 rounded-full border border-border/70 bg-background/50 pl-8 pr-12 text-xs placeholder:text-muted-foreground/70 focus:outline-hidden focus:ring-1 focus:ring-ring focus:border-ring transition-all shadow-2xs"
        />
        <div className="absolute right-2 flex items-center gap-0.5 pointer-events-none">
          <kbd className="inline-flex h-4 select-none items-center rounded border border-border/70 bg-muted/70 px-1 font-mono text-[9px] font-medium text-muted-foreground">⌘</kbd>
          <kbd className="inline-flex h-4 select-none items-center rounded border border-border/70 bg-muted/70 px-1 font-mono text-[9px] font-medium text-muted-foreground">K</kbd>
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-80 lg:w-96 bg-popover/95 backdrop-blur-md border border-border/80 rounded-xl shadow-2xl overflow-hidden z-50 text-popover-foreground select-none max-h-96 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">{t("ticketDetail.uploading") || "Searching..."}</span>
            </div>
          ) : flatItems.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground flex flex-col items-center justify-center gap-1">
              <HelpCircle className="h-6 w-6 opacity-50" />
              <p className="text-xs font-medium">
                {t("topNav.noResults") || "No results found for"} "{searchQuery}"
              </p>
            </div>
          ) : (
            <div className="p-1">
              {flatItems.map((item, idx) => {
                const showHeader = idx === 0 || flatItems[idx - 1].type !== item.type;
                const IconComponent = item.icon;
                const isSelected = idx === selectedIndex;

                const headerTitle = !searchQuery.trim()
                  ? (t("topNav.quickLinks") || "Quick Actions")
                  : (item.type === "page" ? t("topNav.pages") || "Pages & Actions" :
                     item.type === "ticket" ? t("topNav.tickets") || "Tickets" :
                     item.type === "invoice" ? t("topNav.invoices") || "Invoices" :
                     t("topNav.faqs") || "FAQs");

                return (
                  <div key={idx}>
                    {showHeader && (
                      <div className="px-2.5 py-1 text-[10px] font-medium tracking-normal text-muted-foreground/70">
                        {headerTitle}
                      </div>
                    )}
                    <button
                      onClick={item.onClick}
                      className={`w-full text-left px-2.5 py-1.5 flex items-center justify-between transition-colors rounded-lg text-xs cursor-pointer ${
                        isSelected
                          ? "bg-muted/80 text-foreground font-medium"
                          : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <IconComponent className="h-3.5 w-3.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate leading-tight">{item.title}</p>
                          {item.subtitle && (
                            <p className="text-[10px] opacity-70 truncate mt-0.5 leading-none">{item.subtitle}</p>
                          )}
                        </div>
                      </div>
                      {item.badge && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-medium uppercase shrink-0 ${item.badgeClass}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 2. SettingsMenu Sub-component
interface SettingsMenuProps {
  showSettingsMenu: boolean;
  setShowSettingsMenu: (show: boolean) => void;
  settingsRef: React.RefObject<HTMLDivElement | null>;
  userRole: string;
  navigate: (path: string) => void;
  t: (key: string) => string;
}

/**
 * Dropdown menu for role-based account settings.
 *
 * @param props - SettingsMenu props
 * @returns JSX.Element
 */
export function SettingsMenu({
  showSettingsMenu,
  setShowSettingsMenu,
  settingsRef,
  userRole,
  navigate,
  t,
}: SettingsMenuProps) {
  return (
    <div className="relative" ref={settingsRef}>
      <button
        onClick={() => setShowSettingsMenu(!showSettingsMenu)}
        className={`p-1.5 transition-colors rounded-lg cursor-pointer ${
          showSettingsMenu
            ? "bg-muted/80 text-foreground"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        }`}
        aria-label={t("nav.settings")}
      >
        <Settings className="h-4 w-4" />
      </button>

      {showSettingsMenu && (
        <div className="absolute right-0 top-10 w-48 bg-popover/95 backdrop-blur-md border border-border/80 rounded-xl shadow-2xl p-1 animate-in fade-in-0 zoom-in-95 z-50">
          <div className="px-2.5 py-1.5 border-b border-border/60 mb-1">
            <p className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">
              {t("nav.account")}
            </p>
          </div>
          {[
            { to: "/profile", icon: UserIcon, labelKey: "profile", roles: ["CLIENT", "TECHNICIAN", "ADMIN"] },
            { to: "/notifications/preferences", icon: Bell, labelKey: "notificationPreferences", roles: ["CLIENT", "TECHNICIAN", "ADMIN"] },
            { to: "/plans", icon: CreditCard, labelKey: "plans", roles: ["CLIENT", "ADMIN"] },
            { to: "/billing", icon: CreditCard, labelKey: "billing", roles: ["CLIENT", "ADMIN"] },
          ]
            .filter((item) => item.roles.includes(userRole))
            .map((item) => (
              <button
                key={item.to}
                onClick={() => {
                  navigate(item.to);
                  setShowSettingsMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors text-xs cursor-pointer text-left font-medium"
              >
                <item.icon className="h-3.5 w-3.5" />
                <span>{t(`nav.${item.labelKey}`)}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

// 3. UserMenu Sub-component
interface UserMenuProps {
  showUserMenu: boolean;
  setShowUserMenu: (show: boolean) => void;
  userMenuRef: React.RefObject<HTMLDivElement | null>;
  user: { id?: string; name?: string; email?: string; role?: string; avatarUrl?: string | null } | null;
  logout: () => void;
  t: (key: string) => string;
}

/**
 * User account profile menu with avatar presence ring and theme mode toggle.
 *
 * @param props - UserMenu props
 * @returns JSX.Element
 */
export function UserMenu({
  showUserMenu,
  setShowUserMenu,
  userMenuRef,
  user,
  logout,
  t,
}: UserMenuProps) {
  const { theme, setTheme } = useTheme();
  const connectionStatus = useConnectionStatus();

  if (!user) {
    return (
      <Link
        to="/login"
        className="text-xs font-semibold px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
      >
        {t("login.signIn")}
      </Link>
    );
  }

  return (
    <div className="relative" ref={userMenuRef}>
      <button
        onClick={() => setShowUserMenu(!showUserMenu)}
        className="cursor-pointer rounded-full p-0 flex items-center justify-center"
        aria-label={user?.name || "User menu"}
      >
        <UserPresenceAvatar
          user={user}
          status={connectionStatus}
          showTooltip={!showUserMenu}
        />
      </button>

      {showUserMenu && (
        <div className="absolute right-0 top-9 w-56 bg-popover/95 backdrop-blur-md border border-border/80 rounded-xl shadow-2xl p-1 animate-in fade-in-0 zoom-in-95 z-50">
          <div className="px-2.5 py-2 border-b border-border/60 mb-1">
            <p className="text-xs font-semibold text-foreground truncate">{user?.name}</p>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{user?.email}</p>
            {user?.id && (
              <span
                title={user.id}
                className="inline-block mt-1.5 px-1.5 py-0.5 bg-muted text-foreground border border-border/60 text-[8px] font-mono font-medium rounded truncate max-w-full"
              >
                {user.id}
              </span>
            )}
          </div>

          {/* Real-time Connection Status Indicator Row */}
          <div className="px-2.5 py-1.5 border-b border-border/60 mb-1 flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">
              {connectionStatus === "connected"
                ? t("presence.syncActive")
                : connectionStatus === "reconnecting"
                ? t("presence.syncReconnecting")
                : t("presence.syncOffline")}
            </span>
            <span className="inline-flex items-center gap-1 font-medium">
              <span
                className={`size-1.5 rounded-full ${
                  connectionStatus === "connected"
                    ? "bg-[#00c853]"
                    : connectionStatus === "reconnecting"
                    ? "bg-amber-500 animate-pulse"
                    : "bg-neutral-400"
                }`}
              />
              <span className="capitalize">{connectionStatus}</span>
            </span>
          </div>

          {/* Theme Mode Switcher */}
          <div className="px-2.5 py-1.5 border-b border-border/60 mb-1">
            <p className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-1.5">
              {t("topNav.theme") || "Theme"}
            </p>
            <div className="grid grid-cols-3 gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/60">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex items-center justify-center gap-1 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                  theme === "light"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sun className="size-3" />
                <span>{t("topNav.themeLight") || "Light"}</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex items-center justify-center gap-1 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                  theme === "dark"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Moon className="size-3" />
                <span>{t("topNav.themeDark") || "Dark"}</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme("system")}
                className={`flex items-center justify-center gap-1 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                  theme === "system"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Laptop className="size-3" />
                <span>{t("topNav.themeSystem") || "Auto"}</span>
              </button>
            </div>
          </div>

          <Link
            to="/profile"
            onClick={() => setShowUserMenu(false)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors text-xs cursor-pointer text-left font-medium"
          >
            <UserIcon className="h-3.5 w-3.5" />
            <span>{t("nav.profile")}</span>
          </Link>

          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-destructive hover:bg-destructive/10 transition-colors text-xs rounded-lg cursor-pointer text-left font-medium mt-1"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{t("topNav.signOut")}</span>
          </button>
        </div>
      )}
    </div>
  );
}

// 4. Redesigned Premium SaaS TopNav Component
/**
 * Main Top Navigation Bar matching the modernized reference layout.
 * Includes dynamic breadcrumb trail, pill search with ⌘K, quick action pills,
 * folder quick-access menu, notification bell with blue indicator, and user menu.
 *
 * @returns JSX.Element
 */
export function TopNav() {
  const {
    t,
    user,
    logout,
    navigate,
    showUserMenu,
    setShowUserMenu,
    searchQuery,
    setSearchQuery,
    isOpen,
    setIsOpen,
    isLoading,
    selectedIndex,
    flatItems,
    userMenuRef,
    containerRef,
    prefetchInvoices,
    handleKeyDown,
  } = useTopNav();

  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  return (
    <header className="flex justify-between items-center w-full px-4 md:px-6 h-11 bg-background/80 backdrop-blur-md border-b border-border/80 sticky top-0 z-30 transition-colors">
      {/* Left: Sidebar Trigger & Dynamic Breadcrumbs */}
      <div className="flex items-center gap-2.5">
        <SidebarTrigger className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer transition-colors" />
        <TopNavBreadcrumbs />
      </div>

      {/* Center & Right Section */}
      <div className="flex items-center gap-2">
        {/* Global Search Bar with ⌘K Badge */}
        <SearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          isLoading={isLoading}
          selectedIndex={selectedIndex}
          flatItems={flatItems}
          containerRef={containerRef}
          prefetchInvoices={prefetchInvoices}
          handleKeyDown={handleKeyDown}
          t={t}
        />

        {/* Action Pills: Hidden on mobile viewports (< md) */}
        <div className="hidden md:flex items-center gap-1.5">
          <Button
            variant="outline"
            size="xs"
            onClick={() => setIsFeedbackOpen(true)}
            className="h-7 rounded-full px-3 text-xs font-normal border-border/70 hover:bg-muted/60 text-foreground cursor-pointer shadow-2xs"
          >
            {t("topNav.feedback")}
          </Button>

          <Button
            variant="outline"
            size="xs"
            onClick={() => navigate("/helpdesk/kb")}
            className="h-7 rounded-full px-3 text-xs font-normal border-border/70 hover:bg-muted/60 text-foreground cursor-pointer shadow-2xs"
          >
            {t("topNav.docs")}
          </Button>

          <Button
            variant="outline"
            size="xs"
            onClick={() => setIsCopilotOpen(true)}
            className="h-7 rounded-full px-3 text-xs font-normal border-border/70 hover:bg-muted/60 text-foreground flex items-center gap-1.5 cursor-pointer shadow-2xs group"
          >
            <Navigation className="size-3 text-sky-500 fill-sky-500 rotate-45 group-hover:scale-110 transition-transform" />
            <span>{t("topNav.ask")}</span>
          </Button>

          <FolderMenu />
        </div>

        {/* Real-time Notifications Bell with blue dot */}
        {user && <NotificationBell />}

        {/* User Account Avatar with status presence ring */}
        <UserMenu
          showUserMenu={showUserMenu}
          setShowUserMenu={setShowUserMenu}
          userMenuRef={userMenuRef}
          user={user}
          logout={logout}
          t={t}
        />
      </div>

      {/* Overlay Modals & Drawers */}
      <FeedbackDialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen} />
      <AiCopilotDrawer open={isCopilotOpen} onOpenChange={setIsCopilotOpen} />
    </header>
  );
}
