import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Clock,
  UserCheck,
  ChevronRight,
  Plus,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
} from 'lucide-react';
import { ActiveTicket } from '../services/tauri';
import { CopyableTicketId } from './CopyableTicketId';
import { useI18n } from '../i18n';

interface TicketListProps {
  tickets: ActiveTicket[];
  selectedTicketId?: string;
  onSelectTicket: (ticket: ActiveTicket) => void;
  onOpenNewTicketModal: () => void;
  isLoading?: boolean;
}

type FilterStatus = 'ALL' | 'ACTIVE' | 'RESOLVED';

export const TicketList: React.FC<TicketListProps> = ({
  tickets,
  selectedTicketId,
  onSelectTicket,
  onOpenNewTicketModal,
  isLoading = false,
}) => {
  const { t } = useI18n();
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Filter by tab
      if (filter === 'ACTIVE') {
        if (t.status === 'RESOLVED' || t.status === 'CLOSED' || t.status === 'CANCELLED') {
          return false;
        }
      } else if (filter === 'RESOLVED') {
        if (t.status !== 'RESOLVED' && t.status !== 'CLOSED') {
          return false;
        }
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesId = t.id.toLowerCase().includes(q);
        const matchesTech = t.assignedTechName?.toLowerCase().includes(q);
        const matchesCategory = t.category?.toLowerCase().includes(q);
        return matchesTitle || matchesId || matchesTech || matchesCategory;
      }

      return true;
    });
  }, [tickets, filter, searchQuery]);

  const activeCount = useMemo(
    () => tickets.filter((t) => t.status !== 'RESOLVED' && t.status !== 'CLOSED' && t.status !== 'CANCELLED').length,
    [tickets]
  );

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'OPEN':
        return (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#0084ff]/15 text-[#38bdf8] border border-[#0084ff]/30 font-bold tracking-wider uppercase">
            {t('common.status.open')}
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold tracking-wider uppercase">
            {t('common.status.inProgress')}
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold tracking-wider uppercase flex items-center gap-0.5">
            <CheckCircle2 className="w-2.5 h-2.5" /> {t('common.status.resolved')}
          </span>
        );
      case 'CLOSED':
        return (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/30 text-slate-400 border border-slate-600/30 font-bold tracking-wider uppercase">
            {t('common.status.closed')}
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold tracking-wider uppercase">
            {t('common.status.cancelled')}
          </span>
        );
      default:
        return (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-bold tracking-wider uppercase">
            {status}
          </span>
        );
    }
  };

  const getCategoryBadge = (category?: string) => {
    if (!category) return null;
    const cat = category.toUpperCase();
    let label = category;
    let style = 'bg-[#162238] text-slate-300 border-[#243552]';

    switch (cat) {
      case 'HELPDESK':
        label = t('common.category.helpdesk');
        style = 'bg-blue-500/10 text-blue-300 border-blue-500/30';
        break;
      case 'REPAIR':
      case 'HARDWARE':
        label = t('common.category.repair');
        style = 'bg-amber-500/10 text-amber-300 border-amber-500/30';
        break;
      case 'SERVICE_OUTAGE':
      case 'NETWORK':
        label = t('common.category.serviceOutage');
        style = 'bg-rose-500/10 text-rose-300 border-rose-500/30';
        break;
      case 'PREVENTATIVE_MAINTENANCE':
        label = t('common.category.preventativeMaintenance');
        style = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
        break;
      case 'WARRANTY':
        label = t('common.category.warranty');
        style = 'bg-purple-500/10 text-purple-300 border-purple-500/30';
        break;
      case 'AI':
        label = t('common.category.ai');
        style = 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
        break;
    }

    return (
      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium border ${style}`}>
        {label}
      </span>
    );
  };

  const getPriorityDot = (priority?: string) => {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL':
        return <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" title="Critical Priority" />;
      case 'HIGH':
        return <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="High Priority" />;
      case 'MEDIUM':
        return <span className="w-1.5 h-1.5 rounded-full bg-[#0084ff]" title="Medium Priority" />;
      case 'LOW':
      default:
        return <span className="w-1.5 h-1.5 rounded-full bg-slate-500" title="Low Priority" />;
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0e17] rounded-xl border border-[#1b263b] overflow-hidden">
      {/* Header with Title & Filter Controls */}
      <div className="p-2.5 border-b border-[#1b263b] bg-[#0c1322] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5 text-[#0084ff]" />
            <h3 className="text-xs font-bold text-slate-100">{t('navigation.tickets')}</h3>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#0084ff]/20 text-[#38bdf8] font-mono font-semibold">
              {tickets.length}
            </span>
          </div>

          <button
            onClick={onOpenNewTicketModal}
            className="px-2 py-1 rounded-md bg-[#0084ff]/20 hover:bg-[#0084ff]/30 text-[#38bdf8] hover:text-white border border-[#0084ff]/35 text-[10px] font-semibold flex items-center gap-1 transition-all active:scale-95 shadow-xs"
          >
            <Plus className="w-3 h-3" />
            {t('tickets.reportIssueNow')}
          </button>
        </div>

        {/* Filter Pills and Search */}
        <div className="flex items-center gap-1.5">
          <div className="flex bg-[#060a12] p-0.5 rounded-lg border border-[#1a263d] shrink-0">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                filter === 'ALL'
                  ? 'bg-[#1a263d] text-slate-100 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('tickets.allTab', { count: tickets.length })}
            </button>
            <button
              onClick={() => setFilter('ACTIVE')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                filter === 'ACTIVE'
                  ? 'bg-[#0084ff]/25 text-[#38bdf8] font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('tickets.activeTab', { count: activeCount })}
            </button>
            <button
              onClick={() => setFilter('RESOLVED')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                filter === 'RESOLVED'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('tickets.resolvedTab', { count: tickets.length - activeCount })}
            </button>
          </div>

          <input
            type="text"
            placeholder={t('tickets.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-[#060a12] border border-[#1a263d] focus:border-[#0084ff] rounded-lg px-2 py-0.5 text-[11px] text-slate-200 placeholder:text-slate-500 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Ticket List Body */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {isLoading && tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-xs">
            <div className="w-5 h-5 border-2 border-[#0084ff] border-t-transparent rounded-full animate-spin mb-2" />
            {t('tickets.loadingHistory')}
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <AlertCircle className="w-7 h-7 text-slate-600 mb-2" />
            <p className="text-xs font-medium text-slate-300">{t('tickets.noTicketsFound')}</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[240px]">
              {searchQuery
                ? t('tickets.noTicketsMatchSearch')
                : t('tickets.noTicketsRecorded')}
            </p>
            <button
              onClick={onOpenNewTicketModal}
              className="mt-3 px-3 py-1.5 rounded-lg bg-[#0084ff]/20 hover:bg-[#0084ff]/30 text-[#38bdf8] border border-[#0084ff]/40 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('tickets.reportIssueNow')}
            </button>
          </div>
        ) : (
          filteredTickets.map((t) => {
            const isSelected = t.id === selectedTicketId;
            const isActive = t.status !== 'RESOLVED' && t.status !== 'CLOSED' && t.status !== 'CANCELLED';

            return (
              <div
                key={t.id}
                onClick={() => onSelectTicket(t)}
                className={`group p-2.5 rounded-xl border transition-all cursor-pointer text-left relative overflow-hidden ${
                  isSelected
                    ? 'bg-[#101b30] border-[#0084ff]/60 shadow-md shadow-[#0084ff]/10'
                    : 'bg-[#0c1220]/85 hover:bg-[#121b2d] border-[#1b263b] hover:border-[#0084ff]/30'
                }`}
              >
                {/* Active accent edge */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#0084ff] to-[#38bdf8]" />
                )}

                <div className="flex items-center justify-between gap-1.5 mb-1">
                  <div className="flex items-center gap-1.5">
                    {getPriorityDot(t.priority)}
                    <CopyableTicketId id={t.id} className="text-[10px]" />
                    {getCategoryBadge(t.category)}
                  </div>
                  {getStatusBadge(t.status)}
                </div>

                <h4 className="text-xs font-semibold text-slate-100 group-hover:text-blue-300 transition-colors line-clamp-1 mb-1">
                  {t.title}
                </h4>

                {t.description && (
                  <p className="text-[11px] text-slate-400 line-clamp-1 mb-1.5 leading-snug">
                    {t.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-[#172238]">
                  <div className="flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-slate-500" />
                    <span className="truncate max-w-[130px] text-slate-300">
                      {t.assignedTechName || 'Helpdesk Queue'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 text-slate-500 font-mono text-[9px]">
                      <Clock className="w-2.5 h-2.5" />
                      {formatTimestamp(t.createdAt)}
                    </div>
                    <div className="flex items-center gap-0.5 text-[#0084ff] font-medium text-[10px] group-hover:translate-x-0.5 transition-transform">
                      <MessageSquare className="w-3 h-3" />
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
