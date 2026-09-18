import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  ArrowLeft,
  Sparkles,
  DollarSign,
  ShieldCheck,
  Clock,
  Plus,
  Trash2,
  Copy,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  Cpu,
  Users,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Globe,
  SlidersHorizontal,
  Layers,
  X,
  RefreshCw,
  Calculator,
  ChevronRight,
} from "lucide-react";
import { Page } from "@/components/Page";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FEATURE_CATALOG } from "@/constants/featureCatalog";
import { calculatePlanCosts } from "@/utils/planCostCalculator";
import { toast } from "sonner";
import { useCRMStore } from "@/store/useCRMStore";
import { usePlanStore } from "@/store/usePlanStore";
import type { PlanFeature } from "@/features/subscriptions";

const customPlanSchema = z.object({
  name: z.string().min(2, "crm.customPlan.validation.nameRequired").max(100),
  description: z.string().max(500).optional(),
  price: z.coerce.number().min(0, "crm.customPlan.validation.pricePositive"),
  perDevicePrice: z.coerce.number().min(0).default(0),
  currency: z.enum(["USD", "DOP"]),
  billingCycle: z.enum(["monthly", "annual"]),
  ticketQuota: z.coerce.number().int().min(1).optional().nullable(),
  taxExempt: z.boolean().default(false),
  slaTier: z.object({
    criticalMins: z.coerce.number().int().min(1),
    highMins: z.coerce.number().int().min(1),
    medMins: z.coerce.number().int().min(1),
    lowMins: z.coerce.number().int().min(1),
  }),
  leadId: z.string().uuid().optional().nullable(),
});

function HintTooltip({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function CRMCustomPlanPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetLeadIdParam = searchParams.get("lead");
  const isDirectLeadMode = Boolean(targetLeadIdParam);

  const leads = useCRMStore((state) => state.leads);
  const fetchLeads = useCRMStore((state) => state.fetchLeads);
  const createCustomPlan = useCRMStore((state) => state.createCustomPlan);
  const actionLoading = useCRMStore((state) => state.actionLoading);

  const plans = usePlanStore((state) => state.plans);
  const fetchPlans = usePlanStore((state) => state.fetchPlans);

  const [selectedLeadId, setSelectedLeadId] = useState<string>(targetLeadIdParam || "");
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [manualBasePrice, setManualBasePrice] = useState<number | null>(null);
  const [manualPerDevicePrice, setManualPerDevicePrice] = useState<number | null>(null);
  const [isPriceOverridden, setIsPriceOverridden] = useState<boolean>(false);
  const [isPerDevicePriceOverridden, setIsPerDevicePriceOverridden] = useState<boolean>(false);
  const [showItemizedBreakdown, setShowItemizedBreakdown] = useState<boolean>(true);

  const [currency, setCurrency] = useState<"USD" | "DOP">("USD");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [isUnlimitedQuota, setIsUnlimitedQuota] = useState<boolean>(false);
  const [ticketQuota, setTicketQuota] = useState<number>(15);
  const [taxExempt, setTaxExempt] = useState<boolean>(false);

  // SLA Response Targets (in minutes)
  const [criticalMins, setCriticalMins] = useState<number>(15);
  const [highMins, setHighMins] = useState<number>(60);
  const [medMins, setMedMins] = useState<number>(240);
  const [lowMins, setLowMins] = useState<number>(720);

  // Features Catalog & Custom Features State
  const [editFeatures, setEditFeatures] = useState<PlanFeature[]>([
    {
      code: "HELPDESK_SUPPORT",
      included: true,
      params: { type: "8x5", limit: "Unlimited" },
    },
    {
      code: "SECURITY_MONITORING",
      included: true,
      params: { coverage: "24/7 SOC", logRetention: "90 Days" },
    },
    {
      code: "BACKUP_INCLUDED",
      included: true,
      params: { frequency: "Daily", retention: "30 Days", storageType: "Cloud Only" },
    },
    {
      code: "CLOUD_STORAGE",
      included: true,
      params: { limit: 50, unit: "GB" },
    },
  ]);

  const [featureLangTab, setFeatureLangTab] = useState<"en_US" | "es_DO">(() =>
    i18n.language.startsWith("es") ? "es_DO" : "en_US",
  );

  // Drag-and-Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Custom Parameter Popover State
  const [paramDraftIndex, setParamDraftIndex] = useState<number | null>(null);
  const [paramKey, setParamKey] = useState<string>("");
  const [paramValue, setParamValue] = useState<string>("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPlans();
    fetchLeads();
  }, [fetchPlans, fetchLeads]);

  useEffect(() => {
    if (targetLeadIdParam) {
      setSelectedLeadId(targetLeadIdParam);
    } else if (leads.length > 0 && !selectedLeadId) {
      setSelectedLeadId(leads[0].id);
    }
  }, [targetLeadIdParam, leads, selectedLeadId]);

  const activeLead = useMemo(() => {
    return leads.find((l) => l.id === selectedLeadId);
  }, [leads, selectedLeadId]);

  useEffect(() => {
    if (activeLead && !name) {
      setName(`${activeLead.company_name || activeLead.contact_name} - Custom Plan`);
    }
  }, [activeLead, name]);

  const equipmentCount = activeLead?.equipment_count || 1;

  // Real-time pure pricing calculations from feature catalog
  const calculatedCostSummary = useMemo(() => {
    return calculatePlanCosts({
      features: editFeatures,
      equipmentCount,
      billingCycle,
      taxExempt,
      ticketQuota: isUnlimitedQuota ? null : ticketQuota,
      slaTier: {
        criticalMins,
        highMins,
        medMins,
        lowMins,
      },
      manualPriceOverride: isPriceOverridden && manualBasePrice !== null ? manualBasePrice : undefined,
      manualPerDevicePriceOverride:
        isPerDevicePriceOverridden && manualPerDevicePrice !== null ? manualPerDevicePrice : undefined,
    });
  }, [
    editFeatures,
    equipmentCount,
    billingCycle,
    taxExempt,
    isUnlimitedQuota,
    ticketQuota,
    criticalMins,
    highMins,
    medMins,
    lowMins,
    isPriceOverridden,
    manualBasePrice,
    isPerDevicePriceOverridden,
    manualPerDevicePrice,
  ]);

  // Derived Effective Pricing without cascading useEffect state updates
  const effectiveBasePrice =
    isPriceOverridden && manualBasePrice !== null ? manualBasePrice : calculatedCostSummary.suggestedBasePrice;

  const effectivePerDevicePrice =
    isPerDevicePriceOverridden && manualPerDevicePrice !== null
      ? manualPerDevicePrice
      : calculatedCostSummary.suggestedPerDevicePrice;

  const handleSyncWithCatalog = useCallback(() => {
    setIsPriceOverridden(false);
    setIsPerDevicePriceOverridden(false);
    setManualBasePrice(null);
    setManualPerDevicePrice(null);
    toast.success(
      t("crm.customPlan.syncSuccess", {
        base: calculatedCostSummary.suggestedBasePrice.toFixed(2),
        device: calculatedCostSummary.suggestedPerDevicePrice.toFixed(2),
      }),
    );
  }, [calculatedCostSummary.suggestedBasePrice, calculatedCostSummary.suggestedPerDevicePrice, t]);

  const handleCloneFromPlan = (planId: string) => {
    const template = plans.find((p) => p.id === planId);
    if (!template) return;

    const rawName = typeof template.name === "object" ? template.name?.en || template.name?.es : template.name;
    setName(`${activeLead?.company_name || activeLead?.contact_name || "Client"} - Custom (${rawName})`);
    setManualBasePrice(template.price);
    setManualPerDevicePrice(template.per_device_price || 15);
    setIsPriceOverridden(true);
    setIsPerDevicePriceOverridden(true);
    if (template.ticket_quota) {
      setTicketQuota(template.ticket_quota);
      setIsUnlimitedQuota(false);
    } else {
      setIsUnlimitedQuota(true);
    }

    if (template.features && Array.isArray(template.features)) {
      setEditFeatures(
        template.features.map((f: any) => ({
          code: f.code || "CUSTOM_FEATURE",
          included: f.included !== false,
          text: f.text,
          params: f.params ? { ...f.params } : undefined,
        })),
      );
    }

    toast.info(t("crm.customPlan.templateLoaded", { name: rawName }));
  };

  // Feature Catalog Operations
  const closeParamPopover = useCallback(() => {
    setParamDraftIndex(null);
    setParamKey("");
    setParamValue("");
  }, []);

  const submitCustomParam = useCallback(() => {
    const trimmedKey = paramKey.trim();
    if (!trimmedKey || paramDraftIndex === null) return;
    setEditFeatures((prev) =>
      prev.map((f, i) => {
        if (i !== paramDraftIndex) return f;
        return {
          ...f,
          params: {
            ...(f.params || {}),
            [trimmedKey]: paramValue.trim(),
          },
        };
      }),
    );
    closeParamPopover();
  }, [paramKey, paramDraftIndex, paramValue, closeParamPopover]);

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
          textObj = { ...(f.text || {}) };
        }
        textObj[lang] = textVal;
        return { ...f, text: textObj };
      }),
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
      }),
    );
  }, []);

  const handleUpdateFeatureParam = useCallback(
    (index: number, paramKeyName: string, value: string | number | boolean) => {
      setEditFeatures((prev) =>
        prev.map((f, i) => {
          if (i !== index) return f;
          return {
            ...f,
            params: {
              ...(f.params || {}),
              [paramKeyName]: value,
            },
          };
        }),
      );
    },
    [],
  );

  const handleDeleteFeatureParam = useCallback((index: number, paramKeyName: string) => {
    setEditFeatures((prev) =>
      prev.map((f, i) => {
        if (i !== index) return f;
        const newParams = { ...(f.params || {}) };
        delete newParams[paramKeyName];
        return {
          ...f,
          params: newParams,
        };
      }),
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

  const handleDragStart = useCallback((_e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      setDragOverIndex((prev) => (draggedIndex !== index && prev !== index ? index : prev));
    },
    [draggedIndex],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
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
    },
    [draggedIndex],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const formData = {
      name: name.trim(),
      description: description.trim() || undefined,
      price: Number(effectiveBasePrice),
      perDevicePrice: Number(effectivePerDevicePrice),
      currency,
      billingCycle,
      ticketQuota: isUnlimitedQuota ? null : Number(ticketQuota),
      taxExempt,
      slaTier: {
        criticalMins: Number(criticalMins),
        highMins: Number(highMins),
        medMins: Number(medMins),
        lowMins: Number(lowMins),
      },
      leadId: selectedLeadId || undefined,
    };

    const validation = customPlanSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const fieldName = issue.path.join(".");
        fieldErrors[fieldName] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      await createCustomPlan({
        ...formData,
        features: editFeatures,
      });

      toast.success(t("crm.customPlan.createdSuccess"));
      navigate(selectedLeadId ? `/crm?lead=${selectedLeadId}` : "/crm");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || t("crm.customPlan.createError"));
    }
  };

  return (
    <TooltipProvider>
      <Page>
        <Page.Header>
          <Page.Breadcrumbs className="mb-2 text-muted-foreground text-xs" />
          <Page.HeaderRow>
            <Page.TitleGroup>
              <div className="flex items-center gap-2">
                <Page.Back to="/crm" />
                <Page.Title>{t("crm.customPlan.modalTitle", "Bespoke Custom Plan Studio")}</Page.Title>
              </div>
              <Page.Description>
                {t(
                  "crm.customPlan.modalSubtitle",
                  "Design private negotiated pricing, custom SLAs, and device quotas.",
                )}
              </Page.Description>
            </Page.TitleGroup>
            <Page.Actions maxVisible={3}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate("/crm")}
                className="h-7 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{t("common.back", "Back to CRM")}</span>
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={actionLoading}
                onClick={handleSubmit}
                className="h-7 px-3 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>
                  {isDirectLeadMode
                    ? t("crm.customPlan.applyToLead", "Attach to Lead")
                    : t("crm.customPlan.savePlan", "Create Custom Plan")}
                </span>
              </Button>
            </Page.Actions>
          </Page.HeaderRow>
        </Page.Header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Top Control Bar: Target Lead & Clone Template */}
          <section aria-label="Lead Selection and Template Quick-Fill">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 rounded-lg border border-border bg-card text-card-foreground p-3.5 shadow-xs">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  {t("crm.customPlan.targetLead", "Target Lead / Opportunity")}
                </Label>
                <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                  <SelectTrigger className="h-7 text-xs bg-background border-border">
                    <SelectValue placeholder={t("crm.customPlan.selectLead", "Select lead...")} />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map((l) => (
                      <SelectItem key={l.id} value={l.id} className="text-xs">
                        {l.company_name ? `${l.company_name} (${l.contact_name})` : l.contact_name} (
                        {l.equipment_count || 1} Devices)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Copy className="h-3.5 w-3.5 text-primary" />
                  {t("crm.customPlan.cloneTemplate", "Clone from Standard Plan")}
                </Label>
                <Select onValueChange={handleCloneFromPlan}>
                  <SelectTrigger className="h-7 text-xs bg-background border-border">
                    <SelectValue placeholder={t("crm.customPlan.chooseTemplate", "Quick-fill from catalog...")} />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => {
                      const pName = typeof p.name === "object" ? p.name?.en || p.name?.es : p.name;
                      return (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {pName} (${p.price}/mo)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* 2-Column Responsive Layout */}
          <section
            aria-label="Plan Configuration and Financial Projection"
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          >
            {/* Main Configuration Column (2 cols) */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {/* 1. Plan Overview */}
              <Card className="rounded-lg border border-border bg-card shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                    {t("crm.customPlan.sectionBasic", "Plan Overview")}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    {t("crm.customPlan.sectionBasicDesc", "Identify the custom tier and add negotiation terms.")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs font-medium text-foreground">
                      {t("crm.customPlan.planName", "Custom Plan Title")}
                    </Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Enterprise VIP Multi-Site Package"
                      className="h-7 text-xs mt-1 bg-background border-border"
                    />
                    {errors.name && <p className="text-[11px] text-destructive mt-0.5">{t(errors.name)}</p>}
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-foreground">
                      {t("crm.customPlan.description", "Scope / Internal Notes")}
                    </Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Negotiated conditions, contract term exclusions, or special clauses..."
                      className="text-xs min-h-17.5 resize-none mt-1 bg-background border-border"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 2. Pricing & Hardware Rates */}
              <Card className="rounded-lg border border-border bg-card shadow-xs">
                <CardHeader className="pb-3 flex flex-row items-center justify-between flex-wrap gap-2">
                  <div className="space-y-0.5">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-500" />
                      {t("crm.customPlan.sectionPricing", "Pricing & Hardware Multipliers")}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      {t("crm.customPlan.sectionPricingDesc", "Set base rates, per-seat rates, and tax exemptions.")}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isPriceOverridden || isPerDevicePriceOverridden ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={handleSyncWithCatalog}
                        className="h-6 text-[11px] gap-1 cursor-pointer border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>{t("crm.customPlan.syncCatalog", "Sync with Features")}</span>
                      </Button>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="text-[10px] h-5 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 gap-1 border border-emerald-500/20"
                      >
                        <Calculator className="h-3 w-3" />
                        <span>{t("crm.customPlan.autoCalculated", "Auto-Calculated")}</span>
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-foreground">
                          {t("crm.customPlan.basePrice", "Base Rate ($/mo)")}
                        </Label>
                        {isPriceOverridden && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {t("crm.customPlan.suggested", {
                              val: calculatedCostSummary.suggestedBasePrice.toFixed(0),
                            })}
                          </span>
                        )}
                      </div>
                      <Input
                        type="number"
                        min="0"
                        value={effectiveBasePrice}
                        onChange={(e) => {
                          setManualBasePrice(Number(e.target.value));
                          setIsPriceOverridden(true);
                        }}
                        className={`h-7 text-xs mt-1 font-semibold bg-background border-border ${
                          isPriceOverridden ? "border-amber-500/50" : ""
                        }`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-foreground">
                          {t("crm.customPlan.perDevice", "Per-Device ($/pc)")}
                        </Label>
                        {isPerDevicePriceOverridden && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {t("crm.customPlan.suggested", {
                              val: calculatedCostSummary.suggestedPerDevicePrice.toFixed(0),
                            })}
                          </span>
                        )}
                      </div>
                      <Input
                        type="number"
                        min="0"
                        value={effectivePerDevicePrice}
                        onChange={(e) => {
                          setManualPerDevicePrice(Number(e.target.value));
                          setIsPerDevicePriceOverridden(true);
                        }}
                        className={`h-7 text-xs mt-1 font-semibold bg-background border-border ${
                          isPerDevicePriceOverridden ? "border-amber-500/50" : ""
                        }`}
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-medium text-foreground">
                        {t("crm.customPlan.currency", "Currency")}
                      </Label>
                      <Select value={currency} onValueChange={(val: any) => setCurrency(val)}>
                        <SelectTrigger className="h-7 text-xs mt-1 bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD" className="text-xs">
                            USD ($)
                          </SelectItem>
                          <SelectItem value="DOP" className="text-xs">
                            DOP (RD$)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-medium text-foreground">
                        {t("crm.customPlan.billingCycle", "Billing Cycle")}
                      </Label>
                      <Select value={billingCycle} onValueChange={(val: any) => setBillingCycle(val)}>
                        <SelectTrigger className="h-7 text-xs mt-1 bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly" className="text-xs">
                            {t("crm.customPlan.monthly", "Monthly")}
                          </SelectItem>
                          <SelectItem value="annual" className="text-xs">
                            {t("crm.customPlan.annual", "Annual (-10%)")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Tax Exemption */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Receipt className="h-3.5 w-3.5 text-amber-500" />
                        {t("crm.customPlan.taxExemptLabel", "DGII ITBIS 18% Tax Exemption")}
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        {t(
                          "crm.customPlan.taxExemptHint",
                          "Exempt free zones or diplomatic accounts from standard Dominican 18% ITBIS.",
                        )}
                      </p>
                    </div>
                    <Checkbox
                      checked={taxExempt}
                      onCheckedChange={(val) => setTaxExempt(Boolean(val))}
                      className="cursor-pointer"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 3. SLA & Quota Guarantees */}
              <Card className="rounded-lg border border-border bg-card shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4 text-indigo-500" />
                    {t("crm.customPlan.sectionSla", "SLA Guarantees & Ticket Quota (BL-101 / BL-201)")}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    {t(
                      "crm.customPlan.sectionSlaDesc",
                      "Configure contractual response targets and monthly ticket limits.",
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Monthly Quota */}
                  <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground">
                        {t("crm.customPlan.quotaMode", "Monthly Ticket Cap")}
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">
                          {isUnlimitedQuota
                            ? t("crm.customPlan.unlimited", "Unlimited Quota")
                            : `${ticketQuota} Tickets/mo`}
                        </span>
                        <Checkbox
                          checked={isUnlimitedQuota}
                          onCheckedChange={(val) => setIsUnlimitedQuota(Boolean(val))}
                          className="cursor-pointer"
                        />
                      </div>
                    </div>
                    {!isUnlimitedQuota && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={ticketQuota}
                          onChange={(e) => setTicketQuota(Number(e.target.value))}
                          className="h-7 text-xs w-32 font-semibold bg-background border-border"
                        />
                        <span className="text-xs text-muted-foreground">tickets / month allowed</span>
                      </div>
                    )}
                  </div>

                  {/* SLA Targets */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400">P1 Critical</span>
                        <ShieldCheck className="h-3.5 w-3.5 text-rose-500" />
                      </div>
                      <Input
                        type="number"
                        min="1"
                        value={criticalMins}
                        onChange={(e) => setCriticalMins(Number(e.target.value))}
                        className="h-7 text-xs font-mono font-bold bg-background border-rose-200 dark:border-rose-900/50"
                      />
                      <span className="text-[10px] text-muted-foreground">minutes response</span>
                    </div>

                    <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">P2 High</span>
                        <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
                      </div>
                      <Input
                        type="number"
                        min="1"
                        value={highMins}
                        onChange={(e) => setHighMins(Number(e.target.value))}
                        className="h-7 text-xs font-mono font-bold bg-background border-amber-200 dark:border-amber-900/50"
                      />
                      <span className="text-[10px] text-muted-foreground">minutes response</span>
                    </div>

                    <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400">P3 Medium</span>
                        <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                      </div>
                      <Input
                        type="number"
                        min="1"
                        value={medMins}
                        onChange={(e) => setMedMins(Number(e.target.value))}
                        className="h-7 text-xs font-mono font-bold bg-background border-blue-200 dark:border-blue-900/50"
                      />
                      <span className="text-[10px] text-muted-foreground">minutes response</span>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-muted-foreground">P4 Low</span>
                        <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <Input
                        type="number"
                        min="1"
                        value={lowMins}
                        onChange={(e) => setLowMins(Number(e.target.value))}
                        className="h-7 text-xs font-mono font-bold bg-background border-border"
                      />
                      <span className="text-[10px] text-muted-foreground">minutes response</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 4. Full Feature Catalog & Deliverables Editor */}
              <Card className="rounded-lg border border-border bg-card shadow-xs">
                <CardHeader className="pb-3 flex flex-row items-center justify-between flex-wrap gap-2">
                  <div className="space-y-0.5">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4 text-primary" />
                      {t("crm.customPlan.sectionFeatures", "Service Capabilities & Feature Catalog")}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      {t(
                        "crm.customPlan.sectionFeaturesDesc",
                        "Select catalog capabilities, tune parameters, or add bespoke custom deliverables.",
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tabs value={featureLangTab} onValueChange={(val) => setFeatureLangTab(val as "en_US" | "es_DO")}>
                      <TabsList className="h-6 p-0.5 bg-muted border border-border">
                        <TabsTrigger value="en_US" className="text-[11px] h-5 px-2 gap-1 cursor-pointer">
                          <Globe className="h-3 w-3" />
                          <span>EN</span>
                        </TabsTrigger>
                        <TabsTrigger value="es_DO" className="text-[11px] h-5 px-2 gap-1 cursor-pointer">
                          <Globe className="h-3 w-3" />
                          <span>ES</span>
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={handleAddFeature}
                      className="h-6 text-xs gap-1 cursor-pointer border-dashed border-border bg-card"
                    >
                      <Plus className="h-3 w-3" />
                      <span>{t("plans.addFeature") || "Add Feature"}</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {editFeatures.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 border border-dashed border-border rounded-lg text-center bg-muted/30">
                      <div className="p-2 rounded-full bg-muted mb-2 text-muted-foreground">
                        <Layers className="size-4" />
                      </div>
                      <p className="text-xs font-semibold text-foreground mb-0.5">
                        {t("plans.noFeatures", "No Features Configured")}
                      </p>
                      <p className="text-[11px] text-muted-foreground max-w-xs mb-3">
                        {t("plans.noFeaturesHint", "Add capabilities from the catalog or write custom deliverables.")}
                      </p>
                      <Button
                        type="button"
                        variant="default"
                        size="xs"
                        onClick={handleAddFeature}
                        className="cursor-pointer h-7 text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {t("plans.addFirstFeature", "Add First Feature")}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {editFeatures.map((feat, index) => {
                        const isCustom = !feat.code || feat.code === "CUSTOM_FEATURE";
                        const textVal = typeof feat.text === "string" ? feat.text : feat.text?.[featureLangTab] || "";
                        const catalogItem = FEATURE_CATALOG.find((cat) => cat.code === feat.code);
                        const allParamKeys = Array.from(
                          new Set([
                            ...(catalogItem?.paramSchema?.map((p) => p.key) || []),
                            ...Object.keys(feat.params || {}),
                          ]),
                        );
                        const schemaKeys = new Set(catalogItem?.paramSchema?.map((p) => p.key) || []);

                        return (
                          <div
                            key={index}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`group relative p-3 rounded-lg border transition-all duration-150 ${
                              draggedIndex === index
                                ? "opacity-40 border-dashed border-primary bg-primary/5"
                                : dragOverIndex === index
                                  ? "border-primary shadow-xs bg-muted/50/60 scale-[1.01]"
                                  : "border-border bg-card hover:border-primary/40 hover:shadow-xs"
                            }`}
                          >
                            {/* Feature Row Content */}
                            <div className="flex items-center gap-2">
                              {/* Drag Handle */}
                              <div
                                className="cursor-grab active:cursor-grabbing text-muted-foreground group-hover:text-foreground p-0.5"
                                title="Drag to reorder"
                              >
                                <GripVertical className="h-4 w-4" />
                              </div>

                              {/* Included Checkbox */}
                              <HintTooltip
                                label={
                                  feat.included
                                    ? t("plans.featureIncluded", "Included")
                                    : t("plans.featureExcluded", "Excluded")
                                }
                              >
                                <div>
                                  <Checkbox
                                    checked={feat.included}
                                    onCheckedChange={(checked) => handleToggleFeatureIncluded(index, checked === true)}
                                    className="size-4 cursor-pointer data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                    aria-label={t("plans.featureIncluded", "Included")}
                                  />
                                </div>
                              </HintTooltip>

                              {/* Catalog Select or Custom Input */}
                              <div className="flex-1 min-w-0">
                                {isCustom ? (
                                  <div className="flex items-center gap-1.5">
                                    <Input
                                      value={textVal}
                                      onChange={(e) => handleEditFeatureText(index, featureLangTab, e.target.value)}
                                      placeholder={
                                        featureLangTab === "es_DO"
                                          ? "p.ej. Consultoría y auditoría trimestral..."
                                          : "e.g. Quarterly Executive Security Review..."
                                      }
                                      className="h-7 text-xs bg-background border-border"
                                    />
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] h-5 shrink-0 bg-muted text-muted-foreground border-border"
                                    >
                                      Custom
                                    </Badge>
                                  </div>
                                ) : (
                                  <Select
                                    value={feat.code}
                                    onValueChange={(code) => handleUpdateFeatureCode(index, code)}
                                  >
                                    <SelectTrigger className="h-7 text-xs bg-background font-medium border-border">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-72">
                                      <SelectItem value="CUSTOM_FEATURE" className="text-xs font-semibold text-primary">
                                        ✨ {t("plans.customFeatureLabel", "Custom Feature (Free-form text)")}
                                      </SelectItem>
                                      {FEATURE_CATALOG.map((cat) => {
                                        const mergedParams = {
                                          ...(cat.defaultParams || {}),
                                          ...(feat.code === cat.code ? feat.params || {} : {}),
                                        };
                                        return (
                                          <SelectItem key={cat.code} value={cat.code} className="text-xs">
                                            {t(cat.labelKey, mergedParams)}
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-0.5 shrink-0">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="xs"
                                  onClick={() => handleMoveFeature(index, -1)}
                                  disabled={index === 0}
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                                  title="Move Up"
                                >
                                  <ChevronUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="xs"
                                  onClick={() => handleMoveFeature(index, 1)}
                                  disabled={index === editFeatures.length - 1}
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                                  title="Move Down"
                                >
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="xs"
                                  onClick={() => handleDeleteFeature(index)}
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                                  title="Remove Feature"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>

                            {/* Catalog Param Chips */}
                            {!isCustom && (
                              <div className="mt-2 pl-6 flex flex-wrap items-center gap-1.5">
                                {allParamKeys.map((schemaParamKey) => {
                                  const schemaItem = catalogItem?.paramSchema?.find((p) => p.key === schemaParamKey);
                                  const isPredefinedSchema = schemaKeys.has(schemaParamKey);
                                  const currentVal = feat.params?.[schemaParamKey] ?? schemaItem?.defaultValue ?? "";
                                  const label = schemaItem ? schemaItem.label : schemaParamKey;

                                  return (
                                    <div
                                      key={schemaParamKey}
                                      className="flex items-center gap-1 rounded-md bg-muted/70 border border-border px-1.5 py-0.5 text-xs"
                                    >
                                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground pl-0.5">
                                        {label}:
                                      </span>
                                      {schemaItem?.type === "select" && schemaItem.options ? (
                                        <Select
                                          value={String(currentVal)}
                                          onValueChange={(val) => handleUpdateFeatureParam(index, schemaParamKey, val)}
                                        >
                                          <SelectTrigger
                                            aria-label={label}
                                            className="h-5 text-[11px] px-1.5 bg-background border-border"
                                          >
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {schemaItem.options.map((opt) => (
                                              <SelectItem key={opt} value={opt} className="text-xs">
                                                {opt}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      ) : (
                                        <Input
                                          type={schemaItem?.type === "number" ? "number" : "text"}
                                          value={currentVal as string | number}
                                          aria-label={label}
                                          onChange={(e) =>
                                            handleUpdateFeatureParam(
                                              index,
                                              schemaParamKey,
                                              schemaItem?.type === "number" ? Number(e.target.value) : e.target.value,
                                            )
                                          }
                                          className="h-5 w-16 text-[11px] px-1 bg-background border-border"
                                        />
                                      )}
                                      {!isPredefinedSchema && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="xs"
                                          onClick={() => handleDeleteFeatureParam(index, schemaParamKey)}
                                          className="h-4 w-4 p-0 text-muted-foreground hover:text-destructive cursor-pointer ml-0.5"
                                        >
                                          <X className="h-2.5 w-2.5" />
                                        </Button>
                                      )}
                                    </div>
                                  );
                                })}

                                {/* Add Custom Param Popover */}
                                <Popover
                                  open={paramDraftIndex === index}
                                  onOpenChange={(open) => {
                                    if (!open) closeParamPopover();
                                  }}
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="xs"
                                      onClick={() => {
                                        setParamDraftIndex(index);
                                        setParamKey("");
                                        setParamValue("");
                                      }}
                                      className="h-5 text-[10px] px-1.5 gap-1 text-muted-foreground hover:text-foreground cursor-pointer border border-dashed border-border"
                                    >
                                      <Plus className="h-2.5 w-2.5" />
                                      <span>Add Parameter</span>
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-56 p-3 space-y-2 border-border"
                                    align="start"
                                  >
                                    <p className="text-xs font-semibold text-foreground">
                                      Add Parameter
                                    </p>
                                    <Input
                                      placeholder="Key (e.g. seats, target)"
                                      value={paramKey}
                                      onChange={(e) => setParamKey(e.target.value)}
                                      className="h-7 text-xs bg-background border-border"
                                    />
                                    <Input
                                      placeholder="Value (e.g. 50, On-Premise)"
                                      value={paramValue}
                                      onChange={(e) => setParamValue(e.target.value)}
                                      className="h-7 text-xs bg-background border-border"
                                    />
                                    <div className="flex justify-end gap-1.5 pt-1">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="xs"
                                        onClick={closeParamPopover}
                                        className="h-6 text-xs cursor-pointer"
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        type="button"
                                        size="xs"
                                        onClick={submitCustomParam}
                                        disabled={!paramKey.trim()}
                                        className="h-6 text-xs cursor-pointer"
                                      >
                                        Add
                                      </Button>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sticky Sidebar: Financial Projections & Final Actions */}
            <aside aria-label="Live Contract and Revenue Projection" className="space-y-4">
              <Card className="rounded-lg border border-primary/20 bg-primary/5 shadow-xs sticky top-6">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-primary flex items-center gap-1.5">
                      <Cpu className="h-4 w-4" />
                      {t("crm.customPlan.mrrBreakdown", "Live Contract & Revenue Projection")}
                    </CardTitle>
                    <Badge className="bg-primary text-primary-foreground text-[10px] font-mono">{currency}</Badge>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground">
                    {billingCycle === "annual"
                      ? t("crm.customPlan.annualDiscount", "Annual Contract (-10% Discount)")
                      : t("crm.customPlan.monthly", "Monthly Recurring Contract")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-xs divide-y divide-border">
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-muted-foreground">
                        {t("crm.customPlan.baseSubtotal", "Base Monthly Rate")}
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        ${effectiveBasePrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-muted-foreground">
                        {t("crm.customPlan.perDeviceSubtotal", "Hardware Multiplier")} ({equipmentCount} PCs @ $
                        {effectivePerDevicePrice.toFixed(2)}/pc)
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        ${calculatedCostSummary.hardwareSubtotal.toFixed(2)}
                      </span>
                    </div>
                    {calculatedCostSummary.slaPremiumMonthly > 0 && (
                      <div className="flex items-center justify-between pt-2 text-indigo-600 dark:text-indigo-400">
                        <span>{t("crm.customPlan.slaPremium", "SLA Rapid-Response Premium")}</span>
                        <span className="font-mono font-bold">
                          +${calculatedCostSummary.slaPremiumMonthly.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {calculatedCostSummary.quotaAdjustmentMonthly > 0 && (
                      <div className="flex items-center justify-between pt-2 text-blue-600 dark:text-blue-400">
                        <span>{t("crm.customPlan.quotaReserve", "Unlimited Quota Contingency")}</span>
                        <span className="font-mono font-bold">
                          +${calculatedCostSummary.quotaAdjustmentMonthly.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {billingCycle === "annual" && (
                      <div className="flex items-center justify-between pt-2 text-emerald-600 dark:text-emerald-400">
                        <span>{t("crm.customPlan.annualDiscount", "Annual 10% Discount")}</span>
                        <span className="font-mono font-bold">
                          -${calculatedCostSummary.annualDiscountAmount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-muted-foreground">DGII ITBIS (18%)</span>
                      <span className="font-mono font-bold text-amber-500">
                        {taxExempt ? "EXEMPT ($0.00)" : `$${calculatedCostSummary.taxAmount.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-3 text-sm">
                      <span className="font-bold text-primary">
                        {t("crm.customPlan.monthlyGrandTotal", "Monthly Total")}
                      </span>
                      <span className="font-mono font-extrabold text-primary text-lg">
                        ${calculatedCostSummary.monthlyGrandTotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 text-[11px] text-muted-foreground font-mono">
                      <span>{t("crm.customPlan.annualContractValue", "Estimated Annual Value")}</span>
                      <span className="font-mono font-semibold text-foreground">
                        ${calculatedCostSummary.annualContractValue.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Expandable Itemized Feature Breakdown */}
                  <div className="pt-2 border-t border-border">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowItemizedBreakdown((prev) => !prev)}
                      className="w-full h-7 px-1 flex items-center justify-between mb-2 text-left cursor-pointer hover:bg-transparent"
                    >
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 group-hover:text-foreground">
                        <ChevronRight
                          className={`h-3.5 w-3.5 transition-transform duration-150 ${showItemizedBreakdown ? "rotate-90 text-primary" : "text-muted-foreground"}`}
                        />
                        {t("crm.customPlan.itemizedLineItems", "Itemized Feature Pricing")}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {calculatedCostSummary.lineItems.length} Features
                      </span>
                    </Button>

                    {showItemizedBreakdown && (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {calculatedCostSummary.lineItems.map((item, i) => (
                          <div
                            key={i}
                            className="p-1.5 rounded-md bg-card/70 border border-border text-[11px] flex items-center justify-between"
                          >
                            <span
                              className="text-foreground truncate max-w-35 font-medium"
                              title={item.name}
                            >
                              {t(item.name, item.name)}
                            </span>
                            <div className="flex items-center gap-1.5 font-mono text-[10px] shrink-0">
                              {item.baseMonthly > 0 && (
                                <span className="text-foreground font-semibold">
                                  ${item.baseMonthly.toFixed(0)}/mo
                                </span>
                              )}
                              {item.perDeviceMonthly > 0 && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                  +${item.perDeviceMonthly.toFixed(1)}/pc
                                </span>
                              )}
                              {item.baseMonthly === 0 && item.perDeviceMonthly === 0 && (
                                <span className="text-muted-foreground">Included</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Included Deliverables Summary */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        Enabled Deliverables
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {editFeatures.filter((f) => f.included).length} Active
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {editFeatures
                        .filter((f) => f.included)
                        .slice(0, 6)
                        .map((f, i) => {
                          const cat = FEATURE_CATALOG.find((c) => c.code === f.code);
                          const label = cat
                            ? t(cat.labelKey, { ...(cat.defaultParams || {}), ...(f.params || {}) })
                            : typeof f.text === "string"
                              ? f.text
                              : f.text?.[featureLangTab] || "Feature";
                          return (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="text-[10px] py-0 px-1.5 font-normal truncate max-w-50 bg-muted text-foreground"
                            >
                              {label}
                            </Badge>
                          );
                        })}
                      {editFeatures.filter((f) => f.included).length > 6 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 font-mono border-border"
                        >
                          +{editFeatures.filter((f) => f.included).length - 6} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Target Lead Overview in Sidebar */}
                  {activeLead && (
                    <div className="p-3 rounded-lg border border-border bg-card/80 space-y-1.5 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Selected Client
                        </span>
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-medium text-blue-700 border border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400">
                          <span className="mr-1 h-1 w-1 rounded-full bg-blue-500" />
                          {activeLead.stage}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-foreground">
                        {activeLead.company_name || activeLead.contact_name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {activeLead.contact_email}
                      </p>
                    </div>
                  )}

                  {/* Submit Action */}
                  <Button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full h-8 text-xs font-semibold gap-1.5 shadow-xs mt-4 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {actionLoading
                      ? t("common.saving", "Saving...")
                      : t("crm.customPlan.createAndBind", "Create & Apply Custom Plan")}
                  </Button>
                </CardContent>
              </Card>
            </aside>
          </section>
        </form>
      </Page>
    </TooltipProvider>
  );
}

export default CRMCustomPlanPage;
