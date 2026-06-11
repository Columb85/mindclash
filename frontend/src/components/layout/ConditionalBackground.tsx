'use client';

import { usePathname } from 'next/navigation';
import { Background } from './Background';

/** Hide global purple Background on landing page — landing has its own GridBackground */
export function ConditionalBackground() {
  const pathname = usePathname();
  if (pathname === '/') return null;
  return <Background />;
}
