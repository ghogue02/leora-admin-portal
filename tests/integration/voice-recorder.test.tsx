/**
 * Integration Tests: Voice Recorder Component
 * Tests voice recording and transcription functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VoiceRecorder } from '@/components/voice/VoiceRecorder';

// Mock Web Speech API
class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = 'en-US';
  onresult = vi.fn();
  onerror = vi.fn();
  onend = vi.fn();
  onstart = vi.fn();

  start = vi.fn(() => {
    setTimeout(() => {
      if (this.onstart) this.onstart();
    }, 100);
  });

  stop = vi.fn(() => {
    setTimeout(() => {
      if (this.onend) this.onend();
    }, 100);
  });

  abort = vi.fn();
}

// Mock MediaRecorder API
class MockMediaRecorder {
  state = 'inactive';
  ondataavailable = vi.fn();
  onstop = vi.fn();
  onerror = vi.fn();

  start = vi.fn(() => {
    this.state = 'recording';
  });

  stop = vi.fn(() => {
    this.state = 'inactive';
    if (this.ondataavailable) {
      const mockBlob = new Blob(['audio data'], { type: 'audio/webm' });
      this.ondataavailable({ data: mockBlob });
    }
    if (this.onstop) {
      this.onstop();
    }
  });

  pause = vi.fn();
  resume = vi.fn();
}

describe('VoiceRecorder Component', () => {
  let mockRecognition: MockSpeechRecognition;
  let mockMediaRecorder: MockMediaRecorder;

  beforeEach(() => {
    // Setup Web Speech API mock
    mockRecognition = new MockSpeechRecognition();
    global.SpeechRecognition = vi.fn(() => mockRecognition) as any;
    global.webkitSpeechRecognition = vi.fn(() => mockRecognition) as any;

    // Setup MediaRecorder mock
    mockMediaRecorder = new MockMediaRecorder();
    global.MediaRecorder = vi.fn(() => mockMediaRecorder) as any;
    (global.MediaRecorder as any).isTypeSupported = vi.fn(() => true);

    // Mock getUserMedia
    global.navigator.mediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      }),
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Recording Controls', () => {
    it('should render start recording button', () => {
      render(<VoiceRecorder onTranscript={vi.fn()} />);

      const startButton = screen.getByRole('button', { name: /start recording/i });
      expect(startButton).toBeDefined();
    });

    it('should start recording when button clicked', async () => {
      render(<VoiceRecorder onTranscript={vi.fn()} />);

      const startButton = screen.getByRole('button', { name: /start recording/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
          audio: true,
        });
      });

      expect(mockMediaRecorder.start).toHaveBeenCalled();
      expect(mockRecognition.start).toHaveBeenCalled();
    });

    it('should show recording indicator while recording', async () => {
      render(<VoiceRecorder onTranscript={vi.fn()} />);

      const startButton = screen.getByRole('button', { name: /start recording/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/recording/i)).toBeDefined();
      });
    });

    it('should show stop button while recording', async () => {
      render(<VoiceRecorder onTranscript={vi.fn()} />);

      fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /stop recording/i })).toBeDefined();
      });
    });

    it('should stop recording when stop button clicked', async () => {
      render(<VoiceRecorder onTranscript={vi.fn()} />);

      fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /stop recording/i })).toBeDefined();
      });

      fireEvent.click(screen.getByRole('button', { name: /stop recording/i }));

      await waitFor(() => {
        expect(mockMediaRecorder.stop).toHaveBeenCalled();
        expect(mockRecognition.stop).toHaveBeenCalled();
      });
    });

    it('should display recording duration', async () => {
      render(<VoiceRecorder onTranscript={vi.fn()} />);

      fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

      await waitFor(() => {
        expect(screen.getByText(/0:00/)).toBeDefined();
      });
    });
  });

  describe('Speech Recognition', () => {
    it('should transcribe speech in real-time', async () => {
      const onTranscript = vi.fn();
      render(<VoiceRecorder onTranscript={onTranscript} />);

      fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

      await waitFor(() => {
        expect(mockRecognition.start).toHaveBeenCalled();
      });

      // Simulate speech recognition result
      const mockEvent = {
        results: [
          [
            {
              transcript: 'Discussed Q4 promotion with customer',
              confidence: 0.95,
            },
          ],
        ],
        resultIndex: 0,
      };

      mockRecognition.onresult(mockEvent);

      await waitFor(() => {
        expect(screen.getByText(/discussed q4 promotion/i)).toBeDefined();
      });
    });

    it('should show interim results', async () => {
      render(<VoiceRecorder onTranscript={vi.fn()} showInterim />);

      fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

      const mockEvent = {
        results: [
          [
            {
              transcript: 'Hello',
              isFinal: false,
            },
          ],
        ],
        resultIndex: 0,
      };

      mockRecognition.onresult(mockEvent);

      await waitFor(() => {
        expect(screen.getByText(/hello/i)).toBeDefined();
      });
    });

    it('should handle speech recognition errors', async () => {
      const onError = vi.fn();
      render(<VoiceRecorder onTranscript={vi.fn()} onError={onError} />);

      fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

      mockRecognition.onerror({ error: 'no-speech', message: 'No speech detected' });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.stringContaining('no-speech'));
      });
    });

    it('should concatenate multiple speech segments', async () => {
      const onTranscript = vi.fn();
      render(<VoiceRecorder onTranscript={onTranscript} />);

      fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

      // First segment
      mockRecognition.onresult({
        results: [[{ transcript: 'Customer ordered', isFinal: true }]],
        resultIndex: 0,
      });

      // Second segment
      mockRecognition.onresult({
        results: [
          [{ transcript: 'Customer ordered', isFinal: true }],
          [{ transcript: 'twenty cases', isFinal: true }],
        ],
        resultIndex: 1,
      });

      await waitFor(() => {
        expect(screen.getByText(/customer ordered twenty cases/i)).toBeDefined();
      });
    });
  });

  describe('Audio Recording', () => {
    it('should capture audio data', async () => {
      render(<VoiceRecorder onTranscript={vi.fn()} />);

      fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

      await waitFor(() => {
        expect(mockMediaRecorder.start).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByRole('button', { name: /stop recording/i }));

      await waitFor(() => {
        expect(mockMediaRecorder.ondataavailable).toHaveBeenCalled();
      });
    });

    it('should provide audio blob on completion', async () => {
      const onAudioRecorded = vi.fn();
      render(<VoiceRecorder onTranscript={vi.fn()} onAudioRecorded={onAudioRecorded} />);

      fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
      fireEvent.click(screen.getByRole('button', { name: /stop recording/i }));

      await waitFor(() => {
        expect(onAudioRecorded).toHaveBeenCalledWith(expect.any(Blob));
      });
    });

    it('should support audio playback after recording', async () => {
      render(<VoiceRecorder onTranscript={vi.fn()} enablePlayback />);

      fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
      fireEvent.click(screen.getByRole('button', { name: /stop recording/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /play recording/i })).toBeDefined();
      });
    });
  });

  describe('Account Objective Recording', () => {
    it('should record objective for specific account', async () => {
      const onObjectiveRecorded = vi.fn();
      render(
        <VoiceRecorder
          onTranscript={vi.fn()}
          accountId="account-1"
          accountName="Test Account"
          onObjectiveRecorded={onObjectiveRecorded}
        />
      );

      expect(screen.getByText(/test account/i)).toBeDefined();

      fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

      mockRecognition.onresult({
        results: [[{ transcript: 'Discuss new product line', isFinal: true }]],
        resultIndex: 0,
      });

      fireEvent.click(screen.getByRole('button', { name: /stop recording/i }));

      await waitFor(() => {
        expect(onObjectiveRecorded).toHaveBeenCalledWith({
          accountId: 'account-1',
          objective: 'Discuss new product line',
        });
      });
    });

    it('should save objective directly to call plan', async () => {
      const onSaveObjective = vi.fn();
      render(
        <VoiceRecorder
          onTranscript={vi.fn()}
          accountId="account-1"
          callPlanId="plan-1"
          onSaveObjective={onSaveObjective}
          autoSave
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

      mockRecognition.onresult({
        results: [[{ transcript: 'Review quarterly performance', isFinal: true }]],
        resultIndex: 0,
      });

      fireEvent.click(screen.getByRole('button', { name: /stop recording/i }));

      await waitFor(() => {
        expect(onSaveObjective).toHaveBeenCalledWith({
          callPlanId: 'plan-1',
          accountId: 'account-1',
          objective: 'Review quarterly performance',
        });
      });
    });
  });

  describe('Outcome Recording', () => {
    it('should record call outcome notes', async () => {
      const onOutcomeRecorded = vi.fn();
      render(
        <VoiceRecorder
          onTranscript={vi.fn()}
          mode="outcome"
          accountId="account-1"
          onOutcomeRecorded={onOutcomeRecorded}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

      mockRecognition.onresult({
        results: [
          [{ transcript: 'Customer placed 30 case order exceeded target', isFinal: true }],
        ],
        resultIndex: 0,
      });

      fireEvent.click(screen.getByRole('button', { name: /stop recording/i }));

      await waitFor(() => {
        expect(onOutcomeRecorded).toHaveBeenCalledWith({
          accountId: 'account-1',
          outcomeNotes: expect.stringContaining('30 case order'),
        });
      });
    });

    it('should allow outcome selection with voice notes', async () => {
      const onOutcomeRecorded = vi.fn();
      render(
        <VoiceRecorder
          onTranscript={vi.fn()}
          mode="outcome"
          accountId="account-1"
          onOutcomeRecorded={onOutcomeRecorded}
        />
      );

      // Select outcome
      const xButton = screen.getByRole('button', { name: /met objective/i });
      fireEvent.click(xButton);

      // Record notes
      fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

      mockRecognition.onresult({
        results: [[{ transcript: 'Great meeting productive discussion', isFinal: true }]],
        resultIndex: 0,
      });

      fireEvent.click(screen.getByRole('button', { name: /stop recording/i }));

      await waitFor(() => {
        expect(onOutcomeRecorded).toHaveBeenCalledWith({
          accountId: 'account-1',
          outcome: 'X',
          outcomeNotes: expect.stringContaining('Great meeting'),
        });
      });
    });
  });

  describe('Microphone Permissions', () => {
    it('should request microphone permission', async () => {
      render(<VoiceRecorder onTranscript={vi.fn()} />);

      fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

      await waitFor(() => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
          audio: true,
        });
      });
    });

    it('should handle permission denied', async () => {
      const onError = vi.fn();
      (navigator.mediaDevices.getUserMedia as any).mockRejectedValue(
        new Error('Permission denied')
      );

      render(<VoiceRecorder onTranscript={vi.fn()} onError={onError} />);

      fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.stringContaining('Permission denied'));
      });

      expect(screen.getByText(/microphone permission/i)).toBeDefined();
    });

    it('should show permission prompt', async () => {
      render(<VoiceRecorder onTranscript={vi.fn()} showPermissionPrompt />);

      expect(screen.getByText(/microphone access required/i)).toBeDefined();
    });
  });

  describe('Language Support', () => {
    it('should support different languages', async () => {
      render(<VoiceRecorder onTranscript={vi.fn()} language="es-ES" />);

      fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

      await waitFor(() => {
        expect(mockRecognition.lang).toBe('es-ES');
      });
    });

    it('should default to English', () => {
      render(<VoiceRecorder onTranscript={vi.fn()} />);

      expect(mockRecognition.lang).toBe('en-US');
    });
  });

  describe('Error Handling', () => {
    it('should handle browser incompatibility', () => {
      delete (global as any).SpeechRecognition;
      delete (global as any).webkitSpeechRecognition;

      render(<VoiceRecorder onTranscript={vi.fn()} />);

      expect(screen.getByText(/not supported/i)).toBeDefined();
    });

    it('should handle recording errors gracefully', async () => {
      const onError = vi.fn();
      render(<VoiceRecorder onTranscript={vi.fn()} onError={onError} />);

      fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

      mockMediaRecorder.onerror({ error: 'Recording failed' });

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });
  });
});
