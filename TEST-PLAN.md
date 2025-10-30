# Leora Sales Rep Portal - Test Plan

## Quick Test (After Seed Completes)

### 1. Start Development Server
```bash
cd /Users/greghogue/Leora2/web
npm run dev
```

### 2. Test Sales Rep Login
**URL**: `http://localhost:3000/sales/login`

**Test Credentials** (temporary password: will need to be set):
- Kelly Neel: kelly@wellcraftedbeverage.com
- Travis Vernon: travis@wellcraftedbeverage.com
- Carolyn Vernon: carolyn@wellcraftedbeverage.com

### 3. Test Core Features

#### Dashboard (`/sales/dashboard`)
- [ ] Performance metrics show quotas and revenue
- [ ] Week-over-week revenue comparison displays
- [ ] Customer health summary shows counts (healthy, at-risk, dormant)
- [ ] Customers due to order list appears
- [ ] Upcoming events section (will be empty initially)
- [ ] Tasks from management section

#### Customers (`/sales/customers`)
- [ ] Customer list displays with health badges
- [ ] Search works (by name, account number)
- [ ] Filters work (All, Due to Order, At Risk, Dormant, Healthy)
- [ ] Sort by name, last order, next expected works
- [ ] Shows Kelly's ~1,621 customers OR Travis's ~1,621 customers OR Carolyn's ~1,620 customers

#### Customer Detail (`/sales/customers/[id]`)
- [ ] Customer header shows name, account #, risk status
- [ ] Performance metrics display (YTD revenue, orders, avg value)
- [ ] Ordering pace shows (last order, next expected)
- [ ] Top 10 products table appears
- [ ] Product recommendations (Top 20 not ordered)
- [ ] Sample history shows (if any)
- [ ] Activity timeline displays
- [ ] Quick actions work (Add Activity, Add Order buttons)
- [ ] Order history shows with invoice links

#### Activities (`/sales/activities`)
- [ ] Activity list displays
- [ ] Log new activity form works
- [ ] Can select activity type (Visit, Tasting, Call, Email, Text, Event)
- [ ] Can select customer from assigned list
- [ ] Activity saves successfully
- [ ] Shows conversion tracking (activities → orders)

#### Catalog (`/sales/catalog`)
- [ ] Product catalog displays with SKUs
- [ ] Can add items to cart
- [ ] Inventory shows (on hand, allocated, available)
- [ ] Prices display correctly

#### Cart (`/sales/cart`)
- [ ] Cart shows added items
- [ ] Can adjust quantities
- [ ] Can remove items
- [ ] Checkout/submit order works

#### Orders (`/sales/orders`)
- [ ] Order list displays
- [ ] Shows orders for assigned customers only (or all if admin)
- [ ] Can view order details
- [ ] Order status displays correctly

#### Invoices (`/sales/invoices`)
- [ ] Invoice list displays
- [ ] Shows invoices for assigned customers
- [ ] Invoice status and amounts show correctly

#### Admin (`/sales/admin`) - Travis only
- [ ] Rep Management tab shows all 3 reps
- [ ] Customer Assignment tab displays
- [ ] Can reassign customers between reps
- [ ] Product Goals tab works
- [ ] Can create new product goals

### 4. Test Data Validation

Check database directly:
```bash
# Check SalesRep creation
psql $DATABASE_URL -c "SELECT \"fullName\", \"territoryName\", \"isActive\" FROM \"SalesRep\" s JOIN \"User\" u ON s.\"userId\" = u.id;"

# Check customer assignments
psql $DATABASE_URL -c "SELECT sr.\"fullName\", COUNT(c.id) as customer_count FROM \"SalesRep\" sr LEFT JOIN \"Customer\" c ON c.\"salesRepId\" = sr.id JOIN \"User\" u ON sr.\"userId\" = u.id GROUP BY sr.id, u.\"fullName\";"

# Check sample usage
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"SampleUsage\";"

# Check weekly metrics
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"RepWeeklyMetric\";"

# Check Top 20 products
psql $DATABASE_URL -c "SELECT \"rankingType\", COUNT(*) FROM \"TopProduct\" GROUP BY \"rankingType\";"
```

### 5. Expected Results

After seed completes:
- ✅ 3 SalesRep profiles created (Kelly, Travis, Carolyn)
- ✅ 4,862 customers assigned (~1,621 each)
- ✅ Sample usage records (last 12 weeks)
- ✅ Weekly metrics (last 12 weeks for each rep)
- ✅ Product goals created
- ✅ Top 20 products calculated (3 rankings: revenue, volume, customers)

### 6. Common Issues & Fixes

**Issue**: Can't login
**Fix**: Passwords are dummy hashes. Run this to set real password:
```sql
-- Set password "demo123" for testing
UPDATE "User" SET "hashedPassword" = '$2a$10$YourActualBcryptHashHere'
WHERE email IN ('kelly@wellcraftedbeverage.com', 'travis@wellcraftedbeverage.com', 'carolyn@wellcraftedbeverage.com');
```

**Issue**: No customers show
**Fix**: Check customer assignment:
```sql
SELECT COUNT(*) FROM "Customer" WHERE "salesRepId" IS NOT NULL;
```

**Issue**: Dashboard shows no data
**Fix**: Run background jobs:
```bash
npx tsx src/jobs/run.ts customer-health-assessment
npm run jobs:run -- weekly-metrics-aggregation
```

### 7. Performance Test

Test with realistic data:
- [ ] Dashboard loads in < 2 seconds
- [ ] Customer list loads in < 1 second
- [ ] Customer detail loads in < 1 second
- [ ] Search/filter is responsive
- [ ] No console errors

### 8. Mobile Test

Test on mobile viewport:
- [ ] Navigation menu works
- [ ] Tables scroll horizontally
- [ ] Forms are usable
- [ ] Touch targets are adequate
- [ ] Text is readable

---

## Full Test Checklist

### Authentication ✅
- [x] Sales rep users created
- [ ] Login works with email/password
- [ ] Session persists on refresh
- [ ] Logout works
- [ ] Non-sales-rep users can't access

### Data Seeding ✅
- [x] SalesRep profiles created
- [ ] Customers assigned to reps
- [ ] Sample usage generated
- [ ] Weekly metrics calculated
- [ ] Top 20 products computed
- [ ] Product goals created

### UI Features ✅
- [x] Dashboard built
- [x] Customer list built
- [x] Customer detail built
- [x] Activities page built
- [x] Admin page built
- [x] Catalog page copied
- [x] Cart page copied
- [x] Orders page copied
- [x] Invoices page copied

### Removed Features ✅
- [x] Payment methods removed
- [x] Favorites removed
- [x] Support tickets removed
- [x] Supabase replay UI removed

### Integration Tests 🔄
- [ ] Create order for customer
- [ ] Log activity
- [ ] Mark sample as used
- [ ] Reassign customer (admin)
- [ ] Create product goal (admin)

---

**Ready to test once seed script completes!**
