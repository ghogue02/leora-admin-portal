/**
 * Invoice Format Selector Component
 *
 * Allows manual selection of invoice format with auto-detection
 */

'use client';

import React from 'react';
import { InvoiceFormatType } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

interface InvoiceFormatSelectorProps {
  selectedFormat: InvoiceFormatType;
  recommendedFormat?: InvoiceFormatType;
  customerState?: string | null;
  onChange: (format: InvoiceFormatType) => void;
  disabled?: boolean;
}

const FORMAT_DESCRIPTIONS = {
  STANDARD: {
    label: 'Standard Invoice',
    description: 'General purpose invoice for all customers',
    features: ['Simple layout', 'No state-specific requirements', 'Fast generation'],
    icon: '📄',
  },
  VA_ABC_INSTATE: {
    label: 'VA ABC In-State',
    description: 'Virginia ABC format for in-state sales (excise tax applied)',
    features: [
      'Three-column header',
      'Wholesaler license displayed',
      'Excise tax calculated ($0.40/liter)',
      'Retailer signature section',
      'VA ABC compliant',
    ],
    icon: '🏛️',
  },
  VA_ABC_TAX_EXEMPT: {
    label: 'VA ABC Tax-Exempt',
    description: 'Virginia ABC format for out-of-state sales (no excise tax)',
    features: [
      'Two-page layout',
      'Cases and bottles display',
      'Fractional case support',
      'Transportation section',
      'Tax-exempt compliance',
    ],
    icon: '📋',
  },
};

export function InvoiceFormatSelector({
  selectedFormat,
  recommendedFormat,
  customerState,
  onChange,
  disabled = false,
}: InvoiceFormatSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Format</CardTitle>
        <CardDescription>
          Select the invoice format based on customer location and compliance requirements
          {recommendedFormat && (
            <span className="block mt-2 text-sm">
              <Badge variant="secondary" className="mr-2">
                Recommended
              </Badge>
              {FORMAT_DESCRIPTIONS[recommendedFormat].label}
              {customerState && ` (Customer in ${customerState})`}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedFormat}
          onValueChange={(value) => onChange(value as InvoiceFormatType)}
          disabled={disabled}
          className="space-y-4"
        >
          {(Object.keys(FORMAT_DESCRIPTIONS) as InvoiceFormatType[]).map((format) => {
            const info = FORMAT_DESCRIPTIONS[format];
            const isRecommended = format === recommendedFormat;

            return (
              <div
                key={format}
                className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors ${
                  selectedFormat === format
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                } ${isRecommended ? 'ring-2 ring-blue-200' : ''}`}
              >
                <RadioGroupItem value={format} id={format} className="mt-1" />
                <Label htmlFor={format} className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{info.icon}</span>
                    <span className="font-semibold">{info.label}</span>
                    {isRecommended && (
                      <Badge variant="default" className="ml-2">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{info.description}</p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    {info.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-1">
                        <span className="text-green-600">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </Label>
              </div>
            );
          })}
        </RadioGroup>

        {selectedFormat !== recommendedFormat && recommendedFormat && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <strong>Note:</strong> You've selected a different format than recommended.
              The recommended format for {customerState || 'this customer'} is{' '}
              <strong>{FORMAT_DESCRIPTIONS[recommendedFormat].label}</strong>.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
