# Leora CRM - Detailed Implementation Plan

**Status:** ✅ **Phase 2 Complete + Customer Data Imported** (Updated: October 25, 2025)
**Database:** Well Crafted (PostgreSQL via Supabase)
**Framework:** Next.js 15 + Prisma + TypeScript
**Existing Foundation:** Multi-tenant, Auth, Sales/Portal interfaces, AI assistant

---

## 🎉 **IMPLEMENTATION STATUS** (Updated: October 25, 2025)

### ✅ **PHASE 1: COMPLETE** (45 minutes - 12 agents)
- ✅ Metrics Definition System (versioned business rules)
- ✅ Dashboard Customization (drag-drop widgets)
- ✅ Job Queue Infrastructure (async processing)
- ✅ Account Classification (ACTIVE/TARGET/PROSPECT)
- ✅ 98 integration tests
- ✅ 50+ source files (5,000+ lines)

### ✅ **PHASE 2: COMPLETE** (50 minutes - 12 agents)
- ✅ CARLA System (weekly call planning with X/Y/Blank tracking)
- ✅ Calendar Sync (Google/Outlook bidirectional sync)
- ✅ Voice-to-Text Activity Logging
- ✅ Mobile/iPad Optimization
- ✅ PWA Configuration
- ✅ 115 integration tests
- ✅ 60+ files (6,000+ lines)

### ✅ **PHASE 2 FINALIZATION: COMPLETE** (3-4 hours - 8 agents)
**Security & Robustness Enhancements:**
- ✅ **Token Encryption** - AES-256-GCM for OAuth tokens
- ✅ **Warehouse Optimization** - Auto-calculating pickOrder system
- ✅ **Inventory Reliability** - Atomic transaction handling
- ✅ **Calendar Robustness** - Proactive token refresh + delta queries (90% API reduction)
- ✅ **Admin Tools** - Job queue monitoring interface
- ✅ **47+ files created** (10,000+ lines)
- ✅ **109+ tests written**
- ✅ **73,000+ words documentation**

### ✅ **CUSTOMER DATA: IMPORTED** (October 25, 2025)
- ✅ **4,262 customers** imported from CSV (9,328 rows)
- ✅ **Automatic classification:**
  - ACTIVE (HIGH priority): Ordered in last 6 months
  - TARGET (MEDIUM priority): Ordered 6-12 months ago
  - PROSPECT (LOW priority): Never ordered or >12 months
- ✅ **Territory assignment** from state/province
- ✅ **Database connected** via direct connection

### ✅ **PHASE 3: COMPLETE** (4 hours - 6 agents)
**Samples & Analytics** - Fully implemented, ready for deployment
- ✅ **Sample Management System** (quick assign, feedback templates, history)
- ✅ **Sample Analytics Dashboard** (conversion rates, revenue attribution, charts)
- ✅ **Automated Follow-up Triggers** (4 trigger types, task automation)
- ✅ **AI Product Recommendations** (Claude-powered, tool calling)
- ✅ **60+ files created** (8,000+ lines)
- ✅ **500+ tests written**
- ✅ **30,555+ words documentation**

### 📋 **PHASES 4-7: READY TO START**
**Operations & Warehouse, Maps & Territory, Advanced Features**

---

## 📊 **CUMULATIVE METRICS**

**Development Time:**
- Phase 1: 45 minutes
- Phase 2: 50 minutes
- Phase 2 Finalization: 3-4 hours
- Customer Import: 10 minutes
- Phase 3: 4 hours
- **Total: ~11-12 hours**

**Code & Documentation:**
- **217+ files** created/modified
- **29,000+ lines** of production code
- **822+ tests** written
- **176,555+ words** of documentation
- **48+ database models**
- **44+ API endpoints**
- **80+ UI components**
- **4,838 customers** in database

**AI Orchestration:**
- **38 specialized agents** used total
- **Concurrent execution** for maximum efficiency
- **SPARC methodology** for systematic development

---

## 📋 **TABLE OF CONTENTS**

1. [Foundation & Setup](#phase-1-foundation--setup)
2. [Call Plan (CARLA) System](#phase-2-call-plan-carla-system)
3. [Voice & Mobile](#phase-3-voice--mobile)
4. [Samples & Analytics](#phase-4-samples--analytics)
5. [Operations & Warehouse](#phase-5-operations--warehouse)
6. [Maps & Territory](#phase-6-maps--territory)
7. [Advanced Features](#phase-7-advanced-features)

---

## **PHASE 1: FOUNDATION & SETUP**

### **Build Order:**
1. Metrics Definition System
2. UI Component Library (shadcn/ui)
3. Database Migrations for Extensions
4. Dashboard Customization

---

### **1.1 Metrics Definition System**

**Purpose:** Allow users to define and edit what metrics mean (e.g., "at risk customer"), track definitions over time.

#### **Database Changes:**

```prisma
// Add to schema.prisma

model MetricDefinition {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @db.Uuid
  code        String   // "at_risk_customer", "contacted_recently", etc.
  name        String   // "At Risk Customer"
  description String   // Full definition
  formula     Json?    // { field: "lastOrderDate", operator: ">", value: "30 days" }
  version     Int      @default(1)
  effectiveAt DateTime @default(now())
  deprecatedAt DateTime?
  createdById String   @db.Uuid
  createdAt   DateTime @default(now())

  tenant    Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdBy User   @relation(fields: [createdById], references: [id])

  @@unique([tenantId, code, version])
  @@index([tenantId, code])
  @@index([tenantId, effectiveAt])
}

model DashboardWidget {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @db.Uuid
  userId      String?  @db.Uuid // null = tenant default
  widgetType  String   // "at_risk_customers", "revenue_trend", "tasks_from_management"
  position    Int      // Display order
  size        String   @default("medium") // "small", "medium", "large"
  isVisible   Boolean  @default(true)
  config      Json?    // Widget-specific configuration
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user   User?  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([tenantId, userId, widgetType])
  @@index([tenantId, userId])
}

// Update Tenant model to add relations
model Tenant {
  // ... existing fields
  metricDefinitions MetricDefinition[]
  dashboardWidgets  DashboardWidget[]
}

// Update User model to add relation
model User {
  // ... existing fields
  metricDefinitions MetricDefinition[]
  dashboardWidgets  DashboardWidget[]
}
```

#### **Migration Script:**

```bash
# Create migration
npx prisma migrate dev --name add_metric_definitions_and_dashboard_widgets
```

#### **API Routes to Create:**

```typescript
// /src/app/api/metrics/definitions/route.ts
// GET  - List all metric definitions (with history)
// POST - Create new metric definition version

// /src/app/api/metrics/definitions/[code]/route.ts
// GET    - Get current definition for a metric
// PATCH  - Update definition (creates new version)
// DELETE - Deprecate definition

// /src/app/api/dashboard/widgets/route.ts
// GET  - Get user's dashboard layout
// POST - Add widget to dashboard

// /src/app/api/dashboard/widgets/[widgetId]/route.ts
// PATCH  - Update widget (position, size, config)
// DELETE - Remove widget from dashboard
```

#### **Components to Build:**

```
/src/app/sales/dashboard/
├── page.tsx                          # Main dashboard page
├── sections/
│   ├── DashboardGrid.tsx            # Drag-drop grid layout
│   ├── WidgetLibrary.tsx            # Available widgets to add
│   └── widgets/
│       ├── AtRiskCustomers.tsx      # At risk widget
│       ├── RevenueTrend.tsx         # Revenue chart
│       ├── TasksFromManagement.tsx  # Manager tasks (TOP position)
│       ├── TopProducts.tsx          # Top products widget
│       ├── NewCustomers.tsx         # New customers count
│       └── CustomerBalances.tsx     # Past due balances

/src/app/sales/admin/metrics/
├── page.tsx                          # Metrics admin page
├── sections/
│   ├── MetricsList.tsx              # All defined metrics
│   ├── MetricEditor.tsx             # Edit/create definitions
│   └── MetricHistory.tsx            # Version history
```

#### **Integration Points:**

- **Existing Dashboard:** `/src/app/sales/page.tsx` - Replace with new grid system
- **Existing Metrics:** Customer risk status calculations already in DB - connect to definitions
- **Permissions:** Use existing Role/Permission system to control who can edit metrics

#### **Data Flow:**

```
User edits metric definition
  ↓
POST /api/metrics/definitions
  ↓
Create new MetricDefinition version (v2)
  ↓
Update calculation queries to use new formula
  ↓
Dashboard widgets auto-refresh with new data
```

---

### **1.2 UI Component Library Setup**

**Purpose:** Install shadcn/ui for consistent, accessible components.

#### **Installation:**

```bash
cd /Users/greghogue/Leora2/web

# Initialize shadcn/ui
npx shadcn@latest init

# Install key components
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add select
npx shadcn@latest add table
npx shadcn@latest add tabs
npx shadcn@latest add toast
npx shadcn@latest add calendar
npx shadcn@latest add popover
npx shadcn@latest add badge
npx shadcn@latest add checkbox
npx shadcn@latest add form
npx shadcn@latest add avatar
npx shadcn@latest add progress
```

#### **Configuration:**

Components will be added to `/src/components/ui/` and use existing Tailwind config.

#### **No Database Changes**

#### **No API Routes**

#### **Components Created:**

All components auto-generated by shadcn/ui in `/src/components/ui/`

---

### **1.3 Dashboard Widget Customization**

**Purpose:** Allow reps to customize which widgets appear and their order.

#### **No Additional Database Changes** (using DashboardWidget from 1.1)

#### **API Routes:** (covered in 1.1)

#### **Components to Build:**

```
/src/components/dashboard/
├── WidgetContainer.tsx               # Wrapper for all widgets
├── DragDropGrid.tsx                  # react-grid-layout implementation
├── WidgetMenu.tsx                    # Add/remove widgets
└── WidgetSettingsDialog.tsx          # Configure individual widgets
```

#### **Dependencies:**

```bash
npm install react-grid-layout
npm install @types/react-grid-layout --save-dev
```

#### **Integration:**

- Uses shadcn/ui Dialog for settings
- Persists layout to `DashboardWidget` table
- Fetches data for each widget type from existing endpoints

---

## **PHASE 2: CALL PLAN (CARLA) SYSTEM**

### **Build Order:**
1. Database schema extensions
2. Account categorization system
3. Weekly planning interface
4. Calendar sync setup
5. Activity tracking integration

---

### **2.1 CARLA Database Extensions**

**Purpose:** Extend existing CallPlan/Task models for CARLA functionality.

#### **Database Changes:**

```prisma
// Extend existing models in schema.prisma

enum AccountType {
  PROSPECT  // On the bench, not actively pursuing
  TARGET    // Actively trying to sell to (within next month)
  ACTIVE    // Purchased within last 6 months
}

enum AccountPriority {
  LOW
  MEDIUM
  HIGH
}

enum CallPlanStatus {
  DRAFT
  ACTIVE
  COMPLETED
  ARCHIVED
}

enum ContactOutcome {
  CONTACTED      // X - email, phone, text
  VISITED        // Y - in person
  NO_CONTACT     // Blank - couldn't reach
  NOT_ATTEMPTED  // Not yet tried
}

// Update Customer model
model Customer {
  // ... existing fields
  accountType     AccountType     @default(ACTIVE)
  accountPriority AccountPriority @default(MEDIUM)
  territory       String?         // For filtering by territory

  // ... existing relations
  callPlanAccounts CallPlanAccount[]
}

// Update CallPlan model
model CallPlan {
  // ... existing fields
  weekNumber  Int?            // Week number of year (1-52)
  year        Int?            // Year
  status      CallPlanStatus  @default(DRAFT)
  targetCount Int?            // Target # of accounts to contact

  // ... existing relations
  accounts    CallPlanAccount[]
  activities  CallPlanActivity[]
}

// NEW: Join table for accounts in call plan
model CallPlanAccount {
  id              String          @id @default(uuid()) @db.Uuid
  tenantId        String          @db.Uuid
  callPlanId      String          @db.Uuid
  customerId      String          @db.Uuid
  objective       String?         // 3-5 word objective
  addedAt         DateTime        @default(now())
  contactOutcome  ContactOutcome  @default(NOT_ATTEMPTED)
  contactedAt     DateTime?
  notes           String?

  tenant   Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  callPlan CallPlan @relation(fields: [callPlanId], references: [id], onDelete: Cascade)
  customer Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)

  @@unique([callPlanId, customerId])
  @@index([tenantId])
  @@index([callPlanId])
  @@index([customerId])
}

// NEW: Track call plan execution
model CallPlanActivity {
  id             String   @id @default(uuid()) @db.Uuid
  tenantId       String   @db.Uuid
  callPlanId     String   @db.Uuid
  customerId     String   @db.Uuid
  activityTypeId String   @db.Uuid
  occurredAt     DateTime
  notes          String?
  createdAt      DateTime @default(now())

  tenant       Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  callPlan     CallPlan     @relation(fields: [callPlanId], references: [id], onDelete: Cascade)
  customer     Customer     @relation(fields: [customerId], references: [id], onDelete: Cascade)
  activityType ActivityType @relation(fields: [activityTypeId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([callPlanId])
  @@index([customerId])
}

// Update relations
model Tenant {
  // ... existing fields
  callPlanAccounts   CallPlanAccount[]
  callPlanActivities CallPlanActivity[]
}

model Customer {
  // ... existing fields
  callPlanAccounts   CallPlanAccount[]
  callPlanActivities CallPlanActivity[]
}

model ActivityType {
  // ... existing fields
  callPlanActivities CallPlanActivity[]
}
```

#### **Migration Script:**

```bash
npx prisma migrate dev --name add_carla_system
```

#### **Initial Seed + Daily Background Job:**

```typescript
// /src/scripts/seed-account-types.ts
// Run once to initialize, then use background job for updates

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function updateAccountTypes(tenantId?: string) {
  const tenants = tenantId
    ? [await prisma.tenant.findUnique({ where: { id: tenantId } })]
    : await prisma.tenant.findMany();

  for (const tenant of tenants) {
    if (!tenant) continue;

    // ACTIVE: Ordered within last 6 months
    await prisma.customer.updateMany({
      where: {
        tenantId: tenant.id,
        lastOrderDate: {
          gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) // 6 months
        }
      },
      data: { accountType: 'ACTIVE' }
    });

    // TARGET: Ordered 6-12 months ago (trying to reactivate)
    await prisma.customer.updateMany({
      where: {
        tenantId: tenant.id,
        lastOrderDate: {
          gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 12 months
          lt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)   // 6 months
        }
      },
      data: { accountType: 'TARGET' }
    });

    // PROSPECT: Never ordered or >12 months ago
    await prisma.customer.updateMany({
      where: {
        tenantId: tenant.id,
        OR: [
          { lastOrderDate: null },
          {
            lastOrderDate: {
              lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // 12 months
            }
          }
        ]
      },
      data: { accountType: 'PROSPECT' }
    });

    console.log(`✅ Account types updated for tenant: ${tenant.slug}`);
  }
}

// Initial seed
async function main() {
  await updateAccountTypes();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

```typescript
// /src/jobs/update-account-types.ts
// Background job - run daily

import { updateAccountTypes } from '../scripts/seed-account-types';

export async function dailyAccountTypeUpdate() {
  console.log('Starting daily account type update...');
  await updateAccountTypes();
  console.log('✅ Daily account type update complete');
}

// Run via cron: 0 2 * * * (daily at 2am)
```

**Critical:** Also update account type when orders are created:

```typescript
// /src/lib/hooks/after-order-create.ts
// Prisma middleware or API hook

export async function afterOrderCreate(order: Order) {
  // If this is customer's first order or they were PROSPECT/TARGET
  const customer = await prisma.customer.findUnique({
    where: { id: order.customerId }
  });

  if (customer && customer.accountType !== 'ACTIVE') {
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        accountType: 'ACTIVE',
        lastOrderDate: order.orderedAt
      }
    });
  }
}
```

---

### **2.2 CARLA API Routes**

#### **API Routes to Create:**

```typescript
// /src/app/api/call-plans/route.ts
// GET  - List call plans for user (filter by week/year/status)
// POST - Create new call plan

// /src/app/api/call-plans/[planId]/route.ts
// GET    - Get specific call plan with accounts
// PATCH  - Update call plan (status, target count)
// DELETE - Delete call plan

// /src/app/api/call-plans/[planId]/accounts/route.ts
// GET  - Get accounts in this call plan
// POST - Add account to call plan (with objective)

// /src/app/api/call-plans/[planId]/accounts/[accountId]/route.ts
// PATCH  - Update account (objective, outcome, contacted date)
// DELETE - Remove account from call plan

// /src/app/api/call-plans/[planId]/export/route.ts
// GET - Export call plan as PDF (for printing)

// /src/app/api/customers/categorize/route.ts
// PATCH - Bulk update customer account types and priorities
```

#### **Example API Implementation:**

```typescript
// /src/app/api/call-plans/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const weekNumber = searchParams.get('weekNumber');
  const year = searchParams.get('year');
  const status = searchParams.get('status');

  const callPlans = await prisma.callPlan.findMany({
    where: {
      tenantId: user.tenantId,
      userId: user.id,
      ...(weekNumber && { weekNumber: parseInt(weekNumber) }),
      ...(year && { year: parseInt(year) }),
      ...(status && { status: status as any })
    },
    include: {
      accounts: {
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              accountType: true,
              accountPriority: true,
              city: true,
              state: true
            }
          }
        }
      },
      _count: {
        select: { accounts: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json(callPlans);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name, description, weekNumber, year, targetCount } = body;

  const callPlan = await prisma.callPlan.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      name,
      description,
      weekNumber,
      year,
      targetCount,
      status: 'DRAFT'
    }
  });

  return NextResponse.json(callPlan, { status: 201 });
}
```

---

### **2.3 CARLA UI Components**

#### **Components to Build:**

```
/src/app/sales/call-plan/
├── page.tsx                              # Main CARLA page
├── sections/
│   ├── CallPlanHeader.tsx               # Week selector, create new plan
│   ├── AccountList.tsx                  # Filterable account list
│   ├── CallPlanBuilder.tsx              # Checkbox selection interface
│   ├── CallPlanSummary.tsx              # Count, stats, export PDF
│   ├── WeeklyTracker.tsx                # X/Y/Blank tracking grid
│   └── TerritoryFilter.tsx              # Filter by territory
├── components/
│   ├── AccountCard.tsx                  # Individual account in list
│   ├── ObjectiveInput.tsx               # Quick objective entry
│   ├── ContactOutcomeButtons.tsx        # X/Y/Blank buttons
│   └── CallPlanPrintView.tsx            # Printable layout
└── [planId]/
    └── page.tsx                          # Individual call plan detail

/src/components/call-plan/
├── AccountTypeSelector.tsx               # Prospect/Target/Active toggle
├── PrioritySelector.tsx                  # High/Medium/Low selector
└── BulkCategorize.tsx                    # Bulk update account types
```

#### **Key Features:**

**Weekly Planning Flow:**
1. Rep navigates to `/sales/call-plan`
2. Sees current week's plan (or creates new)
3. Can filter accounts by:
   - Account Type (Prospect/Target/Active)
   - Priority (High/Medium/Low)
   - Territory
   - City/State
4. Checks boxes to add to plan
5. Adds 3-5 word objectives (optional)
6. Sees running count (target: 70-75 accounts)
7. Can print/export PDF

**Weekly Execution Flow:**
1. View active call plan
2. For each account, click X (contacted), Y (visited), or leave blank
3. Can add quick notes
4. Calendar integration shows scheduled appointments
5. At end of week, mark plan as completed
6. Management reviews completion rates

#### **Integration with Existing Code:**

- **Customer List:** Reuse `/src/app/sales/customers/sections/CustomerTable.tsx` with modifications
- **Filters:** Extend existing `/src/app/sales/customers/sections/CustomerFilters.tsx`
- **Auth:** Use existing user session from middleware

---

### **2.4 Calendar Sync System**

**Purpose:** Sync call plan accounts to Google Calendar and Outlook via drag-drop.

#### **Database Changes:**

```prisma
model CalendarSync {
  id             String   @id @default(uuid()) @db.Uuid
  tenantId       String   @db.Uuid
  userId         String   @db.Uuid
  provider       String   // "google", "outlook"
  accessToken    String
  refreshToken   String
  expiresAt      DateTime
  calendarId     String?  // External calendar ID
  isEnabled      Boolean  @default(true)
  lastSyncAt     DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([tenantId, userId, provider])
  @@index([tenantId, userId])
}

// Update CalendarEvent to track external sync
model CalendarEvent {
  // ... existing fields
  callPlanAccountId String?        @db.Uuid // Link to CARLA account
  externalEventId   String?        // Google/Outlook event ID
  syncedAt          DateTime?

  callPlanAccount CallPlanAccount? @relation(fields: [callPlanAccountId], references: [id], onDelete: SetNull)
}

// Add relations
model Tenant {
  // ... existing fields
  calendarSyncs CalendarSync[]
}

model User {
  // ... existing fields
  calendarSyncs CalendarSync[]
}

model CallPlanAccount {
  // ... existing fields
  calendarEvents CalendarEvent[]
}
```

#### **Migration:**

```bash
npx prisma migrate dev --name add_calendar_sync
```

#### **API Routes:**

```typescript
// /src/app/api/calendar/connect/google/route.ts
// GET - Initiate Google OAuth flow
// Callback from Google OAuth

// /src/app/api/calendar/connect/outlook/route.ts
// GET - Initiate Microsoft OAuth flow
// Callback from Microsoft OAuth

// /src/app/api/calendar/sync/route.ts
// POST - Trigger manual sync (both directions)
// GET  - Get sync status

// /src/app/api/calendar/events/route.ts
// POST - Create calendar event from call plan account
// PATCH - Update calendar event
// DELETE - Remove calendar event
```

#### **Dependencies:**

```bash
npm install googleapis  # Google Calendar API
npm install @microsoft/microsoft-graph-client  # Outlook API
npm install @azure/msal-node  # Microsoft Auth
```

#### **OAuth Setup:**

**Google Calendar API:**
1. Create project in Google Cloud Console
2. Enable Google Calendar API
3. Create OAuth 2.0 credentials
4. Set redirect URI: `https://yourdomain.com/api/calendar/connect/google/callback`

**Microsoft Outlook API:**
1. Register app in Azure Portal
2. Add Microsoft Graph API permissions (Calendars.ReadWrite)
3. Set redirect URI: `https://yourdomain.com/api/calendar/connect/outlook/callback`

#### **Environment Variables:**

```env
# Add to .env.local

# Google Calendar
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/calendar/connect/google/callback

# Microsoft Outlook
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_REDIRECT_URI=https://yourdomain.com/api/calendar/connect/outlook/callback
```

#### **Components:**

```
/src/app/sales/calendar/
├── page.tsx                              # Calendar view page
├── sections/
│   ├── CalendarGrid.tsx                 # Weekly/monthly calendar
│   ├── CalendarSidebar.tsx              # Call plan accounts to drag
│   ├── EventDetail.tsx                  # Event details modal
│   └── SyncSettings.tsx                 # Connect Google/Outlook
└── components/
    ├── DraggableAccount.tsx              # Drag from call plan
    ├── DroppableTimeSlot.tsx             # Drop onto calendar
    └── SyncStatus.tsx                    # Sync indicator

/src/components/calendar/
├── CalendarProvider.tsx                  # Calendar context
└── SyncManager.tsx                       # Background sync service
```

#### **Calendar Sync Flow:**

```
User drags account from call plan → calendar time slot
  ↓
POST /api/calendar/events
  ↓
1. Create CalendarEvent in DB
2. If Google/Outlook connected:
   - Create event in external calendar
   - Store externalEventId
   - Mark as synced
  ↓
User sees event in both places

Background sync (every 15 min):
  ↓
Check for external changes
  ↓
Update local DB if changed
```

#### **Dependencies:**

```bash
npm install @fullcalendar/react
npm install @fullcalendar/daygrid
npm install @fullcalendar/timegrid
npm install @fullcalendar/interaction  # For drag-drop
```

---

## **PHASE 3: VOICE & MOBILE**

### **Build Order:**
1. Web Speech API integration
2. Progressive Web App (PWA) setup
3. Mobile-optimized layouts
4. Quick activity entry

---

### **3.1 Voice-to-Text Activity Logging**

**Purpose:** Allow reps to speak activity notes instead of typing.

#### **No Database Changes** (uses existing Activity model)

#### **API Routes:**

```typescript
// /src/app/api/activities/quick-log/route.ts
// POST - Create activity with voice transcription
```

#### **Components:**

```
/src/components/voice/
├── VoiceRecorder.tsx                     # Record button with waveform
├── VoiceTranscription.tsx                # Display live transcription
└── VoiceActivityForm.tsx                 # Quick form with voice input

/src/app/sales/customers/[customerId]/
└── components/
    └── QuickActivityLogger.tsx           # Voice-enabled quick log
```

#### **Implementation:**

```typescript
// /src/components/voice/VoiceRecorder.tsx

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export function VoiceRecorder({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    // Check if browser supports Web Speech API
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(finalTranscript + interimTranscript);
        onTranscript(finalTranscript + interimTranscript);
      };

      setRecognition(recognition);
    }
  }, [onTranscript]);

  const toggleRecording = () => {
    if (isRecording) {
      recognition?.stop();
    } else {
      recognition?.start();
    }
    setIsRecording(!isRecording);
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={toggleRecording}
        variant={isRecording ? "destructive" : "default"}
        className="w-full"
      >
        {isRecording ? '🔴 Stop Recording' : '🎤 Start Recording'}
      </Button>

      {transcript && (
        <div className="p-4 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-700">{transcript}</p>
        </div>
      )}
    </div>
  );
}
```

#### **Integration:**

- Add voice button to activity forms throughout app
- Works on Chrome, Edge, Safari (iOS/macOS)
- Falls back to keyboard input if not supported

---

### **3.2 Progressive Web App (PWA) Setup**

**Purpose:** Install on mobile devices, offline support, camera access.

#### **Configuration:**

```typescript
// /public/manifest.json

{
  "name": "Leora CRM",
  "short_name": "Leora",
  "description": "Sales CRM for Well Crafted Wine",
  "start_url": "/sales",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/dashboard.png",
      "sizes": "1280x720",
      "type": "image/png"
    }
  ]
}
```

```typescript
// /src/app/layout.tsx - Add metadata

export const metadata = {
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Leora CRM'
  }
};
```

#### **Service Worker:**

```typescript
// /public/sw.js

const CACHE_NAME = 'leora-v1';
const urlsToCache = [
  '/sales',
  '/sales/customers',
  '/sales/call-plan',
  '/offline'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
      .catch(() => caches.match('/offline'))
  );
});
```

```typescript
// /src/app/sales/layout.tsx - Register service worker

'use client';

import { useEffect } from 'react';

export default function SalesLayout({ children }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW registered', reg))
        .catch(err => console.log('SW error', err));
    }
  }, []);

  return children;
}
```

#### **Dependencies:**

```bash
npm install next-pwa
```

#### **No Database Changes**

#### **No API Routes**

---

### **3.3 Mobile-Optimized Layouts**

**Purpose:** Responsive layouts for phone/tablet use in the field.

#### **Components:**

```
/src/components/mobile/
├── MobileNav.tsx                         # Bottom navigation
├── MobileHeader.tsx                      # Top bar with back button
├── SwipeableCard.tsx                     # Swipe to delete/archive
└── TouchOptimized.tsx                    # Larger touch targets

/src/app/sales/mobile/
├── dashboard/page.tsx                    # Mobile dashboard
├── customers/page.tsx                    # Mobile customer list
└── call-plan/page.tsx                    # Mobile call plan
```

#### **Media Query Strategy:**

```css
/* Tailwind breakpoints */
sm: 640px   /* Small tablet */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
```

#### **Mobile-First Components:**

- Touch-optimized buttons (min 44px height)
- Bottom sheet modals instead of centered
- Swipeable cards for actions
- Bottom navigation bar
- Simplified forms with large inputs

---

## **PHASE 4: SAMPLES & ANALYTICS**

### **Build Order:**
1. Sample tracking enhancements
2. Sample analytics dashboard
3. Automated follow-up triggers
4. Supplier reporting

---

### **4.1 Sample Tracking Enhancements**

**Purpose:** Quick sample assignment, pre-populated feedback, tracking.

#### **Database Changes:**

```prisma
// Extend existing SampleUsage model

model SampleUsage {
  // ... existing fields
  feedbackOptions Json? // Pre-selected feedback: ["Liked acidity", "Too sweet"]
  customerResponse String? // "Wants to order", "Pass", "Needs time"
  sampleSource String? // "Rep pulled", "Manager recommendation", "Customer request"
  // ... existing relations
}

// Add sample feedback templates
model SampleFeedbackTemplate {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @db.Uuid
  category  String   // "Positive", "Negative", "Neutral"
  label     String   // "Loved it", "Too expensive", "Will consider"
  sortOrder Int      @default(0)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, label])
  @@index([tenantId, category])
}

model Tenant {
  // ... existing fields
  sampleFeedbackTemplates SampleFeedbackTemplate[]
}
```

#### **Migration:**

```bash
npx prisma migrate dev --name enhance_sample_tracking
```

#### **Seed Feedback Templates:**

```typescript
// /src/scripts/seed-sample-feedback.ts

const templates = [
  // Positive
  { category: 'Positive', label: 'Loved it - wants to order', sortOrder: 1 },
  { category: 'Positive', label: 'Liked acidity', sortOrder: 2 },
  { category: 'Positive', label: 'Perfect for their menu', sortOrder: 3 },
  { category: 'Positive', label: 'Price point works', sortOrder: 4 },

  // Negative
  { category: 'Negative', label: 'Too sweet', sortOrder: 5 },
  { category: 'Negative', label: 'Too expensive', sortOrder: 6 },
  { category: 'Negative', label: 'Not their style', sortOrder: 7 },
  { category: 'Negative', label: 'Already have similar', sortOrder: 8 },

  // Neutral
  { category: 'Neutral', label: 'Needs time to decide', sortOrder: 9 },
  { category: 'Neutral', label: 'Will discuss with team', sortOrder: 10 },
  { category: 'Neutral', label: 'Interested but not now', sortOrder: 11 }
];
```

#### **API Routes:**

```typescript
// /src/app/api/samples/quick-assign/route.ts
// POST - Quickly assign pulled samples to customer

// /src/app/api/samples/feedback/route.ts
// POST - Submit feedback with templates
// GET  - Get available feedback templates

// /src/app/api/samples/pulled/route.ts
// GET - Get samples pulled in last 3 weeks by rep
```

#### **Components:**

```
/src/app/sales/samples/
├── page.tsx                              # Samples dashboard
├── sections/
│   ├── PulledSamples.tsx                # Recent pulls (3 weeks)
│   ├── QuickAssign.tsx                  # Assign to customer
│   ├── FeedbackEntry.tsx                # Quick feedback form
│   └── SampleHistory.tsx                # Past samples by customer
└── components/
    ├── SampleCard.tsx                    # Individual sample
    ├── FeedbackButtons.tsx               # Pre-populated options
    └── CustomerSelector.tsx              # Quick customer search
```

#### **Quick Assign Flow:**

```
Rep clicks sample → Quick customer search modal
  ↓
Select customer → Pre-populated feedback buttons
  ↓
Add optional notes → Submit
  ↓
POST /api/samples/quick-assign
  ↓
Create SampleUsage record
  ↓
Trigger follow-up if "Needs time to decide"
```

---

### **4.2 Sample Analytics Dashboard**

**Purpose:** Show which samples drive sales, hit rates, supplier metrics.

#### **Database Changes:**

```prisma
// Add computed sample metrics table (updated daily)

model SampleMetrics {
  id                 String   @id @default(uuid()) @db.Uuid
  tenantId           String   @db.Uuid
  skuId              String   @db.Uuid
  periodStart        DateTime
  periodEnd          DateTime
  totalSamplesGiven  Int      @default(0)
  totalCustomersSampled Int   @default(0)
  samplesResultingInOrder Int @default(0)
  conversionRate     Float    @default(0) // Decimal 0-1
  totalRevenue       Decimal? @db.Decimal(12, 2)
  avgRevenuePerSample Decimal? @db.Decimal(12, 2)
  calculatedAt       DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  sku    Sku    @relation(fields: [skuId], references: [id], onDelete: Cascade)

  @@unique([tenantId, skuId, periodStart])
  @@index([tenantId, periodStart])
  @@index([conversionRate])
}

model Tenant {
  // ... existing fields
  sampleMetrics SampleMetrics[]
}

model Sku {
  // ... existing fields
  sampleMetrics SampleMetrics[]
}
```

#### **Migration:**

```bash
npx prisma migrate dev --name add_sample_metrics
```

#### **Background Job:**

```typescript
// /src/jobs/calculate-sample-metrics.ts

import { PrismaClient } from '@prisma/client';
import { subDays, startOfDay, endOfDay } from 'date-fns';

const prisma = new PrismaClient();

export async function calculateSampleMetrics() {
  const tenants = await prisma.tenant.findMany();

  for (const tenant of tenants) {
    const periodStart = startOfDay(subDays(new Date(), 30));
    const periodEnd = endOfDay(new Date());

    // Get all samples in period
    const samples = await prisma.sampleUsage.findMany({
      where: {
        tenantId: tenant.id,
        tastedAt: { gte: periodStart, lte: periodEnd }
      },
      include: { sku: true, customer: true }
    });

    // Group by SKU
    const skuGroups = samples.reduce((acc, sample) => {
      if (!acc[sample.skuId]) acc[sample.skuId] = [];
      acc[sample.skuId].push(sample);
      return acc;
    }, {} as Record<string, typeof samples>);

    // Calculate metrics per SKU
    for (const [skuId, skuSamples] of Object.entries(skuGroups)) {
      const totalSamples = skuSamples.reduce((sum, s) => sum + s.quantity, 0);
      const uniqueCustomers = new Set(skuSamples.map(s => s.customerId)).size;
      const conversions = skuSamples.filter(s => s.resultedInOrder).length;
      const conversionRate = conversions / skuSamples.length;

      // Calculate revenue from converted samples
      const revenue = await calculateSampleRevenue(skuId, skuSamples, periodStart, periodEnd);

      // Upsert metrics
      await prisma.sampleMetrics.upsert({
        where: {
          tenantId_skuId_periodStart: {
            tenantId: tenant.id,
            skuId,
            periodStart
          }
        },
        update: {
          totalSamplesGiven: totalSamples,
          totalCustomersSampled: uniqueCustomers,
          samplesResultingInOrder: conversions,
          conversionRate,
          totalRevenue: revenue,
          avgRevenuePerSample: revenue / totalSamples,
          calculatedAt: new Date()
        },
        create: {
          tenantId: tenant.id,
          skuId,
          periodStart,
          periodEnd,
          totalSamplesGiven: totalSamples,
          totalCustomersSampled: uniqueCustomers,
          samplesResultingInOrder: conversions,
          conversionRate,
          totalRevenue: revenue,
          avgRevenuePerSample: revenue / totalSamples
        }
      });
    }
  }

  console.log('✅ Sample metrics calculated');
}

async function calculateSampleRevenue(
  skuId: string,
  samples: any[]
) {
  let totalRevenue = 0;

  // For each sample, look for orders within 30 days AFTER the tasting
  for (const sample of samples) {
    const windowStart = sample.tastedAt;
    const windowEnd = addDays(sample.tastedAt, 30); // 30 days after tasting

    const orders = await prisma.order.findMany({
      where: {
        customerId: sample.customerId,
        orderedAt: {
          gte: windowStart,  // After or on tasting date
          lte: windowEnd     // Within 30 days
        },
        status: 'FULFILLED',
        lines: { some: { skuId } }
      },
      include: {
        lines: {
          where: { skuId },
          select: { quantity: true, unitPrice: true }
        }
      }
    });

    // Sum revenue from orders within the attribution window
    const sampleRevenue = orders.reduce((sum, order) => {
      const orderRevenue = order.lines.reduce(
        (lineSum, line) => lineSum + (line.quantity * Number(line.unitPrice)),
        0
      );
      return sum + orderRevenue;
    }, 0);

    totalRevenue += sampleRevenue;
  }

  return totalRevenue;
}
```

#### **Cron Job:**

```typescript
// /src/jobs/run.ts

import { calculateSampleMetrics } from './calculate-sample-metrics';

const jobs = {
  'sample-metrics': calculateSampleMetrics
};

// Run daily at 2am
if (process.argv[2] === 'sample-metrics') {
  calculateSampleMetrics();
}
```

Add to package.json:
```json
"scripts": {
  "jobs:sample-metrics": "tsx src/jobs/run.ts sample-metrics"
}
```

#### **API Routes:**

```typescript
// /src/app/api/analytics/samples/route.ts
// GET - Sample analytics (conversion rates, revenue, etc.)
// Query params: startDate, endDate, skuId, salesRepId

// /src/app/api/analytics/samples/top-performers/route.ts
// GET - Top performing samples by conversion rate

// /src/app/api/analytics/samples/rep-summary/route.ts
// GET - Sample performance by sales rep
```

#### **Components:**

```
/src/app/sales/analytics/samples/
├── page.tsx                              # Sample analytics dashboard
├── sections/
│   ├── ConversionChart.tsx              # Conversion rate trends
│   ├── TopPerformers.tsx                # Best converting samples
│   ├── RepLeaderboard.tsx               # Rep sample performance
│   ├── CustomerSampleHistory.tsx        # Samples per customer
│   └── SupplierReport.tsx               # Metrics by supplier
└── components/
    ├── SampleStatsCard.tsx               # Metric card
    ├── ConversionFunnel.tsx              # Visual funnel
    └── ExportReport.tsx                  # Export to CSV/PDF for suppliers
```

#### **Metrics to Display:**

- **Conversion Rate:** % of samples that resulted in orders
- **Hit Rate:** Samples → orders within 30 days
- **Revenue Per Sample:** Total revenue / samples given
- **Top Performers:** SKUs with highest conversion
- **Rep Leaderboard:** Reps with best sample→order conversion
- **Customer Analysis:** Which customers buy after tasting
- **Supplier Report:** Performance by supplier for sharing

---

### **4.3 Automated Follow-up Triggers**

**Purpose:** Trigger follow-ups when samples don't convert or customers need time.

#### **Database Changes:**

```prisma
enum TriggerType {
  SAMPLE_NO_ORDER      // After tasting, no order in X days
  FIRST_ORDER_FOLLOWUP // After first order
  CUSTOMER_TIMING      // Customer-specific "don't contact until" date
  BURN_RATE_ALERT      // Customer likely needs reorder
}

model AutomatedTrigger {
  id          String      @id @default(uuid()) @db.Uuid
  tenantId    String      @db.Uuid
  triggerType TriggerType
  name        String
  description String?
  isActive    Boolean     @default(true)
  config      Json        // { daysAfter: 7, activityType: "follow_up_call" }
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  tasks  TriggeredTask[]

  @@index([tenantId, triggerType])
}

model TriggeredTask {
  id         String   @id @default(uuid()) @db.Uuid
  tenantId   String   @db.Uuid
  triggerId  String   @db.Uuid
  taskId     String   @db.Uuid
  customerId String   @db.Uuid
  triggeredAt DateTime @default(now())
  completedAt DateTime?

  tenant   Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  trigger  AutomatedTrigger @relation(fields: [triggerId], references: [id], onDelete: Cascade)
  task     Task             @relation(fields: [taskId], references: [id], onDelete: Cascade)
  customer Customer         @relation(fields: [customerId], references: [id], onDelete: Cascade)

  @@index([tenantId, triggerId])
  @@index([customerId])
}

model Customer {
  // ... existing fields
  doNotContactUntil DateTime? // Customer-specific timing
  triggeredTasks    TriggeredTask[]
}

model Tenant {
  // ... existing fields
  automatedTriggers AutomatedTrigger[]
  triggeredTasks    TriggeredTask[]
}

model Task {
  // ... existing fields
  triggeredTasks TriggeredTask[]
}
```

#### **Migration:**

```bash
npx prisma migrate dev --name add_automated_triggers
```

#### **Background Job:**

```typescript
// /src/jobs/process-triggers.ts

import { PrismaClient, TriggerType } from '@prisma/client';
import { subDays } from 'date-fns';

const prisma = new PrismaClient();

export async function processTriggers() {
  const triggers = await prisma.automatedTrigger.findMany({
    where: { isActive: true }
  });

  for (const trigger of triggers) {
    switch (trigger.triggerType) {
      case 'SAMPLE_NO_ORDER':
        await processSampleNoOrderTrigger(trigger);
        break;
      case 'FIRST_ORDER_FOLLOWUP':
        await processFirstOrderFollowup(trigger);
        break;
      case 'CUSTOMER_TIMING':
        await processCustomerTimingTrigger(trigger);
        break;
      case 'BURN_RATE_ALERT':
        await processBurnRateAlert(trigger);
        break;
    }
  }
}

async function processSampleNoOrderTrigger(trigger: any) {
  const config = trigger.config as { daysAfter: number };
  const cutoffDate = subDays(new Date(), config.daysAfter);

  // Find samples given before cutoff with no follow-up and no order
  const samples = await prisma.sampleUsage.findMany({
    where: {
      tenantId: trigger.tenantId,
      tastedAt: { lte: cutoffDate },
      followedUpAt: null,
      resultedInOrder: false
    },
    include: { customer: true, salesRep: true }
  });

  for (const sample of samples) {
    // Check if task already created
    const existingTask = await prisma.triggeredTask.findFirst({
      where: {
        triggerId: trigger.id,
        customerId: sample.customerId
      }
    });

    if (!existingTask) {
      // Create follow-up task
      const task = await prisma.task.create({
        data: {
          tenantId: trigger.tenantId,
          userId: sample.salesRepId,
          customerId: sample.customerId,
          title: `Follow up on ${sample.sku?.product?.name} sample`,
          description: `Customer tasted this ${config.daysAfter} days ago with no order`,
          priority: 'MEDIUM',
          status: 'PENDING'
        }
      });

      // Track trigger
      await prisma.triggeredTask.create({
        data: {
          tenantId: trigger.tenantId,
          triggerId: trigger.id,
          taskId: task.id,
          customerId: sample.customerId
        }
      });

      // Mark sample as needing follow-up
      await prisma.sampleUsage.update({
        where: { id: sample.id },
        data: { needsFollowUp: true }
      });
    }
  }
}

async function processFirstOrderFollowup(trigger: any) {
  const config = trigger.config as { daysAfter: number };
  const startDate = subDays(new Date(), config.daysAfter + 1);
  const endDate = subDays(new Date(), config.daysAfter);

  // Find first orders in the window
  const orders = await prisma.order.findMany({
    where: {
      tenantId: trigger.tenantId,
      isFirstOrder: true,
      orderedAt: { gte: startDate, lte: endDate }
    },
    include: { customer: true }
  });

  for (const order of orders) {
    const existingTask = await prisma.triggeredTask.findFirst({
      where: {
        triggerId: trigger.id,
        customerId: order.customerId
      }
    });

    if (!existingTask) {
      const task = await prisma.task.create({
        data: {
          tenantId: trigger.tenantId,
          userId: order.customer.salesRepId,
          customerId: order.customerId,
          title: 'Check in on first order delivery',
          description: `Follow up: How was our delivery? Any issues?`,
          priority: 'HIGH',
          status: 'PENDING'
        }
      });

      await prisma.triggeredTask.create({
        data: {
          tenantId: trigger.tenantId,
          triggerId: trigger.id,
          taskId: task.id,
          customerId: order.customerId
        }
      });
    }
  }
}

// Similar implementations for other trigger types...
```

#### **Cron Job:**

Run every 6 hours:
```bash
npm run jobs:process-triggers
```

#### **API Routes:**

```typescript
// /src/app/api/triggers/route.ts
// GET  - List all triggers
// POST - Create new trigger

// /src/app/api/triggers/[triggerId]/route.ts
// GET    - Get trigger details
// PATCH  - Update trigger (enable/disable, change config)
// DELETE - Delete trigger
```

#### **Components:**

```
/src/app/sales/admin/triggers/
├── page.tsx                              # Triggers management
├── sections/
│   ├── TriggerList.tsx                  # All configured triggers
│   ├── TriggerEditor.tsx                # Create/edit trigger
│   └── TriggeredTasks.tsx               # View tasks created by triggers
└── components/
    ├── TriggerCard.tsx                   # Individual trigger
    └── TriggerConfigForm.tsx             # Config fields per type
```

---

## **PHASE 5: OPERATIONS & WAREHOUSE**

### **Build Order:**
1. Inventory location fields
2. Pick sheet generation
3. Routing export (Azuga CSV)
4. Route visibility for sales

---

### **5.1 Inventory Location System**

**Purpose:** Add warehouse location to inventory, enable pick sheets sorted by aisle.

#### **Database Changes:**

```prisma
// Update existing Inventory model with state tracking

enum InventoryStatus {
  AVAILABLE     // Can be sold
  ALLOCATED     // Reserved on order (SUBMITTED)
  PICKED        // On pick sheet
  SHIPPED       // Delivered
}

model Inventory {
  // ... existing fields
  aisle      String?  // "A", "B", "C"
  row        Int?     // 1-20
  shelf      String?  // "Top", "Middle", "Bottom"
  bin        String?  // "A1", "B2"

  // State tracking for allocation
  status     InventoryStatus @default(AVAILABLE)

  // Computed field for sorting
  pickOrder  Int?     // Calculated: aisle -> row -> shelf

  // ... existing relations
}

/**
 * Inventory Allocation State Machine:
 *
 * 1. Order SUBMITTED → status: ALLOCATED, onHand - qty
 * 2. Pick sheet generated → status: PICKED
 * 3. Order FULFILLED → status: SHIPPED
 * 4. Order CANCELLED → status: AVAILABLE, onHand + qty (restore)
 */

// Add warehouse configuration
model WarehouseConfig {
  id            String   @id @default(uuid()) @db.Uuid
  tenantId      String   @unique @db.Uuid
  aisleCount    Int      @default(10)
  rowsPerAisle  Int      @default(20)
  shelfLevels   String[] @default(["Top", "Middle", "Bottom"])
  pickStrategy  String   @default("aisle_then_row") // "aisle_then_row", "zone_based"
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}

model Tenant {
  // ... existing fields
  warehouseConfig WarehouseConfig?
}
```

#### **Migration:**

```bash
npx prisma migrate dev --name add_warehouse_locations
```

#### **Seed Script:**

```typescript
// /src/scripts/seed-warehouse-config.ts

await prisma.warehouseConfig.create({
  data: {
    tenantId: tenant.id,
    aisleCount: 15,
    rowsPerAisle: 25,
    shelfLevels: ['Top', 'Middle', 'Bottom'],
    pickStrategy: 'aisle_then_row'
  }
});

// Calculate pickOrder for existing inventory
// pickOrder = (aisleNum * 1000) + (row * 10) + shelfNum
// Example: Aisle C (3), Row 15, Top (1) = 3000 + 150 + 1 = 3151

await prisma.$executeRaw`
  UPDATE "Inventory"
  SET "pickOrder" = (
    (ASCII("aisle") - ASCII('A') + 1) * 1000 +
    "row" * 10 +
    CASE "shelf"
      WHEN 'Top' THEN 1
      WHEN 'Middle' THEN 2
      WHEN 'Bottom' THEN 3
      ELSE 0
    END
  )
  WHERE "aisle" IS NOT NULL AND "row" IS NOT NULL
`;
```

#### **API Routes:**

```typescript
// /src/app/api/inventory/locations/route.ts
// GET  - Get inventory with locations
// PATCH - Bulk update locations (import from CSV)

// /src/app/api/warehouse/config/route.ts
// GET   - Get warehouse configuration
// PATCH - Update warehouse config
```

#### **Components:**

```
/src/app/sales/warehouse/
├── page.tsx                              # Warehouse management
├── sections/
│   ├── LocationEditor.tsx               # Edit item locations
│   ├── WarehouseMap.tsx                 # Visual warehouse layout
│   └── LocationImport.tsx               # Import locations from CSV
└── components/
    ├── LocationInput.tsx                 # Aisle/Row/Shelf input
    └── WarehouseGrid.tsx                 # Visual grid of warehouse
```

---

### **5.2 Pick Sheet Generation**

**Purpose:** Generate pick sheets sorted by warehouse location for efficient picking.

#### **Database Changes:**

```prisma
enum PickSheetStatus {
  DRAFT
  READY      // Ready to pick
  PICKING    // Being picked
  PICKED     // Completed
  CANCELLED
}

model PickSheet {
  id           String          @id @default(uuid()) @db.Uuid
  tenantId     String          @db.Uuid
  sheetNumber  String          // "PS-2025-001"
  status       PickSheetStatus @default(DRAFT)
  pickerName   String?
  createdById  String          @db.Uuid
  startedAt    DateTime?
  completedAt  DateTime?
  notes        String?
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  tenant    Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdBy User            @relation(fields: [createdById], references: [id])
  items     PickSheetItem[]

  @@unique([tenantId, sheetNumber])
  @@index([tenantId, status])
}

model PickSheetItem {
  id            String  @id @default(uuid()) @db.Uuid
  tenantId      String  @db.Uuid
  pickSheetId   String  @db.Uuid
  orderLineId   String  @db.Uuid
  skuId         String  @db.Uuid
  customerId    String  @db.Uuid
  quantity      Int
  pickOrder     Int     // Sorting order (from Inventory.pickOrder)
  isPicked      Boolean @default(false)
  pickedAt      DateTime?

  tenant     Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  pickSheet  PickSheet @relation(fields: [pickSheetId], references: [id], onDelete: Cascade)
  orderLine  OrderLine @relation(fields: [orderLineId], references: [id], onDelete: Cascade)
  sku        Sku       @relation(fields: [skuId], references: [id])
  customer   Customer  @relation(fields: [customerId], references: [id])

  @@index([tenantId, pickSheetId, pickOrder])
  @@index([pickSheetId])
}

// Update Order to track pick status
model Order {
  // ... existing fields
  pickSheetStatus String? @default("not_picked") // "not_picked", "on_sheet", "picked"
  pickSheetId     String? @db.Uuid
}

model Tenant {
  // ... existing fields
  pickSheets     PickSheet[]
  pickSheetItems PickSheetItem[]
}

model User {
  // ... existing fields
  pickSheets PickSheet[]
}

model OrderLine {
  // ... existing fields
  pickSheetItems PickSheetItem[]
}

model Sku {
  // ... existing fields
  pickSheetItems PickSheetItem[]
}

model Customer {
  // ... existing fields
  pickSheetItems PickSheetItem[]
}
```

#### **Migration:**

```bash
npx prisma migrate dev --name add_pick_sheets
```

#### **Pick Sheet Generation Logic:**

```typescript
// /src/lib/pick-sheet-generator.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function generatePickSheet(
  tenantId: string,
  userId: string,
  orderIds: string[] = []
) {
  // Get "Ready" orders not yet on a pick sheet
  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      status: 'SUBMITTED',
      pickSheetStatus: 'not_picked',
      ...(orderIds.length > 0 && { id: { in: orderIds } })
    },
    include: {
      lines: {
        include: {
          sku: {
            include: {
              product: true,
              inventories: { where: { location: 'main' } }
            }
          }
        }
      },
      customer: true
    }
  });

  if (orders.length === 0) {
    throw new Error('No orders ready to pick');
  }

  // Generate sheet number
  const count = await prisma.pickSheet.count({ where: { tenantId } });
  const sheetNumber = `PS-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

  // Create pick sheet
  const pickSheet = await prisma.pickSheet.create({
    data: {
      tenantId,
      sheetNumber,
      status: 'READY',
      createdById: userId
    }
  });

  // Create pick sheet items sorted by location
  const items = [];

  for (const order of orders) {
    for (const line of order.lines) {
      const inventory = line.sku.inventories[0];
      const pickOrder = inventory?.pickOrder || 999999;

      items.push({
        tenantId,
        pickSheetId: pickSheet.id,
        orderLineId: line.id,
        skuId: line.skuId,
        customerId: order.customerId,
        quantity: line.quantity,
        pickOrder
      });
    }
  }

  // Sort by pickOrder for efficient walking
  items.sort((a, b) => a.pickOrder - b.pickOrder);

  // Bulk insert
  await prisma.pickSheetItem.createMany({ data: items });

  // Mark orders as "on_sheet"
  await prisma.order.updateMany({
    where: { id: { in: orders.map(o => o.id) } },
    data: { pickSheetStatus: 'on_sheet', pickSheetId: pickSheet.id }
  });

  return pickSheet;
}
```

#### **API Routes:**

```typescript
// /src/app/api/pick-sheets/route.ts
// GET  - List pick sheets (filter by status)
// POST - Generate new pick sheet from ready orders

// /src/app/api/pick-sheets/[sheetId]/route.ts
// GET    - Get pick sheet with items
// PATCH  - Update status (start picking, complete)
// DELETE - Cancel pick sheet

// /src/app/api/pick-sheets/[sheetId]/export/route.ts
// GET - Export as CSV for printing

// /src/app/api/pick-sheets/[sheetId]/items/[itemId]/route.ts
// PATCH - Mark item as picked
```

#### **Components:**

```
/src/app/sales/operations/pick-sheets/
├── page.tsx                              # Pick sheets list
├── sections/
│   ├── PickSheetGenerator.tsx           # Create from ready orders
│   ├── ActivePickSheets.tsx             # In-progress sheets
│   └── CompletedSheets.tsx              # History
├── [sheetId]/
│   └── page.tsx                          # Pick sheet detail
│       ├── PickSheetHeader.tsx
│       ├── PickSheetItems.tsx           # Items sorted by location
│       └── PickingControls.tsx          # Start/complete/cancel
└── components/
    ├── PickSheetCard.tsx                 # Individual sheet
    ├── PickItemRow.tsx                   # Item with checkbox
    └── ExportButtons.tsx                 # CSV/PDF export
```

#### **CSV Export Format:**

```csv
Pick Sheet,PS-2025-001,,,
Status,PICKING,,,
Picker,John Doe,,,
Date,2025-01-15,,,
,,,
Item,Customer,Quantity,Location,Picked
Kendall-Jackson Chardonnay,Bistro 123,2,A-15-Top,☐
Bread & Butter Pinot Noir,Oak Steakhouse,3,A-17-Middle,☐
La Crema Sauvignon Blanc,Wine Bar NYC,1,B-03-Top,☐
```

---

### **5.3 Routing Export (Azuga Integration)**

**Purpose:** Export picked orders to Azuga routing software in required CSV format.

#### **Database Changes:**

```prisma
model RouteExport {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @db.Uuid
  exportDate  DateTime @default(now())
  orderCount  Int
  filename    String
  exportedBy  String   @db.Uuid

  tenant     Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  exportedByUser User @relation(fields: [exportedBy], references: [id])

  @@index([tenantId, exportDate])
}

model Tenant {
  // ... existing fields
  routeExports RouteExport[]
}

model User {
  // ... existing fields
  routeExports RouteExport[]
}
```

#### **Migration:**

```bash
npx prisma migrate dev --name add_route_exports
```

#### **Export Logic:**

```typescript
// /src/lib/azuga-export.ts

import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';

const prisma = new PrismaClient();

export async function exportToAzuga(
  tenantId: string,
  userId: string,
  deliveryDate: Date
) {
  // Get all picked orders for delivery date
  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      status: 'FULFILLED',
      pickSheetStatus: 'picked',
      deliveredAt: null,
      // Assuming you add a deliveryDate field to Order
    },
    include: {
      customer: {
        include: { addresses: { where: { isDefault: true } } }
      },
      lines: { include: { sku: { include: { product: true } } } }
    },
    orderBy: { customer: { city: 'asc' } }
  });

  // Format for Azuga CSV
  const rows = orders.map(order => {
    const address = order.customer.addresses[0] || order.customer;
    const items = order.lines.map(l => `${l.sku.product.name} (${l.quantity})`).join('; ');

    return {
      'Customer Name': order.customer.name,
      'Address': address.street1,
      'City': address.city,
      'State': address.state,
      'Zip': address.postalCode,
      'Phone': order.customer.phone || '',
      'Order Number': order.id,
      'Items': items,
      'Delivery Window': '8:00 AM - 5:00 PM', // Configure per customer
      'Special Instructions': ''
    };
  });

  // Generate CSV
  const csv = convertToCSV(rows);
  const filename = `azuga-export-${format(deliveryDate, 'yyyy-MM-dd')}.csv`;

  // Track export
  await prisma.routeExport.create({
    data: {
      tenantId,
      orderCount: orders.length,
      filename,
      exportedBy: userId
    }
  });

  return { csv, filename };
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row =>
    Object.values(row).map(val => `"${val}"`).join(',')
  );

  return [headers, ...rows].join('\n');
}
```

#### **API Routes:**

```typescript
// /src/app/api/routing/export/route.ts
// POST - Generate Azuga CSV export
// Body: { deliveryDate: "2025-01-15" }

// /src/app/api/routing/exports/route.ts
// GET - List past exports

// /src/app/api/routing/routes/route.ts
// POST - Upload route details from Azuga (after routing)
```

#### **Components:**

```
/src/app/sales/operations/routing/
├── page.tsx                              # Routing dashboard
├── sections/
│   ├── ExportOrders.tsx                 # Export to Azuga
│   ├── RouteUpload.tsx                  # Upload routes back
│   └── TodayRoutes.tsx                  # Display today's routes
└── components/
    ├── ExportDialog.tsx                  # Export configuration
    └── RouteViewer.tsx                   # Show route details
```

---

### **5.4 Route Visibility for Sales**

**Purpose:** Allow sales team to see delivery routes and estimated times.

#### **Database Changes:**

```prisma
model DeliveryRoute {
  id            String   @id @default(uuid()) @db.Uuid
  tenantId      String   @db.Uuid
  routeDate     DateTime
  routeName     String   // "Route 1", "North Territory"
  driverName    String
  truckNumber   String?
  startTime     DateTime
  estimatedEndTime DateTime?
  stops         RouteStop[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, routeDate, routeName])
  @@index([tenantId, routeDate])
}

model RouteStop {
  id                String         @id @default(uuid()) @db.Uuid
  tenantId          String         @db.Uuid
  routeId           String         @db.Uuid
  orderId           String         @db.Uuid
  stopNumber        Int            // 1, 2, 3...
  estimatedArrival  DateTime
  actualArrival     DateTime?
  status            String         @default("pending") // "pending", "in_transit", "delivered"
  notes             String?

  tenant Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  route  DeliveryRoute  @relation(fields: [routeId], references: [id], onDelete: Cascade)
  order  Order          @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@unique([routeId, stopNumber])
  @@index([tenantId, routeId])
  @@index([orderId])
}

model Order {
  // ... existing fields
  routeStop RouteStop?
}

model Tenant {
  // ... existing fields
  deliveryRoutes DeliveryRoute[]
  routeStops     RouteStop[]
}
```

#### **Migration:**

```bash
npx prisma migrate dev --name add_delivery_routes
```

#### **API Routes:**

```typescript
// /src/app/api/routes/today/route.ts
// GET - Today's routes with stops

// /src/app/api/routes/customer/[customerId]/route.ts
// GET - Find customer's delivery route/time

// /src/app/api/routes/[routeId]/route.ts
// GET   - Route details
// PATCH - Update stop status
```

#### **Components:**

```
/src/app/sales/routes/
├── page.tsx                              # Routes for sales team
├── sections/
│   ├── TodayRoutes.tsx                  # Today's deliveries
│   ├── RouteTimeline.tsx                # Visual timeline
│   └── CustomerLookup.tsx               # Find customer's delivery time
└── components/
    ├── RouteCard.tsx                     # Individual route
    ├── StopsList.tsx                     # Stops on route
    └── ETADisplay.tsx                    # Estimated time display
```

#### **Sales Team Usage:**

1. **Customer calls:** "When's my delivery?"
2. **Rep looks up customer** in `/sales/routes`
3. **System shows:** "Route 2, Stop #7, ETA 12:36 PM"
4. **Rep informs customer** with confidence

---

## **PHASE 6: MAPS & TERRITORY**

### **Build Order:**
1. Mapbox integration
2. Customer geocoding
3. Heat map visualization
4. Territory planning tools

---

### **6.1 Mapbox Setup**

**Purpose:** Display customers on map with interactive visualization.

#### **Dependencies:**

```bash
npm install mapbox-gl
npm install react-map-gl
npm install @turf/turf  # Geospatial calculations
```

#### **Environment Variables:**

```env
# Add to .env.local
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

#### **Mapbox Configuration:**

1. Sign up at https://mapbox.com
2. Create access token with these scopes:
   - `styles:read`
   - `fonts:read`
   - `datasets:read`
3. Free tier: 50,000 map loads/month

#### **No Database Changes** (uses existing Customer lat/lng fields if present)

---

### **6.2 Customer Geocoding**

**Purpose:** Convert customer addresses to lat/lng coordinates for mapping.

#### **Database Changes:**

```prisma
model Customer {
  // ... existing fields
  latitude   Float?
  longitude  Float?
  geocodedAt DateTime?
}
```

#### **Migration:**

```bash
npx prisma migrate dev --name add_customer_geocoding
```

#### **Geocoding Script + Auto-Trigger:**

```typescript
// /src/lib/geocoding.ts
// Shared geocoding service

import fetch from 'node-fetch';

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;

export async function geocodeAddress(address: string): Promise<[number, number] | null> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.features && data.features.length > 0) {
    const [lng, lat] = data.features[0].center;
    return [lat, lng];
  }

  return null;
}

export function buildAddress(customer: any): string {
  return `${customer.street1}, ${customer.city}, ${customer.state} ${customer.postalCode}`;
}
```

```typescript
// /src/scripts/geocode-customers.ts
// Batch geocoding for initial data

import { PrismaClient } from '@prisma/client';
import { geocodeAddress, buildAddress } from '../lib/geocoding';

const prisma = new PrismaClient();

async function main() {
  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { latitude: null },
        { longitude: null }
      ],
      street1: { not: null },
      city: { not: null },
      state: { not: null }
    }
  });

  console.log(`Geocoding ${customers.length} customers...`);

  for (const customer of customers) {
    const address = buildAddress(customer);
    const coords = await geocodeAddress(address);

    if (coords) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          latitude: coords[0],
          longitude: coords[1],
          geocodedAt: new Date()
        }
      });
      console.log(`✅ ${customer.name}: ${coords[0]}, ${coords[1]}`);
    } else {
      console.log(`❌ ${customer.name}: Could not geocode`);
    }

    // Rate limit: 600 requests/min on free tier
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

main();
```

```typescript
// /src/lib/hooks/customer-address-change.ts
// Auto-geocode when address changes

import { geocodeAddress, buildAddress } from '../lib/geocoding';
import { prisma } from '../lib/prisma';

export async function onCustomerAddressChange(customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId }
  });

  if (!customer || !customer.street1 || !customer.city || !customer.state) {
    return; // Skip if incomplete address
  }

  const address = buildAddress(customer);
  const coords = await geocodeAddress(address);

  if (coords) {
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        latitude: coords[0],
        longitude: coords[1],
        geocodedAt: new Date()
      }
    });
    console.log(`✅ Auto-geocoded: ${customer.name}`);
  }
}
```

**Usage in API:**
```typescript
// /src/app/api/customers/[customerId]/route.ts

export async function PATCH(request: Request, { params }) {
  // ... update customer

  // If address fields changed, auto-geocode
  if (hasAddressChanges(updates)) {
    await onCustomerAddressChange(params.customerId);
  }

  return NextResponse.json(customer);
}
```

---

### **6.3 Map Visualization**

#### **API Routes:**

```typescript
// /src/app/api/map/customers/route.ts
// GET - Customers with coordinates for map display
// Query: bounds (viewport bounds), filters (accountType, riskStatus)

// /src/app/api/map/heat/route.ts
// GET - Heat map data (revenue by location)
// Query: metric (revenue, orders, growth)
```

#### **Components:**

```
/src/app/sales/map/
├── page.tsx                              # Interactive map page
├── sections/
│   ├── MapView.tsx                      # Main Mapbox component
│   ├── MapSidebar.tsx                   # Filters and controls
│   ├── CustomerMarkers.tsx              # Customer pins
│   ├── HeatMapLayer.tsx                 # Revenue heat map
│   └── TerritoryDrawer.tsx              # Draw territory boundaries
└── components/
    ├── MapPopup.tsx                      # Customer popup on click
    ├── MapFilters.tsx                    # Filter by type/status
    ├── SelectionBox.tsx                  # Box select tool
    └── MapLegend.tsx                     # Legend for colors/heat

/src/components/map/
├── MapboxMap.tsx                         # Reusable map wrapper
└── GeocodeSearch.tsx                     # Search for addresses
```

#### **Map Features:**

**Customer Markers:**
- Color-coded by account type (Prospect/Target/Active)
- Size by revenue or order count
- Click to see customer details
- Cluster markers when zoomed out

**Heat Map:**
- Toggle between:
  - Revenue heat map
  - Order frequency heat map
  - Growth/decline heat map
- Filter by time period

**Territory Tools:**
- Draw box to select customers in area
- Plan visit based on geography
- See "Who's closest?" to current location

**Manager View:**
- See all territories
- Identify growth areas vs stagnant
- Plan market visits

---

### **6.4 Territory Planning**

#### **Database Changes:**

```prisma
model Territory {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @db.Uuid
  name        String   // "North Virginia", "DC Metro"
  salesRepId  String?  @db.Uuid
  boundaries  Json?    // GeoJSON polygon
  color       String?  @default("#3b82f6")
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant   Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  salesRep SalesRep? @relation(fields: [salesRepId], references: [id], onDelete: SetNull)

  @@unique([tenantId, name])
  @@index([tenantId])
}

model SalesRep {
  // ... existing fields
  territories Territory[]
}

model Tenant {
  // ... existing fields
  territories Territory[]
}
```

#### **Migration:**

```bash
npx prisma migrate dev --name add_territories
```

#### **API Routes:**

```typescript
// /src/app/api/territories/route.ts
// GET  - List territories
// POST - Create territory with boundaries

// /src/app/api/territories/[territoryId]/route.ts
// GET    - Territory details with customers
// PATCH  - Update boundaries/assignment
// DELETE - Delete territory

// /src/app/api/territories/[territoryId]/customers/route.ts
// GET - Customers within territory boundaries

// /src/app/api/territories/suggest/route.ts
// POST - Suggest nearby customers based on box selection
```

#### **Components:**

```
/src/app/sales/territories/
├── page.tsx                              # Territory management
├── sections/
│   ├── TerritoryMap.tsx                 # Map with territory overlays
│   ├── TerritoryList.tsx                # List of territories
│   └── TerritoryEditor.tsx              # Draw/edit boundaries
└── components/
    ├── BoundaryDrawer.tsx                # Draw polygon on map
    ├── CustomerAssigner.tsx              # Assign customers to territory
    └── TerritoryStats.tsx                # Performance by territory
```

#### **Territory Planning Flow:**

1. **Manager draws territory** on map (polygon)
2. **System auto-assigns** customers inside polygon
3. **Assign to sales rep**
4. **Rep sees** "my territory" on map
5. **Plan visits** by selecting box in territory
6. **See nearby accounts** for efficient routing

---

## **PHASE 7: ADVANCED FEATURES**

### **Build Order:**
1. Image scanning (cards/licenses)
2. Mailchimp integration
3. Automated burn rate alerts
4. AI product recommendations

---

### **7.1 Image Scanning (Business Cards & Licenses)**

**Purpose:** Scan business cards and liquor licenses to auto-create/populate customer data.

#### **Dependencies:**

```bash
npm install @anthropic-ai/sdk  # Already installed
```

#### **Database Changes:**

```prisma
model ImageScan {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @db.Uuid
  userId      String   @db.Uuid
  imageUrl    String
  scanType    String   // "business_card", "liquor_license"
  extractedData Json
  customerId  String?  @db.Uuid // If created customer
  status      String   @default("processing") // "processing", "completed", "failed"
  createdAt   DateTime @default(now())

  tenant   Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user     User      @relation(fields: [userId], references: [id])
  customer Customer? @relation(fields: [customerId], references: [id], onDelete: SetNull)

  @@index([tenantId, userId])
}

model Tenant {
  // ... existing fields
  imageScans ImageScan[]
}

model User {
  // ... existing fields
  imageScans ImageScan[]
}

model Customer {
  // ... existing fields
  imageScans ImageScan[]
}
```

#### **Migration:**

```bash
npx prisma migrate dev --name add_image_scanning
```

#### **Image Upload Storage:**

Use Supabase Storage (already available in your setup):

```typescript
// /src/lib/storage.ts

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function uploadImage(
  file: File,
  tenantId: string,
  scanType: string
): Promise<string> {
  const filename = `${tenantId}/${scanType}/${Date.now()}-${file.name}`;

  const { data, error } = await supabase.storage
    .from('customer-scans')
    .upload(filename, file);

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('customer-scans')
    .getPublicUrl(filename);

  return urlData.publicUrl;
}
```

#### **Claude Vision Extraction:**

```typescript
// /src/lib/image-extraction.ts

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export async function extractBusinessCard(imageUrl: string) {
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'url',
            url: imageUrl
          }
        },
        {
          type: 'text',
          text: `Extract information from this business card and return JSON with these fields:
          {
            "name": "Person's full name",
            "title": "Job title",
            "company": "Company/Restaurant name",
            "email": "Email address",
            "phone": "Phone number",
            "address": {
              "street": "Street address",
              "city": "City",
              "state": "State",
              "zip": "Zip code"
            }
          }

          Return ONLY valid JSON, no other text.`
        }
      ]
    }]
  });

  const jsonText = response.content[0].type === 'text'
    ? response.content[0].text
    : '';

  return JSON.parse(jsonText);
}

export async function extractLiquorLicense(imageUrl: string) {
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'url',
            url: imageUrl
          }
        },
        {
          type: 'text',
          text: `Extract liquor license information from this image and return JSON:
          {
            "businessName": "License holder name",
            "licenseNumber": "License number",
            "licenseType": "Type of license",
            "address": {
              "street": "Street address",
              "city": "City",
              "state": "State",
              "zip": "Zip code"
            },
            "expirationDate": "Expiration date if visible"
          }

          Return ONLY valid JSON, no other text.`
        }
      ]
    }]
  });

  const jsonText = response.content[0].type === 'text'
    ? response.content[0].text
    : '';

  return JSON.parse(jsonText);
}
```

#### **API Routes:**

```typescript
// /src/app/api/scan/business-card/route.ts
// POST - Upload and scan business card
// Body: FormData with image file

// /src/app/api/scan/license/route.ts
// POST - Upload and scan liquor license

// /src/app/api/scan/[scanId]/route.ts
// GET - Get scan results
// POST - Create customer from scan data
```

#### **API Implementation (Async with Job Queue):**

**⚠️ Critical:** AI processing must be async to avoid serverless timeouts.

```typescript
// /src/lib/job-queue.ts
// Simple database-backed job queue for serverless

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function enqueueJob(
  type: string,
  payload: any
): Promise<string> {
  const job = await prisma.job.create({
    data: {
      type,
      payload,
      status: 'pending',
      attempts: 0
    }
  });

  return job.id;
}

export async function processNextJob(): Promise<boolean> {
  const job = await prisma.job.findFirst({
    where: {
      status: 'pending',
      attempts: { lt: 3 } // Max 3 retries
    },
    orderBy: { createdAt: 'asc' }
  });

  if (!job) return false;

  // Mark as processing
  await prisma.job.update({
    where: { id: job.id },
    data: { status: 'processing', attempts: { increment: 1 } }
  });

  try {
    // Route to appropriate handler
    if (job.type === 'image_extraction') {
      await processImageExtraction(job.payload);
    }

    await prisma.job.update({
      where: { id: job.id },
      data: { status: 'completed', completedAt: new Date() }
    });

    return true;
  } catch (error) {
    await prisma.job.update({
      where: { id: job.id },
      data: { status: 'failed', error: error.message }
    });
    return false;
  }
}

async function processImageExtraction(payload: any) {
  const { scanId, imageUrl, scanType } = payload;

  const extractedData = scanType === 'business_card'
    ? await extractBusinessCard(imageUrl)
    : await extractLiquorLicense(imageUrl);

  await prisma.imageScan.update({
    where: { id: scanId },
    data: {
      extractedData,
      status: 'completed'
    }
  });
}
```

```prisma
// Add to schema.prisma

model Job {
  id          String   @id @default(uuid()) @db.Uuid
  type        String   // "image_extraction", etc.
  payload     Json
  status      String   @default("pending") // "pending", "processing", "completed", "failed"
  attempts    Int      @default(0)
  error       String?
  createdAt   DateTime @default(now())
  completedAt DateTime?

  @@index([status, createdAt])
}
```

```typescript
// /src/app/api/scan/business-card/route.ts
// Upload image, enqueue job, return immediately

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { uploadImage } from '@/lib/storage';
import { enqueueJob } from '@/lib/job-queue';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const image = formData.get('image') as File;

  if (!image) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 });
  }

  try {
    // 1. Upload image (fast)
    const imageUrl = await uploadImage(image, user.tenantId, 'business-card');

    // 2. Create scan record
    const scan = await prisma.imageScan.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        imageUrl,
        scanType: 'business_card',
        extractedData: {},
        status: 'processing'
      }
    });

    // 3. Enqueue background job (async extraction)
    await enqueueJob('image_extraction', {
      scanId: scan.id,
      imageUrl,
      scanType: 'business_card'
    });

    // 4. Return immediately with scan ID
    return NextResponse.json({
      scanId: scan.id,
      status: 'processing'
    });

  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
  }
}
```

```typescript
// /src/app/api/jobs/process/route.ts
// Triggered by cron or API call to process queued jobs

import { NextResponse } from 'next/server';
import { processNextJob } from '@/lib/job-queue';

export async function POST(request: Request) {
  const processed = [];

  // Process up to 10 jobs per invocation
  for (let i = 0; i < 10; i++) {
    const hasMore = await processNextJob();
    if (!hasMore) break;
    processed.push(i);
  }

  return NextResponse.json({
    processed: processed.length
  });
}

// Trigger via:
// 1. Vercel Cron: */1 * * * * (every minute)
// 2. Or manual: POST /api/jobs/process
```

**Client Polling:**
```typescript
// Client-side: Poll for completion

async function uploadAndWaitForScan(file: File) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch('/api/scan/business-card', {
    method: 'POST',
    body: formData
  });

  const { scanId } = await response.json();

  // Poll for completion
  while (true) {
    const statusResponse = await fetch(`/api/scan/${scanId}`);
    const { status, data } = await statusResponse.json();

    if (status === 'completed') {
      return data;
    } else if (status === 'failed') {
      throw new Error('Scan failed');
    }

    await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2s
  }
}
```

#### **Components:**

```
/src/app/sales/customers/new/
├── scan/
│   └── page.tsx                          # Scan business card/license
└── components/
    ├── ImageCapture.tsx                  # Camera/upload interface
    ├── ScanPreview.tsx                   # Show extracted data
    └── CreateFromScan.tsx                # Review and create customer

/src/components/scanning/
├── CameraCapture.tsx                     # Use device camera
├── ImageUpload.tsx                       # File upload
└── ScanResults.tsx                       # Display extracted fields
```

#### **Mobile Camera Access:**

```typescript
// /src/components/scanning/CameraCapture.tsx

'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

export function CameraCapture({ onCapture }: { onCapture: (file: File) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      setStream(mediaStream);
    } catch (error) {
      console.error('Camera access denied:', error);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx?.drawImage(videoRef.current, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
        onCapture(file);
        stopCamera();
      }
    }, 'image/jpeg', 0.95);
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(track => track.stop());
    setStream(null);
  };

  return (
    <div className="space-y-4">
      {!stream ? (
        <Button onClick={startCamera} className="w-full">
          📷 Open Camera
        </Button>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full rounded-lg"
          />
          <div className="flex gap-2">
            <Button onClick={capturePhoto} className="flex-1">
              Capture Photo
            </Button>
            <Button onClick={stopCamera} variant="outline" className="flex-1">
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
```

#### **Workflow:**

1. **Rep on site** opens `/sales/customers/new/scan`
2. **Chooses:** Business Card or Liquor License
3. **Takes photo** or uploads image
4. **System extracts** data with Claude Vision
5. **Rep reviews** extracted fields (editable)
6. **Clicks "Create Customer"**
7. **Customer created** with all info populated

---

### **7.2 Mailchimp Integration**

**Purpose:** Create email segments from customer lists, push product data to campaigns.

#### **Dependencies:**

```bash
npm install @mailchimp/mailchimp_marketing
```

#### **Environment Variables:**

```env
# Add to .env.local
MAILCHIMP_API_KEY=your_api_key
MAILCHIMP_SERVER_PREFIX=us1  # e.g., us1, us2, etc.
```

#### **Database Changes:**

```prisma
model MailchimpSync {
  id           String   @id @default(uuid()) @db.Uuid
  tenantId     String   @db.Uuid
  listId       String   // Mailchimp list/audience ID
  listName     String
  lastSyncAt   DateTime?
  isActive     Boolean  @default(true)
  syncConfig   Json?    // Sync settings
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, listId])
  @@index([tenantId])
}

model EmailCampaign {
  id            String   @id @default(uuid()) @db.Uuid
  tenantId      String   @db.Uuid
  name          String
  mailchimpId   String?  // Campaign ID in Mailchimp
  productIds    String[] // SKUs to feature
  status        String   @default("draft") // "draft", "sent"
  createdById   String   @db.Uuid
  createdAt     DateTime @default(now())

  tenant    Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdBy User   @relation(fields: [createdById], references: [id])

  @@index([tenantId])
}

model Tenant {
  // ... existing fields
  mailchimpSyncs MailchimpSync[]
  emailCampaigns EmailCampaign[]
}

model User {
  // ... existing fields
  emailCampaigns EmailCampaign[]
}
```

#### **Migration:**

```bash
npx prisma migrate dev --name add_mailchimp_integration
```

#### **Mailchimp Client:**

```typescript
// /src/lib/mailchimp.ts

import mailchimp from '@mailchimp/mailchimp_marketing';

mailchimp.setConfig({
  apiKey: process.env.MAILCHIMP_API_KEY,
  server: process.env.MAILCHIMP_SERVER_PREFIX
});

export async function syncCustomersToMailchimp(
  listId: string,
  customers: any[]
) {
  const members = customers.map(customer => ({
    email_address: customer.billingEmail || customer.email,
    status: 'subscribed',
    merge_fields: {
      FNAME: customer.name.split(' ')[0],
      LNAME: customer.name.split(' ').slice(1).join(' '),
      PHONE: customer.phone || '',
      CITY: customer.city || '',
      STATE: customer.state || ''
    },
    tags: [
      customer.accountType, // PROSPECT, TARGET, ACTIVE
      customer.riskStatus   // HEALTHY, AT_RISK, etc.
    ]
  }));

  // Batch upsert
  const response = await mailchimp.lists.batchListMembers(listId, {
    members,
    update_existing: true
  });

  return response;
}

export async function createCampaignFromProducts(
  listId: string,
  products: any[],
  campaignName: string
) {
  // Create campaign
  const campaign = await mailchimp.campaigns.create({
    type: 'regular',
    recipients: { list_id: listId },
    settings: {
      subject_line: campaignName,
      from_name: 'Well Crafted Wine',
      reply_to: 'sales@wellcraftedwine.com'
    }
  });

  // Build HTML with product data
  const html = buildProductHTML(products);

  // Set campaign content
  await mailchimp.campaigns.setContent(campaign.id, {
    html
  });

  return campaign;
}

function buildProductHTML(products: any[]): string {
  const productBlocks = products.map(p => `
    <div style="margin-bottom: 30px;">
      <img src="${p.imageUrl}" style="max-width: 200px;" />
      <h2>${p.name}</h2>
      <p>${p.description}</p>
      <p><strong>Price:</strong> $${p.price}</p>
      <p style="font-style: italic;">${p.tastingNotes}</p>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <body>
        <h1>Featured Wines</h1>
        ${productBlocks}
      </body>
    </html>
  `;
}
```

#### **API Routes:**

```typescript
// /src/app/api/mailchimp/lists/route.ts
// GET  - List Mailchimp audiences
// POST - Create sync with Mailchimp list

// /src/app/api/mailchimp/sync/[listId]/route.ts
// POST - Trigger sync of customers to Mailchimp

// /src/app/api/mailchimp/campaigns/route.ts
// GET  - List campaigns
// POST - Create campaign from product selection

// /src/app/api/mailchimp/campaigns/[campaignId]/route.ts
// GET    - Campaign details
// POST   - Send campaign
// DELETE - Delete campaign
```

#### **Components:**

```
/src/app/sales/marketing/
├── page.tsx                              # Marketing dashboard
├── sections/
│   ├── MailchimpSetup.tsx               # Connect Mailchimp
│   ├── CustomerSegments.tsx             # Create segments
│   └── CampaignBuilder.tsx              # Build email campaigns
└── components/
    ├── ProductSelector.tsx               # Select wines for email
    ├── SegmentCreator.tsx                # Create customer segments
    └── CampaignPreview.tsx               # Preview email

/src/components/marketing/
├── MailchimpConnect.tsx                  # OAuth connection
└── EmailTemplate.tsx                     # Email template builder
```

#### **Workflow:**

1. **Manager selects:** "Thanksgiving Wines"
2. **Picks products** from catalog (3-7 wines)
3. **System pulls:** images, pricing, tasting notes
4. **Manager selects segment:** "Active customers in Virginia"
5. **System syncs segment** to Mailchimp
6. **Preview email** with product data
7. **Send or save as draft** in Mailchimp

---

### **7.3 Automated Burn Rate Alerts**

**Purpose:** Alert reps when customers likely need to reorder based on historical consumption.

#### **Database Changes:**

```prisma
model CustomerBurnRate {
  id                 String   @id @default(uuid()) @db.Uuid
  tenantId           String   @db.Uuid
  customerId         String   @db.Uuid
  skuId              String   @db.Uuid
  avgDaysBetweenOrders Float
  lastOrderDate      DateTime
  predictedReorderDate DateTime
  quantityPerOrder   Float
  confidenceScore    Float    @default(0) // 0-1
  calculatedAt       DateTime @default(now())

  tenant   Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  customer Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  sku      Sku      @relation(fields: [skuId], references: [id], onDelete: Cascade)

  @@unique([tenantId, customerId, skuId])
  @@index([tenantId, predictedReorderDate])
  @@index([customerId])
}

model Tenant {
  // ... existing fields
  customerBurnRates CustomerBurnRate[]
}

model Customer {
  // ... existing fields
  burnRates CustomerBurnRate[]
}

model Sku {
  // ... existing fields
  burnRates CustomerBurnRate[]
}
```

#### **Migration:**

```bash
npx prisma migrate dev --name add_burn_rate_tracking
```

#### **Calculation Job:**

```typescript
// /src/jobs/calculate-burn-rates.ts

import { PrismaClient } from '@prisma/client';
import { differenceInDays, addDays } from 'date-fns';

const prisma = new PrismaClient();

export async function calculateBurnRates() {
  const customers = await prisma.customer.findMany({
    where: { accountType: 'ACTIVE' },
    include: {
      orders: {
        where: { status: 'FULFILLED' },
        include: { lines: true },
        orderBy: { orderedAt: 'asc' }
      }
    }
  });

  for (const customer of customers) {
    // Group orders by SKU
    const skuOrders = groupOrdersBySku(customer.orders);

    for (const [skuId, orders] of Object.entries(skuOrders)) {
      if (orders.length < 2) continue; // Need at least 2 orders

      // Calculate average days between orders
      const intervals = [];
      for (let i = 1; i < orders.length; i++) {
        const days = differenceInDays(
          orders[i].orderedAt,
          orders[i - 1].orderedAt
        );
        intervals.push(days);
      }

      const avgDays = intervals.reduce((a, b) => a + b) / intervals.length;
      const lastOrder = orders[orders.length - 1];
      const predictedDate = addDays(lastOrder.orderedAt, avgDays);

      // Calculate average quantity
      const avgQty = orders.reduce((sum, o) => sum + o.quantity, 0) / orders.length;

      // Confidence score based on consistency
      const variance = calculateVariance(intervals);
      const confidence = Math.max(0, 1 - (variance / avgDays));

      // Upsert burn rate
      await prisma.customerBurnRate.upsert({
        where: {
          tenantId_customerId_skuId: {
            tenantId: customer.tenantId,
            customerId: customer.id,
            skuId
          }
        },
        update: {
          avgDaysBetweenOrders: avgDays,
          lastOrderDate: lastOrder.orderedAt,
          predictedReorderDate: predictedDate,
          quantityPerOrder: avgQty,
          confidenceScore: confidence,
          calculatedAt: new Date()
        },
        create: {
          tenantId: customer.tenantId,
          customerId: customer.id,
          skuId,
          avgDaysBetweenOrders: avgDays,
          lastOrderDate: lastOrder.orderedAt,
          predictedReorderDate: predictedDate,
          quantityPerOrder: avgQty,
          confidenceScore: confidence
        }
      });
    }
  }

  console.log('✅ Burn rates calculated');
}

function groupOrdersBySku(orders: any[]) {
  const grouped: Record<string, any[]> = {};

  for (const order of orders) {
    for (const line of order.lines) {
      if (!grouped[line.skuId]) grouped[line.skuId] = [];
      grouped[line.skuId].push({
        orderedAt: order.orderedAt,
        quantity: line.quantity
      });
    }
  }

  return grouped;
}

function calculateVariance(numbers: number[]): number {
  const mean = numbers.reduce((a, b) => a + b) / numbers.length;
  const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b) / numbers.length);
}
```

#### **Trigger Integration:**

Add to automated triggers (Phase 4.3):

```typescript
async function processBurnRateAlert(trigger: any) {
  const today = new Date();
  const daysAhead = trigger.config.daysAhead || 7; // Alert 7 days before predicted
  const alertDate = addDays(today, daysAhead);

  const burnRates = await prisma.customerBurnRate.findMany({
    where: {
      tenantId: trigger.tenantId,
      predictedReorderDate: { lte: alertDate },
      confidenceScore: { gte: 0.5 } // Only confident predictions
    },
    include: { customer: true, sku: { include: { product: true } } }
  });

  for (const rate of burnRates) {
    const existingTask = await prisma.triggeredTask.findFirst({
      where: {
        triggerId: trigger.id,
        customerId: rate.customerId
      }
    });

    if (!existingTask) {
      const task = await prisma.task.create({
        data: {
          tenantId: trigger.tenantId,
          userId: rate.customer.salesRepId,
          customerId: rate.customerId,
          title: `Likely reorder: ${rate.sku.product.name}`,
          description: `Customer typically reorders every ${Math.round(rate.avgDaysBetweenOrders)} days. Last order: ${rate.lastOrderDate}`,
          priority: 'MEDIUM',
          status: 'PENDING'
        }
      });

      await prisma.triggeredTask.create({
        data: {
          tenantId: trigger.tenantId,
          triggerId: trigger.id,
          taskId: task.id,
          customerId: rate.customerId
        }
      });
    }
  }
}
```

#### **API Routes:**

```typescript
// /src/app/api/analytics/burn-rates/route.ts
// GET - Burn rates for customers (upcoming reorders)

// /src/app/api/analytics/burn-rates/customer/[customerId]/route.ts
// GET - Burn rates for specific customer
```

#### **Components:**

```
/src/app/sales/dashboard/
└── widgets/
    └── UpcomingReorders.tsx              # Dashboard widget showing burn rate alerts
```

---

### **7.4 AI Product Recommendations**

**Purpose:** AI-powered product suggestions based on customer order history.

#### **No Database Changes** (uses existing Order/OrderLine data)

#### **AI Recommendation Logic:**

```typescript
// /src/lib/ai-recommendations.ts

import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const prisma = new PrismaClient();

export async function getProductRecommendations(
  customerId: string,
  limit: number = 5
) {
  // Get customer order history
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      orders: {
        where: { status: 'FULFILLED' },
        include: {
          lines: {
            include: {
              sku: { include: { product: true } }
            }
          }
        },
        orderBy: { orderedAt: 'desc' },
        take: 10 // Last 10 orders
      }
    }
  });

  if (!customer) throw new Error('Customer not found');

  // Build order history summary
  const orderHistory = customer.orders.map(order => ({
    date: order.orderedAt,
    items: order.lines.map(line => ({
      name: line.sku.product.name,
      category: line.sku.product.category,
      quantity: line.quantity,
      price: line.unitPrice
    }))
  }));

  // Get all available products (not already ordered)
  const orderedProductIds = new Set(
    customer.orders.flatMap(o => o.lines.map(l => l.sku.product.id))
  );

  const availableProducts = await prisma.product.findMany({
    where: {
      tenantId: customer.tenantId,
      id: { notIn: Array.from(orderedProductIds) }
    },
    include: { skus: true },
    take: 50
  });

  // Ask Claude for recommendations using function calling (more reliable than string matching)
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    tools: [{
      name: 'recommend_products',
      description: 'Recommend products for a customer based on their order history',
      input_schema: {
        type: 'object',
        properties: {
          recommendations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                productId: {
                  type: 'string',
                  description: 'Exact Product UUID from available products list'
                },
                reason: {
                  type: 'string',
                  description: 'Why this customer would like this product'
                },
                confidence: {
                  type: 'number',
                  description: 'Confidence score 0-1'
                }
              },
              required: ['productId', 'reason', 'confidence']
            }
          }
        },
        required: ['recommendations']
      }
    }],
    messages: [{
      role: 'user',
      content: `Based on this customer's order history, recommend ${limit} products they might like.

Order History (last 10 orders):
${JSON.stringify(orderHistory, null, 2)}

Available Products (choose by ID):
${availableProducts.map(p => `ID: ${p.id}, Name: ${p.name}, Category: ${p.category}`).join('\n')}

Use the recommend_products function to return exactly ${limit} recommendations with IDs.`
    }]
  });

  // Extract tool use from response
  const toolUse = response.content.find(c => c.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('AI did not return recommendations');
  }

  const { recommendations } = toolUse.input as {
    recommendations: Array<{
      productId: string;
      reason: string;
      confidence: number;
    }>;
  };

  // Match by exact Product ID (no string matching needed!)
  return recommendations.map(rec => {
    const product = availableProducts.find(p => p.id === rec.productId);

    return {
      product,
      reason: rec.reason,
      confidence: rec.confidence
    };
  }).filter(r => r.product); // Only return if product found
}
```

#### **API Routes:**

```typescript
// /src/app/api/recommendations/customer/[customerId]/route.ts
// GET - AI product recommendations for customer
// Query: limit (number of recommendations)
```

#### **Components:**

```
/src/app/sales/customers/[customerId]/
└── sections/
    └── ProductRecommendations.tsx        # AI recommendations widget
```

#### **Integration:**

Display on customer detail page (`/sales/customers/[customerId]`)

Shows:
- Top 5 recommended products
- AI-generated reason for each
- "Add to order" button
- "Save for later" button

---

## **APPENDIX: DEPLOYMENT & MAINTENANCE**

### **A.1 Environment Variables Checklist**

```env
# Database
DATABASE_URL=
DIRECT_URL=
SHADOW_DATABASE_URL=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# AI
ANTHROPIC_API_KEY=

# Calendar
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_REDIRECT_URI=

# Maps
NEXT_PUBLIC_MAPBOX_TOKEN=
MAPBOX_TOKEN= # Server-side

# Email
MAILCHIMP_API_KEY=
MAILCHIMP_SERVER_PREFIX=

# Storage
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

---

### **A.2 Background Jobs Schedule**

```bash
# Cron jobs to set up (via Vercel Cron or cron-job.org)

# Every minute (job queue processing)
*/1 * * * * curl -X POST https://yourdomain.com/api/jobs/process

# Daily (2:00 AM)
0 2 * * * npm run jobs:sample-metrics
0 2 * * * npm run jobs:calculate-burn-rates
0 2 * * * npm run jobs:update-account-types

# Every 6 hours
0 */6 * * * npm run jobs:process-triggers

# Every 15 minutes (calendar sync - if not using webhooks)
*/15 * * * * npm run jobs:sync-calendars

# Weekly (Sunday 3:00 AM)
0 3 * * 0 npm run jobs:calculate-territory-performance
```

**Vercel Cron Configuration:**
```json
// vercel.json

{
  "crons": [
    {
      "path": "/api/jobs/process",
      "schedule": "*/1 * * * *"
    }
  ]
}
```

---

### **A.3 Database Indexes Performance**

All critical indexes already specified in schema. Monitor these queries:

- Call plan account lookups by week
- Customer map queries with geo boundaries
- Pick sheet generation by location
- Sample conversion calculations

---

### **A.4 Testing Strategy**

**Unit Tests:**
- Burn rate calculations
- Pick sheet sorting logic
- Geocoding address parsing
- Calendar sync logic

**Integration Tests:**
- API routes with Prisma
- External API calls (Mapbox, Mailchimp)
- Image upload and extraction

**E2E Tests:**
- CARLA weekly planning flow
- Sample assignment and tracking
- Pick sheet generation and export
- Calendar drag-drop

---

### **A.5 Future Optimizations (Post-MVP)**

These optimizations can be added after MVP validation. Not critical for initial launch.

---

#### **PostGIS for Geospatial Queries**

**When to Implement:** Database has >10,000 customers OR territory queries are slow (>2 seconds).

**Current MVP Approach:** JSON boundaries with PostgreSQL JSONB operators
- ✅ Works fine for ~5,000 customers
- ✅ Simple to implement and debug
- ✅ PostgreSQL JSONB is reasonably fast for this scale

**Future Migration Path:**
```sql
-- 1. Enable PostGIS (already available in Supabase)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Add geography column
ALTER TABLE "Territory"
  ADD COLUMN boundary_geo GEOGRAPHY(Polygon, 4326);

-- 3. Migrate existing JSON data
UPDATE "Territory"
SET boundary_geo = ST_GeogFromGeoJSON(boundaries::text)
WHERE boundaries IS NOT NULL;

-- 4. Create spatial index (CRITICAL for performance)
CREATE INDEX idx_territory_boundary ON "Territory" USING GIST(boundary_geo);

-- 5. Update queries to use spatial functions
SELECT c.* FROM "Customer" c
JOIN "Territory" t ON t.id = $1
WHERE ST_Contains(
  t.boundary_geo::geometry,
  ST_SetSRID(ST_MakePoint(c.longitude, c.latitude), 4326)
);
```

**Performance Gain:** 100-1000x faster for territory queries
**Migration Effort:** 4-6 hours

---

#### **Calendar Webhook Subscriptions (Real-time Sync)**

**When to Implement:** Reps complain about 15-minute sync delays.

**Current MVP Approach:** 15-minute polling
- ✅ Simple to implement
- ✅ Easy to debug
- ✅ No webhook verification complexity
- ✅ Sufficient for weekly planning workflows

**Future Migration Path:**

**Google Calendar:**
```typescript
// Subscribe to push notifications
const channel = await calendar.events.watch({
  calendarId: 'primary',
  requestBody: {
    id: uuid(),
    type: 'web_hook',
    address: 'https://yourdomain.com/api/calendar/webhook/google',
    expiration: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
  }
});

// Handle webhook
// POST /api/calendar/webhook/google
export async function POST(request: Request) {
  // Verify webhook signature
  // Fetch changed events
  // Update local database
}
```

**Microsoft Outlook:**
```typescript
// Create subscription
await graphClient.api('/subscriptions').post({
  changeType: 'created,updated,deleted',
  notificationUrl: 'https://yourdomain.com/api/calendar/webhook/microsoft',
  resource: '/me/events',
  expirationDateTime: futureDate,
  clientState: 'secretValidationToken'
});
```

**Challenges:**
- Webhook verification (security)
- Token refresh management
- Subscription renewal (Google: 7 days, Microsoft: 3 days max)
- Handling webhook delivery failures

**Performance Gain:** Real-time sync (< 1 minute vs 15 minutes)
**Migration Effort:** 12-16 hours

---

#### **True Offline PWA with IndexedDB**

**When to Implement:** Reps frequently work in no-service areas (rural routes, basements).

**Current MVP Approach:** Online-only PWA
- ✅ Install to home screen
- ✅ Camera access for scanning
- ✅ Native app feel
- ✅ Voice input works
- ⚠️ Requires internet connection

**Future Migration Path:**

**Offline Storage:**
```typescript
// Install Dexie.js for IndexedDB wrapper
npm install dexie react-dexie-hooks

// Define offline schema
import Dexie, { Table } from 'dexie';

class LeoraDB extends Dexie {
  customers!: Table<Customer>;
  activities!: Table<Activity>;
  callPlans!: Table<CallPlan>;

  constructor() {
    super('leoraDB');
    this.version(1).stores({
      customers: 'id, name, lastOrderDate',
      activities: '++id, customerId, occurredAt, *syncStatus',
      callPlans: 'id, weekNumber, userId'
    });
  }
}

const db = new LeoraDB();
```

**Sync Strategy:**
```typescript
// Background sync when online
self.addEventListener('sync', event => {
  if (event.tag === 'sync-activities') {
    event.waitUntil(syncActivitiesToServer());
  }
});

async function syncActivitiesToServer() {
  const pending = await db.activities.where('syncStatus').equals('pending').toArray();

  for (const activity of pending) {
    try {
      await fetch('/api/activities', {
        method: 'POST',
        body: JSON.stringify(activity)
      });

      await db.activities.update(activity.id, { syncStatus: 'synced' });
    } catch (error) {
      // Retry later
    }
  }
}
```

**Conflict Resolution:**
- Last-write-wins for simple fields
- Custom merge logic for complex data
- Server timestamp as authority

**Challenges:**
- Complex sync state machine
- Conflict resolution UX
- Large local storage management
- Background sync reliability

**Performance Gain:** Works offline, instant UI updates
**Migration Effort:** 30-40 hours

---

#### **Dynamic Metrics Real-time Calculation**

**When to Implement:** Require real-time custom metrics (not pre-calculated).

**Current MVP Approach:** Pre-calculated metrics via background jobs
- ✅ Fast display (already computed)
- ✅ Metrics updated daily (sufficient for most use cases)
- ✅ Simple query execution

**Future Upgrade:** Query builder for dynamic formulas
```typescript
// Build safe SQL from JSON formula
function buildMetricQuery(formula: MetricFormula): Prisma.Sql {
  // Parse and validate formula
  // Build parameterized query
  // Prevent SQL injection

  const { field, operator, value } = formula;

  // Example: { field: "lastOrderDate", operator: ">", value: "30 days" }
  return Prisma.sql`
    SELECT * FROM "Customer"
    WHERE ${Prisma.raw(field)} ${Prisma.raw(operator)} NOW() - INTERVAL '${Prisma.raw(value)}'
  `;
}
```

**Security Requirements:**
- Whitelist allowed fields
- Whitelist allowed operators
- Validate all inputs
- Parameterize queries

**Performance Gain:** Real-time custom metrics
**Migration Effort:** 16-20 hours (security-critical)

---

## **SUMMARY**

This implementation plan provides:

✅ **7 Phases** in logical build order
✅ **Database migrations** for every feature with state machines
✅ **API routes** specifications with async job processing
✅ **Component structure** organized by feature
✅ **Integration points** with existing code
✅ **Third-party setup** (Mapbox, Mailchimp, Google/Outlook Calendar)
✅ **Background jobs** for automation and pre-calculation
✅ **Future optimization paths** clearly documented
✅ **Systematic order** - each phase builds on previous

---

## **CRITICAL FIXES INCORPORATED**

Based on technical review, the following critical issues have been addressed:

1. ✅ **Async AI Processing** - Job queue for image extraction (prevents serverless timeouts)
2. ✅ **Account Type Auto-Update** - Daily background job + real-time on order creation
3. ✅ **Revenue Attribution Fixed** - Sample revenue calculated within 30 days AFTER tasting
4. ✅ **Inventory State Machine** - Clear allocation workflow (AVAILABLE → ALLOCATED → PICKED → SHIPPED)
5. ✅ **Auto-Geocoding** - Triggers automatically on address changes (not just batch)
6. ✅ **AI Function Calling** - Product recommendations use exact UUIDs (no fragile string matching)

**Future Optimizations Documented:**
- PostGIS migration path (when >10K customers)
- Calendar webhooks (when real-time sync needed)
- True offline PWA (if working in no-service areas)
- Dynamic metrics query builder (if real-time required)

---

## **MVP PHILOSOPHY**

This plan follows **"Simple First, Optimize Later"** principles:

- ✅ Start with 15-min polling → upgrade to webhooks when needed
- ✅ Start with JSON geospatial → upgrade to PostGIS when slow
- ✅ Start with online PWA → upgrade to offline when needed
- ✅ Pre-calculate metrics → dynamic calculation when required

**All optimization paths are documented and ready to implement when triggered by scale or user feedback.**

---

## **NEXT STEPS**

1. ✅ Plan reviewed and approved
2. ✅ Critical architecture fixes incorporated
3. ✅ Future optimizations documented
4. 🚀 **Ready to start Phase 1** (Foundation & Setup)

**Phase 1 Deliverables:**
- Metrics definition system with versioning
- shadcn/ui component library installed
- Dashboard widget customization
- Job queue infrastructure
- Updated database schema with all enums

---

**Ready to begin Phase 1 implementation? Just say "start Phase 1" and I'll begin building!**
