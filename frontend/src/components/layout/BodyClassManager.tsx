'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function BodyClassManager() {
  const pathname = usePathname();

  useEffect(() => {
    const isLanding = pathname === '/';
    document.body.classList.toggle('landing-page', isLanding);
    document.body.classList.toggle('hud-app', !isLanding);
  }, [pathname]);

  return null;
}
