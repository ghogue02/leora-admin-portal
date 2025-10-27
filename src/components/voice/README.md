# Voice Components

Voice-to-text components for activity logging in the Leora CRM.

## Components

### VoiceRecorder

Core voice recording component with Web Speech API integration.

```tsx
import { VoiceRecorder } from '@/components/voice';

<VoiceRecorder
  onTranscript={(text) => console.log(text)}
  continuous={true}
  language="en-US"
/>
```

### VoiceActivityForm

Complete activity logging form with voice input.

```tsx
import { VoiceActivityForm } from '@/components/voice';

<VoiceActivityForm
  customerId="cust-123"
  onSubmit={async (data) => {
    // Handle activity submission
    await fetch('/api/activities', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }}
  preselectedType="call"
/>
```

### VoiceButton

Reusable voice button for adding to existing forms.

```tsx
import { VoiceButton } from '@/components/voice';

// Icon variant (small button)
<VoiceButton
  onTranscript={(text) => setFieldValue(text)}
  size="sm"
  variant="icon"
/>

// Button variant (with label)
<VoiceButton
  onTranscript={(text) => handleTranscript(text)}
  size="md"
  variant="button"
  label="Add voice note"
/>
```

### QuickActivityLogger

Customer-specific activity logger (use in customer detail pages).

```tsx
import { QuickActivityLogger } from '@/app/sales/customers/[customerId]/components/QuickActivityLogger';

<QuickActivityLogger
  customerId={customer.id}
  customerName={customer.name}
  onActivityLogged={() => refreshActivities()}
/>
```

## Browser Compatibility

- ✅ **Chrome 25+** - Full support
- ✅ **Edge 79+** - Full support
- ✅ **Safari 14.1+** - Full support
- ❌ **Firefox** - Not supported (fallback to keyboard)
- ❌ **Opera** - Not supported (fallback to keyboard)

## Features

- 🎤 Web Speech API integration
- 📊 Live audio waveform visualization
- 💬 Real-time transcription
- 🎯 Activity type selection (Call, Email, Meeting, Note, Task)
- 🔊 Voice input toggle
- 👤 Customer context auto-fill
- 🌐 Browser compatibility detection
- ⚠️ Error handling and recovery
- ♾️ Continuous recording mode
- 📈 Audio level visualization

## Security

- Microphone permissions requested only when user initiates recording
- Browser-based transcription (no external servers)
- HTTPS required in production
- Activity data sent to backend API only on form submission

## Usage in Existing Forms

Add voice input to any text field:

```tsx
import { VoiceButton } from '@/components/voice';

<div className="relative">
  <textarea
    value={notes}
    onChange={(e) => setNotes(e.target.value)}
    className="w-full p-3 border rounded"
  />
  <div className="absolute top-2 right-2">
    <VoiceButton
      onTranscript={(text) => setNotes(prev => `${prev} ${text}`.trim())}
      size="sm"
      variant="icon"
    />
  </div>
</div>
```

## API Integration

Activity API endpoint: `POST /api/activities`

Request body:
```typescript
{
  customerId: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'task';
  subject?: string;
  notes: string;
  duration?: number; // minutes
  outcome?: string;
  timestamp: string; // ISO 8601
}
```

## Documentation

See `/docs/voice-to-text-implementation.md` for complete documentation.
