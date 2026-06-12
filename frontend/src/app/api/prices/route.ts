import { NextResponse } from 'next/server';

// Proxy to private backend which has direct Bybit access (no IP restrictions)
// GET /api/prices?symbols=BTC,ETH,SOL,MNT

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.mindclash.xyz/api';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols') || 'BTC,ETH,SOL,MNT';

  try {
    const res = await fetch(`${BACKEND_URL}/prices`, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 5 },
    });

    if (!res.ok) throw new Error(`Backend responded with ${res.status}`);

    const data = await res.json();

    // Filter to requested symbols if needed
    if (data?.data && symbolsParam !== 'BTC,ETH,SOL,MNT') {
      const requested = symbolsParam.split(',').map(s => s.trim().toUpperCase());
      const filtered = Object.fromEntries(
        Object.entries(data.data).filter(([k]) => requested.includes(k))
      );
      return NextResponse.json({ ...data, data: filtered });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error('[API/prices] Backend unreachable:', e);
    return NextResponse.json(
      { success: false, error: 'Price feed unavailable', data: {} },
      { status: 502 }
    );
  }
}
