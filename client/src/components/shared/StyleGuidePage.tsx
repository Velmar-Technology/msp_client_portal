import React from 'react';
import { PageHeader } from './PageHeader';
import { StatCard } from './StatCard';
import { EmptyState } from './EmptyState';
import { TableToolbar } from './TableToolbar';
import { ModalFooter } from './ModalFooter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Dev-only Live Style Guide component.
 * Demonstrates composed design system blocks, semantic theme tokens, and typography.
 */
export const StyleGuidePage: React.FC = () => {
  return (
    <div className="space-y-8 p-6 max-w-6xl mx-auto">
      <PageHeader
        title="Design System Style Guide"
        subtitle="Live reference page showcasing composed layout blocks, semantic color tokens, and UI primitives."
        badge={<Badge variant="outline">Dev Only</Badge>}
        actions={
          <Button size="sm">
            Primary Action
          </Button>
        }
      />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Composed Stat Cards</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Total Revenue"
            value="$45,231.89"
            description="+20.1% from last month"
            trend={{ value: "+20.1%", isPositive: true }}
          />
          <StatCard
            title="Active Subscriptions"
            value="124"
            description="+12 new this week"
            trend={{ value: "+10.5%", isPositive: true }}
          />
          <StatCard
            title="Open Tickets"
            value="12"
            description="3 critical SLA tickets"
            trend={{ value: "-4.2%", isPositive: false }}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Table Toolbar & Empty States</h2>
        <Card className="bg-card text-card-foreground">
          <CardHeader>
            <CardTitle>Data Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TableToolbar
              searchValue=""
              onSearchChange={() => {}}
              searchPlaceholder="Filter items..."
              actions={<Button size="sm" variant="outline">Export CSV</Button>}
            />
            <EmptyState
              title="No records found"
              description="There are currently no active records matching your filter criteria."
              action={{ label: "Create Record", onClick: () => {} }}
            />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Modal Footers</h2>
        <Card className="bg-card text-card-foreground p-4">
          <ModalFooter>
            <Button variant="outline">Cancel</Button>
            <Button>Save Changes</Button>
          </ModalFooter>
        </Card>
      </section>
    </div>
  );
};
