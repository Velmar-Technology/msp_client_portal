import { useState, useEffect, useCallback, useRef, useMemo, type SyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/hooks/useAuth";
import { useUrlState } from "@/hooks/useUrlState";
import { usePlanStore } from "@/store/usePlanStore";
import { useSubscriptionStore } from "@/store/useSubscriptionStore";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import { toast } from 'sonner';
import type { Plan, PlanFeature, PlanFilters, PlanClientType } from "@/services/planService";
import { subscriptionService } from "@/services/subscriptionService";
import { FEATURE_CATALOG } from "@/constants/featureCatalog";

export type PlansTab = "browse" | "assign" | "manage";

export function usePlansPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { plans, loading, fetchPlans, updatePlan, createPlan, deletePlan } = usePlanStore();

  const addToast = useCallback(({ title, message, type }: { title: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }) => {
    const tType = type || 'info';
    toast[tType](title, { description: message });
  }, []);

  const getLocalizedValue = useCallback((val: string | Record<string, string> | null | undefined): string => {
    if (!val) return "";
    if (typeof val === "string") {
      return val;
    }
    const lang = i18n.language || "en_US";
    const resolvedLang = lang.startsWith("es") ? "es_DO" : "en_US";

    if (val[resolvedLang]) return val[resolvedLang];
    if (val["en_US"]) return val["en_US"];
    const keys = Object.keys(val);
    if (keys.length > 0) return val[keys[0]];
    return "";
  }, [i18n.language]);

  const getPlanName = useCallback((name: string | Record<string, string>) => getLocalizedValue(name), [getLocalizedValue]);
  const getPlanDescription = useCallback((desc: string | Record<string, string> | null | undefined) => getLocalizedValue(desc), [getLocalizedValue]);

  const getFeatureText = useCallback(
    (featureOrText: PlanFeature | string | Record<string, string>) => {
      if (typeof featureOrText === "object" && featureOrText !== null && "included" in featureOrText) {
        const feature = featureOrText as PlanFeature;
        if (feature.text) {
          const locText = getLocalizedValue(feature.text);
          if (locText) return locText;
        }
        if (feature.code) {
          const key = `plans.features.${feature.code}`;
          const translated = t(key, feature.params || {});
          if (translated !== key) {
            return translated;
          }
        }
        return feature.code || "";
      }

      const val = featureOrText as string | Record<string, string>;
      if (typeof val !== "string") {
        return getLocalizedValue(val);
      }
      if (/^[a-zA-Z0-9_]+$/.test(val)) {
        const translated = t(`plans.features.${val}`);
        if (translated !== `plans.features.${val}`) {
          return translated;
        }
        const upperSnake = val.replace(/([A-Z])/g, "_$1").toUpperCase();
        const translatedUpper = t(`plans.features.${upperSnake}`);
        if (translatedUpper !== `plans.features.${upperSnake}`) {
          return translatedUpper;
        }
      }
      return val;
    },
    [getLocalizedValue, t],
  );

  const [userSelectedPlan, setUserSelectedPlan] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "transfer">("card");
  const [acceptedTos, setAcceptedTos] = useState(false);
  const acceptedTosRef = useRef(acceptedTos);
  
  useEffect(() => {
    acceptedTosRef.current = acceptedTos;
  }, [acceptedTos]);

  const [reference] = useState(
    () => `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`,
  );
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  // Tab Selector State (synced with the ?tab= URL search parameter)
  const { getParam, setParam } = useUrlState();
  const activeTab = getParam("tab", "browse") as PlansTab;
  const setActiveTab = useCallback(
    (tab: PlansTab) => setParam("tab", tab === "browse" ? null : tab),
    [setParam],
  );

  // Admin Editor State
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editId, setEditId] = useState("");
  const [editName, setEditName] = useState<Record<string, string>>({ en_US: "", es_DO: "" });
  const [editDescription, setEditDescription] = useState<Record<string, string>>({ en_US: "", es_DO: "" });
  const [editPrice, setEditPrice] = useState(0);
  const [editRecommended, setEditRecommended] = useState(false);
  const [editClientType, setEditClientType] = useState("CLIENT");
  const [editActive, setEditActive] = useState(true);
  const [editFeatures, setEditFeatures] = useState<PlanFeature[]>([]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Subscription store selectors
  const activeSubscriptions = useSubscriptionStore((s) => s.activeSubscriptions);
  const subscribeLoading = useSubscriptionStore((s) => s.subscribeLoading);
  const setSubscribeLoading = useSubscriptionStore((s) => s.setSubscribeLoading);
  const equipmentCounts = useSubscriptionStore((s) => s.equipmentCounts);
  const setEquipmentCounts = useSubscriptionStore((s) => s.setEquipmentCounts);
  const selectedClientId = useSubscriptionStore((s) => s.selectedClientId);
  const fetchActiveSubscriptions = useSubscriptionStore((s) => s.fetchActiveSubscriptions);

  // Checkout store selectors
  const checkoutOpen = useCheckoutStore((s) => s.checkoutOpen);
  const checkoutAction = useCheckoutStore((s) => s.checkoutAction);
  const checkoutSubscription = useCheckoutStore((s) => s.checkoutSubscription);
  const checkoutDeviceDelta = useCheckoutStore((s) => s.checkoutDeviceDelta);
  const paymentMessage = useCheckoutStore((s) => s.paymentMessage);
  const openCheckout = useCheckoutStore((s) => s.openCheckout);
  const closeCheckout = useCheckoutStore((s) => s.closeCheckout);
  const setCheckoutDeviceDelta = useCheckoutStore((s) => s.setCheckoutDeviceDelta);
  const setPaymentMessage = useCheckoutStore((s) => s.setPaymentMessage);

  const isAdmin = user?.role === "ADMIN";

  const [clientTypeFilter, setClientTypeFilter] = useState<"ALL" | PlanClientType>("ALL");

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      if (plan.active === false) return false;
      if (isAdmin || user?.role === "TECHNICIAN") {
        if (clientTypeFilter !== "ALL" && (plan.client_type || "CLIENT") !== clientTypeFilter) return false;
        return true;
      }
      const userClientType = user?.clientType || "CLIENT";
      const planClientType = plan.client_type || "CLIENT";
      return planClientType === userClientType;
    });
  }, [plans, isAdmin, user?.role, user?.clientType, clientTypeFilter]);

  useEffect(() => {
    const filters: PlanFilters =
      clientTypeFilter === "ALL" ? {} : { clientType: clientTypeFilter };
    fetchPlans(filters).catch((err) => console.error("Failed to fetch plans:", err));
  }, [fetchPlans, clientTypeFilter]);

  useEffect(() => {
    if (plans.length > 0) {
      const counts: Record<string, number> = {};
      plans.forEach((plan) => {
        counts[plan.id] = 1;
      });
      setEquipmentCounts((prev) => ({ ...counts, ...prev }));
    }
  }, [plans, setEquipmentCounts]);

  useEffect(() => {
    if (isAdmin || user?.role === "CLIENT") {
      fetchActiveSubscriptions();
    }
  }, [isAdmin, user, fetchActiveSubscriptions]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isAdmin && !userSelectedPlan && activeSubscriptions.length > 0) {
      setUserSelectedPlan(activeSubscriptions[0].plan);
    }
  }, [isAdmin, activeSubscriptions, userSelectedPlan]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const selectedPlan = useMemo(() => {
    return userSelectedPlan ||
      (activeSubscriptions.length > 0
        ? activeSubscriptions[0].plan
        : filteredPlans.find((p) => p.id === "STANDARD")
          ? "STANDARD"
          : filteredPlans[0]?.id || "");
  }, [userSelectedPlan, activeSubscriptions, filteredPlans]);

  const currentPlan = useMemo(() => {
    return filteredPlans.find((p) => p.id === selectedPlan) ||
      filteredPlans.find((p) => p.id === "STANDARD") ||
      filteredPlans[0];
  }, [filteredPlans, selectedPlan]);

  const [tierChangeSubId, setTierChangeSubId] = useState<string | null>(null);

  const currentEquipmentCount = useMemo(() => {
    return currentPlan ? (equipmentCounts[currentPlan.id] || 1) : 1;
  }, [currentPlan, equipmentCounts]);

  const getTierLabel = useCallback((planId: string) => {
    if (planId )
      return planId.toString();
    return "";
  }, []);

  // PayPal checkout effect
  useEffect(() => {
    if (isAdmin || user?.role !== "CLIENT" || paymentMethod !== "card" || !currentPlan) return;

    let scriptElement: HTMLScriptElement | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let buttonsInstance: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let upgradeButtonsInstance: any = null;

    async function initializePaypal() {
      const scriptId = "paypal-js-sdk-script";
      const existingScript = document.getElementById(scriptId) as HTMLScriptElement;

      if (!existingScript) {
        scriptElement = document.createElement("script");
        scriptElement.id = scriptId;
        const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || "test";
        scriptElement.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
        scriptElement.async = true;
        document.body.appendChild(scriptElement);

        await new Promise((resolve) => {
          if (scriptElement) scriptElement.onload = resolve;
          if (typeof window !== "undefined" && navigator.userAgent.includes("jsdom")) {
            setTimeout(resolve, 0);
          }
        });
      } else {
        scriptElement = existingScript;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(window as any).paypal) {
        console.error("PayPal SDK failed to load");
        setPaymentMessage("PayPal SDK failed to load");
        return;
      }

      const container = document.getElementById("paypal-button-container");
      if (container) {
        container.innerHTML = "";
        setPaymentMessage(null);
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const buttonConfig: any = {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onApprove: async (data: any) => {
              setPaymentMessage("Payment approved. Activating subscription...");
              setSubscribeLoading(true);
              try {
                await subscriptionService.create({
                  serviceName: getPlanName(currentPlan.name),
                  plan: currentPlan.id,
                  equipmentCount: currentEquipmentCount,
                  billingCycle,
                  paypalOrderId: data.subscriptionID || data.orderID,
                  paymentMethod: 'card',
                });
                setPaymentMessage("Subscription activated successfully!");
                addToast({
                  title: "Subscribed Successfully",
                  message: `Successfully subscribed to the ${getPlanName(currentPlan.name)} plan.`,
                  type: "success",
                });
                await fetchActiveSubscriptions();
              } catch (err) {
                console.error(err);
                setPaymentMessage("Failed to activate subscription.");
                addToast({
                  title: "Subscription Failed",
                  message: "Payment verification failed or could not activate subscription.",
                  type: "error",
                });
              } finally {
                setSubscribeLoading(false);
              }
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onError: (err: any) => {
              console.error(err);
              setPaymentMessage("PayPal Checkout encountered an error.");
            },
            createOrder: async () => {
              if (!acceptedTosRef.current) {
                addToast({
                  title: "Terms of Service",
                  message: "Please accept the Terms of Service before proceeding.",
                  type: "warning",
                });
                throw new Error("Terms of Service not accepted");
              }
              setPaymentMessage("Preparing checkout...");
              try {
                const response = await subscriptionService.createPaypalOrder({
                  plan: currentPlan.id,
                  equipmentCount: currentEquipmentCount,
                  billingCycle,
                });
                setPaymentMessage("Order created. Please approve payment in PayPal window.");
                return response.orderId;
              } catch (err) {
                console.error(err);
                setPaymentMessage("Failed to prepare checkout.");
                throw err;
              }
            },
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          buttonsInstance = (window as any).paypal.Buttons(buttonConfig);
          buttonsInstance.render("#paypal-button-container");
        } catch (err) {
          console.error("Failed to render PayPal buttons", err);
        }
      }

      const upgradeContainer = document.getElementById("paypal-upgrade-button-container");
      if (upgradeContainer) {
        upgradeContainer.innerHTML = "";
        setPaymentMessage(null);
        try {
          const activeSub =
            (tierChangeSubId
              ? activeSubscriptions.find((sub) => sub.id === tierChangeSubId)
              : activeSubscriptions.find((sub) => sub.plan === selectedPlan)) || activeSubscriptions[0];
          if (activeSub) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            upgradeButtonsInstance = (window as any).paypal.Buttons({
              createOrder: async () => {
                if (!acceptedTosRef.current) {
                  addToast({
                    title: "Terms of Service",
                    message: "Please accept the Terms of Service before proceeding.",
                    type: "warning",
                  });
                  throw new Error("Terms of Service not accepted");
                }
                setPaymentMessage("Preparing upgrade checkout...");
                try {
                  const response = await subscriptionService.createPaypalOrder({
                    plan: currentPlan.id,
                    equipmentCount: currentEquipmentCount,
                    billingCycle,
                    currentSubscriptionId: activeSub.id,
                  });
                  return response.orderId;
                } catch (err) {
                  console.error("Failed to create upgrade PayPal order:", err);
                  setPaymentMessage("Failed to initiate upgrade payment. Please try again.");
                  throw err;
                }
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onApprove: async (data: any) => {
                setPaymentMessage("Processing upgrade payment...");
                try {
                  await subscriptionService.update(activeSub.id, {
                    plan: currentPlan.id,
                    equipmentCount: currentEquipmentCount,
                    paypalOrderId: data.orderID,
                  });
                  addToast({
                    title: "Plan Upgraded!",
                    message: `Successfully upgraded to ${getPlanName(currentPlan.name)}.`,
                    type: "success",
                  });
                  await fetchActiveSubscriptions();
                  setPaymentMessage(null);
                } catch (err) {
                  console.error("Failed to capture upgrade payment:", err);
                  setPaymentMessage("Upgrade payment capture failed. Please contact support.");
                  addToast({
                    title: "Payment Error",
                    message: "Upgrade payment could not be processed.",
                    type: "error",
                  });
                }
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onError: (err: any) => {
                console.error("PayPal Upgrade Button Error:", err);
                setPaymentMessage("Payment service encountered an error.");
              },
              onCancel: () => {
                setPaymentMessage("Upgrade transaction cancelled.");
              },
            });

            if (upgradeButtonsInstance.isEligible()) {
              upgradeButtonsInstance.render("#paypal-upgrade-button-container");
            }
          }
        } catch (err) {
          console.error("Failed to render PayPal upgrade buttons", err);
        }
      }
    }

    const timer = setTimeout(() => {
      initializePaypal();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (upgradeButtonsInstance) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        upgradeButtonsInstance.close().catch((e: any) => console.error("Error closing upgrade buttons", e));
      }
      if (buttonsInstance && buttonsInstance.close) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        buttonsInstance.close().catch((e: any) => console.error("Error closing buttons", e));
      }
    };
  }, [
    isAdmin,
    user,
    paymentMethod,
    currentPlan,
    currentEquipmentCount,
    billingCycle,
    tierChangeSubId,
    selectedPlan,
    activeSubscriptions,
    fetchActiveSubscriptions,
    addToast,
    getPlanName,
    acceptedTos,
    setPaymentMessage,
    setSubscribeLoading,
  ]);

  // Modify/Renew PayPal effect (for Manage tab actions)
  useEffect(() => {
    if (isAdmin || user?.role !== "CLIENT" || paymentMethod !== "card") return;
    if (!checkoutOpen || !checkoutSubscription) return;
    if (checkoutAction !== "add_device" && checkoutAction !== "pay") return;

    let scriptElement: HTMLScriptElement | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let buttonsInstance: any = null;

    async function initializePaypal() {
      const scriptId = "paypal-js-sdk-script";
      const existingScript = document.getElementById(scriptId) as HTMLScriptElement;

      if (!existingScript) {
        scriptElement = document.createElement("script");
        scriptElement.id = scriptId;
        const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || "test";
        scriptElement.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
        scriptElement.async = true;
        document.body.appendChild(scriptElement);

        await new Promise((resolve) => {
          if (scriptElement) scriptElement.onload = resolve;
        });
      } else {
        scriptElement = existingScript;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(window as any).paypal || !checkoutSubscription) {
        setPaymentMessage("PayPal SDK failed to load");
        return;
      }

      const container = document.getElementById("paypal-modify-container");
      if (container) {
        container.innerHTML = "";
        setPaymentMessage(null);
        try {
          const currentSub = checkoutSubscription;
          const newCount = checkoutAction === "add_device"
            ? currentSub.equipment_count + checkoutDeviceDelta
            : currentSub.equipment_count;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          buttonsInstance = (window as any).paypal.Buttons({
            createOrder: async () => {
              setPaymentMessage("Preparing checkout...");
              try {
                const response = await subscriptionService.createPaypalOrder({
                  plan: currentSub.plan,
                  equipmentCount: newCount,
                  billingCycle,
                  currentSubscriptionId: currentSub.id,
                });
                setPaymentMessage("Order created. Please approve payment in PayPal window.");
                return response.orderId;
              } catch (err) {
                console.error(err);
                setPaymentMessage("Failed to prepare checkout.");
                throw err;
              }
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onApprove: async (data: any) => {
              setPaymentMessage("Payment approved. Updating subscription...");
              setSubscribeLoading(true);
              try {
                await subscriptionService.update(currentSub.id, {
                  plan: currentSub.plan,
                  equipmentCount: newCount,
                  paypalOrderId: data.orderID,
                });
                setPaymentMessage("Subscription updated successfully!");
                addToast({
                  title: "Subscription Updated",
                  message: `Successfully updated your subscription with ${newCount} devices.`,
                  type: "success",
                });
                closeCheckout();
                await fetchActiveSubscriptions();
              } catch (err) {
                console.error(err);
                setPaymentMessage("Failed to update subscription.");
                addToast({
                  title: "Update Failed",
                  message: "Payment verification failed or could not update subscription.",
                  type: "error",
                });
              } finally {
                setSubscribeLoading(false);
              }
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onError: (err: any) => {
              console.error(err);
              setPaymentMessage("PayPal Checkout encountered an error.");
            },
          });
          buttonsInstance.render("#paypal-modify-container");
        } catch (err) {
          console.error("Failed to render PayPal modify buttons", err);
        }
      }
    }

    const timer = setTimeout(() => {
      initializePaypal();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (buttonsInstance && buttonsInstance.close) {
        try {
          buttonsInstance.close().catch((e: unknown) => console.error("Error closing buttons", e));
        } catch {
          // ignore
        }
      }
    };
  }, [
    isAdmin,
    user,
    paymentMethod,
    checkoutOpen,
    checkoutSubscription,
    checkoutAction,
    checkoutDeviceDelta,
    billingCycle,
    addToast,
    fetchActiveSubscriptions,
    closeCheckout,
    setPaymentMessage,
    setSubscribeLoading,
  ]);

  const handleAdjustEquipmentCount = useCallback((planId: string, delta: number) => {
    setEquipmentCounts((prev) => ({
      ...prev,
      [planId]: Math.max(1, (prev[planId] || 1) + delta),
    }));
  }, [setEquipmentCounts]);

  const handleProcessSubscription = useCallback(async (e?: SyntheticEvent) => {
    e?.preventDefault();
    if (!currentPlan) return;

    if (!isAdmin && !acceptedTos) {
      addToast({
        title: "Terms of Service",
        message: "Please accept the Terms of Service before proceeding.",
        type: "warning",
      });
      return;
    }

    if (isAdmin && !selectedClientId) {
      addToast({
        title: "Validation Error",
        message: "Please select a customer to apply the plan to.",
        type: "error",
      });
      return;
    }

    setSubscribeLoading(true);
    try {
      await subscriptionService.create({
        serviceName: getPlanName(currentPlan.name),
        plan: currentPlan.id,
        equipmentCount: currentEquipmentCount,
        clientId: isAdmin ? selectedClientId : undefined,
        billingCycle,
        paymentMethod,
      });

      const isTransfer = paymentMethod === "transfer";
      addToast({
        title: isTransfer ? "Bank Transfer Intent Confirmed" : (isAdmin ? "Plan Applied" : "Subscribed Successfully"),
        message: isTransfer
          ? "Your bank transfer intent has been recorded. An invoice has been generated under your Billing page awaiting payment confirmation."
          : (isAdmin
            ? `Successfully applied the ${getPlanName(currentPlan.name)} plan to the customer.`
            : `Successfully subscribed to the ${getPlanName(currentPlan.name)} plan.`),
        type: "success",
      });
      await fetchActiveSubscriptions();
      if (isTransfer) {
        navigate('/billing');
      }
    } catch (err) {
      console.error("Failed to create subscription:", err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      addToast({
        title: "Subscription Failed",
        message: error.response?.data?.message || error.message || "Failed to create subscription.",
        type: "error",
      });
    } finally {
      setSubscribeLoading(false);
    }
  }, [currentPlan, isAdmin, acceptedTos, selectedClientId, currentEquipmentCount, billingCycle, paymentMethod, getPlanName, addToast, fetchActiveSubscriptions, navigate, setSubscribeLoading]);

  const handleUpdateSubscription = useCallback(async (subId: string, count: number): Promise<boolean> => {
    if (!currentPlan) return false;
    if (!isAdmin && !acceptedTos) {
      addToast({
        title: "Terms of Service",
        message: "Please accept the Terms of Service before proceeding.",
        type: "warning",
      });
      return false;
    }
    setSubscribeLoading(true);
    try {
      await subscriptionService.update(subId, {
        plan: currentPlan.id,
        equipmentCount: count,
      });
      addToast({
        title: "Subscription Updated",
        message: `Successfully updated your subscription to ${getPlanName(currentPlan.name)}.`,
        type: "success",
      });
      await fetchActiveSubscriptions();
      return true;
    } catch (err) {
      console.error("Failed to update subscription:", err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      addToast({
        title: "Update Failed",
        message: error.response?.data?.message || error.message || "Failed to update subscription.",
        type: "error",
      });
      return false;
    } finally {
      setSubscribeLoading(false);
    }
  }, [currentPlan, isAdmin, acceptedTos, getPlanName, addToast, fetchActiveSubscriptions, setSubscribeLoading]);

  const handleDirectCancelSubscription = useCallback(async (subId: string) => {
    setSubscribeLoading(true);
    try {
      await subscriptionService.update(subId, {
        status: "CANCELLED",
      });
      addToast({
        title: t("plans.cancelTitle") || "Subscription Cancellation Scheduled",
        message: t("plans.cancelSuccess") || "Your subscription cancellation has been scheduled. Services will remain active until the end of your billing period.",
        type: "success",
      });
      closeCheckout();
      await fetchActiveSubscriptions();
    } catch (err) {
      console.error("Failed to cancel subscription:", err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      addToast({
        title: t("plans.cancelErrorTitle") || "Cancellation Failed",
        message: error.response?.data?.message || error.message || "Failed to cancel subscription.",
        type: "error",
      });
    } finally {
      setSubscribeLoading(false);
    }
  }, [t, addToast, fetchActiveSubscriptions, closeCheckout, setSubscribeLoading]);

  const handleUpdateSubscriptionDirect = useCallback(async (subId: string, planId: string, count: number) => {
    setSubscribeLoading(true);
    try {
      await subscriptionService.update(subId, {
        plan: planId,
        equipmentCount: count,
      });
      addToast({
        title: t("plans.subscriptionUpdated") || "Subscription Updated",
        message: t("plans.deviceUpdateSuccess", { count }) || `Successfully updated device count to ${count}.`,
        type: "success",
      });
      await fetchActiveSubscriptions();
    } catch (err) {
      console.error("Failed to update subscription:", err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      addToast({
        title: t("plans.updateErrorTitle") || "Update Failed",
        message: error.response?.data?.message || error.message || "Failed to update subscription.",
        type: "error",
      });
    } finally {
      setSubscribeLoading(false);
    }
  }, [t, addToast, fetchActiveSubscriptions, setSubscribeLoading]);

  const handleModifySubscription = useCallback(async (e?: SyntheticEvent) => {
    e?.preventDefault();
    if (!checkoutSubscription || !currentPlan) return;

    if (!acceptedTos) {
      addToast({
        title: "Terms of Service",
        message: "Please accept the Terms of Service before proceeding.",
        type: "warning",
      });
      return;
    }

    setSubscribeLoading(true);
    try {
      const newCount = checkoutAction === "add_device"
        ? checkoutSubscription.equipment_count + checkoutDeviceDelta
        : checkoutSubscription.equipment_count;

      await subscriptionService.update(checkoutSubscription.id, {
        plan: checkoutSubscription.plan,
        equipmentCount: newCount,
      });

      addToast({
        title: "Bank Transfer Intent Confirmed",
        message: "Your bank transfer intent has been recorded. An invoice has been generated under your Billing page awaiting payment confirmation.",
        type: "success",
      });
      closeCheckout();
      await fetchActiveSubscriptions();
    } catch (err) {
      console.error("Failed to modify subscription:", err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      addToast({
        title: "Modify Failed",
        message: error.response?.data?.message || error.message || "Failed to modify subscription.",
        type: "error",
      });
    } finally {
      setSubscribeLoading(false);
    }
  }, [checkoutSubscription, checkoutAction, checkoutDeviceDelta, currentPlan, acceptedTos, addToast, fetchActiveSubscriptions, closeCheckout, setSubscribeLoading]);

  // Open Edit Modal
  const handleEditClick = useCallback((plan: Plan) => {
    setIsCreateMode(false);
    setEditingPlan(plan);
    setEditId(plan.id);

    if (typeof plan.name === "string") {
      setEditName({ en_US: plan.name, es_DO: plan.name });
    } else {
      setEditName({
        en_US: plan.name?.en_US || "",
        es_DO: plan.name?.es_DO || "",
      });
    }

    if (!plan.description) {
      setEditDescription({ en_US: "", es_DO: "" });
    } else if (typeof plan.description === "string") {
      setEditDescription({ en_US: plan.description, es_DO: plan.description });
    } else {
      setEditDescription({
        en_US: plan.description?.en_US || "",
        es_DO: plan.description?.es_DO || "",
      });
    }

    setEditPrice(plan.price);
    setEditRecommended(plan.recommended);
    setEditClientType(plan.client_type || "CLIENT");
    setEditActive(plan.active !== undefined ? plan.active : true);

    const parsedFeatures = plan.features.map((f) => {
      let textObj: Record<string, string>;
      if (typeof f.text === "string") {
        textObj = { en_US: f.text, es_DO: f.text };
      } else {
        textObj = {
          en_US: f.text?.en_US || "",
          es_DO: f.text?.es_DO || "",
        };
      }
      return {
        ...f,
        text: textObj,
      };
    });
    setEditFeatures(parsedFeatures);
  }, []);

  // Open Create Modal
  const handleCreateClick = useCallback(() => {
    setIsCreateMode(true);
    setEditingPlan({
      id: "",
      name: { en_US: "", es_DO: "" },
      description: { en_US: "", es_DO: "" },
      price: 0,
      features: [],
      recommended: false,
      client_type: "CLIENT",
      active: true,
      created_at: "",
      updated_at: "",
    });
    setEditId("");
    setEditName({ en_US: "", es_DO: "" });
    setEditDescription({ en_US: "", es_DO: "" });
    setEditPrice(0);
    setEditRecommended(false);
    setEditClientType("CLIENT");
    setEditActive(true);
    setEditFeatures([]);
  }, []);

  const handleAddFeature = useCallback(() => {
    setEditFeatures((prev) => [...prev, { text: { en_US: "", es_DO: "" }, included: true }]);
  }, []);

  const handleDeleteFeature = useCallback((index: number) => {
    setEditFeatures((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleToggleFeatureIncluded = useCallback((index: number, included: boolean) => {
    setEditFeatures((prev) => prev.map((f, i) => (i === index ? { ...f, included } : f)));
  }, []);

  const handleEditFeatureText = useCallback((index: number, lang: "en_US" | "es_DO", textVal: string) => {
    setEditFeatures((prev) =>
      prev.map((f, i) => {
        if (i !== index) return f;
        let textObj: Record<string, string>;
        if (typeof f.text === "string") {
          textObj = { en_US: f.text, es_DO: f.text };
        } else {
          textObj = { ...f.text };
        }
        textObj[lang] = textVal;
        return { ...f, text: textObj };
      })
    );
  }, []);

  const handleUpdateFeatureCode = useCallback((index: number, code: string) => {
    setEditFeatures((prev) =>
      prev.map((f, i) => {
        if (i !== index) return f;
        const catalogItem = FEATURE_CATALOG.find((item) => item.code === code);
        const defaultParams = catalogItem?.defaultParams ? { ...catalogItem.defaultParams } : undefined;
        return {
          ...f,
          code,
          params: defaultParams,
        };
      })
    );
  }, []);

  const handleUpdateFeatureParam = useCallback((index: number, paramKey: string, value: string | number | boolean) => {
    setEditFeatures((prev) =>
      prev.map((f, i) => {
        if (i !== index) return f;
        return {
          ...f,
          params: {
            ...(f.params || {}),
            [paramKey]: value,
          },
        };
      })
    );
  }, []);

  const handleDeleteFeatureParam = useCallback((index: number, paramKey: string) => {
    setEditFeatures((prev) =>
      prev.map((f, i) => {
        if (i !== index) return f;
        const newParams = { ...(f.params || {}) };
        delete newParams[paramKey];
        return {
          ...f,
          params: newParams,
        };
      })
    );
  }, []);

  const handleMoveFeature = useCallback((index: number, direction: -1 | 1) => {
    setEditFeatures((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex((prev) => {
      if (draggedIndex !== index && prev !== index) {
        return index;
      }
      return prev;
    });
  }, [draggedIndex]);

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    setEditFeatures((prev) => {
      const updated = [...prev];
      const [removed] = updated.splice(draggedIndex, 1);
      updated.splice(targetIndex, 0, removed);
      return updated;
    });
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const cleanBilingualRecord = useCallback((rec?: Record<string, string> | null): Record<string, string> => {
    if (!rec) return { en_US: "", es_DO: "" };
    const en = (rec.en_US || "").trim();
    const es = (rec.es_DO || "").trim();
    return {
      en_US: en || es,
      es_DO: es || en,
    };
  }, []);

  const handleSavePlan = useCallback(async () => {
    if (!editingPlan) return;
    if (isCreateMode && !editId.trim()) {
      addToast({
        title: "Validation Error",
        message: "Plan ID is required.",
        type: "error",
      });
      return;
    }

    const finalName = cleanBilingualRecord(editName);
    if (!finalName.en_US) {
      addToast({
        title: "Validation Error",
        message: "Plan name is required.",
        type: "error",
      });
      return;
    }

    const finalDescription = cleanBilingualRecord(editDescription);

    setSaveLoading(true);
    try {
      const filteredFeatures = editFeatures
        .map((f) => {
          let textObj: Record<string, string>;
          if (typeof f.text === "string") {
            textObj = { en_US: f.text, es_DO: f.text };
          } else {
            textObj = f.text || {};
          }
          return {
            ...f,
            text: cleanBilingualRecord(textObj),
          };
        })
        .filter((f) => Boolean(f.code) || f.text.en_US !== "");

      const planNameStr = getPlanName(finalName);

      if (isCreateMode) {
        await createPlan({
          id: editId.trim(),
          name: finalName,
          description: finalDescription.en_US ? finalDescription : null,
          price: editPrice,
          recommended: editRecommended,
          client_type: editClientType as PlanClientType,
          active: editActive,
          features: filteredFeatures,
        });

        addToast({
          title: "Plan Created",
          message: `${planNameStr} plan has been created successfully.`,
          type: "success",
        });
      } else {
        await updatePlan(editingPlan.id, {
          name: finalName,
          description: finalDescription.en_US ? finalDescription : null,
          price: editPrice,
          recommended: editRecommended,
          client_type: editClientType as PlanClientType,
          active: editActive,
          features: filteredFeatures,
        });

        addToast({
          title: "Plan Updated",
          message: `${planNameStr} plan has been updated successfully.`,
          type: "success",
        });
      }
      setEditingPlan(null);
    } catch (err) {
      console.error("Failed to save plan:", err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      addToast({
        title: "Save Failed",
        message: error.response?.data?.message || error.message || "Failed to save plan.",
        type: "error",
      });
    } finally {
      setSaveLoading(false);
    }
  }, [editingPlan, isCreateMode, editId, editName, editDescription, editPrice, editRecommended, editClientType, editActive, editFeatures, cleanBilingualRecord, getPlanName, createPlan, updatePlan, addToast]);

  const handleDeletePlan = useCallback(async (planId: string) => {
    const confirmDelete = window.confirm(
      t("plans.deleteConfirm") || "Are you sure you want to deactivate/soft-delete this plan?"
    );
    if (!confirmDelete) return;

    try {
      await deletePlan(planId);
      addToast({
        title: t("plans.deleteSuccessTitle") || "Plan Deactivated",
        message: t("plans.deleteSuccessMsg", { id: planId }) || `Plan ${planId} has been soft-deleted.`,
        type: "success",
      });
    } catch (err) {
      console.error("Failed to delete plan:", err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      addToast({
        title: t("plans.deleteErrorTitle") || "Deactivation Failed",
        message: error.response?.data?.message || error.message || "Failed to soft delete plan.",
        type: "error",
      });
    }
  }, [t, deletePlan, addToast]);

  return {
    t,
    i18n,
    user,
    plans,
    loading,
    isAdmin,
    filteredPlans,
    clientTypeFilter,
    setClientTypeFilter,
    selectedPlan,
    userSelectedPlan,
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
    subscribeLoading,
    paymentMessage,
    setPaymentMessage,
    activeSubscriptions,
    tierChangeSubId,
    setTierChangeSubId,
    currentPlan,
    currentEquipmentCount,
    getPlanName,
    getPlanDescription,
    getFeatureText,
    getTierLabel,
    handleAdjustEquipmentCount,
    handleProcessSubscription,
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
    fetchActiveSubscriptions,
    addToast,
  };
}
