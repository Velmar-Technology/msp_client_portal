import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import type { FlatItem } from "@/hooks/useTopNav";

interface TopNavCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isLoading: boolean;
  flatItems: FlatItem[];
  prefetchInvoices: () => void;
}

/**
 * Command Palette modal triggered by the header search bar or Cmd+K / Ctrl+K.
 *
 * @param props.open - Whether the command palette is open.
 * @param props.onOpenChange - Setter for dialog open state.
 * @param props.searchQuery - Current search query text.
 * @param props.setSearchQuery - Setter for search query text.
 * @param props.isLoading - Whether an async search request is executing.
 * @param props.flatItems - Pre-filtered and grouped search items.
 * @param props.prefetchInvoices - Invoices prefetch callback.
 * @returns JSX.Element
 */
export function TopNavCommandPalette({
  open,
  onOpenChange,
  searchQuery,
  setSearchQuery,
  isLoading,
  flatItems,
  prefetchInvoices,
}: TopNavCommandPaletteProps) {
  const { t } = useTranslation();

  // Register global Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
        prefetchInvoices();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange, prefetchInvoices]);

  const pageItems = flatItems.filter((i) => i.type === "page");
  const ticketItems = flatItems.filter((i) => i.type === "ticket");
  const invoiceItems = flatItems.filter((i) => i.type === "invoice");
  const faqItems = flatItems.filter((i) => i.type === "faq");

  return (
    <CommandDialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (nextOpen) prefetchInvoices();
      }}
      title={t("topNav.quickLinks") || "Command Palette"}
      description={t("topNav.search") || "Search portal resources..."}
    >
      <CommandInput
        placeholder={t("topNav.searchPlaceholder") || "Search everything..."}
        value={searchQuery}
        onValueChange={(val) => {
          setSearchQuery(val);
          prefetchInvoices();
        }}
      />

      <CommandList>
        {isLoading ? (
          <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">{t("ticketDetail.uploading") || "Searching..."}</span>
          </div>
        ) : flatItems.length === 0 ? (
          <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">
            {t("topNav.noResults")} "{searchQuery}"
          </CommandEmpty>
        ) : (
          <>
            {pageItems.length > 0 && (
              <CommandGroup heading={!searchQuery.trim() ? t("topNav.quickLinks") : t("topNav.pages")}>
                {pageItems.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={`page-${idx}-${item.title}`}
                      onSelect={() => {
                        item.onClick();
                        onOpenChange(false);
                      }}
                      className="flex items-center justify-between cursor-pointer py-2 px-2.5 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          {item.subtitle && (
                            <p className="text-[10px] text-muted-foreground truncate">{item.subtitle}</p>
                          )}
                        </div>
                      </div>
                      {item.badge && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-medium uppercase shrink-0 ${item.badgeClass}`}>
                          {item.badge}
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {ticketItems.length > 0 && (
              <CommandGroup heading={t("topNav.tickets")}>
                {ticketItems.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={`ticket-${idx}-${item.title}`}
                      onSelect={() => {
                        item.onClick();
                        onOpenChange(false);
                      }}
                      className="flex items-center justify-between cursor-pointer py-2 px-2.5 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          {item.subtitle && (
                            <p className="text-[10px] text-muted-foreground truncate">{item.subtitle}</p>
                          )}
                        </div>
                      </div>
                      {item.badge && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-medium uppercase shrink-0 ${item.badgeClass}`}>
                          {item.badge}
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {invoiceItems.length > 0 && (
              <CommandGroup heading={t("topNav.invoices")}>
                {invoiceItems.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={`invoice-${idx}-${item.title}`}
                      onSelect={() => {
                        item.onClick();
                        onOpenChange(false);
                      }}
                      className="flex items-center justify-between cursor-pointer py-2 px-2.5 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          {item.subtitle && (
                            <p className="text-[10px] text-muted-foreground truncate">{item.subtitle}</p>
                          )}
                        </div>
                      </div>
                      {item.badge && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-medium uppercase shrink-0 ${item.badgeClass}`}>
                          {item.badge}
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {faqItems.length > 0 && (
              <CommandGroup heading={t("topNav.faqs")}>
                {faqItems.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={`faq-${idx}-${item.title}`}
                      onSelect={() => {
                        item.onClick();
                        onOpenChange(false);
                      }}
                      className="flex items-center justify-between cursor-pointer py-2 px-2.5 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          {item.subtitle && (
                            <p className="text-[10px] text-muted-foreground truncate">{item.subtitle}</p>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
