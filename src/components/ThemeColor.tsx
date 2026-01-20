'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function ThemeColor() {
  const pathname = usePathname();

  useEffect(() => {
    let color = '#da6c6c'; // default

    // White for auth pages (login/signup)
    if (pathname.includes('/sign-in') || pathname.includes('/sign-up')) {
      color = '#ffffff';
    }
    // White for create tournament page
    else if (pathname.includes('/tournaments/create')) {
      color = '#ffffff';
    }
    // #da6c6c for dashboard (already default, but being explicit)
    else if (pathname.includes('/dashboard')) {
      color = '#da6c6c';
    }

    // Update the theme-color meta tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', color);
    }
  }, [pathname]);

  return null;
}
