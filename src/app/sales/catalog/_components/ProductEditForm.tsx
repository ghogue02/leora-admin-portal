"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type ProductEditFormProps = {
  skuId: string;
  productData: {
    name: string;
    brand: string | null;
    category: string | null;
    description: string | null;
    vintage: number | null;
    colour: string | null;
    varieties: string | null;
    style: string | null;
    manufacturer: string | null;
  };
  skuData: {
    size: string | null;
    unitOfMeasure: string | null;
    abv: number | null;
    itemsPerCase: number | null;
    bottleBarcode: string | null;
    caseBarcode: string | null;
  };
  onSave: () => void;
  onCancel: () => void;
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function ProductEditForm({
  skuId,
  productData,
  skuData,
  onSave,
  onCancel,
}: ProductEditFormProps) {
  // Store original data for revert functionality
  const originalData = useRef({
    product: { ...productData },
    sku: { ...skuData },
  });

  const [formData, setFormData] = useState({
    product: { ...productData },
    sku: { ...skuData },
  });

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [hasChanges, setHasChanges] = useState(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if form has changes
  useEffect(() => {
    const changed = JSON.stringify(formData) !== JSON.stringify(originalData.current);
    setHasChanges(changed);
  }, [formData]);

  // Auto-save with debouncing
  useEffect(() => {
    if (!hasChanges || saveStatus === 'saving') return;

    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Set new timer for auto-save
    saveTimerRef.current = setTimeout(() => {
      autoSave();
    }, 800); // 800ms debounce

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [formData, hasChanges]);

  const autoSave = async () => {
    if (!hasChanges) return;

    setSaveStatus('saving');
    try {
      console.log("[ProductEditForm] Auto-saving changes:", formData);

      const response = await fetch(`/api/sales/catalog/${skuId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": "well-crafted",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update product");
      }

      const result = await response.json();
      console.log("[ProductEditForm] Auto-save successful:", result);

      // Update original data to current form data
      originalData.current = {
        product: { ...formData.product },
        sku: { ...formData.sku },
      };

      setSaveStatus('saved');

      // Reset to idle after showing "saved" briefly
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);

    } catch (error: any) {
      console.error("[ProductEditForm] Auto-save error:", error);
      setSaveStatus('error');
      toast.error(`❌ Auto-save failed: ${error.message}`, {
        duration: 5000,
      });

      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    }
  };

  const handleRevertAll = () => {
    setFormData({
      product: { ...originalData.current.product },
      sku: { ...originalData.current.sku },
    });
    setHasChanges(false);
    setSaveStatus('idle');
    toast.info("↶ Changes reverted", { duration: 2000 });
  };

  const handleClose = () => {
    // Save any pending changes before closing
    if (hasChanges && saveStatus !== 'saving') {
      autoSave();
    }
    onSave(); // Trigger parent refresh
  };

  const handleSave = async () => {
    await autoSave();
    handleClose();
  };

  return (
    <div className="space-y-6">
      {/* Sticky Header with Save Status & Actions */}
      <div className="sticky top-0 z-20 -mx-6 -mt-6 mb-6 border-b bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Edit Product</h2>

            {/* Save Status Indicator */}
            <div className="flex items-center gap-2 text-sm">
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1.5 text-blue-600">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="font-medium">Saving...</span>
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1.5 text-green-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">Saved</span>
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="flex items-center gap-1.5 text-red-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Save failed</span>
                </span>
              )}
              {saveStatus === 'idle' && hasChanges && (
                <span className="text-amber-600 font-medium">• Unsaved changes</span>
              )}
              {saveStatus === 'idle' && !hasChanges && (
                <span className="text-gray-500">No changes</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Button
                variant="outline"
                onClick={handleRevertAll}
                disabled={saveStatus === 'saving'}
                className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Revert All
              </Button>
            )}
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={saveStatus === 'saving'}
            >
              Cancel
            </Button>
            <Button
              onClick={handleClose}
              disabled={saveStatus === 'saving'}
              className="bg-green-600 hover:bg-green-700"
            >
              {saveStatus === 'saving' ? 'Saving...' : 'Save & Close'}
            </Button>
          </div>
        </div>
      </div>

      {/* Product Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Product Information</h3>

        <div>
          <Label htmlFor="name">Product Name *</Label>
          <Input
            id="name"
            value={formData.product.name}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                product: { ...prev.product, name: e.target.value },
              }))
            }
            className={formData.product.name !== originalData.current.product.name ? "border-amber-300 bg-amber-50/30" : ""}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="brand">Brand</Label>
            <Input
              id="brand"
              value={formData.product.brand || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  product: { ...prev.product, brand: e.target.value },
                }))
              }
              className={formData.product.brand !== originalData.current.product.brand ? "border-amber-300 bg-amber-50/30" : ""}
            />
          </div>

          <div>
            <Label htmlFor="manufacturer">Manufacturer</Label>
            <Input
              id="manufacturer"
              value={formData.product.manufacturer || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  product: { ...prev.product, manufacturer: e.target.value },
                }))
              }
              className={formData.product.manufacturer !== originalData.current.product.manufacturer ? "border-amber-300 bg-amber-50/30" : ""}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.product.description || ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                product: { ...prev.product, description: e.target.value },
              }))
            }
            rows={3}
            className={formData.product.description !== originalData.current.product.description ? "border-amber-300 bg-amber-50/30" : ""}
          />
        </div>
      </div>

      {/* Wine Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Wine Details</h3>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="vintage">Vintage (Year)</Label>
            <Input
              id="vintage"
              type="number"
              value={formData.product.vintage || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  product: { ...prev.product, vintage: e.target.value ? parseInt(e.target.value) : null },
                }))
              }
              placeholder="2020"
              className={formData.product.vintage !== originalData.current.product.vintage ? "border-amber-300 bg-amber-50/30" : ""}
            />
          </div>

          <div>
            <Label htmlFor="colour">Wine Colour</Label>
            <Input
              id="colour"
              value={formData.product.colour || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  product: { ...prev.product, colour: e.target.value },
                }))
              }
              placeholder="Red, White, Rose"
              className={formData.product.colour !== originalData.current.product.colour ? "border-amber-300 bg-amber-50/30" : ""}
            />
          </div>

          <div>
            <Label htmlFor="style">Style</Label>
            <Input
              id="style"
              value={formData.product.style || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  product: { ...prev.product, style: e.target.value },
                }))
              }
              placeholder="Still, Sparkling"
              className={formData.product.style !== originalData.current.product.style ? "border-amber-300 bg-amber-50/30" : ""}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="varieties">Grape Varieties</Label>
          <Input
            id="varieties"
            value={formData.product.varieties || ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                product: { ...prev.product, varieties: e.target.value },
              }))
            }
            placeholder="Cabernet Sauvignon, Merlot"
            className={formData.product.varieties !== originalData.current.product.varieties ? "border-amber-300 bg-amber-50/30" : ""}
          />
        </div>
      </div>

      {/* SKU Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">SKU Details</h3>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="size">Size</Label>
            <Input
              id="size"
              value={formData.sku.size || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  sku: { ...prev.sku, size: e.target.value },
                }))
              }
              placeholder="750 ml"
              className={formData.sku.size !== originalData.current.sku.size ? "border-amber-300 bg-amber-50/30" : ""}
            />
          </div>

          <div>
            <Label htmlFor="abv">ABV %</Label>
            <Input
              id="abv"
              type="number"
              step="0.1"
              value={formData.sku.abv || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  sku: { ...prev.sku, abv: e.target.value ? parseFloat(e.target.value) : null },
                }))
              }
              placeholder="14.5"
              className={formData.sku.abv !== originalData.current.sku.abv ? "border-amber-300 bg-amber-50/30" : ""}
            />
          </div>

          <div>
            <Label htmlFor="itemsPerCase">Items per Case</Label>
            <Input
              id="itemsPerCase"
              type="number"
              value={formData.sku.itemsPerCase || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  sku: { ...prev.sku, itemsPerCase: e.target.value ? parseInt(e.target.value) : null },
                }))
              }
              placeholder="12"
              className={formData.sku.itemsPerCase !== originalData.current.sku.itemsPerCase ? "border-amber-300 bg-amber-50/30" : ""}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="bottleBarcode">Bottle Barcode (UPC)</Label>
            <Input
              id="bottleBarcode"
              value={formData.sku.bottleBarcode || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  sku: { ...prev.sku, bottleBarcode: e.target.value },
                }))
              }
              placeholder="UPC code"
              className={formData.sku.bottleBarcode !== originalData.current.sku.bottleBarcode ? "border-amber-300 bg-amber-50/30" : ""}
            />
          </div>

          <div>
            <Label htmlFor="caseBarcode">Case Barcode (UPC)</Label>
            <Input
              id="caseBarcode"
              value={formData.sku.caseBarcode || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  sku: { ...prev.sku, caseBarcode: e.target.value },
                }))
              }
              placeholder="Case UPC code"
              className={formData.sku.caseBarcode !== originalData.current.sku.caseBarcode ? "border-amber-300 bg-amber-50/30" : ""}
            />
          </div>
        </div>
      </div>

      {/* Info Footer */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
        <div className="flex items-start gap-2">
          <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-medium">Auto-save enabled</p>
            <p className="mt-0.5 text-xs text-blue-700">
              Changes are automatically saved as you type. Modified fields are highlighted in amber.
              Use "Revert All" to undo all changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
