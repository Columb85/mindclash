'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

export type ActivityType =
  | 'prediction'
  | 'round_start'
  | 'round_end'
  | 'big_win'
  | 'achievement'
  | 'streak';

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  actor?: string;
  text: string;
  amount?: number;
  token?: string;
  asset?: string;
  direction?: 'UP' | 'DOWN';
  winner?: 'UP' | 'DOWN' | 'TIE';
  timestamp: number;
}

interface ActivityContextType {
  events: ActivityEvent[];
  push: (ev: Omit<ActivityEvent, 'id' | 'timestamp'>) => void;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

const MOCK_WALLETS = ['0x9F2a...c81E', '0x4B1e...a3F7', '0x7D52...99Cb', '0xA1ff...0E23', '0xC83b...71a2', '0x2e91...Df40'];
const MOCK_ASSETS = ['BTC', 'ETH', 'SOL'];

function randomId() {
  return `ev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function ActivityProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  const push = useCallback((ev: Omit<ActivityEvent, 'id' | 'timestamp'>) => {
    setEvents(prev => [{ ...ev, id: randomId(), timestamp: Date.now() }, ...prev].slice(0, 100));
  }, []);

  // Seed & simulate background activity
  useEffect(() => {
    const initial: ActivityEvent[] = Array.from({ length: 6 }).map((_, i) => ({
      id: randomId(),
      type: 'prediction',
      actor: MOCK_WALLETS[i % MOCK_WALLETS.length],
      asset: MOCK_ASSETS[i % MOCK_ASSETS.length],
      direction: Math.random() > 0.5 ? 'UP' : 'DOWN',
      amount: Math.floor(Math.random() * 500) + 50,
      token: 'CLASH',
      text: '',
      timestamp: Date.now() - i * 15000,
    }));
    setEvents(initial);

    const interval = setInterval(() => {
      const roll = Math.random();
      if (roll < 0.6) {
        const dir: 'UP' | 'DOWN' = Math.random() > 0.5 ? 'UP' : 'DOWN';
        const asset = MOCK_ASSETS[Math.floor(Math.random() * MOCK_ASSETS.length)];
        const amount = Math.floor(Math.random() * 800) + 20;
        const actor = MOCK_WALLETS[Math.floor(Math.random() * MOCK_WALLETS.length)];
        setEvents(prev => [{
          id: randomId(),
          type: 'prediction' as ActivityType,
          actor,
          asset,
          direction: dir,
          amount,
          token: 'CLASH',
          text: '',
          timestamp: Date.now(),
        }, ...prev].slice(0, 100));
      } else if (roll < 0.85) {
        const asset = MOCK_ASSETS[Math.floor(Math.random() * MOCK_ASSETS.length)];
        const winner: 'UP' | 'DOWN' = Math.random() > 0.5 ? 'UP' : 'DOWN';
        setEvents(prev => [{
          id: randomId(),
          type: 'round_end' as ActivityType,
          asset,
          winner,
          text: '',
          timestamp: Date.now(),
        }, ...prev].slice(0, 100));
      } else {
        const actor = MOCK_WALLETS[Math.floor(Math.random() * MOCK_WALLETS.length)];
        const amount = Math.floor(Math.random() * 3000) + 500;
        setEvents(prev => [{
          id: randomId(),
          type: 'big_win' as ActivityType,
          actor,
          amount,
          token: 'CLASH',
          text: '',
          timestamp: Date.now(),
        }, ...prev].slice(0, 100));
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <ActivityContext.Provider value={{ events, push }}>
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error('useActivity must be used within ActivityProvider');
  return ctx;
}
