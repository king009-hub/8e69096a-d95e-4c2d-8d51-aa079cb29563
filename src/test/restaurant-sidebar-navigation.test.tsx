import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ userRole: "admin", user: null }),
}));

vi.mock("@/contexts/AppModeContext", () => ({
  useAppMode: () => ({ mode: "restaurant" }),
}));

vi.mock("@/contexts/StaffSessionContext", () => ({
  useStaffSession: () => ({ activeStaff: null }),
}));

vi.mock("@/hooks/useRolePermissions", () => ({
  useRolePermissions: () => ({ data: null }),
}));

vi.mock("@/components/common/ModeSwitcher", () => ({
  ModeSwitcher: () => <div data-testid="mode-switcher">Mode Switcher</div>,
}));

const restaurantRoutes = [
  { path: "/restaurant", name: "Dashboard" },
  { path: "/restaurant/pos", name: "Point of Sale" },
  { path: "/restaurant/kitchen", name: "Kitchen Display" },
  { path: "/restaurant/bar", name: "Bar Display" },
  { path: "/restaurant/menu", name: "Menu" },
  { path: "/restaurant/reports", name: "Reports" },
];

describe("Restaurant sidebar navigation highlighting", () => {
  for (const { path, name } of restaurantRoutes) {
    it(`highlights "${name}" link and sets aria-current="page" when on ${path}`, () => {
      render(
        <MemoryRouter initialEntries={[path]}>
          <Sidebar />
        </MemoryRouter>
      );

      const activeLink = screen.getByText(name).closest("a");
      expect(activeLink).toHaveClass("bg-primary");
      expect(activeLink).toHaveAttribute("aria-current", "page");

      for (const other of restaurantRoutes) {
        if (other.name === name) continue;
        const otherLink = screen.queryByText(other.name)?.closest("a");
        if (otherLink) {
          expect(otherLink).not.toHaveClass("bg-primary");
          expect(otherLink).not.toHaveAttribute("aria-current");
        }
      }
    });
  }

  it("navigates from Dashboard to POS and updates highlight and aria-current", () => {
    render(
      <MemoryRouter initialEntries={["/restaurant"]}>
        <Sidebar />
      </MemoryRouter>
    );

    const dashboardLink = screen.getByText("Dashboard").closest("a");
    expect(dashboardLink).toHaveClass("bg-primary");
    expect(dashboardLink).toHaveAttribute("aria-current", "page");

    const posLink = screen.getByText("Point of Sale").closest("a");
    fireEvent.click(posLink);

    const updatedPosLink = screen.getByText("Point of Sale").closest("a");
    const updatedDashboardLink = screen.getByText("Dashboard").closest("a");
    expect(updatedPosLink).toHaveClass("bg-primary");
    expect(updatedPosLink).toHaveAttribute("aria-current", "page");
    expect(updatedDashboardLink).not.toHaveClass("bg-primary");
    expect(updatedDashboardLink).not.toHaveAttribute("aria-current");
  });

  it("navigates through all restaurant routes via sidebar clicks and updates aria-current", () => {
    render(
      <MemoryRouter initialEntries={["/restaurant"]}>
        <Sidebar />
      </MemoryRouter>
    );

    // Start at dashboard
    const dashboardLink = screen.getByText("Dashboard").closest("a");
    expect(dashboardLink).toHaveClass("bg-primary");
    expect(dashboardLink).toHaveAttribute("aria-current", "page");

    const routeOrder = [
      { path: "/restaurant/pos", name: "Point of Sale" },
      { path: "/restaurant/kitchen", name: "Kitchen Display" },
      { path: "/restaurant/bar", name: "Bar Display" },
      { path: "/restaurant/menu", name: "Menu" },
      { path: "/restaurant/reports", name: "Reports" },
    ];

    for (const { name } of routeOrder) {
      const link = screen.getByText(name).closest("a");
      fireEvent.click(link);
      expect(link).toHaveClass("bg-primary");
      expect(link).toHaveAttribute("aria-current", "page");
      expect(screen.getByText("Dashboard").closest("a")).not.toHaveClass("bg-primary");
      expect(screen.getByText("Dashboard").closest("a")).not.toHaveAttribute("aria-current");
    }
  });
});
