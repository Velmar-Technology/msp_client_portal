import { useUrlState } from "@/hooks/useUrlState";
import { CRM_VALID_STAGES, CRM_VALID_PRIORITIES } from "@/constants/crm";
import type { CrmViewMode } from "../types";

/**
 * ADR-002: URL State Synchronization for CRM navigation, pipeline stage, view mode, and search filtering.
 */
export function useCrmFilters() {
  const { getParam, setParams } = useUrlState();

  const viewMode: CrmViewMode = getParam("view") === "kanban" ? "kanban" : "table";
  const search = getParam("search") || "";
  const stage = (CRM_VALID_STAGES as readonly string[]).includes(getParam("stage")) ? getParam("stage") : "";
  const priority = (CRM_VALID_PRIORITIES as readonly string[]).includes(getParam("priority")) ? getParam("priority") : "";
  const page = Math.max(1, parseInt(getParam("page", "1"), 10) || 1);
  const leadId = getParam("lead") || null;

  const setViewMode = (mode: CrmViewMode) => {
    setParams({ view: mode === "kanban" ? "kanban" : "" });
  };

  const setSearch = (newSearch: string) => {
    setParams({ search: newSearch, page: "1" });
  };

  const setStage = (newStage: string) => {
    setParams({ stage: newStage, page: "1" });
  };

  const setPriority = (newPriority: string) => {
    setParams({ priority: newPriority, page: "1" });
  };

  const setPage = (newPage: number) => {
    setParams({ page: String(newPage) });
  };

  const setLeadId = (id: string | null) => {
    setParams({ lead: id ?? "" });
  };

  return {
    viewMode,
    search,
    stage,
    priority,
    page,
    leadId,
    setViewMode,
    setSearch,
    setStage,
    setPriority,
    setPage,
    setLeadId,
  };
}
