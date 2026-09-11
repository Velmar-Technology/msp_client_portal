import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { TicketChatter, type TicketChatterProps } from './TicketChatter';

export interface TicketChatterDrawerProps extends TicketChatterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketTitle?: string;
  ticketId?: string;
}

/**
 * Slide-over Sheet drawer for Ticket Chatter on mobile, tablet, and compact viewports.
 * Synchronizes with URL query parameter ?chat=open.
 */
export const TicketChatterDrawer: React.FC<TicketChatterDrawerProps> = ({
  open,
  onOpenChange,
  ticketTitle,
  ticketId,
  ...chatterProps
}) => {
  const { t } = useTranslation();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl p-0 gap-0 border-l border-border bg-card flex flex-col h-full shadow-2xl"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>
            {t('ticketDetail.chatterTitle')} - {ticketTitle || ticketId}
          </SheetTitle>
        </SheetHeader>

        <TicketChatter
          {...chatterProps}
          isCollapsible={false}
          className="border-none rounded-none shadow-none h-full"
        />
      </SheetContent>
    </Sheet>
  );
};
