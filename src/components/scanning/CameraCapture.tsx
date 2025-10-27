'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Zap, ZapOff, RotateCcw, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CameraCaptureProps {
  onCapture: (image: Blob) => void;
  onCancel: () => void;
  scanType: 'business-card' | 'liquor-license';
}

export default function CameraCapture({ onCapture, onCancel, scanType }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      setError(null);
      setIsReady(false);

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsReady(true);
        };
      }

      // Check if flash is supported
      const videoTrack = stream.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities() as any;
      if (!capabilities.torch) {
        setFlashEnabled(false);
      }
    } catch (err) {
      console.error('Camera error:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access to continue.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Please use the upload option instead.');
        } else {
          setError('Failed to access camera. Please check your device settings.');
        }
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const toggleFlash = async () => {
    if (!streamRef.current) return;

    try {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities() as any;

      if (capabilities.torch) {
        await videoTrack.applyConstraints({
          // @ts-ignore
          advanced: [{ torch: !flashEnabled }]
        });
        setFlashEnabled(!flashEnabled);
      }
    } catch (err) {
      console.error('Flash toggle error:', err);
    }
  };

  const switchCamera = () => {
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const startCountdown = () => {
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          capturePhoto();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Get image as data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(imageDataUrl);

    // Stop camera
    stopCamera();
  };

  const handleConfirm = () => {
    if (!capturedImage) return;

    // Convert data URL to blob
    fetch(capturedImage)
      .then(res => res.blob())
      .then(blob => {
        onCapture(blob);
      })
      .catch(err => {
        console.error('Image conversion error:', err);
        setError('Failed to process image. Please try again.');
      });
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-white">
        <div className="max-w-md text-center space-y-4">
          <Camera className="h-16 w-16 mx-auto text-red-500" />
          <h2 className="text-xl font-bold">Camera Error</h2>
          <p className="text-sm opacity-90">{error}</p>
          <Button onClick={onCancel} variant="secondary" className="w-full">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="text-white hover:bg-white/20"
        >
          <X className="h-6 w-6" />
        </Button>
        <div className="text-white text-center">
          <p className="text-sm font-medium">
            {scanType === 'business-card' ? 'Business Card' : 'Liquor License'}
          </p>
        </div>
        <div className="w-10" /> {/* Spacer for alignment */}
      </div>

      {/* Camera View / Captured Image */}
      <div className="flex-1 relative bg-black">
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              autoPlay
            />

            {/* Guide Overlay */}
            {isReady && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-[90%] max-w-md aspect-[1.586]">
                  {/* Card outline */}
                  <div className="absolute inset-0 border-2 border-white/50 rounded-lg">
                    {/* Corner markers */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg" />
                  </div>

                  {/* Guide text */}
                  <div className="absolute -bottom-12 left-0 right-0 text-center text-white text-sm">
                    Position {scanType === 'business-card' ? 'card' : 'license'} within the frame
                  </div>
                </div>
              </div>
            )}

            {/* Countdown overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-white text-8xl font-bold animate-ping">
                  {countdown}
                </div>
              </div>
            )}
          </>
        ) : (
          <img
            src={capturedImage}
            alt="Captured"
            className="w-full h-full object-contain"
          />
        )}
      </div>

      {/* Canvas for capturing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
        {!capturedImage ? (
          <div className="flex items-center justify-between max-w-md mx-auto">
            {/* Flash toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFlash}
              disabled={!isReady}
              className="text-white hover:bg-white/20 h-12 w-12"
            >
              {flashEnabled ? (
                <Zap className="h-6 w-6 fill-current" />
              ) : (
                <ZapOff className="h-6 w-6" />
              )}
            </Button>

            {/* Capture button */}
            <Button
              onClick={startCountdown}
              disabled={!isReady || countdown !== null}
              size="icon"
              className={cn(
                "h-20 w-20 rounded-full bg-white hover:bg-white/90",
                "border-4 border-white/50 shadow-lg",
                "transition-transform active:scale-95"
              )}
            >
              <Circle className="h-16 w-16 text-black fill-current" />
            </Button>

            {/* Switch camera */}
            <Button
              variant="ghost"
              size="icon"
              onClick={switchCamera}
              disabled={!isReady}
              className="text-white hover:bg-white/20 h-12 w-12"
            >
              <RotateCcw className="h-6 w-6" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-3 max-w-md mx-auto">
            <Button
              onClick={handleRetake}
              variant="secondary"
              className="flex-1 h-14 text-base"
            >
              Retake
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 h-14 text-base"
            >
              Use Photo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
