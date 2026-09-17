import { useMemo, useCallback } from "react";
import { Plus, Minus, RefreshCw, Mail, Ban, CreditCard, ShoppingBag, Info, MoreHorizontal } from "lucide-react";
import { Page } from "@/components/Page";
import { Button } from "@/components/ui/button";
import type { ColumnDef } from "@tanstack/react-table";
import type { Subscription } from "../api/subscriptionService";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePlansPage } from "../hooks/usePlansPage";
import { BillingCycleSwitcher } from "../components/BillingCycleSwitcher";
import { PlanCard } from "../components/PlanCard";
import { PaymentSection } from "../components/PaymentSection";
import { ActiveSubscriptionsDashboard } from "../components/ActiveSubscriptionsDashboard";
import { DeletePlanAlertDialog } from "../components/DeletePlanAlertDialog";
import { ChangeTierPanel } from "../components/ChangeTierPanel";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { SUBSCRIPTION_STATUS_COLORS } from "@/constants/subscriptions";
import CheckoutSheet from "@/components/checkout-sheet";

type SubDialogAction = "add_device" | "remove_device" | "cancel" | "pay";

export function PlansPage() {
  const {
    t,
    i18n,
    user,
    loading,
    isAdmin,
    plans,
    filteredPlans,
    clientTypeFilter,
    setClientTypeFilter,
    selectedPlan,
    setUserSelectedPlan,
    equipmentCounts,
    setEquipmentCounts,
    paymentMethod,
    setPaymentMethod,
    acceptedTos,
    setAcceptedTos,
    reference,
    billingCycle,
    setBillingCycle,
    autoRenew,
    setAutoRenew,
    activeTab,
    setActiveTab,
    subscribeLoading,
    paymentMessage,
    activeSubscriptions,
    tierChangeSubId,
    setTierChangeSubId,
    currentPlan,
    currentEquipmentCount,
    getPlanName,
    getPlanDescription,
    getFeatureText,
    getTierLabel,
    handleAdjustEquipmentCount,
    handleProcessSubscription,
    handleUpdateSubscription,
    handleUpdateSubscriptionDirect,
    handleModifySubscription,
    handleDirectCancelSubscription,
    checkoutOpen,
    closeCheckout,
    checkoutAction,
    checkoutSubscription,
    checkoutDeviceDelta,
    setCheckoutDeviceDelta,
    openCheckout,
    handleEditClick,
    handleCreateClick,
    pendingDeletePlanId,
    requestDeletePlan,
    confirmDeletePlan,
    cancelDeletePlan,
  } = usePlansPage();

  const openActionDialog = useCallback((action: SubDialogAction, sub: Subscription) => {
    openCheckout(action, sub);
  }, [openCheckout]);

  const pendingDeletePlanName = useMemo(() => {
    if (!pendingDeletePlanId) return null;
    const plan = plans.find((p) => p.id === pendingDeletePlanId);
    return plan ? getPlanName(plan.name) : pendingDeletePlanId;
  }, [pendingDeletePlanId, plans, getPlanName]);

  const syncEquipmentCount = useCallback(
    (planId: string, count: number) => {
      setEquipmentCounts((prev) => ({ ...prev, [planId]: count }));
    },
    [setEquipmentCounts],
  );

  const getStatusColor = (status: string) => {
    return SUBSCRIPTION_STATUS_COLORS[status] || "bg-muted text-muted-foreground border-border";
  };

  const subscriptionDashboardColumns = useMemo<ColumnDef<Subscription>[]>(
    () => [
      {
        accessorKey: "service_name",
        header: t("plans.serviceName") || "Service Name",
        cell: ({ row }) => (
          <span className="font-semibold text-foreground text-xs font-heading">{row.getValue("service_name")}</span>
        ),
      },
      {
        accessorKey: "plan",
        header: t("plans.tier") || "Tier",
        cell: ({ row }) => {
          const planId = row.getValue("plan") as string;
          return (
            <span className="inline-block px-1.5 py-0.2 border border-border rounded font-mono text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              {getTierLabel(planId)}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: t("plans.status") || "Status",
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          const displayStatus =
            status === "ACTIVE"
              ? t("plans.activeStatus") || "Active"
              : status === "EXPIRING"
                ? t("plans.expiringStatus") || "Cancel Pending"
                : status === "CANCELLED"
                  ? t("plans.cancelledStatus") || "Cancelled"
                  : status;
          return (
            <span
              className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase border ${getStatusColor(
                status,
              )}`}
            >
              {displayStatus}
            </span>
          );
        },
      },
      {
        accessorKey: "renewal_date",
        header: t("plans.renewalDate") || "Renewal Date",
        cell: ({ row }) => {
          const dateStr = row.getValue("renewal_date") as string;
          return (
            <span className="text-xs text-muted-foreground font-mono">
              {new Date(dateStr).toLocaleDateString(i18n.language.startsWith("es") ? "es-DO" : "en-US", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          );
        },
      },
      {
        id: "auto_billing",
        header: t("plans.autoRenewBadge") || "Auto-Renew",
        cell: ({ row }) => {
          const sub = row.original;
          const isAutoBilling = Boolean(
            sub.paypal_order_id &&
              (sub.paypal_order_id.startsWith("I-") || sub.paypal_order_id.startsWith("MOCK-SUB-"))
          );
          return (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase border ${
                isAutoBilling
                  ? "bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:border-primary/40"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {isAutoBilling ? (t("plans.autoRenewActive") || "Auto-Renew Active") : (t("plans.autoRenewManual") || "Manual Invoicing")}
            </span>
          );
        },
      },
      {
        accessorKey: "equipment_count",
        header: t("plans.devicesLimit") || "Devices Limit",
        cell: ({ row }) => (
          <span className="bg-muted text-foreground border border-border px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider">
            {t("plans.devicesCount", { count: row.getValue("equipment_count") })}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => (
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              {t("plans.actions") || "Actions"}
            </span>
          </div>
        ),
        cell: ({ row }) => {
          const sub = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  if (isAdmin) {
                    handleUpdateSubscriptionDirect(sub.id, sub.plan, (sub.equipment_count || 1) + 1);
                  } else {
                    openActionDialog("add_device", sub);
                  }
                }}
                className="h-7 px-2 text-xs font-semibold gap-1 cursor-pointer"
              >
                <span>{t("plans.addDevice") || "Add Device"}</span>
                <Plus className="h-3 w-3" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    className="h-7 w-7 cursor-pointer"
                    aria-label={t("plans.manageTab") || "Manage Subscription"}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48 bg-card text-foreground border border-border"
                >
                  <DropdownMenuItem
                    onClick={() => {
                      if (isAdmin) {
                        handleUpdateSubscriptionDirect(sub.id, sub.plan, (sub.equipment_count || 1) + 1);
                      } else {
                        openActionDialog("add_device", sub);
                      }
                    }}
                    className="cursor-pointer text-xs"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {t("plans.addDevice") || "Add Device"}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    disabled={(sub.equipment_count || 1) <= 1}
                    onClick={() => {
                      if (isAdmin) {
                        handleUpdateSubscriptionDirect(sub.id, sub.plan, (sub.equipment_count || 1) - 1);
                      } else {
                        openActionDialog("remove_device", sub);
                      }
                    }}
                    className="cursor-pointer text-xs disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <Minus className="h-3.5 w-3.5 mr-1" />
                    {t("plans.removeDevice") || "Remove Device"}
                  </DropdownMenuItem>

                  {!isAdmin && (
                    <DropdownMenuItem
                      onClick={() => openActionDialog("pay", sub)}
                      className="cursor-pointer text-xs text-primary font-semibold"
                    >
                      <CreditCard className="h-3.5 w-3.5 mr-1" />
                      {t("plans.payRenewal") || "Pay Renewal"}
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator className="bg-border" />

                  <DropdownMenuItem
                    onClick={() => {
                      setUserSelectedPlan(sub.plan);
                      setTierChangeSubId(sub.id);
                      toast.info(t("plans.changeTierTitle") || "Change Plan Tier", {
                        description: t("plans.changePlanMsg") || "Select a different plan tier to switch or subscribe.",
                      });
                    }}
                    className="cursor-pointer text-xs"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    {t("plans.changePlanTier") || "Change Plan Tier"}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => {
                      toast.info(t("plans.contactSupportTitle") || "Contact Support", {
                        description:
                          t("plans.contactSupportMsg", { email: "soporte@velmartech.com.do" }) ||
                          "Need assistance? Email: soporte@velmartech.com.do",
                      });
                      window.location.href = "mailto:soporte@velmartech.com.do?subject=Subscription Support Request";
                    }}
                    className="cursor-pointer text-xs"
                  >
                    <Mail className="h-3.5 w-3.5 mr-1" />
                    {t("plans.contactSupport") || "Contact Support"}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-border" />

                  <DropdownMenuItem
                    onClick={() => openActionDialog("cancel", sub)}
                    variant="destructive"
                    className="cursor-pointer text-xs text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive"
                  >
                    <Ban className="h-3.5 w-3.5 mr-1 text-destructive" />
                    {t("plans.cancelSubscription") || "Cancel Subscription"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [
      t,
      i18n,
      isAdmin,
      getTierLabel,
      handleUpdateSubscriptionDirect,
      setUserSelectedPlan,
      setTierChangeSubId,
      openActionDialog,
    ],
  );

  const showTabs = activeSubscriptions.length > 0;

  const tierChangeSub = tierChangeSubId
    ? activeSubscriptions.find((sub) => sub.id === tierChangeSubId) || null
    : null;

  const activeSubForCurrentPlan = activeSubscriptions.find(
    (sub) => sub.plan === selectedPlan && sub.status === "ACTIVE",
  );

  return (
    <Page
      title={t("plans.title")}
      subtitle={t("plans.subtitle")}
      isLoading={loading && filteredPlans.length === 0}
      actions={
        isAdmin && (
          <div className="flex justify-end w-full sm:w-auto">
            <Button
              type="button"
              size="sm"
              onClick={handleCreateClick}
              className="h-7 px-3 text-xs font-semibold gap-1 cursor-pointer"
            >
              <span>+ {t("plans.addPlan") || "Add Plan"}</span>
            </Button>
          </div>
        )
      }
    >
      {/* Navigation Section Switcher: Browse Plans vs Active Subscriptions */}
      {showTabs && (
        <div className="border-b border-border pb-2 mb-5">
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "browse" | "manage")} className="w-full">
            <TabsList className="bg-muted p-1 rounded-lg">
              <TabsTrigger
                value="browse"
                onClick={() => setActiveTab("browse")}
                className="gap-2 text-xs font-medium px-4 py-1.5 cursor-pointer data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>{t("plans.browseTab")}</span>
              </TabsTrigger>

              <TabsTrigger
                value="manage"
                onClick={() => setActiveTab("manage")}
                className="gap-2 text-xs font-medium px-4 py-1.5 cursor-pointer data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
              >
                <CreditCard className="h-3.5 w-3.5 text-blue-500" />
                <span>{t("plans.manageTab")}</span>
                <Badge
                  variant="secondary"
                  className="ml-1 text-[10px] font-mono px-1.5 py-0 min-w-5 inline-flex justify-center"
                >
                  {activeSubscriptions.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {activeTab !== "manage" ? (
        <>
          {/* Billing Cycle Switcher & Admin Actions */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3.5 mb-4">
            <div className="flex justify-center">
              <BillingCycleSwitcher billingCycle={billingCycle} setBillingCycle={setBillingCycle} />
            </div>
            {(isAdmin || user?.role === "TECHNICIAN") && (
              <div className="flex items-center gap-2">
                <label
                  htmlFor="client-type-filter"
                  className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                >
                  {t("plans.audience") || "Audience"}
                </label>
                <Select
                  value={clientTypeFilter}
                  onValueChange={(val) => setClientTypeFilter(val as "ALL" | typeof clientTypeFilter)}
                >
                  <SelectTrigger id="client-type-filter" size="default" className="text-xs">
                    <SelectValue placeholder={t("plans.allAudiences") || "All plans"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t("plans.allAudiences") || "All plans"}</SelectItem>
                    <SelectItem value="CLIENT">{t("plans.clientTypes.standard") || "Standard Client"}</SelectItem>
                    <SelectItem value="ENTERPRISE">{t("plans.clientTypes.enterprise") || "Enterprise Client"}</SelectItem>
                    <SelectItem value="STUDENT">{t("plans.clientTypes.student") || "Student Starter"}</SelectItem>
                    <SelectItem value="OTHER">{t("plans.clientTypes.other") || "Other / Custom"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Velmar Store Discount Perk Banner */}
          <div className="mb-6 flex items-center justify-center gap-2 bg-secondary/15 border border-border rounded-lg py-2 px-4 text-xs font-semibold text-secondary-foreground max-w-2xl mx-auto shadow-xs">
            <ShoppingBag className="h-4 w-4 shrink-0 text-primary" />
            <span>
              {t("plans.storeDiscountBanner") || "Exclusive Subscriber Perk: Enjoy up to 10% discount at Velmar Store!"}
            </span>
          </div>

          {/* Plan Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5 mb-8 w-full">
            {filteredPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                selectedPlan={selectedPlan}
                billingCycle={billingCycle}
                equipmentCount={equipmentCounts[plan.id] || 1}
                isAdmin={isAdmin}
                activeSubscriptions={activeSubscriptions}
                onSelect={setUserSelectedPlan}
                onEdit={handleEditClick}
                onDelete={requestDeletePlan}
                onAdjustEquipmentCount={handleAdjustEquipmentCount}
                getPlanName={getPlanName}
                getPlanDescription={getPlanDescription}
                getFeatureText={getFeatureText}
                getTierLabel={getTierLabel}
              />
            ))}
          </div>

          {/* Payment Section — Browse mode: new subscriptions only (clients) */}
          {!isAdmin && currentPlan && (
            <div className="max-w-xl mx-auto w-full text-foreground">
              {activeSubForCurrentPlan ? (
                <div className="bg-card border border-border rounded-lg p-5 shadow-xs text-center">
                  <p className="text-xs text-foreground font-semibold mb-2">
                    {t("plans.alreadySubscribedNotice") ||
                      "You already have an active subscription for this plan."}
                  </p>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => setActiveTab("manage")}
                    className="h-auto p-0 text-xs text-primary font-semibold cursor-pointer"
                  >
                    {t("plans.goToManage") || "Go to Manage Subscriptions"}
                  </Button>
                </div>
              ) : (
                <PaymentSection
                  currentPlan={currentPlan}
                  billingCycle={billingCycle}
                  currentEquipmentCount={currentEquipmentCount}
                  isAdmin={isAdmin}
                  acceptedTos={acceptedTos}
                  setAcceptedTos={setAcceptedTos}
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  paymentMessage={paymentMessage}
                  reference={reference}
                  subscribeLoading={subscribeLoading}
                  handleProcessSubscription={handleProcessSubscription}
                  activeSubscriptions={activeSubscriptions}
                  getPlanName={getPlanName}
                  autoRenew={autoRenew}
                  setAutoRenew={setAutoRenew}
                />
              )}
            </div>
          )}
        </>
      ) : (
        /* Manage Subscriptions Tab — Tier change panel + DataTable */
        <div className="text-foreground">
          {tierChangeSub && (
            <ChangeTierPanel
              subscription={tierChangeSub}
              plans={filteredPlans}
              currentPlan={currentPlan}
              currentEquipmentCount={currentEquipmentCount}
              onSelectPlan={setUserSelectedPlan}
              onSyncEquipmentCount={syncEquipmentCount}
              onAdjustEquipmentCount={handleAdjustEquipmentCount}
              onClose={() => setTierChangeSubId(null)}
              onUpdateSubscription={async (subId, count) => {
                const updated = await handleUpdateSubscription(subId, count);
                if (updated) {
                  setTierChangeSubId(null);
                }
              }}
              subscribeLoading={subscribeLoading}
              acceptedTos={acceptedTos}
              setAcceptedTos={setAcceptedTos}
              paymentMessage={paymentMessage}
              getPlanName={getPlanName}
            />
          )}
          {activeSubscriptions.length > 0 ? (
            <ActiveSubscriptionsDashboard
              activeSubscriptions={activeSubscriptions}
              columns={subscriptionDashboardColumns}
            />
          ) : (
            <div className="bg-card border border-border rounded-lg p-8 shadow-xs text-center">
              <p className="text-sm text-muted-foreground">
                {t("plans.noSubscriptions") || "No active subscriptions found."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Legal & SLA Disclaimer Footnote */}
      <div className="mt-8 pt-4 border-t border-border text-muted-foreground text-[11px] leading-relaxed flex items-start gap-2 w-full">
        <Info className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
        <p>
          {t("plans.footnoteText") ||
            "Velmar Technology SRL presta servicios de soporte en horario corporativo de Lunes a Viernes de 9:00 AM a 4:00 PM (hora de la República Dominicana). Los tiempos de respuesta (SLA) representan el compromiso de evaluación inicial de la solicitud dentro del horario hábil establecido y no constituyen una garantía de solución inmediata o de disponibilidad de soporte fuera de jornada. Precios no incluyen ITBIS."}
        </p>
      </div>

      {/* Delete Plan Confirmation Dialog */}
      <DeletePlanAlertDialog
        planName={pendingDeletePlanName}
        onConfirm={confirmDeletePlan}
        onCancel={cancelDeletePlan}
      />

      {/* Subscription Action Checkout Sheet */}
      {checkoutSubscription && currentPlan && (
        <CheckoutSheet
          currentPlan={currentPlan}
          billingCycle={billingCycle}
          currentEquipmentCount={currentPlan ? (equipmentCounts[currentPlan.id] || 1) : 1}
          isAdmin={isAdmin}
          acceptedTos={acceptedTos}
          setAcceptedTos={setAcceptedTos}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          paymentMessage={paymentMessage}
          reference={reference}
          subscribeLoading={subscribeLoading}
          handleProcessSubscription={handleModifySubscription}
          activeSubscriptions={activeSubscriptions}
          getPlanName={getPlanName}
          existingSubscription={checkoutSubscription}
          autoRenew={autoRenew}
          setAutoRenew={setAutoRenew}
          open={checkoutOpen}
          onOpenChange={(open) => { if (!open) closeCheckout(); }}
          deviceDelta={checkoutDeviceDelta}
          onDeviceDeltaChange={setCheckoutDeviceDelta}
          showStepper={checkoutAction === "add_device" || checkoutAction === "remove_device"}
          removeMode={checkoutAction === "remove_device"}
          paypalContainerId="paypal-modify-container"
          warningMessage={
            checkoutAction === "cancel"
              ? (t("plans.dialogCancelWarning") ||
                  "Cancelling will take effect at the end of your current billing period. No further charges will be applied.")
              : undefined
          }
          confirmLabel={
            checkoutAction === "cancel"
              ? (t("plans.dialogConfirmCancel") || "Yes, Cancel Subscription")
              : checkoutAction === "add_device" && isAdmin
                ? (t("plans.dialogConfirmAdd") || "Add Device")
                : checkoutAction === "remove_device"
                  ? (t("plans.dialogConfirmRemove") || "Remove Device")
                  : undefined
          }
          onConfirm={
            checkoutAction === "cancel"
              ? async () => {
                  if (!checkoutSubscription) return;
                  await handleDirectCancelSubscription(checkoutSubscription.id);
                }
              : checkoutAction === "add_device" && isAdmin
                ? async () => {
                    if (!checkoutSubscription) return;
                    await handleUpdateSubscriptionDirect(checkoutSubscription.id, checkoutSubscription.plan, (checkoutSubscription.equipment_count || 1) + 1);
                    closeCheckout();
                  }
                : checkoutAction === "remove_device"
                  ? async () => {
                      if (!checkoutSubscription) return;
                      await handleUpdateSubscriptionDirect(checkoutSubscription.id, checkoutSubscription.plan, Math.max(1, (checkoutSubscription.equipment_count || 1) - 1));
                      closeCheckout();
                    }
                  : undefined
          }
        />
      )}
    </Page>
  );
}

export default PlansPage;
