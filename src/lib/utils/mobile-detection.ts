/**
 * Mobile Detection Utilities
 * Detects mobile devices and provides responsive utilities
 */

export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

  // Check for mobile user agents
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return mobileRegex.test(userAgent);
};

export const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
};

export const isAndroid = (): boolean => {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /Android/i.test(userAgent);
};

export const isTablet = (): boolean => {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /iPad|Android(?!.*Mobile)/i.test(userAgent);
};

export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  if (isTablet()) return 'tablet';
  if (isMobileDevice()) return 'mobile';
  return 'desktop';
};

export const getViewportWidth = (): number => {
  if (typeof window === 'undefined') return 0;
  return window.innerWidth;
};

export const getBreakpoint = (): 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' => {
  const width = getViewportWidth();

  if (width < 640) return 'xs';
  if (width < 768) return 'sm';
  if (width < 1024) return 'md';
  if (width < 1280) return 'lg';
  if (width < 1536) return 'xl';
  return '2xl';
};

export const shouldUseMobileLayout = (): boolean => {
  const breakpoint = getBreakpoint();
  return breakpoint === 'xs' || breakpoint === 'sm';
};

export const getTouchTargetSize = (size: 'small' | 'medium' | 'large' = 'medium'): number => {
  // Minimum touch target sizes (iOS HIG: 44px, Material: 48px)
  const sizes = {
    small: 44,   // Minimum for accessibility
    medium: 48,  // Recommended default
    large: 56    // Large touch targets
  };

  return sizes[size];
};

export const isLandscape = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth > window.innerHeight;
};

export const getSafeAreaInsets = () => {
  if (typeof window === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const computedStyle = getComputedStyle(document.documentElement);

  return {
    top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0'),
    right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0'),
    bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
    left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0')
  };
};

export const supportsTouchEvents = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export const supportsHover = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: hover)').matches;
};

export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const getMobileRoutePath = (desktopPath: string): string => {
  // Convert desktop paths to mobile paths
  const mobileRoutes: Record<string, string> = {
    '/sales/call-plan': '/sales/mobile/call-plan',
    '/sales/calendar': '/sales/mobile/calendar',
    '/sales/customers': '/sales/mobile/customers'
  };

  return mobileRoutes[desktopPath] || desktopPath;
};

export const getDesktopRoutePath = (mobilePath: string): string => {
  // Convert mobile paths to desktop paths
  const desktopRoutes: Record<string, string> = {
    '/sales/mobile/call-plan': '/sales/call-plan',
    '/sales/mobile/calendar': '/sales/calendar',
    '/sales/mobile/customers': '/sales/customers'
  };

  return desktopRoutes[mobilePath] || mobilePath;
};
