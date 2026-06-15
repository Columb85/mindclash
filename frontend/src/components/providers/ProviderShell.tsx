'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Toaster } from 'react-hot-toast';
import { BootSplash } from '@/components/layout/BootSplash';

const AppProvidersBundle = dynamic(() => import('./AppProvidersBundle'), {
  ssr: false,
  loading: () => <BootSplash label="LOADING APP" />,
});

const toasterOptions = {
  position: 'top-right' as const,
  gutter: 8,
  toastOptions: {
    duration: 3500,
    style: {
      background: 'rgba(13,17,23,0.95)',
      backdropFilter: 'blur(12px)',
      color: '#e2e8f0',
      border: '1px solid rgba(0,212,170,0.2)',
      borderRadius: '0',
      padding: '12px 16px',
      fontSize: '12px',
      fontFamily: 'Barlow Condensed, sans-serif',
      fontWeight: '500',
      letterSpacing: '0.03em',
      boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
      maxWidth: '360px',
      clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
    },
    success: {
      duration: 3000,
      style: {
        background: 'rgba(0,40,30,0.95)',
        border: '1px solid rgba(0,212,170,0.4)',
        boxShadow: '0 4px 20px rgba(0,212,170,0.15)',
      },
      iconTheme: { primary: '#00d4aa', secondary: '#0d1117' },
    },
    error: {
      duration: 4500,
      style: {
        background: 'rgba(40,15,15,0.95)',
        border: '1px solid rgba(255,85,85,0.4)',
        boxShadow: '0 4px 20px rgba(255,85,85,0.15)',
      },
      iconTheme: { primary: '#ff5555', secondary: '#0d1117' },
    },
  },
};

export function ProviderShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === '/';

  return (
    <LanguageProvider>
      {isLanding ? children : <AppProvidersBundle>{children}</AppProvidersBundle>}
      <Toaster {...toasterOptions} />
    </LanguageProvider>
  );
}
