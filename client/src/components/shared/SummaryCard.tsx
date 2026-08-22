import React from 'react';

export interface SummaryCardProps {
  icon: React.ReactNode;
  badge?: React.ReactNode;
  title: React.ReactNode;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  footer?: React.ReactNode;
}

export function SummaryCard({ icon, badge, title, value, subtitle, footer }: SummaryCardProps) {
  return (
    <div className="group rounded-lg border border-zinc-200 bg-white p-3.5 shadow-xs transition-all duration-200 hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 flex flex-col justify-between min-h-[120px]">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider truncate">
            {title}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {badge && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                {badge}
              </span>
            )}
            <div className="rounded-md bg-zinc-50 p-1.5 text-zinc-600 transition-colors group-hover:bg-zinc-100 dark:bg-zinc-900/50 dark:text-zinc-400 dark:group-hover:bg-zinc-900">
              {icon}
            </div>
          </div>
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <div className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {value}
          </div>
        </div>
        {subtitle && <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{subtitle}</div>}
      </div>
      {footer && (
        <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-900">
          <div className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono">{footer}</div>
        </div>
      )}
    </div>
  );
}

export default SummaryCard;
