import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

/**
 * Restaurant route tests.
 *
 * Each restaurant page is a thin wrapper around the corresponding hotel page
 * passing `mode="restaurant"`. We mock each hotel module so the underlying
 * page can render synchronously without Supabase/providers, while still
 * proving the wrapper forwards the restaurant mode and renders
 * restaurant-specific content.
 */

vi.mock("@/pages/hotel/HotelPOS", () => ({
  default: ({ mode }: { mode?: string }) => (
    <div data-testid="hotel-pos-mock" data-mode={mode}>
      {mode === "restaurant" ? "Restaurant POS" : "Hotel POS"}
    </div>
  ),
}));
vi.mock("@/pages/hotel/KitchenDisplay", () => ({
  default: ({ mode }: { mode?: string }) => (
    <div data-testid="kitchen-mock" data-mode={mode}>
      {mode === "restaurant" ? "Restaurant Kitchen" : "Hotel Kitchen"}
    </div>
  ),
}));
vi.mock("@/pages/hotel/BarDisplay", () => ({
  default: ({ mode }: { mode?: string }) => (
    <div data-testid="bar-mock" data-mode={mode}>
      {mode === "restaurant" ? "Restaurant Bar" : "Hotel Bar"}
    </div>
  ),
}));
vi.mock("@/pages/hotel/HotelServiceMenu", () => ({
  default: ({ mode }: { mode?: string }) => (
    <div data-testid="menu-mock" data-mode={mode}>
      {mode === "restaurant" ? "Menu Management" : "Hotel Service Menu"}
    </div>
  ),
}));
vi.mock("@/pages/hotel/HotelReports", () => ({
  default: ({ mode }: { mode?: string }) => (
    <div data-testid="reports-mock" data-mode={mode}>
      {mode === "restaurant" ? "Restaurant Reports" : "Hotel Reports"}
    </div>
  ),
}));

const cases = [
  {
    path: "/restaurant/pos",
    importer: () => import("@/pages/restaurant/RestaurantPOS"),
    testId: "hotel-pos-mock",
    expectedText: "Restaurant POS",
  },
  {
    path: "/restaurant/kitchen",
    importer: () => import("@/pages/restaurant/RestaurantKitchen"),
    testId: "kitchen-mock",
    expectedText: "Restaurant Kitchen",
  },
  {
    path: "/restaurant/bar",
    importer: () => import("@/pages/restaurant/RestaurantBar"),
    testId: "bar-mock",
    expectedText: "Restaurant Bar",
  },
  {
    path: "/restaurant/menu",
    importer: () => import("@/pages/restaurant/RestaurantMenu"),
    testId: "menu-mock",
    expectedText: "Menu Management",
  },
  {
    path: "/restaurant/reports",
    importer: () => import("@/pages/restaurant/RestaurantReports"),
    testId: "reports-mock",
    expectedText: "Restaurant Reports",
  },
];

describe("restaurant route wrappers", () => {
  for (const { path, importer, testId, expectedText } of cases) {
    it(`${path} renders restaurant-mode content`, async () => {
      const { default: Page } = await importer();
      render(<Page />);
      const node = screen.getByTestId(testId);
      expect(node).toBeInTheDocument();
      expect(node.getAttribute("data-mode")).toBe("restaurant");
      expect(node).toHaveTextContent(expectedText);
    });
  }
});