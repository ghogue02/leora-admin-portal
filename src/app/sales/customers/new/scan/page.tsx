'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, FileText, Camera, Upload, ArrowLeft } from 'lucide-react';
import CameraCapture from '@/components/scanning/CameraCapture';
import ImageUpload from '@/components/scanning/ImageUpload';
import ProcessingStatus from '@/components/scanning/ProcessingStatus';
import ScanResults from '@/components/scanning/ScanResults';
import { cn } from '@/lib/utils';

type ScanType = 'business-card' | 'liquor-license' | null;
type CaptureMethod = 'camera' | 'upload' | null;
type ProcessingState = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

interface ExtractedData {
  type: ScanType;
  confidence: number;
  fields: {
    name?: { value: string; confidence: number };
    title?: { value: string; confidence: number };
    company?: { value: string; confidence: number };
    phone?: { value: string; confidence: number };
    email?: { value: string; confidence: number };
    address?: { value: string; confidence: number };
    businessName?: { value: string; confidence: number };
    licenseNumber?: { value: string; confidence: number };
    licenseType?: { value: string; confidence: number };
    expirationDate?: { value: string; confidence: number };
  };
}

export default function ScanPage() {
  const router = useRouter();
  const [scanType, setScanType] = useState<ScanType>(null);
  const [captureMethod, setCaptureMethod] = useState<CaptureMethod>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);

  const handleTypeSelection = (type: ScanType) => {
    setScanType(type);
  };

  const handleMethodSelection = (method: CaptureMethod) => {
    setCaptureMethod(method);
  };

  const handleImageCapture = async (imageBlob: Blob) => {
    setProcessingState('uploading');

    try {
      // Upload image
      const formData = new FormData();
      formData.append('image', imageBlob);
      formData.append('type', scanType!);

      const uploadResponse = await fetch('/api/scanning/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) throw new Error('Upload failed');

      const { scanId: newScanId } = await uploadResponse.json();
      setScanId(newScanId);
      setProcessingState('processing');

      // Poll for results
      const pollInterval = setInterval(async () => {
        const statusResponse = await fetch(`/api/scanning/${newScanId}/status`);
        const statusData = await statusResponse.json();

        if (statusData.status === 'completed') {
          clearInterval(pollInterval);
          setExtractedData(statusData.data);
          setProcessingState('completed');
        } else if (statusData.status === 'failed') {
          clearInterval(pollInterval);
          setProcessingState('failed');
        }
      }, 2000);

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(pollInterval);
        if (processingState === 'processing') {
          setProcessingState('failed');
        }
      }, 30000);

    } catch (error) {
      console.error('Scan error:', error);
      setProcessingState('failed');
    }
  };

  const handleReset = () => {
    setScanType(null);
    setCaptureMethod(null);
    setProcessingState('idle');
    setExtractedData(null);
    setScanId(null);
    setUploadProgress(0);
  };

  const handleBack = () => {
    if (processingState === 'completed' || processingState === 'failed') {
      handleReset();
    } else if (captureMethod) {
      setCaptureMethod(null);
      setProcessingState('idle');
    } else if (scanType) {
      setScanType(null);
    } else {
      router.back();
    }
  };

  // Type Selection View
  if (!scanType) {
    return (
      <div className="container max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Scan Document</h1>
            <p className="text-muted-foreground">Choose what you want to scan</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => handleTypeSelection('business-card')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Business Card</CardTitle>
                  <CardDescription>Scan a contact's business card</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Automatically extract name, title, company, phone, email, and address
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => handleTypeSelection('liquor-license')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Liquor License</CardTitle>
                  <CardDescription>Scan a liquor license document</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Extract business name, license number, type, address, and expiration
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <h3 className="font-medium">Tips for Best Results</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Use good lighting (natural light works best)</li>
                <li>Keep the document flat and in focus</li>
                <li>Fill most of the frame with the document</li>
                <li>Avoid shadows and glare</li>
                <li>Hold your device steady</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Method Selection View
  if (!captureMethod) {
    return (
      <div className="container max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {scanType === 'business-card' ? 'Scan Business Card' : 'Scan Liquor License'}
            </h1>
            <p className="text-muted-foreground">Choose how to capture the document</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => handleMethodSelection('camera')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Camera className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Use Camera</CardTitle>
                  <CardDescription>Take a photo now</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Best for mobile devices. Capture a photo directly with your camera.
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => handleMethodSelection('upload')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Upload File</CardTitle>
                  <CardDescription>Choose an existing photo</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Upload a photo from your device gallery or computer.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Processing/Results View
  if (processingState === 'uploading' || processingState === 'processing') {
    return (
      <div className="container max-w-2xl mx-auto p-4">
        <ProcessingStatus
          state={processingState}
          progress={uploadProgress}
          scanType={scanType}
        />
      </div>
    );
  }

  if (processingState === 'completed' && extractedData) {
    return (
      <div className="container max-w-4xl mx-auto p-4">
        <ScanResults
          data={extractedData}
          onReset={handleReset}
          onBack={handleBack}
        />
      </div>
    );
  }

  if (processingState === 'failed') {
    return (
      <div className="container max-w-2xl mx-auto p-4 space-y-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Scan Failed</CardTitle>
            <CardDescription>
              We couldn't extract data from the image. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">Common issues:</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Image is too blurry or out of focus</li>
                <li>Poor lighting or shadows</li>
                <li>Document doesn't fill enough of the frame</li>
                <li>Text is too small or unclear</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleReset} className="flex-1">
                Try Again
              </Button>
              <Button variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Camera/Upload View
  return (
    <div className="h-screen flex flex-col bg-black">
      {captureMethod === 'camera' ? (
        <CameraCapture
          onCapture={handleImageCapture}
          onCancel={handleBack}
          scanType={scanType}
        />
      ) : (
        <ImageUpload
          onUpload={handleImageCapture}
          onCancel={handleBack}
          scanType={scanType}
        />
      )}
    </div>
  );
}
