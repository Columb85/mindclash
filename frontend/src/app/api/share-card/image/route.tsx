import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const s = req.nextUrl.searchParams;
  const outcome = s.get('outcome') || 'win';
  const amount = s.get('amount') || '0';
  const asset = s.get('asset') || 'BTC';
  const entry = s.get('entry') || '0';
  const exit = s.get('exit') || '0';
  const pct = s.get('pct') || '0';
  const xp = s.get('xp') || '0';

  const isWin = outcome === 'win';
  const accent = isWin ? '#00ff88' : '#ff3355';
  const accentBg = isWin ? 'rgba(0,255,136,0.12)' : 'rgba(255,51,85,0.12)';
  const accentBorder = isWin ? 'rgba(0,255,136,0.5)' : 'rgba(255,51,85,0.5)';

  return new ImageResponse(
    (
      <div
        style={{
          width: '800px',
          height: '418px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #0c0e14 0%, #080a0f 100%)',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            height: '300px',
            borderRadius: '50%',
            background: `radial-gradient(ellipse, ${accent}25 0%, transparent 70%)`,
          }}
        />

        {/* Logo */}
        <div style={{ display: 'flex', fontSize: '28px', fontWeight: 700, marginBottom: '12px', gap: '0' }}>
          <span style={{ color: '#00e5ff' }}>Mind</span>
          <span style={{ color: '#fbbf24' }}>Clash</span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '52px',
            fontWeight: 900,
            color: accent,
            letterSpacing: '0.1em',
            lineHeight: 1,
            marginBottom: '10px',
            textShadow: `0 0 30px ${accent}66`,
          }}
        >
          {isWin ? 'YOU WIN!' : 'YOU LOSE'}
        </div>

        {/* Amount */}
        <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '20px', letterSpacing: '0.05em' }}>
          {isWin ? '+' : '-'}{amount} $CLASH
        </div>

        {/* Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '560px',
            padding: '16px 20px',
            border: `2px solid ${accentBorder}`,
            borderRadius: '12px',
            background: 'rgba(12,14,20,0.95)',
            gap: '12px',
          }}
        >
          {/* Asset row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#f7931a' }}>{asset}</div>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em' }}>ENTRY</span>
                <span style={{ color: '#fff', fontWeight: 700 }}>${entry}</span>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '18px' }}>→</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em' }}>EXIT</span>
                <span style={{ color: '#fff', fontWeight: 700 }}>${exit}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', padding: '2px 12px', borderRadius: '4px', background: `${accent}18`, color: accent, fontSize: '13px', fontWeight: 700 }}>
                {Number(pct) >= 0 ? '+' : ''}{pct}%
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1, padding: '12px 14px', border: `1px solid ${accentBorder}`, borderRadius: '12px', background: accentBg }}>
              <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.12em', color: accent, marginBottom: '4px' }}>
                {isWin ? 'YOU WON' : 'YOU LOST'}
              </div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#fff' }}>
                {isWin ? '+' : '-'}{amount} $CLASH
              </div>
            </div>
            {Number(xp) > 0 && (
              <div style={{ flex: 1, padding: '12px 14px', border: '1px solid rgba(168,85,247,0.42)', borderRadius: '12px', background: 'rgba(168,85,247,0.08)' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(192,132,252,0.9)', marginBottom: '4px' }}>
                  XP EARNED
                </div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#c084fc' }}>
                  +{xp} XP
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>
          mindclash.xyz · Human vs AI · On-chain on Mantle
        </div>
      </div>
    ),
    { width: 800, height: 418 },
  );
}
