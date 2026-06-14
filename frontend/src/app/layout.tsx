import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from 'react-hot-toast';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { RoomsProvider } from '@/contexts/RoomsContext';
import { PlayerProvider } from '@/contexts/PlayerContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { ActivityProvider } from '@/contexts/ActivityContext';
import { LeaderboardProvider } from '@/contexts/LeaderboardContext';
import { QuestsProvider } from '@/contexts/QuestsContext';
import { ClashProvider } from '@/contexts/ClashContext';
import { ActiveRoundProvider } from '@/contexts/ActiveRoundContext';
import { ActiveRoundFloatingPill } from '@/components/game/ActiveRoundFloatingPill';
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
        {/* HUD assets — internal app pages only (landing untouched) */}
        {!isLanding && (
          <>
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
          </>
        )}
        {/* Instant black paint on landing — runs before first body paint */}
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
        {isLanding && <LandingSplashOverlay />}
        <ConditionalBackground />
        <LanguageProvider>
          <Providers>
            <PlayerProvider>
              <ClashProvider>
                <QuestsProvider>
                  <LeaderboardProvider>
                    <RoomsProvider>
                      <ChatProvider>
                        <ActivityProvider>
                          <ActiveRoundProvider>
                          {children}
                          <ActiveRoundFloatingPill />
<Toaster
                                            position="top-right"
                                            gutter={8}
                                            toastOptions={{
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
                                            }}
                                          />
                          </ActiveRoundProvider>
                        </ActivityProvider>
                      </ChatProvider>
                    </RoomsProvider>
                  </LeaderboardProvider>
                </QuestsProvider>
              </ClashProvider>
            </PlayerProvider>
          </Providers>
        </LanguageProvider>
      </body>
    </html>
  );
}
