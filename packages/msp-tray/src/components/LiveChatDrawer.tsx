import React, { useState, useEffect, useRef } from 'react';
import { Send, CheckCircle, Headphones, UserCheck } from 'lucide-react';
import { ActiveTicket, sendChatMessage, resolveTicket } from '../services/tauri';
import { ShiftWorkerAttribution } from '../services/attribution';
import { playNotificationChime } from '../services/sound';

export interface ChatMessage {
  id: string;
  authorName: string;
  authorRole: 'TECHNICIAN' | 'CLIENT';
  message: string;
  createdAt: string;
}

interface TicketChatPushPayload {
  ticketId: string;
  responseId?: string;
  authorName: string;
  authorRole: string;
  message: string;
  createdAt?: string;
}

interface LiveChatDrawerProps {
  activeTicket: ActiveTicket;
  attribution: ShiftWorkerAttribution | null;
  onTicketResolved: () => void;
}

export const LiveChatDrawer: React.FC<LiveChatDrawerProps> = ({
  activeTicket,
  attribution,
  onTicketResolved,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial welcome/technician acknowledgment
  useEffect(() => {
    const initial: ChatMessage[] = [
      {
        id: 'msg-init-1',
        authorName: 'MSP Dispatcher',
        authorRole: 'TECHNICIAN',
        message: `Ticket #${activeTicket.id.slice(0, 8)} opened. Assigned to ${
          activeTicket.assignedTechName || 'On-Duty Support Engineer'
        }. Hardware telemetry attached.`,
        createdAt: activeTicket.createdAt || new Date().toISOString(),
      },
    ];
    setMessages(initial);
  }, [activeTicket.id, activeTicket.assignedTechName, activeTicket.createdAt]);

  // Listen for real-time WebSocket push frames forwarded from Tauri
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const registerListener = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        unlisten = await listen<TicketChatPushPayload>('ticket_chat_push', (event) => {
          if (event.payload.ticketId === activeTicket.id) {
            setMessages((prev) => [
              ...prev,
              {
                id: event.payload.responseId || `resp-${Date.now()}`,
                authorName: event.payload.authorName || 'Technician',
                authorRole: 'TECHNICIAN',
                message: event.payload.message,
                createdAt: event.payload.createdAt || new Date().toISOString(),
              },
            ]);
            playNotificationChime();
          }
        });
      } catch {
        // Standalone browser preview mode
      }
    };
    registerListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [activeTicket.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const text = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);

    const newMsg: ChatMessage = {
      id: `client-${Date.now()}`,
      authorName: attribution?.reporterName || 'Workstation User',
      authorRole: 'CLIENT',
      message: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);

    try {
      await sendChatMessage(
        activeTicket.id,
        attribution?.reporterName || 'Workstation User',
        text
      );
    } catch (err) {
      console.error('Failed to dispatch chat message', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleResolve = async () => {
    if (!confirm('Mark this support ticket as resolved?')) return;
    setIsResolving(true);
    try {
      await resolveTicket(activeTicket.id);
      onTicketResolved();
    } catch (err) {
      console.error('Failed to resolve ticket', err);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="flex flex-col h-[400px] bg-[#090e1a]/95 border border-[#1b263b] rounded-xl overflow-hidden shadow-2xl">
      {/* Active Ticket Banner */}
      <div className="bg-[#0d1526] px-3 py-2 border-b border-[#1b2840] flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          <div className="truncate">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-[#0084ff] font-semibold">
                #{activeTicket.id.slice(0, 8)}
              </span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-[#0084ff]/15 text-[#38bdf8] border border-[#0084ff]/30 font-bold tracking-wider uppercase">
                {activeTicket.status}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-200 truncate">
              {activeTicket.title}
            </p>
          </div>
        </div>

        <button
          onClick={handleResolve}
          disabled={isResolving}
          className="px-2 py-1 rounded bg-[#131d30] hover:bg-emerald-600/20 hover:text-emerald-400 border border-[#22324e] hover:border-emerald-500/40 text-[10px] font-medium text-slate-300 transition-colors flex items-center gap-1 shrink-0"
          title="Mark ticket as solved"
        >
          <CheckCircle className="w-3 h-3 text-emerald-400" />
          Resolve
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.map((m) => {
          const isTech = m.authorRole === 'TECHNICIAN';
          return (
            <div
              key={m.id}
              className={`flex flex-col ${isTech ? 'items-start' : 'items-end'}`}
            >
              <div className="flex items-center gap-1 mb-0.5 px-1">
                {isTech ? (
                  <Headphones className="w-3 h-3 text-[#0084ff]" />
                ) : (
                  <UserCheck className="w-3 h-3 text-[#ff5e00]" />
                )}
                <span className="text-[10px] text-slate-400 font-medium">
                  {m.authorName}
                </span>
                <span className="text-[9px] text-slate-500 font-mono">
                  {new Date(m.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div
                className={`max-w-[85%] rounded-xl px-3 py-1.5 text-xs leading-relaxed ${
                  isTech
                    ? 'bg-[#0d1a30] border border-[#0084ff]/35 text-slate-100 rounded-tl-sm shadow-sm shadow-[#0084ff]/10'
                    : 'bg-[#151f33] border border-[#243552] text-slate-100 rounded-tr-sm'
                }`}
              >
                {m.message}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSend}
        className="p-2 bg-[#0c1322] border-t border-[#1a263d] flex items-center gap-1.5"
      >
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Reply to support engineer..."
          className="flex-1 bg-[#060a12] border border-[#1a263d] focus:border-[#0084ff] rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim() || isSending}
          className="w-7 h-7 rounded-lg bg-gradient-to-r from-[#0070db] to-[#0084ff] hover:from-[#0060c2] hover:to-[#0070db] text-white flex items-center justify-center transition-all disabled:opacity-40 shadow-sm shadow-[#0084ff]/30 active:scale-95"
        >
          <Send className="w-3.5 h-3.5 text-white" />
        </button>
      </form>
    </div>
  );
};
