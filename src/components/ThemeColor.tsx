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
    // White for tournament's pages
    else if (pathname.includes('/tournaments')) {
      color = '#ffffff';
    }
    // #ffb689 for dashboard (already default, but being explicit)
    else if (pathname.includes('/dashboard')) {
      color = '#ffb689';
    }

    // Update the theme-color meta tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', color);
    }
  }, [pathname]);

  return null;
}
