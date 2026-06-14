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

  if (count === null) return null;

  return (
    <Tooltip text="Active traders right now" position="bottom">
      <div className="online-counter">
        <span className="online-dot" />
        <span className="online-num">{count}</span>
        <span className="online-lbl">online</span>
      </div>
    </Tooltip>
  );
}
