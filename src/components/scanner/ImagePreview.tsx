'use client';

import React, { useState, useRef } from 'react';
import type { ImageTransform } from '@/types/scanner';

interface ImagePreviewProps {
  imageData: string;
  onConfirm: (processedImage: string, transform?: ImageTransform) => void;
  onRetake?: () => void;
  allowEdit?: boolean;
}

export function ImagePreview({
  imageData,
  onConfirm,
  onRetake,
  allowEdit = true,
}: ImagePreviewProps) {
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const applyFilters = () => {
    if (!canvasRef.current) return imageData;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return imageData;

    const img = new Image();
    img.src = imageData;

    return new Promise<string>((resolve) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        // Apply filters
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

        // Apply rotation
        if (rotation !== 0) {
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.translate(-canvas.width / 2, -canvas.height / 2);
        }

        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
    });
  };

  const handleConfirm = async () => {
    const processedImage = await applyFilters();
    const transform: ImageTransform = {
      rotation,
      brightness,
      contrast,
    };
    onConfirm(processedImage, transform);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const filterStyle = {
    filter: `brightness(${brightness}%) contrast(${contrast}%)`,
    transform: `rotate(${rotation}deg)`,
  };

  return (
    <div className="flex flex-col h-full">
      <div className="relative flex-1 bg-gray-100 rounded-lg overflow-hidden">
        <img
          src={imageData}
          alt="Preview"
          className="w-full h-full object-contain"
          style={filterStyle}
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {allowEdit && (
        <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Brightness: {brightness}%
            </label>
            <input
              type="range"
              min="50"
              max="150"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contrast: {contrast}%
            </label>
            <input
              type="range"
              min="50"
              max="150"
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <button
            onClick={handleRotate}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Rotate 90°
          </button>
        </div>
      )}

      <div className="flex gap-4 mt-4">
        {onRetake && (
          <button
            onClick={onRetake}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Retake
          </button>
        )}
        <button
          onClick={handleConfirm}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Use This Image
        </button>
      </div>
    </div>
  );
}
