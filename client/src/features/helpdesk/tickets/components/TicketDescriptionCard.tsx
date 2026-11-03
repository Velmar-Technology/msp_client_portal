import React from 'react';
import { useTranslation } from 'react-i18next';

export interface TicketDescriptionCardProps {
  description: string;
}

export const TicketDescriptionCard: React.FC<TicketDescriptionCardProps> = ({ description }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden flex flex-col">
      <div className="px-5 py-3 border-b border-border bg-muted/30 flex justify-between items-center">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider font-heading">
          {t('tickets.modalDescLabel') || 'Description'}
        </h3>
      </div>
      <div className="p-5">
        <div className="bg-muted/40 rounded-lg p-4 border border-border">
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};
