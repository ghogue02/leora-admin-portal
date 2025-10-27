'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MoreVertical } from 'lucide-react';

interface MobileHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  showBack = false,
  onBack,
  actions,
  className = ''
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <header
      className={`sticky top-0 left-0 right-0 bg-white border-b border-gray-200 z-40 ${className}`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between h-14 px-4">
        {/* Back Button */}
        {showBack ? (
          <button
            onClick={handleBack}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2 text-blue-600 active:opacity-70 transition-opacity"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        ) : (
          <div className="w-10" />
        )}

        {/* Title */}
        <h1 className="flex-1 text-lg font-semibold text-center text-gray-900 truncate px-2">
          {title}
        </h1>

        {/* Actions */}
        <div className="flex items-center min-w-[44px] justify-end">
          {actions || <div className="w-10" />}
        </div>
      </div>
    </header>
  );
};

interface MobileHeaderActionProps {
  icon?: React.ReactNode;
  label?: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export const MobileHeaderAction: React.FC<MobileHeaderActionProps> = ({
  icon = <MoreVertical className="w-6 h-6" />,
  label,
  onClick,
  variant = 'secondary'
}) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg transition-opacity active:opacity-70 ${
        variant === 'primary' ? 'text-blue-600 font-semibold' : 'text-gray-700'
      }`}
      aria-label={label}
    >
      {icon}
      {label && <span className="ml-1 text-sm">{label}</span>}
    </button>
  );
};
