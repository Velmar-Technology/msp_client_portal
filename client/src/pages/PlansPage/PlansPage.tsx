import { useMemo } from "react";
import { ChevronDown, Plus, Minus, RefreshCw, Mail, Ban, ShoppingBag, Info } from "lucide-react";
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
    setEquipmentCounts,
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
    handleCancelSubscription,
    handleUpdateSubscriptionDirect,
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: "bg-primary/10 text-primary border-primary/20",
      EXPIRING: "bg-secondary text-secondary-foreground border-border",
      CANCELLED: "bg-muted text-muted-foreground border-border",
    };
    return colors[status] || "bg-muted text-muted-foreground border-border";
  };

  // Memoized columns definition for DataTable
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
                {/* Add Device */}
                <DropdownMenuItem
                  onClick={async () => {
                    if (isAdmin) {
                      await handleUpdateSubscriptionDirect(sub.id, sub.plan, sub.equipment_count + 1);
                    } else {
                      setUserSelectedPlan(sub.plan);
                      setEquipmentCounts((prev) => ({ ...prev, [sub.plan]: sub.equipment_count + 1 }));
                      setActiveTab("manage");
                      toast.info(t("plans.addDeviceTitle") || "Upgrade Pre-configured", {
                        description:
                          t("plans.addDeviceMsg") ||
                          "Complete payment to add the new device license to your subscription.",
                      });
                    }
                  }}
                  className="cursor-pointer flex items-center gap-1.5 text-xs py-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("plans.addDevice") || "Add Device"}
                </DropdownMenuItem>

                {/* Remove Device */}
                <DropdownMenuItem
                  disabled={sub.equipment_count <= 1}
                  onClick={async () => {
                    if (sub.equipment_count > 1) {
                      const confirmRemove = window.confirm(
                        t("plans.removeDeviceConfirm", { count: sub.equipment_count - 1 }) ||
                          `Are you sure you want to remove a device license? Your limit will decrease to ${
                            sub.equipment_count - 1
                          } devices.`,
                      );
                      if (confirmRemove) {
                        await handleUpdateSubscriptionDirect(sub.id, sub.plan, sub.equipment_count - 1);
                      }
                    }
                  }}
                  className="cursor-pointer flex items-center gap-1.5 text-xs py-1.5 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Minus className="h-3.5 w-3.5" />
                  {t("plans.removeDevice") || "Remove Device"}
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-border" />

                {/* Change Plan */}
                <DropdownMenuItem
                  onClick={() => {
                    setUserSelectedPlan(sub.plan);
                    setActiveTab("browse");
                    toast.info(t("plans.changePlanTitle") || "Browse Plans", {
                      description: t("plans.changePlanMsg") || "Select a different plan tier to switch or subscribe.",
                    });
                  }}
                  className="cursor-pointer flex items-center gap-1.5 text-xs py-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t("plans.changePlanTier") || "Change Plan Tier"}
                </DropdownMenuItem>

                {/* Contact Support */}
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

                {/* Cancel Subscription */}
                <DropdownMenuItem
                  onClick={async () => {
                    await handleCancelSubscription(sub.id);
                  }}
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
      handleCancelSubscription,
      setUserSelectedPlan,
      setEquipmentCounts,
      setActiveTab,
    ],
  );

  const showTabs = !isAdmin && activeSubscriptions.length > 0;

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
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5 mb-8 mx-auto w-full max-w-5xl"
          >
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

          {/* Payment Section */}
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
                actionType={actionType}
                setActionType={setActionType}
                subscriptionToModifyId={subscriptionToModifyId}
                setSubscriptionToModifyId={setSubscriptionToModifyId}
                handleUpdateSubscription={handleUpdateSubscription}
                handleCancelSubscription={handleCancelSubscription}
              />
            </div>
          )}
        </>
      ) : (
        activeSubscriptions.length > 0 &&
        (() => {
          const activeSub =
            activeSubscriptions.find((sub) => sub.id === subscriptionToModifyId) || activeSubscriptions[0];
          if (!activeSub) return null;

          return (
            <div className="space-y-4.5 text-foreground">
              {activeSubscriptions.length > 1 && (
                <div className="bg-card border border-border rounded-lg p-3.5 shadow-xs">
                  <label
                    htmlFor="active-sub-select-manage"
                    className="block text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1"
                  >
                    {t("plans.selectActiveSubToManage") || "Select Active Subscription to Manage"}
                  </label>
                  <select
                    id="active-sub-select-manage"
                    value={subscriptionToModifyId}
                    onChange={(e) => setSubscriptionToModifyId(e.target.value)}
                    className="w-full h-8.5 px-2.5 border border-input rounded text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {activeSubscriptions.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.service_name} ({t("plans.devicesCount", { count: sub.equipment_count })})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-4.5 items-start">
                {/* Left Column: Manage Active Subscription + Licensed Devices list */}
                <div className="space-y-4">
                  {/* Active Subscription Details Card */}
                  <div className="bg-card border border-border rounded-lg p-4.5 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-sm font-bold text-foreground font-heading">
                          {t("plans.manageActiveSub") || "Manage Active Subscription"}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t("plans.detailsForService", {
                            name: activeSub.service_name,
                            cycle:
                              billingCycle === "annual"
                                ? (t("plans.annualButtonLabel") || "annual").toLowerCase()
                                : (t("plans.monthlyButtonLabel") || "monthly").toLowerCase(),
                          })}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          activeSub.status === "EXPIRING"
                            ? "bg-secondary text-secondary-foreground border-border"
                            : "bg-primary text-primary-foreground border-primary"
                        }`}
                      >
                        {activeSub.status === "EXPIRING"
                          ? (t("plans.expiringStatus") || "CANCEL PENDING").toUpperCase()
                          : t("plans.activeStatus")?.toUpperCase() || "ACTIVE"}
                      </span>
                    </div>

                    {activeSub.status === "EXPIRING" && (
                      <div className="mb-4 p-3 bg-secondary/15 border border-border rounded-md text-xs text-secondary-foreground">
                        <p className="font-semibold">
                          {t("plans.cancellingPeriodEndTitle") || "Subscription Cancellation Scheduled"}
                        </p>
                        <p className="text-[11px] opacity-90 mt-0.5">
                          {t("plans.cancellingPeriodEndDesc", {
                            date: activeSub.renewal_date ? new Date(activeSub.renewal_date).toLocaleDateString() : "",
                          }) ||
                            `Your plan will remain active through ${activeSub.renewal_date ? new Date(activeSub.renewal_date).toLocaleDateString() : "the end of your paid billing period"}. No further renewal payments will be charged.`}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                      <div className="p-3 bg-muted/40 rounded border border-border">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                          {t("plans.devicesLabel") || "Devices"}
                        </p>
                        <p className="text-xs font-semibold text-foreground">
                          {t("plans.devicesCount", { count: activeSub.equipment_count })}
                        </p>
                      </div>
                      <div className="p-3 bg-muted/40 rounded border border-border">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                          {t("plans.cycleLabel") || "Cycle"}
                        </p>
                        <p className="text-xs font-semibold capitalize text-foreground">
                          {billingCycle === "annual"
                            ? t("plans.annualButtonLabel") || "annual"
                            : t("plans.monthlyButtonLabel") || "monthly"}
                        </p>
                      </div>
                      <div className="p-3 bg-muted/40 rounded border border-border">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                          {t("plans.renewalLabel") || "Renewal"}
                        </p>
                        <p className="text-xs font-semibold text-foreground font-mono">
                          {activeSub.renewal_date
                            ? new Date(activeSub.renewal_date).toLocaleDateString(
                                i18n.language.startsWith("es") ? "es-DO" : "en-US",
                              )
                            : "N/A"}
                        </p>
                      </div>
                    </div>

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
                      actionType={actionType}
                      setActionType={setActionType}
                      subscriptionToModifyId={subscriptionToModifyId}
                      setSubscriptionToModifyId={setSubscriptionToModifyId}
                      handleUpdateSubscription={handleUpdateSubscription}
                      handleCancelSubscription={handleCancelSubscription}
                    />
                  </div>
                </div>

                {/* Right Column: Sidebar Plan Summary + custom Help card */}
                <div className="space-y-4">
                  {/* Plan Summary Card */}
                  <div className="bg-card border border-border rounded-lg p-4 shadow-xs">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 font-heading">
                      {t("plans.planSummary")}
                    </h4>
                    {(() => {
                      const basePrice = currentPlan
                        ? billingCycle === "annual"
                          ? currentPlan.price * 0.8
                          : currentPlan.price
                        : 0;
                      const planName = currentPlan ? getPlanName(currentPlan.name) : activeSub.service_name;
                      const additionalDevicesCount = Math.max(0, currentEquipmentCount - 1);
                      const additionalDevicesPrice = basePrice * additionalDevicesCount;
                      const estimatedTotal = basePrice * currentEquipmentCount;
                      const annualBilledTotal = basePrice * 12 * currentEquipmentCount;

                      return (
                        <div className="space-y-2.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground font-medium">
                              {t("plans.basePlanName", { name: planName })}
                            </span>
                            <span className="font-semibold text-foreground font-mono">
                              ${basePrice.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground font-medium">
                              {t("plans.addonCloudStorage")}
                            </span>
                            <span className="font-semibold text-foreground uppercase tracking-wide text-[9px] px-1 bg-muted rounded">
                              {t("plans.included")}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground font-medium">
                              {t("plans.storeDiscountSummaryLabel") || "Velmar Store Discount"}
                            </span>
                            <span className="font-semibold text-primary uppercase tracking-wide text-[9px] px-1 bg-primary/10 border border-primary/20 rounded">
                              {t("plans.upTo10PercentOff") || "Up to 10% Off"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground font-medium">
                              {t("plans.additionalDevices", { count: additionalDevicesCount })}
                            </span>
                            <span className="font-semibold text-foreground font-mono">
                              ${additionalDevicesPrice.toFixed(2)}
                            </span>
                          </div>
                          <div className="pt-2.5 border-t border-border">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-foreground text-xs">
                                {t("plans.estimatedMonthly")}
                              </span>
                              <span className="text-sm font-bold text-foreground font-mono">
                                ${estimatedTotal.toFixed(2)}
                              </span>
                            </div>
                            {billingCycle === "annual" && (
                              <p className="text-right text-[9px] text-muted-foreground mt-0.5 font-medium">
                                {t("plans.billedAnnually", { price: annualBilledTotal.toFixed(2) })}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Tailored Enterprise Help Card */}
                  <div className="bg-primary text-primary-foreground border border-primary rounded-lg p-4 relative overflow-hidden shadow-sm">
                    <div className="relative z-10">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary-foreground/90 mb-1 font-heading">
                        {t("plans.customPlanTitle") || "Need a custom plan?"}
                      </h4>
                      <p className="text-[11px] text-primary-foreground/80 mb-3 leading-normal font-medium">
                        {t("plans.customPlanDesc") ||
                          "For organizations with over 100 devices, we offer tailored enterprise solutions."}
                      </p>
                      <button className="w-full py-1.5 bg-background text-foreground border border-border font-semibold rounded text-xs hover:bg-muted transition-colors cursor-pointer">
                        {t("plans.contactSales") || "Contact Sales"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subscriptions Dashboard (DataTable) — outside grid for full width */}
              {!isAdmin && activeSubscriptions.length > 0 && (
                <ActiveSubscriptionsDashboard
                  activeSubscriptions={activeSubscriptions}
                  columns={subscriptionDashboardColumns}
                />
              )}
            </div>
          );
        })()
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
    </Page>
  );
}

export default PlansPage;
