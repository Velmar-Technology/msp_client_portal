import React from 'react';
import { User, X, RefreshCw, Globe } from 'lucide-react';
import { ShiftWorkerAttribution } from '../services/attribution';
import { hideWindow } from '../services/tauri';
import { useI18n } from '../i18n';
import logoUrl from '../assets/logo.png';

interface HeaderProps {
  hostname: string;
  tenantName?: string;
  isOnline: boolean;
  attribution: ShiftWorkerAttribution | null;
  onEditAttribution: () => void;
  onRefreshVitals: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  hostname,
  tenantName,
  isOnline,
  attribution,
  onEditAttribution,
  onRefreshVitals,
  isRefreshing,
}) => {
  const { t, locale, toggleLocale } = useI18n();

  const handleClose = async () => {
    await hideWindow();
  };

  return (
    <div className="bg-[#0b101c]/95 border-b border-[#1c2942] px-3 py-2 flex items-center justify-between backdrop-blur-md sticky top-0 z-30 select-none shadow-md shadow-black/20">
      {/* Brand & Endpoint Identification */}
      <div className="flex items-center gap-2">
        <div className="relative group cursor-pointer" onClick={onRefreshVitals} title="Velmar Technology Support Assistant">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0084ff]/15 to-[#ff5e00]/15 border border-[#0084ff]/30 p-1 flex items-center justify-center shadow-sm shadow-[#0084ff]/20">
            <img
              src={logoUrl}
              alt="Velmar Logo"
              className="w-full h-full object-contain filter drop-shadow-[0_0_4px_rgba(0,132,255,0.5)]"
            />
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-[#0b101c] ${
              isOnline ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-[#ff5e00] shadow-[0_0_6px_rgba(255,94,0,0.8)]'
            }`}
            title={isOnline ? t('header.online') : t('header.connecting')}
          />
        </div>

        <div className="leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-xs tracking-tight text-slate-100 max-w-[130px] truncate">
              {hostname || t('header.endpointWorkstation')}
            </span>
            <span className="text-[9px] font-bold tracking-wider uppercase text-[#0084ff] font-mono px-1 py-0.2 bg-[#0084ff]/10 rounded border border-[#0084ff]/30">
              VELMAR
            </span>
          </div>
          <p className="text-[11px] text-slate-400 truncate max-w-[140px]">
            {tenantName || t('header.managedSystem')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Language Switcher */}
        <button
          onClick={toggleLocale}
          className="h-6 px-1.5 rounded-md bg-[#131c30] hover:bg-[#1a2640] border border-[#233554] hover:border-[#0084ff]/40 text-[10px] font-mono font-bold text-slate-300 transition-all flex items-center gap-0.5"
          title={t('header.langToggle')}
        >
          <Globe className="w-3 h-3 text-slate-400 mr-0.5" />
          <span className={locale === 'en_US' ? 'text-[#0084ff] font-extrabold' : 'text-slate-500'}>EN</span>
          <span className="text-slate-600">/</span>
          <span className={locale === 'es_DO' ? 'text-[#ff5e00] font-extrabold' : 'text-slate-500'}>ES</span>
        </button>

        {/* Refresh button */}
        <button
          onClick={onRefreshVitals}
          disabled={isRefreshing}
          className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-[#0084ff] hover:bg-[#0084ff]/10 border border-transparent hover:border-[#0084ff]/20 transition-all"
          title={t('header.refreshVitalsTooltip')}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#0084ff]' : ''}`} />
        </button>

        {/* Worker Attribution Button */}
        <button
          onClick={onEditAttribution}
          className="flex items-center gap-1 px-1.5 py-0.5 h-6 rounded-md bg-[#131c30] hover:bg-[#1a2640] border border-[#233554] hover:border-[#0084ff]/40 text-xs text-slate-200 transition-all shadow-sm"
          title={attribution ? t('header.loggedInAs', { name: attribution.reporterName, email: attribution.reporterEmail }) : t('header.setShiftWorkerTooltip')}
        >
          <User className="w-3 h-3 text-[#ff5e00]" />
          <span className="max-w-[55px] truncate text-[10.5px] font-medium">
            {attribution ? attribution.reporterName.split(' ')[0] : t('header.identify')}
          </span>
        </button>

        {/* Hide window button */}
        <button
          onClick={handleClose}
          className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          title={t('header.hideToTray')}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

