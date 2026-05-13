import { describe, it, expect } from "vitest";

/**
 * Smoke tests: ensure each restaurant route module loads without errors,
 * exports a default React component, and (for wrappers) forwards
 * mode="restaurant" to the underlying hotel module so restaurant data
 * scoping is preserved.
 */
describe("restaurant routes", () => {
  const routes = [
    { path: "/restaurant/pos", mod: () => import("@/pages/restaurant/RestaurantPOS") },
    { path: "/restaurant/kitchen", mod: () => import("@/pages/restaurant/RestaurantKitchen") },
    { path: "/restaurant/bar", mod: () => import("@/pages/restaurant/RestaurantBar") },
    { path: "/restaurant/menu", mod: () => import("@/pages/restaurant/RestaurantMenu") },
    { path: "/restaurant/reports", mod: () => import("@/pages/restaurant/RestaurantReports") },
  ];

  for (const { path, mod } of routes) {
    it(`${path} module loads and exports a component`, async () => {
      const m = await mod();
      expect(m.default).toBeDefined();
      expect(typeof m.default).toBe("function");
    });

    it(`${path} wrapper passes mode="restaurant"`, async () => {
      const m = await mod();
      // Render the component as a function call to inspect the JSX it returns.
      // All wrappers are simple: return <X mode="restaurant" />
      const element: any = (m.default as any)({});
      expect(element).toBeTruthy();
      expect(element.props?.mode).toBe("restaurant");
    });
  }
});