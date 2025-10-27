'use client';

import { useState } from "react";
import LogActivityModal from "./LogActivityModal";

type LogActivityButtonProps = {
  customerId?: string;
  orderId?: string;
  sampleId?: string;
  activityTypeCode?: string;
  initialSubject?: string;
  contextType?: 'customer' | 'order' | 'sample' | 'carla';
  contextLabel?: string;
  onSuccess?: () => void;
  variant?: 'primary' | 'secondary' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
};

export default function LogActivityButton({
  customerId,
  orderId,
  sampleId,
  activityTypeCode,
  initialSubject,
  contextType,
  contextLabel,
  onSuccess,
  variant = 'primary',
  size = 'md',
  label = 'Log Activity',
}: LogActivityButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  // Variant classes
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500',
    icon: 'bg-blue-50 text-blue-700 hover:bg-blue-100 focus:ring-blue-500',
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={`inline-flex items-center gap-2 rounded-md font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${sizeClasses[size]} ${variantClasses[variant]}`}
      >
        {variant === 'icon' ? (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {label}
          </>
        ) : (
          label
        )}
      </button>

      <LogActivityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
        customerId={customerId}
        orderId={orderId}
        sampleId={sampleId}
        activityTypeCode={activityTypeCode}
        initialSubject={initialSubject}
        contextType={contextType}
        contextLabel={contextLabel}
      />
    </>
  );
}
