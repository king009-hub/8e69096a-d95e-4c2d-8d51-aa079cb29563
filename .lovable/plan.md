
# Goal

You already have the restaurant flow inside the hotel app (Service Menu, POS, Kitchen, Bar, Waiter PIN, KOT). We will keep all of that and add the missing modules so it works as a **full advanced restaurant management system** on top of the hotel app — nothing hardcoded, everything configurable from Settings.

# Scope (what we will build)

**1. Tables & Sessions**
- Floor plan view (drag/arrange tables, areas: Main Hall / Terrace / VIP — defined in settings)
- Table session lifecycle: open → add orders → split/merge → bill → pay → close → cleaning → free
- Transfer items between tables, merge checks, split by seat / by item / by % / equal split
- Reservations linked to tables (date/time, party size, status, waitlist)

**2. Menu, Modifiers, Courses**
- Categories (already exist) + modifier groups (size, sugar, spice, extras) with price deltas
- Course firing: Starter / Main / Dessert / Drinks — auto-route to kitchen vs bar
- Item availability toggle (86'd items), happy-hour pricing windows

**3. Ingredient & Recipe Management (full)**
- `hotel_ingredients` already exists — add UI: stock in/out, suppliers, units, par levels, low-stock alerts
- Recipes per menu item with auto stock deduction on KOT fire
- Waste log, stock-take sheets, ingredient cost → live menu margin

**4. Billing & Waiter Payment Flow**
- One-tap pay on the bill from the waiter screen (cash / MoMo / card / room-charge / split)
- Tip capture per payment, change due calculation
- Reprint bill, void with reason + manager PIN, refund flow

**5. Takeaway & Delivery**
- New order type: dine-in / takeaway / delivery
- Customer capture (name, phone), pickup time, delivery address & rider assignment
- Takeaway queue screen for counter staff, SMS/print pickup ticket

**6. Staff, Shifts, Loans (restaurant-aware)**
- Hook existing `hotel_staff`, `hotel_staff_shifts`, `customer_loans` into a Staff module: profiles, roles, schedules, attendance from shifts, payroll prep
- Staff loans/advances with deduction plan, signed PDF acknowledgement, repayment history

**7. Dynamic Printing (58mm / 80mm)**
- Single print engine that takes `paperWidth: 58 | 80` from settings
- Templates: KOT, Bar ticket, Customer bill, Pickup ticket, Shift Z-report
- Auto-detect printer width per station, ESC/POS-friendly HTML, browser print fallback

**8. Settings (no hardcoding)**
- Restaurant settings page: outlet name, tax rules, service charge %, tip suggestions, currency, areas, table layout, modifier groups, courses, printer assignments (kitchen/bar/cashier + 58/80mm), receipt header/footer, payment methods, takeaway lead time, delivery zones & fees
- All values consumed via `SettingsProvider` — no string literals in components

# Technical notes (dev-only)

- DB additions: `hotel_reservations`, `hotel_modifier_groups`, `hotel_modifiers`, `hotel_service_item_modifiers`, `hotel_takeaway_orders` (or `order_type` enum + `pickup_at`/`delivery_*` cols on `hotel_orders`), `hotel_ingredient_suppliers`, `hotel_ingredient_stock_movements`, `hotel_waste_log`, `hotel_printer_config`, `hotel_restaurant_settings` (jsonb). Extend `hotel_tables` with `area_id`, `pos_x`, `pos_y`. Add `course` to `hotel_order_items`.
- New UI routes under `/hotel/restaurant/*`: `tables`, `reservations`, `takeaway`, `ingredients`, `recipes`, `modifiers`, `printers`. Existing `/hotel/pos`, `/hotel/kitchen`, `/hotel/bar`, `/hotel/service-menu` stay and are upgraded.
- Print engine: `src/lib/print/escpos.ts` with `renderTicket({ template, width, data })`.

# Suggested delivery order (each step = one shippable batch)

1. **Settings foundation** — restaurant settings table + UI, printer config, no-hardcode tokens.
2. **Dynamic 58/80mm print engine** + retrofit KOT/Bill/Pickup.
3. **Tables + sessions + split/merge/transfer**, waiter one-tap pay.
4. **Modifiers + courses + 86'd items + happy hour**.
5. **Ingredients full management + recipes + waste + low-stock alerts**.
6. **Takeaway/Delivery flow + queue screen**.
7. **Reservations + waitlist**.
8. **Staff module polish + loans/advances + payroll prep**.

# Open question

Do you want me to ship **all 8 batches in sequence now**, or pick a starting batch (recommended: **Batch 1 Settings + Batch 2 Printing** first, since everything else depends on them)?
