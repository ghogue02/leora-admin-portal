import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CameraCapture from '../CameraCapture';

// Mock navigator.mediaDevices
const mockMediaDevices = {
  getUserMedia: vi.fn(),
  enumerateDevices: vi.fn()
};

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: mockMediaDevices,
  writable: true
});

describe('CameraCapture Component', () => {
  let mockStream: MediaStream;
  let mockVideoTrack: MediaStreamTrack;

  beforeEach(() => {
    // Setup mock media stream
    mockVideoTrack = {
      stop: vi.fn(),
      getSettings: vi.fn().mockReturnValue({
        width: 1920,
        height: 1080,
        facingMode: 'environment'
      })
    } as any;

    mockStream = {
      getTracks: vi.fn().mockReturnValue([mockVideoTrack]),
      getVideoTracks: vi.fn().mockReturnValue([mockVideoTrack])
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Camera Permission', () => {
    it('should request camera permission on mount', async () => {
      mockMediaDevices.getUserMedia.mockResolvedValue(mockStream);

      render(<CameraCapture onCapture={vi.fn()} />);

      await waitFor(() => {
        expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });
      });
    });

    it('should display permission prompt when not granted', () => {
      mockMediaDevices.getUserMedia.mockImplementation(() =>
        Promise.reject(new Error('Permission denied'))
      );

      render(<CameraCapture onCapture={vi.fn()} />);

      expect(screen.getByText(/camera permission required/i)).toBeInTheDocument();
    });

    it('should handle permission granted', async () => {
      mockMediaDevices.getUserMedia.mockResolvedValue(mockStream);

      render(<CameraCapture onCapture={vi.fn()} />);

      await waitFor(() => {
        expect(screen.queryByText(/permission required/i)).not.toBeInTheDocument();
        expect(screen.getByTestId('video-preview')).toBeInTheDocument();
      });
    });

    it('should handle permission denied gracefully', async () => {
      mockMediaDevices.getUserMedia.mockRejectedValue(
        new Error('NotAllowedError')
      );

      render(<CameraCapture onCapture={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/camera access denied/i)).toBeInTheDocument();
      });
    });
  });

  describe('Camera Access', () => {
    beforeEach(() => {
      mockMediaDevices.getUserMedia.mockResolvedValue(mockStream);
    });

    it('should start video stream when camera granted', async () => {
      render(<CameraCapture onCapture={vi.fn()} />);

      await waitFor(() => {
        const video = screen.getByTestId('video-preview') as HTMLVideoElement;
        expect(video.srcObject).toBe(mockStream);
      });
    });

    it('should stop video stream on unmount', async () => {
      const { unmount } = render(<CameraCapture onCapture={vi.fn()} />);

      await waitFor(() => {
        expect(mockMediaDevices.getUserMedia).toHaveBeenCalled();
      });

      unmount();

      expect(mockVideoTrack.stop).toHaveBeenCalled();
    });

    it('should handle camera not available', async () => {
      mockMediaDevices.getUserMedia.mockRejectedValue(
        new Error('NotFoundError')
      );

      render(<CameraCapture onCapture={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/no camera found/i)).toBeInTheDocument();
      });
    });

    it('should switch between front and back camera', async () => {
      mockMediaDevices.enumerateDevices.mockResolvedValue([
        { kind: 'videoinput', label: 'Front Camera', deviceId: 'front' },
        { kind: 'videoinput', label: 'Back Camera', deviceId: 'back' }
      ] as any);

      render(<CameraCapture onCapture={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId('switch-camera-btn')).toBeInTheDocument();
      });

      const switchButton = screen.getByTestId('switch-camera-btn');
      await userEvent.click(switchButton);

      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          video: expect.objectContaining({
            facingMode: 'user' // Switched to front camera
          })
        })
      );
    });
  });

  describe('Photo Capture', () => {
    beforeEach(() => {
      mockMediaDevices.getUserMedia.mockResolvedValue(mockStream);
    });

    it('should capture photo when button clicked', async () => {
      const onCapture = vi.fn();
      render(<CameraCapture onCapture={onCapture} />);

      await waitFor(() => {
        expect(screen.getByTestId('capture-btn')).toBeInTheDocument();
      });

      const captureButton = screen.getByTestId('capture-btn');
      await userEvent.click(captureButton);

      expect(onCapture).toHaveBeenCalledWith(
        expect.objectContaining({
          blob: expect.any(Blob),
          dataUrl: expect.stringContaining('data:image')
        })
      );
    });

    it('should display captured photo preview', async () => {
      render(<CameraCapture onCapture={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId('capture-btn')).toBeInTheDocument();
      });

      const captureButton = screen.getByTestId('capture-btn');
      await userEvent.click(captureButton);

      await waitFor(() => {
        expect(screen.getByTestId('photo-preview')).toBeInTheDocument();
      });
    });

    it('should allow retake after capture', async () => {
      render(<CameraCapture onCapture={vi.fn()} />);

      // Capture photo
      const captureButton = screen.getByTestId('capture-btn');
      await userEvent.click(captureButton);

      await waitFor(() => {
        expect(screen.getByTestId('retake-btn')).toBeInTheDocument();
      });

      // Click retake
      const retakeButton = screen.getByTestId('retake-btn');
      await userEvent.click(retakeButton);

      // Should show camera again
      expect(screen.getByTestId('video-preview')).toBeInTheDocument();
      expect(screen.queryByTestId('photo-preview')).not.toBeInTheDocument();
    });

    it('should confirm and submit captured photo', async () => {
      const onCapture = vi.fn();
      render(<CameraCapture onCapture={onCapture} />);

      // Capture
      const captureButton = screen.getByTestId('capture-btn');
      await userEvent.click(captureButton);

      await waitFor(() => {
        expect(screen.getByTestId('confirm-btn')).toBeInTheDocument();
      });

      // Confirm
      const confirmButton = screen.getByTestId('confirm-btn');
      await userEvent.click(confirmButton);

      expect(onCapture).toHaveBeenCalled();
    });
  });

  describe('Image Quality Validation', () => {
    beforeEach(() => {
      mockMediaDevices.getUserMedia.mockResolvedValue(mockStream);
    });

    it('should validate minimum resolution', async () => {
      const lowResTrack = {
        ...mockVideoTrack,
        getSettings: vi.fn().mockReturnValue({
          width: 320,
          height: 240
        })
      };

      const lowResStream = {
        getTracks: vi.fn().mockReturnValue([lowResTrack]),
        getVideoTracks: vi.fn().mockReturnValue([lowResTrack])
      } as any;

      mockMediaDevices.getUserMedia.mockResolvedValue(lowResStream);

      render(<CameraCapture onCapture={vi.fn()} minResolution={640} />);

      await waitFor(() => {
        expect(screen.getByText(/resolution too low/i)).toBeInTheDocument();
      });
    });

    it('should validate image sharpness', async () => {
      const onCapture = vi.fn();
      render(<CameraCapture onCapture={onCapture} validateSharpness={true} />);

      const captureButton = screen.getByTestId('capture-btn');
      await userEvent.click(captureButton);

      // Simulate blurry image detection
      await waitFor(() => {
        expect(screen.getByText(/image appears blurry/i)).toBeInTheDocument();
      });
    });

    it('should warn about poor lighting', async () => {
      render(<CameraCapture onCapture={vi.fn()} validateLighting={true} />);

      const captureButton = screen.getByTestId('capture-btn');
      await userEvent.click(captureButton);

      // Simulate dark image detection
      await waitFor(() => {
        expect(screen.getByText(/lighting too dark/i)).toBeInTheDocument();
      });
    });
  });

  describe('File Size Validation', () => {
    beforeEach(() => {
      mockMediaDevices.getUserMedia.mockResolvedValue(mockStream);
    });

    it('should reject files larger than max size', async () => {
      const onCapture = vi.fn();
      render(<CameraCapture onCapture={onCapture} maxFileSizeMB={5} />);

      // Mock large file
      const largeBlob = new Blob(['x'.repeat(6 * 1024 * 1024)], {
        type: 'image/jpeg'
      });

      const captureButton = screen.getByTestId('capture-btn');
      await userEvent.click(captureButton);

      await waitFor(() => {
        expect(screen.getByText(/file size too large/i)).toBeInTheDocument();
      });

      expect(onCapture).not.toHaveBeenCalled();
    });

    it('should compress image if too large', async () => {
      const onCapture = vi.fn();
      render(
        <CameraCapture
          onCapture={onCapture}
          maxFileSizeMB={5}
          autoCompress={true}
        />
      );

      const captureButton = screen.getByTestId('capture-btn');
      await userEvent.click(captureButton);

      await waitFor(() => {
        expect(onCapture).toHaveBeenCalledWith(
          expect.objectContaining({
            compressed: true
          })
        );
      });
    });
  });

  describe('Browser Compatibility', () => {
    it('should detect when MediaDevices API not supported', () => {
      // @ts-ignore
      delete global.navigator.mediaDevices;

      render(<CameraCapture onCapture={vi.fn()} />);

      expect(screen.getByText(/camera not supported/i)).toBeInTheDocument();
    });

    it('should show iOS-specific camera instructions', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        writable: true
      });

      render(<CameraCapture onCapture={vi.fn()} />);

      expect(screen.getByText(/tap to allow camera access/i)).toBeInTheDocument();
    });

    it('should show Android-specific camera instructions', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 11)',
        writable: true
      });

      render(<CameraCapture onCapture={vi.fn()} />);

      expect(screen.getByText(/allow camera permission/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockMediaDevices.getUserMedia.mockResolvedValue(mockStream);
    });

    it('should have proper ARIA labels', async () => {
      render(<CameraCapture onCapture={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/capture photo/i)).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      render(<CameraCapture onCapture={vi.fn()} />);

      const captureButton = screen.getByTestId('capture-btn');

      captureButton.focus();
      expect(captureButton).toHaveFocus();

      // Simulate Enter key
      fireEvent.keyDown(captureButton, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(screen.getByTestId('photo-preview')).toBeInTheDocument();
      });
    });

    it('should announce capture status to screen readers', async () => {
      render(<CameraCapture onCapture={vi.fn()} />);

      const captureButton = screen.getByTestId('capture-btn');
      await userEvent.click(captureButton);

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/photo captured/i);
      });
    });
  });
});
