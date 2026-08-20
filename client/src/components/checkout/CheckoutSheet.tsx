import { useMemo, type SyntheticEvent } from "react";
import { useTranslation } from "react-i18next";
import { Shield } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Plan } from "@/services/planService";
import type { Subscription } from "@/services/subscriptionService";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { PaymentFields } from "@/components/checkout/PaymentFields";

export interface CheckoutStateProps {
  acceptedTos: boolean;
  setAcceptedTos: (accepted: boolean) => void;
  paymentMethod: "card" | "transfer";
  setPaymentMethod: (method: "card" | "transfer") => void;
  paymentMessage: string | null;
  reference: string;
  subscribeLoading: boolean;
  handleProcessSubscription: (e?: SyntheticEvent) => void;
}

export interface CheckoutSheetProps extends CheckoutStateProps {
  currentPlan: Plan;
  billingCycle: "monthly" | "annual";
  currentEquipmentCount: number;
  isAdmin: boolean;
  activeSubscriptions: Subscription[];
  getPlanName: (name: string | Record<string, string>) => string;
}

export function CheckoutSheet(props: CheckoutSheetProps) {
  const {
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
  } = props;

  const { t } = useTranslation();

  const priceMultiplier = useMemo(() => {
    return billingCycle === "annual" ? 12 * 0.8 : 1;
  }, [billingCycle]);

  const subtotal = useMemo(() => {
    if (!currentPlan) return 0;
    return Math.round(currentPlan.price * priceMultiplier * currentEquipmentCount * 100) / 100;
  }, [currentPlan, priceMultiplier, currentEquipmentCount]);

  const tax = useMemo(() => {
    return Math.round(subtotal * 0.18 * 100) / 100;
  }, [subtotal]);

  const total = useMemo(() => {
    return Math.round((subtotal + tax) * 100) / 100;
  }, [subtotal, tax]);

  if (currentPlan) {
    const alreadySubscribed = activeSubscriptions.some((sub) => sub.plan === currentPlan.id && sub.status === "ACTIVE");
    if (alreadySubscribed) {
      return (
        <div className="rounded-lg border border-border bg-secondary/15 p-3.5 text-center text-xs space-y-1.5 my-4">
          <p className="font-semibold text-secondary-foreground">
            {t("plans.activePlanAlreadyRegistered") || "Active Plan Already Registered"}
          </p>
          <p className="text-muted-foreground leading-normal">
            {t("plans.alreadySubscribedDesc", { name: getPlanName(currentPlan.name) })}
          </p>
        </div>
      );
    }
  }

  return (
    <div className="space-y-3 text-center py-2">
      <p className="text-xs text-muted-foreground leading-relaxed">
        {t("plans.readyToActivate", { name: getPlanName(currentPlan.name) })}
      </p>
      <Sheet>
        <SheetTrigger asChild>
          <button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded text-xs font-semibold transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-xs">
            {t("plans.proceedToCheckout", { total: total.toFixed(2) })}
          </button>
        </SheetTrigger>
        <SheetContent className="w-95 p-4 sm:w-110 overflow-y-auto bg-card text-foreground border-l border-border">
          <SheetHeader className="pb-3 border-b border-border">
            <SheetTitle className="text-sm font-bold text-foreground font-heading">
              {t("plans.orderSummary")}
            </SheetTitle>
          </SheetHeader>

          <div className="py-4 space-y-4">
            <OrderSummary
              planName={getPlanName(currentPlan.name)}
              billingCycle={billingCycle}
              currentEquipmentCount={currentEquipmentCount}
              subtotal={subtotal}
              tax={tax}
              total={total}
            />

            <div className="border-t border-border pt-4">
              <PaymentFields
                isAdmin={isAdmin}
                acceptedTos={acceptedTos}
                setAcceptedTos={setAcceptedTos}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                paymentMessage={paymentMessage}
                reference={reference}
                subscribeLoading={subscribeLoading}
                handleProcessSubscription={handleProcessSubscription}
              />
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-3 flex items-start gap-2.5">
              <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-[11px] font-semibold text-foreground">{t("plans.encryptedTx")}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">{t("plans.militaryGradeSecurity")}</p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default CheckoutSheet;
