import { type SyntheticEvent } from "react";
import { useTranslation } from "react-i18next";
import type { Plan } from "@/services/planService";
import type { Subscription } from "@/services/subscriptionService";
import type { AuthUser } from "@/store/useAuthStore";
import { Input } from "@/components/ui/input";
import { CheckoutSheet } from "@/components/checkout-sheet";

interface PaymentSectionProps {
  currentPlan: Plan;
  billingCycle: "monthly" | "annual";
  currentEquipmentCount: number;
  subtotal: number;
  tax: number;
  total: number;
  isAdmin: boolean;
  acceptedTos: boolean;
  setAcceptedTos: (val: boolean) => void;
  paymentMethod: "card" | "transfer";
  setPaymentMethod: (val: "card" | "transfer") => void;
  paymentMessage: string | null;
  reference: string;
  subscribeLoading: boolean;
  handleProcessSubscription: (e?: SyntheticEvent) => Promise<void>;
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
  actionType: "subscribe" | "modify";
  setActionType: (val: "subscribe" | "modify") => void;
  subscriptionToModifyId: string;
  setSubscriptionToModifyId: (val: string) => void;
  handleUpdateSubscription: (subId: string, count: number) => Promise<void>;
  handleCancelSubscription: (subId: string) => Promise<void>;
}

export function PaymentSection({
  currentPlan,
  billingCycle,
  currentEquipmentCount,
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
    const isMockOrI = activeSub.paypal_order_id?.startsWith("I-") || activeSub.paypal_order_id?.startsWith("MOCK-SUB-");
    const isIncreaseCount = currentEquipmentCount > activeSub.equipment_count;
    const isSamePlanAndCount =
      currentPlan?.id === activeSub.plan && currentEquipmentCount === activeSub.equipment_count;

    return (
      <div className="space-y-4 text-foreground">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              {t("plans.currentService") || "Current Service"}
            </p>
            <p className="text-base font-bold text-foreground font-heading mt-0.5">{activeSub.service_name}</p>
          </div>
          <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
            {t("plans.activeStatus")?.toUpperCase() || "ACTIVE"}
          </span>
        </div>

        {!isSamePlanAndCount ? (
          <div className="space-y-3">
            <div className="bg-muted/40 border border-border rounded p-3">
              <p className="text-xs font-semibold text-foreground">
                {t("plans.subscriptionModification") || "Subscription Modification"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-normal">
                {t("plans.subscriptionModificationDesc", {
                  name: getPlanName(currentPlan.name),
                  count: currentEquipmentCount,
                })}
              </p>
            </div>

            {!isAdmin && (
              <div className="flex items-start gap-2 p-2 bg-muted/40 rounded border border-border my-2">
                <input
                  type="checkbox"
                  id="tos-checkbox-manage"
                  checked={acceptedTos}
                  onChange={(e) => setAcceptedTos(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-input text-primary focus:ring-ring mt-0.5 cursor-pointer"
                />
                <label
                  htmlFor="tos-checkbox-manage"
                  className="text-xs text-muted-foreground cursor-pointer select-none font-medium leading-normal"
                >
                  {t("plans.agreeToTermsPrefix")}{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground underline hover:opacity-80 transition-opacity font-semibold"
                  >
                    {t("plans.termsOfServiceLink")}
                  </a>
                </label>
              </div>
            )}

            {isIncreaseCount && !isMockOrI ? (
              <div className="mt-2 border-t border-border pt-3">
                <p className="text-xs text-muted-foreground mb-2 leading-normal">
                  {t("plans.addDevicesPaymentNotice") ||
                    "Adding more devices requires a PayPal payment to activate the additional licenses immediately."}
                </p>
                <div
                  id="paypal-upgrade-button-container"
                  className="my-1.5 min-h-25 flex items-center justify-center bg-muted/20 rounded-md p-3 border border-border border-dashed"
                >
                  <span className="text-xs text-muted-foreground">
                    {t("plans.loadingPayPal") || "Loading PayPal Upgrade..."}
                  </span>
                </div>
                {paymentMessage && (
                  <p className="text-xs text-foreground font-semibold mt-1.5">{paymentMessage}</p>
                )}
              </div>
            ) : (
              <button
                onClick={() => handleUpdateSubscription(activeSub.id, currentEquipmentCount)}
                disabled={subscribeLoading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-2 rounded text-xs font-semibold transition-opacity flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {subscribeLoading
                  ? t("plans.updatingStatus") || "Updating..."
                  : t("plans.updateSubscription") || "Update Subscription"}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-destructive/10 border border-destructive/20 rounded p-3">
              <p className="text-xs font-semibold text-destructive">
                {t("plans.cancelWarningTitle") || "Cancellation Warning"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-normal">
                {t("plans.cancelWarningDesc") ||
                  "Cancelling your subscription will take effect immediately. You will lose access to premium support services."}
              </p>
            </div>

            <button
              onClick={() => handleCancelSubscription(activeSub.id)}
              disabled={subscribeLoading}
              className="w-full bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 py-2 rounded text-xs font-semibold transition-opacity flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {subscribeLoading
                ? t("plans.cancellingStatus") || "Cancelling..."
                : t("plans.cancelSubscription") || "Cancel Subscription"}
            </button>
          </div>
        )}
      </div>
    );
  };

  const activeSubForPlan = activeSubscriptions.find((sub) => sub.plan === currentPlan?.id && sub.status === "ACTIVE");

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-xs text-foreground">
      {/* Header Banner */}
      <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-heading">
            {t("plans.planTitle", { name: getPlanName(currentPlan.name) }) || `${getPlanName(currentPlan.name)} Plan`}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            {currentEquipmentCount}x {t("plans.equipmentCountSuffix")} •{" "}
            {billingCycle === "annual"
              ? t("plans.annualButtonLabel") || "Annually"
              : t("plans.monthlyButtonLabel") || "Monthly"}
          </p>
        </div>
      </div>

      {isAdmin ? (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold tracking-tight text-foreground font-heading mb-2">
            {t("plans.applyPlanToCustomer") || "Apply Plan to Customer"}
          </h4>
          <div className="space-y-3">
            <div>
              <label
                htmlFor="customer-select"
                className="block text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider"
              >
                {t("plans.selectCustomer") || "Select Customer"}
              </label>
              <select
                id="customer-select"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full h-8.5 px-2 border border-input rounded text-xs focus:outline-none focus:ring-1 focus:ring-ring bg-background text-foreground mt-0.5"
              >
                {clients.length === 0 ? (
                  <option value="" disabled>
                    {t("plans.noCustomersFound") || "No registered customers found"}
                  </option>
                ) : (
                  clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.email})
                    </option>
                  ))
                )}
                <option value="unregistered">{t("plans.unregisteredOption")}</option>
              </select>
            </div>

            {selectedClientId === "unregistered" && (
              <div className="space-y-2 pt-2 border-t border-border">
                <div>
                  <label
                    htmlFor="unregistered-email-admin"
                    className="block text-[10px] text-muted-foreground mb-1 font-semibold uppercase tracking-wider"
                  >
                    {t("plans.unregisteredEmailLabel")}
                  </label>
                  <Input
                    id="unregistered-email-admin"
                    type="email"
                    required
                    value={unregisteredEmail}
                    onChange={(e) => setUnregisteredEmail(e.target.value)}
                    placeholder={t("plans.unregisteredEmailPlaceholder")}
                    className="h-8.5 text-xs bg-background text-foreground border-input"
                  />
                </div>
                <div>
                  <label
                    htmlFor="unregistered-name-admin"
                    className="block text-[10px] text-muted-foreground mb-1 font-semibold uppercase tracking-wider"
                  >
                    {t("plans.unregisteredNameLabel")}
                  </label>
                  <Input
                    id="unregistered-name-admin"
                    type="text"
                    value={unregisteredName}
                    onChange={(e) => setUnregisteredName(e.target.value)}
                    placeholder={t("plans.unregisteredNamePlaceholder")}
                    className="h-8.5 text-xs bg-background text-foreground border-input"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleProcessSubscription}
              disabled={subscribeLoading || selectedClientId === "unregistered" || clients.length === 0}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-2 rounded text-xs font-semibold transition-opacity flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {subscribeLoading
                ? t("plans.applyingStatus") || "Applying..."
                : t("plans.applyPlanToCustomer") || "Apply Plan to Customer"}
            </button>

            <button
              type="button"
              onClick={handleSendQuote}
              disabled={quoteLoading || subscribeLoading || !selectedClientId}
              className="w-full border border-border hover:bg-muted text-foreground py-2 rounded text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {quoteLoading ? t("plans.quoteSending") : t("plans.sendQuoteToCustomer")}
            </button>
          </div>
        </div>
      ) : (
        (() => {
          if (activeSubForPlan) {
            return (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold tracking-tight text-foreground font-heading">
                  {t("plans.manageActiveSub") || "Manage Active Subscription"}
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
                <h4 className="text-sm font-semibold tracking-tight text-foreground font-heading mb-1">
                  {t("plans.selectActionForPlan", { name: getPlanName(currentPlan.name) })}
                </h4>
                <p className="text-xs text-muted-foreground leading-normal mb-3">
                  {t("plans.selectActionDesc") ||
                    "You have existing active subscriptions. Choose whether you want to replace one of them or add this plan as a new additional subscription."}
                </p>

                <div className="bg-muted border border-border p-0.5 rounded-md flex items-center gap-0.5 w-full shadow-xs mb-4">
                  <button
                    type="button"
                    onClick={() => setActionType("modify")}
                    className={`flex-1 py-1 rounded-xs text-xs font-semibold transition-all cursor-pointer ${
                      actionType === "modify"
                        ? "bg-card text-foreground border border-border shadow-xs"
                        : "text-muted-foreground hover:text-foreground border border-transparent"
                    }`}
                  >
                    {t("plans.changeExistingPlan") || "Change Existing Plan"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionType("subscribe")}
                    className={`flex-1 py-1 rounded-xs text-xs font-semibold transition-all cursor-pointer ${
                      actionType === "subscribe"
                        ? "bg-card text-foreground border border-border shadow-xs"
                        : "text-muted-foreground hover:text-foreground border border-transparent"
                    }`}
                  >
                    {t("plans.subscribeAsAdditionalPlan") || "Subscribe as Additional Plan"}
                  </button>
                </div>
              </div>

              {actionType === "subscribe" ? (
                <CheckoutSheet
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
                />
              ) : (
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="active-sub-select"
                      className="block text-[10px] text-muted-foreground mb-1 font-semibold uppercase tracking-wider"
                    >
                      {t("plans.selectActiveSubToReplace") || "Select Active Subscription to Replace"}
                    </label>
                    <select
                      id="active-sub-select"
                      value={subscriptionToModifyId}
                      onChange={(e) => setSubscriptionToModifyId(e.target.value)}
                      className="w-full h-8.5 px-2 border border-input rounded text-xs focus:outline-none focus:ring-1 focus:ring-ring bg-background text-foreground"
                    >
                      {activeSubscriptions.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.service_name} (
                          {t("plans.equipmentCountLabel", { count: sub.equipment_count }) ||
                            `${sub.equipment_count} Equipment`}
                          )
                        </option>
                      ))}
                    </select>
                  </div>

                  {(() => {
                    const subToModify =
                      activeSubscriptions.find((sub) => sub.id === subscriptionToModifyId) || activeSubscriptions[0];
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

export default PaymentSection;
