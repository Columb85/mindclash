import type { Metadata } from 'next';
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
import { Background } from '@/components/layout/Background';

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
  return (
    <html lang="en" className="dark">
      <body className="font-sans bg-dark-bg text-white antialiased">
        <Background />
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
                            toastOptions={{
                              duration: 4000,
                              style: {
                                background: '#1a1a2e',
                                color: '#fff',
                                border: '1px solid #2d2d44',
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
