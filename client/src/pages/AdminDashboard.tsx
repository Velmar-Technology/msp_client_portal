import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Page } from '@/components/Page';
import {
  Headphones,
  Wrench,
  CloudUpload,
  Cloud,
  ArrowRight,
} from 'lucide-react';

export function AdminDashboard() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      PENDING: t('tickets.filterAwaitingPayment'),
      PAID: t('tickets.filterResolved'),
    };
    return map[status] || status;
  };

  return (
    <Page
      title={t('dashboard.systemOverview')}
      subtitle={t('dashboard.systemStatus')}
    >

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-6">
        
        {/* Services Summary (Spans 8 cols on desktop) */}
        <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Support Status */}
          <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex flex-col relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <Headphones className="h-6 w-6 text-secondary" />
              <span className="bg-[#F59E0B]/10 text-[#F59E0B] px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">
                {t('dashboard.twoOpen')}
              </span>
            </div>
            <h3 className="text-label-sm text-on-surface-variant">{t('dashboard.technicalSupport')}</h3>
            <p className="text-h2 mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
              {t('dashboard.activeTickets')}
            </p>
            <div className="mt-auto pt-4 border-t border-outline-variant/30 mt-4">
              <Link to="/tickets" className="text-label-sm text-primary hover:underline flex items-center gap-1">
                <span>{t('dashboard.viewDetails')}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Maintenance */}
          <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex flex-col shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <Wrench className="h-6 w-6 text-secondary" />
              <span className="bg-[#10B981]/10 text-[#10B981] px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">
                {t('dashboard.scheduled')}
              </span>
            </div>
            <h3 className="text-label-sm text-on-surface-variant">{t('dashboard.maintenance')}</h3>
            <p className="text-h2 mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
              {new Date('2024-10-15').toLocaleDateString(i18n.language === 'es_DO' ? 'es-DO' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
            <div className="mt-auto pt-4 border-t border-outline-variant/30 mt-4">
              <span className="text-[11px] text-on-surface-variant">
                {t('dashboard.preventiveNetworkReview')}
              </span>
            </div>
          </div>

          {/* Backups */}
          <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex flex-col shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <CloudUpload className="h-6 w-6 text-secondary" />
              <span className="bg-[#10B981]/10 text-[#10B981] px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">
                {t('dashboard.successful')}
              </span>
            </div>
            <h3 className="text-label-sm text-on-surface-variant">{t('dashboard.lastBackup')}</h3>
            <p className="text-h2 mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
              {t('dashboard.twoHoursAgo')}
            </p>
            <div className="mt-auto pt-4 border-t border-outline-variant/30 mt-4">
              <span className="text-[11px] text-on-surface-variant">
                {t('dashboard.mainDbServer')}
              </span>
            </div>
          </div>

        </div>

        {/* Resource Usage (Spans 4 cols on desktop) */}
        <div className="md:col-span-4 bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex flex-col shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-label-lg font-bold text-on-surface">{t('dashboard.cloudStorage')}</h3>
            <Cloud className="h-5 w-5 text-on-surface-variant" />
          </div>
          <div className="flex-1 flex flex-col justify-center items-center py-4">
            <div className="relative w-32 h-32 flex items-center justify-center rounded-full border-8 border-surface-container-high border-t-primary border-r-primary transform -rotate-45">
              <div className="transform rotate-45 text-center">
                <span className="block text-h1 text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
                  72%
                </span>
              </div>
            </div>
          </div>
          <div className="mt-auto">
            <div className="flex justify-between text-[11px] text-on-surface-variant mb-1">
              <span>{t('dashboard.used')}: 3.6 TB</span>
              <span>{t('dashboard.total')}: 5.0 TB</span>
            </div>
            <div className="w-full bg-surface-container-high rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: '72%' }}></div>
            </div>
          </div>
        </div>

        {/* Billing & Invoices (Spans 8 cols on desktop) */}
        <div className="md:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col shadow-sm">
          <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
            <h3 className="text-label-lg font-bold text-on-surface">{t('dashboard.recentInvoices')}</h3>
            <Link to="/billing" className="text-label-sm text-primary hover:underline font-semibold">
              {t('dashboard.viewAll')}
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="px-5 py-3 text-[11px] font-bold text-on-surface-variant uppercase">{t('dashboard.tableInvoiceNo')}</th>
                  <th className="px-5 py-3 text-[11px] font-bold text-on-surface-variant uppercase">{t('dashboard.tableDate')}</th>
                  <th className="px-5 py-3 text-[11px] font-bold text-on-surface-variant uppercase">{t('dashboard.tableAmount')}</th>
                  <th className="px-5 py-3 text-[11px] font-bold text-on-surface-variant uppercase">{t('dashboard.tableStatus')}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-outline-variant/30 hover:bg-surface-container-low/30 transition-colors h-12">
                  <td className="px-5 py-3 text-label-sm font-mono text-on-surface">INV-2024-1001</td>
                  <td className="px-5 py-3 text-label-sm text-on-surface-variant">
                    {new Date('2024-10-01').toLocaleDateString(i18n.language === 'es_DO' ? 'es-DO' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3 text-label-sm font-semibold text-on-surface">$1,250.00</td>
                  <td className="px-5 py-3">
                    <span className="bg-[#F59E0B]/10 text-[#F59E0B] px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider">
                      {getStatusLabel('PENDING')}
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-outline-variant/30 hover:bg-surface-container-low/30 transition-colors h-12">
                  <td className="px-5 py-3 text-label-sm font-mono text-on-surface">INV-2024-0901</td>
                  <td className="px-5 py-3 text-label-sm text-on-surface-variant">
                    {new Date('2024-09-01').toLocaleDateString(i18n.language === 'es_DO' ? 'es-DO' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3 text-label-sm font-semibold text-on-surface">$1,250.00</td>
                  <td className="px-5 py-3">
                    <span className="bg-[#10B981]/10 text-[#10B981] px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider">
                      {getStatusLabel('PAID')}
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-surface-container-low/30 transition-colors h-12">
                  <td className="px-5 py-3 text-label-sm font-mono text-on-surface">INV-2024-0801</td>
                  <td className="px-5 py-3 text-label-sm text-on-surface-variant">
                    {new Date('2024-08-01').toLocaleDateString(i18n.language === 'es_DO' ? 'es-DO' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3 text-label-sm font-semibold text-on-surface">$1,250.00</td>
                  <td className="px-5 py-3">
                    <span className="bg-[#10B981]/10 text-[#10B981] px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider">
                      {getStatusLabel('PAID')}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Promotional Banner (Spans 4 cols on desktop) */}
        <div className="md:col-span-4 relative rounded-xl border border-outline-variant overflow-hidden group shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] to-[#1E293B] z-0"></div>
          {/* Decorative gradients */}
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 bg-white/5 rounded-full blur-2xl z-0 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-32 h-32 bg-white/5 rounded-full blur-2xl z-0 pointer-events-none"></div>
          
          <div className="relative z-10 p-6 h-full flex flex-col">
            <div className="mb-4 inline-block bg-white/15 text-white/90 px-2.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border border-white/25 self-start">
              {t('dashboard.recommendedUpdate')}
            </div>
            <h3 className="text-label-lg font-bold text-white mb-1">{t('dashboard.enterprisePlan')}</h3>
            <p className="text-label-sm text-slate-300 mb-6 flex-1">
              {t('dashboard.enterpriseDesc')}
            </p>
            <button
              onClick={() => navigate('/plans')}
              className="bg-white text-[#0F172A] w-full py-2.5 rounded-lg text-label-sm font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>{t('dashboard.viewPlanDetails')}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

      </div>
    </Page>
  );
}

