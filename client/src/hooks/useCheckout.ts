import { useState, useMemo } from "react";
import type { Plan } from "@/services/planService";

interface UseCheckoutProps {
  currentPlan: Plan;
  billingCycle: "monthly" | "annual";
  currentEquipmentCount: number;
}

export function useCheckout({
  currentPlan,
  billingCycle,
  currentEquipmentCount,
}: UseCheckoutProps) {
  const [acceptedTos, setAcceptedTos] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "transfer">("card");

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

  return {
    acceptedTos,
    setAcceptedTos,
    paymentMethod,
    setPaymentMethod,
    subtotal,
    tax,
    total,
  };
}
