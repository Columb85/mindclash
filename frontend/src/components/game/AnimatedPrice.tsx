'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function AnimatedPrice({ value, className }: { value: number; className?: string }) {
  const prevRef = useRef(value);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (value > prevRef.current) setFlash('up');
    else if (value < prevRef.current) setFlash('down');
    prevRef.current = value;
    const t = setTimeout(() => setFlash(null), 500);
    return () => clearTimeout(t);
  }, [value]);

  const color = flash === 'up' ? 'text-green-400' : flash === 'down' ? 'text-red-400' : 'text-white';

  return (
    <div className={`relative ${className}`}>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value.toFixed(2)}
          initial={{ y: flash === 'up' ? 12 : flash === 'down' ? -12 : 0, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: flash === 'up' ? -12 : 12, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className={`inline-block font-bold tabular-nums transition-colors ${color}`}
        >
          ${value.toFixed(2)}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

export function CountdownDigits({ seconds }: { seconds: number }) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return (
    <span className="font-mono tabular-nums tracking-tight">
      {m}:{sec.toString().padStart(2, '0')}
    </span>
  );
}
