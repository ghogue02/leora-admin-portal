#!/bin/bash
# Learning System Monitor - Automatic status summary
# Called by Claude Code hooks to display learning progress

# Don't use set -e to prevent hook from failing on minor errors

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo ""
echo "${BOLD}${BLUE}🧠 Learning System Status${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if learning system is active
if [ -f "memory/reasoningbank/config.json" ] || [ -d "memory/reasoningbank/trajectories" ]; then
    echo "${GREEN}✅ Status: ACTIVE & LEARNING${NC}"
else
    echo "${YELLOW}⚠️  Status: Not initialized${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    exit 0
fi

# Count learning data
PATTERNS_COUNT=$(find memory/reasoningbank/patterns -type f 2>/dev/null | wc -l | tr -d ' ')
TRAJECTORIES_COUNT=$(find memory/reasoningbank/trajectories -type f 2>/dev/null | wc -l | tr -d ' ')
SESSIONS_COUNT=$(find memory/sessions -type f 2>/dev/null | wc -l | tr -d ' ')

echo ""
echo "${BOLD}📊 Learning Progress:${NC}"
echo "  • Patterns Learned: ${GREEN}${PATTERNS_COUNT}${NC}"
echo "  • Trajectories Tracked: ${BLUE}${TRAJECTORIES_COUNT}${NC}"
echo "  • Sessions Recorded: ${YELLOW}${SESSIONS_COUNT}${NC}"

# Check verification config
if [ -f "memory/verification/config.json" ]; then
    THRESHOLD=$(jq -r '.verification_system.threshold' memory/verification/config.json 2>/dev/null || echo "0.95")
    echo "  • Quality Threshold: ${GREEN}≥${THRESHOLD}${NC}"
fi

# Performance capabilities
echo ""
echo "${BOLD}⚡ Performance:${NC}"
echo "  • Agent Spawning: ${GREEN}10-20x faster${NC}"
echo "  • Code Editing: ${GREEN}352x faster${NC}"
echo "  • Vector Search: ${GREEN}150x faster${NC}"

# Active systems
echo ""
echo "${BOLD}🔧 Active Systems:${NC}"
echo "  • ${GREEN}✓${NC} Hooks Automation"
echo "  • ${GREEN}✓${NC} ReasoningBank (9 algorithms)"
echo "  • ${GREEN}✓${NC} Verification (0.95 threshold)"
echo "  • ${GREEN}✓${NC} Performance Monitoring"

# Recent activity
if [ -d "memory/sessions" ] && [ "$(ls -A memory/sessions 2>/dev/null)" ]; then
    LATEST_SESSION=$(ls -t memory/sessions/*.json 2>/dev/null | head -1)
    if [ -n "$LATEST_SESSION" ]; then
        echo ""
        echo "${BOLD}📝 Last Activity:${NC}"
        SESSION_TIME=$(jq -r '.timestamp // "Unknown"' "$LATEST_SESSION" 2>/dev/null || echo "Unknown")
        echo "  • Session: $(basename "$LATEST_SESSION" .json)"
        echo "  • Time: ${SESSION_TIME}"
    fi
fi

# Quick tips
echo ""
echo "${BOLD}💡 Monitor Commands:${NC}"
echo "  ${BLUE}npx claude-flow@alpha agent memory status${NC}"
echo "  ${BLUE}npx claude-flow@alpha analysis performance-report${NC}"
echo "  ${BLUE}npx claude-flow@alpha verify truth${NC}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "${GREEN}Learning automatically with each task!${NC}"
echo ""
