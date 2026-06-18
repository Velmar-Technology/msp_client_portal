import { Outlet } from 'react-router-dom';
import { AppSidebar } from './app-sidebar';
import { TopNav } from './TopNav';
import { SidebarProvider, SidebarInset } from '../ui/sidebar';

export function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <TopNav />
        <main className="flex-1 p-5 md:px-10 md:py-8 bg-background overflow-x-hidden">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="flex flex-col md:flex-row justify-between items-center px-5 md:px-10 py-4 mt-auto bg-surface-container-lowest border-t border-outline-variant w-full gap-2">
          <span className="text-label-sm text-on-surface-variant">
            © 2026 Velmar Technology SRL. All rights reserved.
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
      </SidebarInset>
    </SidebarProvider>
  );
}
