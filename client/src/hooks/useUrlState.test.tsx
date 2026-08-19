import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import React from "react";
import { useUrlState } from "./useUrlState";

function wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter initialEntries={["/test?tab=billing&search=wifi&page=2"]}>{children}</MemoryRouter>;
}

describe("useUrlState custom hook", () => {
  it("reads parameters accurately from initial URL", () => {
    const { result } = renderHook(() => useUrlState(), { wrapper });

    expect(result.current.getParam("tab")).toBe("billing");
    expect(result.current.getParam("search")).toBe("wifi");
    expect(result.current.getNumberParam("page", 1)).toBe(2);
    expect(result.current.getParam("nonexistent", "fallback")).toBe("fallback");
  });

  it("updates individual search parameters while preserving others", () => {
    const { result } = renderHook(
      () => {
        const urlState = useUrlState();
        const location = useLocation();
        return { ...urlState, location };
      },
      { wrapper }
    );

    act(() => {
      result.current.setParam("openModal", "pay-invoice");
    });

    expect(result.current.getParam("openModal")).toBe("pay-invoice");
    expect(result.current.getParam("tab")).toBe("billing");
    expect(result.current.location.search).toContain("openModal=pay-invoice");
  });

  it("deletes parameters when value is null or empty string", () => {
    const { result } = renderHook(() => useUrlState(), { wrapper });

    act(() => {
      result.current.setParam("search", null);
    });

    expect(result.current.getParam("search")).toBe("");
  });

  it("sets multiple parameters simultaneously", () => {
    const { result } = renderHook(() => useUrlState(), { wrapper });

    act(() => {
      result.current.setParams({
        tab: "plans",
        openModal: "create-ticket",
        page: null,
      });
    });

    expect(result.current.getParam("tab")).toBe("plans");
    expect(result.current.getParam("openModal")).toBe("create-ticket");
    expect(result.current.getParam("page")).toBe("");
  });

  it("removes specified parameters using removeParams", () => {
    const { result } = renderHook(() => useUrlState(), { wrapper });

    act(() => {
      result.current.removeParams(["tab", "search"]);
    });

    expect(result.current.getParam("tab")).toBe("");
    expect(result.current.getParam("search")).toBe("");
    expect(result.current.getNumberParam("page", 1)).toBe(2);
  });
});
