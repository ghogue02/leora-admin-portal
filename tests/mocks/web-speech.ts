/**
 * Mock: Web Speech API
 * Provides mock implementation for testing voice recording
 */

export class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = 'en-US';
  maxAlternatives = 1;

  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;
  onstart: (() => void) | null = null;
  onspeechstart: (() => void) | null = null;
  onspeechend: (() => void) | null = null;

  private isRunning = false;

  start() {
    if (this.isRunning) {
      throw new Error('Recognition already started');
    }

    this.isRunning = true;

    setTimeout(() => {
      if (this.onstart) {
        this.onstart();
      }
    }, 10);
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    setTimeout(() => {
      if (this.onend) {
        this.onend();
      }
    }, 10);
  }

  abort() {
    this.isRunning = false;
  }

  // Test helper methods
  simulateResult(transcript: string, isFinal = true, confidence = 0.95) {
    if (!this.onresult) return;

    const event = {
      results: [
        [
          {
            transcript,
            confidence,
            isFinal,
          },
        ],
      ],
      resultIndex: 0,
    };

    this.onresult(event);
  }

  simulateError(error: string, message?: string) {
    if (!this.onerror) return;

    this.onerror({
      error,
      message: message || error,
    });
  }

  simulateSpeechStart() {
    if (this.onspeechstart) {
      this.onspeechstart();
    }
  }

  simulateSpeechEnd() {
    if (this.onspeechend) {
      this.onspeechend();
    }
  }
}

export class MockMediaRecorder {
  state: 'inactive' | 'recording' | 'paused' = 'inactive';
  mimeType: string;

  ondataavailable: ((event: any) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onstart: (() => void) | null = null;
  onpause: (() => void) | null = null;
  onresume: (() => void) | null = null;

  private chunks: Blob[] = [];

  constructor(stream: MediaStream, options?: { mimeType?: string }) {
    this.mimeType = options?.mimeType || 'audio/webm';
  }

  start(timeslice?: number) {
    if (this.state !== 'inactive') {
      throw new Error('Invalid state');
    }

    this.state = 'recording';
    this.chunks = [];

    setTimeout(() => {
      if (this.onstart) {
        this.onstart();
      }
    }, 10);
  }

  stop() {
    if (this.state === 'inactive') {
      throw new Error('Invalid state');
    }

    this.state = 'inactive';

    setTimeout(() => {
      if (this.ondataavailable) {
        const blob = new Blob(this.chunks, { type: this.mimeType });
        this.ondataavailable({ data: blob });
      }

      if (this.onstop) {
        this.onstop();
      }
    }, 10);
  }

  pause() {
    if (this.state !== 'recording') {
      throw new Error('Invalid state');
    }

    this.state = 'paused';

    if (this.onpause) {
      this.onpause();
    }
  }

  resume() {
    if (this.state !== 'paused') {
      throw new Error('Invalid state');
    }

    this.state = 'recording';

    if (this.onresume) {
      this.onresume();
    }
  }

  requestData() {
    if (this.state === 'inactive') {
      throw new Error('Invalid state');
    }

    if (this.ondataavailable) {
      const blob = new Blob(this.chunks, { type: this.mimeType });
      this.ondataavailable({ data: blob });
    }
  }

  // Test helper methods
  simulateAudioChunk(data: ArrayBuffer) {
    this.chunks.push(new Blob([data], { type: this.mimeType }));
  }

  simulateError(message: string) {
    if (this.onerror) {
      this.onerror(new Error(message));
    }
  }

  static isTypeSupported(type: string): boolean {
    return ['audio/webm', 'audio/ogg', 'audio/wav'].includes(type);
  }
}

export function setupWebSpeechMocks() {
  (global as any).SpeechRecognition = MockSpeechRecognition;
  (global as any).webkitSpeechRecognition = MockSpeechRecognition;
  (global as any).MediaRecorder = MockMediaRecorder;

  // Mock getUserMedia
  if (!global.navigator.mediaDevices) {
    (global.navigator as any).mediaDevices = {};
  }

  (global.navigator.mediaDevices as any).getUserMedia = async () => ({
    getTracks: () => [
      {
        stop: () => {},
        kind: 'audio',
        enabled: true,
      },
    ],
    getAudioTracks: () => [
      {
        stop: () => {},
        kind: 'audio',
        enabled: true,
      },
    ],
  });
}

export function cleanupWebSpeechMocks() {
  delete (global as any).SpeechRecognition;
  delete (global as any).webkitSpeechRecognition;
  delete (global as any).MediaRecorder;
}
