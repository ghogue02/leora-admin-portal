# Batch File Repair Guide

**Date:** 2025-10-21
**Purpose:** Fix corrupt and malformed batch enrichment files

## Problem Summary

Out of 188 batch result files, 17 have issues:

### JSON Syntax Errors (4 files)

| Batch | Error Location | Error Type |
|-------|---------------|------------|
| **26** | Line 178, Column 345 (position 12,994) | Missing comma or brace |
| **55** | Line 46, Column 7 (position 3,646) | Missing comma or brace |
| **86** | Line 187, Column 5 (position 11,223) | Missing comma or bracket |
| **94** | Line 327, Column 7 (position 22,872) | Missing comma or bracket |

### Unknown Format (13 files)

Batches: **45, 65, 110-120**

These don't match expected formats and need investigation.

## Repair Procedures

### Step 1: Validate All Batch Files

```bash
#!/bin/bash
# Check all batch files for JSON validity

echo "Validating all batch files..."
for i in {1..188}; do
  file="data/wine-research-results-batch-$i.json"
  if [ -f "$file" ]; then
    if jq empty "$file" 2>/dev/null; then
      echo "✅ Batch $i: Valid"
    else
      echo "❌ Batch $i: Invalid JSON"
      jq empty "$file" 2>&1 | head -3
    fi
  else
    echo "⚠️  Batch $i: File not found"
  fi
done
```

### Step 2: Fix JSON Syntax Errors

**Batch 26:**
```bash
# Create backup
cp data/wine-research-results-batch-26.json data/wine-research-results-batch-26.json.backup

# Find error location
sed -n '175,180p' data/wine-research-results-batch-26.json

# Manual fix required:
# 1. Open in editor
# 2. Go to line 178, column 345
# 3. Look for missing comma, quote, or brace
# 4. Common issues:
#    - Missing comma between properties
#    - Unescaped quotes in strings
#    - Extra/missing closing brace

# After fixing, validate:
jq empty data/wine-research-results-batch-26.json

# If valid, verify structure:
jq '. | if type == "array" then .[0] else .wines[0] end' data/wine-research-results-batch-26.json
```

**Batch 55:**
```bash
cp data/wine-research-results-batch-55.json data/wine-research-results-batch-55.json.backup
sed -n '44,48p' data/wine-research-results-batch-55.json

# Fix and validate
# (Same process as Batch 26)
```

**Batch 86:**
```bash
cp data/wine-research-results-batch-86.json data/wine-research-results-batch-86.json.backup
sed -n '185,190p' data/wine-research-results-batch-86.json

# Fix and validate
```

**Batch 94:**
```bash
cp data/wine-research-results-batch-94.json data/wine-research-results-batch-94.json.backup
sed -n '325,330p' data/wine-research-results-batch-94.json

# Fix and validate
```

### Step 3: Investigate Unknown Format Files

```bash
# Check what format each unknown file has
for i in 45 65 110 111 112 113 114 115 116 117 118 119 120; do
  echo "=== Batch $i ==="
  file="data/wine-research-results-batch-$i.json"

  if [ -f "$file" ]; then
    # Show first 20 lines
    echo "First 20 lines:"
    head -20 "$file"
    echo ""

    # Check if it's valid JSON
    if jq empty "$file" 2>/dev/null; then
      # Show structure
      echo "Structure:"
      jq '. | keys' "$file" 2>/dev/null || echo "Array format"
    else
      echo "INVALID JSON"
    fi
  else
    echo "FILE NOT FOUND"
  fi
  echo "="$(perl -e 'print "=" x 60')
  echo ""
done
```

### Step 4: Convert Unknown Formats to Standard

**If files are valid JSON but different structure:**

```bash
# Script to convert to standard array format
#!/bin/bash

convert_batch() {
  batch_num=$1
  file="data/wine-research-results-batch-$batch_num.json"
  backup="data/wine-research-results-batch-$batch_num.json.backup"
  output="data/wine-research-results-batch-$batch_num.json.fixed"

  # Backup
  cp "$file" "$backup"

  # Try to extract wines array
  if jq -e '.wines' "$file" > /dev/null 2>&1; then
    # Has wines property - extract it
    jq '.wines' "$file" > "$output"
    echo "✅ Converted batch $batch_num (extracted .wines)"
  elif jq -e 'type == "array"' "$file" > /dev/null 2>&1; then
    # Already array format
    cp "$file" "$output"
    echo "✅ Batch $batch_num already in array format"
  else
    # Unknown structure - manual review needed
    echo "❌ Batch $batch_num: Unknown structure, manual review required"
    jq '.' "$file" | head -30
    return 1
  fi

  # Validate output
  if jq empty "$output" 2>/dev/null; then
    mv "$output" "$file"
    echo "✅ Successfully updated batch $batch_num"
  else
    echo "❌ Conversion failed for batch $batch_num"
    return 1
  fi
}

# Convert all unknown format batches
for i in 45 65 110 111 112 113 114 115 116 117 118 119 120; do
  convert_batch $i
done
```

### Step 5: Verify Repairs

```bash
# After all fixes, verify everything loads correctly

#!/bin/bash
echo "Final Validation Report"
echo "======================"

valid=0
invalid=0
missing=0

for i in {1..188}; do
  file="data/wine-research-results-batch-$i.json"

  if [ ! -f "$file" ]; then
    ((missing++))
    echo "⚠️  Batch $i: Missing"
    continue
  fi

  if jq empty "$file" 2>/dev/null; then
    ((valid++))
  else
    ((invalid++))
    echo "❌ Batch $i: Still invalid"
  fi
done

echo ""
echo "Summary:"
echo "--------"
echo "Valid:   $valid"
echo "Invalid: $invalid"
echo "Missing: $missing"
echo "Total:   188"
echo ""

if [ $invalid -eq 0 ] && [ $missing -eq 0 ]; then
  echo "✅ ALL BATCHES VALID!"
else
  echo "⚠️  Some batches still need attention"
fi
```

## Expected Batch Formats

### Format 1: Simple Array (Most Common)

```json
[
  {
    "productName": "Wine Name 2024",
    "description": "...",
    "tastingNotes": {
      "aroma": "...",
      "palate": "...",
      "finish": "..."
    },
    "foodPairings": ["...", "..."],
    "servingInfo": {
      "temperature": "...",
      "decanting": "...",
      "glassware": "..."
    },
    "wineDetails": {
      "region": "...",
      "grapeVariety": "...",
      "vintage": "...",
      "style": "...",
      "ageability": "..."
    },
    "metadata": {
      "source": "exact-match",
      "confidence": 0.95,
      "researchedAt": "2025-10-21T..."
    }
  }
]
```

### Format 2: Wrapped Object

```json
{
  "batchNumber": 10,
  "totalWines": 10,
  "researchedAt": "2025-10-20T00:00:00.000Z",
  "wines": [
    {
      "productId": "",
      "productName": "Wine Name 2024",
      "description": "...",
      ...
    }
  ]
}
```

## Common JSON Errors

### Missing Comma
```json
// ❌ Wrong
{
  "name": "Wine"
  "vintage": "2024"
}

// ✅ Correct
{
  "name": "Wine",
  "vintage": "2024"
}
```

### Trailing Comma
```json
// ❌ Wrong
{
  "name": "Wine",
  "vintage": "2024",
}

// ✅ Correct
{
  "name": "Wine",
  "vintage": "2024"
}
```

### Unescaped Quotes
```json
// ❌ Wrong
{
  "description": "This wine is "amazing""
}

// ✅ Correct
{
  "description": "This wine is \"amazing\""
}
```

### Extra Closing Bracket
```json
// ❌ Wrong
[
  {"name": "Wine 1"},
  {"name": "Wine 2"}
]]

// ✅ Correct
[
  {"name": "Wine 1"},
  {"name": "Wine 2"}
]
```

## Automated Repair Script

```typescript
#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const batchesWithErrors = [26, 55, 86, 94];

for (const batchNum of batchesWithErrors) {
  const file = resolve(__dirname, `../data/wine-research-results-batch-${batchNum}.json`);
  const backup = `${file}.backup`;

  try {
    // Backup
    const content = readFileSync(file, 'utf-8');
    writeFileSync(backup, content);

    // Try to auto-fix common issues
    let fixed = content
      // Remove trailing commas
      .replace(/,(\s*[}\]])/g, '$1')
      // Fix double commas
      .replace(/,,/g, ',')
      // Fix missing commas between properties
      .replace(/"(\s+)"([a-zA-Z_])/g, '",\n"$2');

    // Validate
    JSON.parse(fixed);

    // If valid, save
    writeFileSync(file, fixed);
    console.log(`✅ Auto-fixed batch ${batchNum}`);

  } catch (error) {
    console.log(`❌ Batch ${batchNum} needs manual review: ${error.message}`);
  }
}
```

## Testing After Repair

```bash
# Test with the analyzer script
npx tsx scripts/analyze-unenriched-products.ts

# Should show:
# ✅ Loaded 188 batches (up from 171)
# ✅ Indexed XXXX unique normalized names (up from 1,699)
```

## Recovery Plan

If repairs make things worse:

```bash
# Restore from backups
for i in {1..188}; do
  backup="data/wine-research-results-batch-$i.json.backup"
  if [ -f "$backup" ]; then
    cp "$backup" "data/wine-research-results-batch-$i.json"
    echo "Restored batch $i"
  fi
done

# Remove backup files after verification
rm data/wine-research-results-batch-*.backup
```

## Success Criteria

After repairs:
- ✅ All 188 batch files parse as valid JSON
- ✅ All files match one of the two expected formats
- ✅ Total unique products indexed increases from 1,699
- ✅ No "unknown format" errors in analyzer

---

**Next Steps After Repair:**
1. Re-run analyze-unenriched-products.ts
2. Run enhanced matcher with repaired batches
3. Verify enrichment rate improvement
