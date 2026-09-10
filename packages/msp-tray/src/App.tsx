import React, { useState, useEffect, useCallback } from "react";
import { LifeBuoy, Printer, Wifi, FileWarning, Sparkles, Zap, FolderOpen } from "lucide-react";
import {
  SystemVitals,
  AgentStatus,
  ActiveTicket,
  CreateTicketResult,
  fetchSystemVitals,
  fetchAgentStatus,
  fetchActiveTicket,
  fetchTicketList,
} from "./services/tauri";
import { ShiftWorkerAttribution, getCachedAttribution } from "./services/attribution";
import { Header } from "./components/Header";
import { VitalsWidget } from "./components/VitalsWidget";
import { AttributionModal } from "./components/AttributionModal";
import { QuickTicketModal } from "./components/QuickTicketModal";
import { LiveChatDrawer } from "./components/LiveChatDrawer";
import { TicketList } from "./components/TicketList";
import { playNotificationChime } from "./services/sound";

export const App: React.FC = () => {
  const [vitals, setVitals] = useState<SystemVitals | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [activeTicket, setActiveTicket] = useState<ActiveTicket | null>(null);
  const [ticketList, setTicketList] = useState<ActiveTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<ActiveTicket | null>(null);
  const [activeTab, setActiveTab] = useState<'SUPPORT' | 'TICKETS'>('SUPPORT');
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
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

  const loadTickets = useCallback(async () => {
    try {
      setIsLoadingTickets(true);
      const list = await fetchTicketList();
      setTicketList(list);
    } catch (e) {
      console.error('Failed to load tickets', e);
    } finally {
      setIsLoadingTickets(false);
    }
  }, []);

  useEffect(() => {
    loadVitals();
    loadStatus();
    loadTickets();

    const timer = setInterval(() => {
      loadVitals();
      loadStatus();
      loadTickets();
    }, 6000);

    return () => clearInterval(timer);
  }, [loadVitals, loadStatus, loadTickets]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadVitals(), loadStatus(), loadTickets()]);
    setIsRefreshing(false);
  };

  const handleTicketCreated = (res: CreateTicketResult) => {
    playNotificationChime();
    const created: ActiveTicket = {
      id: res.ticketId,
      title: res.title,
      status: res.status,
      assignedTechName: res.assignedTechName,
      createdAt: res.createdAt,
    };
    setActiveTicket(created);
    setSelectedTicket(created);
    setActiveTab('SUPPORT');
    loadTickets();
  };

  const openTicketChat = (ticket: ActiveTicket) => {
    setSelectedTicket(ticket);
  };

  const handleTicketResolved = () => {
    if (selectedTicket?.id === activeTicket?.id) {
      setActiveTicket(null);
    }
    setSelectedTicket(null);
    loadStatus();
    loadTickets();
  };

  // Compute live ticket to display in drawer (either manually selected from list, or machine's active ticket)
  const currentDrawerTicket = selectedTicket || (activeTab === 'SUPPORT' && activeTicket && activeTicket.status !== 'RESOLVED' ? activeTicket : null);

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
      <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 flex flex-col min-h-0">
        {/* Hardware Vitals Widget */}
        <VitalsWidget vitals={vitals} />

        {/* Navigation Tabs (Quick Support vs Workstation Tickets) */}
        {!selectedTicket && (
          <div className="flex bg-[#0a101d] p-1 rounded-xl border border-[#1b263b] shrink-0 gap-1">
            <button
              onClick={() => {
                setActiveTab('SUPPORT');
                setSelectedTicket(null);
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'SUPPORT'
                  ? 'bg-gradient-to-r from-[#0070db] to-[#0084ff] text-white shadow-md shadow-[#0084ff]/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#121b2d]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Quick Support
              {activeTicket && activeTicket.status !== 'RESOLVED' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('TICKETS');
                setSelectedTicket(null);
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'TICKETS'
                  ? 'bg-gradient-to-r from-[#0070db] to-[#0084ff] text-white shadow-md shadow-[#0084ff]/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#121b2d]'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Tickets
              {ticketList.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  activeTab === 'TICKETS'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#1a263d] text-slate-300'
                }`}>
                  {ticketList.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* View Routing */}
        {currentDrawerTicket ? (
          <div className="flex-1 flex flex-col min-h-0">
            <LiveChatDrawer
              activeTicket={currentDrawerTicket}
              attribution={attribution}
              onTicketResolved={handleTicketResolved}
              onBack={() => setSelectedTicket(null)}
            />
          </div>
        ) : activeTab === 'TICKETS' ? (
          <div className="flex-1 flex flex-col min-h-0">
            <TicketList
              tickets={ticketList}
              selectedTicketId={undefined}
              onSelectTicket={openTicketChat}
              onOpenNewTicketModal={() => setIsTicketModalOpen(true)}
              isLoading={isLoadingTickets}
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
