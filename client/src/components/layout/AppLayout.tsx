import { Outlet, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppSidebar } from './app-sidebar';
import { TopNav } from './TopNav';
import { SidebarProvider, SidebarInset } from '../ui/sidebar';
import { Breadcrumbs } from './Breadcrumbs';

export function AppLayout() {
  const { t } = useTranslation();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <TopNav />
        <main className="flex-1 p-5 md:px-10 md:py-8 bg-background overflow-x-hidden">
          <Breadcrumbs className="mb-6" />
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="flex flex-col md:flex-row justify-between items-center px-5 md:px-10 py-4 mt-auto bg-surface-container-lowest border-t border-outline-variant w-full gap-2">
          <span className="text-label-sm text-on-surface-variant">
            {t('footer.copyright')}
          </span>
          <div className="flex gap-6">
            <Link to="/help" className="text-label-sm text-on-surface-variant hover:text-primary transition-colors">
              {t('footer.help')}
            </Link>
            <Link to="/terms" className="text-label-sm text-on-surface-variant hover:text-primary transition-colors">
              {t('footer.terms')}
            </Link>
            <Link to="/privacy" className="text-label-sm text-on-surface-variant hover:text-primary transition-colors">
              {t('footer.privacy')}
            </Link>
          </div>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
