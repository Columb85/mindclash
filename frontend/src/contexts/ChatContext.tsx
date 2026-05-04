'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';

export interface ChatMessage {
  id: string;
  roomId: string;
  author: string;
  authorLevel?: number;
  authorRank?: string;
  authorRankColor?: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
  prediction?: { direction: 'UP' | 'DOWN'; amount: number };
}

interface ChatContextType {
  getMessages: (roomId: string) => ChatMessage[];
  sendMessage: (roomId: string, author: string, text: string, meta?: Partial<ChatMessage>) => void;
  sendSystem: (roomId: string, text: string, meta?: Partial<ChatMessage>) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const BOT_NAMES = ['0xBullWhale', '0xDiamondHands', '0xSatoshi', '0xNakamoto', 'CryptoMaxi', 'DegenKing', 'MoonSeeker', '0xApe'];
const SAMPLE_MESSAGES = [
  'LFG 🚀',
  'Going UP all day',
  'Bears about to get rekt',
  'easy money',
  'chart looks bearish tho',
  'HODL',
  'who else DOWN?',
  'gm degens',
  'this pool is tight',
  'my prediction is locked in 💎',
  'anyone seeing resistance at this level?',
  'wagmi',
];

function randomId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, ChatMessage[]>>({});

  const getMessages = useCallback(
    (roomId: string) => messagesByRoom[roomId] ?? [],
    [messagesByRoom]
  );

  const sendMessage = useCallback(
    (roomId: string, author: string, text: string, meta?: Partial<ChatMessage>) => {
      const msg: ChatMessage = {
        id: randomId(),
        roomId,
        author,
        text,
        timestamp: Date.now(),
        ...meta,
      };
      setMessagesByRoom(prev => ({
        ...prev,
        [roomId]: [...(prev[roomId] ?? []), msg].slice(-200),
      }));
    },
    []
  );

  const sendSystem = useCallback(
    (roomId: string, text: string, meta?: Partial<ChatMessage>) => {
      sendMessage(roomId, 'System', text, { isSystem: true, ...meta });
    },
    [sendMessage]
  );

  // Bot chatter: occasional random messages to make rooms feel alive
  useEffect(() => {
    const interval = setInterval(() => {
      // Pick a random known room and post a sample message
      const roomIds = Object.keys(messagesByRoom);
      if (roomIds.length === 0) return;
      const rid = roomIds[Math.floor(Math.random() * roomIds.length)];
      if (Math.random() > 0.4) return;
      const bot = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
      const text = SAMPLE_MESSAGES[Math.floor(Math.random() * SAMPLE_MESSAGES.length)];
      sendMessage(rid, bot, text, { authorLevel: Math.floor(Math.random() * 30) + 1 });
    }, 8000);
    return () => clearInterval(interval);
  }, [messagesByRoom, sendMessage]);

  return (
    <ChatContext.Provider value={{ getMessages, sendMessage, sendSystem }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
