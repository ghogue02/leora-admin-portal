'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Users,
  Package,
  Mail,
  Eye,
  Calendar,
  Save
} from 'lucide-react';
import { ProductSelector } from '../../components/ProductSelector';
import { TemplatePreview } from '@/components/email/TemplatePreview';

type Step = 'segment' | 'products' | 'template' | 'preview' | 'schedule';

interface CampaignData {
  name: string;
  subject: string;
  preheader: string;
  segmentId?: string;
  segmentType?: 'ACTIVE' | 'TARGET' | 'PROSPECT' | 'CUSTOM';
  productIds: string[];
  templateId: string;
  scheduleType: 'now' | 'scheduled';
  scheduleDate?: Date;
}

const steps: { id: Step; title: string; icon: any }[] = [
  { id: 'segment', title: 'Choose Segment', icon: Users },
  { id: 'products', title: 'Select Products', icon: Package },
  { id: 'template', title: 'Choose Template', icon: Mail },
  { id: 'preview', title: 'Preview', icon: Eye },
  { id: 'schedule', title: 'Schedule', icon: Calendar },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('segment');
  const [campaignData, setCampaignData] = useState<CampaignData>({
    name: '',
    subject: '',
    preheader: '',
    productIds: [],
    templateId: 'default',
    scheduleType: 'now',
  });
  const [isSaving, setIsSaving] = useState(false);

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const updateCampaignData = (updates: Partial<CampaignData>) => {
    setCampaignData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (!isLastStep) {
      setCurrentStep(steps[currentStepIndex + 1].id);
    }
  };

  const prevStep = () => {
    if (!isFirstStep) {
      setCurrentStep(steps[currentStepIndex - 1].id);
    }
  };

  const saveDraft = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/mailchimp/campaigns/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData),
      });
      router.push('/sales/marketing/mailchimp');
    } catch (error) {
      console.error('Failed to save draft:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const sendCampaign = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/mailchimp/campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData),
      });
      router.push('/sales/marketing/mailchimp');
    } catch (error) {
      console.error('Failed to send campaign:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'segment':
        return campaignData.segmentId || campaignData.segmentType;
      case 'products':
        return campaignData.productIds.length > 0;
      case 'template':
        return campaignData.templateId && campaignData.subject;
      case 'preview':
        return true;
      case 'schedule':
        return campaignData.scheduleType === 'now' || campaignData.scheduleDate;
      default:
        return false;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Create Email Campaign</h1>
            <p className="text-muted-foreground">Build and send targeted email campaigns</p>
          </div>
          <Button variant="outline" onClick={saveDraft} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = index < currentStepIndex;

            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground'
                        : isCompleted
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <p className={`text-sm mt-2 ${isActive ? 'font-medium' : ''}`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-0.5 bg-border mx-4" />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <Card>
          <CardContent className="pt-6">
            {currentStep === 'segment' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="campaign-name">Campaign Name</Label>
                  <Input
                    id="campaign-name"
                    value={campaignData.name}
                    onChange={(e) => updateCampaignData({ name: e.target.value })}
                    placeholder="e.g., June Wine Sale"
                  />
                </div>

                <div>
                  <Label>Select Target Segment</Label>
                  <Select
                    value={campaignData.segmentType}
                    onValueChange={(value: any) => updateCampaignData({ segmentType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose customer segment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active Customers</SelectItem>
                      <SelectItem value="TARGET">Target Customers</SelectItem>
                      <SelectItem value="PROSPECT">Prospects</SelectItem>
                      <SelectItem value="CUSTOM">Custom Segment</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-2">
                    Estimated reach: 1,234 customers
                  </p>
                </div>
              </div>
            )}

            {currentStep === 'products' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Featured Products</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select products to feature in this campaign
                  </p>
                  <ProductSelector
                    selectedIds={campaignData.productIds}
                    onChange={(ids) => updateCampaignData({ productIds: ids })}
                  />
                </div>
              </div>
            )}

            {currentStep === 'template' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="subject">Subject Line</Label>
                  <Input
                    id="subject"
                    value={campaignData.subject}
                    onChange={(e) => updateCampaignData({ subject: e.target.value })}
                    placeholder="e.g., New wines just arrived!"
                  />
                </div>

                <div>
                  <Label htmlFor="preheader">Preheader Text</Label>
                  <Input
                    id="preheader"
                    value={campaignData.preheader}
                    onChange={(e) => updateCampaignData({ preheader: e.target.value })}
                    placeholder="Preview text that appears in email clients"
                  />
                </div>

                <div>
                  <Label>Email Template</Label>
                  <Select
                    value={campaignData.templateId}
                    onValueChange={(value) => updateCampaignData({ templateId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default Template</SelectItem>
                      <SelectItem value="minimal">Minimal Template</SelectItem>
                      <SelectItem value="product-showcase">Product Showcase</SelectItem>
                      <SelectItem value="newsletter">Newsletter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {currentStep === 'preview' && (
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <TemplatePreview
                    template={campaignData.templateId}
                    subject={campaignData.subject}
                    preheader={campaignData.preheader}
                    productIds={campaignData.productIds}
                  />
                </div>
              </div>
            )}

            {currentStep === 'schedule' && (
              <div className="space-y-4">
                <div>
                  <Label>When should this campaign be sent?</Label>
                  <Select
                    value={campaignData.scheduleType}
                    onValueChange={(value: any) => updateCampaignData({ scheduleType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="now">Send Now</SelectItem>
                      <SelectItem value="scheduled">Schedule for Later</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {campaignData.scheduleType === 'scheduled' && (
                  <div>
                    <Label htmlFor="schedule-date">Schedule Date & Time</Label>
                    <Input
                      id="schedule-date"
                      type="datetime-local"
                      onChange={(e) =>
                        updateCampaignData({ scheduleDate: new Date(e.target.value) })
                      }
                    />
                  </div>
                )}

                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Campaign Summary</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Name:</dt>
                      <dd className="font-medium">{campaignData.name}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Segment:</dt>
                      <dd className="font-medium">{campaignData.segmentType}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Products:</dt>
                      <dd className="font-medium">{campaignData.productIds.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Recipients:</dt>
                      <dd className="font-medium">~1,234 customers</dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={prevStep} disabled={isFirstStep}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {isLastStep ? (
            <Button onClick={sendCampaign} disabled={!canProceed() || isSaving}>
              {campaignData.scheduleType === 'now' ? 'Send Campaign' : 'Schedule Campaign'}
            </Button>
          ) : (
            <Button onClick={nextStep} disabled={!canProceed()}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
