import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Page } from "@/components/Page";
import { useCRMStore } from "@/store/useCRMStore";
import { usePlanStore } from "@/store/usePlanStore";
import { useSubscriptionStore } from "@/store/useSubscriptionStore";
import { useUrlState } from "@/hooks/useUrlState";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/shared";
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
import { ViewToggle } from "@/components/ui/view-toggle";
import type { Lead, LeadStage, QuotationStatus } from "@/services/crmService";
import { LayoutList, Kanban, Plus, Sparkles, TrendingUp, DollarSign, Briefcase, Target, CalendarClock } from "lucide-react";

import { CRM_VALID_STAGES as VALID_STAGES, CRM_VALID_PRIORITIES as VALID_PRIORITIES } from "@/constants/crm";

type LeadPriorityAlias = "LOW" | "MEDIUM" | "HIGH";

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

  const paramView = getParam("view") === "kanban" ? "kanban" : "table";
  const paramSearch = getParam("search");
  const paramStage = VALID_STAGES.includes(getParam("stage") as any) ? getParam("stage") : "";
  const paramPriority = (VALID_PRIORITIES as readonly string[]).includes(getParam("priority"))
    ? getParam("priority")
    : "";

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
      limit: filters.limit || 10,
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
          <ViewToggle
            size="sm"
            value={paramView}
            onChange={handleViewChange}
            options={[
              { value: "table", icon: LayoutList, label: t("crm.views.table") },
              { value: "kanban", icon: Kanban, label: t("crm.views.kanban") },
            ]}
          />
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <section aria-label="CRM Metrics">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title={t("crm.stats.pipelineValue")}
              value={`$${(stats?.pipelineValue || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
              description={`${stats?.totalLeads || 0} ${t("crm.totalLeads")}`}
              icon={<DollarSign className="h-4 w-4" />}
            />

            <StatCard
              title={t("crm.stats.wonRevenue")}
              value={`$${(stats?.wonRevenue || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
              description={`${stats?.stageBreakdown?.WON?.count || 0} ${t("crm.stages.won")}`}
              icon={<TrendingUp className="h-4 w-4" />}
            />

            <StatCard
              title={t("crm.stats.proposals")}
              value={stats?.leadsInProposition || 0}
              description={`$${Number(stats?.stageBreakdown?.PROPOSITION?.value || 0).toFixed(2)} ${t("crm.inQuotes")}`}
              icon={<Briefcase className="h-4 w-4" />}
            />

            <StatCard
              title={t("crm.stats.winRate")}
              value={`${(stats?.conversionRate || 0).toFixed(1)}%`}
              description={t("crm.stats.conversionDesc")}
              icon={<Target className="h-4 w-4" />}
            />
          </div>
        </section>

        {/* 2. Due Follow-ups Driven by GET /crm/activities (Styled in zinc container) */}
        {upcomingActivities.length > 0 && (
          <section aria-label="Due Follow-ups">
            <div className="rounded-lg border border-zinc-200 bg-white p-3.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center gap-1.5 mb-3">
                <CalendarClock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">{t("crm.followUps.title")}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {upcomingActivities.slice(0, 6).map((act) => {
                  const isOverdue = act.due_date ? new Date(act.due_date).getTime() < now : false;
                  return (
                    <Button
                      key={act.id}
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const existingLead = leads.find((l) => l.id === act.lead_id);
                        if (existingLead) {
                          openLeadSheet(existingLead);
                        } else {
                          fetchLeadDetail(act.lead_id);
                          setParams({ lead: act.lead_id });
                        }
                      }}
                      className="h-auto w-full p-2.5 text-left justify-start flex-col items-start rounded-md border border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/80 cursor-pointer group transition-all"
                    >
                      <div className="flex items-center justify-between gap-2 w-full">
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-primary transition-colors">
                          {act.title}
                        </span>
                        <span
                          className={`text-[10px] font-mono shrink-0 ${
                            isOverdue
                              ? "text-red-600 dark:text-red-400 font-semibold"
                              : "text-zinc-500 dark:text-zinc-400"
                          }`}
                        >
                          {act.due_date &&
                            new Date(act.due_date).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block mt-0.5 truncate font-normal">
                        {act.lead_contact_name}
                        {act.lead_company_name ? ` • ${act.lead_company_name}` : ""}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* 3. Main View (DataTable vs Kanban) */}
        <section aria-label="CRM Pipeline View">
          {paramView === "table" ? (
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
          ) : (
            <CRMKanbanBoard
              leads={leads}
              stats={stats}
              onSelectLead={openLeadSheet}
              onUpdateStage={handleQuickUpdateStage}
            />
          )}
        </section>
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
