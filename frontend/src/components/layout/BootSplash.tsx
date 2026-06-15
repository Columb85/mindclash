interface BootSplashProps {
  label?: string;
}

/** Logo + dual-ring spinner — matches LandingSplashOverlay */
export function BootSplash({ label = 'INITIALIZING' }: BootSplashProps) {
  return (
    <div
      className="min-h-screen"
      style={{
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
      }}
    >
      <img
        src="/mindclash-logo.png"
        alt="MindClash"
        style={{
          height: 120,
          width: 'auto',
          filter: 'drop-shadow(0 0 30px rgba(0,212,170,0.5))',
          animation: 'bootLogoIn 0.5s ease-out both',
        }}
      />
      <div style={{ position: 'relative', width: 44, height: 44 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2px solid rgba(0,212,170,0.15)',
            borderTopColor: '#00D4AA',
            animation: 'bootSpinCW 1s linear infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 5,
            borderRadius: '50%',
            border: '2px solid rgba(168,85,247,0.15)',
            borderTopColor: '#a855f7',
            animation: 'bootSpinCCW 1.4s linear infinite',
          }}
        />
      </div>
      <div
        style={{
          fontSize: 10,
          color: '#00D4AA',
          fontWeight: 700,
          letterSpacing: '0.2em',
          opacity: 0.7,
          animation: 'bootBlink 1.2s ease-in-out infinite',
        }}
      >
        {label}
      </div>
      <style>{`
        @keyframes bootSpinCW  { to { transform: rotate(360deg);  } }
        @keyframes bootSpinCCW { to { transform: rotate(-360deg); } }
        @keyframes bootLogoIn  { from { opacity:0; transform:scale(0.75); } to { opacity:1; transform:scale(1); } }
        @keyframes bootBlink   { 0%,100% { opacity:0.3; } 50% { opacity:0.9; } }
      `}</style>
    </div>
  );
}
