import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MetricCard } from './MetricCard';
import { DollarSign } from 'lucide-react';

describe('MetricCard', () => {
  it('renders title and value correctly via flat props', () => {
    render(
      <MetricCard
        title="Total Revenue"
        value="$45,200.00"
      />
    );

    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('$45,200.00')).toBeInTheDocument();
  });

  it('renders icon and badge when provided', () => {
    render(
      <MetricCard
        title="Active Tickets"
        value="12"
        icon={<DollarSign data-testid="test-icon" />}
        badge="Live"
      />
    );

    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('supports Lucide icon component passed directly', () => {
    render(
      <MetricCard
        title="MRR"
        value="$10,000"
        icon={DollarSign}
      />
    );

    expect(screen.getByText('MRR')).toBeInTheDocument();
  });

  it('renders positive trend correctly with emerald styling', () => {
    render(
      <MetricCard
        title="MRR"
        value="$12,000"
        trend={{ value: '+8.5%', isPositive: true }}
      />
    );

    const trendElement = screen.getByText('+8.5%').closest('span');
    expect(trendElement).toHaveClass('text-emerald-600');
  });

  it('renders negative trend correctly with rose styling', () => {
    render(
      <MetricCard
        title="Expenses"
        value="$3,400"
        trend={{ value: '-4.2%', direction: 'down' }}
      />
    );

    const trendElement = screen.getByText('-4.2%').closest('span');
    expect(trendElement).toHaveClass('text-rose-600');
  });

  it('renders neutral trend correctly with muted styling', () => {
    render(
      <MetricCard
        title="Churn"
        value="0%"
        trend={{ value: '0.0%', direction: 'neutral' }}
      />
    );

    const trendElement = screen.getByText('0.0%').closest('span');
    expect(trendElement).toHaveClass('bg-muted');
  });

  it('renders subtitle and footer', () => {
    render(
      <MetricCard
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
      <MetricCard
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
      <MetricCard
        title="Loading Metric"
        value="100"
        isLoading={true}
      />
    );

    expect(screen.queryByText('Loading Metric')).not.toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('supports compound slot composition', () => {
    render(
      <MetricCard>
        <MetricCard.Header>
          <MetricCard.Title>Storage Quota</MetricCard.Title>
          <MetricCard.Badge>Warning</MetricCard.Badge>
        </MetricCard.Header>
        <MetricCard.Value>85%</MetricCard.Value>
        <div data-testid="custom-child">Custom Progress Bar</div>
        <MetricCard.Footer>170 GB / 200 GB</MetricCard.Footer>
      </MetricCard>
    );

    expect(screen.getByText('Storage Quota')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByTestId('custom-child')).toBeInTheDocument();
    expect(screen.getByText('170 GB / 200 GB')).toBeInTheDocument();
  });
});
