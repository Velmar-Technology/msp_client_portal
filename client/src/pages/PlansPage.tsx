import { useState, useEffect, useCallback, useRef } from "react";
import { Check, X, Shield, Edit, Trash2, GripVertical, ChevronUp, ChevronDown, Info, Plus, Minus, Ban, RefreshCw, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Page } from "@/components/Page";
import { Input } from "@/components/ui/input";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { usePlanStore } from "@/store/usePlanStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import type { Plan, PlanFeature } from "@/services/planService";
import { userService } from "@/services/userService";
import { subscriptionService } from "@/services/subscriptionService";
import type { Subscription } from "@/services/subscriptionService";
import type { AuthUser } from "@/store/useAuthStore";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function PlansPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { plans, loading, fetchPlans, updatePlan, createPlan } = usePlanStore();
  const { addToast } = useNotificationStore();

  const getLocalizedValue = (val: string | Record<string, string> | null | undefined): string => {
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
  };

  const getPlanName = (name: string | Record<string, string>) => getLocalizedValue(name);
  const getPlanDescription = (desc: string | Record<string, string> | null | undefined) => getLocalizedValue(desc);

  const getFeatureText = (text: string | Record<string, string>) => {
    if (typeof text !== "string") {
      return getLocalizedValue(text);
    }
    // If the text looks like a translation key (no spaces), translate it
    if (/^[a-zA-Z0-9_]+$/.test(text)) {
      const translated = t(`plans.features.${text}`);
      if (translated !== `plans.features.${text}`) {
        return translated;
      }
    }
    return text;
  };

  const [userSelectedPlan, setUserSelectedPlan] = useState<string | null>(null);
  const [equipmentCounts, setEquipmentCounts] = useState<Record<string, number>>({});
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
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [isUnregistered] = useState(false);
  const [unregisteredEmail, setUnregisteredEmail] = useState("");
  const [unregisteredName, setUnregisteredName] = useState("");

  // Tab Selector State
  const [activeTab, setActiveTab] = useState<"browse" | "manage">("browse");

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

  // Admin apply plan state
  const [clients, setClients] = useState<AuthUser[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  // Active plan management state
  const [activeSubscriptions, setActiveSubscriptions] = useState<Subscription[]>([]);

  const isAdmin = user?.role === "ADMIN";

  const filteredPlans = plans.filter((plan) => {
    if (isAdmin || user?.role === "TECHNICIAN") return true;
    const userClientType = user?.clientType || "CLIENT";
    const planClientType = plan.client_type || "CLIENT";
    return plan.active !== false && planClientType === userClientType;
  });

  const fetchActiveSubscriptions = useCallback(async () => {
    if (isAdmin || user?.role !== "CLIENT") return;
    try {
      const subs = await subscriptionService.getAll();
      const active = subs.filter((sub) => sub.status === "ACTIVE");
      setActiveSubscriptions(active);

      // Initialize equipmentCounts for all active subscriptions
      const counts: Record<string, number> = {};
      active.forEach((sub) => {
        counts[sub.plan] = sub.equipment_count;
      });
      setEquipmentCounts((prev) => ({ ...prev, ...counts }));

      setUserSelectedPlan((prev) => {
        if (!prev && active.length > 0) {
          return active[0].plan;
        }
        return prev;
      });
    } catch (err) {
      console.error("Failed to fetch active subscriptions:", err);
    }
  }, [isAdmin, user]);

  useEffect(() => {
    fetchPlans().catch((err) => console.error("Failed to fetch plans:", err));
  }, [fetchPlans]);

  // Set default equipment counts when plans are loaded
  useEffect(() => {
    if (plans.length > 0) {
      const counts: Record<string, number> = {};
      plans.forEach((plan) => {
        counts[plan.id] = 1;
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEquipmentCounts((prev) => ({ ...counts, ...prev }));
    }
  }, [plans]);

  useEffect(() => {
    if (isAdmin) {
      userService
        .getClients()
        .then((data) => {
          setClients(data || []);
          if (data && data.length > 0) {
            setSelectedClientId(data[0].id);
          } else {
            setSelectedClientId("unregistered");
          }
        })
        .catch((err) => console.error("Failed to fetch clients:", err));
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchActiveSubscriptions();
    }
  }, [isAdmin, user, fetchActiveSubscriptions]);

  const selectedPlan =
    userSelectedPlan ||
    (activeSubscriptions.length > 0
      ? activeSubscriptions[0].plan
      : filteredPlans.find((p) => p.id === "STANDARD")
        ? "STANDARD"
        : filteredPlans[0]?.id || "");

  const currentPlan =
    filteredPlans.find((p) => p.id === selectedPlan) ||
    filteredPlans.find((p) => p.id === "STANDARD") ||
    filteredPlans[0];

  const [actionType, setActionType] = useState<"subscribe" | "modify">("modify");
  const [subscriptionToModifyId, setSubscriptionToModifyId] = useState<string>("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActionType("modify");
    if (activeSubscriptions.length > 0) {
      const activeSubForPlan = activeSubscriptions.find((sub) => sub.plan === selectedPlan && sub.status === "ACTIVE");
      if (activeSubForPlan) {
        setSubscriptionToModifyId(activeSubForPlan.id);
      } else {
        setSubscriptionToModifyId(activeSubscriptions[0].id);
      }
    }
  }, [selectedPlan, activeSubscriptions]);

  const currentEquipmentCount = equipmentCounts[currentPlan?.id] || 1;

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
          buttonsInstance = (window as any).paypal.Buttons({
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
                  paypalOrderId: data.orderID,
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
          });
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
            activeSubscriptions.find((sub) => sub.id === subscriptionToModifyId) || activeSubscriptions[0];
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
                  setPaymentMessage("Upgrade order created. Please approve payment in PayPal window.");
                  return response.orderId;
                } catch (err) {
                  console.error(err);
                  setPaymentMessage("Failed to prepare upgrade checkout.");
                  throw err;
                }
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onApprove: async (data: any) => {
                setPaymentMessage("Upgrade payment approved. Updating subscription...");
                setSubscribeLoading(true);
                try {
                  await subscriptionService.update(activeSub.id, {
                    plan: currentPlan.id,
                    equipmentCount: currentEquipmentCount,
                    paypalOrderId: data.orderID,
                  });
                  setPaymentMessage("Subscription upgraded successfully!");
                  addToast({
                    title: "Subscription Updated",
                    message: `Successfully updated your subscription to ${getPlanName(currentPlan.name)} with ${currentEquipmentCount} devices.`,
                    type: "success",
                  });
                  await fetchActiveSubscriptions();
                } catch (err) {
                  console.error(err);
                  setPaymentMessage("Failed to update subscription.");
                  addToast({
                    title: "Upgrade Failed",
                    message: "Payment verification failed or could not upgrade subscription.",
                    type: "error",
                  });
                } finally {
                  setSubscribeLoading(false);
                }
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onError: (err: any) => {
                console.error(err);
                setPaymentMessage("PayPal Upgrade Checkout encountered an error.");
              },
            });
            upgradeButtonsInstance.render("#paypal-upgrade-button-container");
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
      if (buttonsInstance && buttonsInstance.close) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        buttonsInstance.close().catch((e: any) => console.error("Error closing buttons", e));
      }
      if (upgradeButtonsInstance && upgradeButtonsInstance.close) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        upgradeButtonsInstance.close().catch((e: any) => console.error("Error closing upgrade buttons", e));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAdmin,
    user,
    paymentMethod,
    currentPlan,
    currentEquipmentCount,
    billingCycle,
    subscriptionToModifyId,
    activeSubscriptions,
    fetchActiveSubscriptions,
    addToast,
  ]);

  const handleAdjustEquipmentCount = (planId: string, delta: number) => {
    setEquipmentCounts((prev) => ({
      ...prev,
      [planId]: Math.max(1, (prev[planId] || 1) + delta),
    }));
  };

  const handleProcessSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
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
      });

      addToast({
        title: isAdmin ? "Plan Applied" : "Subscribed Successfully",
        message: isAdmin
          ? `Successfully applied the ${getPlanName(currentPlan.name)} plan to the customer.`
          : `Successfully subscribed to the ${getPlanName(currentPlan.name)} plan.`,
        type: "success",
      });
      await fetchActiveSubscriptions();
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
  };

  const handleSendQuote = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!currentPlan) return;

    const sendToUnregistered = isUnregistered || (isAdmin && selectedClientId === "unregistered");
    if (sendToUnregistered && !unregisteredEmail.trim()) {
      addToast({
        title: "Validation Error",
        message: "Please enter a recipient email address.",
        type: "error",
      });
      return;
    }

    if (isAdmin && !selectedClientId) {
      addToast({
        title: "Validation Error",
        message: "Please select a customer or unregistered option.",
        type: "error",
      });
      return;
    }

    setQuoteLoading(true);
    try {
      await subscriptionService.sendQuote({
        plan: currentPlan.id,
        equipmentCount: currentEquipmentCount,
        clientId: !sendToUnregistered && isAdmin ? selectedClientId : undefined,
        unregisteredEmail: sendToUnregistered ? unregisteredEmail.trim() : undefined,
        unregisteredName: sendToUnregistered ? unregisteredName.trim() || undefined : undefined,
        billingCycle,
      });

      addToast({
        title: "Quotation Sent",
        message: t("plans.quoteSuccess"),
        type: "success",
      });

      if (sendToUnregistered) {
        setUnregisteredEmail("");
        setUnregisteredName("");
      }
    } catch (err) {
      console.error("Failed to send quotation:", err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      addToast({
        title: t("plans.quoteError"),
        message: error.response?.data?.message || error.message || "Failed to send quotation.",
        type: "error",
      });
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleUpdateSubscription = async (subId: string, count: number) => {
    if (!currentPlan) return;
    if (!isAdmin && !acceptedTos) {
      addToast({
        title: "Terms of Service",
        message: "Please accept the Terms of Service before proceeding.",
        type: "warning",
      });
      return;
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
    } catch (err) {
      console.error("Failed to update subscription:", err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      addToast({
        title: "Update Failed",
        message: error.response?.data?.message || error.message || "Failed to update subscription.",
        type: "error",
      });
    } finally {
      setSubscribeLoading(false);
    }
  };

  const handleCancelSubscription = async (subId: string) => {
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel your subscription? This action will take effect immediately.",
    );
    if (!confirmCancel) return;

    setSubscribeLoading(true);
    try {
      await subscriptionService.update(subId, {
        status: "CANCELLED",
      });
      addToast({
        title: "Subscription Cancelled",
        message: "Your subscription has been successfully cancelled.",
        type: "success",
      });
      await fetchActiveSubscriptions();
    } catch (err) {
      console.error("Failed to cancel subscription:", err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      addToast({
        title: "Cancellation Failed",
        message: error.response?.data?.message || error.message || "Failed to cancel subscription.",
        type: "error",
      });
    } finally {
      setSubscribeLoading(false);
    }
  };

  const handleUpdateSubscriptionDirect = async (subId: string, planId: string, count: number) => {
    setSubscribeLoading(true);
    try {
      await subscriptionService.update(subId, {
        plan: planId,
        equipmentCount: count,
      });
      addToast({
        title: "Subscription Updated",
        message: `Successfully updated device count to ${count}.`,
        type: "success",
      });
      await fetchActiveSubscriptions();
    } catch (err) {
      console.error("Failed to update subscription:", err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      addToast({
        title: "Update Failed",
        message: error.response?.data?.message || error.message || "Failed to update subscription.",
        type: "error",
      });
    } finally {
      setSubscribeLoading(false);
    }
  };

  const priceMultiplier = billingCycle === "annual" ? 12 * 0.8 : 1;
  const subtotal = currentPlan
    ? Math.round(currentPlan.price * priceMultiplier * currentEquipmentCount * 100) / 100
    : 0;
  const tax = Math.round(subtotal * 0.18 * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  const getTierLabel = (planId: string) => {
    if (planId === "BASIC") return t("plans.basic.tier") || "Level 1";
    if (planId === "STANDARD") return t("plans.standard.tier") || "Level 2";
    if (planId === "PREMIUM") return t("plans.premium.tier") || "Level 3";
    return "Level";
  };

  // Table Columns for Subscription Dashboard (DataTable)
  const subscriptionDashboardColumns: ColumnDef<Subscription>[] = [
    {
      accessorKey: "service_name",
      header: "Service Name",
      cell: ({ row }) => (
        <span className="font-semibold text-primary text-body-sm">{row.getValue("service_name")}</span>
      ),
    },
    {
      accessorKey: "plan",
      header: "Tier",
      cell: ({ row }) => {
        const planId = row.getValue("plan") as string;
        return (
          <span className="inline-block px-2 py-0.5 border border-outline-variant rounded text-mono w-fit text-on-surface-variant font-medium text-xs">
            {getTierLabel(planId)}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className="bg-success/15 text-success border border-success/30 px-2.5 py-1 rounded-full text-label-sm font-bold">
          {row.getValue("status")}
        </span>
      ),
    },
    {
      accessorKey: "renewal_date",
      header: "Renewal Date",
      cell: ({ row }) => {
        const dateStr = row.getValue("renewal_date") as string;
        return (
          <span className="text-body-sm text-on-surface-variant">
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
      header: "Devices Limit",
      cell: ({ row }) => (
        <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-xs font-semibold">
          {row.getValue("equipment_count")} Devices
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const sub = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 text-label-sm text-primary hover:underline font-semibold cursor-pointer"
              >
                {t("plans.manageTab") || "Manage"} <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-surface-container-lowest text-on-surface border border-outline-variant">
              {/* Add Device */}
              <DropdownMenuItem
                onClick={async () => {
                  if (isAdmin) {
                    await handleUpdateSubscriptionDirect(sub.id, sub.plan, sub.equipment_count + 1);
                  } else {
                    // Client: Set plan and target equipment count, switch tab to manage, and show toast
                    setUserSelectedPlan(sub.plan);
                    setEquipmentCounts((prev) => ({ ...prev, [sub.plan]: sub.equipment_count + 1 }));
                    setActiveTab("manage");
                    addToast({
                      title: "Upgrade Pre-configured",
                      message: "Complete payment to add the new device license to your subscription.",
                      type: "info",
                    });
                  }
                }}
                className="cursor-pointer flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Device
              </DropdownMenuItem>

              {/* Remove Device */}
              <DropdownMenuItem
                disabled={sub.equipment_count <= 1}
                onClick={async () => {
                  if (sub.equipment_count > 1) {
                    const confirmRemove = window.confirm(
                      `Are you sure you want to remove a device license? Your limit will decrease to ${sub.equipment_count - 1} devices.`
                    );
                    if (confirmRemove) {
                      await handleUpdateSubscriptionDirect(sub.id, sub.plan, sub.equipment_count - 1);
                    }
                  }
                }}
                className="cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Minus className="h-4 w-4" />
                Remove Device
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-outline-variant" />

              {/* Change Plan / Upgrade Tier */}
              <DropdownMenuItem
                onClick={() => {
                  setUserSelectedPlan(sub.plan);
                  setActiveTab("browse");
                  addToast({
                    title: "Browse Plans",
                    message: "Select a different plan tier to switch or subscribe.",
                    type: "info",
                  });
                }}
                className="cursor-pointer flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Change Plan Tier
              </DropdownMenuItem>

              {/* Contact Support */}
              <DropdownMenuItem
                onClick={() => {
                  addToast({
                    title: "Contact Support",
                    message: "Need assistance? Email: soporte@verlmartech.com.do",
                    type: "info",
                  });
                  window.location.href = "mailto:soporte@verlmartech.com.do?subject=Subscription Support Request";
                }}
                className="cursor-pointer flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Contact Support
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-outline-variant" />

              {/* Cancel Subscription */}
              <DropdownMenuItem
                onClick={async () => {
                  await handleCancelSubscription(sub.id);
                }}
                variant="destructive"
                className="cursor-pointer flex items-center gap-2 text-error focus:bg-error/15"
              >
                <Ban className="h-4 w-4 text-error" />
                Cancel Subscription
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Open Edit Modal
  const handleEditClick = (plan: Plan) => {
    setIsCreateMode(false);
    setEditingPlan(plan);
    setEditId(plan.id);

    // Parse name
    if (typeof plan.name === "string") {
      setEditName({ en_US: plan.name, es_DO: plan.name });
    } else {
      setEditName({
        en_US: plan.name?.en_US || "",
        es_DO: plan.name?.es_DO || "",
      });
    }

    // Parse description
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

    // Parse features
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
  };

  // Open Create Modal
  const handleCreateClick = () => {
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
  };

  // Add Feature
  const handleAddFeature = () => {
    setEditFeatures([...editFeatures, { text: { en_US: "", es_DO: "" }, included: true }]);
  };

  // Delete Feature
  const handleDeleteFeature = (index: number) => {
    setEditFeatures(editFeatures.filter((_, i) => i !== index));
  };

  // Toggle Feature Included
  const handleToggleFeatureIncluded = (index: number, included: boolean) => {
    setEditFeatures(editFeatures.map((f, i) => (i === index ? { ...f, included } : f)));
  };

  // Edit Feature Text
  const handleEditFeatureText = (index: number, lang: "en_US" | "es_DO", textVal: string) => {
    setEditFeatures(
      editFeatures.map((f, i) => {
        if (i !== index) return f;
        let textObj: Record<string, string>;
        if (typeof f.text === "string") {
          textObj = { en_US: f.text, es_DO: f.text };
        } else {
          textObj = { ...f.text };
        }
        textObj[lang] = textVal;
        return { ...f, text: textObj };
      }),
    );
  };

  // Move Feature (Accessible keyboard controls)
  const handleMoveFeature = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= editFeatures.length) return;
    const updated = [...editFeatures];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setEditFeatures(updated);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const updated = [...editFeatures];
    const [removed] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, removed);
    setEditFeatures(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Helper to fallback languages if one is missing
  const cleanBilingualRecord = (rec: Record<string, string>): Record<string, string> => {
    const en = (rec.en_US || "").trim();
    const es = (rec.es_DO || "").trim();
    return {
      en_US: en || es,
      es_DO: es || en,
    };
  };

  // Save Plan
  const handleSavePlan = async () => {
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
      // Filter out empty features and apply billing clean record logic
      const filteredFeatures = editFeatures
        .map((f) => {
          let textObj: Record<string, string>;
          if (typeof f.text === "string") {
            textObj = { en_US: f.text, es_DO: f.text };
          } else {
            textObj = f.text;
          }
          return {
            ...f,
            text: cleanBilingualRecord(textObj),
          };
        })
        .filter((f) => f.text.en_US !== "");

      const planNameStr = getPlanName(finalName);

      if (isCreateMode) {
        await createPlan({
          id: editId.trim(),
          name: finalName,
          description: finalDescription.en_US ? finalDescription : null,
          price: editPrice,
          recommended: editRecommended,
          client_type: editClientType,
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
          client_type: editClientType,
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
  };

  const renderPaymentFields = () => {
    if (currentPlan) {
      const alreadySubscribed = activeSubscriptions.some(
        (sub) => sub.plan === currentPlan.id && sub.status === "ACTIVE",
      );
      if (alreadySubscribed) {
        return (
          <div className="bg-warning/15 border border-warning/30 p-4 rounded-xl text-center space-y-2 my-4">
            <p className="text-body-md font-semibold text-warning">Active Plan Already Registered</p>
            <p className="text-body-sm text-on-surface-variant">
              You already have an active subscription for the <strong>{getPlanName(currentPlan.name)}</strong> plan. To
              change device slots or update details, please use the modification tools on the active subscription
              manager.
            </p>
          </div>
        );
      }
    }

    return (
      <>
        {!isAdmin && (
          <div className="flex items-start gap-2.5 p-3 bg-surface-container rounded-lg border border-outline-variant mb-4">
            <input
              type="checkbox"
              id="tos-checkbox"
              checked={acceptedTos}
              onChange={(e) => setAcceptedTos(e.target.checked)}
              className="h-4 w-4 rounded border-outline text-primary focus:ring-primary mt-1 cursor-pointer"
            />
            <label htmlFor="tos-checkbox" className="text-body-sm text-on-surface cursor-pointer select-none">
              {t("plans.agreeToTermsPrefix")}{" "}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:text-primary/80 transition-colors font-medium"
              >
                {t("plans.termsOfServiceLink")}
              </a>
            </label>
          </div>
        )}
        <h2 className="text-h2 text-primary mb-4" style={{ fontFamily: "var(--font-heading)" }}>
          {t("plans.paymentMethod")}
        </h2>
        <div className="flex gap-0 mb-4 border-b border-outline-variant">
          <button
            onClick={() => setPaymentMethod("card")}
            className={`px-4 py-2.5 text-label-md transition-colors cursor-pointer ${
              paymentMethod === "card"
                ? "border-b-2 border-primary text-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {t("plans.creditCard")}
          </button>
          <button
            onClick={() => setPaymentMethod("transfer")}
            className={`px-4 py-2.5 text-label-md transition-colors cursor-pointer ${
              paymentMethod === "transfer"
                ? "border-b-2 border-primary text-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {t("plans.bankTransfer")}
          </button>
        </div>

        <div className="space-y-4">
          {paymentMethod === "card" ? (
            <>
              <p className="text-body-md text-on-surface-variant mb-4">
                Please complete your checkout payment securely using PayPal. Once approved, your subscription will
                activate immediately.
              </p>
              {paymentMessage && (
                <div
                  className={`p-3 rounded-lg mb-4 text-label-md font-semibold text-center ${
                    paymentMessage.includes("activated") || paymentMessage.includes("successfully")
                      ? "bg-success/10 text-success"
                      : "bg-primary/10 text-primary animate-pulse"
                  }`}
                >
                  {paymentMessage}
                </div>
              )}
              <div
                id="paypal-button-container"
                className="my-4 min-h-[150px] flex items-center justify-center bg-surface rounded-xl p-4 border border-outline-variant border-dashed"
              >
                <span className="text-label-md text-on-surface-variant">Loading PayPal Checkout...</span>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-body-md text-on-surface-variant space-y-4">
              <p className="mb-2">{t("plans.transferInstructions")}</p>
              <p className="text-mono font-medium text-on-surface">{t("plans.bankName")}</p>
              <p className="text-mono">{t("plans.bankAccount")}</p>
              <p className="text-mono">
                {t("plans.bankReference")}: {reference}
              </p>
              <button
                onClick={handleProcessSubscription}
                disabled={subscribeLoading}
                className="mt-4 w-full bg-primary text-on-primary py-3 rounded-lg text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-semibold"
              >
                {subscribeLoading ? "Processing..." : "Confirm Bank Transfer Intent"}
              </button>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderCheckoutButtonAndSheet = () => {
    return (
      <div className="space-y-4 text-center py-4">
        <p className="text-body-md text-on-surface-variant">
          Ready to activate your **{getPlanName(currentPlan.name)}** subscription?
        </p>
        <Sheet>
          <SheetTrigger asChild>
            <button className="w-full bg-primary text-on-primary py-3.5 rounded-lg text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer font-bold shadow-md">
              Proceed to Checkout (${total.toFixed(2)})
            </button>
          </SheetTrigger>
          <SheetContent className="w-[400px] p-6 sm:w-[500px] overflow-y-auto bg-surface text-on-surface border-l border-outline-variant">
            <SheetHeader className="pb-4 border-b p-2 border-outline-variant">
              <SheetTitle className="text-h3 text-primary">{t("plans.orderSummary")}</SheetTitle>
            </SheetHeader>

            {/* Order Summary Details */}
            <div className="py-6 space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-body-md font-semibold text-on-surface">
                      {getPlanName(currentPlan.name)}{" "}
                      {billingCycle === "annual" ? "Plan (Annually)" : t("plans.planMonthly")}
                    </p>
                    <p className="text-label-sm text-on-surface-variant mt-0.5">
                      {currentEquipmentCount}x {t("plans.equipmentCountSuffix")}
                    </p>
                  </div>
                  <span className="text-body-md font-semibold text-on-surface">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-body-md text-on-surface-variant">
                  <span>{t("plans.taxes")}</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="border-t border-outline-variant pt-3 flex justify-between">
                  <span className="text-body-md font-bold text-on-surface">{t("plans.total")}</span>
                  <span className="text-body-md font-bold text-primary text-lg">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Fields inside the Sheet */}
              <div className="border-t border-outline-variant pt-6">{renderPaymentFields()}</div>

              <div className="bg-surface-container-low border border-outline-variant/30 rounded-lg p-4 flex items-start gap-3">
                <Shield className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <div>
                  <p className="text-label-md font-medium text-on-surface">{t("plans.encryptedTx")}</p>
                  <p className="text-label-sm text-on-surface-variant mt-0.5">{t("plans.militaryGradeSecurity")}</p>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  };

  const renderManageActiveSubscription = (activeSub: Subscription) => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-outline-variant pb-4">
          <div>
            <p className="text-label-sm text-on-surface-variant font-medium uppercase tracking-wider">
              Current Service
            </p>
            <p className="text-h3 font-bold text-primary mt-0.5">{activeSub.service_name}</p>
          </div>
          <span className="bg-success/15 text-success border border-success/30 px-2.5 py-1 rounded-full text-label-sm font-bold">
            ACTIVE
          </span>
        </div>

        {currentPlan?.id !== activeSub.plan || currentEquipmentCount !== activeSub.equipment_count ? (
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
              <p className="text-body-md font-semibold text-primary">Subscription Modification</p>
              <p className="text-body-sm text-on-surface-variant mt-1">
                You are modifying your subscription to the{" "}
                <strong className="text-on-surface">{getPlanName(currentPlan.name)}</strong> plan with{" "}
                <strong className="text-on-surface">{currentEquipmentCount}x</strong> device(s).
              </p>
            </div>

            {!isAdmin && (
              <div className="flex items-start gap-2.5 p-3 bg-surface-container rounded-lg border border-outline-variant my-3">
                <input
                  type="checkbox"
                  id="tos-checkbox-manage"
                  checked={acceptedTos}
                  onChange={(e) => setAcceptedTos(e.target.checked)}
                  className="h-4 w-4 rounded border-outline text-primary focus:ring-primary mt-1 cursor-pointer"
                />
                <label
                  htmlFor="tos-checkbox-manage"
                  className="text-body-sm text-on-surface cursor-pointer select-none"
                >
                  {t("plans.agreeToTermsPrefix")}{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary/80 transition-colors font-medium"
                  >
                    {t("plans.termsOfServiceLink")}
                  </a>
                </label>
              </div>
            )}

            {currentEquipmentCount > activeSub.equipment_count ? (
              <div className="mt-2 border-t border-outline-variant pt-4">
                <p className="text-body-sm text-on-surface-variant mb-3 font-medium">
                  Adding more devices requires a PayPal payment to activate the additional licenses immediately.
                </p>
                <div
                  id="paypal-upgrade-button-container"
                  className="my-2 min-h-[150px] flex items-center justify-center bg-surface rounded-xl p-4 border border-outline-variant border-dashed"
                >
                  <span className="text-label-md text-on-surface-variant">Loading PayPal Upgrade...</span>
                </div>
                {paymentMessage && <p className="text-body-xs text-primary font-medium mt-2">{paymentMessage}</p>}
              </div>
            ) : (
              <button
                onClick={() => handleUpdateSubscription(activeSub.id, currentEquipmentCount)}
                disabled={subscribeLoading}
                className="w-full bg-primary text-on-primary py-3 rounded-lg text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-semibold"
              >
                {subscribeLoading ? "Updating..." : "Update Subscription"}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-error/5 border border-error/10 rounded-lg p-4">
              <p className="text-body-md font-semibold text-error">Cancellation Warning</p>
              <p className="text-body-sm text-on-surface-variant mt-1">
                Cancelling your subscription will take effect immediately. You will lose access to premium support
                services.
              </p>
            </div>

            <button
              onClick={() => handleCancelSubscription(activeSub.id)}
              disabled={subscribeLoading}
              className="w-full bg-error text-on-error py-3 rounded-lg text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-semibold"
            >
              {subscribeLoading ? "Cancelling..." : "Cancel Subscription"}
            </button>
          </div>
        )}
      </div>
    );
  };

  const showTabs = !isAdmin && activeSubscriptions.length > 0;

  return (
    <Page title={t("plans.title")} subtitle={t("plans.subtitle")} isLoading={loading && filteredPlans.length === 0}>
      {/* Tabs Section */}
      {showTabs && (
        <div className="border-b border-outline-variant flex gap-8 mb-8">
          <button
            type="button"
            className={`pb-3 text-label-md font-semibold transition-all cursor-pointer ${
              activeTab === "browse"
                ? "border-b-2 border-primary text-primary font-bold"
                : "text-on-surface-variant hover:text-on-surface border-b-2 border-transparent"
            }`}
            onClick={() => setActiveTab("browse")}
          >
            {t("plans.browseTab")}
          </button>
          <button
            type="button"
            className={`pb-3 text-label-md font-semibold transition-all cursor-pointer ${
              activeTab === "manage"
                ? "border-b-2 border-primary text-primary font-bold"
                : "text-on-surface-variant hover:text-on-surface border-b-2 border-transparent"
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
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
            <div className="md:w-1/3" /> {/* Left Spacer */}
            <div className="bg-surface-container-low border border-outline-variant p-1 rounded-xl flex items-center gap-1">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-2 rounded-lg text-label-md font-semibold transition-all cursor-pointer ${
                  billingCycle === "monthly"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {/* Monthly */}
                {t("plans.monthlyButtonLabel")}
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("annual")}
                className={`px-4 py-2 rounded-lg text-label-md font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                  billingCycle === "annual"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {t("plans.annualButtonLabel")}
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    billingCycle === "annual" ? "bg-on-primary text-primary" : "bg-primary/10 text-primary"
                  }`}
                >
                  {t("plans.saveLabel")} 20%
                </span>
              </button>
            </div>
            <div className="md:w-1/3 flex justify-end">
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleCreateClick}
                  className="bg-primary text-on-primary px-4 py-2 rounded-lg text-label-md font-semibold hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <span>+ Add Plan</span>
                </button>
              )}
            </div>
          </div>

          {/* Plan Cards */}
          <div
            className="grid gap-6 mb-12 mx-auto w-full"
            style={{
              gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 320px), 1fr))`,
              maxWidth: `${Math.min(filteredPlans.length, 3) * 380}px`,
            }}
          >
            {filteredPlans.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-surface-container-lowest border rounded-xl p-6 pt-8 flex flex-col transition-all cursor-pointer text-on-surface ${
                  selectedPlan === plan.id
                    ? "border-primary shadow-md ring-1 ring-primary"
                    : "border-outline-variant shadow-sm hover:shadow-md"
                } ${plan.active === false ? "opacity-70 bg-surface-container-low/40 border-dashed" : ""}`}
                onClick={() => setUserSelectedPlan(plan.id)}
              >
                {/* Disabled Badge */}
                {plan.active === false && (
                  <div className="absolute top-3 left-3">
                    <span className="bg-error/15 text-error border border-error/30 px-2.5 py-0.5 rounded-lg text-[10px] font-bold">
                      Disabled
                    </span>
                  </div>
                )}

                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-on-primary px-3 py-1 rounded-full text-label-sm font-bold">
                      {t("plans.recommended")}
                    </span>
                  </div>
                )}

                {/* Admin Edit Trigger */}
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(plan);
                    }}
                    className="absolute top-3 right-3 bg-surface-container hover:bg-surface-container-high border border-outline-variant p-1.5 rounded-lg transition-colors cursor-pointer text-on-surface-variant flex items-center gap-1 text-[11px] font-semibold z-10"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit
                  </button>
                )}

                {/* Active Status Badge */}
                {!isAdmin && activeSubscriptions.some((sub) => sub.plan === plan.id) && (
                  <span className="absolute top-3 right-3 bg-success/15 text-success border border-success/30 px-2.5 py-1 rounded-lg text-label-sm font-bold animate-pulse z-10">
                    Active
                  </span>
                )}

                <span className="inline-block mb-3 px-2 py-0.5 border border-outline-variant rounded text-mono w-fit text-on-surface-variant">
                  {getTierLabel(plan.id)}
                </span>

                <h3 className="text-h2 text-primary mb-1" style={{ fontFamily: "var(--font-heading)" }}>
                  {getPlanName(plan.name)}
                </h3>
                <p className="text-body-md text-on-surface-variant mb-4">{getPlanDescription(plan.description)}</p>

                <div className="mb-6">
                  {billingCycle === "annual" ? (
                    <>
                      <span className="text-4xl font-bold text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                        ${(plan.price * 0.8).toFixed(2)}
                      </span>
                      <span className="text-body-md text-on-surface-variant"> /mo</span>
                      <div className="text-label-sm text-on-surface-variant mt-1 font-medium">
                        {t("plans.billedAnnually")} ${(plan.price * 12 * 0.8).toFixed(2)}/yr
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                        ${plan.price}
                      </span>
                      <span className="text-body-md text-on-surface-variant"> /mo</span>
                      <div className="text-label-sm text-on-surface-variant mt-1 opacity-0 select-none">
                        Placeholder
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-3 flex-1">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      {feature.included ? (
                        <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                      ) : (
                        <X className="h-5 w-5 text-on-surface-variant opacity-40 shrink-0 mt-0.5" />
                      )}
                      <span
                        className={`text-body-md ${feature.included ? "text-on-surface" : "text-on-surface-variant opacity-50"}`}
                      >
                        {getFeatureText(feature.text)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Equipment Count */}
                <div className="mt-6 flex items-center justify-between bg-surface-container-low rounded-lg p-3">
                  <span className="text-label-md text-on-surface-variant">{t("plans.equipmentCount")}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdjustEquipmentCount(plan.id, -1);
                      }}
                      className="w-8 h-8 border border-outline-variant rounded flex items-center justify-center hover:bg-surface-container transition-colors text-label-md cursor-pointer text-on-surface"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-label-md font-medium">{equipmentCounts[plan.id] || 1}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdjustEquipmentCount(plan.id, 1);
                      }}
                      className="w-8 h-8 border border-outline-variant rounded flex items-center justify-center hover:bg-surface-container transition-colors text-label-md cursor-pointer text-on-surface"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  className={`mt-4 w-full py-2.5 rounded-lg text-label-md transition-all cursor-pointer ${
                    selectedPlan === plan.id
                      ? "bg-primary text-on-primary hover:opacity-90"
                      : "border border-outline-variant text-on-surface hover:bg-surface-container-low"
                  }`}
                >
                  {selectedPlan === plan.id
                    ? `${t("plans.selected")}: ${getPlanName(plan.name)}`
                    : `${t("plans.select")} ${getPlanName(plan.name)}`}
                </button>
              </div>
            ))}
          </div>

          {/* Payment Section */}
          {currentPlan && (
            <div className="max-w-2xl mx-auto w-full text-on-surface">
              {/* Payment Method or Admin Apply */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                {/* Header Banner */}
                <div className="flex justify-between items-center border-b border-outline-variant pb-4 mb-6">
                  <div>
                    <h3 className="text-body-lg font-bold text-primary">{getPlanName(currentPlan.name)} Plan</h3>
                    <p className="text-body-sm text-on-surface-variant mt-0.5">
                      {currentEquipmentCount}x {t("plans.equipmentCountSuffix")} •{" "}
                      {billingCycle === "annual" ? "Annually" : "Monthly"}
                    </p>
                  </div>
                </div>

                {isAdmin ? (
                  <div className="space-y-4">
                    <h2 className="text-h2 text-primary mb-4" style={{ fontFamily: "var(--font-heading)" }}>
                      Apply Plan to Customer
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="customer-select"
                          className="block text-label-md text-on-surface mb-1.5 font-medium"
                        >
                          Select Customer
                        </label>
                        <select
                          id="customer-select"
                          value={selectedClientId}
                          onChange={(e) => setSelectedClientId(e.target.value)}
                          className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 bg-surface-container-lowest text-on-surface"
                        >
                          {clients.length === 0 ? (
                            <option value="" disabled>
                              No registered customers found
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
                        <div className="space-y-3 pt-2 border-t border-outline-variant">
                          <div>
                            <label
                              htmlFor="unregistered-email-admin"
                              className="block text-label-sm text-on-surface mb-1 font-medium"
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
                              className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 bg-surface-container-lowest text-on-surface"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor="unregistered-name-admin"
                              className="block text-label-sm text-on-surface mb-1 font-medium"
                            >
                              {t("plans.unregisteredNameLabel")}
                            </label>
                            <Input
                              id="unregistered-name-admin"
                              type="text"
                              value={unregisteredName}
                              onChange={(e) => setUnregisteredName(e.target.value)}
                              placeholder={t("plans.unregisteredNamePlaceholder")}
                              className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 bg-surface-container-lowest text-on-surface"
                            />
                          </div>
                        </div>
                      )}

                      <button
                        onClick={handleProcessSubscription}
                        disabled={subscribeLoading || selectedClientId === "unregistered" || clients.length === 0}
                        className="w-full bg-primary text-on-primary py-3 rounded-lg text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-semibold"
                      >
                        {subscribeLoading ? "Applying..." : "Apply Plan to Customer"}
                      </button>

                      <button
                        type="button"
                        onClick={handleSendQuote}
                        disabled={quoteLoading || subscribeLoading || !selectedClientId}
                        className="w-full border border-primary text-primary py-3 rounded-lg text-label-md hover:bg-primary/5 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-semibold"
                      >
                        {quoteLoading ? t("plans.quoteSending") : t("plans.sendQuoteToCustomer")}
                      </button>
                    </div>
                  </div>
                ) : (
                  (() => {
                    const activeSubForPlan = activeSubscriptions.find(
                      (sub) => sub.plan === currentPlan?.id && sub.status === "ACTIVE",
                    );

                    if (activeSubForPlan) {
                      return (
                        <div className="space-y-4">
                          <h2 className="text-h2 text-primary mb-4" style={{ fontFamily: "var(--font-heading)" }}>
                            Manage Active Subscription
                          </h2>
                          {renderManageActiveSubscription(activeSubForPlan)}
                        </div>
                      );
                    }

                    if (activeSubscriptions.length === 0) {
                      return renderCheckoutButtonAndSheet();
                    }

                    return (
                      <div className="space-y-6">
                        <div>
                          <h2 className="text-h2 text-primary mb-3" style={{ fontFamily: "var(--font-heading)" }}>
                            Select Action for {getPlanName(currentPlan.name)}
                          </h2>
                          <p className="text-body-sm text-on-surface-variant mb-4">
                            You have existing active subscriptions. Choose whether you want to replace one of them or
                            add this plan as a new additional subscription.
                          </p>

                          <div className="flex bg-surface-container-low border border-outline-variant p-1 rounded-xl gap-1 mb-6">
                            <button
                              type="button"
                              onClick={() => setActionType("modify")}
                              className={`flex-1 py-2.5 rounded-lg text-label-md font-semibold transition-all cursor-pointer ${
                                actionType === "modify"
                                  ? "bg-primary text-on-primary shadow-sm"
                                  : "text-on-surface-variant hover:text-on-surface"
                              }`}
                            >
                              Change Existing Plan
                            </button>
                            <button
                              type="button"
                              onClick={() => setActionType("subscribe")}
                              className={`flex-1 py-2.5 rounded-lg text-label-md font-semibold transition-all cursor-pointer ${
                                actionType === "subscribe"
                                  ? "bg-primary text-on-primary shadow-sm"
                                  : "text-on-surface-variant hover:text-on-surface"
                              }`}
                            >
                              Subscribe as Additional Plan
                            </button>
                          </div>
                        </div>

                        {actionType === "subscribe" ? (
                          renderCheckoutButtonAndSheet()
                        ) : (
                          <div className="space-y-4">
                            <div>
                              <label
                                htmlFor="active-sub-select"
                                className="block text-label-md text-on-surface mb-1.5 font-medium"
                              >
                                Select Active Subscription to Replace
                              </label>
                              <select
                                id="active-sub-select"
                                value={subscriptionToModifyId}
                                onChange={(e) => setSubscriptionToModifyId(e.target.value)}
                                className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 bg-surface-container-lowest text-on-surface"
                              >
                                {activeSubscriptions.map((sub) => (
                                  <option key={sub.id} value={sub.id}>
                                    {sub.service_name} ({sub.equipment_count} Equipment)
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
            <div className="space-y-6 text-on-surface">
              {activeSubscriptions.length > 1 && (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm">
                  <label
                    htmlFor="active-sub-select-manage"
                    className="block text-label-md text-on-surface mb-1.5 font-medium"
                  >
                    Select Active Subscription to Manage
                  </label>
                  <select
                    id="active-sub-select-manage"
                    value={subscriptionToModifyId}
                    onChange={(e) => setSubscriptionToModifyId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20"
                  >
                    {activeSubscriptions.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.service_name} ({sub.equipment_count} Devices)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 items-start">
                {/* Left Column: Manage Active Subscription + Licensed Devices list */}
                <div className="space-y-6">
                  {/* Active Subscription Details Card */}
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h4
                          className="font-headline-md text-headline-md font-bold text-primary"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          Manage Active Subscription
                        </h4>
                        <p className="text-body-sm text-on-surface-variant mt-1">
                          Details for {activeSub.service_name} ({billingCycle || "monthly"} billing)
                        </p>
                      </div>
                      <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-label-sm font-bold border border-primary/20">
                        ACTIVE
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                      <div className="p-4 bg-surface-container-low/55 rounded-lg border border-outline-variant">
                        <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                          Devices
                        </p>
                        <p className="text-body-base font-semibold text-on-surface">
                          {activeSub.equipment_count}x Managed Units
                        </p>
                      </div>
                      <div className="p-4 bg-surface-container-low/55 rounded-lg border border-outline-variant">
                        <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                          Cycle
                        </p>
                        <p className="text-body-base font-semibold capitalize text-on-surface">
                          {billingCycle || "monthly"}
                        </p>
                      </div>
                      <div className="p-4 bg-surface-container-low/55 rounded-lg border border-outline-variant">
                        <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                          Renewal
                        </p>
                        <p className="text-body-base font-semibold text-on-surface">
                          {activeSub.renewal_date ? new Date(activeSub.renewal_date).toLocaleDateString() : "N/A"}
                        </p>
                      </div>
                    </div>

                    {currentPlan?.id !== activeSub.plan || currentEquipmentCount !== activeSub.equipment_count ? (
                      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 border-dashed flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-body-sm text-on-surface font-semibold">Modify Subscription Request</p>
                            <p className="text-body-sm text-on-surface-variant mt-1">
                              You are modifying your subscription to the <b>{getPlanName(currentPlan.name)}</b> plan
                              with <b>{currentEquipmentCount}x device(s)</b>.
                            </p>
                          </div>
                        </div>

                        {!isAdmin && (
                          <div className="flex items-start gap-2.5 p-3 bg-surface-container rounded-lg border border-outline-variant my-1">
                            <input
                              type="checkbox"
                              id="tos-checkbox-manage-actual"
                              checked={acceptedTos}
                              onChange={(e) => setAcceptedTos(e.target.checked)}
                              className="h-4 w-4 rounded border-outline text-primary focus:ring-primary mt-1 cursor-pointer"
                            />
                            <label
                              htmlFor="tos-checkbox-manage-actual"
                              className="text-body-sm text-on-surface cursor-pointer select-none"
                            >
                              {t("plans.agreeToTermsPrefix")}{" "}
                              <a
                                href="/terms"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline hover:text-primary/80 transition-colors font-medium"
                              >
                                {t("plans.termsOfServiceLink")}
                              </a>
                            </label>
                          </div>
                        )}

                        {currentEquipmentCount > activeSub.equipment_count ? (
                          <div className="mt-2 border-t border-outline-variant pt-4">
                            <p className="text-body-sm text-on-surface-variant mb-3 font-medium">
                              Adding more devices requires a PayPal payment to activate the additional licenses
                              immediately.
                            </p>
                            <div
                              id="paypal-upgrade-button-container"
                              className="my-2 min-h-[150px] flex items-center justify-center bg-surface rounded-xl p-4 border border-outline-variant border-dashed"
                            >
                              <span className="text-label-md text-on-surface-variant">Loading PayPal Upgrade...</span>
                            </div>
                            {paymentMessage && (
                              <p className="text-body-xs text-primary font-medium mt-2">{paymentMessage}</p>
                            )}
                          </div>
                        ) : (
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleUpdateSubscription(activeSub.id, currentEquipmentCount)}
                              disabled={subscribeLoading}
                              className="px-6 py-2 bg-primary text-on-primary font-bold rounded-lg text-body-sm shadow-sm hover:scale-[1.02] active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                            >
                              {subscribeLoading ? "Updating..." : "Update Subscription"}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-error/5 rounded-lg border border-error/20 border-dashed flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Info className="h-5 w-5 text-error shrink-0" />
                          <p className="text-body-sm text-on-surface-variant font-medium">
                            Cancelling your subscription will take effect immediately. You will lose access to premium
                            support.
                          </p>
                        </div>
                        <button
                          onClick={() => handleCancelSubscription(activeSub.id)}
                          disabled={subscribeLoading}
                          className="px-6 py-2 bg-error text-on-error font-bold rounded-lg text-body-sm shadow-sm hover:scale-[1.02] active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                        >
                          {subscribeLoading ? "Cancelling..." : "Cancel Subscription"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Sidebar Plan Summary + custom Help card */}
                <div className="space-y-6">
                  {/* Plan Summary Card */}
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                    <h4
                      className="font-headline-md text-headline-md font-bold text-primary mb-4"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
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
                        <div className="space-y-4">
                          <div className="flex justify-between items-center text-body-sm">
                            <span className="text-on-surface-variant font-medium">
                              {t("plans.basePlanName", { name: planName })}
                            </span>
                            <span className="font-semibold text-on-surface">${basePrice.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center text-body-sm">
                            <span className="text-on-surface-variant font-medium">{t("plans.addonCloudStorage")}</span>
                            <span className="font-semibold text-on-surface">{t("plans.included")}</span>
                          </div>
                          <div className="flex justify-between items-center text-body-sm">
                            <span className="text-on-surface-variant font-medium">
                              {t("plans.additionalDevices", { count: additionalDevicesCount })}
                            </span>
                            <span className="font-semibold text-on-surface">${additionalDevicesPrice.toFixed(2)}</span>
                          </div>
                          <div className="pt-4 border-t border-outline-variant">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-on-surface">{t("plans.estimatedMonthly")}</span>
                              <span className="text-xl font-bold text-primary">${estimatedTotal.toFixed(2)}</span>
                            </div>
                            {billingCycle === "annual" && (
                              <p className="text-right text-[11px] text-on-surface-variant mt-1 font-medium">
                                Billed annually as ${annualBilledTotal.toFixed(2)}/yr
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Tailored Enterprise Help Card */}
                  <div className="bg-primary text-on-primary rounded-xl p-6 relative overflow-hidden shadow-sm">
                    <div className="relative z-10">
                      <h4
                        className="text-lg font-bold mb-2 text-on-primary"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        Need a custom plan?
                      </h4>
                      <p className="text-body-sm text-on-primary/80 mb-4">
                        For organizations with over 100 devices, we offer tailored enterprise solutions.
                      </p>
                      <button className="w-full py-2 bg-on-primary text-primary font-bold rounded-lg text-body-sm hover:opacity-95 transition-opacity cursor-pointer">
                        Contact Sales
                      </button>
                    </div>
                    <div className="absolute -bottom-6 -right-6 text-[120px] text-on-primary/10 select-none pointer-events-none">
                      ☁️
                    </div>
                  </div>
                </div>
              </div>

              {/* Subscriptions Dashboard (DataTable) — outside grid for full width */}
              {!isAdmin && activeSubscriptions.length > 0 && (
                <div className="w-full text-on-surface">
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                    <h3 className="text-h2 text-primary mb-2 font-bold" style={{ fontFamily: "var(--font-heading)" }}>
                      Active Subscriptions Dashboard
                    </h3>
                    <p className="text-body-sm text-on-surface-variant mb-6">
                      View details, active equipment, and renewal dates for all your active plans.
                    </p>
                    <DataTable
                      columns={subscriptionDashboardColumns}
                      data={activeSubscriptions}
                      noDataMessage="No active subscriptions found."
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })()
      )}

      {/* Plan Edit Modal */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-xl text-on-surface">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
              <h3 className="text-h3 font-bold" style={{ fontFamily: "var(--font-heading)" }}>
                {isCreateMode ? "Add New Plan" : `Edit Plan: ${editingPlan.id}`}
              </h3>
              <button
                onClick={() => setEditingPlan(null)}
                className="p-1 hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer text-on-surface-variant"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                {isCreateMode ? (
                  <div>
                    <label htmlFor="edit-id" className="block text-label-md text-on-surface mb-1.5">
                      Plan ID
                    </label>
                    <Input
                      id="edit-id"
                      type="text"
                      value={editId}
                      onChange={(e) => setEditId(e.target.value.toUpperCase().replace(/\s+/g, "-"))}
                      placeholder="e.g. PL-008"
                      className="w-full bg-surface-container-lowest text-on-surface border border-outline-variant"
                    />
                  </div>
                ) : (
                  <div>
                    <label htmlFor="edit-id" className="block text-label-md text-on-surface mb-1.5">
                      Plan ID
                    </label>
                    <Input
                      id="edit-id"
                      type="text"
                      value={editId}
                      disabled
                      className="w-full bg-surface-container-low text-on-surface-variant border border-outline-variant opacity-70"
                    />
                  </div>
                )}
                <div>
                  <label htmlFor="edit-client-type" className="block text-label-md text-on-surface mb-1.5">
                    Client Type
                  </label>
                  <select
                    id="edit-client-type"
                    value={editClientType}
                    onChange={(e) => setEditClientType(e.target.value)}
                    className="w-full h-10 px-3 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary bg-surface-container-lowest text-on-surface"
                  >
                    <option value="CLIENT">Standard Client</option>
                    <option value="ENTERPRISE">Enterprise Client</option>
                    <option value="STUDENT">Student Starter</option>
                    <option value="OTHER">Other / Custom</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-label-md text-on-surface mb-1.5 font-semibold">Plan Name</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-on-surface-variant w-6">EN</span>
                    <Input
                      type="text"
                      value={editName.en_US || ""}
                      onChange={(e) => setEditName({ ...editName, en_US: e.target.value })}
                      className="flex-1 bg-surface-container-lowest text-on-surface border border-outline-variant"
                      placeholder="Plan name in English"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-on-surface-variant w-6">ES</span>
                    <Input
                      type="text"
                      value={editName.es_DO || ""}
                      onChange={(e) => setEditName({ ...editName, es_DO: e.target.value })}
                      className="flex-1 bg-surface-container-lowest text-on-surface border border-outline-variant"
                      placeholder="Nombre del plan en Español"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="edit-price" className="block text-label-md text-on-surface mb-1.5 font-semibold">
                  Monthly Price ($)
                </label>
                <Input
                  id="edit-price"
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(parseInt(e.target.value) || 0)}
                  className="w-full bg-surface-container-lowest text-on-surface border border-outline-variant"
                />
              </div>

              <div>
                <label className="block text-label-md text-on-surface mb-1.5 font-semibold">Description</label>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-on-surface-variant w-6 mt-2">EN</span>
                    <textarea
                      value={editDescription.en_US || ""}
                      onChange={(e) => setEditDescription({ ...editDescription, en_US: e.target.value })}
                      className="flex-1 min-h-[60px] p-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20"
                      placeholder="Description in English"
                    />
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-on-surface-variant w-6 mt-2">ES</span>
                    <textarea
                      value={editDescription.es_DO || ""}
                      onChange={(e) => setEditDescription({ ...editDescription, es_DO: e.target.value })}
                      className="flex-1 min-h-[60px] p-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20"
                      placeholder="Descripción en Español"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <input
                    id="edit-recommended"
                    type="checkbox"
                    checked={editRecommended}
                    onChange={(e) => setEditRecommended(e.target.checked)}
                    className="h-4 w-4 rounded border-outline-variant bg-surface-container-lowest text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="edit-recommended" className="text-body-md text-on-surface cursor-pointer select-none">
                    Recommended Plan
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="edit-active"
                    type="checkbox"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                    className="h-4 w-4 rounded border-outline-variant bg-surface-container-lowest text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="edit-active" className="text-body-md text-on-surface cursor-pointer select-none">
                    Plan Active
                  </label>
                </div>
              </div>

              <div className="border-t border-outline-variant pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-label-lg font-bold text-primary">Features</h4>
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="text-label-sm text-primary hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                  >
                    + Add Feature
                  </button>
                </div>

                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {editFeatures.map((feat, index) => (
                    <div
                      key={index}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`group flex items-start gap-2 border rounded-lg p-2 transition-all duration-200 ${
                        draggedIndex === index
                          ? "opacity-40 bg-surface-container"
                          : dragOverIndex === index
                            ? "border-primary border-dashed bg-primary/5 scale-[1.02]"
                            : "border-outline-variant/30 bg-surface-container-low/40"
                      }`}
                    >
                      {/* Drag Handle & Accessible Controls */}
                      <div className="flex items-center gap-0.5 mt-2">
                        <div
                          className="cursor-grab active:cursor-grabbing text-on-surface-variant/40 hover:text-on-surface-variant/80 transition-colors p-1"
                          title="Drag to reorder"
                        >
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMoveFeature(index, -1)}
                            className="p-0.5 hover:bg-surface-container rounded text-on-surface-variant disabled:opacity-30 cursor-pointer"
                            title="Move up"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            disabled={index === editFeatures.length - 1}
                            onClick={() => handleMoveFeature(index, 1)}
                            className="p-0.5 hover:bg-surface-container rounded text-on-surface-variant disabled:opacity-30 cursor-pointer"
                            title="Move down"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <input
                        type="checkbox"
                        checked={feat.included}
                        onChange={(e) => handleToggleFeatureIncluded(index, e.target.checked)}
                        className="h-4 w-4 rounded border-outline-variant bg-surface-container-lowest text-success focus:ring-success cursor-pointer mt-2.5"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-on-surface-variant w-6">EN</span>
                          <Input
                            type="text"
                            value={(typeof feat.text === "string" ? feat.text : feat.text?.en_US) || ""}
                            onChange={(e) => handleEditFeatureText(index, "en_US", e.target.value)}
                            className="flex-1 bg-surface-container-lowest text-on-surface border border-outline-variant py-1 h-8"
                            placeholder="Feature in English..."
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-on-surface-variant w-6">ES</span>
                          <Input
                            type="text"
                            value={(typeof feat.text === "string" ? feat.text : feat.text?.es_DO) || ""}
                            onChange={(e) => handleEditFeatureText(index, "es_DO", e.target.value)}
                            className="flex-1 bg-surface-container-lowest text-on-surface border border-outline-variant py-1 h-8"
                            placeholder="Característica en Español..."
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteFeature(index)}
                        className="p-1 hover:bg-error/15 text-error rounded-md transition-colors cursor-pointer mt-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-outline-variant flex justify-end gap-3 bg-surface-container-low/20">
              <button
                onClick={() => setEditingPlan(null)}
                className="px-4 py-2 border border-outline-variant rounded-lg text-label-md hover:bg-surface-container-low transition-colors cursor-pointer text-on-surface"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlan}
                disabled={saveLoading}
                className="px-5 py-2 bg-primary text-on-primary rounded-lg text-label-md hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {saveLoading ? "Saving..." : isCreateMode ? "Create Plan" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
