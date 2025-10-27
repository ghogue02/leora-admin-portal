'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CameraCapture } from '@/components/scanner/CameraCapture';
import { ImagePreview } from '@/components/scanner/ImagePreview';
import { tesseractOCR } from '@/lib/ocr/tesseract';
import type { BusinessCardData, ImageTransform } from '@/types/scanner';

type ScanStep = 'camera' | 'preview' | 'processing' | 'form';

export default function ScanBusinessCardPage() {
  const router = useRouter();
  const [step, setStep] = useState<ScanStep>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scannedData, setScannedData] = useState<BusinessCardData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<BusinessCardData>({});

  const handleCapture = (imageData: string, transform?: ImageTransform) => {
    setCapturedImage(imageData);
    setStep('preview');
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setStep('camera');
  };

  const handleConfirmImage = async (processedImage: string, transform?: ImageTransform) => {
    setStep('processing');
    setIsProcessing(true);
    setError(null);

    try {
      // Initialize OCR if needed
      await tesseractOCR.initialize();

      // Perform OCR
      const result = await tesseractOCR.scanBusinessCard(processedImage);

      if (result.success && result.data) {
        setScannedData(result.data);
        setFormData(result.data);
        setStep('form');
      } else {
        setError(result.error || 'Failed to extract data from business card');
        setStep('preview');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR processing failed');
      setStep('preview');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFormChange = (field: keyof BusinessCardData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveCustomer = async () => {
    try {
      // TODO: Integrate with Supabase to create customer
      // 1. Upload image to Supabase Storage
      // 2. Create customer record with extracted data
      // 3. Store image reference in customer record

      console.log('Saving customer:', formData);
      console.log('Image data:', capturedImage);

      // For now, navigate to customer creation page with pre-filled data
      const params = new URLSearchParams();
      if (formData.companyName) params.set('company', formData.companyName);
      if (formData.contactName) params.set('name', formData.contactName);
      if (formData.email) params.set('email', formData.email);
      if (formData.phone) params.set('phone', formData.phone);
      if (formData.address) params.set('address', formData.address);

      router.push(`/sales/customers/new?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save customer');
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Scan Business Card</h1>
          <p className="text-gray-600 mt-1">
            Take a photo of a business card to automatically create a customer
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <Step number={1} label="Capture" active={step === 'camera' || step === 'preview'} />
            <div className="flex-1 h-1 bg-gray-200 mx-2">
              <div
                className={`h-full transition-all ${
                  step === 'processing' || step === 'form' ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            </div>
            <Step number={2} label="Process" active={step === 'processing'} />
            <div className="flex-1 h-1 bg-gray-200 mx-2">
              <div
                className={`h-full transition-all ${
                  step === 'form' ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            </div>
            <Step number={3} label="Review" active={step === 'form'} />
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Content based on step */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {step === 'camera' && (
            <CameraCapture onCapture={handleCapture} onCancel={handleCancel} />
          )}

          {step === 'preview' && capturedImage && (
            <ImagePreview
              imageData={capturedImage}
              onConfirm={handleConfirmImage}
              onRetake={handleRetake}
            />
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4" />
              <p className="text-gray-600">Processing business card...</p>
              <p className="text-sm text-gray-500 mt-2">
                Extracting contact information using OCR
              </p>
            </div>
          )}

          {step === 'form' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Review Extracted Information
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Please review and edit the information extracted from the business card
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={formData.companyName || ''}
                  onChange={(e) => handleFormChange('companyName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={formData.contactName || ''}
                  onChange={(e) => handleFormChange('contactName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter contact name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter job title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleFormChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={formData.address || ''}
                  onChange={(e) => handleFormChange('address', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="url"
                  value={formData.website || ''}
                  onChange={(e) => handleFormChange('website', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter website"
                />
              </div>

              {scannedData?.rawText && (
                <details className="mt-4">
                  <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                    View Raw OCR Text
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto">
                    {scannedData.rawText}
                  </pre>
                </details>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleRetake}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Scan Another Card
                </button>
                <button
                  onClick={handleSaveCustomer}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Customer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({
  number,
  label,
  active,
}: {
  number: number;
  label: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
        }`}
      >
        {number}
      </div>
      <span className={`text-sm font-medium ${active ? 'text-gray-900' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
}
