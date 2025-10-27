'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Camera, X, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  expectedBarcode?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, expectedBarcode, isOpen, onClose }: BarcodeScannerProps) {
  const [manualInput, setManualInput] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen && isCameraActive) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, isCameraActive]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      setStream(mediaStream);
      setError('');

      // TODO: Integrate with barcode detection library like zxing or quagga
      toast.info('Camera started. Manual input mode active.');
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Failed to access camera. Please use manual input.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleManualSubmit = () => {
    if (!manualInput.trim()) {
      toast.error('Please enter a barcode');
      return;
    }

    if (expectedBarcode && manualInput !== expectedBarcode) {
      toast.error('Barcode mismatch! Please scan the correct item.');
      setManualInput('');
      return;
    }

    onScan(manualInput);
    setManualInput('');
    toast.success('Barcode scanned successfully');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleManualSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Scan Barcode</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {expectedBarcode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm text-blue-600 font-medium">Expected:</div>
            <div className="text-lg font-mono">{expectedBarcode}</div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <Button
            variant={isCameraActive ? 'secondary' : 'outline'}
            className="w-full"
            onClick={() => setIsCameraActive(!isCameraActive)}
          >
            <Camera className="mr-2 h-4 w-4" />
            {isCameraActive ? 'Stop Camera' : 'Use Camera'}
          </Button>

          {isCameraActive && (
            <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-32 border-2 border-white/50 rounded-lg" />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Manual Entry</label>
            <div className="flex gap-2">
              <Input
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter barcode..."
                className="flex-1"
                autoFocus
              />
              <Button onClick={handleManualSubmit}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500 text-center">
          Scan the barcode with your camera or enter it manually
        </div>
      </Card>
    </div>
  );
}
