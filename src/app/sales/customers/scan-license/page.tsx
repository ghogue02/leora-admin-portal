'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CameraCapture } from '@/components/scanner/CameraCapture';
import { ImagePreview } from '@/components/scanner/ImagePreview';
import { tesseractOCR } from '@/lib/ocr/tesseract';
import type { LicenseData, ImageTransform } from '@/types/scanner';

type ScanStep = 'camera' | 'preview' | 'processing' | 'form' | 'verification';

export default function ScanLicensePage() {
  const router = useRouter();
  const [step, setStep] = useState<ScanStep>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scannedData, setScannedData] = useState<LicenseData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<LicenseData>({
    licenseNumber: '',
  });
  const [verificationStatus, setVerificationStatus] = useState<
    'pending' | 'verified' | 'invalid' | 'expired'
  >('pending');

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
      const result = await tesseractOCR.scanLicense(processedImage);

      if (result.success && result.data) {
        setScannedData(result.data);
        setFormData(result.data);
        setStep('form');
      } else {
        setError(result.error || 'Failed to extract license number');
        setStep('preview');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR processing failed');
      setStep('preview');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFormChange = (field: keyof LicenseData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleVerifyLicense = async () => {
    setStep('verification');
    setIsProcessing(true);

    try {
      // TODO: Call actual license verification API
      // For now, simulate verification
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simulate verification result
      const isValid = formData.licenseNumber.length > 0;
      setVerificationStatus(isValid ? 'verified' : 'invalid');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setVerificationStatus('invalid');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateCustomer = async () => {
    try {
      // TODO: Integrate with Supabase
      // 1. Upload license image to Supabase Storage
      // 2. Create customer record with license data
      // 3. Store license expiration for compliance tracking

      console.log('Creating customer with license:', formData);
      console.log('Image data:', capturedImage);
      console.log('Verification status:', verificationStatus);

      // Navigate to customer creation with pre-filled data
      const params = new URLSearchParams();
      if (formData.businessName) params.set('company', formData.businessName);
      if (formData.licenseNumber) params.set('license', formData.licenseNumber);
      if (formData.address) params.set('address', formData.address);
      if (formData.expirationDate) params.set('license_expiry', formData.expirationDate);

      router.push(`/sales/customers/new?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer');
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
          <h1 className="text-2xl font-bold text-gray-900">Scan Liquor License</h1>
          <p className="text-gray-600 mt-1">
            Take a photo of a liquor license placard to verify and create customer
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <Step number={1} label="Capture" active={step === 'camera' || step === 'preview'} />
            <div className="flex-1 h-1 bg-gray-200 mx-2">
              <div
                className={`h-full transition-all ${
                  step === 'processing' || step === 'form' || step === 'verification'
                    ? 'bg-blue-600'
                    : 'bg-gray-200'
                }`}
              />
            </div>
            <Step number={2} label="Extract" active={step === 'processing' || step === 'form'} />
            <div className="flex-1 h-1 bg-gray-200 mx-2">
              <div
                className={`h-full transition-all ${
                  step === 'verification' ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            </div>
            <Step number={3} label="Verify" active={step === 'verification'} />
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
              <p className="text-gray-600">Processing license placard...</p>
              <p className="text-sm text-gray-500 mt-2">
                Extracting license information using OCR
              </p>
            </div>
          )}

          {step === 'form' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Review License Information
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Please verify the license details extracted from the image
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => handleFormChange('licenseNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter license number"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={formData.businessName || ''}
                  onChange={(e) => handleFormChange('businessName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter business name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Type
                </label>
                <input
                  type="text"
                  value={formData.licenseType || ''}
                  onChange={(e) => handleFormChange('licenseType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., On-Premises, Off-Premises, Retail"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={formData.issueDate || ''}
                    onChange={(e) => handleFormChange('issueDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiration Date
                  </label>
                  <input
                    type="date"
                    value={formData.expirationDate || ''}
                    onChange={(e) => handleFormChange('expirationDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={formData.address || ''}
                  onChange={(e) => handleFormChange('address', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter licensed premises address"
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
                  Scan Again
                </button>
                <button
                  onClick={handleVerifyLicense}
                  disabled={!formData.licenseNumber}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Verify License
                </button>
              </div>
            </div>
          )}

          {step === 'verification' && (
            <div className="space-y-6">
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4" />
                  <p className="text-gray-600">Verifying license...</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Checking license status with authorities
                  </p>
                </div>
              ) : (
                <>
                  {/* Verification Result */}
                  <div
                    className={`p-6 rounded-lg border-2 ${
                      verificationStatus === 'verified'
                        ? 'bg-green-50 border-green-500'
                        : verificationStatus === 'expired'
                        ? 'bg-yellow-50 border-yellow-500'
                        : 'bg-red-50 border-red-500'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {verificationStatus === 'verified' ? (
                          <svg
                            className="w-8 h-8 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-8 h-8 text-red-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3
                          className={`text-lg font-semibold mb-2 ${
                            verificationStatus === 'verified'
                              ? 'text-green-900'
                              : verificationStatus === 'expired'
                              ? 'text-yellow-900'
                              : 'text-red-900'
                          }`}
                        >
                          {verificationStatus === 'verified'
                            ? 'License Verified'
                            : verificationStatus === 'expired'
                            ? 'License Expired'
                            : 'License Invalid'}
                        </h3>
                        <p
                          className={`${
                            verificationStatus === 'verified'
                              ? 'text-green-700'
                              : verificationStatus === 'expired'
                              ? 'text-yellow-700'
                              : 'text-red-700'
                          }`}
                        >
                          {verificationStatus === 'verified'
                            ? 'This license is valid and active. You can proceed to create the customer account.'
                            : verificationStatus === 'expired'
                            ? 'This license has expired. Please request a current license from the customer.'
                            : 'This license could not be verified. Please check the license number and try again.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* License Details */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">License Details</h4>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-600">License Number:</dt>
                        <dd className="text-sm font-medium text-gray-900">
                          {formData.licenseNumber}
                        </dd>
                      </div>
                      {formData.businessName && (
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600">Business Name:</dt>
                          <dd className="text-sm font-medium text-gray-900">
                            {formData.businessName}
                          </dd>
                        </div>
                      )}
                      {formData.licenseType && (
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600">License Type:</dt>
                          <dd className="text-sm font-medium text-gray-900">
                            {formData.licenseType}
                          </dd>
                        </div>
                      )}
                      {formData.expirationDate && (
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600">Expires:</dt>
                          <dd className="text-sm font-medium text-gray-900">
                            {new Date(formData.expirationDate).toLocaleDateString()}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-4">
                    <button
                      onClick={() => setStep('form')}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Edit Details
                    </button>
                    <button
                      onClick={handleCreateCustomer}
                      disabled={verificationStatus === 'invalid'}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Create Customer
                    </button>
                  </div>

                  {verificationStatus === 'expired' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">
                        Warning: Creating a customer with an expired license may require additional
                        compliance review. Ensure you have documented proof of license renewal.
                      </p>
                    </div>
                  )}
                </>
              )}
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
