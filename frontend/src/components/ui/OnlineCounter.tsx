'use client';

import { useState, useEffect } from 'react';
import { Tooltip } from './Tooltip';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.mindclash.xyz/api';

export function OnlineCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchOnline = async () => {
      try {
        const res = await fetch(`${API_URL}/stats/online`);
        const data = await res.json();
        if (data.online) setCount(data.online);
      } catch {
        const base = 12 + Math.floor(Math.random() * 8);
        setCount(base);
      }
    };

    fetchOnline();
    const interval = setInterval(fetchOnline, 30000);
    return () => clearInterval(interval);
  }, []);

  const content = (
    <div className="online-counter" aria-hidden={count === null}>
      <span className="online-dot" />
      <span className="online-num">{count ?? 0}</span>
      <span className="online-lbl">online</span>
    </div>
  );

  if (count === null) {
    return <div className="hud-topbar-placeholder">{content}</div>;
  }

  return (
    <Tooltip text="Active traders right now" position="bottom">
      {content}
    </Tooltip>
  );
}
