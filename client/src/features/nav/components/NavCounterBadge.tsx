import { useTranslation } from 'react-i18next';

interface NavCounterBadgeProps {
  count: number;
}

/**
 * Compact numeric pill displayed next to a sidebar nav item.
 * Hides under icon collapse; caps display at 99+.
 */
export function NavCounterBadge({ count }: NavCounterBadgeProps) {
  const { t } = useTranslation();

  if (count <= 0) return null;

  return (
    <span
      className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold tabular-nums group-data-[collapsible=icon]:hidden shrink-0"
      aria-label={t('nav.counters.ariaLabel', '{{count}} new items', { count })}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
