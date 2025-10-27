'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Phone,
  Calendar,
  Users,
  Menu
} from 'lucide-react';

interface MobileNavProps {
  className?: string;
}

export const MobileNav: React.FC<MobileNavProps> = ({ className = '' }) => {
  const pathname = usePathname();

  const navItems = [
    { icon: Home, label: 'Home', href: '/sales' },
    { icon: Phone, label: 'Calls', href: '/sales/mobile/call-plan' },
    { icon: Calendar, label: 'Calendar', href: '/sales/mobile/calendar' },
    { icon: Users, label: 'Customers', href: '/sales/mobile/customers' },
    { icon: Menu, label: 'More', href: '/sales/settings' }
  ];

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(href + '/');
  };

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom z-50 ${className}`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ icon: Icon, label, href }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] flex-1 transition-colors ${
                active ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <Icon className="w-6 h-6 mb-1" strokeWidth={active ? 2.5 : 2} />
              <span className={`text-xs ${active ? 'font-semibold' : 'font-normal'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
