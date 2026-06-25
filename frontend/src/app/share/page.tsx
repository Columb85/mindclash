import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mindclash.xyz';

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function str(v: string | string[] | undefined, fallback = ''): string {
  return (Array.isArray(v) ? v[0] : v) ?? fallback;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const outcome = str(sp.outcome, 'win');
  const amount  = str(sp.amount, '0');
  const asset   = str(sp.asset, 'BTC');
  const entry   = str(sp.entry, '0');
  const exit    = str(sp.exit, '0');
  const pct     = str(sp.pct, '0');
  const xp      = str(sp.xp, '0');

  const isWin = outcome === 'win';
  const title = isWin
    ? `🎯 Won +${amount} $CLASH on MindClash!`
    : `💀 Lost ${amount} $CLASH on MindClash`;
  const description = `${asset} went ${Number(pct) >= 0 ? '+' : ''}${pct}% · Entry $${entry} → Exit $${exit} · Human vs AI · On-chain on Mantle`;

  const ogParams = new URLSearchParams({ outcome, amount, asset, entry, exit, pct, xp });
  const ogImage = `${SITE}/api/share-card/image?${ogParams.toString()}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 800, height: 418 }],
      type: 'website',
      siteName: 'MindClash',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function SharePage({ searchParams }: Props) {
  const sp = await searchParams;
  const outcome = str(sp.outcome, 'win');
  const amount  = str(sp.amount, '0');
  const asset   = str(sp.asset, 'BTC');
  const isWin   = outcome === 'win';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#080a0f',
        color: '#fff',
        fontFamily: 'system-ui',
        textAlign: 'center',
        padding: '20px',
      }}
    >
      <div>
        <h1 style={{ color: isWin ? '#00ff88' : '#ff3355', fontSize: '2rem' }}>
          {isWin ? 'Victory!' : 'Defeat!'}
        </h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.7, marginTop: '12px' }}>
          {isWin ? 'Won' : 'Lost'} {amount} $CLASH on {asset}
        </p>
        <p style={{ marginTop: '24px', opacity: 0.5, fontSize: '0.9rem' }}>
          <a href={SITE} style={{ color: '#00e5ff', textDecoration: 'underline' }}>
            Play MindClash &rarr;
          </a>
        </p>
      </div>
    </div>
  );
}
