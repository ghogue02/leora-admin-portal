# CARLA Call Plan – Missing Features Implementation Plan

## Objective
- Deliver the remaining 30 % of CARLA Section 3 (Call Plan) capabilities and reach feature parity with the original call-plan specification.
- Ship production-grade UX for desktop and mobile, backed by robust scheduling, territory, and suggestion logic.
- Maintain existing CARLA workflows while introducing richer scheduling, multi-week planning, and intelligent automation.

## Current State Snapshot
- **Scheduling UI**: Weekly grid (`WeeklyCallPlanGrid.tsx`) shows tasks but lacks time-slot drag‑drop, auto-save, and calendar-sync alignment.
- **Data Layer**: Prisma schema has `CallPlan`, `CallPlanAccount`, `CallPlanActivity`, and `WeeklyCallPlanAccount` but no dedicated scheduled slots, territory blocks, or recurring records.
- **APIs**: `/api/sales/call-plan/carla/**` covers accounts, filters, territory lookup, and calendar sync but assumes week-level plans.
- **Mobile**: `MobileOptimizedView.tsx` provides swipe interactions but no drag‑drop, offline caching, or simplified calendar view.
- **Testing**: Integration/E2E placeholders exist; coverage for scheduling, territory, and suggestions is currently missing.

## Milestone Timeline (5 Weeks)
| Week | Workstream | Key Deliverables |
| --- | --- | --- |
| 1 | Priority 1 – Calendar drag-drop & persistence | New calendar component, schedule API, migrations |
| 2 | Priority 2 – Territory blocking & routing | Territory UI, optimizer logic, supporting APIs |
| 3 | Priority 3 – Multi-week planning & recurring | Header enhancements, recurring component, data model |
| 4 | Priority 4/5/6 – Conversion, suggestions, mobile | Time-slot converter, suggestion engine, touch UX |
| 5 | Hardening & QA | Regression coverage, performance validation, polish |

---

## Cross-Cutting Foundations
- **Database**: Add Prisma models (`CallPlanSchedule`, `TerritoryBlock`, `RecurringCallPlan`) plus supporting indexes/foreign keys. Ensure `tenantId` is present on new tables for multitenancy and cascade deletes match existing conventions.
- **Migrations**: Create three SQL migrations (one per new table) inside `web/prisma/migrations`. Update `schema.prisma` + regenerate Prisma client. Coordinate with Supabase migration files if external environments rely on SQL scripts.
- **API Contracts**: Use Next.js route handlers under `/web/src/app/api/sales/call-plan/carla/**`. Leverage zod validation, existing `withTenantAuth` helpers, and consistent error responses.
- **State Management**: Prefer React Query for async data (already used in CARLA). Co-locate queries/hooks under `web/src/app/sales/call-plan/carla/hooks`.
- **Analytics & Audit**: Add lightweight logging (e.g., `console.info` placeholder or existing `trackEvent` util) around critical schedule changes for observability.
- **Permissions**: Enforce tenant + user ownership checks when mutating schedules, territory blocks, or recurring rules.
- **Testing Strategy**: Expand Vitest integration tests for pure logic (optimizers, suggesters) and Playwright E2E for drag‑drop & mobile flows. Mock Prisma in API route tests when possible.

---

## Priority 1 – Calendar Drag-and-Drop Scheduling (Week 1)

### Goals
- Interactive weekly time-grid (Mon–Fri, 08:00–18:00) with 30-minute slots.
- Drag accounts from sidebar into calendar; show hover feedback and snap to slot.
- Persist drops immediately via auto-save API and reflect changes in UI + calendar sync.

### Frontend Deliverables
- **`DragDropCalendar.tsx` (new)**: Wrap FullCalendar (`@fullcalendar/timegrid`, `@fullcalendar/interaction`) configured with business hours, slotDuration `00:30:00`, and external drag sources.
  - Reuse logic from `/web/src/app/sales/calendar/components/CalendarView.tsx` to avoid duplicating drag handlers.
  - Accept props: `weekStart`, `callPlanId`, `accounts`, `onScheduleChange`.
  - Highlight drop zones via `eventOverlap` + custom `dropAccept` styling; show ghost event while dragging.
- **Sidebar Integration**:
  - Extend existing account list (likely `AccountList.tsx` / `DraggableAccount`) to expose draggable dataset for the CARLA view.
  - Display scheduled state (e.g., checkmark) and provide context menus for edit/delete.
- **Autosave UX**:
  - Use optimistic updates with React Query mutation (`useMutation`).
  - Show toast via `sonner` on success/failure.
- **Schedule Display**:
  - Render events from `CallPlanSchedule` with color-coded durations.
  - Support drag within calendar to reschedule; call `PATCH` on drop.

### Backend & API
- **Model**: `CallPlanSchedule` (id `cuid`, `tenantId`, `callPlanId`, `customerId`, `scheduledDate` (`DateTime`), `scheduledTime` (`String` or derived), `duration`, `createdAt`, `updatedAt`).
  - Consider computed `scheduledAt` timestamp for easier indexing.
  - Add unique constraint (`tenantId`, `callPlanId`, `customerId`, `scheduledDate`, `scheduledTime`) to prevent duplicates.
- **Routes**:
  - `POST /api/sales/call-plan/carla/schedule`: create record; validate slot free; return updated schedule list.
  - `GET /api/sales/call-plan/carla/schedule/[callPlanId]`: list week schedule with joined customer metadata.
  - `PATCH /api/sales/call-plan/carla/schedule/[id]`: reschedule or adjust duration.
  - `DELETE /api/sales/call-plan/carla/schedule/[id]`: remove item.
  - Use Prisma transactions to ensure `CallPlanAccount` remains consistent (example: flag `scheduledAt` on related record).
- **Calendar Sync**:
  - Update `/web/src/app/api/sales/call-plan/carla/calendar/sync/route.ts` to map `CallPlanSchedule` entries into provider-specific event payloads (see Priority 1.2 below).
- **Seed & Fixtures**:
  - Extend `seed.ts` / `seed-tags.ts` to create sample schedules for demos.

### Calendar Sync Enhancement (Priority 1.2)
- Read `CallPlanSchedule` data for event creation; compute ISO start/end using `scheduledDate` + `scheduledTime` + `duration`.
- Implement timezone conversions (use tenant/user timezone setting if stored; fallback to `America/New_York`).
- Batch event creation by provider (use Google batch or Microsoft Graph `createEvent` loops with throttling).
- Store sync metadata (e.g., `lastSyncedDuration`) on schedule to avoid duplicates.

### Testing
- **Integration (Vitest)**: Mock Prisma to verify schedule creation rules, slot collision prevention, timezone conversion helpers.
- **Playwright**: Extend `05-carla-complete-workflow.spec.ts` to drag account into slot and verify persistence + calendar sync toast.

### Risks & Mitigations
- Timezone drift → add unit tests for conversions and align with existing `calendar-sync` utils.
- Performance with many events → paginate GET by week and limit to 100 entries per call plan.

---

## Priority 2 – Territory Blocking & Route Planning (Week 2)

### Goals
- Assign territories to weekdays (all-day or partial blocks).
- Overlay territory colors on calendar; filter accounts accordingly.
- Provide route optimization hints based on geography and drive time.

### Frontend Deliverables
- **`TerritoryBlocker.tsx` (new)**:
  - Drag/drop list of territories onto weekday columns.
  - Visual overlay above `DragDropCalendar` showing active territory + hours.
  - Inline editor to adjust `startTime`/`endTime` for partial blocks.
  - Connect to territory data from `/api/sales/call-plan/carla/territory/**`.
- **Calendar Overlay**:
  - When block active, dim accounts outside territory and restrict drop (show tooltip).
  - Provide filter chip to toggle territory overlay.
- **Account Filtering**:
  - Update fetch layer to include territory filter; reuse existing `TerritoryFilter.tsx`.

### Backend & API
- **Model**: `TerritoryBlock` (id `cuid`, `tenantId`, `callPlanId`, `territory`, `dayOfWeek`, `allDay`, `startTime`, `endTime`, timestamps).
- **Routes**:
  - `POST /api/sales/call-plan/carla/territory-blocks` (create/update).
  - `GET /api/sales/call-plan/carla/territory-blocks/[callPlanId]`.
  - `DELETE /api/sales/call-plan/carla/territory-blocks/[id]`.
  - Validate territory exists (`Territory` table) and belongs to tenant.
- **Territory Optimizer (`/web/src/lib/call-plan/territory-optimizer.ts`)**:
  - Group accounts by `customer.territory`.
  - Use Mapbox (already configured) or Turf to compute centroid + pairwise drive time approximations.
  - Suggest day assignments minimizing route overlap; return summary text (e.g., “All Leesburg accounts on Monday saves 2 hours”).
  - Expose function for UI + API reuse.
- **API Endpoint**:
  - `GET /api/sales/call-plan/carla/territory/suggestions?callPlanId=…`.
  - Response includes recommended day, estimated travel savings, list of accounts.

### Testing
- Unit tests for optimizer (feed sample coordinates).
- Integration test ensuring territory blocks restrict schedule creation (simulate API call).
- Playwright scenario: assign territory to Tuesday, drop account outside territory, expect validation toast.

### Risks & Mitigations
- Missing geo-coordinates: fall back to city/state average; log warnings.
- Drag accuracy on desktop/mobile: reuse existing DnD utils; provide accessible keyboard fallback.

---

## Priority 3 – Multi-Week Planning (Week 3)

### Goals
- Navigate 2–3 weeks ahead, reuse prior week plan, and manage recurring visits.
- Auto-populate future call plans using recurrence rules.

### Frontend Deliverables
- **`CallPlanHeader.tsx`**:
  - Add “Plan 2–3 Weeks Out” toggle; when enabled, show week navigator (arrow buttons + date picker).
  - Provide quick action “Copy last week” that clones schedules & territory blocks (calls new API).
  - Display recurrence indicator when week auto-filled.
- **`RecurringSchedule.tsx` (new)**:
  - Form to mark account frequency (`weekly`, `biweekly`, `monthly`) with optional `dayOfWeek`, `preferredTime`.
  - Manage recurrence exceptions (skip next occurrence).
  - Show badges on scheduled accounts and upcoming auto-generated visits.
- **Multi-week view**:
  - Optionally render stacked calendars or timeline view (two weeks) when toggle on.
  - Ensure performance by reusing `DragDropCalendar` but with dynamic `weekStart`.

### Backend & API
- **Model**: `RecurringCallPlan` (id `cuid`, `tenantId`, `customerId`, `frequency`, `dayOfWeek`, `preferredTime`, `active`).
- **Routes**:
  - `POST /api/sales/call-plan/carla/recurring` (create/enable).
  - `PATCH /api/sales/call-plan/carla/recurring/[id]` (update/skip/disable).
  - `GET /api/sales/call-plan/carla/recurring?customerId=…`.
- **Auto-Population Service**:
  - Cron/job or on-demand endpoint `POST /api/sales/call-plan/carla/recurring/populate` to generate `CallPlanSchedule` entries for upcoming weeks.
  - Handle collisions (if manual schedule exists, skip or ask user).
- **Copy Previous Week**:
  - Endpoint reuses `RecurringCallPlan` logic to duplicate schedule and territory blocks, adjusting dates.

### Testing
- Unit: recurrence generator (assert weekly/biweekly/monthly outputs).
- Integration: copy-week API duplicates records without duplicates.
- Playwright: toggle multi-week, copy plan, verify events appear in next week.

### Risks & Mitigations
- Duplicate schedules: add DB unique constraints & transaction-level checks.
- User confusion: highlight auto-generated events vs manual with badges.

---

## Priority 4 – All-Day Event to Time Slot Conversion (Week 4)

### Goals
- Detect all-day events pulled from calendar sync and convert to precise slots with smart suggestions.

### Frontend Deliverables
- **`TimeSlotConverter.tsx` (new)**:
  - List all-day events with metadata (territory, priority, historical visit time).
  - Provide “Convert” button -> open modal with suggested time(s) from backend.
  - Allow manual override, commit via schedule API.
  - Show reason text (“Based on past visits at 10 AM, territory Leesburg”).
- Integrate into calendar sidebar or separate panel within CARLA view.

### Backend Logic
- Extend calendar sync route to flag imported all-day events and store raw data (maybe as `allDay`, `sourceEventId` on `CallPlanSchedule` or companion table).
- Implement suggestion utility leveraging:
  - Territory blocks (if Monday Leesburg -> suggest midday).
  - Account priority (higher priority earlier in day).
  - Historical `CallPlanActivity` timestamps.
- Add endpoint `POST /api/sales/call-plan/carla/convert-all-day` that accepts event id and desired slot.

### Testing
- Integration: conversion algorithm returns deterministic suggestion.
- Playwright: convert event, verify event appears on calendar with correct duration.

### Risks & Mitigations
- Missing history: fallback to 10 AM default and warn user.
- Sync conflicts: mark converted events as `sourceEventId` to avoid re-creation on next sync.

---

## Priority 5 – Auto-Suggestions from Reports (Week 4)

### Goals
- Surface dormant/high-value accounts directly inside CARLA with clear justification.

### Backend Deliverables
- **`/web/src/lib/call-plan/account-suggester.ts`**:
  - Query accounts filtered by `lastOrderAt`, `priorityTier`, `territory`.
  - Score formula: `score = revenue_weight * log(annualRevenue+1) + days_since_last_order_weight + frequency_weight`.
  - Provide explanation strings (“No order in 45 days, $15k established revenue”).
  - Accept parameters `week`, `year`, `territory`, `limit`.
- **API Route**: `GET /api/sales/call-plan/carla/suggestions?week=…&year=…`.
  - Combine account suggester output with territory optimizer results for richer context.
  - Support `dismiss` via `POST /api/sales/call-plan/carla/suggestions/dismiss`.

### Frontend Deliverables
- **`SuggestedAccounts.tsx` (new)**:
  - Panel listing suggestions with reason, score, CTA buttons for “Add to plan” or “Dismiss”.
  - On add → call schedule API or queue for manual placement.
  - Show tags for 30/60/90-day dormancy.
- Integrate with reporting overlays (mid-month, end-month), using React Query.

### Testing
- Unit: account scoring thresholds.
- Integration: API returns expected shape, respects filters.
- Playwright: Accept/dismiss suggestion flows.

### Risks & Mitigations
- Data freshness: ensure nightly job populates `annualRevenue`, `lastOrderAt`. If not, add fallback queries.
- Overwhelming suggestions: cap results to top 10 and allow filters.

---

## Priority 6 – Mobile/iPad Enhancements (Week 4)

### Goals
- Deliver touch-first drag-drop and simplified mobile planning UI with offline resilience.

### Frontend Deliverables
- **`MobileOptimizedView.tsx` Enhancements**:
  - Introduce touch drag handles (min 44 px).
  - Implement long-press detection before drag (`pointerdown` + timers).
  - Hook into new calendar state to allow drag onto condensed day timeline.
  - Trigger haptic feedback (`navigator.vibrate`) on drop (when available).
- **Offline Support**:
  - Add IndexedDB cache via `idb` or `dexie` (add dependency) to store schedule + suggestions.
  - Sync queue when connection restored (background fetch or `useEffect` watcher).
- **Gesture Navigation**:
  - Use `react-swipeable` or custom handlers for week swipe left/right.
- **`/web/src/app/sales/call-plan/carla/mobile/page.tsx`**:
  - Provide day-focused view with summary cards, quick contact buttons.
  - Use modals for account details; integrate direct call/text/map actions.
  - Add PWA prompts (manifest, service worker config if not already).

### Testing
- Manual + automated tests using Playwright mobile projects (`Mobile Chrome`, `Mobile Safari`).
- Unit: offline cache utilities with Vitest + IndexedDB mock.

### Risks & Mitigations
- Offline conflicts: use client-generated UUID + sync queue with conflict resolution (prefer server data).
- Haptics inconsistent across browsers: degrade gracefully; guard with feature detection.

---

## Database Migration Plan
1. **`add_call_plan_scheduling.sql`**: Create `CallPlanSchedule`, indexes (`callPlanId`, `scheduledDate`, `customerId`), foreign keys to `CallPlan`, `Customer`, `Tenant`. Add `ON DELETE CASCADE`.
2. **`add_territory_blocking.sql`**: Create `TerritoryBlock` with indexes on `callPlanId`, `dayOfWeek`.
3. **`add_recurring_schedules.sql`**: Create `RecurringCallPlan`, indexes on `customerId`, `frequency`, `active`.
4. Mirror migrations in Prisma schema and run `pnpm prisma generate`/`npm run prisma:generate`.
5. Update Supabase SQL scripts (`supabase-migration.sql`, `supabase-migration-SAFE.sql`) to keep environments aligned.
6. Add rollback guidance (DROP TABLE statements) in manual migration docs.

---

## Testing & QA Roadmap
- **Integration Tests** (`/web/tests/integration`):
  - `call-plan-drag-drop.test.ts`: cover create/reschedule/delete schedule entries, collision detection, timezone conversions.
  - `territory-blocking.test.ts`: ensure blocks restrict scheduling, optimizer returns deterministic recommendations.
  - `call-plan-suggestions.test.ts`: assert scoring output and dismissal persistence.
- **E2E** (`/web/tests/e2e/05-carla-complete-workflow.spec.ts`):
  - Extend to cover drag-drop, territory assignment, recurring scheduling, suggestion acceptance, mobile workflow.
  - Add accessibility checks (focus states, keyboard nav).
- **Performance**:
  - Optional Playwright trace for drag-drop responsiveness; ensure <100 ms UI blocking.
- **Manual QA Checklists**:
  - Update `FRONTEND_AGENT_TEST_CHECKLIST.md` and `ADMIN_BUGS_FIXED.md` with new scenarios.

---

## Deployment & Change Management
- Feature flag multi-week + suggestions via environment variable (e.g., `NEXT_PUBLIC_CARLA_MULTI_WEEK=true`) for phased rollout.
- Update documentation:
  - `web/docs/calendar-sync-setup.md` with new schedule references.
  - `docs/CUSTOMER_TAGGING_DEPLOYED.md` cross-link where relevant.
- Communicate migrations with ops; ensure backups before deploying new tables.
- Provide training material / loom for sales team demonstrating new workflows.

---

## Success Metrics & Validation
- **Scheduling**: ≥95 % of accounts scheduled via drag‑drop without manual edits; capture term in analytics.
- **Territory Efficiency**: Track reported drive-time savings; goal ≥2 hrs saved per rep weekly.
- **Planning Horizon**: 80 % of active call plans have >1 future week scheduled.
- **Conversion Tool**: ≤10 % of all-day events remain unconverted after 24 hrs.
- **Suggestions Adoption**: ≥70 % of suggestion cards acted on (add or dismiss) weekly.
- **Mobile**: PWA offline success rate ≥90 % in QA scenarios.

---

## Open Questions / Follow-Ups
- Confirm tenant timezone source (user profile vs tenant setting) for schedule conversions.
- Decide on collision policy when recurring rule overlaps with manual schedule.
- Determine requirement for audit trail of schedule changes (if yes, add log table).
- Validate data volume expectations to size IndexedDB cache and API pagination.

---

## Implementation Order (Recap)
1. **Week 1**: Calendar drag-drop + CallPlanSchedule migration + calendar sync update.
2. **Week 2**: Territory blocking UI, TerritoryBlock model, optimizer logic & APIs.
3. **Week 3**: Multi-week navigation, RecurringCallPlan model, auto-population workflows.
4. **Week 4**: All-day conversion, auto-suggestions, mobile/iPad enhancements.
5. **Week 5**: Comprehensive testing, polish, rollout checklist, documentation updates.

Following this plan will elevate CARLA’s call planning to full specification coverage with a production-ready scheduling experience across desktop and mobile.
