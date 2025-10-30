# Claude Code: Lovable Migration Instructions

## Overview
I need to migrate features from my Next.js wine distribution portal to a new Lovable (Vite/React) project that's already set up with the database schema and basic structure.

## Current Status

### ✅ Already Complete in Lovable (DO NOT REPLACE):
- Database schema (8 tables: Tenant, Profile, Customer, Product, Order, OrderLine, Invoice, Task)
- Authentication system with Supabase
- RLS policies and security
- Basic page structure (Dashboard, Contacts, Products, Tasks)
- Supabase connection configured
- Multi-tenant architecture

### 📦 What Needs to be Ported:

#### Priority 1: Sales Dashboard Components
**From:** `/Users/greghogue/Leora2/web/src/app/sales/dashboard/`
**To:** Lovable GitHub repo sections

Port these dashboard sections:
1. `revenue-metrics.tsx` - ARPDD calculations and revenue tracking
2. `customer-health.tsx` - Risk status tracking (HEALTHY, AT_RISK, CRITICAL)
3. `quota-tracking.tsx` - Sales rep quota progress
4. `task-list.tsx` - Today's tasks and follow-ups
5. `recent-orders.tsx` - Latest orders with status

**Key Adaptations:**
- Convert Next.js imports to React imports
- Replace Prisma queries with Supabase queries
- Use Lovable's existing auth context
- Keep the component structure but adapt data fetching

#### Priority 2: Customer Management
**From:** `/Users/greghogue/Leora2/web/src/app/sales/customers/`

Port these features:
1. Customer detail view with full information
2. Customer edit forms with validation
3. Order history for customer
4. Risk status management
5. Territory assignment logic

#### Priority 3: Product Catalog
**From:** `/Users/greghogue/Leora2/web/src/app/portal/catalog/`

Port these features:
1. Product grid with filtering
2. Wine enrichment display (tastingNotes, foodPairings, servingInfo)
3. Add to cart functionality
4. Inventory status display
5. Product search and filters

#### Priority 4: Order Management
**From:** `/Users/greghogue/Leora2/web/src/lib/orders.ts` and order pages

Port these features:
1. Order creation form
2. Shopping cart functionality
3. Order status workflow
4. Invoice generation
5. Order history and filtering

#### Priority 5: Analytics & Reporting
**From:** `/Users/greghogue/Leora2/web/src/lib/analytics.ts`

Port these critical business logic functions:
1. ARPDD calculations (Average Revenue Per Delivery Day)
2. Customer health scoring
3. Revenue metrics and trends
4. Sales rep performance tracking

**CRITICAL:** This file has 500+ lines of complex business logic - test extensively!

#### Priority 6: AI Features
**From:** `/Users/greghogue/Leora2/web/src/app/api/copilot/` and wine enrichment

Port if time allows:
1. LeorAI chatbot
2. Wine product enrichment (we have 1,879 wines with professional tasting notes)
3. AI-powered recommendations

## How to Execute Migration

### Phase 1: Setup (Do This First)
1. Clone the Lovable GitHub repo: `https://github.com/ghogue02/biz-buddy-shell.git`
2. Review the existing structure - don't replace any core files
3. Check the database schema matches our needs

### Phase 2: Incremental Feature Porting
For each priority group above:

1. **Read the source files** from `/Users/greghogue/Leora2/web/src/`
2. **Adapt the code:**
   - Convert Next.js → React/Vite
   - Convert Prisma → Supabase client
   - Convert `import { prisma }` → `import { supabase }`
   - Convert API routes → Supabase edge functions or client queries
   - Update paths: `next/link` → `react-router-dom`
   - Update imports: `@/` paths to relative paths

3. **Create new files** in the Lovable repo structure:
   ```
   src/
   ├── components/
   │   ├── dashboard/      # Dashboard sections
   │   ├── customers/      # Customer components
   │   ├── products/       # Product components
   │   └── orders/         # Order components
   ├── lib/
   │   ├── analytics.ts    # Business logic
   │   ├── utils.ts        # Utilities
   │   └── supabase.ts     # Already exists
   └── pages/              # Existing
   ```

4. **Test each feature** before moving to the next

5. **Commit incrementally** with clear messages like:
   - "feat: Add revenue metrics dashboard section"
   - "feat: Add customer health tracking"
   - "feat: Add ARPDD calculations"

### Phase 3: Integration & Testing
1. Ensure all components integrate with existing auth
2. Test multi-tenant data filtering
3. Verify RLS policies work correctly
4. Test all user roles (SALES_REP, CUSTOMER, ADMIN)

## Key Conversion Patterns

### Pattern 1: Data Fetching
**FROM (Next.js/Prisma):**
```typescript
import { prisma } from '@/lib/db';

const customers = await prisma.customer.findMany({
  where: { tenantId },
  include: { salesRep: true }
});
```

**TO (Lovable/Supabase):**
```typescript
import { supabase } from '@/lib/supabase';

const { data: customers } = await supabase
  .from('Customer')
  .select('*, Profile!salesRepId(*)')
  .eq('tenantId', tenantId);
```

### Pattern 2: Authentication
**FROM (Next.js):**
```typescript
import { getServerSession } from 'next-auth';
const session = await getServerSession();
```

**TO (Lovable):**
```typescript
import { useAuth } from '@/contexts/AuthContext';
const { user, profile } = useAuth();
```

### Pattern 3: API Routes → Client Queries
**FROM (Next.js API route):**
```typescript
// app/api/customers/route.ts
export async function GET(request: Request) {
  const customers = await prisma.customer.findMany();
  return Response.json(customers);
}
```

**TO (Lovable - direct query in component):**
```typescript
// components/customers/CustomerList.tsx
const { data: customers } = await supabase
  .from('Customer')
  .select('*');
```

## Files to Reference

### Original Codebase Location:
`/Users/greghogue/Leora2/web/`

### Migration Packages (Already Created):
`/Users/greghogue/Leora2/web/docs/lovable-migration/`
- Contains simplified, ready-to-use versions of components
- Use these as templates for complex conversions

### Key Source Files (Priority Order):
1. `/src/lib/analytics.ts` - 500 lines of business logic ⚠️ CRITICAL
2. `/src/app/sales/dashboard/page.tsx` - Main dashboard
3. `/src/app/sales/customers/[customerId]/page.tsx` - Customer details
4. `/src/lib/cart.ts` - Shopping cart logic
5. `/src/app/portal/catalog/page.tsx` - Product catalog

## Success Criteria

### Minimum Viable Product (Week 1):
- [ ] Sales dashboard with ARPDD metrics
- [ ] Customer list with risk tracking
- [ ] Product catalog with enrichment display
- [ ] Basic order creation

### Complete Migration (Week 2-3):
- [ ] All dashboard sections functional
- [ ] Customer management CRUD complete
- [ ] Order management with invoicing
- [ ] Analytics and reporting
- [ ] AI features (if time)

## Important Reminders

1. **Don't replace the database schema** - it's already perfect in Lovable
2. **Keep the existing auth system** - just integrate with it
3. **Test incrementally** - commit and test each feature
4. **Preserve business logic** - especially analytics.ts calculations
5. **Maintain multi-tenant filtering** - all queries must filter by tenantId
6. **Use existing RLS policies** - they're already configured

## GitHub Workflow

1. Make changes in Lovable OR push to GitHub
2. Changes sync automatically both ways
3. Preview updates immediately in Lovable
4. Test in Lovable's live preview
5. Deploy when ready

## Need Help?

If stuck on conversions, reference:
- Migration packages: `/docs/lovable-migration/`
- Existing Lovable components for patterns
- Supabase docs for query syntax

## Ready to Start!

**Recommended first task:**
"Port the revenue metrics dashboard section from `/src/app/sales/dashboard/revenue-metrics.tsx` to the Lovable project, converting Prisma queries to Supabase and ensuring it integrates with the existing auth context."
