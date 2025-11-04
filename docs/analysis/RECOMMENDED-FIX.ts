/**
 * RECOMMENDED FIX - Option C: Hybrid Approach
 * 
 * File: src/jobs/customer-health-assessment.ts
 * 
 * This fix implements intelligent dormant threshold logic that:
 * 1. Respects customer cadence for frequent orderers (< 90 day pace)
 * 2. Caps thresholds for infrequent orderers (90+ day pace)
 * 3. Enforces absolute maximum of 90 days for all customers
 */

// ============================================================================
// STEP 1: Update constants (lines 51-53)
// ============================================================================

const FALLBACK_CADENCE_DAYS = 45;
const GRACE_PERIOD_PERCENT = 0.3; // 30% buffer for cadence variance
const MIN_GRACE_DAYS = 7;

// NEW CONSTANTS (add after line 53)
const MAX_CADENCE_FOR_FREQUENT_ORDERERS = 90; // Threshold to identify infrequent orderers
const ABSOLUTE_DORMANT_DAYS = 90;             // Hard cap - no customer waits longer than this

// ============================================================================
// STEP 2: Replace dormant threshold calculation (lines 330-332)
// ============================================================================

// BEFORE (lines 330-332):
/*
const cadenceBaseline = Math.max(orderingPace.averageIntervalDays ?? FALLBACK_CADENCE_DAYS, FALLBACK_CADENCE_DAYS);
const gracePeriod = Math.max(Math.round(cadenceBaseline * GRACE_PERIOD_PERCENT), MIN_GRACE_DAYS);
const dormantThreshold = cadenceBaseline + gracePeriod;
*/

// AFTER (lines 330-340):
const rawCadence = orderingPace.averageIntervalDays ?? FALLBACK_CADENCE_DAYS;
const isInfrequentOrderer = rawCadence > MAX_CADENCE_FOR_FREQUENT_ORDERERS;

// For infrequent orderers (90+ day pace), cap at 60 days
// For frequent orderers, use their actual pace (min 45 days)
const cadenceBaseline = isInfrequentOrderer
  ? 60  // Cap infrequent orderers at reasonable threshold
  : Math.max(rawCadence, FALLBACK_CADENCE_DAYS);

const gracePeriod = Math.max(
  Math.round(cadenceBaseline * GRACE_PERIOD_PERCENT), 
  MIN_GRACE_DAYS
);

// Calculate threshold and apply absolute safety cap
const calculatedThreshold = cadenceBaseline + gracePeriod;
const dormantThreshold = Math.min(calculatedThreshold, ABSOLUTE_DORMANT_DAYS);

// ============================================================================
// EXAMPLE RESULTS
// ============================================================================

/**
 * Weekly orderer (7-day pace):
 * - rawCadence: 7 days
 * - isInfrequentOrderer: false (7 < 90)
 * - cadenceBaseline: max(7, 45) = 45 days
 * - gracePeriod: max(round(45 * 0.3), 7) = 14 days
 * - calculatedThreshold: 45 + 14 = 59 days
 * - dormantThreshold: min(59, 90) = 59 days ✅
 * 
 * Monthly orderer (30-day pace):
 * - rawCadence: 30 days
 * - isInfrequentOrderer: false (30 < 90)
 * - cadenceBaseline: max(30, 45) = 45 days
 * - gracePeriod: 14 days
 * - calculatedThreshold: 59 days
 * - dormantThreshold: min(59, 90) = 59 days ✅
 * 
 * Quarterly orderer (90-day pace):
 * - rawCadence: 90 days
 * - isInfrequentOrderer: false (90 == 90, not >)
 * - cadenceBaseline: max(90, 45) = 90 days
 * - gracePeriod: max(round(90 * 0.3), 7) = 27 days
 * - calculatedThreshold: 90 + 27 = 117 days
 * - dormantThreshold: min(117, 90) = 90 days ✅ (capped)
 * 
 * Semi-annual orderer (180-day pace):
 * - rawCadence: 180 days
 * - isInfrequentOrderer: true (180 > 90)
 * - cadenceBaseline: 60 days (CAPPED)
 * - gracePeriod: max(round(60 * 0.3), 7) = 18 days
 * - calculatedThreshold: 60 + 18 = 78 days
 * - dormantThreshold: min(78, 90) = 78 days ✅
 * 
 * Annual orderer (365-day pace) - The original bug case:
 * - rawCadence: 365 days
 * - isInfrequentOrderer: true (365 > 90)
 * - cadenceBaseline: 60 days (CAPPED)
 * - gracePeriod: 18 days
 * - calculatedThreshold: 78 days
 * - dormantThreshold: min(78, 90) = 78 days ✅
 * 
 * AAFES Langley (309-day pace):
 * - rawCadence: 309 days
 * - isInfrequentOrderer: true (309 > 90)
 * - cadenceBaseline: 60 days (CAPPED)
 * - gracePeriod: 18 days
 * - calculatedThreshold: 78 days
 * - dormantThreshold: min(78, 90) = 78 days ✅
 * - daysSinceLastOrder: 334 days
 * - 334 >= 78? YES → DORMANT ✅✅✅
 */

// ============================================================================
// TESTING VALIDATION
// ============================================================================

/**
 * Test Query 1: Verify no AT_RISK_CADENCE customers with 90+ days
 * 
 * SELECT COUNT(*) FROM "Customer" 
 * WHERE "riskStatus" = 'AT_RISK_CADENCE' 
 *   AND EXTRACT(DAY FROM NOW() - "lastOrderDate") > 90;
 * 
 * Expected: 0 (after fix)
 * Current: 15 (before fix)
 */

/**
 * Test Query 2: Verify DORMANT count increased
 * 
 * SELECT 
 *   COUNT(*) FILTER (WHERE "riskStatus" = 'DORMANT') as dormant_count,
 *   COUNT(*) FILTER (WHERE "riskStatus" = 'AT_RISK_CADENCE') as at_risk_count
 * FROM "Customer";
 * 
 * Expected: dormant_count +15, at_risk_count -15
 */

/**
 * Test Query 3: Check specific problem customers
 * 
 * SELECT 
 *   "name",
 *   "riskStatus",
 *   "averageOrderIntervalDays",
 *   "orderingPaceDays",
 *   EXTRACT(DAY FROM NOW() - "lastOrderDate") as days_since_order
 * FROM "Customer"
 * WHERE "name" IN (
 *   'AAFES Langley Exp/Cl Six',
 *   'The Liquor Pump',
 *   'DLC- Bethesda Market'
 * );
 * 
 * Expected: All should have riskStatus = 'DORMANT'
 */

// ============================================================================
// DEPLOYMENT CHECKLIST
// ============================================================================

/**
 * [ ] 1. Review code changes with team
 * [ ] 2. Confirm 90-day threshold aligns with business expectations
 * [ ] 3. Update constants in customer-health-assessment.ts (lines 51-55)
 * [ ] 4. Replace threshold calculation (lines 330-340)
 * [ ] 5. Run TypeScript build to verify no compilation errors
 * [ ] 6. Test locally: npx tsx src/jobs/customer-health-assessment.ts
 * [ ] 7. Verify 15 customers reclassified to DORMANT
 * [ ] 8. Commit changes with descriptive message
 * [ ] 9. Deploy to production
 * [ ] 10. Run health assessment job immediately
 * [ ] 11. Monitor for 7 days to ensure correct classification
 * [ ] 12. Update documentation with new threshold logic
 */
