import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Ticket as TicketIcon, CreditCard, HelpCircle, LayoutDashboard, Plus, BookOpen, Bell, User, Download } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ticketService, type Ticket } from "@/services/ticketService";
import { invoiceService, type Invoice } from "@/services/invoiceService";
import { faqsEn, faqsEs, type FAQ } from "@/lib/faqs";

export interface PageLink {
  title: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  state?: unknown;
}

export interface FlatItem {
  type: "page" | "ticket" | "invoice" | "faq";
  title: string;
  subtitle?: string;
  badge?: string;
  badgeClass?: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}

const statusColorMap: Record<string, string> = {
  OPEN: "bg-primary/10 text-primary",
  IN_PROGRESS: "bg-secondary text-secondary-foreground",
  AWAITING_PAYMENT: "bg-secondary text-secondary-foreground",
  RESOLVED: "bg-primary/10 text-primary",
  CLOSED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-destructive/10 text-destructive",
};

const invoiceStatusColorMap: Record<string, string> = {
  PENDING: "bg-warning/10 text-warning",
  PAID: "bg-success/10 text-success",
  OVERDUE: "bg-error/10 text-error",
};

export function useTopNav() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [results, setResults] = useState<{
    pages: PageLink[];
    tickets: Ticket[];
    invoices: Invoice[];
    faqs: FAQ[];
  }>({
    pages: [],
    tickets: [],
    invoices: [],
    faqs: [],
  });

  const settingsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const invoicesCacheRef = useRef<Invoice[] | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const faqSearchIndexRef = useRef<Array<FAQ & { searchText: string }>>([]);

  // Pre-index FAQs when language changes
  useEffect(() => {
    const faqsList = i18n.language === "es_DO" ? faqsEs : faqsEn;
    faqSearchIndexRef.current = faqsList.map((f) => ({
      ...f,
      searchText: (f.question + " " + f.answer).toLowerCase(),
    }));
  }, [i18n.language]);

  // Prefetch invoices once on search activation to cache them locally
  const prefetchInvoices = useCallback(async () => {
    if (invoicesCacheRef.current || !(user?.role === "CLIENT" || user?.role === "ADMIN")) return;
    try {
      const res = await invoiceService.getAll(1, 100);
      invoicesCacheRef.current = res.data;
    } catch (err) {
      console.error("Failed to prefetch invoices:", err);
    }
  }, [user?.role]);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(target)) {
        setShowSettingsMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Abort controller cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Reset selection index when search query or dropdown open state changes
  useEffect(() => {
     
    setSelectedIndex(0);
  }, [searchQuery, isOpen]);

  // Page links helper by role
  const getPagesForRole = useCallback((): PageLink[] => {
    const pages: PageLink[] = [];
    if (!user) {
      pages.push(
        { title: t("footer.terms"), path: "/terms", icon: BookOpen },
        { title: t("footer.privacy"), path: "/privacy", icon: BookOpen }
      );
      return pages;
    }

    if (user.role === "CLIENT") {
      pages.push(
        { title: t("nav.dashboard"), path: "/dashboard", icon: LayoutDashboard },
        { title: t("nav.tickets"), path: "/tickets", icon: TicketIcon },
        { title: t("tickets.newTicket"), path: "/tickets", state: { openCreateModal: true }, icon: Plus },
        { title: t("nav.plans"), path: "/plans", icon: BookOpen },
        { title: t("nav.billing"), path: "/billing", icon: CreditCard },
        { title: t("nav.resources"), path: "/resources", icon: Download },
        { title: t("nav.profile"), path: "/profile", icon: User },
        { title: t("nav.help"), path: "/help", icon: HelpCircle },
        { title: t("nav.notificationPreferences"), path: "/notifications/preferences", icon: Bell }
      );
    } else if (user.role === "TECHNICIAN") {
      pages.push(
        { title: t("nav.dashboard"), path: "/tech/dashboard", icon: LayoutDashboard },
        { title: t("nav.tickets"), path: "/tickets", icon: TicketIcon },
        { title: t("nav.profile"), path: "/profile", icon: User },
        { title: t("nav.help"), path: "/help", icon: HelpCircle },
        { title: t("nav.notificationPreferences"), path: "/notifications/preferences", icon: Bell }
      );
    } else if (user.role === "ADMIN") {
      pages.push(
        { title: t("nav.dashboard"), path: "/dashboard", icon: LayoutDashboard },
        { title: t("nav.tickets"), path: "/tickets", icon: TicketIcon },
        { title: t("nav.plans"), path: "/plans", icon: BookOpen },
        { title: t("nav.billing"), path: "/billing", icon: CreditCard },
        { title: t("nav.resources"), path: "/resources", icon: Download },
        { title: t("nav.profile"), path: "/profile", icon: User },
        { title: t("nav.help"), path: "/help", icon: HelpCircle },
        { title: t("nav.notificationPreferences"), path: "/notifications/preferences", icon: Bell }
      );
    }
    return pages;
  }, [user, t]);

  // Search logic (debounced with request cancellation and local indexes/caches)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults((prev) =>
        prev.pages.length || prev.tickets.length || prev.invoices.length || prev.faqs.length
          ? { pages: [], tickets: [], invoices: [], faqs: [] }
          : prev
      );
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const delayDebounceFn = setTimeout(async () => {
      try {
        const query = searchQuery.trim();
        const cleanQuery = query.startsWith('#') ? query.slice(1).trim() : query;
        const queryLower = (cleanQuery || query).toLowerCase();

        // Local search for FAQs using the pre-computed index
        const matchedFaqs = faqSearchIndexRef.current
          .filter((f) => f.searchText.includes(queryLower))
          .slice(0, 4);

        // Local search for Pages
        const allPages = getPagesForRole();
        const matchedPages = allPages.filter((p) =>
          p.title.toLowerCase().includes(queryLower)
        );

        // API search for Tickets with abort signal (supports chunks of ID like "ce9d703a")
        let matchedTickets: Ticket[] = [];
        try {
          const ticketRes = await ticketService.getAll(
            { search: cleanQuery || query, limit: 5 },
            { signal: controller.signal }
          );
          matchedTickets = ticketRes.data;
        } catch (err) {
          const error = err as { name?: string };
          if (error.name !== "CanceledError" && error.name !== "AbortError") {
            console.error("Error searching tickets:", err);
          }
        }

        // Local search for Invoices using the cached list (instant lookup)
        let matchedInvoices: Invoice[] = [];
        if (user?.role === "CLIENT" || user?.role === "ADMIN") {
          if (invoicesCacheRef.current) {
            matchedInvoices = invoicesCacheRef.current.filter(
              (inv) =>
                (inv.id && inv.id.toLowerCase().includes(queryLower)) ||
                (inv.invoice_number && inv.invoice_number.toLowerCase().includes(queryLower)) ||
                (inv.total != null && String(inv.total).toLowerCase().includes(queryLower))
            );
          }
        }

        setResults({
          pages: matchedPages,
          tickets: matchedTickets,
          invoices: matchedInvoices,
          faqs: matchedFaqs,
        });
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(delayDebounceFn);
    };
  }, [searchQuery, user?.role, getPagesForRole]);

  // Flattened list for keyboard navigation and rendering
  const flatItems = useMemo((): FlatItem[] => {
    const flat: FlatItem[] = [];

    // If query is empty, display Quick Links (all pages)
    if (!searchQuery.trim()) {
      const allPages = getPagesForRole();
      allPages.forEach((p) => {
        flat.push({
          type: "page",
          title: p.title,
          subtitle: t("topNav.quickLink") || "Quick Action",
          icon: p.icon,
          onClick: () => {
            navigate(p.path, { state: p.state });
            setIsOpen(false);
            setSearchQuery("");
          },
        });
      });
      return flat;
    }

    // Grouped Results
    results.pages.forEach((p) => {
      flat.push({
        type: "page",
        title: p.title,
        subtitle: t("topNav.navigation") || "Navigation Page",
        icon: p.icon,
        onClick: () => {
          navigate(p.path, { state: p.state });
          setIsOpen(false);
          setSearchQuery("");
        },
      });
    });

    results.tickets.forEach((tick) => {
      flat.push({
        type: "ticket",
        title: tick.title,
        subtitle: `#${tick.id.slice(0, 8)} • ${tick.category}`,
        badge: tick.status,
        badgeClass: statusColorMap[tick.status] || "bg-muted text-muted-foreground",
        icon: TicketIcon,
        onClick: () => {
          navigate(`/tickets/${tick.id}`);
          setIsOpen(false);
          setSearchQuery("");
        },
      });
    });

    results.invoices.forEach((inv) => {
      flat.push({
        type: "invoice",
        title: inv.invoice_number,
        subtitle: `$${Number(inv.total).toFixed(2)} • ${new Date(inv.invoice_date).toLocaleDateString()}`,
        badge: inv.status,
        badgeClass: invoiceStatusColorMap[inv.status] || "bg-muted text-muted-foreground",
        icon: CreditCard,
        onClick: () => {
          navigate("/billing", { state: { invoiceId: inv.id } });
          setIsOpen(false);
          setSearchQuery("");
        },
      });
    });

    results.faqs.forEach((faq) => {
      flat.push({
        type: "faq",
        title: faq.question,
        subtitle: faq.answer.slice(0, 80) + "...",
        icon: HelpCircle,
        onClick: () => {
          navigate("/help", { state: { expandFaqId: faq.id } });
          setIsOpen(false);
          setSearchQuery("");
        },
      });
    });

    return flat;
  }, [searchQuery, results, getPagesForRole, navigate, t]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) {
        if (e.key === "ArrowDown" || e.key === "Enter") {
          setIsOpen(true);
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (flatItems.length ? (prev + 1) % flatItems.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (flatItems.length ? (prev - 1 + flatItems.length) % flatItems.length : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (flatItems[selectedIndex]) {
          flatItems[selectedIndex].onClick();
        }
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    },
    [isOpen, flatItems, selectedIndex]
  );

  return {
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
  };
}
