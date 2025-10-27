'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Package, Check } from 'lucide-react';
import FeedbackButtons from '../components/FeedbackButtons';

type Product = {
  id: string;
  skuCode: string;
  productName: string;
  brand: string;
  supplier: string;
  imageUrl?: string;
};

type Customer = {
  id: string;
  name: string;
  accountNumber: string;
};

export default function QuickAssignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId');

  const [step, setStep] = useState<'product' | 'customer' | 'details'>('product');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedFeedback, setSelectedFeedback] = useState<string[]>([]);
  const [customFeedback, setCustomFeedback] = useState('');
  const [needsFollowUp, setNeedsFollowUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Load preselected customer
  useEffect(() => {
    if (preselectedCustomerId) {
      loadCustomer(preselectedCustomerId);
    }
  }, [preselectedCustomerId]);

  const loadCustomer = async (customerId: string) => {
    try {
      const response = await fetch(`/api/sales/customers/${customerId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedCustomer({
          id: data.customer.id,
          name: data.customer.name,
          accountNumber: data.customer.accountNumber,
        });
        setStep('product');
      }
    } catch (error) {
      console.error('Failed to load customer:', error);
    }
  };

  const searchProducts = async (query: string) => {
    if (query.length < 2) {
      setProducts([]);
      return;
    }

    setLoadingProducts(true);
    try {
      const response = await fetch(`/api/sales/catalog/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Product search failed:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const searchCustomers = async (query: string) => {
    if (query.length < 2) {
      setCustomers([]);
      return;
    }

    setLoadingCustomers(true);
    try {
      const response = await fetch(`/api/sales/customers/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error('Customer search failed:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => searchProducts(productSearch), 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  useEffect(() => {
    const timer = setTimeout(() => searchCustomers(customerSearch), 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  const handleSubmit = async () => {
    if (!selectedProduct || !selectedCustomer) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/sales/samples/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          skuCode: selectedProduct.skuCode,
          quantity,
          feedback: [...selectedFeedback, customFeedback].filter(Boolean).join('; '),
          needsFollowUp,
        }),
      });

      if (response.ok) {
        setSuccess(true);
        // Create activity
        await fetch('/api/sales/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: selectedCustomer.id,
            typeCode: 'sample-tasting',
            subject: `Sample: ${selectedProduct.productName}`,
            notes: `Qty: ${quantity}. ${[...selectedFeedback, customFeedback].filter(Boolean).join('; ')}`,
            needsFollowUp,
          }),
        });

        setTimeout(() => {
          router.push('/sales/samples');
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to assign sample:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-6 p-6 pt-20">
        <div className="rounded-full bg-green-100 p-4">
          <Check className="h-12 w-12 text-green-600" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Sample Assigned!</h1>
          <p className="mt-2 text-gray-600">
            Activity logged for {selectedCustomer?.name}
          </p>
          <p className="mt-1 text-sm text-gray-500">Redirecting to samples page...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      {/* Header */}
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
          Quick Assignment
        </p>
        <h1 className="text-3xl font-semibold text-gray-900">Assign Sample</h1>
        <p className="mt-1 text-sm text-gray-600">Fast sample distribution with instant activity logging</p>
      </header>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {['product', 'customer', 'details'].map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div
              className={`flex-1 rounded-full ${
                step === s
                  ? 'bg-blue-600'
                  : selectedProduct && (s === 'customer' || s === 'product') ||
                      selectedCustomer && s === 'customer'
                    ? 'bg-green-600'
                    : 'bg-gray-300'
              } h-2`}
            ></div>
            {i < 2 && <span className="text-gray-400">→</span>}
          </div>
        ))}
      </div>

      {/* Product Selection */}
      {step === 'product' && (
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Select Product/SKU</h2>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by product name or SKU code..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full rounded-md border border-gray-300 py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {loadingProducts && (
            <div className="mt-4 text-center text-sm text-gray-500">Searching...</div>
          )}

          {products.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => {
                    setSelectedProduct(product);
                    setStep(preselectedCustomerId ? 'details' : 'customer');
                  }}
                  className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-blue-600 hover:bg-blue-50"
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-slate-100">
                    <Package className="h-6 w-6 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{product.productName}</p>
                    <p className="text-xs text-gray-500">{product.brand} - {product.skuCode}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Customer Selection */}
      {step === 'customer' && !preselectedCustomerId && (
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Select Customer</h2>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer name or account number..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full rounded-md border border-gray-300 py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {loadingCustomers && (
            <div className="mt-4 text-center text-sm text-gray-500">Searching...</div>
          )}

          {customers.length > 0 && (
            <div className="mt-4 space-y-2">
              {customers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setStep('details');
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-blue-600 hover:bg-blue-50"
                >
                  <div>
                    <p className="font-medium text-gray-900">{customer.name}</p>
                    <p className="text-xs text-gray-500">#{customer.accountNumber}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Details & Feedback */}
      {step === 'details' && selectedProduct && selectedCustomer && (
        <section className="space-y-6">
          {/* Summary */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-blue-600">Product</p>
                <p className="mt-1 font-semibold text-blue-900">{selectedProduct.productName}</p>
                <p className="text-xs text-blue-700">{selectedProduct.skuCode}</p>
              </div>
              <div>
                <p className="text-xs text-blue-600">Customer</p>
                <p className="mt-1 font-semibold text-blue-900">{selectedCustomer.name}</p>
                <p className="text-xs text-blue-700">#{selectedCustomer.accountNumber}</p>
              </div>
            </div>
          </div>

          {/* Quantity */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <label className="text-sm font-semibold text-gray-900">Quantity</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="mt-2 w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Feedback */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900">Customer Feedback</h3>
            <div className="mt-4">
              <FeedbackButtons
                multiSelect={true}
                selectedFeedback={selectedFeedback}
                onFeedbackChange={setSelectedFeedback}
                customFeedback={customFeedback}
                onCustomFeedbackChange={setCustomFeedback}
              />
            </div>
          </div>

          {/* Follow-up */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={needsFollowUp}
                onChange={(e) => setNeedsFollowUp(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-900">Needs follow-up</span>
            </label>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep(preselectedCustomerId ? 'product' : 'customer')}
              className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 rounded-md border border-blue-600 bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit & Log Activity'}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
