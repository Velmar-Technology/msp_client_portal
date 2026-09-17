import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expect, test, vi, beforeEach, describe } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { FinancialPage } from './FinancialPage';

const mockSetDateRange = vi.fn();
const mockHandleExport = vi.fn();
const mockRefresh = vi.fn();

let mockDashboardState = {
  dateRange: '30_days',
  setDateRange: mockSetDateRange,
  refresh: mockRefresh,
  hoveredMonthIndex: null,
  setHoveredMonthIndex: vi.fn(),
  hoveredCategoryIndex: null,
  setHoveredCategoryIndex: vi.fn(),
  isExporting: false,
  handleExport: mockHandleExport,
  isLoading: false,
  kpis: [
    { key: 'revenue', titleKey: 'grossRevenue', value: '$45,000.00', trend: '+12%', isPositiveTrend: true },
    { key: 'mrr', titleKey: 'monthlyRecurringRevenue', value: '$12,500.00', trend: '+5%', isPositiveTrend: true },
    { key: 'expenses', titleKey: 'totalExpenses', value: '$8,200.00', trend: '-3%', isPositiveTrend: false },
    { key: 'margin', titleKey: 'netMargin', value: '81.8%', trend: '+2%', isPositiveTrend: true },
  ],
  monthlyData: [
    { month: 'Jan', revenue: 10000, expenses: 2000 },
    { month: 'Feb', revenue: 12000, expenses: 2500 },
  ],
  expenseCategories: [
    { nameKey: 'software', value: 1200, percentage: 60, color: '#10b981' },
    { nameKey: 'infrastructure', value: 800, percentage: 40, color: '#3b82f6' },
  ],
  transactions: [
    { id: 'tx-1', date: '2026-09-01', description: 'AWS Cloud Services', categoryKey: 'hosting', status: 'PAID' as const, amount: 250 },
    { id: 'tx-2', date: '2026-09-02', description: 'Google Workspace', categoryKey: 'software', status: 'PAID' as const, amount: 120 },
  ],
};

vi.mock('../hooks/useFinancialDashboard', () => ({
  useFinancialDashboard: () => mockDashboardState,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', role: 'ADMIN', name: 'Admin User' },
  }),
}));

vi.mock('../components/RevenueChart', () => ({
  RevenueChart: () => <div data-testid="mock-revenue-chart">Mock Revenue Chart</div>,
}));

vi.mock('../components/ExpenseDoughnut', () => ({
  ExpenseDoughnut: () => <div data-testid="mock-expense-doughnut">Mock Expense Doughnut</div>,
}));

vi.mock('../components/TechnicianPayrollTable', () => ({
  TechnicianPayrollTable: () => <div data-testid="mock-technician-payroll-table">Mock Technician Payroll</div>,
}));

describe('FinancialPage - Dashboard View Architecture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDashboardState = {
      ...mockDashboardState,
      isLoading: false,
    };
  });

  test('renders Dashboard view with ControlPanel, KPI metrics, charts, and transactions', async () => {
    render(
      <MemoryRouter initialEntries={['/financial']}>
        <FinancialPage />
      </MemoryRouter>,
    );

    // Verify Page ControlPanel title & actions
    expect(screen.getByText('financial.title')).toBeInTheDocument();

    // Verify KPI cards rendered via Page.Dashboard and Page.DashboardKpi
    expect(screen.getByText('financial.grossRevenue')).toBeInTheDocument();
    expect(screen.getByText('$45,000.00')).toBeInTheDocument();
    expect(screen.getByText('financial.totalExpenses')).toBeInTheDocument();
    expect(screen.getByText('$8,200.00')).toBeInTheDocument();

    // Verify Dashboard charts
    expect(await screen.findByTestId('mock-revenue-chart')).toBeInTheDocument();
    expect(await screen.findByTestId('mock-expense-doughnut')).toBeInTheDocument();

    // Verify Transactions
    expect(screen.getByText('AWS Cloud Services')).toBeInTheDocument();
    expect(screen.getByText('Google Workspace')).toBeInTheDocument();
  });

  test('changes date range filter in dashboard view', async () => {
    render(
      <MemoryRouter initialEntries={['/financial']}>
        <FinancialPage />
      </MemoryRouter>,
    );

    // Find export button
    const exportButton = screen.getByRole('button', { name: /financial.export/i });
    expect(exportButton).toBeInTheDocument();
    fireEvent.click(exportButton);
    expect(mockHandleExport).toHaveBeenCalledTimes(1);
  });

  test('switches between Dashboard view and Technician Commissions view', async () => {
    render(
      <MemoryRouter initialEntries={['/financial']}>
        <FinancialPage />
      </MemoryRouter>,
    );

    // Check that Dashboard view elements are visible
    expect(screen.getByText('financial.grossRevenue')).toBeInTheDocument();

    // Find view switcher button for Technician Commissions
    const payrollViewBtn = screen.getByRole('button', { name: /Technician Commissions/i });
    expect(payrollViewBtn).toBeInTheDocument();

    fireEvent.click(payrollViewBtn);

    // Should switch to payroll view
    await waitFor(() => {
      expect(screen.getByTestId('mock-technician-payroll-table')).toBeInTheDocument();
    });

    // Overview charts should no longer be rendered
    expect(screen.queryByTestId('mock-revenue-chart')).not.toBeInTheDocument();
  });

  test('renders directly in payroll view when tab=payroll in URL', async () => {
    render(
      <MemoryRouter initialEntries={['/financial?tab=payroll']}>
        <FinancialPage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('mock-technician-payroll-table')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-revenue-chart')).not.toBeInTheDocument();
  });
});
