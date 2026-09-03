import { useUrlState } from "@/hooks/useUrlState";

/**
 * ADR-002: Ephemeral UI modal open/close state for CRM.
 */
export function useCrmModals() {
  const { getParam, setParams } = useUrlState();

  const isNewLeadOpen = getParam("openModal") === "new-lead";

  const openNewLead = () => {
    setParams({ openModal: "new-lead" });
  };

  const closeNewLead = () => {
    setParams({ openModal: "" });
  };

  return {
    isNewLeadOpen,
    openNewLead,
    closeNewLead,
  };
}
