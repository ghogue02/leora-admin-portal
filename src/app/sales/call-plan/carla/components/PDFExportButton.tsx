"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

interface PDFExportButtonProps {
  callPlanId?: string;
  weekStart: Date;
  accountCount: number;
}

interface PDFOptions {
  includeObjectives: boolean;
  includeNotes: boolean;
  includeMap: boolean;
  includeDirections: boolean;
  includeProductRecommendations: boolean;
}

export default function PDFExportButton({
  callPlanId,
  weekStart,
  accountCount,
}: PDFExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions] = useState<PDFOptions>({
    includeObjectives: true,
    includeNotes: true,
    includeMap: true,
    includeDirections: false,
    includeProductRecommendations: true,
  });

  const handleExportPDF = async () => {
    if (!callPlanId) {
      toast.error("No call plan to export");
      return;
    }

    setIsExporting(true);
    try {
      const queryParams = new URLSearchParams({
        callPlanId,
        ...Object.fromEntries(
          Object.entries(options).map(([key, value]) => [key, String(value)])
        ),
      });

      const response = await fetch(`/api/sales/call-plan/carla/export/pdf?${queryParams}`);

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `call-plan-${weekStart.toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Call plan exported successfully");
      setShowOptions(false);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to export call plan");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handlePrint}
          disabled={accountCount === 0}
          className="gap-2"
        >
          <Printer className="h-4 w-4" />
          Print
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowOptions(true)}
          disabled={!callPlanId || accountCount === 0}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          Export PDF
        </Button>
      </div>

      <Dialog open={showOptions} onOpenChange={setShowOptions}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Call Plan to PDF</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              Customize what to include in your exported call plan:
            </p>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="objectives"
                  checked={options.includeObjectives}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, includeObjectives: checked as boolean })
                  }
                />
                <label
                  htmlFor="objectives"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Include account objectives
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notes"
                  checked={options.includeNotes}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, includeNotes: checked as boolean })
                  }
                />
                <label
                  htmlFor="notes"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Include account notes
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="map"
                  checked={options.includeMap}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, includeMap: checked as boolean })
                  }
                />
                <label
                  htmlFor="map"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Include territory map
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="directions"
                  checked={options.includeDirections}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, includeDirections: checked as boolean })
                  }
                />
                <label
                  htmlFor="directions"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Include driving directions
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="recommendations"
                  checked={options.includeProductRecommendations}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, includeProductRecommendations: checked as boolean })
                  }
                />
                <label
                  htmlFor="recommendations"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Include product recommendations
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOptions(false)}>
              Cancel
            </Button>
            <Button onClick={handleExportPDF} disabled={isExporting} className="gap-2">
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Export PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
