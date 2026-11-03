import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { UserPresenceAvatar } from "./UserPresenceAvatar";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/hooks/useConnectionStatus", () => ({
  useConnectionStatus: () => "connected",
}));

describe("UserPresenceAvatar", () => {
  it("renders user first initial inside the warm circular badge", () => {
    render(<UserPresenceAvatar user={{ name: "Sarah Connor" }} />);
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("renders fallback initial 'S' when user has no name", () => {
    render(<UserPresenceAvatar user={{ name: "" }} />);
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("renders profile image when avatarUrl is provided", () => {
    render(
      <UserPresenceAvatar
        user={{ name: "John Doe", avatarUrl: "https://example.com/avatar.jpg" }}
      />
    );
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg");
    expect(img).toHaveAttribute("alt", "John Doe");
  });

  it("renders green presence dot when connected", () => {
    render(<UserPresenceAvatar user={{ name: "Alice" }} status="connected" />);
    const dot = screen.getByTestId("presence-dot");
    expect(dot).toHaveAttribute("data-status", "connected");
    expect(dot).toHaveClass("bg-[#00c853]");
  });

  it("renders amber pulsing presence dot when reconnecting", () => {
    render(<UserPresenceAvatar user={{ name: "Bob" }} status="reconnecting" />);
    const dot = screen.getByTestId("presence-dot");
    expect(dot).toHaveAttribute("data-status", "reconnecting");
    expect(dot).toHaveClass("bg-amber-500");
  });

  it("renders gray presence dot when offline", () => {
    render(<UserPresenceAvatar user={{ name: "Charlie" }} status="offline" />);
    const dot = screen.getByTestId("presence-dot");
    expect(dot).toHaveAttribute("data-status", "offline");
    expect(dot).toHaveClass("bg-neutral-400");
  });

  it("supports custom size configurations", () => {
    const { rerender } = render(<UserPresenceAvatar user={{ name: "Dana" }} size="lg" />);
    const avatar = screen.getByTestId("presence-avatar");
    expect(avatar).toHaveClass("size-12");

    rerender(<UserPresenceAvatar user={{ name: "Dana" }} size="md" />);
    expect(avatar).toHaveClass("size-9");
  });
});
