'use client';

import { useState, ReactNode } from 'react';

interface TooltipProps {
  text: string;
  children: ReactNode;
  position?: 'top' | 'bottom';
  delay?: number;
}

export function Tooltip({ text, children, position = 'top', delay = 300 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const show = () => {
    const id = setTimeout(() => setVisible(true), delay);
    setTimeoutId(id);
  };

  const hide = () => {
    if (timeoutId) clearTimeout(timeoutId);
    setVisible(false);
  };

  return (
    <div 
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && (
        <div 
          className="absolute z-50 pointer-events-none"
          style={{
            ...(position === 'top' 
              ? { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6 }
              : { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 6 }
            ),
          }}
        >
          <div className="hud-tooltip">{text}</div>
        </div>
      )}
    </div>
  );
}
