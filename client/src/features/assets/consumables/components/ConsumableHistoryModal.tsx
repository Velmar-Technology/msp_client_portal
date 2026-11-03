import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { ConsumableContract } from '@shared/contracts';
import { useConsumableCheckoutsQuery } from '../api/useConsumablesQueries';

interface ConsumableHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  consumable: ConsumableContract | null;
}

export function ConsumableHistoryModal({
  isOpen,
  onClose,
  consumable,
}: ConsumableHistoryModalProps) {
  const { t } = useTranslation();
  const { data: checkouts, isLoading } = useConsumableCheckoutsQuery(consumable?.id ?? '');

  if (!consumable) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('assets.consumables.historyTitle', 'Checkout History')}</DialogTitle>
          <DialogDescription className="text-xs">
            {consumable.name} &bull; {consumable.category}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-2">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !checkouts || checkouts.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              {t('assets.consumables.noHistory', 'No checkouts recorded yet for this item.')}
            </div>
          ) : (
            <div className="divide-y divide-border/50 text-xs">
              {checkouts.map((item) => (
                <div key={item.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        -{item.quantity} units
                      </Badge>
                      <span className="text-muted-foreground text-[11px]">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-xs text-foreground">
                      {item.assignedUserName && (
                        <span>
                          <strong className="font-medium text-muted-foreground">Assigned to:</strong>{' '}
                          {item.assignedUserName}
                        </span>
                      )}
                      {item.assignedEquipmentName && (
                        <span className="ml-2">
                          <strong className="font-medium text-muted-foreground">Device:</strong>{' '}
                          {item.assignedEquipmentName}
                        </span>
                      )}
                    </div>

                    {item.notes && (
                      <p className="text-[11px] text-muted-foreground italic">
                        &quot;{item.notes}&quot;
                      </p>
                    )}
                  </div>

                  <div className="text-right text-[11px] text-muted-foreground shrink-0">
                    <span>Dispensed by</span>
                    <p className="font-medium text-foreground">{item.dispensedByName || 'Admin'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
