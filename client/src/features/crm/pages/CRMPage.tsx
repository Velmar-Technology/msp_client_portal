import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Page } from "@/components/Page";
import { useCRMStore } from "@/store/useCRMStore";
import { usePlanStore } from "@/store/usePlanStore";
import { useSubscriptionStore } from "@/store/useSubscriptionStore";
import { useUrlState } from "@/hooks/useUrlState";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CRMDataTable } from "../components/CRMDataTable";
import { CRMKanbanBoard } from "../components/CRMKanbanBoard";
import { CRMLeadDetailSheet } from "../components/CRMLeadDetailSheet";
import { CRMNewLeadModal } from "../components/CRMNewLeadModal";
import type { Lead, LeadStage, QuotationStatus } from "../api/crmService";
import type { PageCalendarEvent, PageGraphDataPoint } from "@/components/page/types";
import {
  LayoutList,
  Kanban,
  Calendar as CalendarIcon,
  BarChart3,
  Plus,
  Sparkles,
  TrendingUp,
  DollarSign,
  Briefcase,
  Target,
} from "lucide-react";

import { CRM_VALID_STAGES as VALID_STAGES, CRM_VALID_PRIORITIES as VALID_PRIORITIES } from "@/constants/crm";

type LeadPriorityAlias = "LOW" | "MEDIUM" | "HIGH";
type CrmViewMode = "list" | "kanban" | "calendar" | "graph";

function getErrorMessage(err: unknown): string | undefined {
  return err instanceof Error && err.message ? err.message : undefined;
}

export function CRMPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [now] = useState(() => Date.now());

  const {
    leads,
    totalLeads,
    stats,
    selectedLead,
    leadActivities,
    leadQuotations,
    upcomingActivities,
    loading,
    actionLoading,
    filters,
    setFilters,
    setSelectedLead,
    fetchStats,
    fetchUpcomingActivities,
    fetchLeadDetail,
    createLead,
    updateLead,
    updateLeadStage,
    bulkUpdateStage,
    deleteLead,
    bulkDeleteLeads,
    sendQuotation,
    resendQuotation,
    updateQuotationStatus,
    convertLeadToSubscription,
    logActivity,
    updateActivity,
    deleteActivity,
    modifySubscription,
    cancelSubscription,
  } = useCRMStore();

  const { plans, fetchPlans } = usePlanStore();
  const { clients, activeSubscriptions, fetchClients, fetchActiveSubscriptions } = useSubscriptionStore();

  const { getParam, setParams, removeParam } = useUrlState();

  const rawView = getParam("view");
  const currentView: CrmViewMode =
    rawView === "kanban" || rawView === "calendar" || rawView === "graph"
      ? rawView
      : "list";

  const paramSearch = getParam("search");
  const paramStage = VALID_STAGES.includes(getParam("stage") as any) ? getParam("stage") : "";
  const paramPriority = (VALID_PRIORITIES as readonly string[]).includes(getParam("priority"))
    ? getParam("priority")
    : "";

  const paramPage = Math.max(1, parseInt(getParam("page", "1"), 10) || 1);
  const paramLeadId = getParam("lead");
  const isNewLeadModalOpen = getParam("openModal") === "new-lead";

  const [cancelSubId, setCancelSubId] = useState<string | null>(null);

  // Normalize legacy ?view=table to standard list
  useEffect(() => {
    if (rawView === "table") {
      setParams({ view: null });
    }
  }, [rawView, setParams]);

  useEffect(() => {
    fetchPlans();
    fetchClients();
    fetchActiveSubscriptions();
    fetchStats();
    fetchUpcomingActivities();
  }, [fetchPlans, fetchClients, fetchActiveSubscriptions, fetchStats, fetchUpcomingActivities]);

  useEffect(() => {
    setFilters({
      search: paramSearch || undefined,
      stage: (paramStage || undefined) as LeadStage | undefined,
      priority: (paramPriority || undefined) as LeadPriorityAlias | undefined,
      page: paramPage,
      limit: filters.limit || 10,
    });
  }, [paramSearch, paramStage, paramPriority, paramPage, filters.limit, setFilters]);

  useEffect(() => {
    if (paramLeadId) {
      fetchLeadDetail(paramLeadId);
    }
  }, [paramLeadId, fetchLeadDetail]);

  const handleViewChange = useCallback(
    (mode: string) => {
      setParams({ view: mode === "list" ? null : mode });
    },
    [setParams],
  );

  const crmViews = useMemo(
    () => [
      { value: "list", label: t("crm.views.list", "List"), icon: LayoutList, title: t("crm.views.list", "List") },
      { value: "kanban", label: t("crm.views.kanban", "Kanban"), icon: Kanban, title: t("crm.views.kanban", "Kanban") },
      { value: "calendar", label: t("crm.views.calendar", "Activities"), icon: CalendarIcon, title: t("crm.views.calendar", "Activities") },
      { value: "graph", label: t("crm.views.graph", "Analytics"), icon: BarChart3, title: t("crm.views.graph", "Analytics") },
    ],
    [t],
  );

  const handleSearchChange = useCallback((val: string) => setParams({ search: val || null, page: null }), [setParams]);
  const handleStageFilterChange = useCallback(
    (val: string) => setParams({ stage: val || null, page: null }),
    [setParams],
  );
  const handlePriorityFilterChange = useCallback(
    (val: string) => setParams({ priority: val || null, page: null }),
    [setParams],
  );
  const handlePageChange = useCallback((page: number) => setParams({ page: page > 1 ? page : null }), [setParams]);

  const openLeadSheet = useCallback(
    (lead: Lead) => {
      setSelectedLead(lead);
      setParams({ lead: lead.id });
    },
    [setSelectedLead, setParams],
  );

  const closeLeadSheet = useCallback(() => {
    setSelectedLead(null);
    removeParam("lead");
  }, [setSelectedLead, removeParam]);

  const handleQuickUpdateStage = useCallback(
    async (id: string, stage: LeadStage) => {
      try {
        await updateLeadStage(id, stage);
        toast.success(t("crm.stageUpdatedSuccess"));
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || t("crm.stageUpdateError"));
      }
    },
    [updateLeadStage, t],
  );

  const handleBulkUpdateStage = useCallback(
    async (ids: string[], stage: LeadStage) => {
      try {
        await bulkUpdateStage(ids, stage);
        toast.success(t("crm.bulkStageSuccess"));
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || t("crm.bulkStageError"));
      }
    },
    [bulkUpdateStage, t],
  );

  const handleDeleteLead = useCallback(
    async (id: string) => {
      try {
        await deleteLead(id);
        toast.success(t("crm.deleteSuccess"));
        if (paramLeadId === id) {
          closeLeadSheet();
        }
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || t("crm.deleteError"));
      }
    },
    [deleteLead, paramLeadId, closeLeadSheet, t],
  );

  const handleBulkDeleteLeads = useCallback(
    async (ids: string[]) => {
      try {
        await bulkDeleteLeads(ids);
        toast.success(t("crm.bulkDeleteSuccess"));
        if (paramLeadId && ids.includes(paramLeadId)) {
          closeLeadSheet();
        }
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || t("crm.bulkDeleteError"));
      }
    },
    [bulkDeleteLeads, paramLeadId, closeLeadSheet, t],
  );

  const handleCalendarEventClick = useCallback(
    (evt: PageCalendarEvent) => {
      const leadId = (evt.data as { leadId?: string } | undefined)?.leadId;
      if (!leadId) return;
      const existingLead = leads.find((l) => l.id === leadId);
      if (existingLead) {
        openLeadSheet(existingLead);
      } else {
        fetchLeadDetail(leadId);
        setParams({ lead: leadId });
      }
    },
    [leads, openLeadSheet, fetchLeadDetail, setParams],
  );

  const calendarEvents: PageCalendarEvent[] = useMemo(() => {
    return upcomingActivities
      .filter((act) => Boolean(act.due_date))
      .map((act) => {
        const dueDate = new Date(act.due_date!);
        const isOverdue = dueDate.getTime() < now;
        let variant: "default" | "primary" | "success" | "warning" | "destructive" | "info" = "primary";
        if (isOverdue) {
          variant = "destructive";
        } else if (act.activity_type === "CALL") {
          variant = "info";
        } else if (act.activity_type === "MEETING") {
          variant = "warning";
        } else if (act.activity_type === "EMAIL_SENT") {
          variant = "success";
        }

        return {
          id: act.id,
          title: `${act.title}${act.lead_company_name ? ` • ${act.lead_company_name}` : ""}`,
          date: dueDate,
          time: dueDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          variant,
          data: {
            leadId: act.lead_id,
            activity: act,
          },
        };
      });
  }, [upcomingActivities, now]);

  const stagePipelineData: PageGraphDataPoint[] = useMemo(() => {
    const breakdown = (stats?.stageBreakdown || {}) as Record<string, { count: number; value: number } | undefined>;
    const stageLabels: Record<string, string> = {
      NEW: t("crm.stages.new", "New"),
      QUALIFIED: t("crm.stages.qualified", "Qualified"),
      PROPOSITION: t("crm.stages.proposition", "Proposition"),
      NEGOTIATION: t("crm.stages.negotiation", "Negotiation"),
      WON: t("crm.stages.won", "Won"),
      LOST: t("crm.stages.lost", "Lost"),
    };
    const stageColors: Record<string, string> = {
      NEW: "#3b82f6",
      QUALIFIED: "#06b6d4",
      PROPOSITION: "#f59e0b",
      NEGOTIATION: "#8b5cf6",
      WON: "#10b981",
      LOST: "#ef4444",
    };

    return VALID_STAGES.map((stg) => {
      const stageData = breakdown[stg] || { count: 0, value: 0 };
      const numVal = Number(stageData.value || 0);
      return {
        label: stageLabels[stg] || stg,
        value: numVal,
        color: stageColors[stg],
        formattedValue: `$${numVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${stageData.count} leads)`,
      };
    });
  }, [stats?.stageBreakdown, t]);

  const stageLeadCountData: PageGraphDataPoint[] = useMemo(() => {
    const breakdown = (stats?.stageBreakdown || {}) as Record<string, { count: number; value: number } | undefined>;
    const stageLabels: Record<string, string> = {
      NEW: t("crm.stages.new", "New"),
      QUALIFIED: t("crm.stages.qualified", "Qualified"),
      PROPOSITION: t("crm.stages.proposition", "Proposition"),
      NEGOTIATION: t("crm.stages.negotiation", "Negotiation"),
      WON: t("crm.stages.won", "Won"),
      LOST: t("crm.stages.lost", "Lost"),
    };
    const stageColors: Record<string, string> = {
      NEW: "#3b82f6",
      QUALIFIED: "#06b6d4",
      PROPOSITION: "#f59e0b",
      NEGOTIATION: "#8b5cf6",
      WON: "#10b981",
      LOST: "#ef4444",
    };

    return VALID_STAGES.map((stg) => {
      const stageData = breakdown[stg] || { count: 0, value: 0 };
      return {
        label: stageLabels[stg] || stg,
        value: Number(stageData.count || 0),
        color: stageColors[stg],
        formattedValue: `${stageData.count} leads`,
      };
    });
  }, [stats?.stageBreakdown, t]);

  const customerSubsForSelectedLead = selectedLead?.client_id
    ? activeSubscriptions.filter((s) => s.client_id === selectedLead.client_id)
    : [];

  const isDetailSheetOpen = Boolean(paramLeadId && selectedLead);

  return (
    <Page
      activeView={currentView}
      onViewChange={handleViewChange}
      defaultView="list"
      availableViews={crmViews}
      totalCount={totalLeads}
      defaultPage={paramPage}
      defaultPageSize={filters.limit || 10}
    >
      <Page.Header>
        <Page.Breadcrumbs className="mb-2 text-muted-foreground text-xs" />
        <Page.HeaderRow>
          <Page.TitleGroup>
            <Page.Title>{t("crm.title")}</Page.Title>
            <Page.Description>{t("crm.subtitle")}</Page.Description>
          </Page.TitleGroup>
          <Page.Actions maxVisible={3}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate(selectedLead ? `/crm/custom-plans?lead=${selectedLead.id}` : "/crm/custom-plans")}
              className="h-7 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer border-primary/30 text-primary hover:bg-primary/5 shadow-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t("crm.customPlan.btnTitle", "Custom Plan Studio")}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setParams({ openModal: "new-lead" })}
              className="h-7 px-3 text-xs font-semibold gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t("crm.newLead")}</span>
            </Button>
          </Page.Actions>
        </Page.HeaderRow>
        <Page.Toolbar>
          <Page.Filters />
          <Page.Controls>
            <Page.ViewSwitcher />
          </Page.Controls>
        </Page.Toolbar>
      </Page.Header>

      <div className="flex flex-col gap-4">
        {/* 1. Persistent CRM Metrics Strip */}
        <section aria-label="CRM Metrics">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title={t("crm.stats.pipelineValue")}
              value={`$${(stats?.pipelineValue || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
              description={`${stats?.totalLeads || 0} ${t("crm.totalLeads")}`}
              icon={<DollarSign className="h-4 w-4" />}
            />

            <MetricCard
              title={t("crm.stats.wonRevenue")}
              value={`$${(stats?.wonRevenue || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
              description={`${stats?.stageBreakdown?.WON?.count || 0} ${t("crm.stages.won")}`}
              icon={<TrendingUp className="h-4 w-4" />}
            />

            <MetricCard
              title={t("crm.stats.proposals")}
              value={stats?.leadsInProposition || 0}
              description={`$${Number(stats?.stageBreakdown?.PROPOSITION?.value || 0).toFixed(2)} ${t("crm.inQuotes")}`}
              icon={<Briefcase className="h-4 w-4" />}
            />

            <MetricCard
              title={t("crm.stats.winRate")}
              value={`${(stats?.conversionRate || 0).toFixed(1)}%`}
              description={t("crm.stats.conversionDesc")}
              icon={<Target className="h-4 w-4" />}
            />
          </div>
        </section>

        {/* 2. List / Table View */}
        <Page.View type="list">
          <section aria-label="CRM Lead List">
            <CRMDataTable
              leads={leads}
              total={totalLeads}
              loading={loading}
              onSelectLead={openLeadSheet}
              onUpdateStage={handleQuickUpdateStage}
              onBulkUpdateStage={handleBulkUpdateStage}
              onDeleteLead={handleDeleteLead}
              onBulkDeleteLeads={handleBulkDeleteLeads}
              search={paramSearch}
              onSearchChange={handleSearchChange}
              stageFilter={paramStage}
              onStageFilterChange={handleStageFilterChange}
              priorityFilter={paramPriority}
              onPriorityFilterChange={handlePriorityFilterChange}
              page={paramPage}
              limit={filters.limit || 10}
              onPageChange={handlePageChange}
            />
          </section>
        </Page.View>

        {/* 3. Kanban Pipeline View */}
        <Page.View type="kanban">
          <section aria-label="CRM Kanban Pipeline">
            <CRMKanbanBoard
              leads={leads}
              stats={stats}
              onSelectLead={openLeadSheet}
              onUpdateStage={handleQuickUpdateStage}
            />
          </section>
        </Page.View>

        {/* 4. Activity Calendar View */}
        <Page.View type="calendar">
          <section aria-label="CRM Activity Calendar">
            <Page.Calendar
              events={calendarEvents}
              onEventClick={handleCalendarEventClick}
            />
          </section>
        </Page.View>

        {/* 5. Pipeline Analytics Graph View */}
        <Page.View type="graph">
          <section aria-label="CRM Pipeline Analytics" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Page.Graph
              title={t("crm.analytics.pipelineByStage", "Pipeline Value by Stage")}
              subtitle={t("crm.analytics.stageDistribution", "Value distribution across active sales stages")}
              data={stagePipelineData}
              valuePrefix="$"
              defaultType="bar"
            />
            <Page.Graph
              title={t("crm.analytics.leadCountByStage", "Lead Volume by Stage")}
              subtitle={t("crm.totalLeads", "Total lead counts per stage")}
              data={stageLeadCountData}
              defaultType="donut"
            />
          </section>
        </Page.View>
      </div>

      {/* 4. Lead Detail Sheet / Drawer */}
      {selectedLead && (
        <CRMLeadDetailSheet
          key={selectedLead.id}
          lead={selectedLead}
          open={isDetailSheetOpen}
          onOpenChange={(open) => {
            if (!open) closeLeadSheet();
          }}
          plans={plans}
          activities={leadActivities}
          quotations={leadQuotations}
          customerSubscriptions={customerSubsForSelectedLead}
          actionLoading={actionLoading}
          onDeleteLead={handleDeleteLead}
          onUpdateLead={async (id, payload) => {
            await updateLead(id, payload);
          }}
          onUpdateStage={async (id, stage, lostReason) => {
            await updateLeadStage(id, stage, lostReason);
          }}
          onSendQuotation={async (payload) => {
            await sendQuotation(payload);
          }}
          onResendQuotation={async (quotationId, customMessage) => {
            await resendQuotation({ quotationId, customMessage });
          }}
          onUpdateQuotationStatus={async (quotationId: string, status: QuotationStatus) => {
            await updateQuotationStatus(quotationId, status);
          }}
          onConvertLead={async (leadId, payload) => {
            return await convertLeadToSubscription(leadId, payload);
          }}
          onLogActivity={async (payload) => {
            if (selectedLead) {
              await logActivity(selectedLead.id, payload);
            }
          }}
          onUpdateActivity={async (activityId, data) => {
            await updateActivity(activityId, data);
          }}
          onDeleteActivity={async (activityId) => {
            await deleteActivity(activityId);
          }}
          onModifySubscription={async (subId, planId, count) => {
            await modifySubscription({ subId, planId, equipmentCount: count, leadId: selectedLead?.id });
            await fetchActiveSubscriptions();
            toast.success(t("crm.modifySubSuccess"));
          }}
          onRequestCancelSubscription={(subId) => setCancelSubId(subId)}
        />
      )}

      {/* 4. New Lead Modal */}
      <CRMNewLeadModal
        open={isNewLeadModalOpen}
        onOpenChange={(open) => {
          if (!open) removeParam("openModal");
        }}
        plans={plans}
        clients={clients}
        onSubmit={async (data) => {
          await createLead(data);
          toast.success(t("crm.createSuccess"));
        }}
      />

      {/* 5. Cancel Subscription Confirmation Dialog */}
      <AlertDialog open={cancelSubId !== null} onOpenChange={(open) => !open && setCancelSubId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("plans.cancelConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("plans.cancelConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90 cursor-pointer"
              onClick={async () => {
                if (cancelSubId) {
                  try {
                    await cancelSubscription({ subId: cancelSubId, leadId: selectedLead?.id });
                    await fetchActiveSubscriptions();
                    toast.success(t("plans.cancelSuccess"));
                  } catch (err: unknown) {
                    toast.error(getErrorMessage(err) || t("plans.cancelFailed"));
                  } finally {
                    setCancelSubId(null);
                  }
                }
              }}
            >
              {t("plans.cancelSubscription")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}

export default CRMPage;
