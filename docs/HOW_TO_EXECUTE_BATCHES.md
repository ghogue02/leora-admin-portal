# How to Execute Wine Enrichment Batches 78-188

## Quick Start

This guide shows you exactly how to process the remaining wine enrichment batches using Claude Code's Task tool.

## Current Status

Run this first to see current progress:

```bash
npx tsx scripts/monitor-enrichment-progress.ts
```

Expected output:
```
📋 Total Batches Created: 188
✅ Batches Researched: 77
⏳ Batches Remaining: 111
🎯 NEXT BATCHES TO PROCESS: 78, 79, 80, 81, 82, 83, 84, 85, 86, 87
```

## Step-by-Step Execution

### Method 1: Manual Researcher Agent Spawning (Recommended)

**Process 10 batches at a time by spawning researcher agents in a SINGLE message to Claude Code:**

#### Example for Batches 78-87:

Send this in **ONE MESSAGE** to Claude Code:

```
Process wine enrichment batches 78-87 by spawning 10 researcher agents concurrently:

Task("Wine Researcher Batch 78", "
  Read /Users/greghogue/Leora2/web/data/wine-research-batch-78.json

  BEFORE: Run hooks:
  npx claude-flow@alpha hooks pre-task --description 'Research batch 78'
  npx claude-flow@alpha hooks session-restore --session-id 'swarm-enrichment-batch-78'

  FOR EACH WINE in batch:
  1. Use WebFetch to search: '{wine name} {vintage} wine tasting notes reviews'
  2. Target: Wine Spectator, Wine Enthusiast, Decanter, Vivino
  3. Extract REAL tasting notes - NO GENERIC TEMPLATES!
  4. Create unique description for each wine

  SAVE results to: /Users/greghogue/Leora2/web/data/wine-research-results-batch-78.json

  AFTER: Run hooks:
  npx claude-flow@alpha hooks post-task --task-id 'batch-78'
  npx claude-flow@alpha hooks notify --message 'Batch 78 complete'
", "researcher")

Task("Wine Researcher Batch 79", "<same instructions for batch 79>", "researcher")
Task("Wine Researcher Batch 80", "<same instructions for batch 80>", "researcher")
Task("Wine Researcher Batch 81", "<same instructions for batch 81>", "researcher")
Task("Wine Researcher Batch 82", "<same instructions for batch 82>", "researcher")
Task("Wine Researcher Batch 83", "<same instructions for batch 83>", "researcher")
Task("Wine Researcher Batch 84", "<same instructions for batch 84>", "researcher")
Task("Wine Researcher Batch 85", "<same instructions for batch 85>", "researcher")
Task("Wine Researcher Batch 86", "<same instructions for batch 86>", "researcher")
Task("Wine Researcher Batch 87", "<same instructions for batch 87>", "researcher")
```

### Method 2: Use Helper Script

```bash
# Generate instructions for next 10 batches
npx tsx scripts/generate-researcher-instructions.ts 78 87

# This will output the Task spawning commands to copy/paste into Claude Code
```

### Method 3: Automated Processing (After Manual Review)

```bash
# Process specific batch range
npx tsx scripts/execute-batch-enrichment.ts 78 87

# Process all remaining batches
npx tsx scripts/execute-batch-enrichment.ts
```

## Monitoring Progress

### Real-Time Progress

```bash
npx tsx scripts/track-batch-progress.ts show
```

### Generate Report

```bash
npx tsx scripts/track-batch-progress.ts report
```

### Check Which Batches Are Complete

```bash
ls -la data/wine-research-results-batch-*.json | tail -20
```

## After Batches Are Complete

### Apply Results to Database

For each completed batch:

```bash
npx tsx scripts/apply-enrichment-results.ts 78
npx tsx scripts/apply-enrichment-results.ts 79
# ... etc
```

Or apply all at once:

```bash
for i in {78..188}; do
  if [ -f "data/wine-research-results-batch-$i.json" ]; then
    echo "Applying batch $i..."
    npx tsx scripts/apply-enrichment-results.ts $i
  fi
done
```

### Verify Final Results

```bash
npx tsx scripts/monitor-enrichment-progress.ts
```

Expected final output:
```
📊 DATABASE STATUS:
   Total Products: 1879
   Accurately Enriched: 1879 (100.0%)
   Old Enrichment: 0
   Not Enriched: 0
```

## Recommended Processing Schedule

**Week 1 - Days 1-3:**
- Groups 1-3: Batches 78-107 (30 batches = 300 wines)

**Week 1 - Days 4-6:**
- Groups 4-6: Batches 108-137 (30 batches = 300 wines)

**Week 2 - Days 1-3:**
- Groups 7-9: Batches 138-167 (30 batches = 300 wines)

**Week 2 - Days 4-5:**
- Groups 10-11: Batches 168-188 (21 batches = 210 wines)

**Week 2 - Day 6:**
- Apply all results to database
- Verify completion
- Generate final report

## Quality Checks

After each group of 10 batches:

```bash
# Check for duplicates
npx tsx scripts/check-wine-duplicates.ts 78 87

# Verify confidence scores
npx tsx scripts/verify-confidence-scores.ts 78 87

# Ensure all wines researched
npx tsx scripts/verify-batch-completion.ts 78 87
```

## Troubleshooting

### If a batch fails:

1. Check error log:
   ```bash
   tail -50 logs/enrichment-errors.log
   ```

2. Retry single batch:
   ```
   Task("Wine Researcher Batch [N]", "<instructions>", "researcher")
   ```

3. Update progress tracker:
   ```bash
   npx tsx scripts/track-batch-progress.ts show
   ```

### If WebFetch is rate-limited:

- Add delays between wines (2-3 seconds)
- Process fewer batches concurrently (5 instead of 10)
- Retry failed batches after cooldown period

### If results are generic:

- Review researcher agent prompts
- Ensure WebFetch is being used
- Check confidence scores in metadata
- Manually verify a sample of wines

## Memory Coordination

Progress is automatically tracked via hooks:

```bash
# View stored batch progress
npx claude-flow@alpha memory usage --key "swarm/enrichment/*"

# View session metrics
npx claude-flow@alpha analysis performance-report
```

## Success Checklist

- ✅ Execution plan created
- ✅ Progress tracker implemented
- ✅ Batch files verified (78-188 exist)
- ✅ Researcher agent instructions documented
- ✅ Hooks integration configured
- ✅ Ready to spawn researcher agents

## Next Action

**Start processing by sending this message to Claude Code:**

```
Process wine enrichment batches 78-87 by spawning 10 researcher agents concurrently.
Use the instructions in /Users/greghogue/Leora2/web/docs/RESEARCHER_AGENT_INSTRUCTIONS.md
to ensure proper WebFetch usage and unique tasting notes for each wine.
```

Then monitor progress and continue with subsequent batch groups!
