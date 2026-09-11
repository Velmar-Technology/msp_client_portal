import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Minus, Maximize2, Minimize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TicketChatter, type TicketChatterProps } from './TicketChatter';
import { cn } from '@/lib/utils';

export interface TicketChatterOverlayProps extends TicketChatterProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  ticketTitle?: string;
  ticketId?: string;
}

/**
 * Enterprise floating bottom-right docked overlay for Ticket Chatter.
 * Displays as a floating docked card when open (with minimize, maximize, and close controls),
 * and collapses into a floating launcher button at the bottom-right when closed.
 * Overlays page content smoothly without squeezing the primary ticket view.
 */
export const TicketChatterOverlay: React.FC<TicketChatterOverlayProps> = ({
  isOpen,
  onOpenChange,
  ticketTitle: _ticketTitle,
  ticketId: _ticketId,
  ...chatterProps
}) => {
  const { t } = useTranslation();
  const [isMaximized, setIsMaximized] = useState(false);
  const overlayRef = useRef<HTMLElement>(null);

  // Isolate mouse wheel events completely so scrolling over the chatter never affects TicketDetailPage
  useEffect(() => {
    if (!isOpen || !overlayRef.current) return;
    const el = overlayRef.current;

    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      const scrollable = el.querySelector('[data-chatter-scroll="true"]');
      if (scrollable && target && scrollable.contains(target)) {
        const { scrollTop, scrollHeight, clientHeight } = scrollable;
        const isAtTop = scrollTop <= 0 && e.deltaY < 0;
        const isAtBottom = Math.ceil(scrollTop + clientHeight) >= scrollHeight && e.deltaY > 0;
        if (isAtTop || isAtBottom) {
          e.preventDefault();
        }
        return;
      }
      // On non-scrollable areas (header, composer, tabs, borders), absorb wheel scroll
      e.preventDefault();
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [isOpen]);

  // If collapsed: Render floating bottom-right launcher button
  const content = !isOpen ? (
    <aside
      aria-label={t('ticketDetail.chatterTitle')}
      className="fixed bottom-5 right-5 z-50 sm:bottom-6 sm:right-6 animate-in fade-in-0 zoom-in-95 duration-200 pointer-events-auto"
    >
      <Button
        type="button"
        onClick={() => onOpenChange(true)}
        className="h-11 px-4.5 rounded-full shadow-2xl border border-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2.5 font-medium group ring-4 ring-primary/10 cursor-pointer"
        title={t('ticketDetail.toggleChatter')}
        aria-label={t('ticketDetail.toggleChatter')}
      >
        <MessageSquare className="w-4 h-4 transition-transform group-hover:scale-110" />
        <span className="text-xs font-semibold tracking-wide">
          {t('ticketDetail.toggleChatter')}
        </span>
        {chatterProps.responses.length > 0 && (
          <Badge
            variant="secondary"
            className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30 font-mono font-bold px-1.5 py-0.5 rounded-full text-[11px] min-w-5 h-5 flex items-center justify-center border-none"
          >
            {chatterProps.responses.length}
          </Badge>
        )}
      </Button>
    </aside>
  ) : (
    <aside
      ref={overlayRef}
      aria-label={t('ticketDetail.chatterTitle')}
      className={cn(
        'fixed z-50 shadow-2xl border border-border/80 bg-card/98 backdrop-blur-md flex flex-col overflow-hidden transition-all duration-200 ring-1 ring-black/5 dark:ring-white/10 animate-in fade-in-0 slide-in-from-bottom-5 zoom-in-95 duration-200 pointer-events-auto overscroll-contain',
        // Mobile bottom-sheet docking vs Desktop bottom-right floating card
        'bottom-0 inset-x-0 rounded-t-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:rounded-2xl sm:w-[440px] 2xl:w-[480px]',
        isMaximized
          ? 'h-[92vh] sm:h-[calc(100vh-4rem)] sm:w-[560px] 2xl:w-[620px]'
          : 'h-[580px] max-h-[85vh] sm:max-h-[calc(100vh-4rem)]'
      )}
    >
      <TicketChatter
        {...chatterProps}
        isCollapsible={false}
        className="border-none rounded-none shadow-none h-full min-h-0"
        headerActions={
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setIsMaximized((prev) => !prev)}
              className="text-muted-foreground hover:text-foreground h-6 w-6"
              title={isMaximized ? t('ticketDetail.restoreChatter') : t('ticketDetail.maximizeChatter')}
              aria-label={isMaximized ? t('ticketDetail.restoreChatter') : t('ticketDetail.maximizeChatter')}
            >
              {isMaximized ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground h-6 w-6"
              title={t('ticketDetail.collapseChatter')}
              aria-label={t('ticketDetail.collapseChatter')}
            >
              <Minus className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground h-6 w-6"
              title={t('ticketDetail.closeChatter')}
              aria-label={t('ticketDetail.closeChatter')}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        }
      />
    </aside>
  );

  if (typeof document === 'undefined') {
    return content;
  }

  return createPortal(content, document.body);
};
