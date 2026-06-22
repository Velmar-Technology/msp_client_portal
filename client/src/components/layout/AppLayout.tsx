import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppSidebar } from './app-sidebar';
import { TopNav } from './TopNav';
import { SidebarProvider, SidebarInset } from '../ui/sidebar';
import { useEffect, useState } from 'react';
import { useNotificationStore } from '../../store/useNotificationStore';
import { ToastContainer } from './ToastContainer';
import { useAuth } from '../../hooks/useAuth';
import { subscriptionService } from '../../services/subscriptionService';
import type { Subscription } from '../../services/subscriptionService';
import { Shield } from 'lucide-react';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="flex flex-col md:flex-row justify-between items-center px-5 md:px-10 py-2 mt-auto bg-surface-container-lowest border-t border-outline-variant w-full gap-2">
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
  );
}

export function AppLayout() {
  const { t } = useTranslation();
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications);
  const startStream = useNotificationStore((state) => state.startStream);
  const stopStream = useNotificationStore((state) => state.stopStream);

  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Initial fetch of historical notifications
    fetchNotifications();

    // Start listening to real-time events via SSE
    startStream();

    // Clean up SSE connection when layout unmounts or user logs out
    return () => {
      stopStream();
    };
  }, [fetchNotifications, startStream, stopStream]);

  useEffect(() => {
    if (user?.role !== 'CLIENT') {
      setActiveSubscription(null);
      setHasChecked(true);
      return;
    }

    let isMounted = true;
    async function checkSub() {
      setCheckingSubscription(true);
      try {
        const subs = await subscriptionService.getAll();
        if (isMounted) {
          const active = subs.find((s) => s.status === 'ACTIVE');
          setActiveSubscription(active || null);
          setHasChecked(true);
        }
      } catch (err) {
        console.error('Failed to check active subscription in layout:', err);
      } finally {
        if (isMounted) {
          setCheckingSubscription(false);
        }
      }
    }

    checkSub();

    return () => {
      isMounted = false;
    };
  }, [user, location.pathname]);

  const isBlocked = user?.role === 'CLIENT' && hasChecked && !activeSubscription && location.pathname !== '/plans';

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <TopNav />
        <main className={`flex-1 p-5 md:px-10 md:py-5 bg-background overflow-x-hidden ${isBlocked ? 'flex items-center justify-center' : ''}`}>
          {isBlocked ? (
            <div className="max-w-md w-full bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 text-center shadow-lg animate-fade-in text-on-surface">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8" />
              </div>
              <h2 className="text-h2 font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                Active Plan Required
              </h2>
              <p className="text-body-md text-on-surface-variant mb-6">
                To access the portal, manage tickets, and request support, please subscribe to an active plan.
              </p>
              <button
                onClick={() => navigate('/plans')}
                className="w-full bg-primary text-on-primary py-3 rounded-xl text-label-md font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
              >
                Choose a Support Plan
              </button>
            </div>
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


