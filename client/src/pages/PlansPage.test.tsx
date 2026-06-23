import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlansPage } from './PlansPage';
import { expect, test, vi, beforeEach, describe } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { userService } from '@/services/userService';
import { subscriptionService } from '@/services/subscriptionService';
import { useAuth } from '@/hooks/useAuth';
import { usePlanStore } from '@/store/usePlanStore';

let mockLanguage = 'en_US';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      get language() {
        return mockLanguage;
      },
      changeLanguage: (lng: string) => {
        mockLanguage = lng;
        return Promise.resolve();
      },
    },
  }),
}));

const mockAddToast = vi.fn();
vi.mock('../store/useNotificationStore', () => ({
  useNotificationStore: () => ({
    addToast: mockAddToast,
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/store/usePlanStore', () => ({
  usePlanStore: vi.fn(),
}));

vi.mock('@/services/userService', () => ({
  userService: {
    getClients: vi.fn(),
  },
}));

vi.mock('@/services/subscriptionService', () => ({
  subscriptionService: {
    create: vi.fn(),
    getAll: vi.fn().mockResolvedValue([]),
    update: vi.fn(),
    sendQuote: vi.fn(),
  },
}));

const mockPlans = [
  {
    id: 'BASIC',
    name: { en_US: 'Basic Support', es_DO: 'Soporte Básico' },
    description: { en_US: 'Basic plan description', es_DO: 'Descripción del plan básico' },
    price: 199,
    features: [{ text: { en_US: 'Email support', es_DO: 'Soporte por correo' }, included: true }],
    recommended: false,
    created_at: '2026-06-22',
    updated_at: '2026-06-22',
  },
  {
    id: 'STANDARD',
    name: { en_US: 'Standard Support', es_DO: 'Soporte Estándar' },
    description: { en_US: 'Standard plan description', es_DO: 'Descripción del plan estándar' },
    price: 499,
    features: [{ text: { en_US: '24/7 Phone support', es_DO: 'Soporte telefónico 24/7' }, included: true }],
    recommended: true,
    created_at: '2026-06-22',
    updated_at: '2026-06-22',
  },
];

const mockClients = [
  { id: 'client-1', name: 'Alice Customer', email: 'alice@example.com' },
  { id: 'client-2', name: 'Bob Customer', email: 'bob@example.com' },
];

describe('PlansPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default usePlanStore mock implementation
    vi.mocked(usePlanStore).mockReturnValue({
      plans: mockPlans,
      loading: false,
      error: null,
      fetchPlans: vi.fn().mockResolvedValue(undefined),
      updatePlan: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof usePlanStore>);
  });

  describe('Client Flow', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-client', role: 'CLIENT', name: 'John Doe', email: 'john@example.com', tenantId: 'tenant-1' },
        isAuthenticated: true,
      } as unknown as ReturnType<typeof useAuth>);
      vi.mocked(subscriptionService.getAll).mockResolvedValue([]);
    });

    test('renders plans and payment method for Client', async () => {
      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Basic Support')).toBeInTheDocument();
      expect(screen.getByText('Standard Support')).toBeInTheDocument();
      expect(screen.getByText('plans.paymentMethod')).toBeInTheDocument();
      expect(screen.queryByText('Apply Plan to Customer')).not.toBeInTheDocument();
    });

    test('submits client subscription on Process Payment click', async () => {
      vi.mocked(subscriptionService.create).mockResolvedValue({ id: 'sub-new' } as unknown as Awaited<ReturnType<typeof subscriptionService.create>>);
      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      // Select Standard Support
      const selectButton = screen.getByText('plans.selected: Standard Support');
      expect(selectButton).toBeInTheDocument();

      const payButton = screen.getByText('plans.processPayment');
      fireEvent.click(payButton);

      await waitFor(() => {
        expect(subscriptionService.create).toHaveBeenCalledWith({
          serviceName: 'Standard Support',
          plan: 'STANDARD',
          equipmentCount: 1,
          clientId: undefined,
          billingCycle: 'monthly',
        });
        expect(mockAddToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Subscribed Successfully',
            type: 'success',
          })
        );
      });
    });

    test('updates pricing and calculations when toggling to Annually', async () => {
      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      // Verify default monthly pricing for Standard Support card
      expect(screen.getByText('$499')).toBeInTheDocument();

      // Click Annually button
      const annualButton = screen.getByRole('button', { name: /Annually/i });
      fireEvent.click(annualButton);

      // Verify discounted monthly equivalent price on Standard Support card
      expect(screen.getByText('$399.20')).toBeInTheDocument();
      expect(screen.getByText('Billed annually as $4790.40/yr')).toBeInTheDocument();

      // Open Order Summary Sheet
      const viewSummaryButton = screen.getByRole('button', { name: /View Order Summary/i });
      fireEvent.click(viewSummaryButton);

      // Verify Order Summary subtotal, tax, and total
      // subtotal = 499 * 12 * 0.8 = 4790.40
      // tax = 4790.40 * 0.18 = 862.27
      // total = 4790.40 + 862.27 = 5652.67
      expect(screen.getByText('$4790.40')).toBeInTheDocument();
      expect(screen.getByText('$862.27')).toBeInTheDocument();
      expect(screen.getByText('$5652.67')).toBeInTheDocument();
    });

    test('submits client subscription with billingCycle = annual when toggled', async () => {
      vi.mocked(subscriptionService.create).mockResolvedValue({ id: 'sub-new' } as unknown as Awaited<ReturnType<typeof subscriptionService.create>>);
      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      // Toggle to Annually
      const annualButton = screen.getByRole('button', { name: /Annually/i });
      fireEvent.click(annualButton);

      const payButton = screen.getByText('plans.processPayment');
      fireEvent.click(payButton);

      await waitFor(() => {
        expect(subscriptionService.create).toHaveBeenCalledWith({
          serviceName: 'Standard Support',
          plan: 'STANDARD',
          equipmentCount: 1,
          clientId: undefined,
          billingCycle: 'annual',
        });
      });
    });

    test('renders Active badge and Cancel button when active subscription is present', async () => {
      const activeSub = {
        id: 'sub-active',
        client_id: 'user-client',
        service_name: 'Standard Support',
        plan: 'STANDARD' as const,
        status: 'ACTIVE' as const,
        renewal_date: '2026-07-22T00:00:00.000Z',
        equipment_count: 1,
        tenant_id: 'tenant-1',
        created_at: '2026-06-22',
        updated_at: '2026-06-22',
      };
      vi.mocked(subscriptionService.getAll).mockResolvedValue([activeSub]);

      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('Manage Active Subscription')).toBeInTheDocument();
        expect(screen.getByText('Cancel Subscription')).toBeInTheDocument();
      });
    });

    test('submits cancellation update on Cancel click', async () => {
      const activeSub = {
        id: 'sub-active',
        client_id: 'user-client',
        service_name: 'Standard Support',
        plan: 'STANDARD' as const,
        status: 'ACTIVE' as const,
        renewal_date: '2026-07-22T00:00:00.000Z',
        equipment_count: 1,
        tenant_id: 'tenant-1',
        created_at: '2026-06-22',
        updated_at: '2026-06-22',
      };
      vi.mocked(subscriptionService.getAll).mockResolvedValue([activeSub]);
      vi.mocked(subscriptionService.update).mockResolvedValue({ ...activeSub, status: 'CANCELLED' });

      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Cancel Subscription')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Cancel Subscription'));

      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalled();
        expect(subscriptionService.update).toHaveBeenCalledWith('sub-active', {
          status: 'CANCELLED',
        });
      });
    });

    test('renders modification panel and submits updates on different plan select', async () => {
      const activeSub = {
        id: 'sub-active',
        client_id: 'user-client',
        service_name: 'Standard Support',
        plan: 'STANDARD' as const,
        status: 'ACTIVE' as const,
        renewal_date: '2026-07-22T00:00:00.000Z',
        equipment_count: 1,
        tenant_id: 'tenant-1',
        created_at: '2026-06-22',
        updated_at: '2026-06-22',
      };
      vi.mocked(subscriptionService.getAll).mockResolvedValue([activeSub]);
      vi.mocked(subscriptionService.update).mockResolvedValue({ ...activeSub, plan: 'BASIC' });

      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
      });

      // Select Basic Support card
      fireEvent.click(screen.getByText('plans.select Basic Support'));

      await waitFor(() => {
        expect(screen.getByText('Subscription Modification')).toBeInTheDocument();
        expect(screen.getByText('Update Subscription')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Update Subscription'));

      await waitFor(() => {
        expect(subscriptionService.update).toHaveBeenCalledWith('sub-active', {
          plan: 'BASIC',
          equipmentCount: 1,
        });
      });
    });

    test('sends quotation via email on Email Quotation click', async () => {
      vi.mocked(subscriptionService.sendQuote).mockResolvedValue({ success: true, message: 'Sent' });
      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      // Open the sheet
      const viewSummaryButton = screen.getByRole('button', { name: /View Order Summary/i });
      fireEvent.click(viewSummaryButton);

      const quoteButton = screen.getByText('plans.emailQuote');
      expect(quoteButton).toBeInTheDocument();

      fireEvent.click(quoteButton);

      await waitFor(() => {
        expect(subscriptionService.sendQuote).toHaveBeenCalledWith({
          plan: 'STANDARD',
          equipmentCount: 1,
          clientId: undefined,
          billingCycle: 'monthly',
        });
        expect(mockAddToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Quotation Sent',
            type: 'success',
          })
        );
      });
    });

    test('sends quotation for unregistered customer when checkbox is checked', async () => {
      vi.mocked(subscriptionService.sendQuote).mockResolvedValue({ success: true, message: 'Sent' });
      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      // Verify that unregistered input fields are NOT shown initially
      expect(screen.queryByLabelText('plans.unregisteredEmailLabel')).not.toBeInTheDocument();

      // Open the sheet
      const viewSummaryButton = screen.getByRole('button', { name: /View Order Summary/i });
      fireEvent.click(viewSummaryButton);

      const checkbox = screen.getByLabelText('plans.sendToUnregistered');
      fireEvent.click(checkbox);

      const emailInput = screen.getByLabelText('plans.unregisteredEmailLabel') as HTMLInputElement;
      const nameInput = screen.getByLabelText('plans.unregisteredNameLabel') as HTMLInputElement;
      expect(emailInput).toBeInTheDocument();
      expect(nameInput).toBeInTheDocument();

      fireEvent.change(emailInput, { target: { value: 'unreg@example.com' } });
      fireEvent.change(nameInput, { target: { value: 'Unregistered Customer' } });

      const quoteButton = screen.getByText('plans.emailQuote');
      fireEvent.click(quoteButton);

      await waitFor(() => {
        expect(subscriptionService.sendQuote).toHaveBeenCalledWith({
          plan: 'STANDARD',
          equipmentCount: 1,
          clientId: undefined,
          unregisteredEmail: 'unreg@example.com',
          unregisteredName: 'Unregistered Customer',
          billingCycle: 'monthly',
        });
        expect(mockAddToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Quotation Sent',
            type: 'success',
          })
        );
      });

      expect(emailInput.value).toBe('');
      expect(nameInput.value).toBe('');
    });
  });

  describe('Admin Flow', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-admin', role: 'ADMIN', name: 'Admin User', email: 'admin@example.com', tenantId: 'tenant-1' },
        isAuthenticated: true,
      } as unknown as ReturnType<typeof useAuth>);

      vi.mocked(userService.getClients).mockResolvedValue(mockClients as unknown as Awaited<ReturnType<typeof userService.getClients>>);
    });

    test('renders admin customer assignment section instead of payment method', async () => {
      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(userService.getClients).toHaveBeenCalled();
        expect(screen.getByRole('heading', { name: /Apply Plan to Customer/i })).toBeInTheDocument();
        expect(screen.getByLabelText('Select Customer')).toBeInTheDocument();
      });

      expect(screen.queryByText('plans.paymentMethod')).not.toBeInTheDocument();
    });

    test('submits admin client assignment with selected clientId', async () => {
      vi.mocked(subscriptionService.create).mockResolvedValue({ id: 'sub-new' } as unknown as Awaited<ReturnType<typeof subscriptionService.create>>);
      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Select Customer')).toBeInTheDocument();
      });

      // Change customer dropdown
      const select = screen.getByLabelText('Select Customer');
      fireEvent.change(select, { target: { value: 'client-2' } });

      const applyButton = screen.getByRole('button', { name: /Apply Plan to Customer/i });
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(subscriptionService.create).toHaveBeenCalledWith({
          serviceName: 'Standard Support',
          plan: 'STANDARD',
          equipmentCount: 1,
          clientId: 'client-2',
          billingCycle: 'monthly',
        });
        expect(mockAddToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Plan Applied',
            type: 'success',
          })
        );
      });
    });

    test('renders "+ Add Plan" button, opens create modal, and submits new plan', async () => {
      const mockCreatePlan = vi.fn().mockResolvedValue(undefined);
      vi.mocked(usePlanStore).mockReturnValue({
        plans: mockPlans,
        loading: false,
        error: null,
        fetchPlans: vi.fn().mockResolvedValue(undefined),
        createPlan: mockCreatePlan,
        updatePlan: vi.fn(),
      } as unknown as ReturnType<typeof usePlanStore>);

      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      const addPlanButton = screen.getByText('+ Add Plan');
      expect(addPlanButton).toBeInTheDocument();

      fireEvent.click(addPlanButton);

      // Verify modal is open
      expect(screen.getByText('Add New Plan')).toBeInTheDocument();

      // Fill in details
      fireEvent.change(screen.getByPlaceholderText('e.g. PL-008'), { target: { value: 'PL-TEST' } });
      fireEvent.change(screen.getByPlaceholderText('Plan name in English'), { target: { value: 'Test Add Plan' } });
      fireEvent.change(screen.getByPlaceholderText('Nombre del plan en Español'), { target: { value: 'Plan de Prueba' } });
      fireEvent.change(screen.getByPlaceholderText('Description in English'), { target: { value: 'Test description' } });
      fireEvent.change(screen.getByPlaceholderText('Descripción en Español'), { target: { value: 'Descripción de prueba' } });
      fireEvent.change(screen.getByLabelText('Monthly Price ($)'), { target: { value: '99' } });
      fireEvent.change(screen.getByLabelText('Client Type'), { target: { value: 'CLIENT' } });

      const saveButton = screen.getByText('Create Plan');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockCreatePlan).toHaveBeenCalledWith(expect.objectContaining({
          id: 'PL-TEST',
          name: { en_US: 'Test Add Plan', es_DO: 'Plan de Prueba' },
          description: { en_US: 'Test description', es_DO: 'Descripción de prueba' },
          price: 99,
          client_type: 'CLIENT',
          active: true,
        }));
      });
    });

    test('hides inactive plans for standard client but shows them for admin', async () => {
      const mockPlansWithInactive = [
        ...mockPlans,
        {
          id: 'INACTIVE',
          name: { en_US: 'Disabled Plan', es_DO: 'Plan Desactivado' },
          description: { en_US: 'This is disabled', es_DO: 'Esto está desactivado' },
          price: 15,
          features: [],
          recommended: false,
          active: false,
          created_at: '2026-06-22',
          updated_at: '2026-06-22',
        }
      ];

      vi.mocked(usePlanStore).mockReturnValue({
        plans: mockPlansWithInactive,
        loading: false,
        error: null,
        fetchPlans: vi.fn().mockResolvedValue(undefined),
        createPlan: vi.fn(),
        updatePlan: vi.fn(),
      } as unknown as ReturnType<typeof usePlanStore>);

      // 1. Render as Admin (should see the inactive plan with Disabled badge)
      const { rerender } = render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Disabled Plan')).toBeInTheDocument();
        expect(screen.getByText('Disabled')).toBeInTheDocument();
      });

      // 2. Render as Standard CLIENT (should NOT see the inactive plan)
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-client', role: 'CLIENT', name: 'John Doe', email: 'john@example.com', tenantId: 'tenant-1' },
        isAuthenticated: true,
      } as unknown as ReturnType<typeof useAuth>);

      rerender(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText('Disabled Plan')).not.toBeInTheDocument();
        expect(screen.queryByText('Disabled')).not.toBeInTheDocument();
      });
    });

    test('supports reordering features via drag and drop and accessible buttons', async () => {
      const mockUpdatePlan = vi.fn().mockResolvedValue(undefined);
      const mockPlansWithMultipleFeatures = [
        {
          id: 'BASIC',
          name: { en_US: 'Basic Support', es_DO: 'Soporte Básico' },
          description: { en_US: 'Basic plan description', es_DO: 'Descripción del plan básico' },
          price: 199,
          features: [
            { text: { en_US: 'Feature A', es_DO: 'Feature A' }, included: true },
            { text: { en_US: 'Feature B', es_DO: 'Feature B' }, included: true },
          ],
          recommended: false,
          active: true,
          created_at: '2026-06-22',
          updated_at: '2026-06-22',
        },
      ];

      vi.mocked(usePlanStore).mockReturnValue({
        plans: mockPlansWithMultipleFeatures,
        loading: false,
        error: null,
        fetchPlans: vi.fn().mockResolvedValue(undefined),
        createPlan: vi.fn(),
        updatePlan: mockUpdatePlan,
      } as unknown as ReturnType<typeof usePlanStore>);

      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      // Open Edit Modal
      const editButton = screen.getByRole('button', { name: /Edit/i });
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Plan: BASIC')).toBeInTheDocument();
      });

      // Find inputs containing the English features
      const enInputs = screen.getAllByPlaceholderText('Feature in English...');
      expect(enInputs).toHaveLength(2);
      expect((enInputs[0] as HTMLInputElement).value).toBe('Feature A');
      expect((enInputs[1] as HTMLInputElement).value).toBe('Feature B');

      // 1. Test Keyboard Accessible Move Down
      const moveDownButtons = screen.getAllByTitle('Move down');
      fireEvent.click(moveDownButtons[0]);

      // Verify they swapped
      expect((enInputs[0] as HTMLInputElement).value).toBe('Feature B');
      expect((enInputs[1] as HTMLInputElement).value).toBe('Feature A');

      // Swap them back to original with Move Up
      const moveUpButtons = screen.getAllByTitle('Move up');
      fireEvent.click(moveUpButtons[1]);
      expect((enInputs[0] as HTMLInputElement).value).toBe('Feature A');
      expect((enInputs[1] as HTMLInputElement).value).toBe('Feature B');

      // 2. Test Drag and Drop reordering
      const dragRows = screen.getAllByTitle('Drag to reorder');
      expect(dragRows).toHaveLength(2);

      const sourceContainer = dragRows[0].closest('[draggable="true"]');
      const targetContainer = dragRows[1].closest('[draggable="true"]');
      expect(sourceContainer).not.toBeNull();
      expect(targetContainer).not.toBeNull();

      // Trigger HTML5 Drag & Drop events
      fireEvent.dragStart(sourceContainer!);
      fireEvent.dragOver(targetContainer!);
      fireEvent.drop(targetContainer!);
      fireEvent.dragEnd(sourceContainer!);

      // Verify they swapped after drop
      expect((enInputs[0] as HTMLInputElement).value).toBe('Feature B');
      expect((enInputs[1] as HTMLInputElement).value).toBe('Feature A');

      // Click save and verify updatePlan payload
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdatePlan).toHaveBeenCalledWith('BASIC', expect.objectContaining({
          features: [
            { text: { en_US: 'Feature B', es_DO: 'Feature B' }, included: true },
            { text: { en_US: 'Feature A', es_DO: 'Feature A' }, included: true },
          ],
        }));
      });
    });

    test('renders plans in Spanish when language is es_DO', async () => {
      mockLanguage = 'es_DO';
      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Soporte Básico')).toBeInTheDocument();
      expect(screen.getByText('Descripción del plan básico')).toBeInTheDocument();
      expect(screen.getByText('Soporte por correo')).toBeInTheDocument();
      
      // Reset mockLanguage
      mockLanguage = 'en_US';
    });

    test('sends customer quotation via email on Send Quotation to Customer click', async () => {
      vi.mocked(subscriptionService.sendQuote).mockResolvedValue({ success: true, message: 'Sent' });
      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Select Customer')).toBeInTheDocument();
      });

      const select = screen.getByLabelText('Select Customer');
      fireEvent.change(select, { target: { value: 'client-2' } });

      const sendQuoteButton = screen.getByText('plans.sendQuoteToCustomer');
      expect(sendQuoteButton).toBeInTheDocument();

      fireEvent.click(sendQuoteButton);

      await waitFor(() => {
        expect(subscriptionService.sendQuote).toHaveBeenCalledWith({
          plan: 'STANDARD',
          equipmentCount: 1,
          clientId: 'client-2',
          billingCycle: 'monthly',
        });
        expect(mockAddToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Quotation Sent',
            type: 'success',
          })
        );
      });
    });

    test('sends quotation for unregistered customer in admin flow', async () => {
      vi.mocked(subscriptionService.sendQuote).mockResolvedValue({ success: true, message: 'Sent' });
      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Select Customer')).toBeInTheDocument();
      });

      expect(screen.queryByLabelText('plans.unregisteredEmailLabel')).not.toBeInTheDocument();

      const applyButton = screen.getByRole('button', { name: /Apply Plan to Customer/i });
      expect(applyButton).not.toBeDisabled();

      const select = screen.getByLabelText('Select Customer');
      fireEvent.change(select, { target: { value: 'unregistered' } });

      const emailInput = screen.getByLabelText('plans.unregisteredEmailLabel') as HTMLInputElement;
      const nameInput = screen.getByLabelText('plans.unregisteredNameLabel') as HTMLInputElement;
      expect(emailInput).toBeInTheDocument();
      expect(nameInput).toBeInTheDocument();

      expect(applyButton).toBeDisabled();

      fireEvent.change(emailInput, { target: { value: 'admin-unreg@example.com' } });
      fireEvent.change(nameInput, { target: { value: 'Admin Unregistered Customer' } });

      const sendQuoteButton = screen.getByText('plans.sendQuoteToCustomer');
      fireEvent.click(sendQuoteButton);

      await waitFor(() => {
        expect(subscriptionService.sendQuote).toHaveBeenCalledWith({
          plan: 'STANDARD',
          equipmentCount: 1,
          clientId: undefined,
          unregisteredEmail: 'admin-unreg@example.com',
          unregisteredName: 'Admin Unregistered Customer',
          billingCycle: 'monthly',
        });
        expect(mockAddToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Quotation Sent',
            type: 'success',
          })
        );
      });

      expect(emailInput.value).toBe('');
      expect(nameInput.value).toBe('');
    });
  });
});
