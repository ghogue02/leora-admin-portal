# Leora CRM - Comprehensive Test Suite

## 🚀 Quick Start for Claude Chrome Extension Testing

### Prerequisites
```bash
# Start development server
npm run dev

# Verify URL is accessible
http://localhost:3000
```

### Execute Tests
1. **Open Main Test Suite**: `chrome-extension-test-suite.md`
2. **Follow Testing Guide**: `CLAUDE_EXTENSION_TEST_GUIDE.md`
3. **Record Results**: Copy `TEST_RESULTS_TEMPLATE.md` and fill in

---

## 📚 Essential Documentation

- **📘 [../docs/TESTING.md](../docs/TESTING.md)** - Comprehensive testing guide (START HERE)
- **📘 [../docs/TESTING_SUMMARY.md](../docs/TESTING_SUMMARY.md)** - Complete deliverables overview

---

## 🧪 Test Suites (117 Total Tests)

### Main Test Suite (76 tests - Ready Now)
- **File**: `chrome-extension-test-suite.md`
- **Coverage**: Customer Management (12), CARLA (10), Dashboard (8), Job Queue (6), Mobile (8), Performance (6), Security (6)

### Phase 3 Test Suite (41 tests - Run After Phase 3)
- **File**: `phase3-samples-tests.md`
- **Coverage**: Sample Assignment (8), Analytics (10), AI Recommendations (6), Automation (4), Budget (3)

---

## 📋 Quick Reference

| File | Purpose | Size |
|------|---------|------|
| `chrome-extension-test-suite.md` | Main test script (76 tests) | 34K |
| `CLAUDE_EXTENSION_TEST_GUIDE.md` | How to run tests | 12K |
| `phase3-samples-tests.md` | Phase 3 tests (41 tests) | 21K |
| `api-tests.http` | API tests (82 endpoints) | 14K |
| `performance-benchmarks.md` | Performance targets | 11K |
| `browser-compatibility.md` | Browser checklist | 15K |
| `accessibility-checklist.md` | WCAG 2.1 AA | 17K |
| `visual-regression-checklist.md` | Screenshot guide | 12K |
| `TEST_RESULTS_TEMPLATE.md` | Results template | 11K |
| `generate-test-data.ts` | Test data generator | 8.5K |

---

## ✅ Success Criteria

**Test suite passes if:**
- 95%+ tests pass (72+ out of 76)
- No critical failures
- Performance: Page load <2s, API <500ms
- Core features work: Customer list, Call plan, Dashboard, Samples
- Mobile responsive
- Security tests pass
- Accessibility score 90+

---

**For detailed testing guide, see**: [/web/docs/TESTING.md](../docs/TESTING.md)
**For deliverables summary, see**: [/web/docs/TESTING_SUMMARY.md](../docs/TESTING_SUMMARY.md)
