import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Page } from "@/components/Page";
import { useCRMStore } from "@/store/useCRMStore";
import { usePlanStore } from "@/store/usePlanStore";
import { useSubscriptionStore } from "@/store/useSubscriptionStore";
import { useUrlState } from "@/hooks/useUrlState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { CRMDataTable } from "@/pages/CRMPage/components/CRMDataTable";
import { CRMKanbanBoard } from "@/pages/CRMPage/components/CRMKanbanBoard";
import { CRMLeadDetailSheet } from "@/pages/CRMPage/components/CRMLeadDetailSheet";
import { CRMNewLeadModal } from "@/pages/CRMPage/components/CRMNewLeadModal";
import type { Lead, LeadStage, QuotationStatus } from "@/services/crmService";
import {
  LayoutList,
  Kanban,
  Plus,
  TrendingUp,
  DollarSign,
  Briefcase,
  Target,
  CalendarClock,
} from "lucide-react";

const VALID_STAGES = ["NEW", "QUALIFIED", "PROPOSITION", "WON", "LOST"];
const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

type LeadPriorityAlias = "LOW" | "MEDIUM" | "HIGH";

function getErrorMessage(err: unknown): string | undefined {
  return err instanceof Error && err.message ? err.message : undefined;
}

export function CRMPage() {
  const { t } = useTranslation();
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
    updateLeadStage,
    bulkUpdateStage,
    sendQuotation,
    resendQuotation,
    updateQuotationStatus,
    convertLeadToSubscription,
    logActivity,
    updateActivity,
    modifySubscription,
    cancelSubscription,
  } = useCRMStore();

  const { plans, fetchPlans } = usePlanStore();
  const { clients, activeSubscriptions, fetchClients, fetchActiveSubscriptions } = useSubscriptionStore();

  const { getParam, setParams, removeParam } = useUrlState();

  const paramView = getParam("view") === "kanban" ? "kanban" : "table";
  const paramSearch = getParam("search");
  const paramStage = VALID_STAGES.includes(getParam("stage")) ? getParam("stage") : "";
  const paramPriority = VALID_PRIORITIES.includes(getParam("priority")) ? getParam("priority") : "";
  const paramPage = Math.max(1, parseInt(getParam("page", "1"), 10) || 1);
  const paramLeadId = getParam("lead");
  const isNewLeadModalOpen = getParam("openModal") === "new-lead";

  const [cancelSubId, setCancelSubId] = useState<string | null>(null);

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
      limit: filters.limit || 25,
    });
  }, [paramSearch, paramStage, paramPriority, paramPage, filters.limit, setFilters]);

  useEffect(() => {
    if (paramLeadId) {
      fetchLeadDetail(paramLeadId);
    }
  }, [paramLeadId, fetchLeadDetail]);

  const handleViewChange = useCallback(
    (mode: "table" | "kanban") => {
      setParams({ view: mode === "table" ? null : mode });
    },
    [setParams],
  );

  const handleSearchChange = useCallback((val: string) => setParams({ search: val || null, page: null }), [setParams]);
  const handleStageFilterChange = useCallback((val: string) => setParams({ stage: val || null, page: null }), [setParams]);
  const handlePriorityFilterChange = useCallback((val: string) => setParams({ priority: val || null, page: null }), [setParams]);
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

  const customerSubsForSelectedLead = selectedLead?.client_id
    ? activeSubscriptions.filter((s) => s.client_id === selectedLead.client_id)
    : [];

  const isDetailSheetOpen = Boolean(paramLeadId && selectedLead);

  return (
    <Page
      title={t("crm.title")}
      subtitle={t("crm.subtitle")}
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted p-0.5 rounded-lg border border-border">
            <Button
              type="button"
              size="sm"
              variant={paramView === "table" ? "secondary" : "ghost"}
              onClick={() => handleViewChange("table")}
              className="h-7 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span>{t("crm.views.table")}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant={paramView === "kanban" ? "secondary" : "ghost"}
              onClick={() => handleViewChange("kanban")}
              className="h-7 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>{t("crm.views.kanban")}</span>
            </Button>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => setParams({ openModal: "new-lead" })}
            className="h-7 px-3 text-xs font-semibold gap-1 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t("crm.newLead")}</span>
          </Button>
        </div>
      }
    >
      {/* 1. Top KPI Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <Card className="shadow-xs">
          <CardContent className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-heading">
                {t("crm.stats.pipelineValue")}
              </span>
              <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xl font-bold font-heading text-foreground">
                ${(stats?.pipelineValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-muted-foreground block font-mono">
                {stats?.totalLeads || 0} {t("crm.totalLeads")}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-heading">
                {t("crm.stats.wonRevenue")}
              </span>
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xl font-bold font-heading text-emerald-600 dark:text-emerald-400">
                ${(stats?.wonRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-muted-foreground block font-mono">
                {stats?.stageBreakdown?.WON?.count || 0} {t("crm.stages.won")}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-heading">
                {t("crm.stats.proposals")}
              </span>
              <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Briefcase className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xl font-bold font-heading text-foreground">{stats?.leadsInProposition || 0}</span>
              <span className="text-[10px] text-muted-foreground block font-mono">
                ${(stats?.stageBreakdown?.PROPOSITION?.value || 0).toFixed(2)} {t("crm.inQuotes")}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-heading">
                {t("crm.stats.winRate")}
              </span>
              <div className="h-7 w-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Target className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xl font-bold font-heading text-foreground">{stats?.conversionRate || 0}%</span>
              <span className="text-[10px] text-muted-foreground block font-mono">{t("crm.stats.conversionDesc")}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 1b. Due Follow-ups Driven by GET /crm/activities */}
      {upcomingActivities.length > 0 && (
        <Card className="mb-6 shadow-xs border-amber-500/30">
          <CardContent className="p-4">
            <h4 className="text-xs font-bold font-heading uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
              <CalendarClock className="h-4 w-4 text-amber-600" />
              {t("crm.followUps.title")}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {upcomingActivities.slice(0, 6).map((act) => {
                const isOverdue = act.due_date ? new Date(act.due_date).getTime() < now : false;
                return (
                  <Button
                    key={act.id}
                    type="button"
                    variant="outline"
                    onClick={() =>
                      openLeadSheet({
                        id: act.lead_id,
                        contact_name: act.lead_contact_name || "",
                      } as Lead)
                    }
                    className="h-auto w-full p-2.5 text-left justify-start flex-col items-start bg-card border-border hover:border-primary/50 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {act.title}
                      </span>
                      <span className={`text-[10px] font-mono shrink-0 ${isOverdue ? "text-red-500 font-bold" : "text-muted-foreground"}`}>
                        {act.due_date &&
                          new Date(act.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block mt-0.5 truncate font-normal">
                      {act.lead_contact_name}
                      {act.lead_company_name ? ` • ${act.lead_company_name}` : ""}
                    </span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Main View (DataTable vs Kanban) */}
      {paramView === "table" ? (
        <CRMDataTable
          leads={leads}
          total={totalLeads}
          loading={loading}
          onSelectLead={openLeadSheet}
          onUpdateStage={handleQuickUpdateStage}
          onBulkUpdateStage={handleBulkUpdateStage}
          search={paramSearch}
          onSearchChange={handleSearchChange}
          stageFilter={paramStage}
          onStageFilterChange={handleStageFilterChange}
          priorityFilter={paramPriority}
          onPriorityFilterChange={handlePriorityFilterChange}
          page={paramPage}
          limit={filters.limit || 25}
          onPageChange={handlePageChange}
        />
      ) : (
        <CRMKanbanBoard
          leads={leads}
          stats={stats}
          onSelectLead={openLeadSheet}
          onUpdateStage={handleQuickUpdateStage}
        />
      )}

      {/* 3. Lead Detail Sheet / Drawer */}
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
            await convertLeadToSubscription(leadId, payload);
          }}
          onLogActivity={async (payload) => {
            if (selectedLead) {
              await logActivity(selectedLead.id, payload);
            }
          }}
          onUpdateActivity={async (activityId, data) => {
            await updateActivity(activityId, data);
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
