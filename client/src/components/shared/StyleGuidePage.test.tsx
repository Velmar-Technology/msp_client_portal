import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PageHeader } from './PageHeader';
import { MetricCard } from './MetricCard';
import { EmptyState } from './EmptyState';
import { ModalFooter } from './ModalFooter';
import { TableToolbar } from './TableToolbar';
import { StyleGuidePage } from './StyleGuidePage';

describe('Composed Shared Components', () => {
  it('renders PageHeader title, subtitle, and actions', () => {
    render(
      <PageHeader
        title="Test Page"
        subtitle="Test Subtitle"
        actions={<button>Click Me</button>}
      />
    );
    expect(screen.getByText('Test Page')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('renders MetricCard with title and formatted value', () => {
    render(
      <MetricCard
        title="Total Invoices"
        value="$1,234.56"
        description="Overdue amount"
        trend={{ value: '+12%', isPositive: true }}
      />
    );
    expect(screen.getByText('Total Invoices')).toBeInTheDocument();
    expect(screen.getByText('$1,234.56')).toBeInTheDocument();
    expect(screen.getByText('+12%')).toBeInTheDocument();
  });

  it('renders EmptyState title and action button', () => {
    const handleClick = () => {};
    render(
      <EmptyState
        title="No Tickets Found"
        description="Try adjusting your filter settings."
        action={{ label: 'Create Ticket', onClick: handleClick }}
      />
    );
    expect(screen.getByText('No Tickets Found')).toBeInTheDocument();
    expect(screen.getByText('Create Ticket')).toBeInTheDocument();
  });

  it('renders ModalFooter children correctly', () => {
    render(
      <ModalFooter>
        <button>Cancel</button>
        <button>Confirm</button>
      </ModalFooter>
    );
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  it('renders TableToolbar with search input', () => {
    render(
      <TableToolbar
        searchValue="search term"
        onSearchChange={() => {}}
        searchPlaceholder="Search here..."
      />
    );
    expect(screen.getByPlaceholderText('Search here...')).toBeInTheDocument();
  });

  it('renders dev-only StyleGuidePage without errors', () => {
    render(<StyleGuidePage />);
    expect(screen.getByText('Design System Style Guide')).toBeInTheDocument();
  });
});
