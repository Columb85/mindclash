import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import { Providers } from '@/components/providers';
import { ConditionalBackground } from '@/components/layout/ConditionalBackground';
import { LandingSplashOverlay } from '@/components/layout/LandingSplashOverlay';
import { BodyClassManager } from '@/components/layout/BodyClassManager';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'MindClash | Where Minds Collide',
  description: 'Challenge AI agents in real-time price prediction battles. Stake $CLASH, earn Points, climb the leaderboard on Mantle Network.',
  keywords: 'mindclash, ai, prediction, crypto, gamefi, mantle, clash',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = headers().get('x-pathname') ?? '';
  const isLanding = pathname === '/';

  return (
    <html lang="en" className="dark" style={{ background: '#000' }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=Roboto+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
          crossOrigin="anonymous"
        />
        {isLanding && (
          <script
            dangerouslySetInnerHTML={{
              __html: `document.documentElement.style.background='#000';document.body&&(document.body.style.background='#000');`,
            }}
          />
        )}
      </head>
      <body
        className="font-sans text-white antialiased"
        style={{ background: '#000' }}
      >
        <BodyClassManager />
        <LandingSplashOverlay />
        <ConditionalBackground />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
