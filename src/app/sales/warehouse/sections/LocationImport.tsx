'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Download, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface LocationImportProps {
  onImport: (data: Array<{ sku: string; aisle: string; row: string; shelf: string }>) => Promise<void>;
}

export function LocationImport({ onImport }: LocationImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const downloadTemplate = () => {
    const csv = 'SKU,Aisle,Row,Shelf\nWG-001,A,1,1\nCS-102,A,1,2\nWA-205,A,2,1';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'warehouse-locations-template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    parseCSV(selectedFile);
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());

      // Skip header
      const dataLines = lines.slice(1);

      const parsed: any[] = [];
      const validationErrors: string[] = [];

      dataLines.forEach((line, index) => {
        const [sku, aisle, row, shelf] = line.split(',').map(s => s.trim());

        // Validate
        if (!sku || !aisle || !row || !shelf) {
          validationErrors.push(`Row ${index + 2}: Missing required fields`);
          return;
        }

        parsed.push({ sku, aisle, row, shelf });
      });

      setPreview(parsed);
      setErrors(validationErrors);
    };

    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (errors.length > 0) {
      toast.error('Please fix validation errors before importing');
      return;
    }

    if (preview.length === 0) {
      toast.error('No valid data to import');
      return;
    }

    setIsImporting(true);
    try {
      await onImport(preview);
      toast.success(`Successfully imported ${preview.length} locations`);
      setFile(null);
      setPreview([]);
      setErrors([]);
    } catch (error) {
      toast.error('Failed to import locations');
      console.error(error);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Upload className="mr-2 h-5 w-5" />
          Bulk Location Import
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Template Download */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded">
            <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-blue-900">CSV Template</div>
              <div className="text-sm text-blue-700 mt-1">
                Download the template to see the required format
              </div>
            </div>
            <Button onClick={downloadTemplate} variant="outline" size="sm" className="touch-target">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>

          {/* File Upload */}
          <div>
            <label className="block">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 cursor-pointer transition-colors">
                <Upload className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <div className="text-sm font-semibold mb-1">
                  {file ? file.name : 'Click to upload CSV file'}
                </div>
                <div className="text-xs text-gray-500">
                  CSV file with SKU, Aisle, Row, Shelf columns
                </div>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Validation Errors */}
          {errors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <div className="flex items-center gap-2 font-semibold text-red-900 mb-2">
                <AlertCircle className="h-5 w-5" />
                Validation Errors ({errors.length})
              </div>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.slice(0, 10).map((error, idx) => (
                  <li key={idx}>• {error}</li>
                ))}
                {errors.length > 10 && (
                  <li className="font-semibold">... and {errors.length - 10} more</li>
                )}
              </ul>
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div className="border rounded">
              <div className="p-3 bg-gray-50 border-b flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Preview ({preview.length} rows)
                </div>
              </div>
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">SKU</th>
                      <th className="p-2 text-left">Aisle</th>
                      <th className="p-2 text-left">Row</th>
                      <th className="p-2 text-left">Shelf</th>
                      <th className="p-2 text-left">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 50).map((row, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2 font-mono">{row.sku}</td>
                        <td className="p-2">{row.aisle}</td>
                        <td className="p-2">{row.row}</td>
                        <td className="p-2">{row.shelf}</td>
                        <td className="p-2 font-mono font-semibold">
                          {row.aisle}-{row.row}-{row.shelf}
                        </td>
                      </tr>
                    ))}
                    {preview.length > 50 && (
                      <tr>
                        <td colSpan={5} className="p-2 text-center text-gray-500">
                          ... and {preview.length - 50} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Button */}
          {preview.length > 0 && (
            <Button
              onClick={handleImport}
              disabled={errors.length > 0 || isImporting}
              className="w-full touch-target"
              size="lg"
            >
              <Upload className="mr-2 h-5 w-5" />
              {isImporting ? 'Importing...' : `Import ${preview.length} Locations`}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
