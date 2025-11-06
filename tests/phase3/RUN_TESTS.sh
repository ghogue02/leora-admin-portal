#!/bin/bash

# Phase 3 Test Runner Script
# Usage: ./tests/phase3/RUN_TESTS.sh [option]

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              PHASE 3 TEST RUNNER                             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check for vitest
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx not found. Please install Node.js"
    exit 1
fi

# Parse option
OPTION=${1:-"ready"}

case $OPTION in
    "ready")
        echo "🟢 Running READY tests only..."
        echo ""
        echo "Tests: Delivery & Split-Case Fees (27 tests)"
        echo ""
        npx vitest tests/phase3/delivery-fees.test.ts
        ;;
    
    "all")
        echo "🔵 Running ALL tests (including blocked/skipped)..."
        echo ""
        echo "Note: Blocked tests will be skipped"
        echo ""
        npx vitest tests/phase3/
        ;;
    
    "coverage")
        echo "📊 Running tests with coverage report..."
        echo ""
        npx vitest tests/phase3/delivery-fees.test.ts --coverage
        ;;
    
    "watch")
        echo "👀 Running in watch mode..."
        echo ""
        npx vitest tests/phase3/delivery-fees.test.ts --watch
        ;;
    
    "status")
        echo "📋 Phase 3 Test Status:"
        echo ""
        echo "✅ READY:   27 tests  (delivery-fees.test.ts)"
        echo "📋 BLOCKED: 60 tests  (all other features)"
        echo ""
        echo "Total: 87 test cases"
        echo ""
        echo "Run './RUN_TESTS.sh ready' to execute ready tests"
        ;;
    
    "help"|"-h"|"--help")
        echo "Usage: ./RUN_TESTS.sh [option]"
        echo ""
        echo "Options:"
        echo "  ready      Run only ready tests (default)"
        echo "  all        Run all tests (blocked tests will skip)"
        echo "  coverage   Run with coverage report"
        echo "  watch      Run in watch mode"
        echo "  status     Show test status summary"
        echo "  help       Show this help message"
        echo ""
        ;;
    
    *)
        echo "❌ Unknown option: $OPTION"
        echo "Run './RUN_TESTS.sh help' for usage"
        exit 1
        ;;
esac

echo ""
echo "✅ Test run complete!"
