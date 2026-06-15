'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { wagmiConfig } from '@/lib/web3-config';
import { PlayerProvider } from '@/contexts/PlayerContext';
import { ClashProvider } from '@/contexts/ClashContext';
import { QuestsProvider } from '@/contexts/QuestsContext';
import { LeaderboardProvider } from '@/contexts/LeaderboardContext';
import { RoomsProvider } from '@/contexts/RoomsContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { ActivityProvider } from '@/contexts/ActivityContext';
import { ActiveRoundProvider } from '@/contexts/ActiveRoundContext';
import { ActiveRoundFloatingPill } from '@/components/game/ActiveRoundFloatingPill';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

export default function AppProvidersBundle({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          locale="en"
          theme={darkTheme({
            accentColor: '#00d4ff',
            accentColorForeground: 'black',
            borderRadius: 'large',
            fontStack: 'system',
          })}
          showRecentTransactions={false}
        >
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
                        </ActiveRoundProvider>
                      </ActivityProvider>
                    </ChatProvider>
                  </RoomsProvider>
                </LeaderboardProvider>
              </QuestsProvider>
            </ClashProvider>
          </PlayerProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
