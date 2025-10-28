# Routing & Delivery Guide

## Overview

The Leora Routing system integrates with Azuga route optimization software to create efficient delivery routes, track deliveries in real-time, and provide customers with accurate ETAs.

**Who This Guide Is For:**
- Dispatch managers
- Delivery coordinators
- Drivers
- Operations managers

**What You'll Learn:**
- Exporting orders to Azuga
- Understanding the Azuga CSV format
- Importing optimized routes
- Viewing delivery routes
- Assigning drivers
- Tracking deliveries
- Sharing customer ETAs

---

## Quick Start: Creating Your First Route

### Step 1: Pick Orders (5 minutes)

1. Complete warehouse picking
2. Ensure pick sheets status = PICKED
3. Orders ready for delivery

### Step 2: Export to Azuga (2 minutes)

1. Go to **Routing > Export to Azuga**
2. Select picked orders
3. Set delivery date
4. Click **Generate Azuga CSV**
5. Download CSV file

### Step 3: Optimize in Azuga (10 minutes)

1. Log into Azuga platform
2. Upload CSV file
3. Run route optimization
4. Review suggested routes
5. Export optimized route CSV

### Step 4: Import Routes (2 minutes)

1. Back in Leora: **Routing > Import Routes**
2. Upload optimized Azuga CSV
3. Review route preview
4. Click **Import Routes**
5. Routes created automatically

### Step 5: Assign Drivers (1 minute)

1. **Routes > Today's Routes**
2. Click route
3. Assign driver from dropdown
4. Driver receives notification
5. Route syncs to driver's mobile app

### Step 6: Track Deliveries (Ongoing)

1. View **Live Route Map**
2. See driver location in real-time
3. Monitor stop completion
4. Customer receives ETA updates
5. Get completion notifications

---

## Export to Azuga

### Understanding the Export

**What Gets Exported:**
- Customer delivery addresses
- Order details (items, quantities)
- Special delivery instructions
- Time windows (if specified)
- Customer contact information

**File Format:** CSV (Comma-Separated Values)

### Step-by-Step Export

**1. Navigate to Export**
   - Menu: Routing > Export to Azuga

**2. Select Orders**

**Filter by:**
- **Status**: PICKED (ready for delivery)
- **Delivery Date**: Today, Tomorrow, This Week
- **Customer Type**: On-premise, Off-premise, All
- **Priority**: Rush orders first

**Selection:**
- Check individual orders
- Or **Select All** for date range
- Review order count: 25 orders selected

**3. Configure Export**

**Delivery Date:**
- Tomorrow (default)
- Specific date
- ASAP (for rush orders)

**Time Windows:**
- Include customer requested times
- Or leave blank (Azuga will optimize)

**Special Instructions:**
- Include delivery notes
- Include customer contact
- Include order value (for COD)

**4. Generate CSV**
- Click **Generate Azuga CSV**
- File downloads: `azuga_export_2024-10-25.csv`
- Save to known location

**5. Verify Export**

Open CSV in Excel to verify:
- All orders included (25 rows)
- Addresses formatted correctly
- No missing data
- Special characters handled properly

---

## Azuga CSV Format

### Export Format (Leora → Azuga)

```csv
customer_name,address,city,state,zip,phone,email,delivery_date,time_window_start,time_window_end,order_id,order_value,special_instructions,contact_person
Wine Bar XYZ,123 Main St,San Francisco,CA,94102,415-555-1234,manager@winebar.com,2024-10-26,09:00,12:00,ORD-001,1250.00,Backdoor delivery,John Smith
Restaurant ABC,456 Oak Ave,Oakland,CA,94610,510-555-5678,owner@restaurant.com,2024-10-26,14:00,17:00,ORD-002,850.50,Call before arrival,Jane Doe
```

### Field Definitions

| Field | Description | Required | Example |
|-------|-------------|----------|---------|
| `customer_name` | Business name | Yes | Wine Bar XYZ |
| `address` | Street address | Yes | 123 Main St |
| `city` | City | Yes | San Francisco |
| `state` | State code | Yes | CA |
| `zip` | ZIP code | Yes | 94102 |
| `phone` | Contact phone | Yes | 415-555-1234 |
| `email` | Contact email | No | manager@winebar.com |
| `delivery_date` | Target date | Yes | 2024-10-26 |
| `time_window_start` | Earliest delivery | No | 09:00 |
| `time_window_end` | Latest delivery | No | 12:00 |
| `order_id` | Leora order ID | Yes | ORD-001 |
| `order_value` | Total value | No | 1250.00 |
| `special_instructions` | Delivery notes | No | Backdoor delivery |
| `contact_person` | Who to ask for | No | John Smith |

### Import Format (Azuga → Leora)

After Azuga optimization, import this format:

```csv
route_name,stop_number,sequence,customer_name,address,estimated_arrival,estimated_duration,order_id,driver_assigned,route_start_time
Route 1,1,1,Wine Bar XYZ,123 Main St San Francisco CA 94102,09:15,15,ORD-001,John Doe,08:00
Route 1,2,2,Bistro 456,789 Pine St San Francisco CA 94103,09:45,10,ORD-003,John Doe,08:00
Route 1,3,3,Cafe ABC,321 Elm St San Francisco CA 94104,10:15,12,ORD-005,John Doe,08:00
Route 2,1,1,Restaurant ABC,456 Oak Ave Oakland CA 94610,14:20,20,ORD-002,Jane Smith,13:00
```

### Field Definitions (Import)

| Field | Description | Example |
|-------|-------------|---------|
| `route_name` | Route identifier | Route 1 |
| `stop_number` | Stop # on route | 1, 2, 3 |
| `sequence` | Optimized order | 1, 2, 3 |
| `customer_name` | Business name | Wine Bar XYZ |
| `address` | Full address | 123 Main St... |
| `estimated_arrival` | ETA time | 09:15 |
| `estimated_duration` | Stop duration (min) | 15 |
| `order_id` | Leora order ID | ORD-001 |
| `driver_assigned` | Driver name | John Doe |
| `route_start_time` | Route begins | 08:00 |

---

## Using Azuga for Route Optimization

### Uploading to Azuga

1. **Log into Azuga**
   - Visit: https://app.azuga.com
   - Enter credentials

2. **Navigate to Routes**
   - Menu: Routes > Create New Route

3. **Upload CSV**
   - Click **Import Stops**
   - Select Leora export CSV
   - Map fields if needed

4. **Review Stops**
   - Verify all stops imported: 25/25
   - Check addresses geocoded correctly
   - Fix any address errors

### Running Optimization

**1. Set Parameters**

**Optimization Goals:**
- Minimize total drive time (default)
- Minimize total distance
- Balance routes evenly
- Respect time windows

**Constraints:**
- Number of vehicles: 3
- Vehicle capacity: 200 bottles each
- Max route duration: 8 hours
- Start location: Your warehouse address
- End location: Return to warehouse

**Advanced Options:**
- Avoid highways: No
- Avoid tolls: No
- Include breaks: 30-min lunch
- Driver skills: Match customers to preferred drivers

**2. Run Optimization**
- Click **Optimize Routes**
- Wait 1-2 minutes (for 25 stops)
- Review results

**3. Review Suggested Routes**

**Route 1 (John Doe):**
- Stops: 9
- Total miles: 35
- Duration: 4h 15m
- Start: 8:00 AM
- End: 12:15 PM

**Route 2 (Jane Smith):**
- Stops: 10
- Total miles: 42
- Duration: 5h 30m
- Start: 8:00 AM
- End: 1:30 PM

**Route 3 (Bob Johnson):**
- Stops: 6
- Total miles: 28
- Duration: 3h 45m
- Start: 1:00 PM
- End: 4:45 PM

**4. Adjust Routes (if needed)**
- Drag stops between routes
- Change stop sequence
- Adjust time windows
- Re-optimize

**5. Export Optimized Routes**
- Click **Export > CSV**
- Save file: `azuga_optimized_2024-10-25.csv`
- Ready to import into Leora

---

## Import Routes

### Importing Optimized Routes

**1. Navigate to Import**
   - Menu: Routing > Import Routes

**2. Upload CSV**
   - Click **Choose File**
   - Select Azuga optimized CSV
   - Click **Upload**

**3. Verify Import Preview**

System shows:
- Routes to create: 3
- Total stops: 25
- Matched orders: 25/25 (100%)
- Unmatched orders: 0
- Validation errors: 0

**Preview:**
```
Route 1: 9 stops, 35 miles, 4h 15m
  Stop 1: Wine Bar XYZ (ORD-001) - ETA 9:15 AM
  Stop 2: Bistro 456 (ORD-003) - ETA 9:45 AM
  ...

Route 2: 10 stops, 42 miles, 5h 30m
  Stop 1: Restaurant ABC (ORD-002) - ETA 9:30 AM
  ...
```

**4. Handle Errors (if any)**

**Common Issues:**
- **Unmatched Order ID**: Order doesn't exist in Leora
  - Fix: Update order ID in CSV, or skip this row
- **Duplicate Stop**: Same order on multiple routes
  - Fix: Remove duplicate from CSV
- **Invalid Time Format**: Time not recognized
  - Fix: Use HH:MM format (24-hour)

**5. Confirm Import**
- Review summary
- Click **Import Routes**
- Routes created immediately

**6. Verify Routes Created**
- Navigate to **Routes > Today's Routes**
- See 3 new routes
- Status: PENDING (ready to assign drivers)

---

## Route Visibility

### Today's Routes View

**1. Navigate to Routes**
   - Menu: Routes > Today's Routes

**2. Route List**

```
Route 1                    Status: IN_PROGRESS     Driver: John Doe
├─ Stops: 3/9 completed
├─ Miles: 12/35 driven (34%)
├─ ETA: On time
└─ Next Stop: Cafe ABC (10:15 AM)

Route 2                    Status: PENDING         Driver: (Unassigned)
├─ Stops: 10
├─ Miles: 42
├─ Start Time: 8:00 AM
└─ Assign driver to begin

Route 3                    Status: COMPLETED       Driver: Bob Johnson
├─ Stops: 6/6 completed
├─ Miles: 28 driven
├─ Completed: 4:32 PM (13 min early)
└─ View details
```

**3. Route Details**

Click route to see:
- Map with all stops
- Stop list with ETAs
- Customer contact info
- Order details (items, quantities)
- Special delivery instructions
- Driver notes

**4. Live Map**

Real-time view showing:
- Driver current location (blue dot)
- Completed stops (green pins)
- Pending stops (red pins)
- Route path (blue line)
- Traffic conditions

---

## Driver Assignment

### Assigning Drivers to Routes

**1. Open Route**
   - Routes > Today's Routes
   - Click route to assign

**2. Click Assign Driver**
   - Dropdown shows available drivers
   - Drivers with capacity highlighted

**3. Select Driver**
   - Choose driver from list
   - See driver details:
     - Current route count
     - Total stops today
     - Vehicle assigned
     - Contact info

**4. Confirm Assignment**
   - Click **Assign**
   - Driver receives push notification
   - Route syncs to driver mobile app
   - Status changes to IN_PROGRESS

### Driver Mobile App

**App Features:**
- Turn-by-turn navigation
- Stop-by-stop checklist
- Customer contact (call/text)
- Proof of delivery (signature + photo)
- Issue reporting (customer not present, damaged goods)
- Live ETA updates to customers

**Driver Workflow:**
1. Open app, see assigned routes
2. Start route (status → IN_PROGRESS)
3. Navigate to first stop
4. Mark arrived
5. Complete delivery
6. Get signature
7. Take photo (optional)
8. Mark complete
9. Move to next stop
10. Repeat until route done

---

## Real-Time Tracking

### For Managers

**Live Dashboard:**
- Menu: Routes > Live Tracking

**View Options:**
- All drivers on map
- Individual driver view
- Stop completion timeline
- Delivery status overview

**Metrics Shown:**
- On-time percentage
- Average stop duration
- Miles driven
- Routes in progress
- Delays/issues

### For Customers

**Customer Portal:**
- Customers receive tracking link via email/SMS
- Track: "Your order ORD-001 is being delivered"

**Customer View:**
- Driver location on map (last 15 minutes)
- Estimated arrival time
- Stops before them
- Driver contact (call driver button)
- Delivery instructions they provided

**Notifications:**
- SMS when driver starts route: "Your delivery route has begun. ETA 10:15 AM"
- SMS when 3 stops away: "Your delivery is 3 stops away. ETA 10:12 AM"
- SMS when next stop: "We're on our way! Arriving in 10 minutes"
- SMS when delivered: "Your order has been delivered. Thank you!"

---

## Route Analytics

### Performance Metrics

**View Reports:**
- Menu: Routes > Analytics

**Available Reports:**

**1. On-Time Performance**
- % of deliveries on time: 94%
- Average early: 8 minutes
- Average late: 15 minutes
- By driver comparison

**2. Route Efficiency**
- Planned miles vs actual miles
- Planned time vs actual time
- Stops per hour (productivity)
- Optimization savings (vs un-optimized)

**3. Driver Performance**
- Deliveries per driver
- On-time rate by driver
- Average stop duration
- Customer ratings

**4. Customer Insights**
- Preferred delivery windows
- Delivery success rate
- Issue frequency
- Contact preferences

**Use Cases:**
- Identify best delivery windows
- Find route optimization opportunities
- Recognize top-performing drivers
- Plan future route capacity

---

## Troubleshooting

### "Azuga CSV export failed"

**Cause:** Missing required fields

**Solution:**
1. Verify all orders have delivery addresses
2. Check customers have valid ZIP codes
3. Ensure phone numbers formatted correctly
4. Look for special characters in addresses

### "Import route failed - order ID not found"

**Cause:** Azuga CSV has order IDs that don't exist in Leora

**Solution:**
1. Verify order IDs match exactly (case-sensitive)
2. Check orders weren't deleted after export
3. Confirm you're uploading correct CSV file
4. Update order IDs in CSV if they changed

### "Driver not receiving route"

**Cause:** Mobile app sync issue

**Solution:**
1. Check driver's internet connection
2. Have driver refresh app
3. Verify driver account is active
4. Reassign route if needed
5. Check app permissions (location, notifications)

### "Customer not receiving ETA updates"

**Cause:** Missing contact information or SMS opt-out

**Solution:**
1. Verify customer has valid phone/email
2. Check customer hasn't opted out of SMS
3. Confirm notification settings enabled
4. Test with different customer

### "Route optimization taking too long"

**Cause:** Too many stops or complex constraints

**Solution:**
1. Break large routes into smaller batches
2. Simplify time windows
3. Reduce number of constraints
4. Contact Azuga support for large route optimization

---

## Best Practices

### Export Optimization

**Timing:**
- Export day before delivery
- Gives Azuga time to optimize overnight
- Allows manual adjustments if needed

**Grouping:**
- Group deliveries by geographic area
- Separate rush orders from standard
- Consider customer time windows

**Data Quality:**
- Keep customer addresses updated
- Verify geocoding accuracy
- Include delivery notes
- Update phone numbers regularly

### Route Planning

**Vehicle Capacity:**
- Don't overload routes (leave 10% buffer)
- Consider physical space, not just bottle count
- Account for large/bulky items

**Time Windows:**
- Don't over-constrain (hard to optimize)
- Use realistic windows (2-3 hours minimum)
- Confirm customer availability

**Driver Skills:**
- Match experienced drivers to complex routes
- Assign new drivers to familiar areas
- Consider driver-customer relationships

### Communication

**Pre-Delivery:**
- Notify customers 24 hours ahead
- Confirm delivery window
- Remind of special instructions

**During Delivery:**
- Send ETA updates
- Alert if delays occur
- Provide driver contact

**Post-Delivery:**
- Send delivery confirmation
- Request feedback/rating
- Follow up on any issues

---

## Related Documentation

- [Warehouse Operations Guide](./WAREHOUSE_OPERATIONS_GUIDE.md)
- [Pick Sheet Guide](./PICK_SHEET_GUIDE.md)
- [Warehouse Configuration Guide](./WAREHOUSE_CONFIGURATION_GUIDE.md)
- [Azuga Integration Spec](./AZUGA_INTEGRATION_SPEC.md)
- [API Reference](./API_REFERENCE.md)

---

## Support

**Routing Questions:**
- Email: routing-support@yourcompany.com
- Phone: 1-800-ROUTE-HELP
- Live Chat: 8am-6pm EST

**Azuga Support:**
- Azuga Help: https://support.azuga.com
- Azuga Phone: 1-877-298-4287
- Integration Issues: integrations@yourcompany.com
