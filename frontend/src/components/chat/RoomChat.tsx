'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, MessageCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { useChat } from '@/contexts/ChatContext';
import { usePlayer, getRank } from '@/contexts/PlayerContext';

interface RoomChatProps {
  roomId: string;
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function RoomChat({ roomId }: RoomChatProps) {
  const { getMessages, sendMessage } = useChat();
  const { stats } = usePlayer();
  const { address } = useAccount();
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = getMessages(roomId);
  const myRank = getRank(stats.level);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const author = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : `Guest${Math.floor(Math.random() * 1000)}`;
    sendMessage(roomId, author, trimmed, {
      authorLevel: stats.level,
      authorRank: myRank.name,
      authorRankColor: myRank.color,
    });
    setText('');
  };

  return (
    <div className="glass rounded-2xl border border-dark-border flex flex-col h-[500px]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-dark-border">
        <MessageCircle className="w-4 h-4 text-blue-500" />
        <span className="font-semibold text-white">Room Chat</span>
        <span className="ml-auto text-xs text-gray-400">{messages.length} messages</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scroll-smooth">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm">
            <MessageCircle className="w-8 h-8 mb-2 opacity-30" />
            Be the first to say something
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`${msg.isSystem ? 'text-center' : ''}`}
              >
                {msg.isSystem ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300">
                    {msg.prediction && (
                      msg.prediction.direction === 'UP'
                        ? <TrendingUp className="w-3 h-3 text-green-500" />
                        : <TrendingDown className="w-3 h-3 text-red-500" />
                    )}
                    {msg.text}
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                      {msg.authorLevel ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span
                          className="text-xs font-semibold"
                          style={{ color: msg.authorRankColor ?? '#9ca3af' }}
                        >
                          {msg.author}
                        </span>
                        <span className="text-[10px] text-gray-500">{formatTime(msg.timestamp)}</span>
                      </div>
                      <div className="text-sm text-gray-200 break-words">{msg.text}</div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="px-4 py-3 border-t border-dark-border flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Say something..."
          maxLength={200}
          className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="px-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white disabled:opacity-50 hover:opacity-90 transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
