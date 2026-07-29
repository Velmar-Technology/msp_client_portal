import React from "react";
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
import { Input } from "@/components/ui/input";

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
      <div className="relative w-full">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
        <Input
          id="topnav-search"
          type="text"
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
          className="w-full pl-8 pr-3 h-8 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm text-xs placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors text-zinc-900 dark:text-zinc-100"
        />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-sm shadow-xl overflow-hidden z-50 text-zinc-900 dark:text-zinc-100 select-none max-h-[380px] overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center py-6 gap-2 text-zinc-500 dark:text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">{t("ticketDetail.uploading") || "Searching..."}</span>
            </div>
          ) : flatItems.length === 0 ? (
            <div className="py-6 text-center text-zinc-400 dark:text-zinc-500 flex flex-col items-center justify-center gap-1">
              <HelpCircle className="h-6 w-6 opacity-50" />
              <p className="text-xs font-medium">
                {t("topNav.noResults") || "No results found for"} "{searchQuery}"
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
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
                      <div className="px-3 py-1.5 text-[9px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 border-y border-zinc-100 dark:border-zinc-800">
                        {headerTitle}
                      </div>
                    )}
                    <button
                      onClick={item.onClick}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors border-l-2 text-xs ${
                        isSelected
                          ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 text-zinc-950 dark:text-zinc-50"
                          : "border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
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
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase shrink-0 ${item.badgeClass}`}>
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
        className={`p-1.5 transition-colors rounded-sm cursor-pointer ${
          showSettingsMenu
            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
        }`}
      >
        <Settings className="h-4 w-4" />
      </button>

      {showSettingsMenu && (
        <div className="absolute right-0 top-9 w-48 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-sm shadow-lg py-1 animate-fade-in z-50">
          <div className="px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800">
            <p className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
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
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors text-xs cursor-pointer text-left font-medium"
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
  user: { name?: string; email?: string; role?: string; avatarUrl?: string | null } | null;
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
  return (
    <div className="relative" ref={userMenuRef}>
      <button
        onClick={() => setShowUserMenu(!showUserMenu)}
        className="flex items-center gap-1.5 p-1 rounded-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
      >
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-6.5 h-6.5 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
          />
        ) : (
          <div className="w-6.5 h-6.5 bg-zinc-900 dark:bg-zinc-100 rounded-full flex items-center justify-center border border-zinc-800 dark:border-zinc-200">
            <span className="text-white dark:text-zinc-900 text-[10px] font-bold">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </span>
          </div>
        )}
      </button>

      {showUserMenu && (
        <div className="absolute right-0 top-9 w-52 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-sm shadow-lg py-1 animate-fade-in z-50">
          <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 mb-1">
            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{user?.name}</p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{user?.email}</p>
            <span className="inline-block mt-1.5 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 text-[8px] font-mono font-bold rounded-sm uppercase">
              {user?.role}
            </span>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 transition-colors text-xs cursor-pointer text-left font-semibold"
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
    <header className="flex justify-between items-center w-full px-4 md:px-8 h-12 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-30 transition-colors">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 h-8 w-8 cursor-pointer rounded-sm transition-colors" />
        <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-50 md:hidden" style={{ fontFamily: "var(--font-heading)" }}>
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
        <NotificationBell />

        {/* Settings Dropdown */}
        <SettingsMenu
          showSettingsMenu={showSettingsMenu}
          setShowSettingsMenu={setShowSettingsMenu}
          settingsRef={settingsRef}
          userRole={user?.role || "CLIENT"}
          navigate={navigate}
          t={t}
        />

        {/* User Profile Dropdown */}
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
