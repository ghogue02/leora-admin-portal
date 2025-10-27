'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor, Smartphone } from 'lucide-react';

interface TemplatePreviewProps {
  template: string;
  subject: string;
  preheader: string;
  productIds: string[];
}

interface Product {
  id: string;
  itemNumber: string;
  description: string;
  price: number;
  imageUrl?: string;
}

export function TemplatePreview({
  template,
  subject,
  preheader,
  productIds
}: TemplatePreviewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    if (productIds.length > 0) {
      loadProducts();
    }
  }, [productIds]);

  const loadProducts = async () => {
    try {
      const response = await fetch(`/api/products?ids=${productIds.join(',')}`);
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const renderTemplate = () => {
    const styles = {
      container: {
        maxWidth: viewMode === 'desktop' ? '600px' : '375px',
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden',
      },
      header: {
        backgroundColor: '#7c3aed',
        color: '#ffffff',
        padding: '32px 24px',
        textAlign: 'center' as const,
      },
      subject: {
        fontSize: '24px',
        fontWeight: 'bold',
        margin: '0 0 8px 0',
      },
      preheader: {
        fontSize: '14px',
        opacity: 0.9,
        margin: 0,
      },
      content: {
        padding: '24px',
      },
      intro: {
        fontSize: '16px',
        lineHeight: '24px',
        marginBottom: '24px',
        color: '#374151',
      },
      productsGrid: {
        display: 'grid',
        gridTemplateColumns: viewMode === 'desktop' ? '1fr 1fr' : '1fr',
        gap: '16px',
        marginBottom: '24px',
      },
      productCard: {
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden',
      },
      productImage: {
        width: '100%',
        height: viewMode === 'desktop' ? '200px' : '150px',
        objectFit: 'cover' as const,
        backgroundColor: '#f3f4f6',
      },
      productInfo: {
        padding: '12px',
      },
      productName: {
        fontSize: '14px',
        fontWeight: 'bold',
        marginBottom: '4px',
        color: '#111827',
      },
      productPrice: {
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#7c3aed',
      },
      cta: {
        display: 'inline-block',
        backgroundColor: '#7c3aed',
        color: '#ffffff',
        padding: '12px 24px',
        borderRadius: '6px',
        textDecoration: 'none',
        fontWeight: 'bold',
        margin: '0 auto',
      },
      footer: {
        backgroundColor: '#f9fafb',
        padding: '24px',
        textAlign: 'center' as const,
        fontSize: '12px',
        color: '#6b7280',
      },
    };

    return (
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.subject}>{subject || 'Email Subject Line'}</h1>
          {preheader && <p style={styles.preheader}>{preheader}</p>}
        </div>

        {/* Content */}
        <div style={styles.content}>
          <p style={styles.intro}>
            We're excited to share these featured products with you. Check out our latest selection!
          </p>

          {/* Products Grid */}
          {products.length > 0 && (
            <div style={styles.productsGrid}>
              {products.map((product) => (
                <div key={product.id} style={styles.productCard}>
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.description}
                      style={styles.productImage}
                    />
                  ) : (
                    <div style={styles.productImage} />
                  )}
                  <div style={styles.productInfo}>
                    <div style={styles.productName}>{product.description}</div>
                    <div style={styles.productPrice}>${product.price.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <a href="#" style={styles.cta}>
              Shop Now
            </a>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={{ margin: '0 0 8px 0' }}>Your Company Name</p>
          <p style={{ margin: '0 0 8px 0' }}>123 Business St, City, ST 12345</p>
          <p style={{ margin: 0 }}>
            <a href="#" style={{ color: '#7c3aed', textDecoration: 'none' }}>
              Unsubscribe
            </a>
            {' | '}
            <a href="#" style={{ color: '#7c3aed', textDecoration: 'none' }}>
              Update Preferences
            </a>
          </p>
        </div>
      </div>
    );
  };

  return (
    <div>
      <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)} className="mb-4">
        <TabsList>
          <TabsTrigger value="desktop" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Desktop
          </TabsTrigger>
          <TabsTrigger value="mobile" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Mobile
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="bg-gray-50 p-8 rounded-lg">
        {renderTemplate()}
      </div>
    </div>
  );
}
