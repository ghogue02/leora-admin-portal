'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Camera,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCw
} from 'lucide-react';

interface ScanResult {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  confidence: number;
}

interface BusinessCardScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (data: ScanResult) => void;
}

export function BusinessCardScanner({
  isOpen,
  onClose,
  onScanComplete
}: BusinessCardScannerProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setError(null);
      setPermissionDenied(false);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera error:', err);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setError('Camera permission denied. Please allow camera access to scan business cards.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Failed to access camera. You can still upload an image instead.');
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);

    // Process the image
    processImage(imageData);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image too large. Please select an image under 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      setCapturedImage(imageData);
      processImage(imageData);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (imageData: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      if (isOffline) {
        // Queue for later processing when online
        queueOfflineJob(imageData);
        return;
      }

      const response = await fetch('/api/scan/business-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
      });

      if (!response.ok) {
        throw new Error('Failed to process image');
      }

      const result: ScanResult = await response.json();
      setScanResult(result);

      // Auto-complete if confidence is high
      if (result.confidence >= 0.8) {
        setTimeout(() => {
          onScanComplete(result);
          handleClose();
        }, 1500);
      }
    } catch (err: any) {
      console.error('Processing error:', err);
      setError('Failed to extract information from the image. Please try again or enter details manually.');
    } finally {
      setIsProcessing(false);
    }
  };

  const queueOfflineJob = (imageData: string) => {
    const jobs = JSON.parse(localStorage.getItem('offlineScanJobs') || '[]');
    jobs.push({
      id: Date.now().toString(),
      imageData,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem('offlineScanJobs', JSON.stringify(jobs));

    setError('You are offline. Scan queued for processing when connection is restored.');
    setIsProcessing(false);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setScanResult(null);
    setError(null);
  };

  const handleClose = () => {
    retakePhoto();
    stopCamera();
    onClose();
  };

  const useScannedData = () => {
    if (scanResult) {
      onScanComplete(scanResult);
      handleClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scan Business Card</DialogTitle>
          <DialogDescription>
            Capture or upload a business card to automatically extract contact information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isOffline && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You are offline. Scans will be queued and processed when connection is restored.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {permissionDenied && (
            <Alert>
              <AlertDescription>
                <p className="mb-2">To enable camera access:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Click the camera icon in your browser's address bar</li>
                  <li>Select "Allow" for camera permissions</li>
                  <li>Refresh this page</li>
                </ol>
              </AlertDescription>
            </Alert>
          )}

          {!capturedImage ? (
            <div className="space-y-4">
              {/* Camera View */}
              {stream && !permissionDenied ? (
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-auto"
                    style={{ maxHeight: '60vh' }}
                  />

                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="border-2 border-white rounded-lg w-4/5 h-3/4 opacity-50" />
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
                    <p className="text-white text-center text-sm">
                      Position the business card within the frame
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-muted rounded-lg p-12 text-center">
                  <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Camera not available. Upload an image instead.
                  </p>
                </div>
              )}

              {/* Hidden canvas for image capture */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Action Buttons */}
              <div className="flex gap-2">
                {stream && !permissionDenied && (
                  <Button onClick={captureImage} className="flex-1" size="lg">
                    <Camera className="h-5 w-5 mr-2" />
                    Capture Photo
                  </Button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Upload Image
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Captured Image */}
              <div className="relative">
                <img
                  src={capturedImage}
                  alt="Captured business card"
                  className="w-full rounded-lg"
                />

                {isProcessing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                    <div className="text-center text-white">
                      <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                      <p>Extracting information...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Scan Results */}
              {scanResult && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <CardTitle>Information Extracted</CardTitle>
                    </div>
                    <CardDescription>
                      Confidence: {(scanResult.confidence * 100).toFixed(0)}%
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {scanResult.name && (
                      <div>
                        <span className="text-sm text-muted-foreground">Name:</span>
                        <p className="font-medium">{scanResult.name}</p>
                      </div>
                    )}
                    {scanResult.company && (
                      <div>
                        <span className="text-sm text-muted-foreground">Company:</span>
                        <p className="font-medium">{scanResult.company}</p>
                      </div>
                    )}
                    {scanResult.email && (
                      <div>
                        <span className="text-sm text-muted-foreground">Email:</span>
                        <p className="font-medium">{scanResult.email}</p>
                      </div>
                    )}
                    {scanResult.phone && (
                      <div>
                        <span className="text-sm text-muted-foreground">Phone:</span>
                        <p className="font-medium">{scanResult.phone}</p>
                      </div>
                    )}
                    {scanResult.address && (
                      <div>
                        <span className="text-sm text-muted-foreground">Address:</span>
                        <p className="font-medium">{scanResult.address}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button onClick={retakePhoto} variant="outline" className="flex-1">
                  <RotateCw className="h-4 w-4 mr-2" />
                  Retake
                </Button>
                {scanResult && (
                  <Button onClick={useScannedData} className="flex-1">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Use This Data
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
