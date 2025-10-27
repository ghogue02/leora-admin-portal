'use client';

import { useState, useEffect } from 'react';
import { Download, FileText } from 'lucide-react';

type SupplierMetrics = {
  supplierId: string;
  supplierName: string;
  totalSamples: number;
  conversions: number;
  conversionRate: number;
  revenueGenerated: number;
  topProducts: Array<{
    productName: string;
    skuCode: string;
    samples: number;
    conversions: number;
  }>;
};

export default function SupplierReport() {
  const [suppliers, setSuppliers] = useState<SupplierMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);

  useEffect(() => {
    loadSupplierData();
  }, []);

  const loadSupplierData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sales/analytics/samples/suppliers');
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data.suppliers || []);
      }
    } catch (error) {
      console.error('Failed to load supplier data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (supplierId: string, supplierName: string) => {
    try {
      const response = await fetch(
        `/api/sales/analytics/samples/suppliers/${supplierId}/export?format=pdf`
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${supplierName.replace(/\s+/g, '-')}-sample-report.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Supplier Performance Reports</h2>
          <p className="text-xs text-gray-500">
            Export supplier-specific metrics for sharing and collaboration
          </p>
        </div>
        <FileText className="h-5 w-5 text-gray-400" />
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="py-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-500">Loading supplier data...</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-sm text-gray-500">No supplier data available</p>
          </div>
        ) : (
          suppliers.map((supplier) => (
            <div
              key={supplier.supplierId}
              className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{supplier.supplierName}</h3>

                  <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-gray-500">Samples Given</p>
                      <p className="mt-1 text-lg font-semibold text-gray-900">
                        {supplier.totalSamples}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Conversions</p>
                      <p className="mt-1 text-lg font-semibold text-green-600">
                        {supplier.conversions}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Conv. Rate</p>
                      <p className="mt-1 text-lg font-semibold text-blue-600">
                        {(supplier.conversionRate * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Revenue</p>
                      <p className="mt-1 text-lg font-semibold text-purple-600">
                        ${supplier.revenueGenerated.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {selectedSupplier === supplier.supplierId && (
                    <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase text-gray-600">
                        Top Products
                      </p>
                      <div className="space-y-2">
                        {supplier.topProducts.map((product) => (
                          <div
                            key={product.skuCode}
                            className="flex items-center justify-between text-xs"
                          >
                            <div>
                              <p className="font-medium text-gray-900">{product.productName}</p>
                              <p className="text-gray-500">{product.skuCode}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-gray-900">
                                {product.conversions}/{product.samples}
                              </p>
                              <p className="text-gray-500">
                                {product.samples > 0
                                  ? ((product.conversions / product.samples) * 100).toFixed(1)
                                  : 0}
                                %
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="ml-4 flex flex-col gap-2">
                  <button
                    onClick={() => handleDownloadPDF(supplier.supplierId, supplier.supplierName)}
                    className="flex items-center gap-2 rounded-md border border-blue-600 bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
                    title="Download PDF Report"
                  >
                    <Download className="h-3 w-3" />
                    PDF
                  </button>
                  <button
                    onClick={() =>
                      setSelectedSupplier(
                        selectedSupplier === supplier.supplierId ? null : supplier.supplierId
                      )
                    }
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    {selectedSupplier === supplier.supplierId ? 'Hide' : 'Details'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 p-4">
        <p className="text-xs text-gray-700">
          <strong>💡 Share with suppliers:</strong> Download PDF reports to show ROI and encourage
          continued sample support. These reports help justify sample programs to your partners.
        </p>
      </div>
    </section>
  );
}
