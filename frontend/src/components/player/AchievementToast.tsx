'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Zap, Target, X } from 'lucide-react';
import type { Toast } from 'react-hot-toast';
import { Achievement } from '@/contexts/PlayerContext';

const iconMap: Record<string, React.ElementType> = {
  trophy: Trophy,
  star:   Star,
  zap:    Zap,
  target: Target,
  '🏆':  Trophy,
  '⭐':  Star,
  '🌟':  Star,
  '⚡':  Zap,
  '🎯':  Target,
};

const typeConfig: Record<Achievement['type'], {
  gradient: string;
  glow: string;
  border: string;
  badge: string;
}> = {
  bronze:   { gradient: 'from-orange-500 to-amber-600',   glow: 'rgba(249,115,22,0.25)',  border: 'rgba(249,115,22,0.35)',  badge: '#f97316' },
  silver:   { gradient: 'from-slate-300 to-slate-500',    glow: 'rgba(148,163,184,0.2)',  border: 'rgba(148,163,184,0.3)', badge: '#94a3b8' },
  gold:     { gradient: 'from-yellow-400 to-amber-500',   glow: 'rgba(234,179,8,0.3)',    border: 'rgba(234,179,8,0.4)',   badge: '#eab308' },
  platinum: { gradient: 'from-purple-400 to-violet-600',  glow: 'rgba(168,85,247,0.3)',   border: 'rgba(168,85,247,0.4)',  badge: '#a855f7' },
};

interface AchievementToastProps {
  achievement: Achievement | null;
  /** react-hot-toast passes its Toast object when used via toast.custom() */
  t?: Toast;
  onClose?: () => void;
}

export function AchievementToast({ achievement, t, onClose }: AchievementToastProps) {
  if (!achievement) return null;

  const Icon   = iconMap[achievement.icon] ?? Trophy;
  const config = typeConfig[achievement.type] ?? typeConfig.gold;

  return (
    <motion.div
      initial={{ opacity: 0, x: 60, scale: 0.92 }}
      animate={{
        opacity: t ? (t.visible ? 1 : 0) : 1,
        x:       t ? (t.visible ? 0 : 60) : 0,
        scale:   1,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="pointer-events-auto flex items-start gap-3 rounded-2xl p-4 pr-3"
      style={{
        minWidth: 280,
        maxWidth: 340,
        background: 'rgba(8, 8, 18, 0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${config.border}`,
        borderLeft: `3px solid ${config.badge}`,
        boxShadow: `0 8px 40px rgba(0,0,0,0.6), 0 0 30px ${config.glow}`,
      }}
    >
      {/* Icon */}
      <div
        className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${config.badge}25, ${config.badge}10)`, border: `1px solid ${config.badge}40` }}
      >
        <Icon className="w-5 h-5" style={{ color: config.badge }} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: config.badge }}>
            Achievement Unlocked
          </span>
        </div>
        <p className="text-sm font-black text-white leading-tight">{achievement.title}</p>
        <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{achievement.description}</p>
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        className="shrink-0 mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-300 hover:bg-white/[0.06] transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}
