import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { subscriptionService } from "@/services/subscriptionService";
import { toast } from "sonner";
import {
  RESOURCE_CATALOG,
  PLAN_OPTIONS,
  filterResourcesByPlan,
  normalizePlan,
  triggerResourceDownload,
  type PlanTier,
  type ResourceItem,
} from "@/lib/resourceCatalog";

export type PlanFilter = PlanTier | "ALL";

export function useResourcesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<PlanFilter>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPlanContext() {
      setLoading(true);
      try {
        if (isAdmin || user?.role !== "CLIENT") {
          if (isMounted) setSelectedPlan("ALL");
          return;
        }
        const subs = await subscriptionService.getAll();
        if (!isMounted) return;
        const active = subs.filter((sub) => sub.status === "ACTIVE" || sub.status === "EXPIRING");
        const tier = active
          .map((sub) => normalizePlan(sub.plan))
          .find((plan): plan is PlanTier => plan !== null);
        setSelectedPlan(tier || "ALL");
      } catch (err) {
        console.error("Failed to load subscription context for resources page", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPlanContext();

    return () => {
      isMounted = false;
    };
  }, [isAdmin, user?.role]);

  const planFilterOptions = useMemo(() => {
    const options: { value: PlanFilter; label: string }[] = [
      { value: "ALL", label: t("resources.allPlans") },
      ...PLAN_OPTIONS.map((opt) => ({ value: opt.value, label: t(opt.labelKey) })),
    ];
    return options;
  }, [t]);

  const filteredResources = useMemo(() => {
    const showAll = selectedPlan === "ALL";
    const planIds: PlanTier[] = showAll ? [] : [selectedPlan];
    const byPlan = filterResourcesByPlan(RESOURCE_CATALOG, planIds, showAll);

    const query = searchTerm.trim().toLowerCase();
    if (!query) return byPlan;

    return byPlan.filter((resource) => {
      const title = t(resource.titleKey).toLowerCase();
      const description = t(resource.descriptionKey).toLowerCase();
      return (
        title.includes(query) ||
        description.includes(query) ||
        resource.fileName.toLowerCase().includes(query)
      );
    });
  }, [selectedPlan, searchTerm, t]);

  const handleDownload = useCallback(
    (item: ResourceItem) => {
      triggerResourceDownload(item);
      toast.success(t("resources.downloadStartedTitle") || "Download Started", {
        description:
          t("resources.downloadStartedDesc", { fileName: item.fileName }) || `Downloading ${item.fileName}`,
      });
    },
    [t]
  );

  return {
    t,
    isAdmin,
    loading,
    selectedPlan,
    setSelectedPlan,
    planFilterOptions,
    searchTerm,
    setSearchTerm,
    filteredResources,
    handleDownload,
  };
}
