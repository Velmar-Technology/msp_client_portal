import React, { useState, useEffect, useCallback } from "react";
import { LifeBuoy, MessageSquare, Printer, Wifi, FileWarning, Sparkles, Zap } from "lucide-react";
import {
  SystemVitals,
  AgentStatus,
  ActiveTicket,
  CreateTicketResult,
  fetchSystemVitals,
  fetchAgentStatus,
  fetchActiveTicket,
} from "./services/tauri";
import { ShiftWorkerAttribution, getCachedAttribution } from "./services/attribution";
import { Header } from "./components/Header";
import { VitalsWidget } from "./components/VitalsWidget";
import { AttributionModal } from "./components/AttributionModal";
import { QuickTicketModal } from "./components/QuickTicketModal";
import { LiveChatDrawer } from "./components/LiveChatDrawer";
import { playNotificationChime } from "./services/sound";

export const App: React.FC = () => {
  const [vitals, setVitals] = useState<SystemVitals | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [activeTicket, setActiveTicket] = useState<ActiveTicket | null>(null);
  const [attribution, setAttribution] = useState<ShiftWorkerAttribution | null>(null);

  const [isAttributionOpen, setIsAttributionOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load initial attribution
  useEffect(() => {
    const cached = getCachedAttribution();
    if (cached) {
      setAttribution(cached);
    } else {
      setIsAttributionOpen(true);
    }
  }, []);

  // Poll vitals and agent status
  const loadVitals = useCallback(async () => {
    try {
      const v = await fetchSystemVitals();
      setVitals(v);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const s = await fetchAgentStatus();
      setAgentStatus(s);
      const t = await fetchActiveTicket();
      setActiveTicket(t);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadVitals();
    loadStatus();

    const timer = setInterval(() => {
      loadVitals();
    }, 5000);

    return () => clearInterval(timer);
  }, [loadVitals, loadStatus]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadVitals(), loadStatus()]);
    setIsRefreshing(false);
  };

  const handleTicketCreated = (res: CreateTicketResult) => {
    playNotificationChime();
    setActiveTicket({
      id: res.ticketId,
      title: res.title,
      status: res.status,
      assignedTechName: res.assignedTechName,
      createdAt: res.createdAt,
    });
  };

  return (
    <div className="flex flex-col h-screen bg-velmar-bg bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(0,132,255,0.12),rgba(7,10,16,0.98))] text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Bar Header */}
      <Header
        hostname={vitals?.hostname || "Endpoint"}
        tenantName={agentStatus?.tenantName || "Managed System"}
        isOnline={agentStatus?.agentOnline ?? true}
        attribution={attribution}
        onEditAttribution={() => setIsAttributionOpen(true)}
        onRefreshVitals={handleManualRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {/* Hardware Vitals Widget */}
        <VitalsWidget vitals={vitals} />

        {/* Active Ticket or Action Options */}
        {activeTicket && activeTicket.status !== "RESOLVED" ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-velmar-blue" /> Live Support Thread
              </span>
            </div>
            <LiveChatDrawer
              activeTicket={activeTicket}
              attribution={attribution}
              onTicketResolved={() => {
                setActiveTicket(null);
                loadStatus();
              }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Primary 1-Click Ticket Trigger */}
            <div className="bg-linear-to-br from-[#0c1626] via-[#0d1525] to-[#1a1320] border border-velmar-blue/30 rounded-xl p-3.5 shadow-xl shadow-black/40 relative overflow-hidden">
              {/* Dual-color brand chevron top accent line */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-velmar-blue via-velmar-blue-light to-velmar-orange" />

              <div className="relative z-10 pt-0.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="w-4 h-4 text-velmar-blue" />
                  <h3 className="text-xs font-bold text-slate-100">Velmar Technical Support</h3>
                </div>
                <p className="text-[11px] text-slate-300 mb-3 leading-relaxed">
                  Experiencing slowness, software errors, or access issues? Submit a direct ticket with automated flight
                  recorder diagnostics.
                </p>

                <button
                  onClick={() => setIsTicketModalOpen(true)}
                  className="w-full py-2 px-3 rounded-lg bg-linear-to-r from-[#0070db] via-velmar-blue to-[#0094ff] hover:from-velmar-blue-dark hover:to-velmar-blue active:scale-[0.99] text-white font-semibold text-xs shadow-lg shadow-velmar-blue/30 border border-blue-400/30 flex items-center justify-center gap-1.5 transition-all"
                >
                  <LifeBuoy className="w-4 h-4 text-white" />
                  Report An Issue Now
                </button>
              </div>
            </div>

            {/* Quick Diagnostic Shortcuts */}
            <div>
              <span className="text-[11px] font-medium text-slate-400 block mb-2">Common Workstation Issues</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsTicketModalOpen(true)}
                  className="p-2 rounded-lg bg-[#0c1220]/90 hover:bg-[#121b2d] border border-[#1b263b] hover:border-[#0084ff]/40 text-left transition-all flex items-center gap-2 group shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5 text-[#0084ff] group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] text-slate-200">Printer Offline</span>
                </button>

                <button
                  onClick={() => setIsTicketModalOpen(true)}
                  className="p-2 rounded-lg bg-[#0c1220]/90 hover:bg-[#121b2d] border border-[#1b263b] hover:border-[#38bdf8]/40 text-left transition-all flex items-center gap-2 group shadow-sm"
                >
                  <Wifi className="w-3.5 h-3.5 text-[#38bdf8] group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] text-slate-200">VPN / Network</span>
                </button>

                <button
                  onClick={() => setIsTicketModalOpen(true)}
                  className="p-2 rounded-lg bg-[#0c1220]/90 hover:bg-[#121b2d] border border-[#1b263b] hover:border-[#ff5e00]/40 text-left transition-all flex items-center gap-2 group shadow-sm"
                >
                  <FileWarning className="w-3.5 h-3.5 text-[#ff5e00] group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] text-slate-200">ERP / App Crash</span>
                </button>

                <button
                  onClick={() => setIsTicketModalOpen(true)}
                  className="p-2 rounded-lg bg-[#0c1220]/90 hover:bg-[#121b2d] border border-[#1b263b] hover:border-[#ff8533]/40 text-left transition-all flex items-center gap-2 group shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5 text-[#ff8533] group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] text-slate-200">Computer Slow</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Attribution Modal */}
      <AttributionModal
        isOpen={isAttributionOpen}
        currentAttribution={attribution}
        onClose={() => setIsAttributionOpen(false)}
        onSaved={(attr) => setAttribution(attr)}
      />

      {/* Quick Ticket Modal */}
      <QuickTicketModal
        isOpen={isTicketModalOpen}
        attribution={attribution}
        onClose={() => setIsTicketModalOpen(false)}
        onTicketCreated={handleTicketCreated}
      />
    </div>
  );
};
export default App;
