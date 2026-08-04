import { describe, test, expect } from "vitest";
import {
  normalizePlan,
  filterResourcesByPlan,
  filterResourcesByOs,
  RESOURCE_CATALOG,
  PLAN_TIERS,
  type PlanTier,
} from "@/lib/resourceCatalog";

describe("normalizePlan", () => {
  test("returns null for empty or missing plans", () => {
    expect(normalizePlan(null)).toBeNull();
    expect(normalizePlan(undefined)).toBeNull();
    expect(normalizePlan("")).toBeNull();
  });

  test("passes through canonical tier ids case-insensitively", () => {
    expect(normalizePlan("PL-001")).toBe("PL-001");
    expect(normalizePlan("pl-002")).toBe("PL-002");
    expect(normalizePlan("Pl-003")).toBe("PL-003");
  });

  test("maps legacy plan names to tier ids", () => {
    expect(normalizePlan("BASIC")).toBe("PL-001");
    expect(normalizePlan("STANDARD")).toBe("PL-002");
    expect(normalizePlan("PREMIUM")).toBe("PL-003");
    expect(normalizePlan("ADVANCED")).toBe("PL-003");
  });

  test("returns null for unknown plans", () => {
    expect(normalizePlan("ENTERPRISE")).toBeNull();
  });
});

describe("filterResourcesByPlan", () => {
  test("returns the full catalog when showAll is true", () => {
    expect(filterResourcesByPlan(RESOURCE_CATALOG, ["PL-001"], true)).toHaveLength(RESOURCE_CATALOG.length);
  });

  test("returns the full catalog when planIds is empty", () => {
    expect(filterResourcesByPlan(RESOURCE_CATALOG, [])).toHaveLength(RESOURCE_CATALOG.length);
  });

  test("includes only resources for the requested tier", () => {
    const basic = filterResourcesByPlan(RESOURCE_CATALOG, ["PL-001"]);
    expect(basic.length).toBeGreaterThan(0);
    for (const resource of basic) {
      expect(resource.plans).toContain<PlanTier>("PL-001");
    }
  });

  test("basic tier does not include premium-only resources", () => {
    const basicIds = filterResourcesByPlan(RESOURCE_CATALOG, ["PL-001"]).map((r) => r.id);
    expect(basicIds).not.toContain("network-manual");
    expect(basicIds).not.toContain("security-whitepaper");
    expect(basicIds).toContain("basic-handbook");
  });

  test("standard tier includes standard resources but not premium-only ones", () => {
    const standardIds = filterResourcesByPlan(RESOURCE_CATALOG, ["PL-002"]).map((r) => r.id);
    expect(standardIds).toContain("monitoring-guide");
    expect(standardIds).toContain("maintenance-guide");
    expect(standardIds).not.toContain("security-whitepaper");
  });

  test("advanced tier includes premium-only resources", () => {
    const advancedIds = filterResourcesByPlan(RESOURCE_CATALOG, ["PL-003"]).map((r) => r.id);
    expect(advancedIds).toContain("network-manual");
    expect(advancedIds).toContain("security-whitepaper");
    expect(advancedIds).not.toContain("basic-handbook");
  });

  test("supports multiple tiers at once", () => {
    const ids = filterResourcesByPlan(RESOURCE_CATALOG, ["PL-001", "PL-002"]).map((r) => r.id);
    expect(ids).toContain("basic-handbook");
    expect(ids).toContain("maintenance-guide");
    expect(ids).not.toContain("security-whitepaper");
    expect(ids).not.toContain("network-manual");
  });
});

describe("filterResourcesByOs", () => {
  test("returns all resources when osFilter is ALL", () => {
    expect(filterResourcesByOs(RESOURCE_CATALOG, "ALL")).toHaveLength(RESOURCE_CATALOG.length);
  });

  test("filters Windows-specific software while keeping cross-platform items", () => {
    const winResources = filterResourcesByOs(RESOURCE_CATALOG, "windows");
    const ids = winResources.map((r) => r.id);
    expect(ids).toContain("agent-win");
    expect(ids).not.toContain("agent-macos");
    expect(ids).not.toContain("agent-linux");
    expect(ids).toContain("quickstart");
  });

  test("filters macOS-specific software while keeping cross-platform items", () => {
    const macResources = filterResourcesByOs(RESOURCE_CATALOG, "macos");
    const ids = macResources.map((r) => r.id);
    expect(ids).toContain("agent-macos");
    expect(ids).not.toContain("agent-win");
    expect(ids).not.toContain("agent-linux");
  });

  test("filters Linux-specific software while keeping cross-platform items", () => {
    const linuxResources = filterResourcesByOs(RESOURCE_CATALOG, "linux");
    const ids = linuxResources.map((r) => r.id);
    expect(ids).toContain("agent-linux");
    expect(ids).not.toContain("agent-win");
    expect(ids).not.toContain("agent-macos");
  });
});

describe("RESOURCE_CATALOG integrity", () => {
  test("every resource references a valid plan tier and category", () => {
    for (const resource of RESOURCE_CATALOG) {
      for (const plan of resource.plans) {
        expect(PLAN_TIERS).toContain(plan);
      }
      expect(["software", "manual", "guide", "document"]).toContain(resource.category);
    }
  });

  test("resource ids are unique", () => {
    const ids = RESOURCE_CATALOG.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
