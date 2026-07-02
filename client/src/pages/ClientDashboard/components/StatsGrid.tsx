import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Headphones, Wrench, CloudUpload, ArrowRight } from 'lucide-react';

interface StatsGridProps {
  openTickets: number;
}

export function StatsGrid({ openTickets }: StatsGridProps) {
  const { t } = useTranslation();
  const isSpanish = t('dashboard.tableStatus') === 'Estado';

  // Support Status computed label and style
  const supportStatusText = openTickets > 0 
    ? `${openTickets} ${isSpanish ? 'ABIERTOS' : 'OPEN'}` 
    : (isSpanish ? 'TODO LIMPIO' : 'ALL CLEAR');

  const supportStatusClass = openTickets > 0
    ? 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400 dark:border-amber-500/10'
    : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/10';

  const backupTimeText = isSpanish ? 'Hace 2 horas' : '2 hours ago';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Support Status Card */}
      <div className="group bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200/60 dark:border-zinc-800/80 p-3.5 rounded-lg flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all duration-200 hover:border-zinc-300 dark:hover:border-zinc-700/80 hover:shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]">
        <div>
          <div className="flex justify-between items-center mb-2">
            <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800/60 rounded">
              <Headphones className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            </div>
            <span className={`text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded border ${supportStatusClass}`}>
              {supportStatusText}
            </span>
          </div>
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {t('dashboard.technicalSupport')}
          </span>
          <h4 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mt-0.5">
            {t('dashboard.activeTickets')}
          </h4>
        </div>
        <div className="mt-4 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
          <Link
            to="/tickets"
            className="text-xs font-medium text-zinc-900 dark:text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-100 flex items-center gap-1 transition-colors"
          >
            {t('dashboard.viewDetails')}{' '}
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* Maintenance Card */}
      <div className="bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200/60 dark:border-zinc-800/80 p-3.5 rounded-lg flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all duration-200 hover:border-zinc-300 dark:hover:border-zinc-700/80 hover:shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]">
        <div>
          <div className="flex justify-between items-center mb-2">
            <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800/60 rounded">
              <Wrench className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            </div>
            <span className="bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700/80 text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded border">
              {t('dashboard.scheduled')}
            </span>
          </div>
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {t('dashboard.maintenance')}
          </span>
          <h4 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mt-0.5">
            15 Oct 2024
          </h4>
        </div>
        <div className="mt-4 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
          <span className="text-xs text-zinc-400 dark:text-zinc-500 font-normal">
            {t('dashboard.preventiveNetworkReview')}
          </span>
        </div>
      </div>

      {/* Backups Card */}
      <div className="bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200/60 dark:border-zinc-800/80 p-3.5 rounded-lg flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all duration-200 hover:border-zinc-300 dark:hover:border-zinc-700/80 hover:shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]">
        <div>
          <div className="flex justify-between items-center mb-2">
            <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800/60 rounded">
              <CloudUpload className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            </div>
            <span className="bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700/80 text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded border">
              {t('dashboard.successful')}
            </span>
          </div>
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {t('dashboard.lastBackup')}
          </span>
          <h4 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mt-0.5">
            {backupTimeText}
          </h4>
        </div>
        <div className="mt-4 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
          <span className="text-xs text-zinc-400 dark:text-zinc-500 font-normal">
            {t('dashboard.mainDbServer')}
          </span>
        </div>
      </div>
    </div>
  );
}
