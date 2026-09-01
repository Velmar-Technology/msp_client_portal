import { useState } from "react";
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

  const priceMultiplier = billingCycle === "annual" ? 12 * 0.8 : 1;
  const subtotal = currentPlan
    ? Math.round(currentPlan.price * priceMultiplier * currentEquipmentCount * 100) / 100
    : 0;
  const tax = Math.round(subtotal * 0.18 * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

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
