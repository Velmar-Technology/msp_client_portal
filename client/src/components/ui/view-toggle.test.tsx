import { render, screen, fireEvent } from "@testing-library/react";
import { ViewToggle } from "@/components/ui/view-toggle";
import { describe, expect, test, vi } from "vitest";
import { LayoutList, Kanban } from "lucide-react";

describe("ViewToggle primitive", () => {
  test("renders default tiled and list options when options prop is omitted", () => {
    const handleChange = vi.fn();
    render(<ViewToggle value="tiled" onChange={handleChange} />);

    const tiledBtn = screen.getByRole("button", { name: /tiled/i });
    const listBtn = screen.getByRole("button", { name: /list/i });

    expect(tiledBtn).toBeInTheDocument();
    expect(listBtn).toBeInTheDocument();
    expect(tiledBtn).toHaveAttribute("data-state", "on");
    expect(listBtn).toHaveAttribute("data-state", "off");

    fireEvent.click(listBtn);
    expect(handleChange).toHaveBeenCalledWith("list");
  });

  test("renders custom options with icons and labels", () => {
    const handleChange = vi.fn();
    render(
      <ViewToggle
        value="table"
        onChange={handleChange}
        options={[
          { value: "table", icon: LayoutList, label: "Table View" },
          { value: "kanban", icon: Kanban, label: "Kanban Board" },
        ]}
      />
    );

    const tableBtn = screen.getByRole("button", { name: /table view/i });
    const kanbanBtn = screen.getByRole("button", { name: /kanban board/i });

    expect(tableBtn).toBeInTheDocument();
    expect(kanbanBtn).toBeInTheDocument();
    expect(tableBtn).toHaveAttribute("data-state", "on");
    expect(kanbanBtn).toHaveAttribute("data-state", "off");

    fireEvent.click(kanbanBtn);
    expect(handleChange).toHaveBeenCalledWith("kanban");
  });

  test("applies appropriate size classes", () => {
    const { container: smContainer } = render(
      <ViewToggle value="tiled" onChange={vi.fn()} size="sm" />
    );
    expect(smContainer.querySelector(".h-7")).toBeInTheDocument();

    const { container: lgContainer } = render(
      <ViewToggle value="tiled" onChange={vi.fn()} size="lg" />
    );
    expect(lgContainer.querySelector(".h-9")).toBeInTheDocument();
  });
});
