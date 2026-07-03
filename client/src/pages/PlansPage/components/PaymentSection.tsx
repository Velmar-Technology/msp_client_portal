import { useTranslation } from 'react-i18next';
import type { Plan } from '../../../services/planService';
import type { Subscription } from '../../../services/subscriptionService';
import type { AuthUser } from '../../../store/useAuthStore';
import { CheckoutSheet } from '../../../components/CheckoutSheet';
import { Input } from '../../../components/ui/input';

interface PaymentSectionProps {
  currentPlan: Plan;
  billingCycle: 'monthly' | 'annual';
  currentEquipmentCount: number;
  subtotal: number;
  tax: number;
  total: number;
  isAdmin: boolean;
  acceptedTos: boolean;
  setAcceptedTos: (val: boolean) => void;
  paymentMethod: 'card' | 'transfer';
  setPaymentMethod: (val: 'card' | 'transfer') => void;
  paymentMessage: string | null;
  reference: string;
  subscribeLoading: boolean;
  handleProcessSubscription: (e: React.FormEvent) => Promise<void>;
  activeSubscriptions: Subscription[];
  getPlanName: (name: string | Record<string, string>) => string;
  clients: AuthUser[];
  selectedClientId: string;
  setSelectedClientId: (val: string) => void;
  unregisteredEmail: string;
  setUnregisteredEmail: (val: string) => void;
  unregisteredName: string;
  setUnregisteredName: (val: string) => void;
  quoteLoading: boolean;
  handleSendQuote: (e: React.MouseEvent) => Promise<void>;
  actionType: 'subscribe' | 'modify';
  setActionType: (val: 'subscribe' | 'modify') => void;
  subscriptionToModifyId: string;
  setSubscriptionToModifyId: (val: string) => void;
  handleUpdateSubscription: (subId: string, count: number) => Promise<void>;
  handleCancelSubscription: (subId: string) => Promise<void>;
}

export function PaymentSection({
  currentPlan,
  billingCycle,
  currentEquipmentCount,
  subtotal,
  tax,
  total,
  isAdmin,
  acceptedTos,
  setAcceptedTos,
  paymentMethod,
  setPaymentMethod,
  paymentMessage,
  reference,
  subscribeLoading,
  handleProcessSubscription,
  activeSubscriptions,
  getPlanName,
  clients,
  selectedClientId,
  setSelectedClientId,
  unregisteredEmail,
  setUnregisteredEmail,
  unregisteredName,
  setUnregisteredName,
  quoteLoading,
  handleSendQuote,
  actionType,
  setActionType,
  subscriptionToModifyId,
  setSubscriptionToModifyId,
  handleUpdateSubscription,
  handleCancelSubscription,
}: PaymentSectionProps) {
  const { t } = useTranslation();

  const renderManageActiveSubscription = (activeSub: Subscription) => {
    const isMockOrI = activeSub.paypal_order_id?.startsWith('I-') || activeSub.paypal_order_id?.startsWith('MOCK-SUB-');
    const isIncreaseCount = currentEquipmentCount > activeSub.equipment_count;
    const isSamePlanAndCount = currentPlan?.id === activeSub.plan && currentEquipmentCount === activeSub.equipment_count;

    return (
      <div className="space-y-4 text-zinc-900 dark:text-zinc-50">
        <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800/80 pb-3">
          <div>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
              {t('plans.currentService') || 'Current Service'}
            </p>
            <p className="text-base font-bold text-zinc-900 dark:text-zinc-50 mt-0.5">{activeSub.service_name}</p>
          </div>
          <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
            {t('plans.activeStatus')?.toUpperCase() || 'ACTIVE'}
          </span>
        </div>

        {!isSamePlanAndCount ? (
          <div className="space-y-3">
            <div className="bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-200/50 dark:border-zinc-800/50 rounded p-3">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                {t('plans.subscriptionModification') || 'Subscription Modification'}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-normal">
                {t('plans.subscriptionModificationDesc', { name: getPlanName(currentPlan.name), count: currentEquipmentCount })}
              </p>
            </div>

            {!isAdmin && (
              <div className="flex items-start gap-2 p-2 bg-zinc-100/40 dark:bg-zinc-800/20 rounded border border-zinc-200/40 dark:border-zinc-800/50 my-2">
                <input
                  type="checkbox"
                  id="tos-checkbox-manage"
                  checked={acceptedTos}
                  onChange={(e) => setAcceptedTos(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-zinc-900 mt-0.5 cursor-pointer"
                />
                <label
                  htmlFor="tos-checkbox-manage"
                  className="text-xs text-zinc-500 dark:text-zinc-400 cursor-pointer select-none font-medium leading-normal"
                >
                  {t('plans.agreeToTermsPrefix')}{' '}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-900 dark:text-zinc-100 underline hover:opacity-80 transition-opacity font-semibold"
                  >
                    {t('plans.termsOfServiceLink')}
                  </a>
                </label>
              </div>
            )}

            {isIncreaseCount && !isMockOrI ? (
              <div className="mt-2 border-t border-zinc-200/50 dark:border-zinc-800/50 pt-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2 leading-normal">
                  {t('plans.addDevicesPaymentNotice') || 'Adding more devices requires a PayPal payment to activate the additional licenses immediately.'}
                </p>
                <div
                  id="paypal-upgrade-button-container"
                  className="my-1.5 min-h-[100px] flex items-center justify-center bg-zinc-50/20 rounded-md p-3 border border-zinc-200 dark:border-zinc-800 border-dashed"
                >
                  <span className="text-xs text-zinc-450 dark:text-zinc-500">
                    {t('plans.loadingPayPal') || 'Loading PayPal Upgrade...'}
                  </span>
                </div>
                {paymentMessage && <p className="text-xs text-zinc-900 dark:text-zinc-50 font-semibold mt-1.5">{paymentMessage}</p>}
              </div>
            ) : (
              <button
                onClick={() => handleUpdateSubscription(activeSub.id, currentEquipmentCount)}
                disabled={subscribeLoading}
                className="w-full bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 py-2 rounded text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {subscribeLoading ? (t('plans.updatingStatus') || 'Updating...') : (t('plans.updateSubscription') || 'Update Subscription')}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-red-500/5 border border-red-500/10 rounded p-3">
              <p className="text-xs font-semibold text-red-650 dark:text-red-400">
                {t('plans.cancelWarningTitle') || 'Cancellation Warning'}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-normal">
                {t('plans.cancelWarningDesc') || 'Cancelling your subscription will take effect immediately. You will lose access to premium support services.'}
              </p>
            </div>

            <button
              onClick={() => handleCancelSubscription(activeSub.id)}
              disabled={subscribeLoading}
              className="w-full bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-450 border border-red-200/60 dark:border-red-900/40 py-2 rounded text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {subscribeLoading ? (t('plans.cancellingStatus') || 'Cancelling...') : (t('plans.cancelSubscription') || 'Cancel Subscription')}
            </button>
          </div>
        )}
      </div>
    );
  };

  const activeSubForPlan = activeSubscriptions.find(
    (sub) => sub.plan === currentPlan?.id && sub.status === 'ACTIVE'
  );

  return (
    <div className="bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200/60 dark:border-zinc-800/80 rounded-lg p-4 shadow-[0_1px_2px_rgba(0,0,0,0.01)] text-zinc-900 dark:text-zinc-50">
      {/* Header Banner */}
      <div className="flex justify-between items-center border-b border-zinc-200/50 dark:border-zinc-800/50 pb-3 mb-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t('plans.planTitle', { name: getPlanName(currentPlan.name) }) || `${getPlanName(currentPlan.name)} Plan`}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
            {currentEquipmentCount}x {t('plans.equipmentCountSuffix')} •{' '}
            {billingCycle === 'annual' ? (t('plans.annualButtonLabel') || 'Annually') : (t('plans.monthlyButtonLabel') || 'Monthly')}
          </p>
        </div>
      </div>

      {isAdmin ? (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
            {t('plans.applyPlanToCustomer') || 'Apply Plan to Customer'}
          </h4>
          <div className="space-y-3">
            <div>
              <label
                htmlFor="customer-select"
                className="block text-xs text-zinc-500 dark:text-zinc-450 mb-1 font-semibold uppercase tracking-wider"
              >
                {t('plans.selectCustomer') || 'Select Customer'}
              </label>
              <select
                id="customer-select"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full h-8.5 px-2 border border-zinc-200/85 dark:border-zinc-800 rounded text-xs focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-55 mt-0.5"
              >
                {clients.length === 0 ? (
                  <option value="" disabled>
                    {t('plans.noCustomersFound') || 'No registered customers found'}
                  </option>
                ) : (
                  clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.email})
                    </option>
                  ))
                )}
                <option value="unregistered">{t('plans.unregisteredOption')}</option>
              </select>
            </div>

            {selectedClientId === 'unregistered' && (
              <div className="space-y-2 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
                <div>
                  <label
                    htmlFor="unregistered-email-admin"
                    className="block text-[10px] text-zinc-500 dark:text-zinc-450 mb-1 font-semibold uppercase tracking-wider"
                  >
                    {t('plans.unregisteredEmailLabel')}
                  </label>
                  <Input
                    id="unregistered-email-admin"
                    type="email"
                    required
                    value={unregisteredEmail}
                    onChange={(e) => setUnregisteredEmail(e.target.value)}
                    placeholder={t('plans.unregisteredEmailPlaceholder')}
                    className="h-8.5 text-xs bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-55 border-zinc-200 dark:border-zinc-800"
                  />
                </div>
                <div>
                  <label
                    htmlFor="unregistered-name-admin"
                    className="block text-[10px] text-zinc-500 dark:text-zinc-450 mb-1 font-semibold uppercase tracking-wider"
                  >
                    {t('plans.unregisteredNameLabel')}
                  </label>
                  <Input
                    id="unregistered-name-admin"
                    type="text"
                    value={unregisteredName}
                    onChange={(e) => setUnregisteredName(e.target.value)}
                    placeholder={t('plans.unregisteredNamePlaceholder')}
                    className="h-8.5 text-xs bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-55 border-zinc-200 dark:border-zinc-800"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleProcessSubscription}
              disabled={subscribeLoading || selectedClientId === 'unregistered' || clients.length === 0}
              className="w-full bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 py-2 rounded text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {subscribeLoading ? (t('plans.applyingStatus') || 'Applying...') : (t('plans.applyPlanToCustomer') || 'Apply Plan to Customer')}
            </button>

            <button
              type="button"
              onClick={handleSendQuote}
              disabled={quoteLoading || subscribeLoading || !selectedClientId}
              className="w-full border border-zinc-200 hover:bg-zinc-100/50 text-zinc-800 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900/50 py-2 rounded text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {quoteLoading ? t('plans.quoteSending') : t('plans.sendQuoteToCustomer')}
            </button>
          </div>
        </div>
      ) : (
        (() => {
          if (activeSubForPlan) {
            return (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {t('plans.manageActiveSub') || 'Manage Active Subscription'}
                </h4>
                {renderManageActiveSubscription(activeSubForPlan)}
              </div>
            );
          }

          if (activeSubscriptions.length === 0) {
            return (
              <CheckoutSheet
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
              />
            );
          }

          return (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mb-1">
                  {t('plans.selectActionForPlan', { name: getPlanName(currentPlan.name) })}
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal mb-3">
                  {t('plans.selectActionDesc') || 'You have existing active subscriptions. Choose whether you want to replace one of them or add this plan as a new additional subscription.'}
                </p>

                <div className="bg-zinc-150/70 dark:bg-zinc-800/60 border border-zinc-200/50 dark:border-zinc-700/50 p-0.5 rounded-md flex items-center gap-0.5 w-full shadow-[0_1px_2px_rgba(0,0,0,0.01)] mb-4">
                  <button
                    type="button"
                    onClick={() => setActionType('modify')}
                    className={`flex-1 py-1 rounded-sm text-xs font-semibold transition-all cursor-pointer ${
                      actionType === 'modify'
                        ? 'bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 border border-zinc-200/45 dark:border-zinc-850/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 border border-transparent'
                    }`}
                  >
                    {t('plans.changeExistingPlan') || 'Change Existing Plan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionType('subscribe')}
                    className={`flex-1 py-1 rounded-sm text-xs font-semibold transition-all cursor-pointer ${
                      actionType === 'subscribe'
                        ? 'bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 border border-zinc-200/45 dark:border-zinc-850/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 border border-transparent'
                    }`}
                  >
                    {t('plans.subscribeAsAdditionalPlan') || 'Subscribe as Additional Plan'}
                  </button>
                </div>
              </div>

              {actionType === 'subscribe' ? (
                <CheckoutSheet
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
                />
              ) : (
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="active-sub-select"
                      className="block text-[10px] text-zinc-500 dark:text-zinc-450 mb-1 font-semibold uppercase tracking-wider"
                    >
                      {t('plans.selectActiveSubToReplace') || 'Select Active Subscription to Replace'}
                    </label>
                    <select
                      id="active-sub-select"
                      value={subscriptionToModifyId}
                      onChange={(e) => setSubscriptionToModifyId(e.target.value)}
                      className="w-full h-8.5 px-2 border border-zinc-200/85 dark:border-zinc-800 rounded text-xs focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-55"
                    >
                      {activeSubscriptions.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.service_name} ({t('plans.equipmentCountLabel', { count: sub.equipment_count }) || `${sub.equipment_count} Equipment`})
                        </option>
                      ))}
                    </select>
                  </div>

                  {(() => {
                    const subToModify =
                      activeSubscriptions.find((sub) => sub.id === subscriptionToModifyId) ||
                      activeSubscriptions[0];
                    if (!subToModify) return null;
                    return renderManageActiveSubscription(subToModify);
                  })()}
                </div>
              )}
            </div>
          );
        })()
      )}
    </div>
  );
}
