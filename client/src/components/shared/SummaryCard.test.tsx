import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SummaryCard } from './SummaryCard';
import { DollarSign } from 'lucide-react';

describe('SummaryCard', () => {
  it('renders title and value correctly', () => {
    render(
      <SummaryCard
        title="Total Revenue"
        value="$45,200.00"
      />
    );

    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('$45,200.00')).toBeInTheDocument();
  });

  it('renders icon and badge when provided', () => {
    render(
      <SummaryCard
        title="Active Tickets"
        value="12"
        icon={<DollarSign data-testid="test-icon" />}
        badge="Live"
      />
    );

    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('renders positive trend correctly with emerald styling', () => {
    render(
      <SummaryCard
        title="MRR"
        value="$12,000"
        trend="+8.5%"
        isPositiveTrend={true}
      />
    );

    const trendElement = screen.getByText('+8.5%').closest('span');
    expect(trendElement).toHaveClass('bg-emerald-50');
    expect(trendElement).toHaveClass('text-emerald-700');
  });

  it('renders negative trend correctly with red styling', () => {
    render(
      <SummaryCard
        title="Expenses"
        value="$3,400"
        trend="-4.2%"
        isPositiveTrend={false}
      />
    );

    const trendElement = screen.getByText('-4.2%').closest('span');
    expect(trendElement).toHaveClass('bg-red-50');
    expect(trendElement).toHaveClass('text-red-700');
  });

  it('renders subtitle and footer', () => {
    render(
      <SummaryCard
        title="Server Health"
        value="99.9%"
        subtitle="vs last month"
        footer={<span>Updated 2m ago</span>}
      />
    );

    expect(screen.getByText('vs last month')).toBeInTheDocument();
    expect(screen.getByText('Updated 2m ago')).toBeInTheDocument();
  });

  it('handles click events and keyboard interaction when onClick is provided', () => {
    const handleClick = vi.fn();
    render(
      <SummaryCard
        title="Clickable Card"
        value="100"
        onClick={handleClick}
      />
    );

    const card = screen.getByRole('button');
    expect(card).toBeInTheDocument();

    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(card, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(card, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(3);
  });

  it('renders skeleton loading state when isLoading is true', () => {
    const { container } = render(
      <SummaryCard
        title="Loading Metric"
        value="100"
        isLoading={true}
      />
    );

    expect(screen.queryByText('Loading Metric')).not.toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });
});
