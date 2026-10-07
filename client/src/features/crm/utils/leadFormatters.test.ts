import { describe, it, expect } from "vitest";
import {
  CLIENT_TYPE_STYLES,
  getClientTypeBadgeClass,
  getClientTypeBadgeLabel,
  getPlanDisplayName,
} from "./leadFormatters";
import type { Lead } from "../api/crmService";
import type { Plan } from "@/features/subscriptions";

describe("leadFormatters", () => {
  describe("getClientTypeBadgeClass", () => {
    it("returns emerald styles for EDUCATOR", () => {
      expect(getClientTypeBadgeClass("EDUCATOR")).toContain("bg-emerald-500/10");
      expect(getClientTypeBadgeClass("EDUCATOR")).toContain("text-emerald-600");
    });

    it("returns blue styles for ENTERPRISE", () => {
      expect(getClientTypeBadgeClass("ENTERPRISE")).toContain("bg-blue-500/10");
      expect(getClientTypeBadgeClass("ENTERPRISE")).toContain("text-blue-600");
    });

    it("returns purple styles for STUDENT", () => {
      expect(getClientTypeBadgeClass("STUDENT")).toContain("bg-purple-500/10");
      expect(getClientTypeBadgeClass("STUDENT")).toContain("text-purple-600");
    });

    it("returns zinc styles for OTHER", () => {
      expect(getClientTypeBadgeClass("OTHER")).toContain("bg-zinc-500/10");
      expect(getClientTypeBadgeClass("OTHER")).toContain("text-zinc-600");
    });

    it("returns muted fallback for unknown or null types", () => {
      expect(getClientTypeBadgeClass(null)).toContain("bg-muted");
      expect(getClientTypeBadgeClass("UNKNOWN")).toContain("bg-muted");
    });
  });

  describe("getClientTypeBadgeLabel", () => {
    it("returns translated string when t handles key", () => {
      const mockT = (key: string, fallback: string) => {
        if (key === "crm.clientTypeBadges.EDUCATOR") return "DOCENTE";
        return fallback;
      };
      expect(getClientTypeBadgeLabel("EDUCATOR", mockT)).toBe("DOCENTE");
    });

    it("returns empty string when type is null or undefined", () => {
      const mockT = (_: string, fallback: string) => fallback;
      expect(getClientTypeBadgeLabel(undefined, mockT)).toBe("");
      expect(getClientTypeBadgeLabel(null, mockT)).toBe("");
    });
  });

  describe("getPlanDisplayName", () => {
    const mockLead: Lead = {
      id: "lead-1",
      tenant_id: "tenant-1",
      contact_name: "Jane Doe",
      contact_email: "jane@school.edu",
      stage: "NEW",
      billing_cycle: "monthly",
      equipment_count: 5,
      expected_revenue: 35.4,
      probability: 20,
      priority: "HIGH",
      plan_id: "PL-005",
      plan_name: "Education & Faculty Suite",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockPlans: Plan[] = [
      {
        id: "PL-005",
        name: {
          en_US: "Education & Faculty Suite",
          es_DO: "Suite Educativa y Docente",
        },
        description: null,
        price: 5.9,
        features: [],
        recommended: false,
        client_type: "EDUCATOR",
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    it("resolves Spanish plan name when isSpanish is true", () => {
      expect(getPlanDisplayName(mockLead, mockPlans, true)).toBe("Suite Educativa y Docente");
    });

    it("resolves English plan name when isSpanish is false", () => {
      expect(getPlanDisplayName(mockLead, mockPlans, false)).toBe("Education & Faculty Suite");
    });

    it("falls back to lead.plan_name when plans list is not provided or plan not found", () => {
      expect(getPlanDisplayName(mockLead, [], false)).toBe("Education & Faculty Suite");
      expect(getPlanDisplayName(mockLead, null, false)).toBe("Education & Faculty Suite");
    });

    it("falls back to simple string if plan.name is a string", () => {
      const stringPlanList: Plan[] = [
        {
          ...mockPlans[0],
          name: "Direct String Name",
        },
      ];
      expect(getPlanDisplayName(mockLead, stringPlanList, true)).toBe("Direct String Name");
    });
  });
});
