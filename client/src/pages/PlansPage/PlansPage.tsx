import { useMemo, useCallback } from "react";
import { ChevronDown, Plus, Minus, RefreshCw, Mail, Ban, CreditCard, ShoppingBag, Info } from "lucide-react";
import { Page } from "@/components/Page";
import type { ColumnDef } from "@tanstack/react-table";
import type { Subscription } from "@/services/subscriptionService";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { usePlansPage } from "@/hooks/usePlansPage";
import { BillingCycleSwitcher } from "@/pages/PlansPage/components/BillingCycleSwitcher";
import { PlanCard } from "@/pages/PlansPage/components/PlanCard";
import { PaymentSection } from "@/pages/PlansPage/components/PaymentSection";
import { ActiveSubscriptionsDashboard } from "@/pages/PlansPage/components/ActiveSubscriptionsDashboard";
import { EditPlanModal } from "@/pages/PlansPage/components/EditPlanModal";
import { CheckoutSheet } from "@/components/checkout-sheet";

type SubDialogAction = "add_device" | "remove_device" | "cancel" | "pay";

export function PlansPage() {
  const {
    t,
    i18n,
    user,
    loading,
    isAdmin,
    filteredPlans,
    clientTypeFilter,
    setClientTypeFilter,
    selectedPlan,
    setUserSelectedPlan,
    equipmentCounts,
    paymentMethod,
    setPaymentMethod,
    acceptedTos,
    setAcceptedTos,
    reference,
    billingCycle,
    setBillingCycle,
    quoteLoading,
    unregisteredEmail,
    setUnregisteredEmail,
    unregisteredName,
    setUnregisteredName,
    activeTab,
    setActiveTab,
    editingPlan,
    setEditingPlan,
    editId,
    setEditId,
    editName,
    setEditName,
    editDescription,
    setEditDescription,
    editPrice,
    setEditPrice,
    editRecommended,
    setEditRecommended,
    editClientType,
    setEditClientType,
    editActive,
    setEditActive,
    editFeatures,
    saveLoading,
    isCreateMode,
    draggedIndex,
    dragOverIndex,
    clients,
    selectedClientId,
    setSelectedClientId,
    subscribeLoading,
    paymentMessage,
    activeSubscriptions,
    actionType,
    setActionType,
    subscriptionToModifyId,
    setSubscriptionToModifyId,
    currentPlan,
    currentEquipmentCount,
    subtotal,
    tax,
    total,
    getPlanName,
    getPlanDescription,
    getFeatureText,
    getTierLabel,
    handleAdjustEquipmentCount,
    handleProcessSubscription,
    handleSendQuote,
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
    handleAddFeature,
    handleDeleteFeature,
    handleToggleFeatureIncluded,
    handleEditFeatureText,
    handleUpdateFeatureCode,
    handleUpdateFeatureParam,
    handleDeleteFeatureParam,
    handleMoveFeature,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleSavePlan,
    handleDeletePlan,
  } = usePlansPage();

  const openActionDialog = useCallback((action: SubDialogAction, sub: Subscription) => {
    openCheckout(action, sub);
  }, [openCheckout]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: "bg-primary/10 text-primary border-primary/20",
      EXPIRING: "bg-secondary text-secondary-foreground border-border",
      CANCELLED: "bg-muted text-muted-foreground border-border",
    };
    return colors[status] || "bg-muted text-muted-foreground border-border";
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
        header: t("plans.actions") || "Actions",
        cell: ({ row }) => {
          const sub = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-0.5 text-xs text-foreground font-semibold cursor-pointer border border-border px-2 py-1 rounded bg-card hover:bg-muted"
                >
                  {t("plans.manageTab") || "Manage"} <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-44 bg-card text-foreground border border-border"
              >
                <DropdownMenuItem
                  onClick={() => {
                    if (isAdmin) {
                      handleUpdateSubscriptionDirect(sub.id, sub.plan, sub.equipment_count + 1);
                    } else {
                      openActionDialog("add_device", sub);
                    }
                  }}
                  className="cursor-pointer flex items-center gap-1.5 text-xs py-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("plans.addDevice") || "Add Device"}
                </DropdownMenuItem>

                <DropdownMenuItem
                  disabled={sub.equipment_count <= 1}
                  onClick={() => {
                    if (isAdmin) {
                      handleUpdateSubscriptionDirect(sub.id, sub.plan, sub.equipment_count - 1);
                    } else {
                      openActionDialog("remove_device", sub);
                    }
                  }}
                  className="cursor-pointer flex items-center gap-1.5 text-xs py-1.5 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Minus className="h-3.5 w-3.5" />
                  {t("plans.removeDevice") || "Remove Device"}
                </DropdownMenuItem>

                {!isAdmin && (
                  <DropdownMenuItem
                    onClick={() => openActionDialog("pay", sub)}
                    className="cursor-pointer flex items-center gap-1.5 text-xs py-1.5"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    {t("plans.payRenewal") || "Pay Renewal"}
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator className="bg-border" />

                <DropdownMenuItem
                  onClick={() => {
                    setUserSelectedPlan(sub.plan);
                    setActiveTab("assign");
                    toast.info(t("plans.assignTab") || "Assign Plan", {
                      description: t("plans.changePlanMsg") || "Select a different plan tier to switch or subscribe.",
                    });
                  }}
                  className="cursor-pointer flex items-center gap-1.5 text-xs py-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
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
                  className="cursor-pointer flex items-center gap-1.5 text-xs py-1.5"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {t("plans.contactSupport") || "Contact Support"}
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-border" />

                <DropdownMenuItem
                  onClick={() => openActionDialog("cancel", sub)}
                  variant="destructive"
                  className="cursor-pointer flex items-center gap-1.5 text-xs py-1.5 text-destructive focus:bg-destructive/10"
                >
                  <Ban className="h-3.5 w-3.5" />
                  {t("plans.cancelSubscription") || "Cancel Subscription"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
      setActiveTab,
      openActionDialog,
    ],
  );

  const showTabs = !isAdmin && activeSubscriptions.length > 0;

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
            <button
              type="button"
              onClick={handleCreateClick}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-opacity cursor-pointer flex items-center gap-1 shadow-xs border border-primary w-full sm:w-auto justify-center"
            >
              <span>+ {t("plans.addPlan") || "Add Plan"}</span>
            </button>
          </div>
        )
      }
    >
      {/* Tabs Section */}
      {showTabs && (
        <div className="border-b border-border flex gap-6 mb-5">
          <button
            type="button"
            className={`pb-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "browse"
                ? "border-b-2 border-primary text-foreground font-heading"
                : "text-muted-foreground hover:text-foreground border-b-2 border-transparent"
            }`}
            onClick={() => setActiveTab("browse")}
          >
            {t("plans.browseTab")}
          </button>
          <button
            type="button"
            className={`pb-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "assign"
                ? "border-b-2 border-primary text-foreground font-heading"
                : "text-muted-foreground hover:text-foreground border-b-2 border-transparent"
            }`}
            onClick={() => setActiveTab("assign")}
          >
            {t("plans.assignTab")}
          </button>
          <button
            type="button"
            className={`pb-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "manage"
                ? "border-b-2 border-primary text-foreground font-heading"
                : "text-muted-foreground hover:text-foreground border-b-2 border-transparent"
            }`}
            onClick={() => setActiveTab("manage")}
          >
            {t("plans.manageTab")}
          </button>
        </div>
      )}

      {isAdmin || activeTab === "browse" ? (
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
                <select
                  id="client-type-filter"
                  value={clientTypeFilter}
                  onChange={(e) => setClientTypeFilter(e.target.value as "ALL" | typeof clientTypeFilter)}
                  className="h-8 px-2 border border-input rounded text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="ALL">{t("plans.allAudiences") || "All plans"}</option>
                  <option value="CLIENT">{t("plans.clientTypes.standard") || "Standard Client"}</option>
                  <option value="ENTERPRISE">{t("plans.clientTypes.enterprise") || "Enterprise Client"}</option>
                  <option value="STUDENT">{t("plans.clientTypes.student") || "Student Starter"}</option>
                  <option value="OTHER">{t("plans.clientTypes.other") || "Other / Custom"}</option>
                </select>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5 mb-8 mx-auto w-full max-w-5xl">
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
                onDelete={handleDeletePlan}
                onAdjustEquipmentCount={handleAdjustEquipmentCount}
                getPlanName={getPlanName}
                getPlanDescription={getPlanDescription}
                getFeatureText={getFeatureText}
                getTierLabel={getTierLabel}
              />
            ))}
          </div>

          {/* Payment Section — Browse mode: new subscriptions only */}
          {currentPlan && (
            <div className="max-w-xl mx-auto w-full text-foreground">
              {!isAdmin && activeSubForCurrentPlan ? (
                <div className="bg-card border border-border rounded-lg p-5 shadow-xs text-center">
                  <p className="text-xs text-foreground font-semibold mb-2">
                    {t("plans.alreadySubscribedNotice") ||
                      "You already have an active subscription for this plan."}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("manage")}
                    className="text-xs text-primary underline font-semibold cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    {t("plans.goToManage") || "Go to Manage Subscriptions"}
                  </button>
                </div>
              ) : (
                <PaymentSection
                  currentPlan={currentPlan}
                  billingCycle={billingCycle}
                  currentEquipmentCount={currentEquipmentCount}
                  subtotal={subtotal}
                  tax={tax}
                  total={total}
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
                  clients={clients}
                  selectedClientId={selectedClientId}
                  setSelectedClientId={setSelectedClientId}
                  unregisteredEmail={unregisteredEmail}
                  setUnregisteredEmail={setUnregisteredEmail}
                  unregisteredName={unregisteredName}
                  setUnregisteredName={setUnregisteredName}
                  quoteLoading={quoteLoading}
                  handleSendQuote={handleSendQuote}
                />
              )}
            </div>
          )}
        </>
      ) : activeTab === "assign" ? (
        <>
          {/* Assign Plan Tab — Modify existing subscription */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3.5 mb-4">
            <div className="flex justify-center">
              <BillingCycleSwitcher billingCycle={billingCycle} setBillingCycle={setBillingCycle} />
            </div>
          </div>

          {/* Plan Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5 mb-8 mx-auto w-full max-w-5xl">
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
                onDelete={handleDeletePlan}
                onAdjustEquipmentCount={handleAdjustEquipmentCount}
                getPlanName={getPlanName}
                getPlanDescription={getPlanDescription}
                getFeatureText={getFeatureText}
                getTierLabel={getTierLabel}
              />
            ))}
          </div>

          {/* Payment Section — Assign mode: modify existing subscription */}
          {currentPlan && (
            <div className="max-w-xl mx-auto w-full text-foreground">
              <PaymentSection
                currentPlan={currentPlan}
                billingCycle={billingCycle}
                currentEquipmentCount={currentEquipmentCount}
                subtotal={subtotal}
                tax={tax}
                total={total}
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
                clients={clients}
                selectedClientId={selectedClientId}
                setSelectedClientId={setSelectedClientId}
                unregisteredEmail={unregisteredEmail}
                setUnregisteredEmail={setUnregisteredEmail}
                unregisteredName={unregisteredName}
                setUnregisteredName={setUnregisteredName}
                quoteLoading={quoteLoading}
                handleSendQuote={handleSendQuote}
                mode="assign"
                actionType={actionType}
                setActionType={setActionType}
                subscriptionToModifyId={subscriptionToModifyId}
                setSubscriptionToModifyId={setSubscriptionToModifyId}
                handleUpdateSubscription={handleUpdateSubscription}
              />
            </div>
          )}
        </>
      ) : (
        /* Manage Subscriptions Tab — DataTable only */
        <div className="text-foreground">
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
      <div className="mt-8 pt-4 border-t border-border text-muted-foreground text-[11px] leading-relaxed flex items-start gap-2 max-w-4xl mx-auto">
        <Info className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
        <p>
          {t("plans.footnoteText") ||
            "Velmar Technology SRL presta servicios de soporte en horario corporativo de Lunes a Viernes de 9:00 AM a 4:00 PM (hora de la República Dominicana). Los tiempos de respuesta (SLA) representan el compromiso de evaluación inicial de la solicitud dentro del horario hábil establecido y no constituyen una garantía de solución inmediata o de disponibilidad de soporte fuera de jornada. Precios no incluyen ITBIS."}
        </p>
      </div>

      {/* Plan Edit Modal */}
      {editingPlan && (
        <EditPlanModal
          editingPlan={editingPlan}
          isCreateMode={isCreateMode}
          editId={editId}
          setEditId={setEditId}
          editClientType={editClientType}
          setEditClientType={setEditClientType}
          editName={editName}
          setEditName={setEditName}
          editDescription={editDescription}
          setEditDescription={setEditDescription}
          editPrice={editPrice}
          setEditPrice={setEditPrice}
          editRecommended={editRecommended}
          setEditRecommended={setEditRecommended}
          editActive={editActive}
          setEditActive={setEditActive}
          editFeatures={editFeatures}
          saveLoading={saveLoading}
          draggedIndex={draggedIndex}
          dragOverIndex={dragOverIndex}
          onClose={() => setEditingPlan(null)}
          onSave={handleSavePlan}
          onAddFeature={handleAddFeature}
          onDeleteFeature={handleDeleteFeature}
          onToggleFeatureIncluded={handleToggleFeatureIncluded}
          onEditFeatureText={handleEditFeatureText}
          onUpdateFeatureCode={handleUpdateFeatureCode}
          onUpdateFeatureParam={handleUpdateFeatureParam}
          onDeleteFeatureParam={handleDeleteFeatureParam}
          onMoveFeature={handleMoveFeature}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onDeletePlan={handleDeletePlan}
        />
      )}

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
          handleProcessSubscription={
            checkoutAction === "pay"
              ? handleModifySubscription
              : handleModifySubscription
          }
          activeSubscriptions={activeSubscriptions}
          getPlanName={getPlanName}
          existingSubscription={checkoutSubscription}
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
                    await handleUpdateSubscriptionDirect(checkoutSubscription.id, checkoutSubscription.plan, checkoutSubscription.equipment_count + 1);
                    closeCheckout();
                  }
                : checkoutAction === "remove_device"
                  ? async () => {
                      if (!checkoutSubscription) return;
                      await handleUpdateSubscriptionDirect(checkoutSubscription.id, checkoutSubscription.plan, Math.max(1, checkoutSubscription.equipment_count - 1));
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
