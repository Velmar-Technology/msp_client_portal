import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useInvoices,
  useInvoice,
  useExpenses,
  useFinancialStats,
  useCapturePaypalOrder,
  useMarkInvoicePaid,
  useCancelInvoice,
} from "./useBillingQueries";
import { invoiceService } from "./invoiceService";
import { expenseService } from "@/features/financial";
import { InvoiceStatus } from "@shared/contracts";

vi.mock("./invoiceService", () => ({
  invoiceService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getFinancialStats: vi.fn(),
    capturePaypalOrder: vi.fn(),
    markAsPaid: vi.fn(),
    cancelInvoice: vi.fn(),
  },
}));

vi.mock("@/features/financial", () => ({
  expenseService: {
    getAll: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const mockInvoice = {
  id: "11111111-1111-1111-1111-111111111111",
  invoice_number: "INV-2026-001",
  client_id: "22222222-2222-2222-2222-222222222222",
  amount: 100,
  tax_amount: 18,
  total: 118,
  status: InvoiceStatus.PENDING,
  invoice_date: "2026-09-01",
  due_date: "2026-09-15",
  created_at: "2026-09-01T00:00:00.000Z",
};

describe("useBillingQueries query hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches invoice list and maps pagination", async () => {
    vi.mocked(invoiceService.getAll).mockResolvedValueOnce({
      data: [mockInvoice] as any,
      pagination: { total: 1, totalPages: 1 },
    });

    const { result } = renderHook(() => useInvoices({ page: 1, limit: 10 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.invoices).toHaveLength(1);
    expect(result.current.data?.total).toBe(1);
    expect(invoiceService.getAll).toHaveBeenCalledWith(1, 10);
  });

  it("fetches a single invoice by id", async () => {
    vi.mocked(invoiceService.getById).mockResolvedValueOnce(mockInvoice as any);

    const { result } = renderHook(
      () => useInvoice("11111111-1111-1111-1111-111111111111"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.invoice_number).toBe("INV-2026-001");
  });

  it("does not fetch single invoice when id is missing", async () => {
    const { result } = renderHook(() => useInvoice(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(true);
    expect(invoiceService.getById).not.toHaveBeenCalled();
  });

  it("fetches expense list", async () => {
    vi.mocked(expenseService.getAll).mockResolvedValueOnce({
      data: [],
      pagination: { total: 0, totalPages: 0 },
    });

    const { result } = renderHook(() => useExpenses({ page: 1, limit: 10 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(expenseService.getAll).toHaveBeenCalledWith(1, 10);
  });

  it("fetches financial stats", async () => {
    vi.mocked(invoiceService.getFinancialStats).mockResolvedValueOnce({
      kpis: [],
      monthlyData: [],
      expenseCategories: [],
      transactions: [],
    });

    const { result } = renderHook(() => useFinancialStats("30_days"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoiceService.getFinancialStats).toHaveBeenCalledWith("30_days");
  });

  it("executes capture paypal order mutation", async () => {
    vi.mocked(invoiceService.capturePaypalOrder).mockResolvedValueOnce({
      success: true,
      data: { ...(mockInvoice as any), status: InvoiceStatus.PAID },
    });

    const { result } = renderHook(() => useCapturePaypalOrder(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: "11111111-1111-1111-1111-111111111111",
      orderId: "PAY-123",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoiceService.capturePaypalOrder).toHaveBeenCalledWith(
      "11111111-1111-1111-1111-111111111111",
      "PAY-123"
    );
  });

  it("executes mark invoice paid mutation", async () => {
    vi.mocked(invoiceService.markAsPaid).mockResolvedValueOnce({
      success: true,
      data: { ...(mockInvoice as any), status: InvoiceStatus.PAID },
    });

    const { result } = renderHook(() => useMarkInvoicePaid(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("11111111-1111-1111-1111-111111111111");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoiceService.markAsPaid).toHaveBeenCalledWith("11111111-1111-1111-1111-111111111111");
  });

  it("executes cancel invoice mutation", async () => {
    vi.mocked(invoiceService.cancelInvoice).mockResolvedValueOnce({
      success: true,
      data: { ...(mockInvoice as any), status: InvoiceStatus.CANCELLED },
    });

    const { result } = renderHook(() => useCancelInvoice(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: "11111111-1111-1111-1111-111111111111", reason: "Test" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoiceService.cancelInvoice).toHaveBeenCalledWith(
      "11111111-1111-1111-1111-111111111111",
      "Test"
    );
  });
});
