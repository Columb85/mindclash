'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/** SSR-rendered black splash — visible in first HTML paint, before React hydrates */
export function LandingSplashOverlay() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<'visible' | 'fading' | 'gone'>('visible');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('fading'), 1200);
    const t2 = setTimeout(() => setPhase('gone'), 1700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Client nav to /app (etc.) — dismiss immediately; layout SSR may still think we're on /
  useEffect(() => {
    if (pathname !== '/') setPhase('gone');
  }, [pathname]);

  if (pathname !== '/' || phase === 'gone') return null;

  return (
    <div
      id="landing-splash"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        transition: 'opacity 0.5s ease',
        opacity: phase === 'fading' ? 0 : 1,
        pointerEvents: 'none',
      }}
    >
      <img
        src="/mindclash-logo.png"
        alt="MindClash"
        style={{
          height: 120,
          width: 'auto',
          filter: 'drop-shadow(0 0 30px rgba(0,212,170,0.5))',
          animation: 'splashLogoIn 0.5s ease-out both',
        }}
      />
      <div style={{ position: 'relative', width: 44, height: 44 }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '2px solid rgba(0,212,170,0.15)',
          borderTopColor: '#00D4AA',
          animation: 'spinCW 1s linear infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 5, borderRadius: '50%',
          border: '2px solid rgba(168,85,247,0.15)',
          borderTopColor: '#a855f7',
          animation: 'spinCCW 1.4s linear infinite',
        }} />
      </div>
      <div style={{
        fontSize: 10, color: '#00D4AA', fontWeight: 700,
        letterSpacing: '0.2em', opacity: 0.7,
        animation: 'splashBlink 1.2s ease-in-out infinite',
      }}>
        INITIALIZING
      </div>
      <style>{`
        @keyframes spinCW   { to { transform: rotate(360deg);  } }
        @keyframes spinCCW  { to { transform: rotate(-360deg); } }
        @keyframes splashLogoIn { from { opacity:0; transform:scale(0.75); } to { opacity:1; transform:scale(1); } }
        @keyframes splashBlink  { 0%,100% { opacity:0.3; } 50% { opacity:0.9; } }
      `}</style>
    </div>
  );
}
