'use client';

import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  requireReason?: boolean;
  reasonLabel?: string;
  itemCount?: number;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  requireReason = false,
  reasonLabel = 'Reason (optional)',
  itemCount,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (requireReason && !reason.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(reason || undefined);
      onClose();
      setReason('');
    } catch (error) {
      console.error('Confirm action failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const variantStyles = {
    danger: {
      icon: 'text-red-600',
      button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
      border: 'border-red-200',
    },
    warning: {
      icon: 'text-yellow-600',
      button: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
      border: 'border-yellow-200',
    },
    info: {
      icon: 'text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
      border: 'border-blue-200',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-start justify-between p-6 border-b ${styles.border}`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`w-6 h-6 ${styles.icon} flex-shrink-0 mt-1`} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              {itemCount !== undefined && (
                <p className="text-sm text-gray-500 mt-1">
                  This will affect {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-700 mb-4">{description}</p>

          {(requireReason || reasonLabel) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {reasonLabel}
                {requireReason && <span className="text-red-500 ml-1">*</span>}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Enter reason for audit log..."
                disabled={isSubmitting}
              />
              {requireReason && !reason.trim() && (
                <p className="text-sm text-red-600 mt-1">Reason is required</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            disabled={isSubmitting}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 text-white rounded-lg focus:outline-none focus:ring-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles.button}`}
            disabled={isSubmitting || (requireReason && !reason.trim())}
          >
            {isSubmitting ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for managing confirm dialog state
export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<Omit<ConfirmDialogProps, 'isOpen' | 'onClose' | 'onConfirm'>>({
    title: '',
    description: '',
  });
  const [onConfirmCallback, setOnConfirmCallback] = useState<(reason?: string) => void | Promise<void>>();

  const confirm = (
    options: Omit<ConfirmDialogProps, 'isOpen' | 'onClose'> & { onConfirm: (reason?: string) => void | Promise<void> }
  ) => {
    const { onConfirm, ...rest } = options;
    setConfig(rest);
    setOnConfirmCallback(() => onConfirm);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
  };

  const handleConfirm = async (reason?: string) => {
    if (onConfirmCallback) {
      await onConfirmCallback(reason);
    }
  };

  const ConfirmDialogComponent = () => (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={close}
      onConfirm={handleConfirm}
      {...config}
    />
  );

  return {
    confirm,
    ConfirmDialogComponent,
  };
}
