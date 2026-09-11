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
  refreshPairingCode,
  listenAgentBound,
  listenAgentUnbound,
} from "./services/tauri";
import { ShiftWorkerAttribution, getCachedAttribution } from "./services/attribution";
import { Header } from "./components/Header";
import { AttributionModal } from "./components/AttributionModal";
import { QuickTicketModal } from "./components/QuickTicketModal";
import { LiveChatDrawer } from "./components/LiveChatDrawer";
import { TicketList } from "./components/TicketList";
import { CopyableTicketId } from "./components/CopyableTicketId";
import { ActivationGate } from "./components/ActivationGate";
import { playNotificationChime } from "./services/sound";

export const App: React.FC = () => {
  const [vitals, setVitals] = useState<SystemVitals | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [activeTicket, setActiveTicket] = useState<ActiveTicket | null>(null);
  const [ticketList, setTicketList] = useState<ActiveTicket[]>([]);
  const [activeChatTicket, setActiveChatTicket] = useState<ActiveTicket | null>(null);
  const [activeTab, setActiveTab] = useState<'SUPPORT' | 'TICKETS'>('SUPPORT');
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [attribution, setAttribution] = useState<ShiftWorkerAttribution | null>(null);

  const [isAttributionOpen, setIsAttributionOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [modalInitialCategory, setModalInitialCategory] = useState('HELPDESK');
  const [modalInitialTitle, setModalInitialTitle] = useState('');
  const [modalInitialPriority, setModalInitialPriority] = useState('MEDIUM');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const openNewTicketModal = (initial?: { title?: string; category?: string; priority?: string }) => {
    if (agentStatus && !agentStatus.isBound) return;
    setModalInitialTitle(initial?.title || '');
    setModalInitialCategory(initial?.category || 'HELPDESK');
    setModalInitialPriority(initial?.priority || 'MEDIUM');
    setIsTicketModalOpen(true);
  };

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

  const loadTickets = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setIsLoadingTickets(true);
      }
      const list = await fetchTicketList();
      setTicketList(list);
    } catch (e) {
      console.error('Failed to load tickets', e);
    } finally {
      if (!silent) {
        setIsLoadingTickets(false);
      }
    }
  }, []);

  useEffect(() => {
    loadVitals();
    loadStatus();
    loadTickets(false);

    const timer = setInterval(() => {
      loadVitals();
      loadStatus();
      loadTickets(true);
    }, 6000);

    return () => clearInterval(timer);
  }, [loadVitals, loadStatus, loadTickets]);

  // Real-time listener for over-the-air binding events from background service
  useEffect(() => {
    let unlistenBound: (() => void) | undefined;
    let unlistenUnbound: (() => void) | undefined;

    listenAgentBound(() => {
      playNotificationChime();
      loadStatus();
      loadTickets(false);
    }).then((un) => {
      unlistenBound = un;
    });

    listenAgentUnbound(() => {
      loadStatus();
    }).then((un) => {
      unlistenUnbound = un;
    });

    return () => {
      if (unlistenBound) unlistenBound();
      if (unlistenUnbound) unlistenUnbound();
    };
  }, [loadStatus, loadTickets]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadVitals(), loadStatus(), loadTickets(false)]);
    setIsRefreshing(false);
  };

  const handleRefreshPairingCode = async () => {
    setIsRefreshing(true);
    try {
      const updated = await refreshPairingCode();
      setAgentStatus(updated);
    } catch (err) {
      console.error('Failed to refresh pairing code', err);
    } finally {
      setIsRefreshing(false);
    }
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
    setActiveChatTicket(created);
    setActiveTab('SUPPORT');
    loadTickets();
  };

  const openTicketChat = (ticket: ActiveTicket) => {
    setActiveChatTicket(ticket);
  };

  const handleTicketResolved = () => {
    if (activeChatTicket?.id === activeTicket?.id) {
      setActiveTicket(null);
    }
    setActiveChatTicket(null);
    loadStatus();
    loadTickets();
  };

  return (
    <div className="flex flex-col h-screen bg-velmar-bg bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(0,132,255,0.12),rgba(7,10,16,0.98))] text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Bar Header */}
      <Header
        hostname={vitals?.hostname || "Endpoint"}
        tenantName={agentStatus && !agentStatus.isBound ? "Unlinked Endpoint" : (agentStatus?.tenantName || "Managed System")}
        isOnline={agentStatus?.agentOnline ?? true}
        attribution={attribution}
        onEditAttribution={() => setIsAttributionOpen(true)}
        onRefreshVitals={handleManualRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 flex flex-col min-h-0">
        {agentStatus && !agentStatus.isBound ? (
          <ActivationGate
            pairingCode={agentStatus.pairingCode}
            pairingCodeExpiresAt={agentStatus.pairingCodeExpiresAt}
            onRefreshCode={handleRefreshPairingCode}
            isRefreshing={isRefreshing}
          />
        ) : (
          <>
            {/* Navigation Tabs (Quick Support vs Workstation Tickets) */}
            {!activeChatTicket && (
          <div className="flex bg-[#0a101d] p-1 rounded-xl border border-[#1b263b] shrink-0 gap-1">
            <button
              onClick={() => {
                setActiveTab('SUPPORT');
                setActiveChatTicket(null);
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
                setActiveChatTicket(null);
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
        {activeChatTicket ? (
          <div className="flex-1 flex flex-col min-h-0">
            <LiveChatDrawer
              activeTicket={activeChatTicket}
              attribution={attribution}
              onTicketResolved={handleTicketResolved}
              onBack={() => setActiveChatTicket(null)}
            />
          </div>
        ) : activeTab === 'TICKETS' ? (
          <div className="flex-1 flex flex-col min-h-0">
            <TicketList
              tickets={ticketList}
              selectedTicketId={undefined}
              onSelectTicket={openTicketChat}
              onOpenNewTicketModal={() => openNewTicketModal()}
              isLoading={isLoadingTickets}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Active Ticket Banner in Quick Support view */}
            {activeTicket && activeTicket.status !== 'RESOLVED' && (
              <div className="bg-[#0b1322] border border-[#0084ff]/40 rounded-xl p-3 shadow-lg shadow-[#0084ff]/10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <CopyableTicketId id={activeTicket.id} className="text-xs" />
                      <span className="text-[9px] px-1 py-0.2 rounded font-bold uppercase bg-[#0084ff]/20 text-[#38bdf8] border border-[#0084ff]/30">
                        {activeTicket.status}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-200 truncate">
                      {activeTicket.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveChatTicket(activeTicket)}
                  className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-[#0070db] to-[#0084ff] hover:from-[#0060c2] hover:to-[#0070db] text-white text-xs font-semibold shrink-0 flex items-center gap-1 shadow-sm shadow-[#0084ff]/30 transition-all active:scale-95 cursor-pointer"
                >
                  Live Chat →
                </button>
              </div>
            )}
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
                  onClick={() => openNewTicketModal({ category: 'HELPDESK' })}
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
                  onClick={() => openNewTicketModal({ title: 'Printer Offline / Hardware Issue', category: 'REPAIR', priority: 'MEDIUM' })}
                  className="p-2 rounded-lg bg-[#0c1220]/90 hover:bg-[#121b2d] border border-[#1b263b] hover:border-[#0084ff]/40 text-left transition-all flex items-center gap-2 group shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5 text-[#0084ff] group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] text-slate-200">Printer Offline</span>
                </button>

                <button
                  onClick={() => openNewTicketModal({ title: 'VPN / Network Connection Failure', category: 'SERVICE_OUTAGE', priority: 'HIGH' })}
                  className="p-2 rounded-lg bg-[#0c1220]/90 hover:bg-[#121b2d] border border-[#1b263b] hover:border-[#38bdf8]/40 text-left transition-all flex items-center gap-2 group shadow-sm"
                >
                  <Wifi className="w-3.5 h-3.5 text-[#38bdf8] group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] text-slate-200">VPN / Network</span>
                </button>

                <button
                  onClick={() => openNewTicketModal({ title: 'ERP / Software Application Crash', category: 'HELPDESK', priority: 'HIGH' })}
                  className="p-2 rounded-lg bg-[#0c1220]/90 hover:bg-[#121b2d] border border-[#1b263b] hover:border-[#ff5e00]/40 text-left transition-all flex items-center gap-2 group shadow-sm"
                >
                  <FileWarning className="w-3.5 h-3.5 text-[#ff5e00] group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] text-slate-200">ERP / App Crash</span>
                </button>

                <button
                  onClick={() => openNewTicketModal({ title: 'Workstation Slowness / High Load', category: 'PREVENTATIVE_MAINTENANCE', priority: 'MEDIUM' })}
                  className="p-2 rounded-lg bg-[#0c1220]/90 hover:bg-[#121b2d] border border-[#1b263b] hover:border-[#ff8533]/40 text-left transition-all flex items-center gap-2 group shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5 text-[#ff8533] group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] text-slate-200">Computer Slow</span>
                </button>
              </div>
            </div>
          </div>
        )}
          </>
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
        initialCategory={modalInitialCategory}
        initialTitle={modalInitialTitle}
        initialPriority={modalInitialPriority}
      />
    </div>
  );
};
export default App;
