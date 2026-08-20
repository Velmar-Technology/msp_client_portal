import { Ban, RefreshCw, UserCog } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Plan } from "@/services/planService";
import type { Subscription } from "@/services/subscriptionService";
import type { AuthUser } from "@/store/useAuthStore";
import { Input } from "@/components/ui/input";
import { BillingCycleSwitcher } from "./BillingCycleSwitcher";
import { PlanCard } from "./PlanCard";
import { SubscriptionModifyForm } from "./SubscriptionModifyForm";

interface AssignPlanWorkspaceProps {
  filteredPlans: Plan[];
  selectedPlan: string;
  billingCycle: "monthly" | "annual";
  setBillingCycle: (cycle: "monthly" | "annual") => void;
  equipmentCounts: Record<string, number>;
  onSelectPlan: (planId: string) => void;
  onAdjustEquipmentCount: (planId: string, delta: number) => void;
  getPlanName: (name: string | Record<string, string>) => string;
  getPlanDescription: (desc: string | Record<string, string> | null | undefined) => string;
  getFeatureText: (featureOrText: Plan["features"][number] | string | Record<string, string>) => string;
  getTierLabel: (planId: string) => string;
  clients: AuthUser[];
  selectedClientId: string;
  setSelectedClientId: (id: string) => void;
  unregisteredEmail: string;
  setUnregisteredEmail: (val: string) => void;
  unregisteredName: string;
  setUnregisteredName: (val: string) => void;
  customerSubscriptions: Subscription[];
  actionType: "subscribe" | "modify";
  setActionType: (val: "subscribe" | "modify") => void;
  subscriptionToModifyId: string;
  setSubscriptionToModifyId: (val: string) => void;
  currentPlan: Plan | undefined;
  currentEquipmentCount: number;
  subscribeLoading: boolean;
  quoteLoading: boolean;
  paymentMessage: string | null;
  acceptedTos: boolean;
  setAcceptedTos: (val: boolean) => void;
  onApplyPlan: (e?: React.SyntheticEvent) => Promise<void>;
  onSendQuote: (e: React.MouseEvent) => Promise<void>;
  onUpdateSubscription: (subId: string, count: number) => Promise<boolean | void>;
  onCancelSubscription: (sub: Subscription) => void;
}

export function AssignPlanWorkspace({
  filteredPlans,
  selectedPlan,
  billingCycle,
  setBillingCycle,
  equipmentCounts,
  onSelectPlan,
  onAdjustEquipmentCount,
  getPlanName,
  getPlanDescription,
  getFeatureText,
  getTierLabel,
  clients,
  selectedClientId,
  setSelectedClientId,
  unregisteredEmail,
  setUnregisteredEmail,
  unregisteredName,
  setUnregisteredName,
  customerSubscriptions,
  actionType,
  setActionType,
  subscriptionToModifyId,
  setSubscriptionToModifyId,
  currentPlan,
  currentEquipmentCount,
  subscribeLoading,
  quoteLoading,
  paymentMessage,
  acceptedTos,
  setAcceptedTos,
  onApplyPlan,
  onSendQuote,
  onUpdateSubscription,
  onCancelSubscription,
}: AssignPlanWorkspaceProps) {
  const { t, i18n } = useTranslation();

  const isUnregisteredCustomer = selectedClientId === "unregistered";
  const effectiveAction =
    isUnregisteredCustomer || customerSubscriptions.length === 0 ? "subscribe" : actionType;
  const subToModify =
    customerSubscriptions.find((sub) => sub.id === subscriptionToModifyId) || customerSubscriptions[0];

  return (
    <div className="text-foreground">
      {/* Workspace Intro */}
      <div className="text-center mb-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground font-heading flex items-center justify-center gap-1.5">
          <UserCog className="h-4 w-4" />
          {t("plans.assignTab")}
        </h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-xl mx-auto leading-normal">
          {t("plans.assignWorkspaceSubtitle")}
        </p>
      </div>

      {/* Customer Selector */}
      <div className="bg-card border border-border rounded-lg p-4 shadow-xs max-w-xl mx-auto mb-6">
        <label
          htmlFor="workspace-customer-select"
          className="block text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider"
        >
          {t("plans.selectCustomer") || "Select Customer"}
        </label>
        <select
          id="workspace-customer-select"
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

        {isUnregisteredCustomer && (
          <div className="space-y-2 pt-3 mt-3 border-t border-border">
            <div>
              <label
                htmlFor="workspace-unregistered-email"
                className="block text-[10px] text-muted-foreground mb-1 font-semibold uppercase tracking-wider"
              >
                {t("plans.unregisteredEmailLabel")}
              </label>
              <Input
                id="workspace-unregistered-email"
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
                htmlFor="workspace-unregistered-name"
                className="block text-[10px] text-muted-foreground mb-1 font-semibold uppercase tracking-wider"
              >
                {t("plans.unregisteredNameLabel")}
              </label>
              <Input
                id="workspace-unregistered-name"
                type="text"
                value={unregisteredName}
                onChange={(e) => setUnregisteredName(e.target.value)}
                placeholder={t("plans.unregisteredNamePlaceholder")}
                className="h-8.5 text-xs bg-background text-foreground border-input"
              />
            </div>
          </div>
        )}
      </div>

      {/* Billing Cycle */}
      <div className="flex justify-center mb-4">
        <BillingCycleSwitcher billingCycle={billingCycle} setBillingCycle={setBillingCycle} />
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
            isAdmin
            activeSubscriptions={customerSubscriptions}
            onSelect={onSelectPlan}
            onAdjustEquipmentCount={onAdjustEquipmentCount}
            getPlanName={getPlanName}
            getPlanDescription={getPlanDescription}
            getFeatureText={getFeatureText}
            getTierLabel={getTierLabel}
          />
        ))}
      </div>

      {/* Customer Subscriptions Overview */}
      {!isUnregisteredCustomer && (
        <section className="max-w-3xl mx-auto mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-heading mb-2">
            {t("plans.customerSubsTitle")}
          </h3>
          {customerSubscriptions.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-6 shadow-xs text-center">
              <p className="text-xs text-muted-foreground">
                {t("plans.noCustomerSubs")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {customerSubscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className={`bg-card border rounded-lg p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    sub.id === subscriptionToModifyId ? "border-primary ring-1 ring-primary" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground text-xs font-heading">{sub.service_name}</span>
                    <span className="inline-block px-1.5 py-0.5 border border-border rounded font-mono text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {getTierLabel(sub.plan)}
                    </span>
                    <span className="bg-muted text-foreground border border-border px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider">
                      {t("plans.devicesCount", { count: sub.equipment_count })}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {t("plans.renewalDate")}:{" "}
                      {new Date(sub.renewal_date).toLocaleDateString(
                        i18n.language.startsWith("es") ? "es-DO" : "en-US",
                        { day: "2-digit", month: "short", year: "numeric" },
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActionType("modify");
                        setSubscriptionToModifyId(sub.id);
                        if (currentPlan?.id !== sub.plan) {
                          onSelectPlan(sub.plan);
                        }
                      }}
                      className="flex items-center gap-1 text-xs text-foreground font-semibold cursor-pointer border border-border px-2 py-1 rounded bg-card hover:bg-muted"
                    >
                      <RefreshCw className="h-3 w-3" />
                      {t("plans.modifyThisSub")}
                    </button>
                    <button
                      type="button"
                      onClick={() => onCancelSubscription(sub)}
                      className="flex items-center gap-1 text-xs text-destructive font-semibold cursor-pointer border border-destructive/20 px-2 py-1 rounded bg-destructive/10 hover:bg-destructive/20 transition-colors"
                    >
                      <Ban className="h-3 w-3" />
                      {t("plans.cancelThisSub")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Action Panel */}
      {currentPlan && (
        <div className="bg-card border border-border rounded-lg p-4 shadow-xs max-w-xl mx-auto text-foreground">
          {customerSubscriptions.length > 0 && !isUnregisteredCustomer && (
            <div className="bg-muted border border-border p-0.5 rounded-md flex items-center gap-0.5 w-full shadow-xs mb-4">
              <button
                type="button"
                onClick={() => setActionType("subscribe")}
                className={`flex-1 py-1 rounded-xs text-xs font-semibold transition-all cursor-pointer ${
                  effectiveAction === "subscribe"
                    ? "bg-card text-foreground border border-border shadow-xs"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                {t("plans.newSubscriptionAction")}
              </button>
              <button
                type="button"
                onClick={() => setActionType("modify")}
                className={`flex-1 py-1 rounded-xs text-xs font-semibold transition-all cursor-pointer ${
                  effectiveAction === "modify"
                    ? "bg-card text-foreground border border-border shadow-xs"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                {t("plans.changeExistingPlan") || "Change Existing Plan"}
              </button>
            </div>
          )}

          {effectiveAction === "modify" && subToModify ? (
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="workspace-sub-select"
                  className="block text-[10px] text-muted-foreground mb-1 font-semibold uppercase tracking-wider"
                >
                  {t("plans.selectActiveSubToReplace") || "Select Active Subscription to Replace"}
                </label>
                <select
                  id="workspace-sub-select"
                  value={subToModify.id}
                  onChange={(e) => setSubscriptionToModifyId(e.target.value)}
                  className="w-full h-8.5 px-2 border border-input rounded text-xs focus:outline-none focus:ring-1 focus:ring-ring bg-background text-foreground"
                >
                  {customerSubscriptions.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.service_name} (
                      {t("plans.equipmentCountLabel", { count: sub.equipment_count }) ||
                        `${sub.equipment_count} Equipment`}
                      )
                    </option>
                  ))}
                </select>
              </div>

              <SubscriptionModifyForm
                activeSub={subToModify}
                currentPlan={currentPlan}
                currentPlanName={getPlanName(currentPlan.name)}
                currentEquipmentCount={currentEquipmentCount}
                isAdmin
                acceptedTos={acceptedTos}
                setAcceptedTos={setAcceptedTos}
                paymentMessage={paymentMessage}
                subscribeLoading={subscribeLoading}
                onUpdateSubscription={onUpdateSubscription}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold tracking-tight text-foreground font-heading mb-2">
                {t("plans.applyPlanToCustomer") || "Apply Plan to Customer"}
              </h4>
              <button
                onClick={onApplyPlan}
                disabled={subscribeLoading || selectedClientId === "unregistered" || clients.length === 0}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-2 rounded text-xs font-semibold transition-opacity flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {subscribeLoading
                  ? t("plans.applyingStatus") || "Applying..."
                  : t("plans.applyPlanToCustomer") || "Apply Plan to Customer"}
              </button>

              <button
                type="button"
                onClick={onSendQuote}
                disabled={quoteLoading || subscribeLoading || !selectedClientId}
                className="w-full border border-border hover:bg-muted text-foreground py-2 rounded text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {quoteLoading ? t("plans.quoteSending") : t("plans.sendQuoteToCustomer")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AssignPlanWorkspace;
