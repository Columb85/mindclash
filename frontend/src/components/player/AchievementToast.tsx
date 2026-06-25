'use client';

import React from 'react';
import type { Toast } from 'react-hot-toast';
import { Achievement } from '@/contexts/PlayerContext';

const typeConfig: Record<Achievement['type'], {
  accent: string;
  glow: string;
  bg: string;
}> = {
  bronze:   { accent: '#f97316', glow: 'rgba(249,115,22,0.25)', bg: 'rgba(30,18,8,0.95)' },
  silver:   { accent: '#94a3b8', glow: 'rgba(148,163,184,0.2)', bg: 'rgba(15,18,22,0.95)' },
  gold:     { accent: '#eab308', glow: 'rgba(234,179,8,0.3)',   bg: 'rgba(25,20,5,0.95)' },
  platinum: { accent: '#a855f7', glow: 'rgba(168,85,247,0.3)',  bg: 'rgba(20,10,30,0.95)' },
};

interface AchievementToastProps {
  achievement: Achievement | null;
  t?: Toast;
  onClose?: () => void;
}

export function AchievementToast({ achievement, t }: AchievementToastProps) {
  if (!achievement) return null;

  const config = typeConfig[achievement.type] ?? typeConfig.gold;
  const duration = 5000;

  return (
    <div
      style={{
        background: config.bg,
        border: `1px solid ${config.accent}44`,
        borderLeft: `3px solid ${config.accent}`,
        padding: '12px 16px',
        fontSize: '12px',
        fontFamily: 'Barlow Condensed, sans-serif',
        fontWeight: 500,
        letterSpacing: '0.03em',
        color: '#e2e8f0',
        boxShadow: `0 4px 20px rgba(0,0,0,0.6), 0 0 20px ${config.glow}`,
        maxWidth: '360px',
        minWidth: '260px',
        clipPath: 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        opacity: t ? (t.visible ? 1 : 0) : 1,
        transform: t ? (t.visible ? 'translateX(0)' : 'translateX(100%)') : undefined,
        transition: 'all 0.3s ease',
      }}
    >
      <span style={{ fontSize: '20px', flexShrink: 0 }}>{achievement.icon}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: config.accent, marginBottom: 2 }}>
          Achievement Unlocked
        </div>
        <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
          {achievement.title}
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
          {achievement.description}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '2px',
          background: config.accent,
          animation: `toast-progress ${duration}ms linear forwards`,
        }}
      />
      <style>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
