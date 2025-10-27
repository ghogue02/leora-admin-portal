'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { CameraConfig, ImageTransform } from '@/types/scanner';

interface CameraCaptureProps {
  onCapture: (imageData: string, transform?: ImageTransform) => void;
  onCancel?: () => void;
  config?: Partial<CameraConfig>;
  showControls?: boolean;
}

export function CameraCapture({
  onCapture,
  onCancel,
  config = {},
  showControls = true,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(
    config.facingMode || 'environment'
  );

  const defaultConfig: CameraConfig = {
    facingMode,
    width: 1920,
    height: 1080,
    aspectRatio: 16 / 9,
    ...config,
  };

  const startCamera = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: defaultConfig.facingMode,
          width: { ideal: defaultConfig.width },
          height: { ideal: defaultConfig.height },
          aspectRatio: defaultConfig.aspectRatio,
        },
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setHasPermission(true);
      setError(null);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setHasPermission(false);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to access camera. Please grant camera permissions.'
      );
    }
  }, [defaultConfig.facingMode, defaultConfig.width, defaultConfig.height, defaultConfig.aspectRatio]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Apply rotation if needed
    if (rotation !== 0) {
      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate((rotation * Math.PI) / 180);
      context.translate(-canvas.width / 2, -canvas.height / 2);
    }

    // Draw video frame to canvas
    context.drawImage(video, 0, 0);

    // Get image as base64
    const imageData = canvas.toDataURL('image/jpeg', 0.9);

    const transform: ImageTransform = {
      rotation,
    };

    onCapture(imageData, transform);
    stopCamera();
  }, [rotation, onCapture, stopCamera]);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleFlipCamera = useCallback(() => {
    stopCamera();
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  }, [stopCamera]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]); // Restart when facing mode changes

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  if (hasPermission === false) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-lg">
        <svg
          className="w-16 h-16 text-red-500 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Camera Access Required</h3>
        <p className="text-gray-600 text-center mb-4">{error}</p>
        <button
          onClick={startCamera}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="relative flex-1 bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain"
          style={{ transform: `rotate(${rotation}deg)` }}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay guide */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-4 border-2 border-white border-dashed rounded-lg opacity-50" />
        </div>
      </div>

      {showControls && (
        <div className="flex items-center justify-between gap-4 mt-4 p-4 bg-gray-100 rounded-lg">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleRotate}
              className="p-2 bg-white rounded-lg hover:bg-gray-50 border border-gray-300"
              title="Rotate"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>

            <button
              onClick={handleFlipCamera}
              className="p-2 bg-white rounded-lg hover:bg-gray-50 border border-gray-300"
              title="Flip Camera"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>

          <button
            onClick={captureImage}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Capture
          </button>
        </div>
      )}
    </div>
  );
}
