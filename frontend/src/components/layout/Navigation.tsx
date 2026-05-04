'use client';

import { HomeIcon, UserIcon, CrownIcon, TargetIcon, AIBrainIcon, SwordIcon } from '@/components/icons/MantleIcons';
import { useQuests } from '@/contexts/QuestsContext';

export type View = 'lobby' | 'game' | 'leaderboard' | 'quests' | 'profile' | 'ai-battle';

interface NavigationProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

export function Navigation({ currentView, onViewChange }: NavigationProps) {
  const { completedCount, totalCount } = useQuests();
  const hasIncompleteQuests = completedCount < totalCount;

  const navItems = [
    { id: 'lobby' as View,       label: 'Arena',       icon: AIBrainIcon,  color: '#a855f7' },
    { id: 'ai-battle' as View,   label: 'Battle',      icon: SwordIcon,    color: '#ef4444' },
    { id: 'leaderboard' as View, label: 'Rankings',    icon: CrownIcon,    color: '#f59e0b' },
    { id: 'quests' as View,      label: 'Quests',      icon: TargetIcon,   color: '#22c55e', badge: hasIncompleteQuests },
    { id: 'profile' as View,     label: 'Profile',     icon: UserIcon,     color: '#3b82f6' },
  ];

  return (
    <nav className="flex items-center gap-1 bg-dark-surface/50 backdrop-blur-sm p-1 rounded-xl border border-dark-border">
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
    </nav>
  );
}
