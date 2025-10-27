'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  isMobileDevice,
  shouldUseMobileLayout,
  getMobileRoutePath,
  getDesktopRoutePath
} from '@/lib/utils/mobile-detection';

interface MobileRouterProps {
  children: React.ReactNode;
  enableAutoRedirect?: boolean;
}

export const MobileRouter: React.FC<MobileRouterProps> = ({
  children,
  enableAutoRedirect = true
}) => {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!enableAutoRedirect) return;

    const isMobile = isMobileDevice() || shouldUseMobileLayout();
    const isOnMobilePath = pathname?.includes('/mobile/');

    // Redirect to mobile version if on mobile device and on desktop path
    if (isMobile && !isOnMobilePath) {
      const mobilePath = getMobileRoutePath(pathname || '');
      if (mobilePath !== pathname) {
        router.push(mobilePath);
      }
    }

    // Redirect to desktop version if on desktop and on mobile path
    if (!isMobile && isOnMobilePath) {
      const desktopPath = getDesktopRoutePath(pathname || '');
      if (desktopPath !== pathname) {
        router.push(desktopPath);
      }
    }
  }, [pathname, router, enableAutoRedirect]);

  return <>{children}</>;
};

interface MobileLayoutWrapperProps {
  children: React.ReactNode;
  mobileComponent: React.ReactNode;
  desktopComponent: React.ReactNode;
}

export const MobileLayoutWrapper: React.FC<MobileLayoutWrapperProps> = ({
  children,
  mobileComponent,
  desktopComponent
}) => {
  const [isMobile, setIsMobile] = React.useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(isMobileDevice() || shouldUseMobileLayout());
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <>
      {isMobile ? mobileComponent : desktopComponent}
      {children}
    </>
  );
};
