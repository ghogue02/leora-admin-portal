# Monday: Mapbox Integration & Geocoding

**Priority:** CRITICAL - Day 1 Deliverable
**Status:** Ready for Execution
**Time Required:** 4 hours

## 🚀 Quick Start

**If you're ready to get started right now:**

👉 **[START HERE - Read This First](./START_HERE.md)**

This is a simple 3-step guide that will get you up and running in 4 hours.

## 📚 Available Documentation

We've created comprehensive documentation to support you:

### For Getting Started
1. **[START_HERE.md](./START_HERE.md)** ⭐ **Start with this!**
   - Simple 3-step process
   - Clear instructions
   - What to do when things go wrong
   - Perfect for getting going quickly

2. **[MAPBOX_QUICKSTART.md](./MAPBOX_QUICKSTART.md)**
   - One-page reference
   - Essential commands
   - Quick troubleshooting
   - Keep this open while working

### For Step-by-Step Guidance
3. **[MONDAY_MAPBOX_SETUP.md](./MONDAY_MAPBOX_SETUP.md)**
   - Complete 4-hour walkthrough
   - Every detail explained
   - Screenshots and examples
   - Comprehensive troubleshooting

4. **[MAPBOX_CHECKLIST.md](./MAPBOX_CHECKLIST.md)**
   - Track your progress
   - Check off completed items
   - Time tracking
   - Notes section for issues

### For Technical Reference
5. **[MAPBOX_SUMMARY.md](./MAPBOX_SUMMARY.md)**
   - Technical overview
   - Scripts explanation
   - API details
   - Architecture decisions

6. **[/docs/MAPS_API_SETUP.md](../MAPS_API_SETUP.md)**
   - API endpoint documentation
   - Database schema
   - Rate limiting
   - Performance optimization

## 🎯 What You're Doing Today

### The Goal
Geocode all 4,871 customers so they appear on the map.

### Current Status
- **Total Customers:** 4,871
- **Geocoded:** 0 (0%)
- **Need Geocoding:** 4,871 (100%)

### Success Criteria
- ✅ Mapbox token obtained and configured
- ✅ 4,871 customers geocoded (>95% success = 4,627+)
- ✅ Map displays all customers
- ✅ All features tested and working

## ⚡ The Fast Track

### 1. Get Token (10 min)
https://account.mapbox.com/access-tokens/ → Create token → Copy it

### 2. Configure (2 min)
Add to `.env.local`:
```
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.YOUR_TOKEN_HERE
```

### 3. Verify (1 min)
```bash
npm run geocode:verify
```

### 4. Geocode (2 hours)
```bash
npm run geocode:customers -- --tenant-id=58b8126a-2d2f-4f55-bc98-5b6784800bed
```

### 5. Test (1 hour)
Open: http://localhost:3000/sales/customers/map

## 🛠️ Scripts Available

```bash
# Verify setup is correct
npm run geocode:verify

# Geocode all customers
npm run geocode:customers -- --tenant-id=58b8126a-2d2f-4f55-bc98-5b6784800bed

# Check progress/generate report
npm run geocode:report
```

## 📊 Documentation Index

| Document | Purpose | When to Use |
|----------|---------|-------------|
| START_HERE.md | Get started quickly | First thing, right now |
| MAPBOX_QUICKSTART.md | Quick reference | Keep open while working |
| MONDAY_MAPBOX_SETUP.md | Detailed walkthrough | When you need details |
| MAPBOX_CHECKLIST.md | Track progress | Throughout the day |
| MAPBOX_SUMMARY.md | Technical overview | For understanding how it works |
| MAPS_API_SETUP.md | API reference | For developers/troubleshooting |

## 🆘 Quick Troubleshooting

### Token Issues
```bash
# Test your token:
curl "https://api.mapbox.com/geocoding/v5/mapbox.places/Los%20Angeles.json?access_token=YOUR_TOKEN"
```

### Verification Fails
1. Check token is in .env.local
2. Token starts with `pk.` (not `sk.`)
3. Restart terminal
4. Run `npm run geocode:verify` again

### Map Won't Load
1. Clear browser cache
2. Check browser console (F12)
3. Verify dev server running
4. Check token in .env.local

## ✅ Progress Tracking

- [ ] Read START_HERE.md
- [ ] Created Mapbox account
- [ ] Obtained access token
- [ ] Added token to .env.local
- [ ] Ran geocode:verify (all green)
- [ ] Started geocoding script
- [ ] Geocoding completed successfully
- [ ] Tested map features
- [ ] All features working
- [ ] Documentation complete

## 🎯 Next Steps (After Completion)

Once geocoding is done and tested:
- **Tuesday:** Territory assignment
- **Wednesday:** Route planning
- **Thursday:** Analytics dashboard
- **Friday:** Final testing & deployment

## 📞 Support

### Documentation
- See any of the guides above
- Check troubleshooting sections
- Review API documentation

### Mapbox Resources
- Dashboard: https://account.mapbox.com/
- Documentation: https://docs.mapbox.com/
- Support: https://support.mapbox.com/

---

## 🎬 Ready to Start?

👉 **[Click here to begin: START_HERE.md](./START_HERE.md)**

**You've got this! 🚀**
