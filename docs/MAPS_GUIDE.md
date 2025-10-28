# Customer Map User Guide

## Overview

The interactive customer map provides a visual representation of your customer base with powerful filtering, territory management, and route planning capabilities.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Map Navigation](#map-navigation)
3. [Customer Markers](#customer-markers)
4. [Filtering Customers](#filtering-customers)
5. [Heat Map Visualization](#heat-map-visualization)
6. [Box Selection Tool](#box-selection-tool)
7. [Finding Nearby Customers](#finding-nearby-customers)
8. [Mobile Map Usage](#mobile-map-usage)
9. [Tips & Best Practices](#tips--best-practices)

---

## Getting Started

### Accessing the Map

1. Click **"Map"** in the main navigation menu
2. The map will load showing all geocoded customers (those with addresses)
3. Initial view centers on your territory or all customers

### First Time Setup

If customers don't appear on the map:
1. Ensure customers have complete addresses
2. Run batch geocoding (see [Geocoding Guide](./GEOCODING_GUIDE.md))
3. Refresh the map

---

## Map Navigation

### Basic Controls

| Control | Action |
|---------|--------|
| **Click + Drag** | Pan around the map |
| **Scroll Wheel** | Zoom in/out |
| **Double-Click** | Zoom in on location |
| **+ / - Buttons** | Zoom controls |
| **Home Button** | Return to default view |

### Zoom Levels

- **Level 5-8:** Regional view (states/counties)
- **Level 9-12:** City view (neighborhoods)
- **Level 13-16:** Street view (individual buildings)
- **Level 17+:** Building detail

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Arrow Keys** | Pan map |
| **+ / -** | Zoom in/out |
| **H** | Return home |
| **F** | Toggle filters |
| **M** | Toggle heat map |
| **Esc** | Close popup/clear selection |

---

## Customer Markers

### Marker Colors

Customer markers are color-coded by tier:

- 🔵 **Blue** - Premium customers
- 🟢 **Green** - Standard customers
- 🟡 **Yellow** - Basic customers
- 🔴 **Red** - Inactive customers
- ⚪ **Gray** - Prospects

### Marker Interactions

**Click a Marker:**
- View customer card with key information
- See contact details
- View recent activity
- Quick actions (Call, Email, Add to Plan)

**Hover Over Marker:**
- Display customer name tooltip
- Show tier and status

**Right-Click Marker:**
- Context menu with actions:
  - View Customer Details
  - Get Directions
  - Add to Call Plan
  - Edit Customer

### Marker Clustering

When zoomed out, nearby customers cluster together:

- **Cluster Size:** Number shows customer count
- **Click Cluster:** Zoom into that area
- **Cluster Colors:** Blend of customer tiers

Clustering improves performance with thousands of customers.

---

## Filtering Customers

### Filter Panel

Click **"Filters"** button to open:

**By Territory:**
- Select specific territory
- View "My Territory" (your assigned customers)
- Multiple territory selection

**By Tier:**
- ☑ Premium
- ☑ Standard
- ☑ Basic
- ☑ Inactive
- ☑ Prospects

**By Status:**
- ☑ Active
- ☑ At Risk
- ☑ Churned
- ☐ All

**By Revenue:**
- Drag sliders to set min/max revenue range
- Filter high-value customers

**By Activity:**
- Last contacted: 7 days, 30 days, 90 days, Never
- Upcoming appointments
- No recent activity

### Saved Filters

**Save Current Filter:**
1. Apply desired filters
2. Click "Save Filter"
3. Name your filter (e.g., "High-Value At-Risk")
4. Use later from "Saved Filters" dropdown

**Example Filters:**
- "Premium Customers in SF" - Premium tier + SF territory
- "Needs Attention" - No activity >60 days + active status
- "Top Opportunities" - Revenue >$50k + prospect status

---

## Heat Map Visualization

### Enabling Heat Map

1. Click **"Heat Map"** toggle button
2. Heat map overlays on standard map
3. Warmer colors = higher density/value

### Heat Map Modes

**Customer Density (Default):**
- Shows where customers are concentrated
- Useful for identifying service areas

**Revenue Heat Map:**
1. Click "Heat Map Options"
2. Select "Weight by Revenue"
3. Shows revenue concentration
4. Identifies high-value geographic areas

**Activity Heat Map:**
1. Select "Weight by Activity"
2. Shows recent customer activity
3. Highlights engagement hotspots

### Reading the Heat Map

| Color | Meaning |
|-------|---------|
| 🔵 **Blue** | Low density/value |
| 🟢 **Green** | Moderate density/value |
| 🟡 **Yellow** | High density/value |
| 🔴 **Red** | Very high density/value |

### Heat Map Use Cases

**Territory Planning:**
- Identify underserved areas (blue zones)
- See customer concentration for territory sizing

**Sales Strategy:**
- Target high-revenue zones (red zones)
- Plan marketing campaigns by density

**Resource Allocation:**
- Assign reps to dense areas
- Open new offices in high-density zones

---

## Box Selection Tool

### Selecting Multiple Customers

1. Click **"Box Select"** button
2. Click and drag to draw a selection box
3. All customers within box are selected

### Using Selected Customers

After selection, you can:

**Add to Call Plan:**
1. Click "Add to Call Plan"
2. Select date
3. Optimized route created

**Bulk Actions:**
- Assign to territory
- Tag customers
- Bulk email/export
- Create campaign

**Route Planning:**
1. Select customers to visit
2. Click "Optimize Route"
3. See visit order and directions

### Selection Tips

- **Hold Shift:** Add to existing selection
- **Hold Ctrl:** Remove from selection
- **Right-Click:** Clear selection

---

## Finding Nearby Customers

### Location-Based Search

**Find Customers Near You:**
1. Click **"Nearby"** button
2. Allow location access (browser permission)
3. Set search radius (0.5, 1, 2, 5, 10 miles)
4. Click "Search"

**Results:**
- List sorted by distance
- Distance shown for each customer
- Click to view on map

### Find Customers Near Address

1. Click "Nearby"
2. Enter address in search box
3. Set radius
4. Click "Search"

**Use Cases:**
- Field sales planning
- "While you're in the area" visits
- Territory coverage analysis

### Nearby Customer Actions

- **Add All to Call Plan** - One-click route creation
- **Export List** - Download nearby customers
- **View on Map** - See spatial distribution

---

## Mobile Map Usage

### Mobile-Responsive Features

**Touch Gestures:**
- **Pinch to Zoom** - Two fingers
- **Pan** - Single finger drag
- **Tap Marker** - View customer
- **Long Press** - Context menu

**Mobile Optimizations:**
- Simplified UI for small screens
- Larger touch targets
- Bottom sheet for customer details
- GPS integration

### Field Sales Workflow

**Daily Route Planning:**
1. Open map on mobile
2. Tap "Nearby" with GPS enabled
3. Add customers to call plan
4. Tap "Get Directions" for each stop

**Real-Time Updates:**
- Check in at customer location
- Update customer status
- Add notes
- Capture photos

### Navigation Integration

**Get Directions:**
1. Tap customer marker
2. Tap "Get Directions"
3. Chooses:
   - Apple Maps (iOS)
   - Google Maps (Android)
   - Waze (if installed)

### Offline Considerations

**Limited Connectivity:**
- Map tiles cache for offline viewing
- Customer data cached locally
- Sync updates when online

⚠️ **Note:** Full offline maps coming in Phase 7

---

## Tips & Best Practices

### Performance Tips

**Large Customer Bases (>1000):**
- Use filters to reduce visible customers
- Rely on clustering at lower zoom levels
- Use heat map instead of individual markers

**Slow Loading:**
- Check internet connection
- Clear browser cache
- Reduce active filters

### Data Quality

**For Best Results:**
- Ensure all customers have complete addresses
- Geocode new customers promptly
- Verify coordinates for important customers
- Update addresses when customers move

### Territory Management

**Best Practices:**
- Create non-overlapping territories
- Size territories for manageable customer counts (50-150 per rep)
- Review territory boundaries quarterly
- Rebalance based on customer growth

### Route Optimization

**Efficient Routes:**
- Group nearby customers on same day
- Use "Optimize Route" for 5+ stops
- Consider traffic patterns (rush hour)
- Export to Azuga for GPS navigation

### Privacy & Security

**Sensitive Data:**
- Customer locations are internal-only
- Don't share map screenshots externally
- Log out on shared devices
- Use secure connections (HTTPS)

---

## Troubleshooting

### Customers Not Showing on Map

**Check:**
1. ✅ Customer has complete address
2. ✅ Customer has been geocoded
3. ✅ Filters not hiding customer
4. ✅ Zoom level appropriate

**Solution:**
- Run geocoding for missing customers
- Clear filters temporarily
- Check customer record for coordinates

### Map Not Loading

**Try:**
1. Refresh browser (Ctrl+R / Cmd+R)
2. Clear browser cache
3. Check internet connection
4. Try different browser

### Inaccurate Locations

**If customer appears in wrong location:**
1. Verify address in customer record
2. Re-geocode customer
3. Manually adjust coordinates if needed
4. Contact support for persistent issues

### Performance Issues

**If map is slow:**
1. Use filters to reduce markers
2. Close other browser tabs
3. Update browser to latest version
4. Check device resources (RAM)

---

## Advanced Features

### Custom Map Views

**Save Map State:**
1. Apply filters
2. Set zoom/position
3. Click "Save View"
4. Access from "Saved Views"

**Share Map View:**
1. Create saved view
2. Click "Share"
3. Copy link
4. Send to team members

### Exporting Data

**Export Visible Customers:**
1. Apply desired filters
2. Click "Export"
3. Choose format (CSV, Excel, PDF)
4. Download file

**Includes:**
- Customer details
- Coordinates
- Territory assignment
- Revenue data

### Map Printing

**Print Map:**
1. Set view/filters
2. Click "Print"
3. Choose:
   - Current View
   - Full Territory
   - Selected Customers
4. Print or Save as PDF

---

## Keyboard Reference Card

| Action | Shortcut |
|--------|----------|
| **Open Filters** | F |
| **Toggle Heat Map** | M |
| **Box Select** | B |
| **Find Nearby** | N |
| **Zoom In** | + |
| **Zoom Out** | - |
| **Pan Left** | ← |
| **Pan Right** | → |
| **Pan Up** | ↑ |
| **Pan Down** | ↓ |
| **Reset View** | H |
| **Clear Selection** | Esc |
| **Search** | / |
| **Help** | ? |

---

## Getting Help

**Need Assistance?**
- 📧 Email: support@example.com
- 💬 Chat: Click help icon in bottom-right
- 📖 Documentation: [Full Guide](./README.md)
- 🎥 Video Tutorials: [YouTube Playlist](https://youtube.com/playlist)

**Report Issues:**
- Use "Report Bug" button in map
- Include screenshot if possible
- Describe steps to reproduce
- Note browser and device

---

## What's Next?

**Learn More:**
- [Geocoding Guide](./GEOCODING_GUIDE.md) - Address geocoding
- [Territory Planning Guide](./TERRITORY_PLANNING_GUIDE.md) - Create territories
- [API Reference](./API_REFERENCE.md) - Technical details

**Coming Soon (Phase 7):**
- 🗺️ Offline map support
- 🚗 Real-time traffic integration
- 📊 Territory performance dashboards
- 🎨 Custom map styles

---

**Last Updated:** 2024-12-15
**Version:** 5.0.0 (Phase 6)
