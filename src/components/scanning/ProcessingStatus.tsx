'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, Upload, Brain, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProcessingStatusProps {
  state: 'uploading' | 'processing';
  progress?: number;
  scanType: 'business-card' | 'liquor-license';
}

export default function ProcessingStatus({ state, progress = 0, scanType }: ProcessingStatusProps) {
  const steps = [
    {
      key: 'uploading',
      label: 'Uploading',
      icon: Upload,
      description: 'Sending image to server',
    },
    {
      key: 'processing',
      label: 'Extracting Data',
      icon: Brain,
      description: 'AI is analyzing the image',
    },
  ];

  const currentStepIndex = steps.findIndex(step => step.key === state);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 space-y-6">
          {/* Logo/Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Brain className="h-10 w-10 text-primary animate-pulse" />
              </div>
              {state === 'uploading' && (
                <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              )}
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">
              {state === 'uploading' ? 'Uploading Image' : 'Extracting Data'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {state === 'uploading'
                ? 'Please wait while we upload your image...'
                : `Analyzing ${scanType === 'business-card' ? 'business card' : 'liquor license'}...`
              }
            </p>
          </div>

          {/* Progress bar */}
          {state === 'uploading' && progress > 0 && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                {progress}% complete
              </p>
            </div>
          )}

          {/* Processing animation */}
          {state === 'processing' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div className="flex-1 space-y-2">
                  <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
                  </div>
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                This usually takes 3-5 seconds
              </p>
            </div>
          )}

          {/* Step indicators */}
          <div className="space-y-3">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const isPending = index > currentStepIndex;

              return (
                <div
                  key={step.key}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg transition-colors",
                    isCurrent && "bg-primary/5 border border-primary/20",
                    isCompleted && "opacity-60"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                    isCompleted && "bg-primary text-primary-foreground",
                    isCurrent && "bg-primary/10 text-primary",
                    isPending && "bg-muted text-muted-foreground"
                  )}>
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <StepIcon className={cn(
                        "h-5 w-5",
                        isCurrent && "animate-pulse"
                      )} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={cn(
                      "font-medium text-sm",
                      isCurrent && "text-primary",
                      isPending && "text-muted-foreground"
                    )}>
                      {step.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                  {isCurrent && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Tips */}
          <Card className="bg-muted/50 border-0">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">
                <strong>Did you know?</strong> Our AI can extract information from images
                with {scanType === 'business-card' ? '95%' : '98%'} accuracy, saving you time
                on manual data entry.
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
