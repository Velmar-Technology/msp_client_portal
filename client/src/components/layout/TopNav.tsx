import { Bell, Settings, LogOut, Search } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useState } from 'react';
import { SidebarTrigger } from '../ui/sidebar';

export function TopNav() {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="flex justify-between items-center w-full px-5 md:px-10 h-16 bg-surface-container-lowest border-b border-outline-variant sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-primary hover:bg-surface-container-low cursor-pointer" />

        <h2 className="text-h3 text-primary md:hidden" style={{ fontFamily: 'var(--font-heading)' }}>
          MSP Portal
        </h2>
      </div>

      {/* Search bar */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant opacity-50" />
          <input
            type="text"
            placeholder="Search resources..."
            className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-md placeholder:text-on-surface-variant placeholder:opacity-50 focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button className="relative p-2 text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-lg">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full" />
        </button>

        {/* Settings */}
        <button className="p-2 text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-lg">
          <Settings className="h-5 w-5" />
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-container-low transition-colors"
          >
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-on-primary text-label-sm font-bold">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </button>

          {/* Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 top-12 w-56 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg py-1 animate-fade-in">
              <div className="px-4 py-3 border-b border-outline-variant">
                <p className="text-label-md text-on-surface font-medium">{user?.name}</p>
                <p className="text-label-sm text-on-surface-variant">{user?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-secondary/10 text-secondary text-label-sm rounded">
                  {user?.role}
                </span>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-error hover:bg-error/5 transition-colors text-label-md"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
