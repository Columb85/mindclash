'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { UserIcon, CrownIcon, TargetIcon, AIBrainIcon, SwordIcon } from '@/components/icons/MantleIcons';
import { useQuests } from '@/contexts/QuestsContext';

export type View = 'lobby' | 'game' | 'leaderboard' | 'quests' | 'profile' | 'ai-battle';

interface NavigationProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const MORE_LINKS = [
  { href: '/',             label: '🏠 Home',       desc: 'Back to landing page',  color: '#00D4AA' },
  { href: '/gauntlet',     label: '🛡️ Gauntlet',  desc: 'Beat all 3 champions',  color: '#f97316' },
  { href: '/showdown',     label: '🔥 Showdown',   desc: 'Head-to-head battle',   color: '#f97316' },
  { href: '/leaderboard',  label: '🏆 Rankings',   desc: 'On-chain leaderboard',  color: '#f59e0b' },
  { href: '/verify',       label: '✅ Verify',     desc: 'On-chain proofs',       color: '#22c55e' },
  { href: '/autonomous',   label: '🤖 Bot Loop',   desc: 'Autonomous agent mode', color: '#06b6d4' },
];

export function Navigation({ currentView, onViewChange }: NavigationProps) {
  const { completedCount, totalCount } = useQuests();
  const hasIncompleteQuests = completedCount < totalCount;
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreOpen]);

  const navItems = [
    { id: 'lobby' as View,       label: 'Arena',       icon: AIBrainIcon,  color: '#a855f7' },
    { id: 'ai-battle' as View,   label: 'Battle',      icon: SwordIcon,    color: '#ef4444' },
    { id: 'leaderboard' as View, label: 'Rankings',    icon: CrownIcon,    color: '#f59e0b' },
    { id: 'quests' as View,      label: 'Quests',      icon: TargetIcon,   color: '#22c55e', badge: hasIncompleteQuests },
    { id: 'profile' as View,     label: 'Profile',     icon: UserIcon,     color: '#3b82f6' },
  ];

  return (
    <nav className="flex items-center gap-1 bg-white/[0.03] backdrop-blur-sm p-1 rounded-xl border border-white/[0.06]">
      {navItems.map(({ id, label, icon: Icon, color, badge }) => {
        const active = currentView === id;
        return (
          <button
            key={id}
            onClick={() => onViewChange(id)}
            className="relative group flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
            style={{
              background: active ? `${color}15` : 'transparent',
            }}
          >
            <Icon
              className="w-4 h-4 transition-colors"
              size={16}
              style={{ color: active ? color : '#9ca3af' }}
            />
            <span
              className="hidden md:inline text-sm font-semibold transition-colors"
              style={{ color: active ? '#fff' : '#9ca3af' }}
            >
              {label}
            </span>
            {badge && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            )}
            {active && (
              <span
                className="absolute -bottom-0.5 left-2 right-2 h-0.5 rounded-full"
                style={{ background: color, boxShadow: `0 0 8px ${color}` }}
              />
            )}
          </button>
        );
      })}

      {/* Quick links — always visible */}
      <div className="w-px h-5 bg-dark-border mx-1" />
      <Link
        href="/duel"
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all text-xs font-bold"
      >
        <span>⚔️</span>
        <span className="hidden md:inline">Duel</span>
      </Link>
      <Link
        href="/create-agent"
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 hover:text-yellow-300 transition-all text-xs font-bold"
      >
        <span>✨</span>
        <span className="hidden md:inline">Create Bot</span>
      </Link>

      {/* More dropdown */}
      <div className="relative" ref={moreRef}>
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-600/30 bg-gray-600/10 text-gray-300 hover:bg-gray-600/20 hover:text-white transition-all text-xs font-bold"
        >
          <span className="hidden md:inline">More</span>
          <svg className={`w-3 h-3 transition-transform ${moreOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {moreOpen && (
          <div className="absolute top-full right-0 mt-2 w-56 rounded-xl border border-white/[0.08] bg-black/90 backdrop-blur-xl shadow-2xl shadow-black/60 overflow-hidden z-50">
            {MORE_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.05] transition-colors border-b border-white/[0.04] last:border-0"
              >
                <span className="text-sm">{link.label.split(' ')[0]}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold" style={{ color: link.color }}>{link.label.split(' ').slice(1).join(' ')}</div>
                  <div className="text-[10px] text-gray-600">{link.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
