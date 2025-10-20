# Sample Management - Quick Test Plan

**For:** Sales Representatives
**Last Updated:** October 19, 2025

---

## What is Sample Management?

The Sample Management system helps you track wine/spirit samples given to customers, record their feedback, and monitor which samples convert to orders. You have a monthly budget of 60 samples (configurable by your manager).

---

## How to Access

1. Log in at `/sales/login`
2. Click **"Samples"** in the top navigation bar
3. You'll see your budget tracker and usage history

---

## Test 1: View Your Budget

**What you'll see:**
- Current month (e.g., "October 2025")
- Samples used vs. allowance (e.g., "15 of 60 samples used")
- Progress bar (green = good, yellow = near limit, red = over budget)
- Remaining samples count

**What to check:**
- ✅ Numbers make sense based on your usage
- ✅ Progress bar matches the percentage
- ✅ Color is appropriate for your usage level

---

## Test 2: Log a Sample Tasting

**Steps:**
1. Click **"Log Sample Usage"** button (top right)
2. Select a **customer** from dropdown
3. Select a **product/SKU** from dropdown
4. Enter **quantity** (default: 1)
5. Choose **date** (default: today)
6. Add **customer feedback** (optional): "Loved the oak notes"
7. Check **"Needs follow-up"** if you need to call them back
8. Click **"Log Sample"**

**What should happen:**
- ✅ Modal closes automatically
- ✅ New sample appears at top of list
- ✅ Budget "used" count increases by quantity
- ✅ Feedback shows as italic quote
- ✅ Orange "Needs Follow-up" badge appears (if checked)

**What to test:**
- Try logging 2-3 different samples
- Try with and without feedback
- Try with and without follow-up checkbox
- Verify customer and product names are correct

---

## Test 3: Mark Sample as Followed Up

**Steps:**
1. Find a sample with orange **"Needs Follow-up"** badge
2. Click **"Mark Followed Up"** button
3. Wait for update (~1 second)

**What should happen:**
- ✅ Orange badge disappears
- ✅ Blue "Followed up [date]" badge appears
- ✅ "Mark Followed Up" button disappears
- ✅ Sample stays in your history

**Why this matters:**
- Helps you track which customers you've contacted
- Prevents duplicate follow-up calls
- Shows your manager you're following up on leads

---

## Test 4: Mark Sample as Converted to Order

**Steps:**
1. Find any sample in your history
2. Click **"Mark Converted"** button (green border)
3. Wait for update (~1 second)

**What should happen:**
- ✅ Green "✓ Converted to Order" badge appears
- ✅ "Mark Converted" button disappears
- ✅ Sample remains in history with conversion badge

**Why this matters:**
- Tracks which samples lead to actual sales
- Helps identify most effective products to sample
- Shows ROI on sample budget to management

---

## Test 5: Budget Warning Behavior

**Steps:**
1. Log samples until you reach 48+ samples (80% of 60)
2. Observe budget tracker changes
3. Continue logging past 60 samples

**What should happen:**
- ✅ At 48 samples (80%): Progress bar turns **yellow**
- ✅ At 48 samples: Warning message: "Approaching budget limit"
- ✅ At 61 samples: Progress bar turns **red**
- ✅ At 61 samples: Warning message: "Over budget by 1 samples"

**Note:** You can still log samples over budget, but it will require manager approval/review.

---

## Test 6: Data Persistence

**Steps:**
1. Log a sample with feedback and follow-up
2. Refresh the page (F5)
3. Go to Dashboard, then return to Samples
4. Log out and log back in

**What should happen:**
- ✅ Your sample is still there after every action
- ✅ Feedback is preserved
- ✅ Follow-up status is preserved
- ✅ Budget count stays accurate

---

## Test 7: Customer Link Navigation

**Steps:**
1. In the usage log, click on a **customer name** (blue link)
2. Verify you navigate to that customer's detail page
3. Click browser back button to return

**What should happen:**
- ✅ Customer detail page loads
- ✅ Shows correct customer information
- ✅ Back button returns to Samples page

---

## Common Issues & Solutions

### Modal won't load customers/products
- **Cause:** No customers assigned to you or no active SKUs
- **Solution:** Contact your manager to assign customers or activate products

### "Customer not found or not assigned to you" error
- **Cause:** Trying to log sample for unassigned customer
- **Solution:** Only select customers from the dropdown (they're pre-filtered to your territory)

### Budget shows wrong count
- **Cause:** Samples logged outside current month
- **Solution:** Budget only counts current month. Old samples don't affect this month's budget.

### Can't see navigation link
- **Cause:** Not logged in as sales rep
- **Solution:** Make sure you have a sales rep profile and are using `/sales/login` (not portal login)

---

## Best Practices

### When to Log Samples
- ✅ **Immediately after tasting** - Feedback is freshest
- ✅ **Same day** - Don't let them pile up
- ✅ **Include quantity** - If you gave multiple samples

### Writing Good Feedback
- ✅ **Specific quotes:** "They loved the fruity notes"
- ✅ **Interest level:** "Very interested in ordering"
- ✅ **Objections:** "Concerned about price point"
- ✅ **Competitors:** "Currently using [Brand X]"

### Using Follow-up Checkbox
- ✅ **Positive reactions** - Customer showed strong interest
- ✅ **Decision pending** - Needs to discuss with partner/manager
- ✅ **Requested more info** - Wants pricing, specs, etc.

### Marking Conversions
- ✅ **After order placed** - Not just verbal commitment
- ✅ **Within same month** - Helps track conversion rates
- ✅ **Be accurate** - Impacts analytics and reporting

---

## Success Metrics

After testing, you should be able to:

- ✅ Log a sample in under 30 seconds
- ✅ See your month-to-date usage at a glance
- ✅ Track which samples need follow-up
- ✅ Identify which samples converted to orders
- ✅ Stay within monthly budget (or know when you're over)

---

## Need Help?

**Technical Issues:**
- Clear browser cache and reload
- Try different browser (Chrome, Firefox, Safari)
- Contact IT support

**Feature Questions:**
- Ask your sales manager
- Check this test plan
- Review best practices section

**Budget Concerns:**
- Manager can increase allowance if needed
- Focus on high-value customers
- Prioritize products with best conversion rates

---

**Happy Sampling!** 🍷

Remember: The goal is to convert samples to orders. Use your budget strategically on customers most likely to buy.
