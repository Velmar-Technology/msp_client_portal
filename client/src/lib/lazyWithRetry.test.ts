import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { lazyWithRetry, preloadOnIdle } from "./lazyWithRetry";

describe("lazyWithRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("loads component successfully on first attempt", async () => {
    const MockComponent = () => null;
    const factory = vi.fn().mockResolvedValue({ default: MockComponent });

    const LazyComp = lazyWithRetry(factory);
    const result = await LazyComp.preload();

    expect(factory).toHaveBeenCalledTimes(1);
    expect(result.default).toBe(MockComponent);
  });

  it("retries on failure and resolves when subsequent attempt succeeds", async () => {
    const MockComponent = () => null;
    const factory = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network glitch"))
      .mockResolvedValueOnce({ default: MockComponent });

    const LazyComp = lazyWithRetry(factory, { initialDelayMs: 100 });

    const preloadPromise = LazyComp.preload();

    // Advance timer for the first retry backoff
    await vi.advanceTimersByTimeAsync(150);

    const result = await preloadPromise;

    expect(factory).toHaveBeenCalledTimes(2);
    expect(result.default).toBe(MockComponent);
  });

  it("throws after exhausting maxRetries", async () => {
    const factory = vi.fn().mockRejectedValue(new Error("Persistent error"));

    const LazyComp = lazyWithRetry(factory, { maxRetries: 2, initialDelayMs: 50, autoReloadOnDeployMismatch: false });

    const preloadPromise = LazyComp.preload();

    // Advance across retries
    await vi.advanceTimersByTimeAsync(50);
    await vi.advanceTimersByTimeAsync(100);

    await expect(preloadPromise).rejects.toThrow("Persistent error");
    expect(factory).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it("caches successful preload promise for subsequent calls", async () => {
    const MockComponent = () => null;
    const factory = vi.fn().mockResolvedValue({ default: MockComponent });

    const LazyComp = lazyWithRetry(factory);

    const res1 = await LazyComp.preload();
    const res2 = await LazyComp.preload();

    expect(factory).toHaveBeenCalledTimes(1);
    expect(res1).toBe(res2);
  });
});

describe("preloadOnIdle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("triggers preloading during idle / fallback timer", () => {
    const preloader1 = vi.fn().mockResolvedValue({});
    const preloader2 = vi.fn().mockResolvedValue({});

    preloadOnIdle([preloader1, preloader2], 1000);

    vi.advanceTimersByTime(250);

    expect(preloader1).toHaveBeenCalled();
    expect(preloader2).toHaveBeenCalled();
  });
});
