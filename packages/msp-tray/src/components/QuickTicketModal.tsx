import React, { useState, useEffect } from 'react';
import { LifeBuoy, Activity, Send, AlertCircle, X } from 'lucide-react';
import { CreateTicketInput, CreateTicketResult, submitTicket } from '../services/tauri';
import { ShiftWorkerAttribution } from '../services/attribution';

interface QuickTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  attribution: ShiftWorkerAttribution | null;
  onTicketCreated: (res: CreateTicketResult) => void;
  initialCategory?: string;
  initialTitle?: string;
  initialPriority?: string;
}

export const QuickTicketModal: React.FC<QuickTicketModalProps> = ({
  isOpen,
  onClose,
  attribution,
  onTicketCreated,
  initialCategory = 'HELPDESK',
  initialTitle = '',
  initialPriority = 'MEDIUM',
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [priority, setPriority] = useState(initialPriority);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setDescription('');
      setCategory(initialCategory || 'HELPDESK');
      setPriority(initialPriority || 'MEDIUM');
      setError(null);
    }
  }, [isOpen, initialCategory, initialTitle, initialPriority]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a brief title of the issue.');
      return;
    }
    if (!description.trim()) {
      setError('Please describe what happened.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const input: CreateTicketInput = {
        reporterName: attribution?.reporterName || 'Workstation Desk Worker',
        reporterEmail: attribution?.reporterEmail || 'support@managed.local',
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
      };

      const result = await submitTicket(input);
      setIsSubmitting(false);
      onTicketCreated(result);
      onClose();
    } catch (err: unknown) {
      setIsSubmitting(false);
      setError(err instanceof Error ? err.message : 'Failed to submit issue');
    }
  };

  return (
    <div className="fixed inset-0 bg-[#04070d]/85 backdrop-blur-sm z-50 flex items-center justify-center p-3">
      <div className="bg-[#0b101c] border border-[#1c2940] rounded-xl w-full max-w-sm p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0084ff]/15 border border-[#0084ff]/30 flex items-center justify-center text-[#0084ff] shadow-sm shadow-[#0084ff]/20">
              <LifeBuoy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-100">Report Support Issue</h3>
              <p className="text-[10px] text-slate-400">Directly routed to Velmar on-duty engineer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {error && (
          <div className="mb-2.5 p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2.5">
          {/* Title */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">Issue Summary</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Outlook freezing when downloading attachments"
              className="w-full bg-[#060912] border border-[#1a263d] focus:border-[#0084ff] rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 outline-none transition-colors"
              autoFocus
            />
          </div>

          {/* Category & Priority grid */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#060912] border border-[#1a263d] focus:border-[#0084ff] rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none"
              >
                <option value="HELPDESK">Helpdesk (General Support)</option>
                <option value="REPAIR">Repair / Hardware</option>
                <option value="SERVICE_OUTAGE">Service / Network Outage</option>
                <option value="PREVENTATIVE_MAINTENANCE">Preventative Maintenance</option>
                <option value="WARRANTY">Warranty & RMA</option>
                <option value="AI">AI & Automation</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-[#060912] border border-[#1a263d] focus:border-[#0084ff] rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none"
              >
                <option value="LOW">Low (General)</option>
                <option value="MEDIUM">Medium (Normal)</option>
                <option value="HIGH">High (Urgent)</option>
                <option value="CRITICAL">Critical (Outage)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">What happened?</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide any error messages, steps to reproduce, or affected programs..."
              className="w-full bg-[#060912] border border-[#1a263d] focus:border-[#0084ff] rounded-lg p-2.5 text-xs text-slate-100 placeholder:text-slate-600 outline-none resize-none transition-colors"
            />
          </div>

          {/* Flight Recorder Telemetry Notice */}
          <div className="p-2.5 rounded-lg bg-gradient-to-r from-[#0c192e]/80 to-[#141221]/80 border border-[#0084ff]/30 text-[#38bdf8] text-[11px] flex items-start gap-2 shadow-sm">
            <Activity className="w-4 h-4 text-[#0084ff] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-slate-200">Flight Recorder Diagnostics</span>
              <p className="text-[10px] text-slate-400 leading-tight">
                Live CPU/RAM vitals, active process table, and recent crash event logs will attach automatically.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#0070db] via-[#0084ff] to-[#0094ff] hover:from-[#0060c2] hover:to-[#0084ff] text-white shadow-lg shadow-[#0084ff]/30 border border-blue-400/30 flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5 text-white" />
              {isSubmitting ? 'Transmitting...' : 'Send Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
