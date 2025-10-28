#!/bin/bash

echo "=========================================="
echo "Wine Enrichment Batch Application (1-50)"
echo "=========================================="
echo ""

TOTAL_PROCESSED=0
TOTAL_SUCCESS=0
TOTAL_ERRORS=0
START_TIME=$(date +%s)

for i in {1..50}; do
  echo ">>> Processing Batch $i..."
  OUTPUT=$(npx ts-node scripts/apply-enrichment-results.ts $i 2>&1)
  
  # Extract success and error counts from output
  SUCCESS=$(echo "$OUTPUT" | grep "Success:" | awk '{print $2}')
  ERRORS=$(echo "$OUTPUT" | grep "Errors:" | awk '{print $2}')
  TOTAL=$(echo "$OUTPUT" | grep "Total:" | awk '{print $2}')
  
  if [ -n "$SUCCESS" ] && [ -n "$ERRORS" ]; then
    TOTAL_PROCESSED=$((TOTAL_PROCESSED + TOTAL))
    TOTAL_SUCCESS=$((TOTAL_SUCCESS + SUCCESS))
    TOTAL_ERRORS=$((TOTAL_ERRORS + ERRORS))
    echo "    Batch $i: ✅ $SUCCESS succeeded, ❌ $ERRORS failed (Total: $TOTAL)"
  else
    echo "    Batch $i: ⚠️  Skipped or error"
  fi
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "=========================================="
echo "FINAL SUMMARY"
echo "=========================================="
echo "Total wines processed: $TOTAL_PROCESSED"
echo "✅ Successfully updated: $TOTAL_SUCCESS"
echo "❌ Errors/Not found: $TOTAL_ERRORS"
echo "📊 Success rate: $(awk "BEGIN {printf \"%.1f\", ($TOTAL_SUCCESS/$TOTAL_PROCESSED)*100}")%"
echo "⏱  Duration: ${DURATION}s"
echo "=========================================="
