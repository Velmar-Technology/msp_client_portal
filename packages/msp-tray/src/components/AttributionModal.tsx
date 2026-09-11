import React, { useState } from "react";
import { User, ShieldAlert, Check } from "lucide-react";
import { ShiftWorkerAttribution, saveAttribution } from "../services/attribution";
import { useI18n } from "../i18n";

interface AttributionModalProps {
  currentAttribution: ShiftWorkerAttribution | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (attr: ShiftWorkerAttribution) => void;
}

export const AttributionModal: React.FC<AttributionModalProps> = ({ currentAttribution, isOpen, onClose, onSaved }) => {
  const { t } = useI18n();
  const [name, setName] = useState(currentAttribution?.reporterName || "");
  const [email, setEmail] = useState(currentAttribution?.reporterEmail || "");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t('attribution.errorNameRequired'));
      return;
    }
    if (!email.trim() || !email.includes("@") || !email.includes(".")) {
      setError(t('attribution.errorEmailInvalid'));
      return;
    }

    const saved = saveAttribution(name, email);
    setError(null);
    onSaved(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#04070d]/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0b101c] border border-[#1c2940] rounded-xl max-w-sm w-full p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-velmar-orange/15 border border-velmar-orange/30 flex items-center justify-center text-[#ff5e00] shadow-sm shadow-[#ff5e00]/20">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">{t('attribution.modalTitle')}</h3>
            <p className="text-[11px] text-slate-400">{t('attribution.modalSubtitle')}</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 mb-3 leading-relaxed">
          {t('attribution.modalDescription')}
        </p>

        {error && (
          <div className="mb-3 p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">{t('attribution.fullNameLabel')}</label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('attribution.fullNamePlaceholder')}
                className="w-full bg-[#060912] border border-[#1a263d] focus:border-[#0084ff] rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 outline-none transition-colors"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">{t('attribution.emailLabel')}</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('attribution.emailPlaceholder')}
                className="w-full bg-[#060912] border border-[#1a263d] focus:border-[#0084ff] rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            {currentAttribution && (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                {t('common.cancel')}
              </button>
            )}
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#0070db] via-[#0084ff] to-[#0094ff] hover:from-[#0060c2] hover:to-[#0084ff] text-white shadow-lg shadow-[#0084ff]/30 border border-blue-400/30 flex items-center gap-1.5 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              {t('attribution.saveIdentity')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
