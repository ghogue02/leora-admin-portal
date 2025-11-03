/**
 * Authentication Check Hook
 *
 * Detects session expiry and provides recovery actions
 * Shows user-friendly messages instead of generic API errors
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export type AuthStatus =
  | 'authenticated'
  | 'unauthenticated'
  | 'session_expired'
  | 'checking';

export interface UseAuthCheckReturn {
  status: AuthStatus;
  isAuthenticated: boolean;
  checkAuth: () => Promise<boolean>;
  logout: () => Promise<void>;
}

export function useAuthCheck(): UseAuthCheckReturn {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const router = useRouter();

  const checkAuth = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/sales/auth/me', {
        credentials: 'include',
      });

      if (response.ok) {
        setStatus('authenticated');
        return true;
      }

      if (response.status === 401) {
        setStatus('session_expired');
        return false;
      }

      setStatus('unauthenticated');
      return false;
    } catch (error) {
      console.error('Auth check failed:', error);
      setStatus('unauthenticated');
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/sales/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setStatus('unauthenticated');
      router.push('/sales/login');
    }
  };

  // Check auth on mount
  useEffect(() => {
    void checkAuth();
  }, []);

  return {
    status,
    isAuthenticated: status === 'authenticated',
    checkAuth,
    logout,
  };
}

/**
 * Hook to handle auth errors in components
 */
export function useAuthError(error: Error | string | null) {
  const { status, logout } = useAuthCheck();
  const router = useRouter();

  useEffect(() => {
    if (!error) return;

    const errorMessage = error instanceof Error ? error.message : error;

    // Detect authentication errors
    if (
      errorMessage.includes('Not authenticated') ||
      errorMessage.includes('not authorized') ||
      errorMessage.includes('401')
    ) {
      // Show session expired message
      if (status === 'session_expired') {
        const shouldRelogin = confirm(
          'Your session has expired. Would you like to log in again?'
        );
        if (shouldRelogin) {
          router.push('/sales/login');
        }
      } else {
        router.push('/sales/login');
      }
    }
  }, [error, status, router]);
}
