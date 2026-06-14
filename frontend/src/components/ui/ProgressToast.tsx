'use client';

import toast from 'react-hot-toast';

interface ProgressToastOptions {
  duration?: number;
  icon?: string;
  type?: 'default' | 'success' | 'error';
}

export function showToast(message: string, options: ProgressToastOptions = {}) {
  const { duration = 3500, icon, type = 'default' } = options;
  
  const bgColor = type === 'success' 
    ? 'rgba(0,40,30,0.95)' 
    : type === 'error' 
      ? 'rgba(40,15,15,0.95)' 
      : 'rgba(13,17,23,0.95)';
  
  const borderColor = type === 'success'
    ? 'rgba(0,212,170,0.4)'
    : type === 'error'
      ? 'rgba(255,85,85,0.4)'
      : 'rgba(0,212,170,0.2)';

  const progressColor = type === 'success'
    ? '#00d4aa'
    : type === 'error'
      ? '#ff5555'
      : '#00d4aa';

  return toast.custom(
    (t) => (
      <div
        style={{
          background: bgColor,
          border: `1px solid ${borderColor}`,
          padding: '12px 16px',
          fontSize: '12px',
          fontFamily: 'Barlow Condensed, sans-serif',
          fontWeight: 500,
          letterSpacing: '0.03em',
          color: '#e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
          maxWidth: '360px',
          clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          opacity: t.visible ? 1 : 0,
          transform: t.visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'all 0.3s ease',
        }}
      >
        {icon && <span style={{ fontSize: '14px' }}>{icon}</span>}
        <span>{message}</span>
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '2px',
            background: progressColor,
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
    ),
    { duration }
  );
}

export const progressToast = {
  show: (message: string, icon?: string) => showToast(message, { icon }),
  success: (message: string, icon = '✓') => showToast(message, { icon, type: 'success' }),
  error: (message: string, icon = '✕') => showToast(message, { icon, type: 'error' }),
};
