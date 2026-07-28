import { render, screen } from '@testing-library/react';
import { Button } from "@/components/ui/button";
import { expect, test } from 'vitest';

test('renders button with correct text', () => {
  render(<Button>Click me</Button>);
  const buttonEl = screen.getByRole('button', { name: /click me/i });
  expect(buttonEl).toBeInTheDocument();
});

test('applies custom variant class', () => {
  render(<Button variant="destructive">Delete</Button>);
  const buttonEl = screen.getByRole('button', { name: /delete/i });
  expect(buttonEl).toHaveAttribute('data-variant', 'destructive');
});
