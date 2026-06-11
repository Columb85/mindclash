'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

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

function randomId() {
  return `ev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function ActivityProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  const push = useCallback((ev: Omit<ActivityEvent, 'id' | 'timestamp'>) => {
    setEvents(prev => [{ ...ev, id: randomId(), timestamp: Date.now() }, ...prev].slice(0, 100));
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
