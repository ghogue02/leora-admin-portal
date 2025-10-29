"use client";

import { useState } from "react";
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

export function ProductEditForm({
  skuId,
  productData,
  skuData,
  onSave,
  onCancel,
}: ProductEditFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    product: { ...productData },
    sku: { ...skuData },
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/sales/catalog/${skuId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update product");
      }

      toast.success("Product updated successfully");
      onSave();
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast.error(error.message || "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
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
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="bottleBarcode">Bottle Barcode</Label>
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
            />
          </div>

          <div>
            <Label htmlFor="caseBarcode">Case Barcode</Label>
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
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 border-t pt-4">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
