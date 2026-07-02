import { useMemo } from 'react';
import { ChevronDown, Plus, Minus, RefreshCw, Mail, Ban } from 'lucide-react';
import { Page } from '@/components/Page';
import type { ColumnDef } from '@tanstack/react-table';
import type { Subscription } from '../services/subscriptionService';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { usePlansPage } from '../hooks/usePlansPage';
import { BillingCycleSwitcher } from './PlansPage/components/BillingCycleSwitcher';
import { PlanCard } from './PlansPage/components/PlanCard';
import { PaymentSection } from './PlansPage/components/PaymentSection';
import { ActiveSubscriptionsDashboard } from './PlansPage/components/ActiveSubscriptionsDashboard';
import { EditPlanModal } from './PlansPage/components/EditPlanModal';

export function PlansPage() {
  const {
    t,
    i18n,
    loading,
    isAdmin,
    filteredPlans,
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
    handleMoveFeature,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleSavePlan,
    addToast,
  } = usePlansPage();

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/10',
      CANCELLED: 'bg-zinc-100 text-zinc-550 border-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-450 dark:border-zinc-700/80',
    };
    return colors[status] || 'bg-zinc-100 text-zinc-850 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800';
  };

  // Memoized columns definition for DataTable
  const subscriptionDashboardColumns = useMemo<ColumnDef<Subscription>[]>(() => [
    {
      accessorKey: 'service_name',
      header: 'Service Name',
      cell: ({ row }) => (
        <span className="font-semibold text-zinc-900 dark:text-zinc-50 text-xs">
          {row.getValue('service_name')}
        </span>
      ),
    },
    {
      accessorKey: 'plan',
      header: 'Tier',
      cell: ({ row }) => {
        const planId = row.getValue('plan') as string;
        return (
          <span className="inline-block px-1.5 py-0.2 border border-zinc-200 dark:border-zinc-850 rounded font-mono text-[9px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {getTierLabel(planId)}
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <span
            className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase border ${getStatusColor(
              status
            )}`}
          >
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: 'renewal_date',
      header: 'Renewal Date',
      cell: ({ row }) => {
        const dateStr = row.getValue('renewal_date') as string;
        return (
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
            {new Date(dateStr).toLocaleDateString(
              i18n.language.startsWith('es') ? 'es-DO' : 'en-US',
              { day: '2-digit', month: 'short', year: 'numeric' }
            )}
          </span>
        );
      },
    },
    {
      accessorKey: 'equipment_count',
      header: 'Devices Limit',
      cell: ({ row }) => (
        <span className="bg-zinc-100 text-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700/60 px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider">
          {row.getValue('equipment_count')} Devices
        </span>
      ),
    },
    {
      id: 'actions',
      header: t('plans.actions') || 'Actions',
      cell: ({ row }) => {
        const sub = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-0.5 text-xs text-zinc-800 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50 font-semibold cursor-pointer border border-zinc-200 dark:border-zinc-800 px-2 py-1 rounded bg-white dark:bg-zinc-950"
              >
                {t('plans.manageTab') || 'Manage'} <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 border border-zinc-200 dark:border-zinc-800"
            >
              {/* Add Device */}
              <DropdownMenuItem
                onClick={async () => {
                  if (isAdmin) {
                    await handleUpdateSubscriptionDirect(sub.id, sub.plan, sub.equipment_count + 1);
                  } else {
                    setUserSelectedPlan(sub.plan);
                    setEquipmentCounts((prev) => ({ ...prev, [sub.plan]: sub.equipment_count + 1 }));
                    setActiveTab('manage');
                    addToast({
                      title: t('plans.addDeviceTitle') || 'Upgrade Pre-configured',
                      message:
                        t('plans.addDeviceMsg') ||
                        'Complete payment to add the new device license to your subscription.',
                      type: 'info',
                    });
                  }
                }}
                className="cursor-pointer flex items-center gap-1.5 text-xs py-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('plans.addDevice') || 'Add Device'}
              </DropdownMenuItem>

              {/* Remove Device */}
              <DropdownMenuItem
                disabled={sub.equipment_count <= 1}
                onClick={async () => {
                  if (sub.equipment_count > 1) {
                    const confirmRemove = window.confirm(
                      t('plans.removeDeviceConfirm', { count: sub.equipment_count - 1 }) ||
                        `Are you sure you want to remove a device license? Your limit will decrease to ${
                          sub.equipment_count - 1
                        } devices.`
                    );
                    if (confirmRemove) {
                      await handleUpdateSubscriptionDirect(sub.id, sub.plan, sub.equipment_count - 1);
                    }
                  }
                }}
                className="cursor-pointer flex items-center gap-1.5 text-xs py-1.5 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Minus className="h-3.5 w-3.5" />
                {t('plans.removeDevice') || 'Remove Device'}
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-zinc-200 dark:bg-zinc-800" />

              {/* Change Plan */}
              <DropdownMenuItem
                onClick={() => {
                  setUserSelectedPlan(sub.plan);
                  setActiveTab('browse');
                  addToast({
                    title: t('plans.changePlanTitle') || 'Browse Plans',
                    message:
                      t('plans.changePlanMsg') || 'Select a different plan tier to switch or subscribe.',
                    type: 'info',
                  });
                }}
                className="cursor-pointer flex items-center gap-1.5 text-xs py-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {t('plans.changePlanTier') || 'Change Plan Tier'}
              </DropdownMenuItem>

              {/* Contact Support */}
              <DropdownMenuItem
                onClick={() => {
                  addToast({
                    title: t('plans.contactSupportTitle') || 'Contact Support',
                    message:
                      t('plans.contactSupportMsg') || 'Need assistance? Email: soporte@verlmartech.com.do',
                    type: 'info',
                  });
                  window.location.href =
                    'mailto:soporte@verlmartech.com.do?subject=Subscription Support Request';
                }}
                className="cursor-pointer flex items-center gap-1.5 text-xs py-1.5"
              >
                <Mail className="h-3.5 w-3.5" />
                {t('plans.contactSupport') || 'Contact Support'}
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-zinc-200 dark:bg-zinc-800" />

              {/* Cancel Subscription */}
              <DropdownMenuItem
                onClick={async () => {
                  await handleCancelSubscription(sub.id);
                }}
                variant="destructive"
                className="cursor-pointer flex items-center gap-1.5 text-xs py-1.5 text-error focus:bg-error/15"
              >
                <Ban className="h-3.5 w-3.5 text-error" />
                {t('plans.cancelSubscription') || 'Cancel Subscription'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [
    t,
    i18n,
    isAdmin,
    getTierLabel,
    handleUpdateSubscriptionDirect,
    handleCancelSubscription,
    setUserSelectedPlan,
    setEquipmentCounts,
    setActiveTab,
    addToast,
  ]);

  const showTabs = !isAdmin && activeSubscriptions.length > 0;

  return (
    <Page
      title={t('plans.title')}
      subtitle={t('plans.subtitle')}
      isLoading={loading && filteredPlans.length === 0}
    >
      {/* Tabs Section */}
      {showTabs && (
        <div className="border-b border-zinc-200 dark:border-zinc-800 flex gap-6 mb-5">
          <button
            type="button"
            className={`pb-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'browse'
                ? 'border-b-2 border-zinc-900 dark:border-zinc-50 text-zinc-900 dark:text-zinc-50'
                : 'text-zinc-400 hover:text-zinc-600 border-b-2 border-transparent'
            }`}
            onClick={() => setActiveTab('browse')}
          >
            {t('plans.browseTab')}
          </button>
          <button
            type="button"
            className={`pb-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'manage'
                ? 'border-b-2 border-zinc-900 dark:border-zinc-50 text-zinc-900 dark:text-zinc-50'
                : 'text-zinc-400 hover:text-zinc-600 border-b-2 border-transparent'
            }`}
            onClick={() => setActiveTab('manage')}
          >
            {t('plans.manageTab')}
          </button>
        </div>
      )}

      {isAdmin || activeTab === 'browse' ? (
        <>
          {/* Billing Cycle Switcher & Admin Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3.5 mb-6">
            <div className="sm:w-1/3" />
            <div className="flex justify-center">
              <BillingCycleSwitcher
                billingCycle={billingCycle}
                setBillingCycle={setBillingCycle}
              />
            </div>
            <div className="sm:w-1/3 flex justify-end w-full sm:w-auto">
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleCreateClick}
                  className="bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 px-3.5 py-1.5 rounded-md text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1 shadow-sm border border-zinc-850 dark:border-zinc-200 w-full sm:w-auto justify-center"
                >
                  <span>+ Add Plan</span>
                </button>
              )}
            </div>
          </div>

          {/* Plan Cards */}
          <div
            className="grid gap-4.5 mb-8 mx-auto w-full"
            style={{
              gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 290px), 1fr))`,
              maxWidth: `${Math.min(filteredPlans.length, 3) * 350}px`,
            }}
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
            <div className="max-w-xl mx-auto w-full text-zinc-900 dark:text-zinc-50">
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
            activeSubscriptions.find((sub) => sub.id === subscriptionToModifyId) ||
            activeSubscriptions[0];
          if (!activeSub) return null;

          return (
            <div className="space-y-4.5 text-zinc-900 dark:text-zinc-50">
              {activeSubscriptions.length > 1 && (
                <div className="bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200/60 dark:border-zinc-800/80 rounded-lg p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                  <label
                    htmlFor="active-sub-select-manage"
                    className="block text-[10px] text-zinc-500 dark:text-zinc-450 font-bold uppercase tracking-wider mb-1"
                  >
                    Select Active Subscription to Manage
                  </label>
                  <select
                    id="active-sub-select-manage"
                    value={subscriptionToModifyId}
                    onChange={(e) => setSubscriptionToModifyId(e.target.value)}
                    className="w-full h-8.5 px-2.5 border border-zinc-200/85 dark:border-zinc-805 rounded text-xs bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-55 focus:outline-none"
                  >
                    {activeSubscriptions.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.service_name} ({sub.equipment_count} Devices)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-4.5 items-start">
                {/* Left Column: Manage Active Subscription + Licensed Devices list */}
                <div className="space-y-4">
                  {/* Active Subscription Details Card */}
                  <div className="bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200/60 dark:border-zinc-800/80 rounded-lg p-4.5 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                          Manage Active Subscription
                        </h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Details for {activeSub.service_name} ({billingCycle || 'monthly'} billing)
                        </p>
                      </div>
                      <span className="bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-zinc-950 dark:border-zinc-200">
                        ACTIVE
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                      <div className="p-3 bg-zinc-100/50 dark:bg-zinc-800/30 rounded border border-zinc-200/50 dark:border-zinc-800/60">
                        <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-0.5">
                          Devices
                        </p>
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {activeSub.equipment_count}x Managed Units
                        </p>
                      </div>
                      <div className="p-3 bg-zinc-100/50 dark:bg-zinc-800/30 rounded border border-zinc-200/50 dark:border-zinc-800/60">
                        <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-0.5">
                          Cycle
                        </p>
                        <p className="text-xs font-semibold capitalize text-zinc-900 dark:text-zinc-100">
                          {billingCycle || 'monthly'}
                        </p>
                      </div>
                      <div className="p-3 bg-zinc-100/50 dark:bg-zinc-800/30 rounded border border-zinc-200/50 dark:border-zinc-800/60">
                        <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-0.5">
                          Renewal
                        </p>
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                          {activeSub.renewal_date
                            ? new Date(activeSub.renewal_date).toLocaleDateString()
                            : 'N/A'}
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
                  <div className="bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200/60 dark:border-zinc-800/80 rounded-lg p-4 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
                      {t('plans.planSummary')}
                    </h4>
                    {(() => {
                      const basePrice = currentPlan
                        ? billingCycle === 'annual'
                          ? currentPlan.price * 0.8
                          : currentPlan.price
                        : 0;
                      const planName = currentPlan
                        ? getPlanName(currentPlan.name)
                        : activeSub.service_name;
                      const additionalDevicesCount = Math.max(0, currentEquipmentCount - 1);
                      const additionalDevicesPrice = basePrice * additionalDevicesCount;
                      const estimatedTotal = basePrice * currentEquipmentCount;
                      const annualBilledTotal = basePrice * 12 * currentEquipmentCount;

                      return (
                        <div className="space-y-2.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                              {t('plans.basePlanName', { name: planName })}
                            </span>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                              ${basePrice.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                              {t('plans.addonCloudStorage')}
                            </span>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide text-[9px] px-1 bg-zinc-100 dark:bg-zinc-800 rounded">
                              {t('plans.included')}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                              {t('plans.additionalDevices', { count: additionalDevicesCount })}
                            </span>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                              ${additionalDevicesPrice.toFixed(2)}
                            </span>
                          </div>
                          <div className="pt-2.5 border-t border-zinc-200/50 dark:border-zinc-800/50">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                                {t('plans.estimatedMonthly')}
                              </span>
                              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50 font-mono">
                                ${estimatedTotal.toFixed(2)}
                              </span>
                            </div>
                            {billingCycle === 'annual' && (
                              <p className="text-right text-[9px] text-zinc-450 dark:text-zinc-500 mt-0.5 font-medium">
                                Billed annually as ${annualBilledTotal.toFixed(2)}/yr
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Tailored Enterprise Help Card */}
                  <div className="bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 border border-zinc-900 dark:border-zinc-100 rounded-lg p-4 relative overflow-hidden shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)]">
                    <div className="relative z-10">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-350 dark:text-zinc-650 mb-1">
                        Need a custom plan?
                      </h4>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mb-3 leading-normal font-medium">
                        For organizations with over 100 devices, we offer tailored enterprise solutions.
                      </p>
                      <button className="w-full py-1.5 bg-white text-zinc-950 dark:bg-zinc-900 dark:text-zinc-50 border border-zinc-200 dark:border-zinc-800 font-semibold rounded text-xs hover:opacity-95 transition-opacity cursor-pointer">
                        Contact Sales
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
          onMoveFeature={handleMoveFeature}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
        />
      )}
    </Page>
  );
}
