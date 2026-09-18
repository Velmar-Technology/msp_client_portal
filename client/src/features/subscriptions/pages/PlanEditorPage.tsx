import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import {
  ArrowLeft,
  X,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Globe,
  SlidersHorizontal,
  Layers,
  Sparkles,
  CheckCircle2,
  Save,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { planService, type Plan, type PlanFeature, type PlanClientType } from "../api/planService";
import { Page } from "@/components/Page";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FEATURE_CATALOG } from "@/constants/featureCatalog";
import { DeletePlanAlertDialog } from "../components/DeletePlanAlertDialog";
import { PlanCard } from "../components/PlanCard";
import { toast } from "sonner";

const planEditorSchema = z.object({
  id: z.string().min(2, "plans.validation.planIdMin").max(50, "plans.validation.planIdMax").optional(),
  nameEnUs: z.string().min(1, "plans.validation.planNameRequired"),
  price: z.number().int("plans.validation.priceInvalid").min(0, "plans.validation.priceInvalid"),
});

function HintTooltip({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Dedicated Full-Page Plan Editor for creating and updating service plans per ADR-002.
 */
export function PlanEditorPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const isCreateMode = useMemo(() => {
    return !id || id === "new" || location.pathname.endsWith("/new");
  }, [id, location.pathname]);

  // Loading and form states
  const [pageLoading, setPageLoading] = useState<boolean>(!isCreateMode);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [planNotFound, setPlanNotFound] = useState<boolean>(false);

  const [editId, setEditId] = useState<string>("");
  const [editClientType, setEditClientType] = useState<PlanClientType>("CLIENT");
  const [editName, setEditName] = useState<Record<string, string>>({ en_US: "", es_DO: "" });
  const [editDescription, setEditDescription] = useState<Record<string, string>>({ en_US: "", es_DO: "" });
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editRecommended, setEditRecommended] = useState<boolean>(false);
  const [editActive, setEditActive] = useState<boolean>(true);
  const [editFeatures, setEditFeatures] = useState<PlanFeature[]>([]);

  // UI interaction states
  const [activeLang, setActiveLang] = useState<"en_US" | "es_DO">("en_US");
  const [featureLangTab, setFeatureLangTab] = useState<"en_US" | "es_DO">("en_US");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [paramDraftIndex, setParamDraftIndex] = useState<number | null>(null);
  const [paramKey, setParamKey] = useState<string>("");
  const [paramValue, setParamValue] = useState<string>("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);

  // Fetch existing plan data when in edit mode
  useEffect(() => {
    if (isCreateMode) {
      setEditId("");
      setEditClientType("CLIENT");
      setEditName({ en_US: "", es_DO: "" });
      setEditDescription({ en_US: "", es_DO: "" });
      setEditPrice(0);
      setEditRecommended(false);
      setEditActive(true);
      setEditFeatures([]);
      setPageLoading(false);
      return;
    }

    let isMounted = true;
    async function loadPlan() {
      setPageLoading(true);
      try {
        const allPlans = await planService.getAll();
        const foundPlan = allPlans.find((p) => p.id === id);
        if (!foundPlan) {
          if (isMounted) setPlanNotFound(true);
          return;
        }

        if (isMounted) {
          setEditId(foundPlan.id);
          setEditClientType(foundPlan.client_type || "CLIENT");
          setEditName(
            typeof foundPlan.name === "string"
              ? { en_US: foundPlan.name, es_DO: foundPlan.name }
              : { ...foundPlan.name },
          );
          setEditDescription(
            typeof foundPlan.description === "string"
              ? { en_US: foundPlan.description, es_DO: foundPlan.description }
              : foundPlan.description
                ? { ...foundPlan.description }
                : { en_US: "", es_DO: "" },
          );
          setEditPrice(Number(foundPlan.price) || 0);
          setEditRecommended(Boolean(foundPlan.recommended));
          setEditActive(foundPlan.active !== false);
          setEditFeatures(
            Array.isArray(foundPlan.features)
              ? foundPlan.features.map((f) => ({
                  ...f,
                  text: typeof f.text === "string" ? { en_US: f.text, es_DO: f.text } : f.text,
                }))
              : [],
          );
        }
      } catch (err) {
        console.error("Failed to load plan for editing:", err);
        if (isMounted) setPlanNotFound(true);
      } finally {
        if (isMounted) setPageLoading(false);
      }
    }

    loadPlan();
    return () => {
      isMounted = false;
    };
  }, [id, isCreateMode]);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

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
          textObj = { ...f.text };
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
      })
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

  // Save Plan
  const handleSave = async () => {
    const parsed = planEditorSchema.safeParse({
      id: isCreateMode ? editId.trim() : undefined,
      nameEnUs: (editName.en_US || "").trim(),
      price: editPrice,
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "");
        if (!errors[field]) errors[field] = t(issue.message);
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setSaveLoading(true);
    try {
      const payload = {
        name: editName,
        description: editDescription,
        price: editPrice,
        recommended: editRecommended,
        client_type: editClientType,
        active: editActive,
        features: editFeatures,
      };

      if (isCreateMode) {
        await planService.create({
          id: editId.trim(),
          ...payload,
        });
        toast.success(t("plans.createdSuccessTitle") || "Plan Created", {
          description:
            t("plans.createdSuccessMsg", { id: editId.trim() }) || `Plan ${editId.trim()} created successfully.`,
        });
      } else {
        await planService.update(id!, payload);
        toast.success(t("plans.updatedSuccessTitle") || "Plan Updated", {
          description: t("plans.updatedSuccessMsg", { id: id! }) || `Plan ${id!} updated successfully.`,
        });
      }

      navigate("/plans");
    } catch (err: unknown) {
      console.error("Failed to save plan:", err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(t("plans.saveErrorTitle") || "Failed to save plan", {
        description:
          error.response?.data?.message || error.message || t("plans.saveErrorMsg") || "Could not save plan changes.",
      });
    } finally {
      setSaveLoading(false);
    }
  };

  // Delete Plan
  const handleDeletePlan = async () => {
    if (isCreateMode || !id) return;
    setSaveLoading(true);
    try {
      await planService.delete(id);
      toast.success(t("plans.deletedSuccessTitle") || "Plan Deleted", {
        description: t("plans.deletedSuccessMsg", { id }) || `Plan ${id} deleted successfully.`,
      });
      setIsDeleteDialogOpen(false);
      navigate("/plans");
    } catch (err: unknown) {
      console.error("Failed to delete plan:", err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(t("plans.deleteErrorTitle") || "Delete Failed", {
        description:
          error.response?.data?.message || error.message || t("plans.deleteErrorMsg") || "Could not delete plan.",
      });
    } finally {
      setSaveLoading(false);
    }
  };

  // Preview Plan Object
  const previewPlan: Plan = useMemo(() => {
    return {
      id: editId || (isCreateMode ? "NEW-PLAN" : id || "PL-000"),
      name: editName.en_US ? editName : { en_US: t("plans.newPlanDefaultName") || "New Plan", es_DO: "Nuevo Plan" },
      description: editDescription,
      price: editPrice,
      recommended: editRecommended,
      client_type: editClientType,
      active: editActive,
      features: editFeatures,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }, [
    editId,
    isCreateMode,
    id,
    editName,
    editDescription,
    editPrice,
    editRecommended,
    editClientType,
    editActive,
    editFeatures,
    t,
  ]);

  const previewFeatureText = useCallback(
    (featOrText: PlanFeature | string | Record<string, string>): string => {
      if (typeof featOrText === "string") return featOrText;
      if (!("code" in featOrText) && !("text" in featOrText)) {
        const lang = (i18n.language || "en_US").startsWith("es") ? "es_DO" : "en_US";
        const rec = featOrText as Record<string, string>;
        return rec[lang] || rec.en_US || "";
      }
      const feat = featOrText as PlanFeature;
      const lang = (i18n.language || "en_US").startsWith("es") ? "es_DO" : "en_US";
      if (feat.text) {
        if (typeof feat.text === "string" && feat.text.trim()) return feat.text;
        if (typeof feat.text === "object") {
          if (feat.text[lang]?.trim()) return feat.text[lang];
          if (feat.text.en_US?.trim()) return feat.text.en_US;
        }
      }
      if (feat.code) {
        const key = `plans.features.${feat.code}`;
        const catalogItem = FEATURE_CATALOG.find((cat) => cat.code === feat.code);
        const params = {
          ...(catalogItem?.defaultParams || {}),
          ...(feat.params || {}),
        };
        const translated = t(key, params);
        if (translated !== key) return translated;
        return feat.code;
      }
      return "";
    },
    [i18n.language, t],
  );

  const previewPlanName = useMemo(() => {
    if (typeof previewPlan.name === "string") return previewPlan.name;
    const lang = (i18n.language || "en_US").startsWith("es") ? "es_DO" : "en_US";
    const rec = previewPlan.name as Record<string, string>;
    return rec[lang] || rec.en_US || previewPlan.id;
  }, [i18n.language, previewPlan]);

  const previewPlanDesc = useMemo(() => {
    if (!previewPlan.description) return "";
    if (typeof previewPlan.description === "string") return previewPlan.description;
    const lang = (i18n.language || "en_US").startsWith("es") ? "es_DO" : "en_US";
    const rec = previewPlan.description as Record<string, string>;
    return rec[lang] || rec.en_US || "";
  }, [i18n.language, previewPlan]);

  if (pageLoading) {
    return (
      <Page>
        <Page.Header>
          <Page.Breadcrumbs className="mb-2 text-muted-foreground text-xs" />
          <Page.HeaderRow>
            <Page.TitleGroup>
              <Page.Title>{isCreateMode ? t("plans.addNewPlan") : t("plans.editPlanTitle", { id })}</Page.Title>
            </Page.TitleGroup>
          </Page.HeaderRow>
        </Page.Header>
        <div className="flex items-center justify-center min-h-100">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">{t("plans.loading") || "Loading..."}</p>
          </div>
        </div>
      </Page>
    );
  }

  if (planNotFound) {
    return (
      <Page>
        <Page.Header>
          <Page.Breadcrumbs className="mb-2 text-muted-foreground text-xs" />
          <Page.HeaderRow>
            <Page.TitleGroup>
              <Page.Title>{t("plans.planNotFound") || "Plan Not Found"}</Page.Title>
            </Page.TitleGroup>
          </Page.HeaderRow>
        </Page.Header>
        <Card className="max-w-md mx-auto my-12 text-center p-6 space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <CardTitle className="text-lg font-bold">{t("plans.planNotFoundTitle") || "Plan Not Found"}</CardTitle>
          <CardDescription>
            {t("plans.planNotFoundDesc", { id }) ||
              `The plan with identifier "${id}" could not be found or has been deleted.`}
          </CardDescription>
          <Button onClick={() => navigate("/plans")} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("plans.backToPlans") || "Back to Plans"}
          </Button>
        </Card>
      </Page>
    );
  }

  return (
    <TooltipProvider>
      <Page>
        <Page.Header>
          <Page.Breadcrumbs className="mb-2 text-muted-foreground text-xs" />
          <Page.HeaderRow>
            <Page.TitleGroup>
              <div className="flex items-center gap-2">
                <Page.Back to="/plans" />
                <Page.Title>{isCreateMode ? t("plans.addNewPlan") : t("plans.editPlanTitle", { id })}</Page.Title>
              </div>
            </Page.TitleGroup>
            <Page.Actions maxVisible={3}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate("/plans")}
                className="cursor-pointer h-7"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                {t("plans.cancel") || "Cancel"}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={saveLoading}
                className="cursor-pointer shadow-xs h-7"
              >
                {saveLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1.5" />
                ) : (
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                )}
                {isCreateMode ? t("plans.createPlan") || "Create Plan" : t("plans.saveChanges") || "Save Changes"}
              </Button>
            </Page.Actions>
          </Page.HeaderRow>
        </Page.Header>

        <div className="space-y-6">
          {/* Main Grid: Left Column Form Builder, Right Column Settings & Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 8 Columns: Form Builder */}
            <div className="lg:col-span-8 space-y-6">
              {/* Card 1: Multi-language Plan Details */}
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
                        <Globe className="size-3.5" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold tracking-tight text-foreground font-heading">
                          {t("plans.i18nContent")}
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                          {t("plans.i18nContentDesc") ||
                            "Configure plan title and summary across all supported languages"}
                        </CardDescription>
                      </div>
                    </div>

                    <Tabs value={activeLang} onValueChange={(v) => setActiveLang(v as "en_US" | "es_DO")}>
                      <TabsList className="h-7 p-0.5">
                        <TabsTrigger value="en_US" className="text-[11px] px-2.5 h-6">
                          🇺🇸 {t("plans.langCodeEn") || "EN"}
                        </TabsTrigger>
                        <TabsTrigger value="es_DO" className="text-[11px] px-2.5 h-6">
                          🇩🇴 {t("plans.langCodeEs") || "ES"}
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {/* English Tab */}
                  {activeLang === "en_US" && (
                    <div className="space-y-3.5">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="plan-name-en"
                          className="text-xs font-semibold text-foreground flex items-center justify-between"
                        >
                          <span>
                            {t("plans.planNameEn")} <span className="text-destructive">*</span>
                          </span>
                          <span className="text-[10px] text-muted-foreground font-normal">English (Default)</span>
                        </Label>
                        <Input
                          id="plan-name-en"
                          size="sm"
                          value={editName.en_US || ""}
                          onChange={(e) => {
                            setEditName((prev) => ({ ...prev, en_US: e.target.value }));
                            clearFieldError("nameEnUs");
                          }}
                          placeholder={t("plans.planNameEnPlaceholder")}
                          className={fieldErrors.nameEnUs ? "border-destructive focus-visible:ring-destructive" : ""}
                        />
                        {fieldErrors.nameEnUs && (
                          <p className="text-[11px] font-medium text-destructive">{fieldErrors.nameEnUs}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="plan-desc-en"
                          className="text-xs font-semibold text-foreground flex items-center justify-between"
                        >
                          <span>{t("plans.planDescEn")}</span>
                          <span className="text-[10px] text-muted-foreground font-normal">English (Default)</span>
                        </Label>
                        <Textarea
                          id="plan-desc-en"
                          rows={3}
                          value={editDescription.en_US || ""}
                          onChange={(e) => setEditDescription((prev) => ({ ...prev, en_US: e.target.value }))}
                          placeholder={t("plans.planDescEnPlaceholder")}
                          className="text-xs resize-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Spanish Tab */}
                  {activeLang === "es_DO" && (
                    <div className="space-y-3.5">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="plan-name-es"
                          className="text-xs font-semibold text-foreground flex items-center justify-between"
                        >
                          <span>{t("plans.planNameEs")}</span>
                          <span className="text-[10px] text-muted-foreground font-normal">Español</span>
                        </Label>
                        <Input
                          id="plan-name-es"
                          size="sm"
                          value={editName.es_DO || ""}
                          onChange={(e) => setEditName((prev) => ({ ...prev, es_DO: e.target.value }))}
                          placeholder={t("plans.planNameEsPlaceholder")}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="plan-desc-es"
                          className="text-xs font-semibold text-foreground flex items-center justify-between"
                        >
                          <span>{t("plans.planDescEs")}</span>
                          <span className="text-[10px] text-muted-foreground font-normal">Español</span>
                        </Label>
                        <Textarea
                          id="plan-desc-es"
                          rows={3}
                          value={editDescription.es_DO || ""}
                          onChange={(e) => setEditDescription((prev) => ({ ...prev, es_DO: e.target.value }))}
                          placeholder={t("plans.planDescEsPlaceholder")}
                          className="text-xs resize-none"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card 2: Plan Features Builder */}
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
                        <Layers className="size-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm font-bold tracking-tight text-foreground font-heading">
                            {t("plans.planFeatures")}
                          </CardTitle>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            {editFeatures.length}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs text-muted-foreground">
                          {t("plans.featuresSubtitle") ||
                            "Add capabilities from catalog or customize manual service tiers"}
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Tabs value={featureLangTab} onValueChange={(v) => setFeatureLangTab(v as "en_US" | "es_DO")}>
                        <TabsList className="h-7 p-0.5">
                          <TabsTrigger value="en_US" className="text-[11px] px-2 h-6">
                            🇺🇸 EN
                          </TabsTrigger>
                          <TabsTrigger value="es_DO" className="text-[11px] px-2 h-6">
                            🇩🇴 ES
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>

                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={handleAddFeature}
                        className="cursor-pointer border-dashed border-primary/40 text-primary hover:bg-primary/10"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {t("plans.addFeature")}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {editFeatures.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 border border-dashed border-border/80 rounded-lg text-center bg-muted/20">
                      <div className="p-2.5 rounded-full bg-muted/60 mb-2 text-muted-foreground">
                        <Layers className="size-5" />
                      </div>
                      <p className="text-xs font-semibold text-foreground mb-0.5">{t("plans.noFeatures")}</p>
                      <p className="text-[11px] text-muted-foreground max-w-xs mb-3">{t("plans.noFeaturesHint")}</p>
                      <Button
                        type="button"
                        variant="default"
                        size="xs"
                        onClick={handleAddFeature}
                        className="cursor-pointer"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {t("plans.addFirstFeature") || "Add Feature"}
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
                                  ? "border-primary shadow-sm bg-accent/40 scale-[1.01]"
                                  : "border-border bg-card hover:border-border/80 hover:shadow-xs"
                            }`}
                          >
                            {/* Feature Row Content */}
                            <div className="flex items-center gap-2">
                              {/* Drag Handle */}
                              <div
                                className="cursor-grab active:cursor-grabbing text-muted-foreground/50 group-hover:text-muted-foreground p-0.5"
                                title="Drag to reorder"
                              >
                                <GripVertical className="h-4 w-4" />
                              </div>

                              {/* Included Checkbox */}
                              <HintTooltip
                                label={feat.included ? t("plans.featureIncluded") : t("plans.featureExcluded")}
                              >
                                <div>
                                  <Checkbox
                                    checked={feat.included}
                                    onCheckedChange={(checked) => handleToggleFeatureIncluded(index, checked === true)}
                                    className="size-4 cursor-pointer data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                    aria-label={t("plans.featureIncluded")}
                                  />
                                </div>
                              </HintTooltip>

                              {/* Catalog Select or Custom Input */}
                              <div className="flex-1 min-w-0">
                                {isCustom ? (
                                  <div className="flex items-center gap-1.5">
                                    <Input
                                      size="sm"
                                      value={textVal}
                                      onChange={(e) => handleEditFeatureText(index, featureLangTab, e.target.value)}
                                      placeholder={
                                        featureLangTab === "en_US"
                                          ? t("plans.customFeaturePlaceholderEn") || "Custom feature text in English..."
                                          : t("plans.customFeaturePlaceholderEs") || "Texto personalizado en Español..."
                                      }
                                      className="font-normal text-xs"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="xs"
                                      onClick={() => handleUpdateFeatureCode(index, "HELPDESK_SUPPORT")}
                                      className="text-[10px] text-muted-foreground hover:text-primary shrink-0 cursor-pointer h-7"
                                    >
                                      {t("plans.useCatalog") || "Catalog"}
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <Select
                                      value={feat.code || "CUSTOM_FEATURE"}
                                      onValueChange={(val) => handleUpdateFeatureCode(index, val)}
                                    >
                                      <SelectTrigger size="sm" className="font-medium text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="max-h-72">
                                        {FEATURE_CATALOG.map((cat) => {
                                          const mergedParams = {
                                            ...(cat.defaultParams || {}),
                                            ...(cat.code === feat.code ? feat.params || {} : {}),
                                          };
                                          return (
                                            <SelectItem key={cat.code} value={cat.code} className="text-xs">
                                              {t(cat.labelKey, mergedParams)}
                                            </SelectItem>
                                          );
                                        })}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </div>

                              {/* Actions: Reorder Up/Down & Delete */}
                              <div className="flex items-center gap-0.5 shrink-0">
                                <HintTooltip label={t("plans.moveUp")}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    disabled={index === 0}
                                    onClick={() => handleMoveFeature(index, -1)}
                                    aria-label={t("plans.moveUp")}
                                    className="cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-30"
                                  >
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  </Button>
                                </HintTooltip>
                                <HintTooltip label={t("plans.moveDown")}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    disabled={index === editFeatures.length - 1}
                                    onClick={() => handleMoveFeature(index, 1)}
                                    aria-label={t("plans.moveDown")}
                                    className="cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-30"
                                  >
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  </Button>
                                </HintTooltip>
                                <HintTooltip label={t("plans.deleteFeature")}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    onClick={() => handleDeleteFeature(index)}
                                    aria-label={t("plans.deleteFeature")}
                                    className="text-destructive hover:bg-destructive/10 cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </HintTooltip>
                              </div>
                            </div>

                            {/* Parameter Controls (Flat Chip Pills with Inline Dropdown/Inputs) */}
                            {feat.code && feat.code !== "CUSTOM_FEATURE" && (
                              <div className="ml-7 pl-0.5 pt-2 flex items-center gap-1.5 flex-wrap">
                                {allParamKeys.map((schemaParamKey) => {
                                  const schemaItem = catalogItem?.paramSchema?.find((p) => p.key === schemaParamKey);
                                  const label = schemaItem ? schemaItem.label : schemaParamKey;
                                  const currentVal = feat.params?.[schemaParamKey] ?? schemaItem?.defaultValue ?? "";

                                  return (
                                    <div
                                      key={schemaParamKey}
                                      className="flex items-center gap-1 rounded-md bg-muted/60 border border-border/70 px-1.5 py-0.5 text-xs"
                                    >
                                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground pl-0.5">
                                        {label}:
                                      </span>
                                      {schemaItem?.type === "select" && schemaItem.options ? (
                                        <Select
                                          value={String(currentVal)}
                                          onValueChange={(val) => handleUpdateFeatureParam(index, schemaParamKey, val)}
                                        >
                                          <SelectTrigger size="xs" aria-label={label} className="h-6 text-[11px]">
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
                                          size="xs"
                                          type={schemaItem?.type === "number" ? "number" : "text"}
                                          value={currentVal as string | number}
                                          aria-label={label}
                                          onChange={(e) =>
                                            handleUpdateFeatureParam(
                                              index,
                                              schemaParamKey,
                                              schemaItem?.type === "number"
                                                ? parseFloat(e.target.value) || 0
                                                : e.target.value,
                                            )
                                          }
                                          className="w-16 font-mono text-[11px] h-6 text-foreground"
                                        />
                                      )}
                                      {!schemaKeys.has(schemaParamKey) && (
                                        <HintTooltip label={t("plans.removeParam")}>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-xs"
                                            onClick={() => handleDeleteFeatureParam(index, schemaParamKey)}
                                            aria-label={t("plans.removeParam")}
                                            className="text-destructive hover:bg-destructive/10 cursor-pointer h-5 w-5"
                                          >
                                            <X className="size-2.5" />
                                          </Button>
                                        </HintTooltip>
                                      )}
                                    </div>
                                  );
                                })}

                                <Popover
                                  open={paramDraftIndex === index}
                                  onOpenChange={(open) => (open ? setParamDraftIndex(index) : closeParamPopover())}
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="xs"
                                      className="text-[10px] h-6 px-1.5 text-muted-foreground hover:text-foreground cursor-pointer border-dashed"
                                    >
                                      <Plus className="size-2.5 mr-0.5" />
                                      {t("plans.addCustomParam") || "Param"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-60 p-3 space-y-2 text-xs" align="start">
                                    <p className="text-[11px] font-semibold text-foreground">
                                      {t("plans.newParamTitle") || "Add Parameter"}
                                    </p>
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-muted-foreground">
                                        {t("plans.paramKeyLabel") || "Key"}
                                      </Label>
                                      <Input
                                        size="xs"
                                        placeholder="e.g. limit"
                                        value={paramKey}
                                        onChange={(e) => setParamKey(e.target.value)}
                                        className="h-6 text-xs font-mono"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-muted-foreground">
                                        {t("plans.paramValueLabel") || "Value"}
                                      </Label>
                                      <Input
                                        size="xs"
                                        placeholder="e.g. 50"
                                        value={paramValue}
                                        onChange={(e) => setParamValue(e.target.value)}
                                        className="h-6 text-xs font-mono"
                                      />
                                    </div>
                                    <div className="flex justify-end gap-1.5 pt-1">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="xs"
                                        onClick={closeParamPopover}
                                        className="h-6 text-[10px]"
                                      >
                                        {t("common.cancel")}
                                      </Button>
                                      <Button
                                        type="button"
                                        size="xs"
                                        onClick={submitCustomParam}
                                        className="h-6 text-[10px]"
                                      >
                                        {t("common.add") || "Add"}
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

            {/* Right 4 Columns: Specifications & Live Card Preview */}
            <div className="lg:col-span-4 space-y-6">
              {/* Publishing & Pricing Card */}
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
                      <SlidersHorizontal className="size-3.5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold tracking-tight text-foreground font-heading">
                        {t("plans.generalInfo")}
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        {t("plans.pricingSpecifications") || "Pricing, identifier, and audience tier"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {/* Plan ID */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="plan-id-input"
                      className="text-xs font-semibold text-foreground flex items-center justify-between"
                    >
                      <span>
                        {t("plans.planId")} {isCreateMode && <span className="text-destructive">*</span>}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">Unique Key</span>
                    </Label>
                    <Input
                      id="plan-id-input"
                      size="sm"
                      value={editId}
                      onChange={(e) => {
                        setEditId(e.target.value.toUpperCase());
                        clearFieldError("id");
                      }}
                      disabled={!isCreateMode}
                      placeholder={t("plans.planIdPlaceholder") || "e.g. PL-BASIC"}
                      className={`font-mono text-xs ${fieldErrors.id ? "border-destructive focus-visible:ring-destructive" : ""} ${!isCreateMode ? "bg-muted/50 cursor-not-allowed" : ""}`}
                    />
                    {fieldErrors.id && <p className="text-[11px] font-medium text-destructive">{fieldErrors.id}</p>}
                  </div>

                  {/* Client Type */}
                  <div className="space-y-1.5">
                    <Label htmlFor="plan-client-type" className="text-xs font-semibold text-foreground">
                      {t("plans.clientType")}
                    </Label>
                    <Select value={editClientType} onValueChange={(v) => setEditClientType(v as PlanClientType)}>
                      <SelectTrigger id="plan-client-type" size="sm" className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CLIENT" className="text-xs">
                          {t("plans.clientTypes.standard")}
                        </SelectItem>
                        <SelectItem value="ENTERPRISE" className="text-xs">
                          {t("plans.clientTypes.enterprise")}
                        </SelectItem>
                        <SelectItem value="STUDENT" className="text-xs">
                          {t("plans.clientTypes.student")}
                        </SelectItem>
                        <SelectItem value="OTHER" className="text-xs">
                          {t("plans.clientTypes.other")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Monthly Price */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="plan-price-input"
                      className="text-xs font-semibold text-foreground flex items-center justify-between"
                    >
                      <span>
                        {t("plans.monthlyPriceLabel")} <span className="text-destructive">*</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground">USD / Month</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs">
                        $
                      </span>
                      <Input
                        id="plan-price-input"
                        size="sm"
                        type="number"
                        min="0"
                        step="1"
                        value={editPrice}
                        onChange={(e) => {
                          setEditPrice(parseInt(e.target.value, 10) || 0);
                          clearFieldError("price");
                        }}
                        placeholder="0"
                        className={`pl-6 font-mono text-xs ${fieldErrors.price ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      />
                    </div>
                    {fieldErrors.price && (
                      <p className="text-[11px] font-medium text-destructive">{fieldErrors.price}</p>
                    )}
                  </div>

                  {/* Toggles */}
                  <div className="pt-2 border-t border-border/60 space-y-3">
                    <Label
                      htmlFor="edit-recommended"
                      className="flex items-center justify-between cursor-pointer select-none text-xs font-medium text-foreground py-1"
                    >
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        {t("plans.recommendedPlan") || "Recommended Badge"}
                      </span>
                      <Checkbox
                        id="edit-recommended"
                        checked={editRecommended}
                        onCheckedChange={(checked) => setEditRecommended(checked === true)}
                        className="size-4 cursor-pointer"
                      />
                    </Label>

                    <Label
                      htmlFor="edit-active"
                      className="flex items-center justify-between cursor-pointer select-none text-xs font-medium text-foreground py-1"
                    >
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        {t("plans.activeToggleLabel") || "Active for Subscription"}
                      </span>
                      <Checkbox
                        id="edit-active"
                        checked={editActive}
                        onCheckedChange={(checked) => setEditActive(checked === true)}
                        className="size-4 cursor-pointer"
                      />
                    </Label>
                  </div>
                </CardContent>
              </Card>

              {/* Live Preview Card */}
              <Card className="border-border shadow-xs bg-muted/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
                      <Eye className="size-3.5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold tracking-tight text-foreground font-heading">
                        {t("plans.livePreview") || "Live Card Preview"}
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        {t("plans.livePreviewDesc") || "Real-time appearance in catalog"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <PlanCard
                    plan={previewPlan}
                    selectedPlan={previewPlan.id}
                    billingCycle="monthly"
                    equipmentCount={1}
                    isAdmin={false}
                    activeSubscriptions={[]}
                    onSelect={() => {}}
                    onAdjustEquipmentCount={() => {}}
                    getPlanName={() => previewPlanName}
                    getPlanDescription={() => previewPlanDesc}
                    getFeatureText={previewFeatureText}
                    getTierLabel={(planId) => planId || ""}
                  />
                </CardContent>
              </Card>

              {/* Danger Zone (Edit Mode Only) */}
              {!isCreateMode && (
                <Card className="border-destructive/30 bg-destructive/5 shadow-xs">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs font-bold tracking-tight text-destructive flex items-center gap-1.5">
                      <Trash2 className="size-3.5" />
                      {t("plans.dangerZone") || "Danger Zone"}
                    </CardTitle>
                    <CardDescription className="text-[11px] text-muted-foreground">
                      {t("plans.dangerZoneDesc") || "Irreversible plan removal actions"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setIsDeleteDialogOpen(true)}
                      className="w-full text-xs cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      {t("plans.deletePlan") || "Delete Plan"}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Delete Confirmation Alert Dialog */}
        <DeletePlanAlertDialog
          planName={isDeleteDialogOpen ? previewPlanName || id || "Plan" : null}
          onConfirm={handleDeletePlan}
          onCancel={() => setIsDeleteDialogOpen(false)}
        />
      </Page>
    </TooltipProvider>
  );
}

export default PlanEditorPage;
