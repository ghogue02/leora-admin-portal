# Wine Enrichment Execution Plan: Batches 78-188

**Generated:** 2025-10-21 (Updated with comprehensive research analysis)
**Status:** Ready for Execution
**Batches Remaining:** 111 (78-188)

## Executive Summary

**Current Progress:**
- Batches 1-77: ✅ Completed (770 wines enriched)
- Batches 78-188: ⏳ Pending (1,110 wines remaining)
- Task Files: ✅ All 188 batch files exist
- Result Files: ✅ 77 generated, 111 pending

**Recommended Approach:** Hybrid parallel processing with 3-5 concurrent research agents
**Estimated Completion:** 10-15 hours (vs. 32 hours sequential)
**Cost:** $0 (using Claude Code built-in tools)

## Current State Analysis

- **Total Products:** 1,879
- **Batches Created:** 188
- **Batches Completed:** 77 (batches 1-77)
- **Batches Remaining:** 111 (batches 78-188)
- **Wines Per Batch:** ~10 wines
- **Products Remaining:** ~1,110 wines

## 🎯 Recommended Strategy: Hybrid Parallel Processing

### Why Parallel Processing?

**Performance Benefits:**
- 3-5x faster than sequential
- Natural fault isolation per agent
- Built-in coordination via hooks
- Easy progress tracking

**Time Comparison:**
| Approach | Time | Agents | Efficiency |
|----------|------|--------|------------|
| Sequential | 32-38 hours | 1 | Baseline |
| 3 Agents Parallel | 12-14 hours | 3 | 2.5x faster |
| 5 Agents Parallel | 8-10 hours | 5 | 3.5x faster |

### Agent Distribution (Recommended: 3 Agents)

```
Research Agent Alpha:   Batches 78-114  (37 batches, ~370 wines)
Research Agent Beta:    Batches 115-151 (37 batches, ~370 wines)
Research Agent Gamma:   Batches 152-188 (37 batches, ~370 wines)

Support Agents (Concurrent):
  - Validation Agent:   Monitor quality, validate uniqueness
  - Database Agent:     Apply verified results to database
```

## Execution Phases

### Phase 1: Pre-Flight Setup (15 minutes)

**1.1 Verify Infrastructure**
```bash
# Check API key
grep -q "ANTHROPIC_API_KEY" .env.local && echo "✅ API key configured" || echo "❌ Missing"

# Verify batch files (should be 111)
ls data/wine-research-batch-{78..188}.json 2>/dev/null | wc -l

# Test database connection
npx tsx -e "import {PrismaClient} from '@prisma/client'; const p=new PrismaClient(); p.product.count().then(c=>console.log('Products:',c)).finally(()=>p.\$disconnect())"
```

**1.2 Initialize Coordination**
```bash
npx claude-flow@alpha hooks pre-task --description "Wine enrichment batches 78-188"
npx claude-flow@alpha hooks session-restore --session-id "wine-enrichment-78-188"
```

### Phase 2: Spawn Research Agents (Single Message - All at Once)

**CRITICAL:** Use Claude Code's Task tool to spawn ALL agents concurrently in ONE message:

```javascript
// Single message with all 5 agents spawned in parallel
Task("Wine Researcher Alpha", `
Research batches 78-114 (37 batches)

FOR EACH BATCH:
1. Read: /data/wine-research-batch-N.json
2. For each wine:
   - WebFetch: "{wine name} {vintage} wine tasting notes"
   - Search Wine Spectator, Wine Enthusiast, Decanter, Vivino
   - Extract REAL tasting notes from professional sources
   - Generate UNIQUE content (no templates)
3. Save: /data/wine-research-results-batch-N.json

COORDINATION:
- Pre-batch: npx claude-flow hooks pre-task --description "Batch N"
- Post-batch: npx claude-flow hooks post-edit --file "results-N.json"
- Progress: Store in memory every 5 batches

QUALITY:
- Confidence target: 0.85+
- 100% unique aromas
- No generic template language
`, "researcher")

Task("Wine Researcher Beta", `
Research batches 115-151 (37 batches)
[Same instructions as Alpha, different batch range]
`, "researcher")

Task("Wine Researcher Gamma", `
Research batches 152-188 (37 batches)
[Same instructions as Alpha, different batch range]
`, "researcher")

Task("Validation Agent", `
Monitor and validate completed batches

PROCESS:
- Check for new result files every 5 minutes
- Validate JSON structure and confidence scores
- Check uniqueness of tasting notes
- Flag low-quality entries (<0.70 confidence)
- Report to /data/validation-report.json

COORDINATION:
- Store validation metrics in memory
- Alert on quality issues immediately
`, "reviewer")

Task("Database Update Agent", `
Apply validated research to database

PROCESS:
- Monitor validation report for "pass" status
- For each validated batch:
  - Read result JSON
  - Update products in transaction
  - Mark batch complete
- Error handling: rollback on failure

SAFETY:
- Transaction per batch
- Dry-run mode available
- Comprehensive logging
`, "coder")
```

### Phase 3: Monitoring & Progress Tracking

**Real-Time Progress Dashboard**
```bash
#!/bin/bash
# Run every 30 minutes

echo "=== Wine Enrichment Progress ==="
COMPLETED=$(ls data/wine-research-results-batch-{78..188}.json 2>/dev/null | wc -l)
echo "Completed: $COMPLETED / 111 batches ($((COMPLETED * 100 / 111))%)"

# Check agent status
npx claude-flow@alpha memory-usage retrieve --key "swarm/researcher-alpha/progress"
npx claude-flow@alpha memory-usage retrieve --key "swarm/researcher-beta/progress"
npx claude-flow@alpha memory-usage retrieve --key "swarm/researcher-gamma/progress"

# Database status
npx tsx -e "import {PrismaClient} from '@prisma/client'; const p=new PrismaClient(); p.product.count({where:{enrichedBy:{contains:'v2'}}}).then(c=>console.log('DB Enriched:',c)).finally(()=>p.\$disconnect())"
```

### Phase 4: Quality Assurance & Validation

**After All Batches Complete:**
```bash
# 1. Uniqueness check
npx tsx scripts/check-unique-notes.ts

# 2. Confidence analysis
npx tsx -e "
import {PrismaClient} from '@prisma/client';
const p=new PrismaClient();
p.product.findMany({where:{enrichedBy:{contains:'v2'}}, select:{wineDetails:true}})
  .then(products => {
    const confs = products.map(p => p.wineDetails?.metadata?.confidence).filter(c => c);
    const avg = confs.reduce((a,b) => a+b, 0) / confs.length;
    console.log('Average confidence:', avg.toFixed(3));
    console.log('Min:', Math.min(...confs));
    console.log('Max:', Math.max(...confs));
  }).finally(() => p.\$disconnect());
"

# 3. Database integrity
npx tsx scripts/validate-enrichment-complete.ts
```

## 🛡️ Safeguards & Error Handling

### Rate Limiting Strategy

**Per Agent:**
- 2-second delay between wines within a batch
- 30-second cooldown between batches
- Exponential backoff on API rate limits (1s, 2s, 4s)
- Maximum 3 retry attempts per wine

**Global:**
- 3-5 agents running concurrently (not competing for same resources)
- Each agent has dedicated batch range
- Natural load distribution across web searches

### Error Handling Tiers

**Tier 1: Wine-Level Failures (Expected ~5%)**
```javascript
// Fallback strategy for unfindable wines:
if (!exactMatch) {
  // Level 1: Producer style research
  confidence = 0.80;
  // Level 2: Varietal + region research
  confidence = 0.65;
  // Level 3: Generic varietal knowledge
  confidence = 0.50;
}
// Continue to next wine, log failure
```

**Tier 2: Batch-Level Failures**
- If batch fails entirely: retry up to 3 times
- If still fails: log to `/data/failed-batches.json`
- Agent continues with next batch
- Recovery agent can re-process failed batches later

**Tier 3: Agent Crashes**
- All progress saved in JSON result files
- Identify last completed batch from file system
- Respawn agent for remaining batches
- No data loss

### Recovery Procedures

**Scenario 1: Agent Stops Mid-Execution**
```bash
# Find last completed batch
LAST_BATCH=$(ls -v data/wine-research-results-batch-*.json | tail -1 | grep -o '[0-9]\+')
NEXT_BATCH=$((LAST_BATCH + 1))

# Respawn for remaining batches
Task("Recovery Agent", "Resume batches ${NEXT_BATCH}-188", "researcher")
```

**Scenario 2: Quality Issues Detected**
```bash
# Re-research specific batches with higher standards
FAILED_BATCHES="89,102,157"
Task("Quality Recovery", "Re-research batches: ${FAILED_BATCHES} with confidence > 0.90", "researcher")
```

**Scenario 3: Database Connection Lost**
```bash
# All data in JSON files, safe to retry database updates
Task("DB Recovery", "Apply all validated results from data/wine-research-results-batch-*.json", "coder")
```

## 📊 Quality Metrics & Success Criteria

### Target Metrics

| Metric | Target | Minimum Acceptable |
|--------|--------|-------------------|
| Unique Aromas | 99%+ | 95% |
| Average Confidence | 0.88+ | 0.85 |
| Exact Wine Matches | 40%+ | 30% |
| Producer Matches | 35%+ | 30% |
| Generic Fallbacks | <15% | <25% |
| Database Coverage | 100% | 98% |
| Processing Errors | <2% | <5% |

### Validation Checks

**Automated:**
1. Uniqueness validation (check-unique-notes.ts)
2. Confidence distribution analysis
3. Generic language detection
4. Database integrity verification

**Manual Spot Checks:**
- Sample 20 random wines
- Verify tasting notes are specific and unique
- Check food pairings make sense for wine type
- Ensure serving info matches wine style

## 📁 Expected Output Files

For each batch N (78-188):
- **Input:** `/data/wine-research-batch-N.json` (already exists)
- **Output:** `/data/wine-research-results-batch-N.json` (to be created)
- **Validation:** Entry in `/data/validation-report.json`
- **Database:** Products updated with `enrichedBy: 'claude-code-accurate-v2-batch-N'`

## ✅ Success Criteria

**Completion Requirements:**
- ✅ All 111 batches processed (78-188)
- ✅ Result files created for all batches
- ✅ Average confidence score ≥ 0.85
- ✅ Unique content rate ≥ 95%
- ✅ All validated data applied to database
- ✅ Error rate < 5%
- ✅ Final enrichment coverage: 1,879/1,879 products (100%)

**Quality Gates:**
- If average confidence < 0.80: Re-research low-quality batches
- If duplicates > 5%: Re-research duplicated wines
- If errors > 10%: Pause, investigate root cause

## ⏱️ Estimated Timeline

### Time Breakdown (3 Agents Parallel)

| Phase | Duration | Notes |
|-------|----------|-------|
| Setup & Verification | 15 min | Pre-flight checks |
| Agent Spawn | 5 min | Task tool spawning |
| Batch Research | 12-14 hours | 111 batches ÷ 3 agents |
| Validation | Concurrent | Runs parallel with research |
| Database Updates | Concurrent | Runs parallel with validation |
| Final QA | 1 hour | Comprehensive checks |
| **Total** | **13-15 hours** | End-to-end |

### Time Breakdown (5 Agents Parallel)

| Phase | Duration | Notes |
|-------|----------|-------|
| Setup & Verification | 15 min | Pre-flight checks |
| Agent Spawn | 5 min | Task tool spawning |
| Batch Research | 8-10 hours | 111 batches ÷ 5 agents |
| Validation | Concurrent | Runs parallel with research |
| Database Updates | Concurrent | Runs parallel with validation |
| Final QA | 1 hour | Comprehensive checks |
| **Total** | **9-11 hours** | End-to-end |

**Recommended:** 3 agents for balance of speed and reliability

## 🚀 Next Steps to Execute

### Immediate Actions

1. **Verify Prerequisites**
   ```bash
   # Check API key exists
   grep -q "ANTHROPIC_API_KEY" .env.local

   # Verify all batch files present
   [ $(ls data/wine-research-batch-{78..188}.json 2>/dev/null | wc -l) -eq 111 ] && echo "✅ All batches ready"

   # Test database connection
   npx tsx -e "import {PrismaClient} from '@prisma/client'; new PrismaClient().product.count().then(c=>console.log('DB OK:',c,'products')).catch(e=>console.log('❌ DB Error'))"
   ```

2. **Initialize Coordination**
   ```bash
   npx claude-flow@alpha hooks pre-task --description "Wine enrichment batches 78-188"
   npx claude-flow@alpha hooks session-restore --session-id "wine-enrichment-78-188"
   ```

3. **Spawn Research Agents**
   - Use Claude Code's Task tool
   - Spawn ALL 5 agents in a SINGLE message
   - See Phase 2 above for exact Task() calls

4. **Monitor Progress**
   ```bash
   # Check every 30-60 minutes
   watch -n 1800 'ls data/wine-research-results-batch-{78..188}.json 2>/dev/null | wc -l'
   ```

5. **Validate & Complete**
   ```bash
   # After all batches complete
   npx tsx scripts/check-unique-notes.ts
   npx tsx scripts/validate-enrichment-complete.ts
   npx tsx scripts/generate-enrichment-report.ts
   ```

## 📞 Support & Escalation

**If Issues Arise:**
1. Check agent memory for current status
2. Review `/data/failed-batches.json` for errors
3. Use recovery procedures (see Error Handling section)
4. If blocked: respawn specific agents for failed batches

**Monitoring Commands:**
```bash
# Agent status
npx claude-flow@alpha memory-usage retrieve --key "swarm/researcher-alpha/progress"

# Recent completions
ls -lt data/wine-research-results-batch-*.json | head -5

# Error log
cat data/failed-batches.json 2>/dev/null | jq '.[] | .batchNumber'
```

---

## 📝 Summary

**What:** Complete enrichment for batches 78-188 (1,110 wines)

**How:** 3-5 parallel research agents using Claude Code's Task tool

**When:** 12-15 hours total execution time

**Why:** 3x faster than sequential, with built-in fault tolerance and quality validation

**Result:** 1,879/1,879 wines enriched with unique, professional tasting notes

---

**Document Status:** ✅ Ready for Execution
**Last Updated:** 2025-10-21
**Next Action:** Spawn research agents via Task tool
