# Mobile Responsiveness Audit & Rollout Plan

## CRM-48 Scope Update
- CRM-48 now targets *full responsive parity* across the existing CRM—no forked “mobile app” UI.
- Goals: touch-friendly tap targets, adaptive layouts from 320px phones up through desktop, and identical functionality without feature gating.

## Audit Strategy
1. **Viewport Matrix**
   - Test breakpoints: 320, 375, 414, 768, 1024, 1280 px using Chrome dev tools + real iPhone/iPad + Pixel.
   - Capture screenshots / notes per screen in `docs/mobile-audit/`.
2. **Critical Journeys**
   - Login + auth flows
   - Sales dashboard + analytics cards
   - Order entry (sample + storage invoices)
   - Account + contact management
   - Notes/activities & supplier workflows
3. **Component Checklist**
   - Navigation (sidebar/header), tables, cards, forms, modals, toasts, charts.
   - Verify spacing, typography scale, and touch targets (min 44px).
4. **Performance + Interaction**
   - Measure bundle load over LTE (Chrome throttling) to ensure <3s TTI on mobile.
   - Validate gestures (scroll, swipe within tables) and keyboard behaviors.
5. **Accessibility Sweep**
   - Use Lighthouse + axe to confirm contrast, focus order, and screen-reader labels remain valid on small screens.

## Implementation Plan
1. **Design Tokens & Layout**
   - Introduce responsive spacing/typography tokens in `src/theme` with CSS clamp() helpers.
   - Convert fixed-width wrappers to fluid grid/flex containers; enforce max-width only at desktop breakpoints.
2. **Navigation Refactor**
   - Collapse sidebar → drawer on <1024px, add top-level quick actions, ensure keyboard + gesture support.
3. **Data Visualization**
   - Replace multi-column dashboards with stacked cards; switch charts to responsive containers using ResizeObserver.
4. **Order Entry Optimization**
   - Reflow multi-step forms into accordion/stepper pattern; persist context in sticky footer for totals/actions.
5. **Testing & Rollout**
   - Add Playwright viewport suite (phones + tablet) to CI.
   - Smoke test on physical devices before marking CRM-48 complete.
6. **Documentation & Training**
   - Update README-SALES-PORTAL.md and training videos to highlight “single responsive experience”.

## Next Actions
1. Stand up audit tracking doc (checklist + screenshots) and assign owners per feature area.
2. Timebox a 2-day audit sprint, then convert findings into Jira subtasks under CRM-48.
3. Schedule responsive refactor work in two phases: nav + layout (Week 1), forms + charts (Week 2).

## Audit Sprint Schedule
- **Day 1 Morning:** Dashboard, navigation, and global layout pass (Greg).
- **Day 1 Afternoon:** Order entry + invoices on phones/tablets (Travis).
- **Day 2 Morning:** Accounts/notes/supplier workflows + accessibility sweeps (Greg).
- **Day 2 Afternoon:** Performance throttling runs, capture remaining screenshots, consolidate findings (Travis).
- End-of-day retro: pick top issues per area and turn them into subtasks with acceptance criteria.

## Proposed CRM-48 Subtasks
1. **CRM-48A – Responsive Layout Tokenization**: introduce clamp-based spacing/typography scale.
2. **CRM-48B – Navigation Drawer & Header Controls**: collapse sidebar, add touch-friendly nav.
3. **CRM-48C – Data Card & Table Reskin**: stacked cards, horizontal scroll affordances, sticky headers.
4. **CRM-48D – Order Entry Flow Adjustments**: accordion/stepper, sticky action footer, numeric keypad inputs.
5. **CRM-48E – Chart / Dashboard Responsiveness**: responsive containers, simplified tooltips, reduced legend clutter.
6. **CRM-48F – Mobile Regression Tests**: Playwright viewport suite + Lighthouse CI budget for mobile.

## Implementation Log
- **2025-11-12:** CRM-48A groundwork live – global fluid spacing/touch utilities in `web/src/app/globals.css`, sales layout gutters (`web/src/app/sales/layout.tsx`), nav safe-area adjustments (`web/src/app/sales/_components/SalesNav.tsx`), and first responsive consumers (`web/src/app/sales/dashboard/page.tsx`, `web/src/app/sales/orders/new/page.tsx`) using the shared shell.
- **2025-11-12:** Extended responsive shell to high-traffic pages (`web/src/app/sales/activities/page.tsx`, `web/src/app/sales/orders/[orderId]/page.tsx`) plus new `surface-card` treatments for stats, forms, and sidebars.
- **2025-11-12:** Orders list + reports workspace (`web/src/app/sales/orders/page.tsx`, `web/src/app/sales/reports/page.tsx`) now share layout utilities and card wrappers so the nav spacing + filter panels stay consistent on smaller screens.
- **2025-11-12:** Manager dashboard + scheduled reports panel (`web/src/app/sales/manager/page.tsx`, `web/src/app/sales/reports/modules/ScheduledReportsPanel.tsx`) refreshed with the same shell, touch targets, and surface cards; manager data is now typed to drop lingering `any`.
- **2025-11-12:** Manager approvals + call plan workspace (`web/src/app/sales/manager/approvals/page.tsx`, `web/src/app/sales/call-plan/page.tsx`) converted to the responsive shell, with stats/orders/cards using surface-card and Suspense fallbacks updated for mobile users.
- **2025-11-12:** Sample analytics + delivery tracking (`web/src/app/sales/analytics/samples/page.tsx`, `web/src/app/sales/operations/delivery-tracking/page.tsx`) now share the responsive shell, touch-target controls, and typed data loaders, covering insights + ops tooling.
- **2025-11-12:** Pick sheet management (`web/src/app/sales/operations/pick-sheets/page.tsx`) moved into the shared shell with responsive stats, filters, and generator panel so warehouse workflows match CRM-48A expectations.
- **2025-11-12:** Territory analytics + operations queue (`web/src/app/sales/territories/analytics/page.tsx`, `web/src/app/sales/operations/queue/page.tsx`) refit with the shared shell, memoized loaders, and surface-card sections so insights and bulk ops behave on mobile.
- **2025-11-12:** Ops routing + locations (`web/src/app/sales/operations/routing/page.tsx`, `web/src/app/sales/operations/locations/page.tsx`) now mirror the responsive shell with typed loaders, touch-target controls, and consistent cards.
- **2025-11-12:** CRM-48B kickoff – mobile nav drawer now locks background scroll, closes on route change, and uses modal overlay for better accessibility (`web/src/app/sales/_components/SalesNav.tsx`).
- **2025-11-12:** CRM-48C scaffolding – introduced `ResponsiveCard`/`ResponsiveTable` components and migrated territory analytics to them for consistent tables/charts (`src/components/ui/responsive-card.tsx`, `src/components/ui/responsive-table.tsx`, `web/src/app/sales/territories/analytics/page.tsx`).
- **2025-11-12:** CRM-48C adoption – sample analytics now uses the responsive card/table primitives for filters, stats, charts, and supplier report (`web/src/app/sales/analytics/samples/page.tsx`).
- **2025-11-12:** CRM-48C adoption – operations queue list view uses `ResponsiveCard` for filters, bulk actions, and order cards (`web/src/app/sales/operations/queue/page.tsx`).
- **2025-11-12:** CRM-48C adoption – pick sheet detail view uses `ResponsiveCard` for progress + nav to keep detail flows consistent (`web/src/app/sales/operations/pick-sheets/[sheetId]/page.tsx`).
- **2025-11-12:** CRM-48C adoption – routing stats/export list and warehouse locations filtering now use `ResponsiveCard` primitives (`web/src/app/sales/operations/routing/page.tsx`, `web/src/app/sales/operations/locations/page.tsx`).
- **2025-11-12:** CRM-48C adoption – sales admin workspace (rep management, customer assignments, product goals) now lives inside `ResponsiveCard`/`ResponsiveTable` shells so ops leads can manage staffing on phones (`web/src/app/sales/admin/page.tsx` and `sections/*`).
- **2025-11-12:** CRM-48C adoption – job queue monitor uses responsive stats, filters, bulk actions, and tables for background operations (`web/src/app/sales/admin/jobs/page.tsx` + `_components`).
- **2025-11-12:** CRM-48C adoption – admin pricing catalog grid now renders as responsive cards with touch-friendly CTAs and empty-state guidance (`web/src/app/admin/inventory/pricing/page.tsx`).
- **2025-11-13:** CRM-48D kickoff – direct order entry now uses accordion sections with status pills, numeric keypad hints, and a sticky action footer that surfaces totals + validation context (`web/src/app/sales/orders/new/page.tsx`).
- **2025-11-13:** CRM-48D completion – the edit order flow mirrors the responsive accordion/sticky-footer experience so updates behave the same on phones (`web/src/app/sales/orders/[orderId]/edit/page.tsx` + `@/components/orders/OrderFormLayout`).
- **2025-11-13:** CRM-48E progress – key charts now render inside ResizeObserver-driven shells with mobile-friendly legends (`web/src/app/sales/analytics/samples/sections/ConversionChart.tsx`, `web/src/app/sales/manager/components/RevenueForecast.tsx`, `web/src/app/sales/manager/components/PerformanceComparison.tsx`, and `@/components/ui/responsive-chart-container.tsx`).
- **2025-11-13:** CRM-48F coverage – mobile Playwright suite (`npm run test:e2e:mobile`) runs automatically via `.github/workflows/mobile-regression.yml`, uploading reports on failure.

## CRM-48B–F Subtask Plan
1. **CRM-48B – Navigation Drawer & Header Controls (Jira: CRM-67)**
   - Audit `SalesNav` + admin nav components for focus states and sticky behavior.
   - Implement slide-in drawer animation + aria attributes; ensure nav uses new spacing tokens.
2. **CRM-48C – Card/Table Reskin (Jira: CRM-68)**
   - Define shared table/card components under `src/components/ui/responsive-card`.
   - Update analytics tables (territories, samples, reports) to use new components with horizontal scrolling affordances.
3. **CRM-48D – Order Entry Flow Adjustments (Jira: CRM-69)**
   - Break the `/sales/orders/new` form into accordion segments with sticky action footer.
   - Review validation summary + keypad input sizes; add numeric keyboard hints on mobile.
4. **CRM-48E – Chart & Dashboard Responsiveness (Jira: CRM-70)**
   - Refactor dashboard charts to use ResizeObserver + `aspect-auto`.
   - Simplify legends/tooltips on narrow viewports; document fallback tables when charts collapse.
5. **CRM-48F – Mobile Regression Suite (Jira: CRM-71)**
   - Add Playwright projects for iPhone 14/Pixel 7.
   - Capture per-page screenshot baselines for nav, dashboard, order entry, analytics.
   - Wire Lighthouse CI (mobile config) into `package.json` for key routes.

## CRM-48D – Order Entry Readiness Plan
- Break `/sales/orders/new` (and edit) into accordion sections that mirror HAL workflow; ensure each section can collapse/expand independently on mobile while persisting context state.
- Introduce a sticky action footer with order totals, primary/secondary CTAs, and validation summaries so reps always see next steps even when the keyboard is open.
- Annotate numeric inputs (quantity, fees, PO numbers) with `inputmode` + `pattern` hints so iOS/Android show the correct keypad and do not hide the CTA footer.
- Surface inline validation + toast summaries inside each accordion panel to minimize scroll-back on smaller screens.
- Pair UX changes with telemetry hooks (e.g., time-in-section, accordion toggles) to validate that the new flow removes tap-lag and supports CRM-48F regression scripts.
