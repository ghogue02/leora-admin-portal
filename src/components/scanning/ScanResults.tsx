'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Save,
  UserPlus,
  MapPin,
  Building2,
  Mail,
  Phone,
  User,
  Briefcase,
  FileText,
  Calendar,
  Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FieldData {
  value: string;
  confidence: number;
}

interface ExtractedData {
  type: 'business-card' | 'liquor-license';
  confidence: number;
  fields: {
    // Business card fields
    name?: FieldData;
    title?: FieldData;
    company?: FieldData;
    phone?: FieldData;
    email?: FieldData;
    address?: FieldData;
    // License fields
    businessName?: FieldData;
    licenseNumber?: FieldData;
    licenseType?: FieldData;
    expirationDate?: FieldData;
  };
}

interface ScanResultsProps {
  data: ExtractedData;
  onReset: () => void;
  onBack: () => void;
}

export default function ScanResults({ data, onReset, onBack }: ScanResultsProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<Record<string, string>>(
    Object.entries(data.fields).reduce((acc, [key, value]) => ({
      ...acc,
      [key]: value?.value || ''
    }), {})
  );
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) return <Badge variant="default" className="bg-green-600">High</Badge>;
    if (confidence >= 0.7) return <Badge variant="secondary" className="bg-yellow-600">Medium</Badge>;
    return <Badge variant="destructive">Low</Badge>;
  };

  const handleCreateCustomer = async () => {
    setIsCreating(true);
    try {
      const customerData = data.type === 'business-card' ? {
        name: formData.name,
        title: formData.title,
        company: formData.company,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
      } : {
        businessName: formData.businessName,
        licenseNumber: formData.licenseNumber,
        licenseType: formData.licenseType,
        address: formData.address,
        expirationDate: formData.expirationDate,
      };

      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      });

      if (!response.ok) throw new Error('Failed to create customer');

      const { customer } = await response.json();
      router.push(`/sales/customers/${customer.id}`);
    } catch (error) {
      console.error('Create customer error:', error);
      alert('Failed to create customer. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveForLater = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/scanning/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: formData, type: data.type }),
      });

      alert('Draft saved successfully!');
      router.push('/sales/customers');
    } catch (error) {
      console.error('Save draft error:', error);
      alert('Failed to save draft. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderBusinessCardFields = () => (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="name" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Name
          </Label>
          {data.fields.name && getConfidenceBadge(data.fields.name.confidence)}
        </div>
        <Input
          id="name"
          value={formData.name || ''}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          placeholder="Enter name"
          className={cn(
            data.fields.name && data.fields.name.confidence < 0.7 && "border-yellow-500"
          )}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="title" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Title
          </Label>
          {data.fields.title && getConfidenceBadge(data.fields.title.confidence)}
        </div>
        <Input
          id="title"
          value={formData.title || ''}
          onChange={(e) => handleFieldChange('title', e.target.value)}
          placeholder="Enter title"
          className={cn(
            data.fields.title && data.fields.title.confidence < 0.7 && "border-yellow-500"
          )}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="company" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Company
          </Label>
          {data.fields.company && getConfidenceBadge(data.fields.company.confidence)}
        </div>
        <Input
          id="company"
          value={formData.company || ''}
          onChange={(e) => handleFieldChange('company', e.target.value)}
          placeholder="Enter company"
          className={cn(
            data.fields.company && data.fields.company.confidence < 0.7 && "border-yellow-500"
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone
            </Label>
            {data.fields.phone && getConfidenceBadge(data.fields.phone.confidence)}
          </div>
          <Input
            id="phone"
            type="tel"
            value={formData.phone || ''}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            placeholder="Enter phone"
            className={cn(
              data.fields.phone && data.fields.phone.confidence < 0.7 && "border-yellow-500"
            )}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Label>
            {data.fields.email && getConfidenceBadge(data.fields.email.confidence)}
          </div>
          <Input
            id="email"
            type="email"
            value={formData.email || ''}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            placeholder="Enter email"
            className={cn(
              data.fields.email && data.fields.email.confidence < 0.7 && "border-yellow-500"
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="address" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Address
          </Label>
          {data.fields.address && getConfidenceBadge(data.fields.address.confidence)}
        </div>
        <Input
          id="address"
          value={formData.address || ''}
          onChange={(e) => handleFieldChange('address', e.target.value)}
          placeholder="Enter address"
          className={cn(
            data.fields.address && data.fields.address.confidence < 0.7 && "border-yellow-500"
          )}
        />
      </div>
    </>
  );

  const renderLicenseFields = () => (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="businessName" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Business Name
          </Label>
          {data.fields.businessName && getConfidenceBadge(data.fields.businessName.confidence)}
        </div>
        <Input
          id="businessName"
          value={formData.businessName || ''}
          onChange={(e) => handleFieldChange('businessName', e.target.value)}
          placeholder="Enter business name"
          className={cn(
            data.fields.businessName && data.fields.businessName.confidence < 0.7 && "border-yellow-500"
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="licenseNumber" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              License Number
            </Label>
            {data.fields.licenseNumber && getConfidenceBadge(data.fields.licenseNumber.confidence)}
          </div>
          <Input
            id="licenseNumber"
            value={formData.licenseNumber || ''}
            onChange={(e) => handleFieldChange('licenseNumber', e.target.value)}
            placeholder="Enter license number"
            className={cn(
              data.fields.licenseNumber && data.fields.licenseNumber.confidence < 0.7 && "border-yellow-500"
            )}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="licenseType" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              License Type
            </Label>
            {data.fields.licenseType && getConfidenceBadge(data.fields.licenseType.confidence)}
          </div>
          <Input
            id="licenseType"
            value={formData.licenseType || ''}
            onChange={(e) => handleFieldChange('licenseType', e.target.value)}
            placeholder="Enter license type"
            className={cn(
              data.fields.licenseType && data.fields.licenseType.confidence < 0.7 && "border-yellow-500"
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="address" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Address
          </Label>
          {data.fields.address && getConfidenceBadge(data.fields.address.confidence)}
        </div>
        <Input
          id="address"
          value={formData.address || ''}
          onChange={(e) => handleFieldChange('address', e.target.value)}
          placeholder="Enter address"
          className={cn(
            data.fields.address && data.fields.address.confidence < 0.7 && "border-yellow-500"
          )}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="expirationDate" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Expiration Date
          </Label>
          {data.fields.expirationDate && getConfidenceBadge(data.fields.expirationDate.confidence)}
        </div>
        <Input
          id="expirationDate"
          type="date"
          value={formData.expirationDate || ''}
          onChange={(e) => handleFieldChange('expirationDate', e.target.value)}
          className={cn(
            data.fields.expirationDate && data.fields.expirationDate.confidence < 0.7 && "border-yellow-500"
          )}
        />
      </div>
    </>
  );

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Review Extracted Data</h1>
          <p className="text-muted-foreground">
            Verify and edit the information below
          </p>
        </div>
      </div>

      {/* Overall confidence */}
      <Card className={cn(
        data.confidence >= 0.9 ? "border-green-500 bg-green-50 dark:bg-green-950" :
        data.confidence >= 0.7 ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950" :
        "border-red-500 bg-red-50 dark:bg-red-950"
      )}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            {data.confidence >= 0.9 ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            )}
            <div className="flex-1">
              <p className="font-medium">
                Extraction Confidence: {(data.confidence * 100).toFixed(0)}%
              </p>
              <p className="text-sm text-muted-foreground">
                {data.confidence >= 0.9
                  ? 'High confidence - data looks accurate'
                  : 'Please review and verify the extracted information'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Extracted fields */}
      <Card>
        <CardHeader>
          <CardTitle>
            {data.type === 'business-card' ? 'Contact Information' : 'License Information'}
          </CardTitle>
          <CardDescription>
            Fields with lower confidence are highlighted. Please review carefully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.type === 'business-card' ? renderBusinessCardFields() : renderLicenseFields()}
        </CardContent>
      </Card>

      {/* Confidence legend */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-green-600">High</Badge>
              <span className="text-muted-foreground">90%+ confidence</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-yellow-600">Medium</Badge>
              <span className="text-muted-foreground">70-90% confidence</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="destructive">Low</Badge>
              <span className="text-muted-foreground">&lt;70% confidence</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleCreateCustomer}
          disabled={isCreating}
          className="flex-1"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          {isCreating ? 'Creating...' : 'Create Customer'}
        </Button>
        <Button
          onClick={handleSaveForLater}
          disabled={isSaving}
          variant="outline"
          className="flex-1"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save for Later'}
        </Button>
        <Button
          onClick={onReset}
          variant="outline"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Rescan
        </Button>
      </div>
    </div>
  );
}
