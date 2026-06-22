import {
  Settings,
  LogOut,
  Search,
  LayoutDashboard,
  Ticket,
  Plus,
  BookOpen,
  CreditCard,
  User,
  Bell,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '../ui/sidebar';
import { ThemeToggle } from './ThemeToggle';
import { useTranslation } from 'react-i18next';
import { NotificationBell } from './NotificationBell';
import { Input } from '../ui/input';
import { ticketService } from '../../services/ticketService';
import { invoiceService } from '../../services/invoiceService';
import { faqsEn, faqsEs } from '../../lib/faqs';

const statusColorMap: Record<string, string> = {
  OPEN: 'bg-info/10 text-info',
  IN_PROGRESS: 'bg-warning/10 text-warning',
  AWAITING_PAYMENT: 'bg-warning/10 text-warning',
  RESOLVED: 'bg-success/10 text-success',
  CLOSED: 'bg-surface-container text-on-surface-variant',
  CANCELLED: 'bg-error/10 text-error',
};

const invoiceStatusColorMap: Record<string, string> = {
  PENDING: 'bg-warning/10 text-warning',
  PAID: 'bg-success/10 text-success',
  OVERDUE: 'bg-error/10 text-error',
};

interface PageLink {
  title: string;
  path: string;
  icon: React.ComponentType<any>;
  state?: any;
}

export function TopNav() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<{
    pages: PageLink[];
    tickets: any[];
    invoices: any[];
    faqs: any[];
  }>({
    pages: [],
    tickets: [],
    invoices: [],
    faqs: [],
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset selection index when search query or dropdown open state changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, isOpen]);

  // Page links helper by role
  const getPagesForRole = (): PageLink[] => {
    const pages: PageLink[] = [];
    if (!user) return pages;

    if (user.role === 'CLIENT') {
      pages.push(
        { title: t('nav.dashboard'), path: '/dashboard', icon: LayoutDashboard },
        { title: t('nav.tickets'), path: '/tickets', icon: Ticket },
        { title: t('tickets.newTicket'), path: '/tickets', state: { openCreateModal: true }, icon: Plus },
        { title: t('nav.plans'), path: '/plans', icon: BookOpen },
        { title: t('nav.billing'), path: '/billing', icon: CreditCard },
        { title: t('nav.profile'), path: '/profile', icon: User },
        { title: t('nav.help'), path: '/help', icon: HelpCircle },
        { title: t('nav.notificationPreferences'), path: '/notifications/preferences', icon: Bell }
      );
    } else if (user.role === 'TECHNICIAN') {
      pages.push(
        { title: t('nav.dashboard'), path: '/tech/dashboard', icon: LayoutDashboard },
        { title: t('nav.tickets'), path: '/tickets', icon: Ticket },
        { title: t('nav.profile'), path: '/profile', icon: User },
        { title: t('nav.help'), path: '/help', icon: HelpCircle },
        { title: t('nav.notificationPreferences'), path: '/notifications/preferences', icon: Bell }
      );
    } else if (user.role === 'ADMIN') {
      pages.push(
        { title: t('nav.dashboard'), path: '/admin/dashboard', icon: LayoutDashboard },
        { title: t('nav.tickets'), path: '/tickets', icon: Ticket },
        { title: t('nav.plans'), path: '/plans', icon: BookOpen },
        { title: t('nav.billing'), path: '/billing', icon: CreditCard },
        { title: t('nav.profile'), path: '/profile', icon: User },
        { title: t('nav.help'), path: '/help', icon: HelpCircle },
        { title: t('nav.notificationPreferences'), path: '/notifications/preferences', icon: Bell }
      );
    }
    return pages;
  };

  // Search logic (debounced)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults({ pages: [], tickets: [], invoices: [], faqs: [] });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const query = searchQuery.trim();
        const activeLang = i18n.language;
        const faqsList = activeLang === 'es_DO' ? faqsEs : faqsEn;

        // Local search for FAQs
        const matchedFaqs = faqsList
          .filter(
            (f) =>
              f.question.toLowerCase().includes(query.toLowerCase()) ||
              f.answer.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 4);

        // Local search for Pages
        const allPages = getPagesForRole();
        const matchedPages = allPages.filter((p) =>
          p.title.toLowerCase().includes(query.toLowerCase())
        );

        // API search for Tickets
        let matchedTickets: any[] = [];
        try {
          const ticketRes = await ticketService.getAll({ search: query, limit: 5 });
          matchedTickets = ticketRes.data;
        } catch (err) {
          console.error('Error searching tickets:', err);
        }

        // API search / Filter for Invoices (only if role is CLIENT or ADMIN)
        let matchedInvoices: any[] = [];
        if (user?.role === 'CLIENT' || user?.role === 'ADMIN') {
          try {
            const invoiceRes = await invoiceService.getAll(1, 50);
            matchedInvoices = invoiceRes.data.filter(
              (inv) =>
                inv.invoice_number.toLowerCase().includes(query.toLowerCase()) ||
                inv.total.toString().includes(query)
            );
          } catch (err) {
            console.error('Error searching invoices:', err);
          }
        }

        setResults({
          pages: matchedPages,
          tickets: matchedTickets,
          invoices: matchedInvoices,
          faqs: matchedFaqs,
        });
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, i18n.language, user?.role]);

  // Flattened list for keyboard navigation and rendering
  const getFlatItems = () => {
    const flat: Array<{
      type: 'page' | 'ticket' | 'invoice' | 'faq';
      title: string;
      subtitle?: string;
      badge?: string;
      badgeClass?: string;
      icon: React.ComponentType<any>;
      onClick: () => void;
    }> = [];

    // If query is empty, display Quick Links (all pages)
    if (!searchQuery.trim()) {
      const allPages = getPagesForRole();
      allPages.forEach((p) => {
        flat.push({
          type: 'page',
          title: p.title,
          subtitle: t('topNav.quickLink') || 'Quick Action',
          icon: p.icon,
          onClick: () => {
            navigate(p.path, { state: p.state });
            setIsOpen(false);
            setSearchQuery('');
          },
        });
      });
      return flat;
    }

    // Grouped Results
    results.pages.forEach((p) => {
      flat.push({
        type: 'page',
        title: p.title,
        subtitle: t('topNav.navigation') || 'Navigation Page',
        icon: p.icon,
        onClick: () => {
          navigate(p.path, { state: p.state });
          setIsOpen(false);
          setSearchQuery('');
        },
      });
    });

    results.tickets.forEach((t) => {
      flat.push({
        type: 'ticket',
        title: t.title,
        subtitle: `#${t.id.slice(0, 8)} • ${t.category}`,
        badge: t.status,
        badgeClass: statusColorMap[t.status] || 'bg-surface-container text-on-surface-variant',
        icon: Ticket,
        onClick: () => {
          navigate(`/tickets/${t.id}`);
          setIsOpen(false);
          setSearchQuery('');
        },
      });
    });

    results.invoices.forEach((inv) => {
      flat.push({
        type: 'invoice',
        title: inv.invoice_number,
        subtitle: `$${inv.total.toFixed(2)} • ${new Date(inv.invoice_date).toLocaleDateString()}`,
        badge: inv.status,
        badgeClass: invoiceStatusColorMap[inv.status] || 'bg-surface-container text-on-surface-variant',
        icon: CreditCard,
        onClick: () => {
          navigate('/billing');
          setIsOpen(false);
          setSearchQuery('');
        },
      });
    });

    results.faqs.forEach((faq) => {
      flat.push({
        type: 'faq',
        title: faq.question,
        subtitle: faq.answer.slice(0, 80) + '...',
        icon: HelpCircle,
        onClick: () => {
          navigate('/help', { state: { expandFaqId: faq.id } });
          setIsOpen(false);
          setSearchQuery('');
        },
      });
    });

    return flat;
  };

  const flatItems = getFlatItems();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (flatItems.length ? (prev + 1) % flatItems.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (flatItems.length ? (prev - 1 + flatItems.length) % flatItems.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems[selectedIndex]) {
        flatItems[selectedIndex].onClick();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <header className="flex justify-between items-center w-full px-5 md:px-10 h-16 bg-surface-container-lowest border-b border-outline-variant sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-primary hover:bg-surface-container-low cursor-pointer" />

        <h2 className="text-h3 text-primary md:hidden" style={{ fontFamily: 'var(--font-heading)' }}>
          {t('topNav.portal')}
        </h2>
      </div>

      {/* Search bar */}
      <div ref={containerRef} className="hidden md:flex items-center flex-1 max-w-md mx-8 relative">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant opacity-50" />
          <Input
            id="topnav-search"
            type="text"
            placeholder={t('topNav.search')}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            className="w-full pl-10 pr-4 py-4 bg-surface-container-low border border-outline-variant rounded-lg text-body-md placeholder:text-on-surface-variant placeholder:opacity-50 focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all text-on-surface"
          />
        </div>

        {/* Dropdown Results */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-full bg-surface-container-lowest/95 backdrop-blur-md border border-outline-variant rounded-xl shadow-2xl overflow-hidden z-50 text-on-surface select-none max-h-[420px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-on-surface-variant">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-body-md">{t('ticketDetail.uploading') || 'Searching...'}</span>
              </div>
            ) : flatItems.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant/70 flex flex-col items-center justify-center gap-2">
                <HelpCircle className="h-8 w-8 text-on-surface-variant/40" />
                <p className="text-body-md font-medium">
                  {t('topNav.noResults') || 'No results found for'} "{searchQuery}"
                </p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/10">
                {flatItems.map((item, idx) => {
                  const showHeader = idx === 0 || flatItems[idx - 1].type !== item.type;
                  const IconComponent = item.icon;
                  const isSelected = idx === selectedIndex;

                  const headerTitle = !searchQuery.trim()
                    ? (t('topNav.quickLinks') || 'Quick Actions')
                    : (item.type === 'page' ? t('topNav.pages') || 'Pages & Actions' :
                       item.type === 'ticket' ? t('topNav.tickets') || 'Tickets' :
                       item.type === 'invoice' ? t('topNav.invoices') || 'Invoices' :
                       t('topNav.faqs') || 'FAQs');

                  return (
                    <div key={idx}>
                      {showHeader && (
                        <div className="px-4 py-2 text-[10px] uppercase font-bold tracking-wider text-on-surface-variant/60 bg-surface-container-low/30 border-y border-outline-variant/25">
                          {headerTitle}
                        </div>
                      )}
                      <button
                        onClick={item.onClick}
                        className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors border-l-2 ${
                          isSelected
                            ? 'bg-primary/8 border-primary text-primary'
                            : 'border-transparent hover:bg-surface-container-low text-on-surface hover:text-primary'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-primary/10 text-primary' : 'bg-surface-container-high/50 text-on-surface-variant'}`}>
                            <IconComponent className="h-4 w-4 shrink-0" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-body-md font-semibold truncate leading-tight">{item.title}</p>
                            {item.subtitle && (
                              <p className="text-label-sm text-on-surface-variant/80 truncate mt-0.5 leading-none">{item.subtitle}</p>
                            )}
                          </div>
                        </div>
                        {item.badge && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${item.badgeClass}`}>
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

      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <NotificationBell />

        {/* Settings */}
        <button className="p-2 text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-lg cursor-pointer">
          <Settings className="h-5 w-5" />
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover border border-outline-variant"
              />
            ) : (
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-on-primary text-label-sm font-bold">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            )}
          </button>

          {/* Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 top-12 w-56 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg py-1 animate-fade-in z-50">
              <div className="px-4 py-3 border-b border-outline-variant">
                <p className="text-label-md text-on-surface font-medium">{user?.name}</p>
                <p className="text-label-sm text-on-surface-variant">{user?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-secondary/10 text-secondary text-label-sm rounded">
                  {user?.role}
                </span>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-error hover:bg-error/5 transition-colors text-label-md cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>{t('topNav.signOut')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
