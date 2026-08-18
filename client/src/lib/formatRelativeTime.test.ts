import { describe, it, expect } from "vitest";
import { formatRelativeTime } from "./formatRelativeTime";

describe("formatRelativeTime", () => {
  it("formats seconds in the past for English", () => {
    const pastDate = new Date(Date.now() - 10 * 1000).toISOString();
    const result = formatRelativeTime(pastDate, "en-US");
    expect(result).toMatch(/\d+\s*(sec|seconds|s)|now/i);
  });

  it("formats minutes in the past for Spanish", () => {
    const pastDate = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const result = formatRelativeTime(pastDate, "es_DO");
    expect(result).toMatch(/hace 15/i);
  });

  it("formats hours in the past for English", () => {
    const pastDate = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    const result = formatRelativeTime(pastDate, "en_US");
    expect(result).toMatch(/3 hr|3 hours|3h/i);
  });

  it("formats days in the past (yesterday/ayer)", () => {
    const pastDate = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const resultEn = formatRelativeTime(pastDate, "en_US");
    const resultEs = formatRelativeTime(pastDate, "es_DO");
    expect(resultEn).toMatch(/yesterday|1 day|1d/i);
    expect(resultEs).toMatch(/ayer|1 d/i);
  });

  it("handles invalid dates gracefully", () => {
    const result = formatRelativeTime("invalid-date", "en_US");
    expect(result).toBe("invalid-date");
  });
});
