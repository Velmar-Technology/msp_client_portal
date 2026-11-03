import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PageFilterPill } from "./PageFilterPill";

describe("PageFilterPill", () => {
  const options = [
    { value: "CLIENT", label: "Client" },
    { value: "ADMIN", label: "Admin" },
  ];

  it("renders inactive pill with + icon and label", () => {
    render(
      <PageFilterPill
        label="Role"
        value=""
        options={options}
        onChange={vi.fn()}
        onClear={vi.fn()}
      />
    );

    expect(screen.getByTestId("filter-pill-role")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
  });

  it("renders active pill with display label and clear button", () => {
    const onClear = vi.fn();
    render(
      <PageFilterPill
        label="Role"
        value="CLIENT"
        options={options}
        onChange={vi.fn()}
        onClear={onClear}
      />
    );

    expect(screen.getByTestId("filter-pill-active-role")).toBeInTheDocument();
    expect(screen.getByText("Client")).toBeInTheDocument();

    const clearBtn = screen.getByRole("button", { name: /clear role filter/i });
    fireEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalled();
  });

  it("opens popover options and triggers onChange on selection", () => {
    const onChange = vi.fn();
    render(
      <PageFilterPill
        label="Role"
        value=""
        options={options}
        onChange={onChange}
        onClear={vi.fn()}
      />
    );

    const trigger = screen.getByTestId("filter-pill-role");
    fireEvent.click(trigger);

    const optionBtn = screen.getByText("Admin");
    fireEvent.click(optionBtn);

    expect(onChange).toHaveBeenCalledWith("ADMIN");
  });
});
