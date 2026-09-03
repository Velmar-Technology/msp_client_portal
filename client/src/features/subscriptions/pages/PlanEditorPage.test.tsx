import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlanEditorPage } from './PlanEditorPage';
import { expect, test, vi, beforeEach, describe } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { planService, type Plan } from '../api/planService';
import enTranslations from '@/locales/en_US.json';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

let mockLanguage = 'en_US';

const mockT = (key: string, options?: Record<string, string | number>) => {
  const parts = key.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = enTranslations;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return key;
    }
  }
  if (typeof current === 'string') {
    if (options && typeof options === 'object') {
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

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
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

const mockPlans: Plan[] = [
  {
    id: 'PL-TEST-001',
    name: { en_US: 'Professional Plan', es_DO: 'Plan Profesional' },
    description: { en_US: 'Pro tier service', es_DO: 'Servicio nivel pro' },
    price: 99,
    recommended: true,
    client_type: 'CLIENT',
    active: true,
    created_at: '2026-06-22',
    updated_at: '2026-06-22',
    features: [
      {
        code: 'HELPDESK_SUPPORT',
        included: true,
        params: { type: '24/7/365', limit: 'Unlimited' },
      },
      {
        text: { en_US: 'Custom SLA guarantee', es_DO: 'Garantía SLA personalizada' },
        included: true,
      },
    ],
  },
];

describe('PlanEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLanguage = 'en_US';
    vi.spyOn(planService, 'getAll').mockResolvedValue(mockPlans);
    vi.spyOn(planService, 'create').mockResolvedValue(mockPlans[0]);
    vi.spyOn(planService, 'update').mockResolvedValue(mockPlans[0]);
    vi.spyOn(planService, 'delete').mockResolvedValue(mockPlans[0]);
  });

  test('renders create mode at /plans/new with clean form', async () => {
    render(
      <MemoryRouter initialEntries={['/plans/new']}>
        <Routes>
          <Route path="/plans/new" element={<PlanEditorPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Add New Plan/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Plan ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Plan Name \(English\)/i)).toHaveValue('');
    expect(screen.getByLabelText(/Monthly Price/i)).toHaveValue(0);
    expect(screen.getByText('Create Plan')).toBeInTheDocument();
  });

  test('validates required fields on create and submits successfully', async () => {
    render(
      <MemoryRouter initialEntries={['/plans/new']}>
        <Routes>
          <Route path="/plans/new" element={<PlanEditorPage />} />
        </Routes>
      </MemoryRouter>
    );

    const submitBtn = screen.getByText('Create Plan');
    fireEvent.click(submitBtn);

    // Should show validation error for missing name
    await waitFor(() => {
      expect(screen.getByText(/Plan name is required/i)).toBeInTheDocument();
    });

    // Fill valid form data
    const idInput = screen.getByLabelText(/Plan ID/i);
    const nameInput = screen.getByLabelText(/Plan Name \(English\)/i);
    const priceInput = screen.getByLabelText(/Monthly Price/i);

    fireEvent.change(idInput, { target: { value: 'PL-ENTERPRISE' } });
    fireEvent.change(nameInput, { target: { value: 'Enterprise Elite' } });
    fireEvent.change(priceInput, { target: { value: '299' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(planService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'PL-ENTERPRISE',
          price: 299,
          name: expect.objectContaining({ en_US: 'Enterprise Elite' }),
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/plans');
    });
  });

  test('loads existing plan in edit mode at /plans/:id/edit and submits updates', async () => {
    render(
      <MemoryRouter initialEntries={['/plans/PL-TEST-001/edit']}>
        <Routes>
          <Route path="/plans/:id/edit" element={<PlanEditorPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Should load and display existing plan
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Edit Plan: PL-TEST-001/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Plan Name \(English\)/i)).toHaveValue('Professional Plan');
      expect(screen.getByLabelText(/Monthly Price/i)).toHaveValue(99);
    });

    // Modify price
    const priceInput = screen.getByLabelText(/Monthly Price/i);
    fireEvent.change(priceInput, { target: { value: '149' } });

    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(planService.update).toHaveBeenCalledWith(
        'PL-TEST-001',
        expect.objectContaining({
          price: 149,
          name: expect.objectContaining({ en_US: 'Professional Plan' }),
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/plans');
    });
  });

  test('shows not found error when plan ID does not exist', async () => {
    render(
      <MemoryRouter initialEntries={['/plans/NON-EXISTENT/edit']}>
        <Routes>
          <Route path="/plans/:id/edit" element={<PlanEditorPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Plan Not Found/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Back to Plans/i)).toBeInTheDocument();
    });
  });

  test('allows deleting plan in edit mode through confirmation dialog', async () => {
    render(
      <MemoryRouter initialEntries={['/plans/PL-TEST-001/edit']}>
        <Routes>
          <Route path="/plans/:id/edit" element={<PlanEditorPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Delete Plan/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Delete Plan/i }));

    // Confirmation dialog appears
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole('button', { name: /Soft Delete|Confirm|Delete/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(planService.delete).toHaveBeenCalledWith('PL-TEST-001');
      expect(mockNavigate).toHaveBeenCalledWith('/plans');
    });
  });
});
