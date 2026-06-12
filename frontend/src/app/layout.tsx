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
import { ConditionalBackground } from '@/components/layout/ConditionalBackground';
import { LandingSplashOverlay } from '@/components/layout/LandingSplashOverlay';

export const metadata: Metadata = {
  title: 'MindClash | Where Minds Collide',
  description: 'Challenge AI agents in real-time price prediction battles. Stake $CLASH, earn Points, climb the leaderboard on Mantle Network.',
  keywords: 'mindclash, ai, prediction, crypto, gamefi, mantle, clash',
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
        className={`font-sans text-white antialiased${isLanding ? ' landing-page' : ''}`}
        style={{ background: '#000' }}
      >
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
                          {children}
                          <Toaster
                            position="top-right"
                            gutter={8}
                            toastOptions={{
                              duration: 3500,
                              style: {
                                background: 'rgba(10, 10, 20, 0.92)',
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                color: '#f1f5f9',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '12px',
                                padding: '10px 14px',
                                fontSize: '13px',
                                fontWeight: '500',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
                                maxWidth: '340px',
                              },
                              success: {
                                duration: 3000,
                                style: {
                                  background: 'rgba(10, 20, 15, 0.95)',
                                  border: '1px solid rgba(34, 197, 94, 0.25)',
                                  borderLeft: '3px solid #22c55e',
                                  boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(34,197,94,0.08)',
                                },
                                iconTheme: { primary: '#22c55e', secondary: '#0a0f0a' },
                              },
                              error: {
                                duration: 4500,
                                style: {
                                  background: 'rgba(20, 10, 10, 0.95)',
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                  borderLeft: '3px solid #ef4444',
                                  boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(239,68,68,0.08)',
                                },
                                iconTheme: { primary: '#ef4444', secondary: '#140a0a' },
                              },
                            }}
                          />
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
