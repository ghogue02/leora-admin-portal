# Wine Researcher Agent Instructions

## Overview

This document explains how to process wine enrichment batches 78-188 using Claude Code's Task tool to spawn researcher agents concurrently.

## Key Principles

According to CLAUDE.md:
- **1 MESSAGE = ALL RELATED OPERATIONS** - Spawn ALL agents in ONE message
- **MCP coordinates, Claude Code executes** - Use Task tool for actual work
- **Concurrent execution** - Process multiple batches in parallel

## Batch Processing Workflow

### Step 1: Spawn Researcher Agents (Concurrent)

Use Claude Code's Task tool to spawn multiple researcher agents in a **SINGLE MESSAGE**:

```javascript
// ✅ CORRECT: Spawn 5-10 researchers concurrently in ONE message
[Single Message - Parallel Batch Processing]:
  Task("Wine Researcher Batch 78", "<instructions for batch 78>", "researcher")
  Task("Wine Researcher Batch 79", "<instructions for batch 79>", "researcher")
  Task("Wine Researcher Batch 80", "<instructions for batch 80>", "researcher")
  Task("Wine Researcher Batch 81", "<instructions for batch 81>", "researcher")
  Task("Wine Researcher Batch 82", "<instructions for batch 82>", "researcher")
  // Continue for 5-10 batches per message
```

### Step 2: Each Researcher Agent Must:

**BEFORE starting:**
```bash
npx claude-flow@alpha hooks pre-task --description "Research batch [N]"
npx claude-flow@alpha hooks session-restore --session-id "swarm-enrichment-batch-[N]"
```

**Research Process:**
1. Read batch task file: `/Users/greghogue/Leora2/web/data/wine-research-batch-[N].json`
2. For each wine in the batch:
   - Use WebFetch to search: "{wine name} {vintage} wine tasting notes reviews"
   - Target sources: Wine Spectator, Wine Enthusiast, Decanter, Vivino
   - Extract REAL tasting notes from professional sources
   - Generate unique content (NO duplicates!)
3. Save results to: `/Users/greghogue/Leora2/web/data/wine-research-results-batch-[N].json`

**DURING research:**
```bash
npx claude-flow@alpha hooks post-edit --file "batch-[N].json" --memory-key "swarm/enrichment/batch-[N]"
npx claude-flow@alpha hooks notify --message "Researched wine [X] of [Y] in batch [N]"
```

**AFTER completion:**
```bash
npx claude-flow@alpha hooks post-task --task-id "batch-[N]"
npx claude-flow@alpha hooks session-end --export-metrics true
```

## Detailed Agent Instructions Template

Each researcher agent should receive these instructions:

```
Read the task file at /Users/greghogue/Leora2/web/data/wine-research-batch-[N].json

CRITICAL REQUIREMENTS:
1. Use WebFetch tool for ALL wine research
2. Search for exact wine: "{productName} {vintage} wine tasting notes reviews"
3. Extract REAL data from Wine Spectator, Wine Enthusiast, Decanter, Vivino
4. Each wine MUST have UNIQUE tasting notes - NO GENERIC TEMPLATES!

FALLBACK STRATEGY (if exact wine not found):
- Level 1: Search producer's general style
- Level 2: Search varietal + region characteristics
- Level 3: Use professional wine knowledge for varietal

OUTPUT FORMAT (JSON):
Save an array of enriched wines to: /Users/greghogue/Leora2/web/data/wine-research-results-batch-[N].json

Each wine object must include:
{
  "productName": "...",
  "description": "2-3 sentence wine description",
  "tastingNotes": {
    "aroma": "Detailed, unique aroma (3-4 sentences)",
    "palate": "Detailed palate (3-4 sentences)",
    "finish": "Finish description (2-3 sentences)"
  },
  "foodPairings": ["pairing 1", "pairing 2", "pairing 3", "pairing 4", "pairing 5"],
  "servingInfo": {
    "temperature": "Specific temperature",
    "decanting": "Decanting advice",
    "glassware": "Recommended glass"
  },
  "wineDetails": {
    "region": "Specific region/appellation",
    "grapeVariety": "Exact grape composition",
    "vintage": "...",
    "style": "Wine style",
    "ageability": "Aging potential"
  },
  "metadata": {
    "source": "exact-match|producer-match|varietal-match|generic",
    "confidence": 0.0-1.0,
    "researchedAt": "ISO timestamp"
  }
}

COORDINATION:
- Run pre-task hook before starting
- Update memory after each wine researched
- Run post-task hook when batch complete
- Save final results to specified output file
```

## Processing Strategy

### Recommended Batch Groupings

Process batches in groups of 5-10 for optimal concurrency:

**Group 1: Batches 78-87** (10 batches)
**Group 2: Batches 88-97** (10 batches)
**Group 3: Batches 98-107** (10 batches)
**Group 4: Batches 108-117** (10 batches)
**Group 5: Batches 118-127** (10 batches)
**Group 6: Batches 128-137** (10 batches)
**Group 7: Batches 138-147** (10 batches)
**Group 8: Batches 148-157** (10 batches)
**Group 9: Batches 158-167** (10 batches)
**Group 10: Batches 168-177** (10 batches)
**Group 11: Batches 178-188** (11 batches)

### Example: Processing First Group (78-87)

```javascript
[Single Message]:
  Task("Wine Researcher Batch 78", `<full instructions>`, "researcher")
  Task("Wine Researcher Batch 79", `<full instructions>`, "researcher")
  Task("Wine Researcher Batch 80", `<full instructions>`, "researcher")
  Task("Wine Researcher Batch 81", `<full instructions>`, "researcher")
  Task("Wine Researcher Batch 82", `<full instructions>`, "researcher")
  Task("Wine Researcher Batch 83", `<full instructions>`, "researcher")
  Task("Wine Researcher Batch 84", `<full instructions>`, "researcher")
  Task("Wine Researcher Batch 85", `<full instructions>`, "researcher")
  Task("Wine Researcher Batch 86", `<full instructions>`, "researcher")
  Task("Wine Researcher Batch 87", `<full instructions>`, "researcher")

  TodoWrite({ todos: [...all batch todos...] })
```

## Progress Monitoring

Track progress using the monitoring script:

```bash
# Check overall progress
npx tsx scripts/track-batch-progress.ts show

# Generate detailed report
npx tsx scripts/track-batch-progress.ts report

# Get next batch to process
npx tsx scripts/track-batch-progress.ts next
```

## After Processing

Once all batches are complete:

1. **Apply Results to Database:**
   ```bash
   npx tsx scripts/apply-enrichment-results.ts 78
   npx tsx scripts/apply-enrichment-results.ts 79
   # ... continue for all batches
   ```

2. **Verify Completion:**
   ```bash
   npx tsx scripts/monitor-enrichment-progress.ts
   ```

3. **Generate Final Report:**
   ```bash
   npx tsx scripts/track-batch-progress.ts report > docs/final-enrichment-report.md
   ```

## Success Criteria

- ✅ All 111 batches (78-188) processed
- ✅ Result files created for each batch
- ✅ All wines have unique tasting notes
- ✅ Confidence scores ≥ 0.7 for 90%+ of wines
- ✅ All results applied to database
- ✅ Final enrichment rate: 100% (1,879/1,879 products)

## Error Handling

If a batch fails:
1. Check error log: `/Users/greghogue/Leora2/web/logs/enrichment-errors.log`
2. Retry batch manually with researcher agent
3. Update progress tracker
4. Continue with remaining batches

## Notes

- Each batch has ~10 wines
- Total wines to process: ~1,110 (batches 78-188)
- Estimated time: 15-18 hours for all batches
- Use WebFetch tool for all research
- Coordinate through hooks system
- Store progress in memory for recovery
