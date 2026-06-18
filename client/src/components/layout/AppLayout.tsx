import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { useState } from 'react';

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div
            className="absolute inset-0 bg-primary/30 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 h-full animate-slide-in">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-64 min-h-screen">
        <TopNav onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)} />

        <main className="flex-1 p-5 md:px-10 md:py-8 bg-background overflow-x-hidden">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="flex flex-col md:flex-row justify-between items-center px-5 md:px-10 py-4 mt-auto bg-surface-container-lowest border-t border-outline-variant w-full gap-2">
          <span className="text-label-sm text-on-surface-variant">
            © 2024 MSP Managed Services. All rights reserved.
          </span>
          <div className="flex gap-6">
            <a href="#" className="text-label-sm text-on-surface-variant hover:text-primary transition-colors">
              Help
            </a>
            <a href="#" className="text-label-sm text-on-surface-variant hover:text-primary transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-label-sm text-on-surface-variant hover:text-primary transition-colors">
              Privacy
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
