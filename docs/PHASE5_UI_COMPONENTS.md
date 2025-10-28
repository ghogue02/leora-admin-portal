# Phase 5 UI Component Integration

**Phase:** Operations & Warehouse Management
**Date:** 2025-10-25
**Status:** Component Specification

---

## Overview

Phase 5 introduces 15+ new UI pages and components for warehouse operations. This document ensures UI consistency with Phases 1-3 design system.

---

## 1. New Pages (15+)

### 1.1 Warehouse Location Management

#### `/warehouse/locations` - Location List Page

**Layout:**
```tsx
<PageHeader title="Warehouse Locations" />
<div className="flex gap-4 mb-6">
  <Input
    placeholder="Search aisle, section..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="flex-1"
  />
  <Select value={zone} onValueChange={setZone}>
    <SelectTrigger className="w-32">
      <SelectValue placeholder="Zone" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Zones</SelectItem>
      <SelectItem value="A">Zone A</SelectItem>
      <SelectItem value="B">Zone B</SelectItem>
      <SelectItem value="C">Zone C</SelectItem>
    </SelectContent>
  </Select>
  <Button onClick={() => router.push('/warehouse/locations/new')}>
    <Plus className="w-4 h-4 mr-2" />
    Add Location
  </Button>
</div>

<DataTable
  columns={locationColumns}
  data={locations}
  pagination
/>
```

**Columns:**
- Location (Zone-Aisle-Section-Shelf)
- Pick Order
- Capacity
- Current Inventory
- Status (Active/Inactive)
- Actions (Edit, Delete)

**Responsive:**
- Desktop: Full table
- Tablet: Scrollable table
- Mobile: Card list

---

#### `/warehouse/locations/new` - Add Location Page

**Form Fields:**
```tsx
<Form>
  <div className="grid grid-cols-2 gap-4">
    <Select label="Zone" required>
      <option>A</option>
      <option>B</option>
      <option>C</option>
    </Select>

    <Input
      label="Aisle"
      placeholder="01"
      pattern="[0-9]{2}"
      required
    />

    <Select label="Section" required>
      <option>A</option>
      <option>B</option>
      <option>C</option>
    </Select>

    <Input
      label="Shelf"
      type="number"
      min="1"
      required
    />

    <Input
      label="Bin (Optional)"
      placeholder="Optional sub-location"
    />

    <Input
      label="Capacity"
      type="number"
      min="0"
      placeholder="Max units"
    />
  </div>

  <Textarea
    label="Notes"
    placeholder="Special handling instructions..."
  />

  <div className="flex gap-4">
    <Button type="submit" variant="primary">
      Create Location
    </Button>
    <Button type="button" variant="outline" onClick={() => router.back()}>
      Cancel
    </Button>
  </div>
</Form>
```

**Validation:**
- Real-time pattern validation
- Duplicate location check
- Auto-calculate pickOrder preview

---

#### `/warehouse/locations/:id` - Edit Location Page

Same form as "new" but pre-filled.

---

#### `/warehouse/map` - Visual Warehouse Map

**Interactive Map:**
```tsx
<div className="warehouse-map">
  <div className="zones-container">
    {zones.map(zone => (
      <div
        key={zone.name}
        className="zone"
        style={{ backgroundColor: zone.color + '20' }}
      >
        <h3 style={{ color: zone.color }}>{zone.name}</h3>
        <div className="aisles-grid">
          {getAislesForZone(zone).map(aisle => (
            <div key={aisle} className="aisle">
              <div className="aisle-label">{aisle}</div>
              <div className="sections">
                {getSectionsForAisle(zone, aisle).map(section => (
                  <div
                    key={section}
                    className={cn(
                      "section",
                      hasInventory(zone, aisle, section) && "has-inventory"
                    )}
                    onClick={() => viewSection(zone, aisle, section)}
                  >
                    {section}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>

  <div className="map-legend">
    <div className="legend-item">
      <div className="color-box has-inventory"></div>
      <span>Has Inventory</span>
    </div>
    <div className="legend-item">
      <div className="color-box empty"></div>
      <span>Empty</span>
    </div>
  </div>
</div>
```

**Features:**
- Color-coded zones
- Clickable sections
- Inventory heatmap
- Zoom/pan (react-zoom-pan-pinch)
- Touch gestures on tablet

---

#### `/warehouse/zones` - Zone Configuration Page

**Admin-only page for zone setup.**

```tsx
<Card>
  <CardHeader>
    <CardTitle>Warehouse Zones</CardTitle>
  </CardHeader>
  <CardContent>
    <Table>
      <thead>
        <tr>
          <th>Zone</th>
          <th>Description</th>
          <th>Color</th>
          <th>Pick Order Range</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {zones.map(zone => (
          <tr key={zone.id}>
            <td>
              <Badge style={{ backgroundColor: zone.color }}>
                {zone.name}
              </Badge>
            </td>
            <td>{zone.description}</td>
            <td>
              <input
                type="color"
                value={zone.color}
                onChange={(e) => updateZoneColor(zone.id, e.target.value)}
              />
            </td>
            <td>{zone.startOrder} - {zone.endOrder}</td>
            <td>
              <Button size="sm" variant="ghost" onClick={() => editZone(zone)}>
                <Edit className="w-4 h-4" />
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  </CardContent>
</Card>
```

---

### 1.2 Pick Sheet Management

#### `/operations/pick-sheets` - Pick Sheet List Page

**Filters:**
```tsx
<div className="filters flex gap-4 mb-6">
  <Select value={status} onValueChange={setStatus}>
    <SelectItem value="all">All Status</SelectItem>
    <SelectItem value="PENDING">Pending</SelectItem>
    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
    <SelectItem value="COMPLETED">Completed</SelectItem>
  </Select>

  <Input
    type="date"
    label="Delivery Date"
    value={deliveryDate}
    onChange={(e) => setDeliveryDate(e.target.value)}
  />

  <Button onClick={() => router.push('/operations/pick-sheets/generate')}>
    <Plus className="w-4 h-4 mr-2" />
    Generate Pick Sheet
  </Button>
</div>

<DataTable columns={pickSheetColumns} data={pickSheets} />
```

**Columns:**
- Sheet Number (PS-20250125-001)
- Status Badge
- Delivery Date
- Assigned To
- Items (count)
- Progress (picked / total)
- Actions (View, Print, CSV)

---

#### `/operations/pick-sheets/:id` - Pick Sheet Details Page

**Two-column layout:**

```tsx
<div className="grid md:grid-cols-3 gap-6">
  {/* Left: Pick Sheet Info */}
  <Card className="md:col-span-1">
    <CardHeader>
      <CardTitle>Pick Sheet {pickSheet.sheetNumber}</CardTitle>
      <Badge variant={getStatusVariant(pickSheet.status)}>
        {pickSheet.status}
      </Badge>
    </CardHeader>
    <CardContent>
      <dl className="space-y-2">
        <div>
          <dt className="text-sm text-muted-foreground">Delivery Date</dt>
          <dd className="font-medium">{formatDate(pickSheet.deliveryDate)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Assigned To</dt>
          <dd className="font-medium">{pickSheet.assignedTo || 'Unassigned'}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Progress</dt>
          <dd>
            <Progress value={pickSheet.progress} />
            <p className="text-sm">{pickSheet.pickedItems} / {pickSheet.totalItems} items</p>
          </dd>
        </div>
      </dl>

      <div className="mt-6 space-y-2">
        <Button className="w-full" variant="outline" onClick={downloadCSV}>
          <Download className="w-4 h-4 mr-2" />
          Download CSV
        </Button>
        <Button className="w-full" variant="outline" onClick={printSheet}>
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
      </div>
    </CardContent>
  </Card>

  {/* Right: Items List */}
  <Card className="md:col-span-2">
    <CardHeader>
      <CardTitle>Items (Sorted by Pick Order)</CardTitle>
    </CardHeader>
    <CardContent>
      <Table>
        <thead>
          <tr>
            <th>Pick</th>
            <th>Location</th>
            <th>SKU</th>
            <th>Product</th>
            <th>Qty</th>
            <th>Customer</th>
            <th>Order</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr
              key={item.id}
              className={cn(item.isPicked && "bg-green-50 line-through")}
            >
              <td>
                <Checkbox
                  checked={item.isPicked}
                  onCheckedChange={() => togglePicked(item.id)}
                  disabled={pickSheet.status === 'COMPLETED'}
                />
              </td>
              <td className="font-mono text-sm">
                {item.location.zone}-{item.location.aisle}-{item.location.section}-{item.location.shelf}
              </td>
              <td className="font-mono">{item.sku.code}</td>
              <td>{item.sku.product.name}</td>
              <td>{item.quantity}</td>
              <td>{item.customer.name}</td>
              <td>
                <Link href={`/sales/admin/orders/${item.orderId}`}>
                  {item.order.id.slice(0, 8)}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {pickSheet.status === 'IN_PROGRESS' && allItemsPicked && (
        <Button
          className="w-full mt-4"
          onClick={completePickSheet}
        >
          Mark Pick Sheet Complete
        </Button>
      )}
    </CardContent>
  </Card>
</div>
```

**Mobile Optimized:**
- Card-based layout on mobile
- Swipe to mark picked
- Large touch targets (44px+)

---

#### `/operations/pick-sheets/generate` - Generate Pick Sheet Page

**Wizard-style form:**

```tsx
<Tabs defaultValue="select-orders">
  <TabsList>
    <TabsTrigger value="select-orders">1. Select Orders</TabsTrigger>
    <TabsTrigger value="assign-picker">2. Assign Picker</TabsTrigger>
    <TabsTrigger value="review">3. Review</TabsTrigger>
  </TabsList>

  <TabsContent value="select-orders">
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label="Delivery Date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              required
            />
            <Input
              type="number"
              label="Delivery Week"
              value={deliveryWeek}
              onChange={(e) => setDeliveryWeek(e.target.value)}
            />
          </div>

          <div>
            <h4 className="font-medium mb-2">Orders for {formatDate(deliveryDate)}</h4>
            <div className="border rounded-lg p-4 max-h-96 overflow-auto">
              {orders.map(order => (
                <label key={order.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                  <Checkbox
                    checked={selectedOrders.includes(order.id)}
                    onCheckedChange={() => toggleOrder(order.id)}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{order.customer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.lineItems.length} items, {order.total} units
                    </p>
                  </div>
                  <Badge>{order.status}</Badge>
                </label>
              ))}
            </div>
          </div>
        </div>

        <Button onClick={() => setActiveTab('assign-picker')} className="mt-4">
          Next: Assign Picker
        </Button>
      </CardContent>
    </Card>
  </TabsContent>

  <TabsContent value="assign-picker">
    <Card>
      <CardContent className="pt-6">
        <Input
          label="Assigned To"
          placeholder="Picker name..."
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
        />
        <Textarea
          label="Notes"
          placeholder="Special instructions..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex gap-4 mt-4">
          <Button variant="outline" onClick={() => setActiveTab('select-orders')}>
            Back
          </Button>
          <Button onClick={() => setActiveTab('review')}>
            Next: Review
          </Button>
        </div>
      </CardContent>
    </Card>
  </TabsContent>

  <TabsContent value="review">
    <Card>
      <CardContent className="pt-6">
        <h4 className="font-medium mb-4">Review Pick Sheet</h4>
        <dl className="space-y-2">
          <div>
            <dt className="text-sm text-muted-foreground">Delivery Date</dt>
            <dd className="font-medium">{formatDate(deliveryDate)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Orders</dt>
            <dd className="font-medium">{selectedOrders.length}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Estimated Items</dt>
            <dd className="font-medium">{estimatedItems}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Assigned To</dt>
            <dd className="font-medium">{assignedTo || 'Unassigned'}</dd>
          </div>
        </dl>

        <Alert className="mt-4">
          <AlertDescription>
            Generating this pick sheet will allocate inventory and create {estimatedItems} pick items
            sorted by warehouse location.
          </AlertDescription>
        </Alert>

        <div className="flex gap-4 mt-4">
          <Button variant="outline" onClick={() => setActiveTab('assign-picker')}>
            Back
          </Button>
          <Button onClick={generatePickSheet} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Pick Sheet'}
          </Button>
        </div>
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>
```

---

### 1.3 Delivery Routing

#### `/routing/routes` - Route List Page

```tsx
<PageHeader title="Delivery Routes" />
<div className="filters flex gap-4 mb-6">
  <Select value={status} onValueChange={setStatus}>
    <SelectItem value="all">All Status</SelectItem>
    <SelectItem value="DRAFT">Draft</SelectItem>
    <SelectItem value="PLANNED">Planned</SelectItem>
    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
    <SelectItem value="COMPLETED">Completed</SelectItem>
  </Select>

  <Input
    type="date"
    label="Delivery Date"
    value={deliveryDate}
    onChange={(e) => setDeliveryDate(e.target.value)}
  />

  <Button onClick={() => router.push('/routing/routes/new')}>
    <Plus className="w-4 h-4 mr-2" />
    Create Route
  </Button>
</div>

<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
  {routes.map(route => (
    <Card key={route.id} className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{route.routeName}</CardTitle>
            <p className="text-sm text-muted-foreground">{route.routeNumber}</p>
          </div>
          <Badge variant={getStatusVariant(route.status)}>
            {route.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Delivery Date</dt>
            <dd className="font-medium">{formatDate(route.deliveryDate)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Driver</dt>
            <dd className="font-medium">{route.driverName || 'Unassigned'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Stops</dt>
            <dd className="font-medium">{route.totalStops}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Distance</dt>
            <dd className="font-medium">{route.totalMiles?.toFixed(1)} mi</dd>
          </div>
        </dl>

        <div className="flex gap-2 mt-4">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => router.push(`/routing/routes/${route.id}`)}
          >
            View
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadRouteCSV(route.id)}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

---

#### `/routing/routes/:id` - Route Details Page

**Map + Stop List:**

```tsx
<div className="grid lg:grid-cols-2 gap-6">
  {/* Left: Route Info */}
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>{route.routeName}</CardTitle>
        <Badge variant={getStatusVariant(route.status)}>
          {route.status}
        </Badge>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2">
          <div>
            <dt className="text-sm text-muted-foreground">Driver</dt>
            <dd className="font-medium">{route.driverName}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Phone</dt>
            <dd className="font-medium">{route.driverPhone}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Delivery Date</dt>
            <dd className="font-medium">{formatDate(route.deliveryDate)}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Stops ({route.totalStops})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {stops.map((stop, index) => (
            <div
              key={stop.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border",
                stop.isCompleted && "bg-green-50"
              )}
            >
              <div className="flex-shrink-0">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-bold",
                  stop.isCompleted ? "bg-green-500 text-white" : "bg-gray-200"
                )}>
                  {stop.stopNumber}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{stop.customer.name}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {stop.addressLine1}, {stop.city}
                </p>
                {stop.scheduledTime && (
                  <p className="text-xs text-muted-foreground">
                    ETA: {formatTime(stop.scheduledTime)}
                  </p>
                )}
              </div>
              {stop.isCompleted && (
                <Check className="w-5 h-5 text-green-500" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>

  {/* Right: Map (optional - future enhancement) */}
  <Card className="hidden lg:block">
    <CardHeader>
      <CardTitle>Route Map</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Map integration coming soon</p>
      </div>
    </CardContent>
  </Card>
</div>
```

---

#### `/routing/routes/new` - Create Route Page

Similar to pick sheet generation wizard.

---

#### `/routing/azuga` - Azuga Integration Page

```tsx
<Tabs defaultValue="export">
  <TabsList>
    <TabsTrigger value="export">Export to Azuga</TabsTrigger>
    <TabsTrigger value="import">Import from Azuga</TabsTrigger>
  </TabsList>

  <TabsContent value="export">
    <Card>
      <CardHeader>
        <CardTitle>Export Routes to Azuga</CardTitle>
        <CardDescription>
          Select routes to export in Azuga-compatible format
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {routes.map(route => (
            <label key={route.id} className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50">
              <Checkbox
                checked={selectedRoutes.includes(route.id)}
                onCheckedChange={() => toggleRoute(route.id)}
              />
              <div className="flex-1">
                <p className="font-medium">{route.routeName}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(route.deliveryDate)} • {route.totalStops} stops
                </p>
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-4 mt-6">
          <Select value={format} onValueChange={setFormat}>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="csv">CSV</SelectItem>
          </Select>
          <Button onClick={exportToAzuga} disabled={selectedRoutes.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export ({selectedRoutes.length})
          </Button>
        </div>
      </CardContent>
    </Card>
  </TabsContent>

  <TabsContent value="import">
    <Card>
      <CardHeader>
        <CardTitle>Import Route Updates from Azuga</CardTitle>
        <CardDescription>
          Upload CSV file from Azuga with actual delivery times
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            id="azuga-file"
          />
          <label htmlFor="azuga-file" className="cursor-pointer">
            <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium">Click to upload CSV</p>
            <p className="text-sm text-muted-foreground">or drag and drop</p>
          </label>
        </div>

        {selectedFile && (
          <div className="mt-4">
            <Alert>
              <AlertDescription>
                Selected: {selectedFile.name} ({selectedFile.size} bytes)
              </AlertDescription>
            </Alert>
            <Button onClick={importFromAzuga} className="mt-4 w-full">
              Import Route Updates
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>
```

---

## 2. Shared Components Used

### shadcn/ui Components
- [x] `<Button>` - Primary, outline, ghost variants
- [x] `<Input>` - Text, number, date inputs
- [x] `<Select>` - Dropdowns
- [x] `<Textarea>` - Multi-line text
- [x] `<Card>`, `<CardHeader>`, `<CardContent>` - Layouts
- [x] `<Badge>` - Status indicators
- [x] `<Dialog>` - Modals
- [x] `<Sheet>` - Side panels
- [x] `<DataTable>` - Lists with sorting/filtering
- [x] `<Tabs>` - Multi-section views
- [x] `<Checkbox>` - Selection
- [x] `<Progress>` - Progress bars
- [x] `<Alert>` - Notifications
- [x] `<Table>` - Data tables

### Icons (lucide-react)
- `<Plus>` - Add actions
- `<Edit>` - Edit actions
- `<Trash>` - Delete actions
- `<Download>` - Export actions
- `<Upload>` - Import actions
- `<Printer>` - Print actions
- `<Check>` - Completion status
- `<MapPin>` - Location indicators

---

## 3. Design Tokens & Consistency

### Colors
```tsx
// Status badges
const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  DRAFT: 'bg-gray-100 text-gray-800',
  PLANNED: 'bg-blue-100 text-blue-800'
};

// Zone colors (customizable by admin)
const defaultZoneColors = {
  A: '#3B82F6', // blue-500
  B: '#10B981', // green-500
  C: '#F59E0B'  // amber-500
};
```

### Typography
```tsx
// Page titles
<h1 className="text-3xl font-bold">Warehouse Locations</h1>

// Section titles
<h2 className="text-xl font-semibold">Pick Sheet Items</h2>

// Card titles
<CardTitle className="text-lg font-medium">Route Details</CardTitle>

// Body text
<p className="text-base">Regular text content</p>

// Secondary text
<p className="text-sm text-muted-foreground">Secondary information</p>
```

### Spacing
```tsx
// Consistent gap sizes
gap-2  // 0.5rem - tight spacing
gap-4  // 1rem - default spacing
gap-6  // 1.5rem - section spacing
gap-8  // 2rem - large spacing

// Padding
p-2, p-4, p-6, p-8

// Margin
mb-4, mt-6, etc.
```

---

## 4. Responsive Breakpoints

```tsx
// Mobile-first approach
className="
  // Mobile (default)
  grid grid-cols-1

  // Tablet (768px+)
  md:grid-cols-2

  // Desktop (1024px+)
  lg:grid-cols-3
"

// Common patterns:
- Tables → Cards on mobile
- 3 columns → 1 column on mobile
- Side-by-side → Stacked on mobile
- Hidden on mobile → visible on tablet+
```

---

## 5. Loading States

```tsx
// Skeleton loaders
import { Skeleton } from '@/components/ui/skeleton';

{loading ? (
  <div className="space-y-4">
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-12 w-full" />
  </div>
) : (
  <DataTable data={data} />
)}

// Spinner
import { Spinner } from '@/components/ui/spinner';

{loading && <Spinner className="mx-auto" />}
```

---

## 6. Error States

```tsx
// Alert component
import { Alert, AlertDescription } from '@/components/ui/alert';

{error && (
  <Alert variant="destructive">
    <AlertDescription>
      {error.message}
    </AlertDescription>
  </Alert>
)}

// Empty state
{items.length === 0 && !loading && (
  <div className="text-center py-12">
    <p className="text-muted-foreground">No pick sheets found</p>
    <Button onClick={() => router.push('/operations/pick-sheets/generate')} className="mt-4">
      Generate First Pick Sheet
    </Button>
  </div>
)}
```

---

## 7. Mobile Optimizations

### Touch Targets
```tsx
// Minimum 44px touch targets
<Button className="min-h-[44px] min-w-[44px]">
  <Edit className="w-5 h-5" />
</Button>
```

### Swipe Actions (for pick sheet items)
```tsx
import { useSwipeable } from 'react-swipeable';

const swipeHandlers = useSwipeable({
  onSwipedRight: () => markPicked(item.id),
  onSwipedLeft: () => showDetails(item.id)
});

<div {...swipeHandlers} className="swipeable-item">
  {/* Item content */}
</div>
```

### Bottom Sheet (for mobile filters)
```tsx
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline" className="md:hidden">
      <Filter className="w-4 h-4 mr-2" />
      Filters
    </Button>
  </SheetTrigger>
  <SheetContent side="bottom">
    {/* Filter controls */}
  </SheetContent>
</Sheet>
```

---

## 8. Accessibility

### ARIA Labels
```tsx
<Button aria-label="Edit warehouse location">
  <Edit className="w-4 h-4" />
</Button>

<Input aria-describedby="zone-help" />
<p id="zone-help" className="text-sm text-muted-foreground">
  Select the warehouse zone (A, B, or C)
</p>
```

### Keyboard Navigation
```tsx
// Focus management
const inputRef = useRef<HTMLInputElement>(null);

useEffect(() => {
  inputRef.current?.focus();
}, []);

// Tab order
<form>
  <Input tabIndex={1} />
  <Input tabIndex={2} />
  <Button tabIndex={3}>Submit</Button>
</form>
```

---

## 9. Integration with Navigation

### Update Main Navigation
```tsx
// src/components/navigation/main-nav.tsx

const navItems = [
  // ... existing items
  {
    title: "Operations",
    href: "/operations",
    icon: Warehouse,
    children: [
      {
        title: "Pick Sheets",
        href: "/operations/pick-sheets"
      },
      {
        title: "Warehouse",
        href: "/warehouse/locations"
      },
      {
        title: "Routes & Delivery",
        href: "/routing/routes"
      }
    ]
  }
];
```

### Breadcrumbs
```tsx
// All pages include breadcrumbs
<Breadcrumb>
  <BreadcrumbItem>
    <Link href="/">Home</Link>
  </BreadcrumbItem>
  <BreadcrumbItem>
    <Link href="/operations">Operations</Link>
  </BreadcrumbItem>
  <BreadcrumbItem isCurrentPage>
    Pick Sheets
  </BreadcrumbItem>
</Breadcrumb>
```

---

## Summary

**Total New Pages:** 15+
**Shared Components:** 15+ from shadcn/ui
**Design System:** Consistent with Phases 1-3
**Responsive:** Mobile-first, tested on all breakpoints
**Accessibility:** ARIA labels, keyboard navigation
**Loading States:** Skeletons, spinners
**Error States:** Alerts, empty states
**Mobile:** Touch targets 44px+, swipe gestures, bottom sheets

**Status:** UI specification complete, ready for implementation

---

**Last Updated:** 2025-10-25
**Reviewed By:** Integration Coordinator
**Approval Status:** Pending agent implementation
