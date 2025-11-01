'use client';

/**
 * Form Progress Indicator
 *
 * Fixes frontend agent's Issue #10: No progress indication
 *
 * Shows multi-step progress through order creation
 */

type Step = {
  number: number;
  label: string;
  complete: boolean;
};

type Props = {
  steps: Step[];
  currentStep: number;
};

export function FormProgress({ steps, currentStep }: Props) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${
                  step.complete
                    ? 'bg-emerald-600 text-white'
                    : step.number === currentStep
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step.complete ? '✓' : step.number}
              </div>
              <div className={`mt-2 text-xs font-medium ${
                step.number === currentStep ? 'text-gray-900' : 'text-gray-500'
              }`}>
                {step.label}
              </div>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="flex-1 h-1 mx-2">
                <div className={`h-full rounded ${
                  step.complete ? 'bg-emerald-600' : 'bg-gray-200'
                }`} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
