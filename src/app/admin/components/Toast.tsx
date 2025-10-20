'use client';

import { Toaster, toast } from 'sonner';

export { toast };

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      duration={5000}
      toastOptions={{
        style: {
          background: 'white',
          border: '1px solid #e5e7eb',
        },
        className: 'my-toast',
        descriptionClassName: 'my-toast-description',
      }}
    />
  );
}

// Helper functions for common toast patterns
export const toastSuccess = (message: string, description?: string) => {
  toast.success(message, { description, duration: 5000 });
};

export const toastError = (message: string, description?: string) => {
  toast.error(message, { description, duration: 7000 });
};

export const toastInfo = (message: string, description?: string) => {
  toast.info(message, { description, duration: 5000 });
};

export const toastWarning = (message: string, description?: string) => {
  toast.warning(message, { description, duration: 6000 });
};

export const toastLoading = (message: string) => {
  return toast.loading(message);
};

export const toastPromise = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: Error) => string);
  }
) => {
  return toast.promise(promise, messages);
};
