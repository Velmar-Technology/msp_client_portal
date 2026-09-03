import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CRMPage } from "@/pages/CRMPage/CRMPage";
import { expect, test, vi, beforeEach, describe } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { useCRMStore } from "@/store/useCRMStore";
import { usePlanStore } from "@/store/usePlanStore";
import { useSubscriptionStore } from "@/store/useSubscriptionStore";
import { crmService, type Lead, type CrmPipelineStats, type Quotation, type LeadActivity } from "@/services/crmService";
import type { Invoice } from "@/services/invoiceService";
import { planService, subscriptionService, type Plan, type Subscription } from "@/features/subscriptions";
import { userService } from "@/services/userService";
import type { AuthUser } from "@/store/useAuthStore";
import enTranslations from "@/locales/en_US.json";

const mockT = (key: string, options?: Record<string, string | number>) => {
  const parts = key.split(".");
  let current: unknown = enTranslations;
  for (const part of parts) {
    if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  if (typeof current === "string") {
    if (options && typeof options === "object") {
      let res = current;
      for (const k of Object.keys(options)) {
        res = res.replace(`{{${k}}}`, String(options[k]));
      }
      return res;
    }
    return current;
  }
  return key;
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: {
      language: "en_US",
      changeLanguage: () => Promise.resolve(),
    },
  }),
}));

vi.mock("@/features/subscriptions", () => ({
  planService: {
    getAll: vi.fn(),
  },
  subscriptionService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/services/userService", () => ({
  userService: {
    getClients: vi.fn(),
  },
}));

vi.mock("@/services/crmService", () => ({
  crmService: {
    getLeads: vi.fn(),
    getStats: vi.fn(),
    getUpcomingActivities: vi.fn(),
    getLeadById: vi.fn(),
    createLead: vi.fn(),
    updateLead: vi.fn(),
    updateStage: vi.fn(),
    deleteLead: vi.fn(),
    sendQuotation: vi.fn(),
    resendQuotation: vi.fn(),
    updateQuotationStatus: vi.fn(),
    convertLeadToSubscription: vi.fn(),
    logActivity: vi.fn(),
    updateActivity: vi.fn(),
    deleteActivity: vi.fn(),
    getActivities: vi.fn(),
    getQuotations: vi.fn(),
    modifySubscription: vi.fn(),
    cancelSubscription: vi.fn(),
  },
}));

const mockPlans: Plan[] = [
  {
    id: "STANDARD",
    name: "Standard Support",
    description: "Standard SLA",
    price: 49,
    features: [],
    recommended: true,
    client_type: "CLIENT",
    active: true,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
];

const mockClients: AuthUser[] = [
  {
    id: "client-1",
    email: "alice@corp.com",
    name: "Alice Corp",
    role: "CLIENT",
    language: "en_US",
    tenantId: "tenant-1",
  },
];

const mockLeads: Lead[] = [
  {
    id: "lead-1",
    tenant_id: "tenant-1",
    contact_name: "Bruce Wayne",
    contact_email: "bruce@waynecorp.com",
    contact_phone: "+1 809 555 1234",
    company_name: "Wayne Enterprises",
    stage: "NEW",
    priority: "HIGH",
    expected_revenue: 245.0,
    probability: 60,
    plan_id: "STANDARD",
    plan_name: "Standard Support",
    equipment_count: 5,
    billing_cycle: "monthly",
    assigned_user_id: null,
    assigned_user_name: null,
    client_id: null,
    next_follow_up_date: null,
    created_at: "2026-08-20T10:00:00Z",
    updated_at: "2026-08-20T10:00:00Z",
  },
  {
    id: "lead-2",
    tenant_id: "tenant-1",
    contact_name: "Clark Kent",
    contact_email: "clark@dailyplanet.com",
    contact_phone: null,
    company_name: "Daily Planet",
    stage: "PROPOSITION",
    priority: "MEDIUM",
    expected_revenue: 588.0,
    probability: 80,
    plan_id: "STANDARD",
    plan_name: "Standard Support",
    equipment_count: 1,
    billing_cycle: "annual",
    assigned_user_id: null,
    assigned_user_name: null,
    client_id: null,
    next_follow_up_date: null,
    created_at: "2026-08-20T11:00:00Z",
    updated_at: "2026-08-20T11:00:00Z",
  },
];

const mockStats: CrmPipelineStats = {
  totalLeads: 2,
  pipelineValue: 833.0,
  wonRevenue: 0,
  conversionRate: 0,
  leadsInProposition: 1,
  stageBreakdown: {
    NEW: { count: 1, value: 245.0 },
    QUALIFIED: { count: 0, value: 0 },
    PROPOSITION: { count: 1, value: 588.0 },
    WON: { count: 0, value: 0 },
    LOST: { count: 0, value: 0 },
  },
};

const mockActivities: LeadActivity[] = [
  {
    id: "act-1",
    lead_id: "lead-1",
    tenant_id: "tenant-1",
    activity_type: "CALL",
    title: "Introductory Discovery Call",
    summary: "Client discussed infrastructure coverage",
    due_date: "2026-08-25T14:00:00Z",
    status: "PENDING",
    created_at: "2026-08-20T12:00:00Z",
    lead_contact_name: "Bruce Wayne",
    lead_company_name: "Wayne Enterprises",
  },
];

const mockQuotations: Quotation[] = [
  {
    id: "quote-1",
    quotation_number: "QT-2026-0001",
    tenant_id: "tenant-1",
    lead_id: "lead-1",
    recipient_name: "Bruce Wayne",
    recipient_email: "bruce@waynecorp.com",
    plan_id: "STANDARD",
    plan_name: "Standard Support",
    billing_cycle: "monthly",
    equipment_count: 5,
    subtotal: 245.0,
    tax: 44.1,
    total: 289.1,
    status: "SENT",
    sent_at: "2026-08-20T13:00:00Z",
    created_at: "2026-08-20T13:00:00Z",
  },
];

const mockSubscriptions: Subscription[] = [];

describe("CRMPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(planService.getAll).mockResolvedValue(mockPlans);
    vi.mocked(userService.getClients).mockResolvedValue(mockClients);
    vi.mocked(subscriptionService.getAll).mockResolvedValue(mockSubscriptions);
    vi.mocked(crmService.getLeads).mockResolvedValue({
      leads: mockLeads,
      total: 2,
    });
    vi.mocked(crmService.getStats).mockResolvedValue(mockStats);
    vi.mocked(crmService.getUpcomingActivities).mockResolvedValue(mockActivities);
    vi.mocked(crmService.getLeadById).mockResolvedValue(mockLeads[0]);
    vi.mocked(crmService.getActivities).mockResolvedValue(mockActivities);
    vi.mocked(crmService.getQuotations).mockResolvedValue(mockQuotations);

    usePlanStore.setState({
      plans: mockPlans,
      loading: false,
    });

    useSubscriptionStore.setState({
      clients: mockClients,
      activeSubscriptions: mockSubscriptions,
    });

    useCRMStore.setState({
      leads: mockLeads,
      totalLeads: 2,
      stats: mockStats,
      selectedLead: null,
      leadActivities: [],
      leadQuotations: [],
      upcomingActivities: mockActivities,
      loading: false,
      actionLoading: false,
      viewMode: "table",
      filters: { page: 1, limit: 10 },
    });
  });

  test("renders KPI metric cards and leads in table view", async () => {
    render(
      <MemoryRouter>
        <CRMPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("CRM & Sales Pipeline")).toBeInTheDocument();
    expect(await screen.findByText("Bruce Wayne")).toBeInTheDocument();
    expect(screen.getByText("Wayne Enterprises")).toBeInTheDocument();
    expect(screen.getByText("Clark Kent")).toBeInTheDocument();
  });

  test("switches between Table and Kanban views", async () => {
    render(
      <MemoryRouter>
        <CRMPage />
      </MemoryRouter>,
    );

    const kanbanBtn = screen.getByRole("button", { name: /Kanban/i });
    fireEvent.click(kanbanBtn);

    expect(kanbanBtn).toBeInTheDocument();
  });

  test("opens new lead modal on clicking + New Lead", async () => {
    render(
      <MemoryRouter>
        <CRMPage />
      </MemoryRouter>,
    );

    const newLeadBtn = screen.getByRole("button", { name: /New Lead/i });
    fireEvent.click(newLeadBtn);

    expect(await screen.findByText("Create New Sales Lead")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. John Doe")).toBeInTheDocument();
  });

  test("opens lead detail sheet when clicking on a lead row", async () => {
    render(
      <MemoryRouter>
        <CRMPage />
      </MemoryRouter>,
    );

    const openBtns = await screen.findAllByRole("button", { name: /Open/i });
    fireEvent.click(openBtns[0]);

    await waitFor(() => {
      expect(useCRMStore.getState().selectedLead?.contact_name).toBe("Bruce Wayne");
    });
  });

  test("renders due follow-ups card from GET /crm/activities", async () => {
    render(
      <MemoryRouter>
        <CRMPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Due Follow-ups & Scheduled Activities")).toBeInTheDocument();
    expect(screen.getByText("Introductory Discovery Call")).toBeInTheDocument();
  });

  test("renders quotation in detail sheet and triggers accept status update", async () => {
    useCRMStore.setState({
      selectedLead: mockLeads[0],
      leadQuotations: mockQuotations,
    });

    render(
      <MemoryRouter initialEntries={["/crm?lead=lead-1"]}>
        <CRMPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("QT-2026-0001")).toBeInTheDocument();
    expect(screen.getByText("Sent")).toBeInTheDocument();

    const acceptBtn = screen.getByRole("button", { name: /Accept Quote/i });
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(crmService.updateQuotationStatus).toHaveBeenCalledWith("quote-1", "ACCEPTED");
    });
  });

  test("allows editing lead info from detail sheet and submits update", async () => {
    (crmService.updateLead as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockLeads[0],
      contact_name: "Bruce Updated",
      company_name: "Wayne Industries Global",
      expected_revenue: 1500,
    });

    useCRMStore.setState({
      selectedLead: mockLeads[0],
    });

    render(
      <MemoryRouter initialEntries={["/crm?lead=lead-1"]}>
        <CRMPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Bruce Wayne")).toBeInTheDocument();

    const editBtn = screen.getByRole("button", { name: /Edit Details/i });
    fireEvent.click(editBtn);

    const nameInput = screen.getByDisplayValue("Bruce Wayne");
    fireEvent.change(nameInput, { target: { value: "Bruce Updated" } });

    const companyInput = screen.getByDisplayValue("Wayne Enterprises");
    fireEvent.change(companyInput, { target: { value: "Wayne Industries Global" } });

    const saveBtn = screen.getByRole("button", { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(crmService.updateLead).toHaveBeenCalledWith("lead-1", expect.objectContaining({
        contactName: "Bruce Updated",
        companyName: "Wayne Industries Global",
      }));
    });
  });

  test("converts lead to subscription and navigates to billing with invoice", async () => {
    const convertedInvoice: Invoice = {
      id: "inv-101",
      invoice_number: "INV-2026-0001",
      client_id: "client-1",
      amount: 147.0,
      tax_amount: 26.46,
      total: 173.46,
      status: "PENDING",
      due_date: "2026-09-01",
      invoice_date: "2026-08-21",
      created_at: "2026-08-21",
      line_items: [],
    };
    vi.mocked(crmService.getLeadById).mockResolvedValue({ ...mockLeads[0], stage: "WON" });
    vi.mocked(crmService.convertLeadToSubscription).mockResolvedValue({
      lead: { ...mockLeads[0], stage: "WON" },
      subscription: { id: "sub-1", status: "ACTIVE", plan: "STANDARD", equipment_count: 3 },
      invoice: convertedInvoice,
      clientCreated: true,
    });

    useCRMStore.setState({
      selectedLead: { ...mockLeads[0], stage: "WON" },
    });

    render(
      <MemoryRouter initialEntries={["/crm?lead=lead-1"]}>
        <CRMPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Bruce Wayne")).toBeInTheDocument();

    // Click subscription tab
    const subTab = screen.getByRole("tab", { name: /Subscribe/i });
    fireEvent.pointerDown(subTab, { button: 0 });
    fireEvent.mouseDown(subTab, { button: 0 });
    fireEvent.click(subTab);

    // Click convert button
    const convertBtn = await screen.findByRole("button", { name: /Activate Subscription/i });
    expect(convertBtn).not.toBeDisabled();
    fireEvent.click(convertBtn);

    await waitFor(() => {
      expect(crmService.convertLeadToSubscription).toHaveBeenCalledWith("lead-1", expect.objectContaining({
        planId: "STANDARD",
      }));
    });
  }, 15000);

  test("disables subscription activation button if lead is not in WON stage", async () => {
    vi.mocked(crmService.getLeadById).mockResolvedValue({ ...mockLeads[0], stage: "NEW" });

    useCRMStore.setState({
      selectedLead: { ...mockLeads[0], stage: "NEW" },
    });

    render(
      <MemoryRouter initialEntries={["/crm?lead=lead-1"]}>
        <CRMPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Bruce Wayne")).toBeInTheDocument();

    // Click subscription tab
    const subTab = screen.getByRole("tab", { name: /Subscribe/i });
    fireEvent.pointerDown(subTab, { button: 0 });
    fireEvent.mouseDown(subTab, { button: 0 });
    fireEvent.click(subTab);

    // Verify convert button is disabled
    const convertBtn = await screen.findByRole("button", { name: /Activate Subscription/i });
    expect(convertBtn).toBeDisabled();
  });

  test("allows deleting a lead from detail sheet with confirmation", async () => {
    vi.mocked(crmService.deleteLead).mockResolvedValue(undefined);

    useCRMStore.setState({
      selectedLead: mockLeads[0],
    });

    render(
      <MemoryRouter initialEntries={["/crm?lead=lead-1"]}>
        <CRMPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Bruce Wayne")).toBeInTheDocument();

    const deleteBtn = await screen.findByRole("button", { name: /Delete \/ Archive/i });
    fireEvent.click(deleteBtn);

    expect(screen.getByText("Delete Opportunity?")).toBeInTheDocument();

    const confirmDeleteBtn = screen.getByRole("button", { name: /^Delete$/i });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(crmService.deleteLead).toHaveBeenCalledWith("lead-1");
    });
  });

  test("allows editing a follow-up activity from detail sheet", async () => {
    vi.mocked(crmService.updateActivity).mockResolvedValue({
      ...mockActivities[0],
      title: "Updated Discovery Call",
      summary: "Updated discovery notes",
    });

    useCRMStore.setState({
      selectedLead: mockLeads[0],
      leadActivities: mockActivities,
    });

    render(
      <MemoryRouter initialEntries={["/crm?lead=lead-1"]}>
        <CRMPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Bruce Wayne")).toBeInTheDocument();

    // Click follow-up tab
    const followUpTab = screen.getByRole("tab", { name: /Follow-up/i });
    fireEvent.pointerDown(followUpTab, { button: 0 });
    fireEvent.mouseDown(followUpTab, { button: 0 });
    fireEvent.click(followUpTab);

    // Find and click the edit button for the follow-up
    const editBtn = await screen.findByTitle(/Edit/i);
    fireEvent.click(editBtn);

    // Modal should be open
    expect(await screen.findByText("Edit Follow-up / Activity")).toBeInTheDocument();

    const titleInput = screen.getByDisplayValue("Introductory Discovery Call");
    fireEvent.change(titleInput, { target: { value: "Updated Discovery Call" } });

    const saveBtn = screen.getByRole("button", { name: /^Save/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(crmService.updateActivity).toHaveBeenCalledWith(
        "act-1",
        expect.objectContaining({
          title: "Updated Discovery Call",
        }),
      );
    });
  });

  test("allows deleting a follow-up activity from detail sheet with confirmation", async () => {
    vi.mocked(crmService.deleteActivity).mockResolvedValue(undefined);

    useCRMStore.setState({
      selectedLead: mockLeads[0],
      leadActivities: mockActivities,
    });

    render(
      <MemoryRouter initialEntries={["/crm?lead=lead-1"]}>
        <CRMPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Bruce Wayne")).toBeInTheDocument();

    // Click follow-up tab
    const followUpTab = screen.getByRole("tab", { name: /Follow-up/i });
    fireEvent.pointerDown(followUpTab, { button: 0 });
    fireEvent.mouseDown(followUpTab, { button: 0 });
    fireEvent.click(followUpTab);

    // Find and click the delete button for the follow-up
    const deleteBtn = await screen.findByTitle(/Delete/i);
    fireEvent.click(deleteBtn);

    // Confirmation dialog should be visible
    expect(await screen.findByText("Delete Follow-up Activity?")).toBeInTheDocument();

    const confirmDeleteBtn = screen.getByRole("button", { name: /^Delete$/i });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(crmService.deleteActivity).toHaveBeenCalledWith("act-1");
    });
  });
});


