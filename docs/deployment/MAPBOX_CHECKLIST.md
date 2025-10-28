# Mapbox Integration Checklist

Use this checklist to track your progress through Monday's Mapbox setup.

## ☐ Phase 1: Account & Token Setup (30 min)

### Account Creation
- [ ] Created Mapbox account at https://account.mapbox.com/
- [ ] Verified email address
- [ ] Logged into Mapbox dashboard

### Token Generation
- [ ] Navigated to Access Tokens page
- [ ] Created new token named "Leora Production"
- [ ] Selected all public scopes:
  - [ ] `styles:tiles`
  - [ ] `styles:read`
  - [ ] `fonts:read`
  - [ ] `datasets:read`
  - [ ] `vision:read`
- [ ] Copied token to secure location (1Password/LastPass)
- [ ] Token format verified (starts with `pk.`, 200+ chars)

### Security Documentation
- [ ] Token stored in password manager
- [ ] Token labeled with project name and date
- [ ] Access restrictions noted (add URL restrictions for production)
- [ ] Token rotation procedure documented

## ☐ Phase 2: Environment Configuration (15 min)

### Local Environment
- [ ] Opened `/Users/greghogue/Leora2/web/.env.local`
- [ ] Added line: `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.YOUR_TOKEN_HERE`
- [ ] Replaced `YOUR_TOKEN_HERE` with actual token
- [ ] Saved file
- [ ] Restarted dev server if running

### Verification
- [ ] Run: `npm run geocode:verify`
- [ ] All checks passed:
  - [ ] ✅ Public Token Format
  - [ ] ✅ Geocoding API
  - [ ] ✅ Database Connection
  - [ ] ✅ Database Schema
  - [ ] ✅ Rate Limit Config

### Browser Test
- [ ] Started dev server: `npm run dev`
- [ ] Opened: http://localhost:3000/sales/map
- [ ] Map loads without errors
- [ ] Browser console shows no token errors
- [ ] Can zoom and pan map

## ☐ Phase 3: Geocoding Preparation (15 min)

### Pre-Flight Checks
- [ ] Verified customer count: 4,871 customers
- [ ] Confirmed 0% currently geocoded (all need processing)
- [ ] Database connection tested
- [ ] Mapbox API accessible
- [ ] Rate limits configured (600/min)

### Environment Check
- [ ] Internet connection stable
- [ ] Sufficient disk space (1GB+)
- [ ] Database not under heavy load
- [ ] No maintenance windows scheduled

### Backup
- [ ] Database backup created (optional but recommended)
- [ ] .env.local file backed up
- [ ] Documented current state

## ☐ Phase 4: Geocoding Execution (120 min)

### Start Geocoding
- [ ] Opened terminal in `/Users/greghogue/Leora2/web`
- [ ] Run command:
  ```bash
  npm run geocode:customers -- --tenant-id=58b8126a-2d2f-4f55-bc98-5b6784800bed
  ```
- [ ] Script started successfully
- [ ] First batch processed without errors

### Progress Monitoring
- [ ] Opened second terminal for monitoring
- [ ] Run: `npm run geocode:report` every 15 minutes
- [ ] Recording progress:
  - [ ] 25% complete (1,218 customers) - Time: _____
  - [ ] 50% complete (2,436 customers) - Time: _____
  - [ ] 75% complete (3,653 customers) - Time: _____
  - [ ] 100% complete (4,871 customers) - Time: _____

### Error Handling
- [ ] Monitored console for errors
- [ ] Noted any failed addresses (if any)
- [ ] Checked failure patterns
- [ ] Documented common issues

### Completion Verification
- [ ] Script finished successfully
- [ ] Final success rate: ____% (target: >95%)
- [ ] Total geocoded: ____ / 4,871
- [ ] Total failed: ____
- [ ] Total skipped: ____

## ☐ Phase 5: Results Verification (30 min)

### Database Check
- [ ] Run: `npm run geocode:report`
- [ ] Reviewed statistics:
  - [ ] Total customers: 4,871
  - [ ] Geocoded count: ____ (>4,627 for 95%+)
  - [ ] Success rate: ____%
- [ ] Checked breakdown by state
- [ ] Verified coordinates look reasonable

### Map Verification
- [ ] Opened: http://localhost:3000/sales/customers/map
- [ ] All customers appear as pins
- [ ] Pins distributed across expected states
- [ ] No customers at (0,0) coordinates
- [ ] Clustering works at different zoom levels

### Sample Verification
- [ ] Checked 5 random customers in database
- [ ] Verified coordinates match addresses
- [ ] Used Google Maps to confirm locations
- [ ] All coordinates within expected ranges:
  - [ ] Latitude: 25-50 (US mainland)
  - [ ] Longitude: -125 to -65 (US mainland)

## ☐ Phase 6: Feature Testing (60 min)

### Customer Map View
- [ ] Navigate to: http://localhost:3000/sales/customers/map
- [ ] Map displays correctly
- [ ] All 4,871 customers visible
- [ ] Click customer pin shows info popup
- [ ] Popup shows: name, address, account type
- [ ] Can filter by account type
- [ ] Can filter by territory
- [ ] Performance is smooth (no lag)

### Heat Map Visualization
- [ ] Toggle "Heat Map" mode
- [ ] Test Revenue heat map:
  - [ ] Colors represent customer value
  - [ ] High-revenue areas show hot colors
  - [ ] Low-revenue areas show cool colors
- [ ] Test Orders heat map:
  - [ ] Shows order frequency concentration
  - [ ] Updates when date range changes
- [ ] Test Growth heat map:
  - [ ] Shows expanding markets
  - [ ] Compares periods correctly

### "Who's Closest" Feature
- [ ] Click "Find Nearest" button
- [ ] Enter address: "New York, NY"
- [ ] Set radius: 25 miles
- [ ] Results displayed:
  - [ ] Customers sorted by distance
  - [ ] Distance calculations accurate
  - [ ] Can click to view customer details
- [ ] Test with different locations:
  - [ ] Los Angeles, CA
  - [ ] Chicago, IL
  - [ ] Houston, TX
- [ ] All locations return expected results

### Route Optimization
- [ ] Select 5 customers (Ctrl+Click on pins)
- [ ] Click "Optimize Route"
- [ ] Enter start: "Current Location"
- [ ] Route generated:
  - [ ] Shows optimal order
  - [ ] Route line drawn on map
  - [ ] Distance calculated
  - [ ] Duration estimated
- [ ] Can export to Google Maps
- [ ] Try with 10 customers (should still work)

### Map Performance
- [ ] Zoom from world to street level:
  - [ ] Smooth animation
  - [ ] No stuttering
  - [ ] Clusters update correctly
- [ ] Pan across country:
  - [ ] Smooth panning
  - [ ] Pins load/unload efficiently
  - [ ] No memory leaks (check DevTools)
- [ ] Filter 1000+ customers:
  - [ ] Instant update
  - [ ] No lag
  - [ ] Correct customers shown

## ☐ Phase 7: API Usage Check (15 min)

### Mapbox Dashboard
- [ ] Logged into: https://account.mapbox.com/
- [ ] Navigated to Statistics
- [ ] Verified metrics:
  - [ ] Geocoding requests: ~4,871
  - [ ] Map tile requests: Multiple
  - [ ] Total API calls: Well under 100,000/month
  - [ ] No rate limit violations
  - [ ] No 401/403 errors

### Cost Verification
- [ ] Still on free tier
- [ ] No unexpected charges
- [ ] Usage trends documented
- [ ] Projected monthly usage calculated

## ☐ Phase 8: Documentation (30 min)

### Geocoding Report
- [ ] Run: `npm run geocode:report`
- [ ] Report generated in `/docs/deployment/`
- [ ] Review contains:
  - [ ] Total customers processed
  - [ ] Success rate
  - [ ] Breakdown by state
  - [ ] Failed addresses (if any)
  - [ ] Timestamp
- [ ] CSV exported for analysis

### Configuration Documentation
- [ ] Production .env template created
- [ ] Token rotation procedure documented
- [ ] API limits documented
- [ ] Troubleshooting guide updated

### Test Results
- [ ] Screenshots of map features saved
- [ ] Performance metrics recorded
- [ ] Any issues documented
- [ ] Solutions for issues noted

## ☐ Phase 9: Memory Storage (15 min)

### Store Results in Claude Flow
- [ ] Store setup status:
  ```bash
  npx claude-flow@alpha hooks memory-write \
    --key "leora/deployment/monday/mapbox/status" \
    --value "complete" \
    --tags "mapbox,deployment,monday"
  ```
- [ ] Store geocoding results:
  ```bash
  npx claude-flow@alpha hooks memory-write \
    --key "leora/deployment/monday/mapbox/geocoding-results" \
    --value "4871 customers, 95%+ success" \
    --tags "mapbox,geocoding,results"
  ```
- [ ] Store test results:
  ```bash
  npx claude-flow@alpha hooks memory-write \
    --key "leora/deployment/monday/mapbox/test-results" \
    --value "all features tested and working" \
    --tags "mapbox,testing,complete"
  ```

## ☐ Phase 10: Production Prep (15 min)

### Production Configuration
- [ ] Created `.env.production` template
- [ ] Documented token requirements
- [ ] Added URL restrictions plan
- [ ] Noted monitoring requirements

### Security Review
- [ ] Token not committed to git
- [ ] .env files in .gitignore
- [ ] No tokens in logs
- [ ] Access controls documented

### Deployment Checklist
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Team notified of completion
- [ ] Ready for Tuesday's work

## 📊 Final Success Criteria

Mark complete when ALL are true:

- [x] Mapbox token obtained and configured
- [ ] 4,871 customers geocoded with >95% success (4,627+)
- [ ] Map displays all customers correctly
- [ ] Heat maps generate and display properly
- [ ] "Who's Closest" feature calculates distances accurately
- [ ] Route optimization works with 5+ customers
- [ ] Map performance is smooth with full dataset
- [ ] No console errors or warnings
- [ ] Within Mapbox free tier limits
- [ ] All documentation complete

## 🎯 Time Tracking

| Phase | Estimated | Actual | Notes |
|-------|-----------|--------|-------|
| Account setup | 30 min | _____ | _____ |
| Environment config | 15 min | _____ | _____ |
| Geocoding prep | 15 min | _____ | _____ |
| Geocoding execution | 120 min | _____ | _____ |
| Results verification | 30 min | _____ | _____ |
| Feature testing | 60 min | _____ | _____ |
| API usage check | 15 min | _____ | _____ |
| Documentation | 30 min | _____ | _____ |
| Memory storage | 15 min | _____ | _____ |
| Production prep | 15 min | _____ | _____ |
| **TOTAL** | **345 min** | **_____** | **~5.75 hours** |

## 📝 Notes & Issues

### Issues Encountered
_Document any problems here:_

1.
2.
3.

### Solutions Applied
_Document how issues were resolved:_

1.
2.
3.

### Lessons Learned
_Key takeaways for future reference:_

1.
2.
3.

---

**Status:** [ ] Not Started | [ ] In Progress | [ ] Complete
**Date Started:** _______
**Date Completed:** _______
**Completed By:** _______
