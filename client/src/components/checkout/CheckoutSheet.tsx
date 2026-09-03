import { useMemo, useState, useCallback, type SyntheticEvent } from "react";
import { useTranslation } from "react-i18next";
import { Shield, AlertTriangle, Minus, Plus } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Plan, Subscription } from "@/features/subscriptions";
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
  existingSubscription?: Subscription;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  deviceDelta?: number;
  onDeviceDeltaChange?: (delta: number) => void;
  showStepper?: boolean;
  removeMode?: boolean;
  confirmLabel?: string;
  onConfirm?: () => void;
  paypalContainerId?: string;
  warningMessage?: string;
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
    existingSubscription,
    open,
    onOpenChange,
    deviceDelta: controlledDelta,
    onDeviceDeltaChange,
    showStepper = false,
    removeMode = false,
    confirmLabel,
    onConfirm,
    paypalContainerId,
    warningMessage,
  } = props;

  const { t } = useTranslation();
  const [internalDelta, setInternalDelta] = useState(1);
  const deviceDelta = controlledDelta ?? internalDelta;
  const setDeviceDelta = onDeviceDeltaChange ?? setInternalDelta;

  const isControlled = open !== undefined && onOpenChange !== undefined;
  const isModifyMode = !!existingSubscription;

  const currentCount = existingSubscription?.equipment_count ?? currentEquipmentCount;
  const targetCount = showStepper
    ? (existingSubscription
        ? (existingSubscription.plan === currentPlan?.id
            ? (removeMode ? Math.max(1, currentCount - deviceDelta) : currentCount + deviceDelta)
            : deviceDelta)
        : (removeMode ? Math.max(1, currentCount - deviceDelta) : currentCount + deviceDelta))
    : currentCount;

  const priceMultiplier = useMemo(() => {
    return billingCycle === "annual" ? 12 * 0.8 : 1;
  }, [billingCycle]);

  const subtotal = useMemo(() => {
    if (!currentPlan) return 0;
    return Math.round(currentPlan.price * priceMultiplier * targetCount * 100) / 100;
  }, [currentPlan, priceMultiplier, targetCount]);

  const tax = useMemo(() => {
    return Math.round(subtotal * 0.18 * 100) / 100;
  }, [subtotal]);

  const total = useMemo(() => {
    return Math.round((subtotal + tax) * 100) / 100;
  }, [subtotal, tax]);

  const handleSheetClose = useCallback(
    (value: boolean) => {
      if (onOpenChange) onOpenChange(value);
    },
    [onOpenChange],
  );

  if (!isModifyMode && currentPlan) {
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

  const sheetTitle = isModifyMode
    ? (warningMessage
        ? (t("plans.dialogCancelTitle") || "Cancel Subscription")
        : (t("plans.dialogAddDeviceTitle") || "Update Subscription"))
    : (t("plans.orderSummary"));

  const renderStepper = () => {
    if (!showStepper || !existingSubscription) return null;
    const maxDelta = removeMode ? Math.max(1, currentCount - 1) : 999;
    return (
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {removeMode
            ? (t("plans.dialogDevicesToRemove") || "Devices to Remove")
            : (t("plans.dialogDevicesToAdd") || "Devices to Add")}
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={deviceDelta <= 1}
            onClick={() => setDeviceDelta(Math.max(1, deviceDelta - 1))}
            className="h-8 w-8 flex items-center justify-center rounded border border-border bg-card hover:bg-muted transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          >
            <Minus className="h-3 w-3" />
          </button>
          <input
            type="number"
            min={1}
            max={maxDelta}
            value={deviceDelta}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (isNaN(val)) return;
              setDeviceDelta(Math.min(Math.max(1, val), maxDelta));
            }}
            className="h-8 w-16 text-center text-sm font-semibold text-foreground border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            type="button"
            disabled={deviceDelta >= maxDelta}
            onClick={() => setDeviceDelta(Math.min(maxDelta, deviceDelta + 1))}
            className="h-8 w-8 flex items-center justify-center rounded border border-border bg-card hover:bg-muted transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        {existingSubscription && (
          <p className="text-[10px] text-muted-foreground">
            {currentCount} → {targetCount}{" "}
            {t("plans.equipmentCountSuffix") || "devices"}
          </p>
        )}
      </div>
    );
  };

  const renderWarning = () => {
    if (!warningMessage) return null;
    return (
      <div className="flex items-start gap-2.5 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
        <p className="text-xs text-destructive leading-normal">{warningMessage}</p>
      </div>
    );
  };

  const renderConfirmButton = () => {
    if (!onConfirm) return null;
    return (
      <button
        type="button"
        disabled={subscribeLoading}
        onClick={onConfirm}
        className={`w-full py-2 rounded text-xs font-semibold transition-opacity flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
          warningMessage
            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
      >
        {subscribeLoading
          ? (t("plans.updatingStatus") || "Updating...")
          : (confirmLabel || t("plans.confirm") || "Confirm")}
      </button>
    );
  };

  const sheetContent = (
    <SheetContent className="w-95 p-4 sm:w-110 overflow-y-auto bg-card text-foreground border-l border-border">
      <SheetHeader className="pb-3 border-b border-border">
        <SheetTitle className="text-sm font-bold text-foreground font-heading">
          {sheetTitle}
        </SheetTitle>
      </SheetHeader>

      <div className="py-4 space-y-4">
        {renderWarning()}

        {currentPlan && (
          <OrderSummary
            planName={getPlanName(currentPlan.name)}
            billingCycle={billingCycle}
            currentEquipmentCount={targetCount}
            subtotal={subtotal}
            tax={tax}
            total={total}
          />
        )}

        {renderStepper()}

        {onConfirm ? (
          <div className="border-t border-border pt-4">
            {renderConfirmButton()}
          </div>
        ) : (
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
              paypalContainerId={paypalContainerId}
            />
          </div>
        )}

        <div className="rounded-lg border border-border bg-muted/40 p-3 flex items-start gap-2.5">
          <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-left">
            <p className="text-[11px] font-semibold text-foreground">{t("plans.encryptedTx")}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">{t("plans.militaryGradeSecurity")}</p>
          </div>
        </div>
      </div>
    </SheetContent>
  );

  if (isControlled) {
    return (
      <Sheet open={open} onOpenChange={handleSheetClose}>
        {sheetContent}
      </Sheet>
    );
  }

  return (
    <div className="space-y-3 text-center py-2">
      <p className="text-xs text-muted-foreground leading-relaxed">
        {t("plans.readyToActivate", { name: getPlanName(currentPlan.name) })}
      </p>
      <Sheet>
        <SheetTrigger
          render={
            <button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded text-xs font-semibold transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-xs">
              {t("plans.proceedToCheckout", { total: total.toFixed(2) })}
            </button>
          }
        />
        {sheetContent}
      </Sheet>
    </div>
  );
}

export default CheckoutSheet;
