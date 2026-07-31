interface SummaryCardProps {
  icon: React.ReactNode;
  badge?: React.ReactNode;
  title: React.ReactNode;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  footer?: React.ReactNode;
}

export default function SummaryCard({ icon, badge, title, value, subtitle, footer }: SummaryCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 p-3.5 rounded-lg flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all duration-200 hover:border-zinc-300 dark:hover:border-zinc-700/80 hover:shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] min-h-[120px]">
      <div>
        <div className="flex justify-between items-center mb-2">
          <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800/60 rounded">{icon}</div>
          {badge && (
            <span className="bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700/80 text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded border">
              {badge}
            </span>
          )}
        </div>
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{title}</span>
        <h4 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mt-0.5">{value}</h4>
        {subtitle && <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{subtitle}</div>}
      </div>
      {footer && (
        <div className="mt-4 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
          <div className="text-xs text-zinc-400 dark:text-zinc-500 font-normal">{footer}</div>
        </div>
      )}
    </div>
  );
}
