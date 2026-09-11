import React, { useState, useEffect } from 'react';
import { KeyRound, Copy, Check, RefreshCw, ShieldAlert, Clock, HelpCircle } from 'lucide-react';
import { useI18n } from '../i18n';

interface ActivationGateProps {
  pairingCode?: string;
  pairingCodeExpiresAt?: string;
  onRefreshCode: () => Promise<void>;
  isRefreshing?: boolean;
}

export const ActivationGate: React.FC<ActivationGateProps> = ({
  pairingCode,
  pairingCodeExpiresAt,
  onRefreshCode,
  isRefreshing = false,
}) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [timeLeftSecs, setTimeLeftSecs] = useState<number | null>(null);

  // Parse 6-digit PIN into 3-3 display chunk
  const formattedCode = pairingCode && pairingCode.length === 6
    ? `${pairingCode.slice(0, 3)} - ${pairingCode.slice(3)}`
    : pairingCode || '------';

  // Live countdown calculation from RFC 3339 expiry
  useEffect(() => {
    if (!pairingCodeExpiresAt) {
      setTimeLeftSecs(null);
      return;
    }

    const calculateRemaining = () => {
      const expiryMs = new Date(pairingCodeExpiresAt).getTime();
      const nowMs = Date.now();
      const deltaSecs = Math.max(0, Math.floor((expiryMs - nowMs) / 1000));
      setTimeLeftSecs(deltaSecs);
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [pairingCodeExpiresAt]);

  const handleCopy = async () => {
    if (!pairingCode) return;
    try {
      await navigator.clipboard.writeText(pairingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const formatCountdown = (totalSecs: number | null) => {
    if (totalSecs === null) return '--:--';
    if (totalSecs <= 0) return t('gate.expired');
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isExpired = timeLeftSecs !== null && timeLeftSecs <= 0;

  return (
    <div className="flex-1 flex flex-col justify-between p-4 bg-[#0a101d] rounded-xl border border-[#1b263b] shadow-xl shadow-black/40 text-slate-100 overflow-y-auto">
      {/* Top Banner */}
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0084ff]/20 to-[#ff5e00]/20 border border-[#0084ff]/40 flex items-center justify-center shadow-lg shadow-[#0084ff]/10">
            <KeyRound className="w-6 h-6 text-[#0084ff] animate-pulse" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
          </span>
        </div>

        <div>
          <h2 className="text-sm font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
            {t('gate.title')}
          </h2>
          <p className="text-[11px] text-slate-400 mt-1 max-w-[280px] leading-relaxed">
            {t('gate.subtitle')}
          </p>
        </div>
      </div>

      {/* Pairing Code Card */}
      <div className="my-3 bg-[#060a12] border border-[#1c2942] rounded-xl p-3.5 flex flex-col items-center relative overflow-hidden shadow-inner">
        {/* Subtle decorative glow */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-20 bg-[#0084ff]/15 blur-2xl pointer-events-none" />

        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
          <ShieldAlert className="w-3 h-3 text-[#0084ff]" />
          {t('gate.pinHeader')}
        </span>

        {/* Big Code Display */}
        <div className="my-1 py-1 px-3 bg-[#0c1424] rounded-lg border border-[#1e2f4f] shadow-sm">
          <span className="font-mono text-2xl font-extrabold tracking-widest text-[#0084ff] drop-shadow-[0_0_8px_rgba(0,132,255,0.4)]">
            {formattedCode}
          </span>
        </div>

        {/* Expiry Badge */}
        <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
          <Clock className={`w-3 h-3 ${isExpired ? 'text-rose-400' : 'text-amber-400'}`} />
          <span className={isExpired ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
            {isExpired ? t('gate.expired') : t('gate.expiresIn', { time: formatCountdown(timeLeftSecs) })}
          </span>
        </div>

        {/* Action Controls */}
        <div className="mt-3 flex items-center gap-2 w-full">
          <button
            onClick={handleCopy}
            disabled={!pairingCode || isExpired}
            className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all ${
              copied
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-[#101b2e] hover:bg-[#152540] text-slate-200 border border-[#1e3052] active:scale-[0.98]'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                {t('gate.copied')}
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                {t('gate.copyPin')}
              </>
            )}
          </button>

          <button
            onClick={onRefreshCode}
            disabled={isRefreshing}
            title={t('gate.newPinTooltip')}
            className="py-1.5 px-2.5 rounded-lg text-[11px] font-medium bg-[#101b2e] hover:bg-[#152540] text-slate-300 border border-[#1e3052] flex items-center gap-1 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#0084ff]' : 'text-slate-400'}`} />
            <span>{t('gate.newPin')}</span>
          </button>
        </div>
      </div>

      {/* Instructions & Help */}
      <div className="space-y-2 text-[11px] bg-[#0c1424]/60 border border-[#18263d] rounded-lg p-2.5">
        <div className="flex items-start gap-2 text-slate-300">
          <HelpCircle className="w-4 h-4 text-[#0084ff] shrink-0 mt-0.5" />
          <div className="leading-snug">
            <span className="font-semibold text-white">{t('gate.howToLinkTitle')}</span>
            <p className="text-[10.5px] text-slate-400 mt-0.5">
              {t('gate.howToLinkText')}
            </p>
          </div>
        </div>

        <div className="pt-1.5 border-t border-[#18263d] flex items-center justify-between text-[10px] text-slate-500">
          <span>{t('gate.realTimeDetection')}</span>
          <span className="text-emerald-400/90 font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {t('gate.waitingForBind')}
          </span>
        </div>
      </div>
    </div>
  );
};

