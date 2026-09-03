import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

describe('WCAG 2.1 AA Accessibility Conformance (axe-core)', () => {
  it('button primitives have no accessibility violations', async () => {
    const { container } = render(
      <main>
        <Button variant="default" aria-label="Submit Form">
          Submit Form
        </Button>
        <Button variant="outline" aria-label="Cancel Operation">
          Cancel
        </Button>
      </main>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('form input primitives have no accessibility violations when labeled', async () => {
    const { container } = render(
      <main>
        <form>
          <label htmlFor="email-input">Email Address</label>
          <Input id="email-input" type="email" placeholder="user@company.com" />

          <label htmlFor="tenant-input">Tenant ID</label>
          <Input id="tenant-input" type="text" defaultValue="tenant-msp-001" />
        </form>
      </main>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('data table primitives have no accessibility violations', async () => {
    const { container } = render(
      <main>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Ticket ID</TableHead>
              <TableHead scope="col">Title</TableHead>
              <TableHead scope="col">Priority</TableHead>
              <TableHead scope="col">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>TICK-1001</TableCell>
              <TableCell>Firewall Connectivity Issue</TableCell>
              <TableCell>
                <Badge variant="destructive">CRITICAL</Badge>
              </TableCell>
              <TableCell>OPEN</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </main>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('card containers have no accessibility violations', async () => {
    const { container } = render(
      <main>
        <Card>
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p>All client telemetry services and RMM agents reporting nominal latency.</p>
          </CardContent>
        </Card>
      </main>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
