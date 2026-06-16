import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Headphones,
  Wrench,
  CloudUpload,
  ArrowRight,
  Cloud,
} from 'lucide-react';
import { ticketService } from '../services/ticketService';
import { subscriptionService } from '../services/subscriptionService';
import type { Subscription } from '../services/subscriptionService';
import { invoiceService } from '../services/invoiceService';
import type { Invoice } from '../services/invoiceService';

export function ClientDashboard() {
  const navigate = useNavigate();
  const [statusSummary, setStatusSummary] = useState<Record<string, number>>({});
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [summary, subs, invData] = await Promise.all([
          ticketService.getStatusSummary(),
          subscriptionService.getAll(),
          invoiceService.getAll(1, 3),
        ]);
        setStatusSummary(summary);
        setSubscriptions(subs);
        setInvoices(invData.data);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const openTickets = (statusSummary.OPEN || 0) + (statusSummary.IN_PROGRESS || 0);
  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-success/10 text-success',
      EXPIRING: 'bg-warning/10 text-warning',
      EXPIRED: 'bg-error/10 text-error',
      PENDING: 'bg-warning/10 text-warning',
      PAID: 'bg-success/10 text-success',
      OVERDUE: 'bg-error/10 text-error',
    };
    return colors[status] || 'bg-surface-container text-on-surface-variant';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      {/* Welcome Area */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-h1 text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
            System Overview
          </h1>
          <p className="text-body-lg text-on-surface-variant mt-1">
            All systems operational and secure.
          </p>
        </div>
        <button
          onClick={() => navigate('/tickets?action=new')}
          className="bg-primary text-on-primary px-5 py-2.5 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity text-label-md"
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </button>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
        {/* Status Cards — spans 8 cols */}
        <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Support Status */}
          <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex flex-col shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <Headphones className="h-6 w-6 text-secondary" />
              <span className={`px-2 py-0.5 rounded text-label-sm font-bold ${openTickets > 0 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                {openTickets > 0 ? `${openTickets} OPEN` : 'ALL CLEAR'}
              </span>
            </div>
            <h3 className="text-label-md text-on-surface-variant">Technical Support</h3>
            <p className="text-h3 mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
              Active Tickets
            </p>
            <div className="mt-auto pt-3 border-t border-outline-variant mt-4">
              <Link
                to="/tickets"
                className="text-label-md text-primary hover:underline flex items-center gap-1"
              >
                View details <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Maintenance */}
          <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex flex-col shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <Wrench className="h-6 w-6 text-secondary" />
              <span className="bg-success/10 text-success px-2 py-0.5 rounded text-label-sm font-bold">
                SCHEDULED
              </span>
            </div>
            <h3 className="text-label-md text-on-surface-variant">Maintenance</h3>
            <p className="text-h3 mt-1" style={{ fontFamily: 'var(--font-heading)' }}>15 Oct 2024</p>
            <div className="mt-auto pt-3 border-t border-outline-variant mt-4">
              <span className="text-label-md text-on-surface-variant">Preventive network review</span>
            </div>
          </div>

          {/* Backups */}
          <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex flex-col shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <CloudUpload className="h-6 w-6 text-secondary" />
              <span className="bg-success/10 text-success px-2 py-0.5 rounded text-label-sm font-bold">
                SUCCESSFUL
              </span>
            </div>
            <h3 className="text-label-md text-on-surface-variant">Last Backup</h3>
            <p className="text-h3 mt-1" style={{ fontFamily: 'var(--font-heading)' }}>2 hours ago</p>
            <div className="mt-auto pt-3 border-t border-outline-variant mt-4">
              <span className="text-label-md text-on-surface-variant">Main DB Server</span>
            </div>
          </div>
        </div>

        {/* Cloud Storage — spans 4 cols */}
        <div className="md:col-span-4 bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex flex-col shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-h3" style={{ fontFamily: 'var(--font-heading)' }}>
              Cloud Storage
            </h3>
            <Cloud className="h-5 w-5 text-on-surface-variant" />
          </div>
          <div className="flex-1 flex flex-col justify-center items-center py-4">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--color-surface-container-high)" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="50"
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 50 * 0.72} ${2 * Math.PI * 50 * 0.28}`}
                />
              </svg>
              <span className="absolute text-h2 text-primary" style={{ fontFamily: 'var(--font-heading)' }}>72%</span>
            </div>
          </div>
          <div className="mt-auto">
            <div className="flex justify-between text-label-md mb-1">
              <span className="text-on-surface-variant">Used: 3.6 TB</span>
              <span className="text-on-surface-variant">Total: 5.0 TB</span>
            </div>
            <div className="w-full bg-surface-container-high rounded-full h-2">
              <div className="bg-primary h-2 rounded-full transition-all" style={{ width: '72%' }} />
            </div>
          </div>
        </div>

        {/* Active Subscriptions — spans 8 cols */}
        {subscriptions.length > 0 && (
          <div className="md:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-outline-variant flex justify-between items-center">
              <h3 className="text-h3" style={{ fontFamily: 'var(--font-heading)' }}>
                Active Subscriptions
              </h3>
              <Link to="/plans" className="text-label-md text-primary hover:underline">
                Manage
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface border-b border-outline-variant">
                    <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase">Service</th>
                    <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase">Plan</th>
                    <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase">Status</th>
                    <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase">Renewal</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b border-surface-container-high hover:bg-surface-container-low transition-colors h-12">
                      <td className="px-4 py-3 text-body-md font-medium">{sub.service_name}</td>
                      <td className="px-4 py-3 text-body-md text-on-surface-variant">{sub.plan}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-label-sm font-bold ${statusColor(sub.status)}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-body-md text-on-surface-variant">
                        {new Date(sub.renewal_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Invoices — spans 8 cols if no subs, else below */}
        <div className={`${subscriptions.length > 0 ? 'md:col-span-8' : 'md:col-span-8'} bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm`}>
          <div className="p-4 border-b border-outline-variant flex justify-between items-center">
            <h3 className="text-h3" style={{ fontFamily: 'var(--font-heading)' }}>
              Recent Invoices
            </h3>
            <Link to="/billing" className="text-label-md text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface border-b border-outline-variant">
                  <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase">Invoice No.</th>
                  <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase">Date</th>
                  <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase">Amount</th>
                  <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-surface-container-high hover:bg-surface-container-low transition-colors h-12">
                    <td className="px-4 py-3 text-mono">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-body-md text-on-surface-variant">
                      {new Date(inv.invoice_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-body-md font-medium">${inv.total.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-label-sm font-bold ${statusColor(inv.status)}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-body-md text-on-surface-variant">
                      No invoices found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Promo Banner — spans 4 cols */}
        <div className="md:col-span-4 relative rounded-xl border border-outline-variant overflow-hidden shadow-sm">
          <div className="absolute inset-0 bg-primary z-0" />
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 bg-inverse-primary/20 rounded-full blur-2xl z-0 pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-32 h-32 bg-secondary/20 rounded-full blur-2xl z-0 pointer-events-none" />
          <div className="relative z-10 p-6 h-full flex flex-col">
            <span className="inline-block mb-4 bg-inverse-primary/20 text-inverse-primary px-2 py-0.5 rounded text-label-sm border border-inverse-primary/30 self-start">
              RECOMMENDED UPGRADE
            </span>
            <h3 className="text-h3 text-on-primary mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
              Enterprise MSP Plan
            </h3>
            <p className="text-body-md text-surface-container-highest mb-6 flex-1">
              Secure your infrastructure with 24/7 monitoring, immediate response, advanced DDoS mitigation, and daily geo-redundant backups.
            </p>
            <Link
              to="/plans"
              className="bg-on-primary text-primary w-full py-2.5 rounded-lg text-label-md hover:bg-surface-container-low transition-colors flex items-center justify-center gap-1"
            >
              View plan details
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
