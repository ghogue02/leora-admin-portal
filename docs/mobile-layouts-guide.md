# Mobile-Optimized Layouts Guide

## Overview

This guide covers the mobile-optimized layouts created for CARLA (Call Plan & Revenue Lifecycle Automation) and calendar functionality. The mobile layouts are designed for phones and tablets with touch-friendly interfaces and responsive patterns.

## Architecture

### Directory Structure

```
/src/components/mobile/
├── MobileNav.tsx          # Bottom navigation bar
├── MobileHeader.tsx       # Top header with back button
├── SwipeableCard.tsx      # Swipeable cards with actions
├── TouchOptimized.tsx     # Touch-friendly UI components
└── MobileRouter.tsx       # Mobile routing utilities

/src/app/sales/mobile/
├── call-plan/page.tsx     # Mobile call planning interface
├── calendar/page.tsx      # Mobile calendar view
└── customers/page.tsx     # Mobile customer management

/src/lib/utils/
└── mobile-detection.ts    # Device detection utilities
```

## Mobile Components

### 1. MobileNav (Bottom Navigation)

Bottom navigation bar with 5 primary sections:

**Features:**
- Fixed bottom position with safe area support
- Large touch targets (44px minimum)
- Active state indicators
- Icon + label combination

**Usage:**
```tsx
import { MobileNav } from '@/components/mobile/MobileNav';

<MobileNav />
```

**Navigation Items:**
- Home (Dashboard)
- Calls (Call Plan)
- Calendar (Schedule)
- Customers (CRM)
- More (Settings)

### 2. MobileHeader (Top Bar)

Top header bar with back button and actions:

**Features:**
- Sticky positioning
- Safe area insets for notched displays
- Back button navigation
- Custom action buttons
- Centered title

**Usage:**
```tsx
import { MobileHeader, MobileHeaderAction } from '@/components/mobile/MobileHeader';

<MobileHeader
  title="Page Title"
  showBack={true}
  actions={
    <MobileHeaderAction
      icon={<FilterIcon />}
      onClick={() => handleAction()}
    />
  }
/>
```

### 3. SwipeableCard (Gesture Support)

Cards with swipe gestures for quick actions:

**Features:**
- Left/right swipe actions
- Customizable action buttons
- Smooth animations
- Snap-to-position behavior
- 80px maximum swipe distance

**Usage:**
```tsx
import { SwipeableCard, swipeActions } from '@/components/mobile/SwipeableCard';

<SwipeableCard
  leftActions={[swipeActions.complete(() => handleComplete())]}
  rightActions={[
    swipeActions.call(() => handleCall()),
    swipeActions.delete(() => handleDelete())
  ]}
>
  <div>Card content</div>
</SwipeableCard>
```

**Predefined Actions:**
- `swipeActions.delete(callback)` - Red delete action
- `swipeActions.call(callback)` - Green call action
- `swipeActions.edit(callback)` - Blue edit action
- `swipeActions.complete(callback)` - Green complete action

### 4. TouchOptimized Components

Touch-friendly UI components with large tap targets:

**Components:**

#### TouchOptimizedButton
```tsx
<TouchOptimizedButton
  variant="primary"  // primary | secondary | outline | ghost
  size="medium"      // small | medium | large
  fullWidth={true}
>
  Button Text
</TouchOptimizedButton>
```

**Sizes:**
- Small: 44px height
- Medium: 48px height
- Large: 56px height

#### TouchOptimizedInput
```tsx
<TouchOptimizedInput
  label="Field Label"
  error="Error message"
  helperText="Helper text"
  placeholder="Enter value"
/>
```

**Features:**
- 48px minimum height
- Large text (16px base)
- Focus ring indicators
- Error states

#### TouchOptimizedSelect
```tsx
<TouchOptimizedSelect
  label="Select Option"
  options={[
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' }
  ]}
/>
```

#### BottomSheet (Modal)
```tsx
<BottomSheet
  isOpen={showSheet}
  onClose={() => setShowSheet(false)}
  title="Sheet Title"
  maxHeight="90vh"
>
  <div>Sheet content</div>
</BottomSheet>
```

**Features:**
- Slides up from bottom
- Backdrop overlay
- Drag handle indicator
- Scrollable content area
- Safe area padding

#### TouchOptimizedCard
```tsx
<TouchOptimizedCard onClick={() => handleClick()}>
  <div>Card content</div>
</TouchOptimizedCard>
```

## Mobile Pages

### 1. Call Plan Page (`/sales/mobile/call-plan`)

**Features:**
- Daily call task list
- Swipe to complete/call/delete
- Stats summary (scheduled, completed, success rate)
- Priority indicators (high/medium/low)
- Quick call buttons
- Floating action button (add call)
- Filter bottom sheet

**Key Interactions:**
- Swipe left: Mark complete
- Swipe right: Call or delete
- Tap card: View details
- Tap "Call Now": Initiate phone call

### 2. Calendar Page (`/sales/mobile/calendar`)

**Features:**
- Day/week view toggle
- Date navigation (previous/next)
- Event timeline
- Color-coded events by type
- Event details bottom sheet
- Virtual meeting indicators
- Attendee lists

**Event Types:**
- Call (blue)
- Meeting (green)
- Demo (purple)
- Follow-up (orange)

**Key Interactions:**
- Swipe date: Navigate days
- Tap event: View details
- Tap "Join Meeting": Launch meeting

### 3. Customers Page (`/sales/mobile/customers`)

**Features:**
- Search functionality
- Customer cards with contact info
- Revenue metrics
- Status badges (active/prospect/inactive)
- Swipe to favorite/call/email
- Stats summary
- Filter bottom sheet

**Key Interactions:**
- Swipe left: Mark favorite
- Swipe right: Call or email
- Tap phone: Initiate call
- Tap email: Open email client
- Search: Filter customers

## Mobile Detection & Routing

### Device Detection

```typescript
import {
  isMobileDevice,
  isIOS,
  isAndroid,
  isTablet,
  getDeviceType,
  shouldUseMobileLayout
} from '@/lib/utils/mobile-detection';

// Check if mobile
if (isMobileDevice()) {
  // Show mobile UI
}

// Get device type
const deviceType = getDeviceType(); // 'mobile' | 'tablet' | 'desktop'

// Check if should use mobile layout
if (shouldUseMobileLayout()) {
  // Use mobile components
}
```

### Breakpoints

| Breakpoint | Width | Device Type |
|------------|-------|-------------|
| xs | < 640px | Small phones |
| sm | 640px - 768px | Large phones |
| md | 768px - 1024px | Tablets |
| lg | 1024px - 1280px | Desktop |
| xl | 1280px - 1536px | Large desktop |
| 2xl | > 1536px | XL desktop |

### Auto-Redirect

```tsx
import { MobileRouter } from '@/components/mobile/MobileRouter';

<MobileRouter enableAutoRedirect={true}>
  <YourApp />
</MobileRouter>
```

Automatically redirects:
- Mobile devices → `/sales/mobile/*` routes
- Desktop → `/sales/*` routes

### Manual Routing

```typescript
import { getMobileRoutePath, getDesktopRoutePath } from '@/lib/utils/mobile-detection';

// Convert to mobile path
const mobilePath = getMobileRoutePath('/sales/call-plan');
// Returns: '/sales/mobile/call-plan'

// Convert to desktop path
const desktopPath = getDesktopRoutePath('/sales/mobile/calendar');
// Returns: '/sales/calendar'
```

## Responsive Patterns

### 1. Bottom Sheet Modals

Use bottom sheets instead of centered modals on mobile:

```tsx
// ❌ Don't use centered modals
<CenteredModal />

// ✅ Use bottom sheets
<BottomSheet
  isOpen={isOpen}
  onClose={onClose}
  title="Title"
>
  Content
</BottomSheet>
```

### 2. Swipe Gestures

Enable swipe actions for common operations:

```tsx
<SwipeableCard
  leftActions={[/* actions */]}
  rightActions={[/* actions */]}
>
  Content
</SwipeableCard>
```

### 3. Large Touch Targets

Ensure all interactive elements are at least 44px:

```tsx
// ❌ Too small
<button className="h-8 px-2">Click</button>

// ✅ Large enough
<TouchOptimizedButton size="small">
  Click
</TouchOptimizedButton>
```

### 4. Simplified Forms

Use large inputs and selects:

```tsx
<TouchOptimizedInput
  label="Name"
  placeholder="Enter name"
/>

<TouchOptimizedSelect
  label="Status"
  options={statusOptions}
/>
```

### 5. Safe Area Support

Handle notched displays:

```tsx
<div
  className="fixed bottom-0"
  style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
>
  Content
</div>
```

### 6. Touch-Friendly Buttons

Use appropriate button sizes:

```tsx
<TouchOptimizedButton
  variant="primary"
  size="medium"  // 48px height
  fullWidth
>
  Submit
</TouchOptimizedButton>
```

## Testing Breakpoints

### Common Device Widths

| Device | Width | Breakpoint |
|--------|-------|------------|
| iPhone SE | 375px | xs |
| iPhone 12/13/14 | 390px | xs |
| iPhone 14 Pro Max | 430px | xs |
| Android (small) | 360px | xs |
| Android (medium) | 400px | sm |
| iPad Mini | 768px | md |
| iPad Pro | 1024px | md |

### Testing Checklist

- [ ] Test on iPhone (390px width)
- [ ] Test on iPad (768px width)
- [ ] Test on Android phone (360px-400px)
- [ ] Test landscape orientation
- [ ] Test safe area insets (notched displays)
- [ ] Test touch interactions (no hover states)
- [ ] Test swipe gestures
- [ ] Test bottom sheet modals
- [ ] Verify minimum 44px touch targets
- [ ] Test keyboard interactions
- [ ] Verify text readability (16px minimum)

## Accessibility

### Touch Targets

- Minimum 44px × 44px (iOS Human Interface Guidelines)
- Recommended 48px × 48px (Material Design)
- Large buttons: 56px × 56px

### Text Sizes

- Body text: 16px minimum (prevents zoom on focus)
- Small text: 14px minimum
- Touch target labels: 14px-16px

### Contrast

- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- Interactive elements: 3:1 minimum

### Focus States

All interactive elements have visible focus rings:

```tsx
className="focus:outline-none focus:ring-2 focus:ring-blue-600"
```

## Performance

### Optimizations

1. **Lazy Loading**: Load mobile components on demand
2. **Code Splitting**: Separate mobile/desktop bundles
3. **Touch Events**: Use passive event listeners
4. **Animations**: Use CSS transforms (GPU-accelerated)
5. **Reduced Motion**: Respect `prefers-reduced-motion`

### Best Practices

```typescript
// Check reduced motion preference
if (prefersReducedMotion()) {
  // Disable animations
}

// Use passive listeners
element.addEventListener('touchstart', handler, { passive: true });

// GPU-accelerated transforms
className="transition-transform duration-300"
style={{ transform: `translateX(${offset}px)` }}
```

## Integration Guide

### 1. Add Mobile Routes

Create mobile-specific pages in `/app/sales/mobile/`:

```tsx
// /app/sales/mobile/your-page/page.tsx
export default function MobileYourPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader title="Your Page" />
      {/* Content */}
      <MobileNav />
    </div>
  );
}
```

### 2. Import Components

```tsx
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { MobileNav } from '@/components/mobile/MobileNav';
import { SwipeableCard } from '@/components/mobile/SwipeableCard';
import { TouchOptimizedButton } from '@/components/mobile/TouchOptimized';
```

### 3. Add Routing

```tsx
import { MobileRouter } from '@/components/mobile/MobileRouter';

// In your layout
<MobileRouter enableAutoRedirect={true}>
  <YourApp />
</MobileRouter>
```

### 4. Handle Device Detection

```tsx
import { isMobileDevice } from '@/lib/utils/mobile-detection';

if (isMobileDevice()) {
  // Mobile-specific behavior
}
```

## Common Patterns

### List with Swipe Actions

```tsx
{items.map(item => (
  <SwipeableCard
    key={item.id}
    rightActions={[
      swipeActions.call(() => handleCall(item)),
      swipeActions.delete(() => handleDelete(item.id))
    ]}
  >
    <TouchOptimizedCard>
      {/* Item content */}
    </TouchOptimizedCard>
  </SwipeableCard>
))}
```

### Form with Bottom Sheet

```tsx
const [showForm, setShowForm] = useState(false);

<BottomSheet
  isOpen={showForm}
  onClose={() => setShowForm(false)}
  title="Add Item"
>
  <form className="space-y-4">
    <TouchOptimizedInput label="Name" />
    <TouchOptimizedSelect
      label="Category"
      options={categories}
    />
    <TouchOptimizedButton
      variant="primary"
      size="medium"
      fullWidth
      type="submit"
    >
      Submit
    </TouchOptimizedButton>
  </form>
</BottomSheet>
```

### Navigation with Stats

```tsx
<div className="bg-white border-b border-gray-200 p-4">
  <div className="grid grid-cols-3 gap-4">
    <div className="text-center">
      <div className="text-2xl font-bold text-blue-600">24</div>
      <div className="text-xs text-gray-600">Total</div>
    </div>
    {/* More stats */}
  </div>
</div>
```

## Hooks Integration

All mobile operations use hooks for coordination:

```bash
# Pre-operation
npx claude-flow@alpha hooks pre-task --description "Mobile layout task"

# Post-operation
npx claude-flow@alpha hooks post-edit --file "MobileNav.tsx"
npx claude-flow@alpha hooks notify --message "Created mobile components"

# Session end
npx claude-flow@alpha hooks post-task --task-id "mobile-layouts"
```

## Memory Storage

Components and patterns stored in memory:

```bash
# Store mobile layout info
npx claude-flow@alpha agent memory store \
  --key "phase2/mobile-layouts" \
  --value '{
    "components": ["MobileNav", "MobileHeader", "SwipeableCard", "TouchOptimized"],
    "pages": ["call-plan", "calendar", "customers"],
    "patterns": ["bottom-sheet", "swipe-actions", "touch-targets"],
    "breakpoints": {"xs": 640, "sm": 768, "md": 1024}
  }'
```

## Troubleshooting

### Common Issues

1. **Touch targets too small**: Use TouchOptimized components
2. **Modal not showing from bottom**: Use BottomSheet instead of centered modal
3. **Swipe not working**: Ensure proper touch event handling
4. **Safe area not respected**: Add padding with `env(safe-area-inset-*)`
5. **Text zooms on input focus**: Use 16px minimum font size

### Debug Utilities

```typescript
import {
  getDeviceType,
  getBreakpoint,
  getSafeAreaInsets,
  supportsTouchEvents
} from '@/lib/utils/mobile-detection';

console.log({
  deviceType: getDeviceType(),
  breakpoint: getBreakpoint(),
  safeAreaInsets: getSafeAreaInsets(),
  hasTouchSupport: supportsTouchEvents()
});
```

## Next Steps

1. Add pull-to-refresh functionality
2. Implement offline support
3. Add haptic feedback
4. Create mobile-specific animations
5. Add gesture-based navigation
6. Implement native app shell (PWA)
7. Add mobile-specific analytics

## Resources

- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design for Mobile](https://material.io/design)
- [Touch Target Sizes](https://www.smashingmagazine.com/2012/02/finger-friendly-design-ideal-mobile-touchscreen-target-sizes/)
- [Safe Area Insets](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
- [Progressive Web Apps](https://web.dev/progressive-web-apps/)
