# Testing Instructions for Frontend Agent

**Task**: Test Travis order system implementation
**Checklist**: `/TESTING_CHECKLIST.md`
**Environment**: Local development (`npm run dev`)

---

## 🎯 Your Mission

Test all order system functionality and report back with:
1. Pass/fail status for each test suite
2. Screenshots of any issues
3. Overall production-readiness assessment

---

## 📋 Test Suites to Complete (9 Total)

1. **Order Creation (Basic)** - 3 tests (~15 min)
   - Create order with products
   - Verify auto-fills work
   - Check order submission

2. **Validation & Warnings** - 3 tests (~15 min)
   - Same-day delivery warning
   - PO number validation
   - Low inventory approval

3. **Manager Approval** - 3 tests (~15 min)
   - View approval queue
   - Approve order
   - Reject order

4. **Operations Queue** - 5 tests (~20 min)
   - View queue
   - Filter operations
   - Bulk print (ZIP)
   - Bulk mark as picked
   - Bulk mark as delivered

5. **Territory & Delivery** - 2 tests (~10 min)
   - Territory admin UI
   - Delivery day validation

6. **Background Job** - 1 test (~10 min)
   - Expiration job execution

7. **Edge Cases** - 4 tests (~10 min)
   - Empty order prevention
   - Invalid dates
   - Duplicate products
   - Network errors

8. **Inventory Accuracy** - 1 test (~15 min)
   - Verify inventory math (CRITICAL)

9. **UI/UX Quality** - 3 tests (~10 min)
   - Loading states
   - Responsive design
   - Accessibility

**Total Time**: 60-90 minutes

---

## 🚀 Quick Start

```bash
# 1. Start server
cd /Users/greghogue/Leora2/web
npm run dev

# 2. Open browser
open http://localhost:3000/sales/login

# 3. Follow TESTING_CHECKLIST.md step by step

# 4. Document results in each test's "Report" section
```

---

## ✅ Success Criteria

**System is production-ready if**:
- All critical tests pass (Suites 1-6)
- Inventory math accurate (Suite 8 - CRITICAL)
- No blocker bugs found
- Minor UI issues acceptable

**Report Format**:

```
TESTING COMPLETE

Summary:
- Tests Passed: XX/XX
- Critical Issues: X
- Minor Issues: X
- Production Ready: YES/NO

Critical Functionality:
✅ Order creation
✅ Inventory visibility
✅ Manager approvals
✅ Bulk operations
✅ Inventory math

Issues Found:
1. [Describe any issues]

Recommendation: APPROVED FOR PRODUCTION / NEEDS FIXES
```

---

## 📞 Support

**If you get stuck**:
- Check browser console (F12) for errors
- Check terminal for server errors
- Use `npx prisma studio` to view database
- All test queries are in the checklist

**Reference Documentation**:
- `/TESTING_CHECKLIST.md` - Complete test guide
- `/README_ORDER_SYSTEM.md` - User guide
- `/DEPLOYMENT_GUIDE.md` - Technical details

---

**Start with Test Suite 1 and work through systematically. Good luck!** 🧪