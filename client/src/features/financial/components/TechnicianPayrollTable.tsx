import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import {
  DollarSign,
  CheckCircle2,
  Clock,
  Download,
  Zap,
  Users,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  earningsService,
  type TechnicianEarning,
  type TechnicianEarningsSummary,
} from '../api/earningsService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function TechnicianPayrollTable() {
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<TechnicianEarningsSummary[]>([]);
  const [earnings, setEarnings] = useState<TechnicianEarning[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [actionAlert, setActionAlert] = useState<{ text: string; isError: boolean } | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await earningsService.getAdminOverview({ status: statusFilter || undefined });
      setSummaries(res.summaries);
      setEarnings(res.items);
    } catch (err) {
      console.error('Failed to load technician earnings overview', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate high-level stats
  const totalBounties = useMemo(() => {
    return earnings.reduce((acc, curr) => (curr.status !== 'VOIDED' ? acc + Number(curr.final_amount) : acc), 0);
  }, [earnings]);

  const pendingTotal = useMemo(() => {
    return earnings
      .filter((e) => e.status === 'PENDING')
      .reduce((acc, curr) => acc + Number(curr.final_amount), 0);
  }, [earnings]);

  const paidTotal = useMemo(() => {
    return earnings
      .filter((e) => e.status === 'PAID')
      .reduce((acc, curr) => acc + Number(curr.final_amount), 0);
  }, [earnings]);

  const handleBatchPayout = async () => {
    if (selectedIds.length === 0) return;
    setProcessing(true);
    setActionAlert(null);
    try {
      const res = await earningsService.processBatchPayout(selectedIds);
      setActionAlert({
        text: `Successfully processed payout for ${res.processed} ticket commissions.`,
        isError: false,
      });
      setSelectedIds([]);
      await loadData();
    } catch (err) {
      console.error('Batch payout failed', err);
      setActionAlert({
        text: 'Failed to process batch payout. Please try again.',
        isError: true,
      });
    } finally {
      setProcessing(false);
      setTimeout(() => setActionAlert(null), 5000);
    }
  };

  const handleRecalculateCommissions = async () => {
    setIsRecalculating(true);
    setActionAlert(null);
    try {
      const res = await earningsService.recalculateCommissions();
      setActionAlert({
        text: `Commissions recalculation completed: evaluated ${res.processedTickets} closed tickets (${res.createdEarnings} created, ${res.updatedEarnings} updated).`,
        isError: false,
      });
      await loadData();
    } catch (err) {
      console.error('Commission recalculation failed', err);
      setActionAlert({
        text: 'Failed to recalculate technician commissions. Please try again.',
        isError: true,
      });
    } finally {
      setIsRecalculating(false);
      setTimeout(() => setActionAlert(null), 6000);
    }
  };

  const handleExportCsv = () => {
    if (earnings.length === 0) return;
    const headers = [
      'Earning ID',
      'Technician Name',
      'Technician Email',
      'Ticket ID',
      'Ticket Title',
      'Priority',
      'Multiplier',
      'Base Amount',
      'SLA Bonus Amount',
      'Final Amount',
      'Currency',
      'Status',
      'Earned Date',
      'Paid Date',
    ];

    const rows = earnings.map((e) => [
      e.id,
      `"${e.technician_name || ''}"`,
      `"${e.technician_email || ''}"`,
      e.ticket_id,
      `"${e.ticket_title || ''}"`,
      e.breakdown?.priority || '',
      e.breakdown?.priorityMultiplier || 1.0,
      e.base_amount,
      e.sla_bonus_amount,
      e.final_amount,
      e.currency,
      e.status,
      e.earned_at,
      e.paid_at || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `technician_payroll_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredEarnings = useMemo(() => {
    return earnings.filter((e) => {
      const matchSearch =
        (e.ticket_title || '').toLowerCase().includes(search.toLowerCase()) ||
        (e.technician_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (e.technician_email || '').toLowerCase().includes(search.toLowerCase()) ||
        e.ticket_id.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [earnings, search]);

  const totalPages = Math.max(1, Math.ceil(filteredEarnings.length / limit));

  const paginatedEarnings = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredEarnings.slice(start, start + limit);
  }, [filteredEarnings, page, limit]);

  const columns = useMemo<ColumnDef<TechnicianEarning>[]>(() => [
    {
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          className="rounded border-border cursor-pointer"
          checked={
            selectedIds.length > 0 &&
            selectedIds.length === filteredEarnings.filter((e) => e.status !== 'PAID' && e.status !== 'VOIDED').length
          }
          onChange={(e) => {
            if (e.target.checked) {
              const eligible = filteredEarnings
                .filter((item) => item.status !== 'PAID' && item.status !== 'VOIDED')
                .map((item) => item.id);
              setSelectedIds(eligible);
            } else {
              setSelectedIds([]);
            }
          }}
        />
      ),
      cell: ({ row }) => {
        const item = row.original;
        const isEligible = item.status !== 'PAID' && item.status !== 'VOIDED';
        if (!isEligible) return null;
        return (
          <input
            type="checkbox"
            className="rounded border-border cursor-pointer"
            checked={selectedIds.includes(item.id)}
            onChange={(e) => {
              e.stopPropagation();
              if (e.target.checked) {
                setSelectedIds((prev) => [...prev, item.id]);
              } else {
                setSelectedIds((prev) => prev.filter((id) => id !== item.id));
              }
            }}
          />
        );
      },
    },
    {
      accessorKey: 'technician_name',
      header: () => <span className="uppercase text-[10px] text-muted-foreground font-bold tracking-wider">Technician</span>,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-foreground">{row.original.technician_name || 'Technician'}</span>
          <span className="text-[10px] text-muted-foreground">{row.original.technician_email}</span>
        </div>
      ),
    },
    {
      accessorKey: 'ticket_title',
      header: () => <span className="uppercase text-[10px] text-muted-foreground font-bold tracking-wider">Ticket</span>,
      cell: ({ row }) => (
        <div className="flex flex-col max-w-44">
          <span className="text-xs font-medium text-foreground truncate">{row.original.ticket_title || 'Support Ticket'}</span>
          <span className="text-[10px] text-muted-foreground font-mono">Ref: {row.original.ticket_id.substring(0, 8)}</span>
        </div>
      ),
    },
    {
      accessorKey: 'breakdown.priorityMultiplier',
      header: () => <span className="uppercase text-[10px] text-muted-foreground font-bold tracking-wider">Priority / Mult.</span>,
      cell: ({ row }) => (
        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-muted text-foreground">
          {row.original.breakdown?.priority || 'NORMAL'} ({row.original.breakdown?.priorityMultiplier || 1.0}x)
        </span>
      ),
    },
    {
      accessorKey: 'sla_bonus_amount',
      header: () => <span className="uppercase text-[10px] text-muted-foreground font-bold tracking-wider">SLA Bonus</span>,
      cell: ({ row }) => {
        const isMet = row.original.breakdown?.slaMet;
        return (
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded ${
              isMet
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {isMet ? <Zap className="h-3 w-3" /> : null}
            {isMet ? `+$${Number(row.original.sla_bonus_amount).toFixed(2)}` : '$0.00'}
          </span>
        );
      },
    },
    {
      accessorKey: 'final_amount',
      header: () => <span className="uppercase text-[10px] text-muted-foreground font-bold tracking-wider">Bounty (OpEx)</span>,
      cell: ({ row }) => (
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
          ${Number(row.original.final_amount).toFixed(2)} {row.original.currency}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: () => <span className="uppercase text-[10px] text-muted-foreground font-bold tracking-wider">Status</span>,
      cell: ({ row }) => {
        const st = row.original.status;
        const colorMap: Record<string, string> = {
          PENDING: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
          APPROVED: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
          PAID: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
          VOIDED: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
        };
        return (
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${colorMap[st] || 'bg-muted text-muted-foreground'}`}>
            {st}
          </span>
        );
      },
    },
    {
      accessorKey: 'earned_at',
      header: () => <span className="uppercase text-[10px] text-muted-foreground font-bold tracking-wider">Date</span>,
      cell: ({ row }) => (
        <span className="text-[11px] text-muted-foreground">
          {new Date(row.original.earned_at).toLocaleDateString()}
        </span>
      ),
    },
  ], [selectedIds, filteredEarnings]);

  return (
    <div className="flex flex-col gap-4">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Bounties (OpEx)</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-foreground mt-1">${totalBounties.toFixed(2)}</p>
          <span className="text-[10px] text-muted-foreground">Incurred labor costs (Pre-split)</span>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending Payouts</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-foreground mt-1">${pendingTotal.toFixed(2)}</p>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Awaiting admin distribution</span>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paid Out</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-foreground mt-1">${paidTotal.toFixed(2)}</p>
          <span className="text-[10px] text-muted-foreground">Settled commissions</span>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Technicians</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xl font-bold text-foreground mt-1">{summaries.length}</p>
          <span className="text-[10px] text-muted-foreground">Registered on roster</span>
        </div>
      </div>

      {/* Action Message Alert */}
      {actionAlert && (
        <Alert variant={actionAlert.isError ? 'destructive' : 'default'} className="animate-fade-in">
          {actionAlert.isError ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-primary" />}
          <AlertTitle>{actionAlert.isError ? 'Error' : 'Success'}</AlertTitle>
          <AlertDescription>{actionAlert.text}</AlertDescription>
        </Alert>
      )}

      {/* Controls & Table Container */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-4 border-b border-border bg-muted/20">
          <div>
            <h3 className="text-sm font-bold text-foreground">Technician Closed-Ticket Commission Ledger</h3>
            <p className="text-xs text-muted-foreground">
              Review and approve technician bounties. All entries auto-record into the OpEx expenses ledger.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRecalculateCommissions}
              disabled={isRecalculating || loading}
              className="h-7 text-xs font-medium gap-1.5 cursor-pointer text-foreground hover:bg-muted"
            >
              <RefreshCw className={`h-3 w-3 ${isRecalculating ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
              <span>{isRecalculating ? 'Recalculating...' : 'Recalculate Financials'}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={earnings.length === 0}
              className="h-7 text-xs font-medium gap-1 cursor-pointer"
            >
              <Download className="h-3 w-3" />
              <span>Export CSV</span>
            </Button>

            {selectedIds.length > 0 && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleBatchPayout}
                disabled={processing}
                className="h-7 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Mark {selectedIds.length} as Paid</span>
              </Button>
            )}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={paginatedEarnings}
          loading={loading}
          noDataMessage="No technician commission entries found."
          className="border-none rounded-none"
          search={{
            value: search,
            onChange: setSearch,
            placeholder: 'Search technician or ticket...',
          }}
          filters={[
            {
              id: 'status',
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: '', label: 'All Statuses' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'PAID', label: 'Paid' },
                { value: 'VOIDED', label: 'Voided' },
              ],
              placeholder: 'Filter by Status',
            },
          ]}
          pagination={{
            page,
            totalPages,
            totalItems: filteredEarnings.length,
            limit,
            onPageChange: (p) => setPage(p),
            onLimitChange: (l) => {
              setLimit(l);
              setPage(1);
            },
          }}
        />
      </div>
    </div>
  );
}
