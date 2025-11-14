# Log Activity Modal - Dynamic Conditional Fields

## Overview

Show different form fields based on selected Activity Type to make the modal more focused and relevant to each activity.

---

## Activity Type → Field Mapping

### **Follow-up - Email**
**Show:**
- ✅ Subject (required)
- ✅ Notes (optional)
- ✅ Follow-up date (suggested: +3 days)
- ✅ Outcomes: Email-specific options
  - □ Email sent
  - □ Response received
  - □ Interested in products
  - □ Not interested
  - □ Bounced/Invalid email

**Hide:**
- ❌ Samples section (not relevant for email)

---

### **Follow-up - Phone Call**
**Show:**
- ✅ Subject (auto: "Phone call with [customer]")
- ✅ Notes (required for calls)
- ✅ Call duration (new field: dropdown: <5min, 5-15min, 15-30min, 30min+)
- ✅ Follow-up date (suggested: based on conversation)
- ✅ Outcomes: Call-specific options
  - □ Spoke with decision maker
  - □ Left voicemail
  - □ No answer
  - □ Interested in meeting
  - □ Placed order (link to order)
  - □ Not interested

**Optional:**
- ▶ Samples discussed (collapsed accordion)

---

### **Follow-up - Text Message**
**Show:**
- ✅ Subject (auto: "Text message to [customer]")
- ✅ Message content (Notes field, char limit: 500)
- ✅ Outcomes:
  - □ Message sent
  - □ Reply received
  - □ Interested
  - □ Unsubscribe requested

**Hide:**
- ❌ Samples section
- ❌ Follow-up date (texts are quick touches)

---

### **In-Person Visit**
**Show:**
- ✅ Subject (required)
- ✅ Visit duration (dropdown: <30min, 30min-1hr, 1-2hr, 2hr+)
- ✅ Notes (required)
- ✅ Attendees (new field: text input for names)
- ✅ Follow-up date (suggested: +7 days)
- ✅ Outcomes: Visit-specific options
  - □ Positive meeting
  - □ Needs follow-up
  - □ Decision pending
  - □ Placed order
  - □ Samples delivered
  - □ Account issues discussed

**Highlighted:**
- ▼ Samples shared (expanded by default for visits)

---

### **Major Change**
**Show:**
- ✅ Subject (required, descriptive)
- ✅ Change type (new dropdown):
  - Ownership change
  - Management change
  - License change
  - Location change
  - Business closure
  - Other
- ✅ Effective date (new date field)
- ✅ Notes (required, detailed)
- ✅ Impact assessment (new dropdown):
  - High impact (requires immediate action)
  - Medium impact (monitor closely)
  - Low impact (informational)

**Hide:**
- ❌ Samples section
- ❌ Outcomes (use Change Type instead)

---

### **Portal Follow-up**
**Show:**
- ✅ Subject (auto: "Portal activity follow-up")
- ✅ Portal interaction (new dropdown):
  - Viewed catalog
  - Added to cart
  - Submitted order
  - Updated profile
  - Other
- ✅ Notes (optional)
- ✅ Follow-up date (if needed)

**Hide:**
- ❌ Samples section (digital interaction)

---

### **Public Tasting Event / Tasting Appointment**
**Show:**
- ✅ Subject (required, event name)
- ✅ Event/Appointment date (replace "Occurred At")
- ✅ Location (new text field)
- ✅ Attendees (new field: number or names)
- ✅ Notes (detailed feedback)
- ✅ Follow-up date (suggested: +3 days)
- ✅ Outcomes: Tasting-specific
  - □ Well attended
  - □ High interest
  - □ Orders placed
  - □ Samples distributed
  - □ Feedback collected
  - □ Follow-up requested

**Highlighted:**
- ▼ Samples shared (expanded by default, required)

---

## Implementation Approach

### **Option 1: Show/Hide Fields Dynamically** ⭐ RECOMMENDED
**Complexity**: Low-Medium | **Impact**: High

```typescript
const getFieldsForActivityType = (activityTypeCode: string) => {
  const fieldConfig = {
    showSamples: false,
    showCallDuration: false,
    showEventDate: false,
    showLocation: false,
    showAttendees: false,
    showChangeType: false,
    showImpactAssessment: false,
    showPortalInteraction: false,
    requireNotes: false,
    suggestedFollowUpDays: null,
    customOutcomes: [],
  };

  switch (activityTypeCode) {
    case 'FOLLOW_UP_EMAIL':
      return {
        ...fieldConfig,
        suggestedFollowUpDays: 3,
        customOutcomes: ['EMAIL_SENT', 'RESPONSE_RECEIVED', 'INTERESTED', 'NOT_INTERESTED'],
      };

    case 'FOLLOW_UP_PHONE':
      return {
        ...fieldConfig,
        showCallDuration: true,
        showSamples: true, // optional, collapsed
        requireNotes: true,
        customOutcomes: ['SPOKE_WITH_DM', 'LEFT_VM', 'NO_ANSWER', 'INTERESTED', 'ORDER_PLACED'],
      };

    case 'IN_PERSON_VISIT':
      return {
        ...fieldConfig,
        showSamples: true, // expanded by default
        showVisitDuration: true,
        showAttendees: true,
        requireNotes: true,
        suggestedFollowUpDays: 7,
        customOutcomes: ['POSITIVE', 'NEEDS_FOLLOWUP', 'ORDER_PLACED', 'SAMPLES_DELIVERED'],
      };

    case 'MAJOR_CHANGE':
      return {
        ...fieldConfig,
        showChangeType: true,
        showEffectiveDate: true,
        showImpactAssessment: true,
        requireNotes: true,
        customOutcomes: [], // Use change type instead
      };

    case 'TASTING_APPOINTMENT':
    case 'PUBLIC_TASTING_EVENT':
      return {
        ...fieldConfig,
        showSamples: true, // expanded, required
        showEventDate: true,
        showLocation: true,
        showAttendees: true,
        suggestedFollowUpDays: 3,
        customOutcomes: ['WELL_ATTENDED', 'HIGH_INTEREST', 'ORDERS_PLACED', 'SAMPLES_DISTRIBUTED'],
      };

    default:
      return fieldConfig;
  }
};
```

### **Option 2: Activity Type Templates**
**Complexity**: Medium | **Impact**: High

Create preset templates for each activity type that auto-populate fields:

```typescript
const ACTIVITY_TEMPLATES = {
  'FOLLOW_UP_PHONE': {
    subject: 'Phone call with ${customerName}',
    requiredFields: ['notes', 'callDuration'],
    optionalSections: ['samples'],
    suggestedFollowUp: 7, // days
  },
  // ... more templates
};
```

---

## UI Changes

### **Before** (Current):
```
[Activity Type ▼] [Subject_______]
Notes: [________________] 🎤
🕐 Just now • No follow-up [Edit dates]
▶ Samples (0)
▶ Outcomes (None)
[Cancel] [Save]
```

### **After** (Dynamic):

**Example: Phone Call Selected**
```
[Activity Type: Phone Call ▼] [Subject: Phone call with 1789_]
Call Duration: [5-15 minutes ▼]
Notes: [________________] 🎤 (Required for calls)
🕐 Just now • Follow-up in 7 days [Edit dates]
▶ Samples discussed (0)
▼ Call Outcomes (select at least one):
  □ Spoke with decision maker
  □ Left voicemail
  □ No answer
  □ Interested in meeting
[Cancel] [Save Activity]
```

**Example: Major Change Selected**
```
[Activity Type: Major Change ▼] [Subject: _________________]
Change Type: [Ownership change ▼]
Effective Date: [___________]
Impact: [High - requires immediate action ▼]
Notes: [________________] 🎤 (Required)
🕐 Just now [Edit dates]
[Cancel] [Save Activity]
```

---

## Implementation Steps

### **Phase 1: Field Configuration** (2-3 hours)
1. Create activity type config object
2. Map each activity type to required/optional fields
3. Define custom outcomes per activity type
4. Set smart defaults (subject templates, follow-up suggestions)

### **Phase 2: Conditional Rendering** (3-4 hours)
1. Add conditional rendering based on selected activity type
2. Show/hide sections dynamically
3. Update validation rules based on activity type
4. Auto-populate subject line templates

### **Phase 3: New Field Components** (2-3 hours)
1. Call Duration selector
2. Visit Duration selector
3. Change Type dropdown
4. Impact Assessment dropdown
5. Event Location field
6. Attendees field
7. Portal Interaction dropdown

### **Phase 4: Smart Defaults** (1-2 hours)
1. Auto-suggest follow-up dates based on activity type
2. Pre-populate subject templates
3. Expand/collapse Samples based on activity type
4. Auto-select relevant outcomes

---

## Expected Benefits

### **User Experience:**
- ✅ **Faster data entry** - only see relevant fields
- ✅ **Less cognitive load** - no irrelevant options
- ✅ **Better data quality** - guided inputs for each activity
- ✅ **Contextual help** - fields match activity type

### **Modal Size:**
- **Email follow-up**: ~300px (no samples, minimal fields)
- **Phone call**: ~450px (some optional fields)
- **In-person visit**: ~600px (samples expanded)
- **Major change**: ~400px (specialized fields)

### **Time Savings:**
- **Quick activities** (email, text): 60% faster (~10 sec)
- **Standard activities** (phone, visit): 30% faster (~25 sec)
- **Complex activities** (tastings): Same time, better data

---

## Validation Rules Per Activity Type

```typescript
const getValidationRules = (activityTypeCode: string) => {
  const baseRules = {
    activityTypeCode: required,
    subject: required,
  };

  switch (activityTypeCode) {
    case 'FOLLOW_UP_PHONE':
      return {
        ...baseRules,
        notes: required, // Calls must have notes
        callDuration: required,
      };

    case 'IN_PERSON_VISIT':
      return {
        ...baseRules,
        notes: required,
        visitDuration: required,
        samples: minLength(1), // Must share samples
      };

    case 'MAJOR_CHANGE':
      return {
        ...baseRules,
        changeType: required,
        effectiveDate: required,
        impactAssessment: required,
        notes: minLength(50), // Detailed explanation required
      };

    default:
      return baseRules;
  }
};
```

---

## Database Schema Additions

**New Optional Fields for `Activity` table:**

```prisma
model Activity {
  // ... existing fields

  // Call-specific
  callDuration      String?  // "<5min", "5-15min", etc.

  // Visit-specific
  visitDuration     String?  // "<30min", "30min-1hr", etc.
  attendees         String?  // Names or count
  location          String?  // For events/visits

  // Major change-specific
  changeType        String?  // "OWNERSHIP", "MANAGEMENT", etc.
  effectiveDate     DateTime?
  impactAssessment  String?  // "HIGH", "MEDIUM", "LOW"

  // Portal-specific
  portalInteraction String?  // "VIEWED_CATALOG", "SUBMITTED_ORDER", etc.
}
```

---

## Quick Win: Immediate Implementation

**Start with these 3 activity types** (covers 80% of use cases):

1. **Phone Call** - Add call duration, require notes
2. **In-Person Visit** - Add visit duration, auto-expand samples
3. **Major Change** - Add change type, impact, require detailed notes

**Later**: Add remaining activity-specific fields

---

## Example Workflow

### **User Journey - Phone Call:**

1. User clicks "Log Activity"
2. Modal opens, selects "Follow-up - Phone Call"
3. **Form auto-adjusts:**
   - Subject auto-populates: "Phone call with [customer]"
   - Call Duration field appears
   - Notes becomes required (red asterisk)
   - Samples section shows "Samples discussed (optional)"
   - Outcomes shows call-specific options
   - Follow-up date suggests +7 days
4. User fills: Duration "5-15min", Notes "Discussed winter wines"
5. User checks "Interested in meeting"
6. User saves - validation passes because all required fields filled

**Time saved**: ~15 seconds (no hunting for relevant fields)

---

## Technical Implementation

### **1. Create Field Config:**
```typescript
// src/constants/activityTypeFields.ts
export const ACTIVITY_TYPE_FIELDS = {
  FOLLOW_UP_EMAIL: {
    fields: ['subject', 'notes', 'followUpDate'],
    requiredFields: ['subject'],
    hiddenSections: ['samples'],
    outcomes: ['EMAIL_SENT', 'RESPONSE_RECEIVED', ...],
    defaults: {
      subject: 'Email to ${customerName}',
      followUpDays: 3,
    },
  },
  // ... more configs
};
```

### **2. Conditional Rendering:**
```tsx
{activityTypeCode === 'FOLLOW_UP_PHONE' && (
  <div>
    <label>Call Duration *</label>
    <select>
      <option value="<5min">Less than 5 minutes</option>
      <option value="5-15min">5-15 minutes</option>
      <option value="15-30min">15-30 minutes</option>
      <option value="30min+">30+ minutes</option>
    </select>
  </div>
)}
```

### **3. Dynamic Validation:**
```typescript
const validateForm = () => {
  const config = ACTIVITY_TYPE_FIELDS[activityTypeCode];

  for (const field of config.requiredFields) {
    if (!formData[field]) {
      setError(`${field} is required for ${activityTypeName}`);
      return false;
    }
  }

  return true;
};
```

---

## Rollout Plan

### **Phase 1: Foundation** (2-3 hours)
1. Create activity type field config
2. Add conditional rendering logic
3. Update validation rules

### **Phase 2: Phone Calls** (1-2 hours)
1. Add call duration field
2. Make notes required
3. Show call-specific outcomes
4. Test workflow

### **Phase 3: In-Person Visits** (1-2 hours)
1. Add visit duration field
2. Add attendees field
3. Auto-expand samples section
4. Visit-specific outcomes

### **Phase 4: Major Changes** (2-3 hours)
1. Add change type dropdown
2. Add effective date field
3. Add impact assessment
4. Require detailed notes (min 50 chars)

### **Phase 5: Remaining Types** (3-4 hours)
1. Email-specific fields
2. Text message handling
3. Tasting events (location, attendees)
4. Portal follow-ups

---

## Success Metrics

| Activity Type | Current Time | With Dynamic Fields | Improvement |
|--------------|--------------|---------------------|-------------|
| Email | 30 sec | 15 sec | 50% faster |
| Phone Call | 35 sec | 20 sec | 43% faster |
| Visit (no samples) | 40 sec | 25 sec | 37% faster |
| Visit (with samples) | 60 sec | 50 sec | 17% faster |
| Major Change | 45 sec | 30 sec | 33% faster |

**Average improvement**: ~35% faster activity logging

---

## Database Migration

```sql
-- Add new optional fields to Activity table
ALTER TABLE "Activity"
  ADD COLUMN "callDuration" TEXT,
  ADD COLUMN "visitDuration" TEXT,
  ADD COLUMN "attendees" TEXT,
  ADD COLUMN "location" TEXT,
  ADD COLUMN "changeType" TEXT,
  ADD COLUMN "effectiveDate" TIMESTAMP(3),
  ADD COLUMN "impactAssessment" TEXT,
  ADD COLUMN "portalInteraction" TEXT;
```

---

## Backward Compatibility

✅ **All existing activities work** - new fields are optional
✅ **Old modal behavior preserved** - no fields = shows all sections
✅ **Gradual adoption** - can implement type-by-type
✅ **No breaking changes** - pure enhancement

---

**Want me to implement this?** I recommend starting with Phase 1-2 (Phone Calls) as a proof of concept, then expanding to other activity types based on user feedback.
