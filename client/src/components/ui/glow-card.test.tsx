import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  GlowCard,
  GlowCardHeader,
  GlowCardIcon,
  GlowCardTitleGroup,
  GlowCardTitle,
  GlowCardStatus,
  GlowCardStatusDot,
  GlowCardAction,
  GlowCardContent,
  GlowCardDivider,
  GlowCardFooter,
  GlowCardBadge,
} from "./glow-card";

describe("GlowCard component primitive", () => {
  it("renders default neon variant with ambient glow and border layers", () => {
    const { container } = render(
      <GlowCard>
        <div>Card Content</div>
      </GlowCard>
    );

    const card = container.querySelector('[data-slot="glow-card"]');
    expect(card).toBeInTheDocument();
    expect(card).toHaveAttribute("data-variant", "neon");

    const ambient = container.querySelector('[data-slot="glow-card-ambient"]');
    expect(ambient).toBeInTheDocument();

    const borderDark = container.querySelector('[data-slot="glow-card-border"]');
    expect(borderDark).toBeInTheDocument();

    const inner = container.querySelector('[data-slot="glow-card-inner"]');
    expect(inner).toBeInTheDocument();
    expect(screen.getByText("Card Content")).toBeInTheDocument();
  });

  it("renders specific color variants properly", () => {
    const { container, rerender } = render(<GlowCard variant="emerald">Emerald</GlowCard>);
    expect(container.querySelector('[data-slot="glow-card"]')).toHaveAttribute("data-variant", "emerald");

    rerender(<GlowCard variant="amber">Amber</GlowCard>);
    expect(container.querySelector('[data-slot="glow-card"]')).toHaveAttribute("data-variant", "amber");

    rerender(<GlowCard variant="rose">Rose</GlowCard>);
    expect(container.querySelector('[data-slot="glow-card"]')).toHaveAttribute("data-variant", "rose");
  });

  it("renders all compound subcomponents faithfully matching the reference design", () => {
    render(
      <GlowCard variant="neon">
        <GlowCardHeader>
          <GlowCardIcon data-testid="card-icon">
            <span>🤖</span>
          </GlowCardIcon>
          <GlowCardTitleGroup>
            <GlowCardTitle>Customer Support Concierge</GlowCardTitle>
            <GlowCardStatus>
              <GlowCardStatusDot color="emerald" />
              <span>Active</span>
              <span>•</span>
              <span>1420 chats</span>
            </GlowCardStatus>
          </GlowCardTitleGroup>
          <GlowCardAction>
            <button aria-label="More options">...</button>
          </GlowCardAction>
        </GlowCardHeader>

        <GlowCardContent>
          <p>Autonomous tier-1 support agent handling ticketing, account verification, and status lookups.</p>
        </GlowCardContent>

        <GlowCardDivider />

        <GlowCardFooter>
          <GlowCardBadge>Rachel (Expressive)</GlowCardBadge>
          <span>2m ago</span>
        </GlowCardFooter>
      </GlowCard>
    );

    expect(screen.getByText("Customer Support Concierge")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("1420 chats")).toBeInTheDocument();
    expect(screen.getByLabelText("More options")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Autonomous tier-1 support agent handling ticketing, account verification, and status lookups."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Rachel (Expressive)")).toBeInTheDocument();
    expect(screen.getByText("2m ago")).toBeInTheDocument();
  });
});
