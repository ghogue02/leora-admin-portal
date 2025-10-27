'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, RotateCw, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  onUpload: (image: Blob) => void;
  onCancel: () => void;
  scanType: 'business-card' | 'liquor-license';
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png'];

export default function ImageUpload({ onUpload, onCancel, scanType }: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      return 'Please upload a JPG or PNG image';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 5MB';
    }
    return null;
  };

  const handleFile = (file: File) => {
    setError(null);

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleConfirm = async () => {
    if (!selectedImage || !imageFile) return;

    try {
      let finalBlob: Blob = imageFile;

      // If image was rotated, create new blob with rotation
      if (rotation !== 0) {
        const img = new Image();
        img.src = selectedImage;

        await new Promise((resolve) => {
          img.onload = resolve;
        });

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas dimensions based on rotation
        if (rotation === 90 || rotation === 270) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        // Apply rotation
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();

        if (rotation === 90) {
          ctx.translate(canvas.width, 0);
          ctx.rotate(Math.PI / 2);
        } else if (rotation === 180) {
          ctx.translate(canvas.width, canvas.height);
          ctx.rotate(Math.PI);
        } else if (rotation === 270) {
          ctx.translate(0, canvas.height);
          ctx.rotate(-Math.PI / 2);
        }

        ctx.drawImage(img, 0, 0);
        ctx.restore();

        // Convert canvas to blob
        finalBlob = await new Promise((resolve) => {
          canvas.toBlob((blob) => {
            resolve(blob || imageFile);
          }, 'image/jpeg', 0.95);
        });
      }

      onUpload(finalBlob);
    } catch (err) {
      console.error('Image processing error:', err);
      setError('Failed to process image. Please try again.');
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setImageFile(null);
    setRotation(0);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold">
          Upload {scanType === 'business-card' ? 'Business Card' : 'Liquor License'}
        </h2>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4 overflow-auto">
        {!selectedImage ? (
          <>
            {/* Upload area */}
            <Card
              className={cn(
                "border-2 border-dashed transition-colors cursor-pointer",
                dragActive && "border-primary bg-primary/5"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="p-4 bg-primary/10 rounded-full">
                  <Upload className="h-10 w-10 text-primary" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-medium">
                    Drop image here or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground">
                    JPG or PNG • Max 5MB
                  </p>
                </div>
                <Button type="button" variant="secondary">
                  Choose File
                </Button>
              </CardContent>
            </Card>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleFileInput}
              className="hidden"
            />

            {/* Error message */}
            {error && (
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <p className="text-sm text-destructive">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* Upload tips */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <ImageIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="font-medium text-sm">Tips for Best Results</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Ensure the entire {scanType === 'business-card' ? 'card' : 'license'} is visible</li>
                      <li>• Use good lighting without glare or shadows</li>
                      <li>• Keep the image clear and in focus</li>
                      <li>• Avoid blurry or tilted photos</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Image preview */}
            <Card>
              <CardContent className="p-4">
                <div className="relative bg-muted rounded-lg overflow-hidden">
                  <img
                    src={selectedImage}
                    alt="Preview"
                    className="w-full h-auto max-h-96 object-contain"
                    style={{ transform: `rotate(${rotation}deg)` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Image controls */}
            <div className="flex gap-2">
              <Button
                onClick={handleRotate}
                variant="outline"
                className="flex-1"
              >
                <RotateCw className="h-4 w-4 mr-2" />
                Rotate
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>

            {/* File info */}
            {imageFile && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">File:</span>
                    <span className="font-medium">{imageFile.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-muted-foreground">Size:</span>
                    <span className="font-medium">
                      {(imageFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Canvas for rotation */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Footer */}
      {selectedImage && (
        <div className="p-4 border-t bg-background">
          <div className="flex gap-3 max-w-md mx-auto">
            <Button
              onClick={onCancel}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1"
            >
              Upload & Scan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
