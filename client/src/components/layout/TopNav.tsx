import React from "react";
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
} from "lucide-react";
import { useTopNav, type FlatItem } from "@/hooks/useTopNav";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NotificationBell } from "@/components/layout/NotificationBell";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

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
    <div ref={containerRef} className="hidden md:flex items-center flex-1 max-w-sm mx-6 relative">
      <InputGroup className="w-full bg-muted/30 border border-border/60 hover:border-border rounded-lg transition-all focus-within:border-foreground/20 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
        <InputGroupInput
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
          className="text-xs"
        />
        <InputGroupAddon>
          <Search className="size-3.5 text-muted-foreground/70" />
        </InputGroupAddon>
      </InputGroup>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-full bg-popover/95 backdrop-blur-md border border-border/80 rounded-xl shadow-2xl overflow-hidden z-50 text-popover-foreground select-none max-h-95 overflow-y-auto custom-scrollbar">
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
                      className={`w-full text-left px-2.5 py-1.5 flex items-center justify-between transition-colors rounded-lg text-xs ${
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

export function UserMenu({
  showUserMenu,
  setShowUserMenu,
  userMenuRef,
  user,
  logout,
  t,
}: UserMenuProps) {
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
        className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer"
      >
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-6.5 h-6.5 rounded-full object-cover border border-border/80"
          />
        ) : (
          <div className="w-6.5 h-6.5 bg-foreground text-background rounded-full flex items-center justify-center border border-border/80">
            <span className="text-[10px] font-bold">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </span>
          </div>
        )}
      </button>

      {showUserMenu && (
        <div className="absolute right-0 top-10 w-52 bg-popover/95 backdrop-blur-md border border-border/80 rounded-xl shadow-2xl p-1 animate-in fade-in-0 zoom-in-95 z-50">
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
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-destructive hover:bg-destructive/10 transition-colors text-xs rounded-lg cursor-pointer text-left font-medium"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{t("topNav.signOut")}</span>
          </button>
        </div>
      )}
    </div>
  );
}

// 4. Premium SaaS TopNav Component
export function TopNav() {
  const {
    t,
    user,
    logout,
    navigate,
    showUserMenu,
    setShowUserMenu,
    showSettingsMenu,
    setShowSettingsMenu,
    searchQuery,
    setSearchQuery,
    isOpen,
    setIsOpen,
    isLoading,
    selectedIndex,
    flatItems,
    settingsRef,
    userMenuRef,
    containerRef,
    prefetchInvoices,
    handleKeyDown,
  } = useTopNav();

  return (
    <header className="flex justify-between items-center w-full px-4 md:px-8 h-12 bg-background/80 backdrop-blur-md border-b border-border/80 sticky top-0 z-30 transition-colors">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer transition-colors" />
        <h2 className="text-xs font-bold text-foreground md:hidden font-heading">
          {t("topNav.portal")}
        </h2>
      </div>

      {/* Global Search Bar */}
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

      <div className="flex items-center gap-1.5">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        {user && <NotificationBell />}

        {/* Settings Dropdown */}
        {user && (
          <SettingsMenu
            showSettingsMenu={showSettingsMenu}
            setShowSettingsMenu={setShowSettingsMenu}
            settingsRef={settingsRef}
            userRole={user.role}
            navigate={navigate}
            t={t}
          />
        )}

        {/* User Profile Dropdown / Sign In Button */}
        <UserMenu
          showUserMenu={showUserMenu}
          setShowUserMenu={setShowUserMenu}
          userMenuRef={userMenuRef}
          user={user}
          logout={logout}
          t={t}
        />
      </div>
    </header>
  );
}
