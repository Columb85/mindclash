import { NextResponse } from 'next/server';

// This API route acts as a proxy to avoid CORS issues
// GET /api/prices?symbols=BTC,ETH,SOL,MNT

const BYBIT_LINEAR_REST = 'https://api.bybit.com/v5/market/tickers?category=linear';
const BYBIT_SPOT_REST = 'https://api.bybit.com/v5/market/tickers?category=spot';
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price';

const LINEAR_SYMBOLS: Record<string, string> = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  SOL: 'SOLUSDT',
};

const SPOT_SYMBOLS: Record<string, string> = {
  MNT: 'MNTUSDT',
};

const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  MNT: 'mantle',
};

interface PriceTick {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols') || 'BTC,ETH,SOL,MNT';
  const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase());
  
  const result: Record<string, PriceTick> = {};
  
  // Fetch from Bybit Linear (BTC, ETH, SOL)
  for (const symbol of symbols) {
    if (LINEAR_SYMBOLS[symbol]) {
      try {
        const res = await fetch(`${BYBIT_LINEAR_REST}&symbol=${LINEAR_SYMBOLS[symbol]}`, {
          headers: { 'Accept': 'application/json' },
          next: { revalidate: 5 }, // Cache for 5 seconds
        });
        const data = await res.json();
        const item = data?.result?.list?.[0];
        if (item) {
          result[symbol] = {
            symbol,
            price: parseFloat(item.lastPrice || '0'),
            change24h: parseFloat(item.price24hPcnt || '0') * 100,
            high24h: parseFloat(item.highPrice24h || '0'),
            low24h: parseFloat(item.lowPrice24h || '0'),
            volume24h: parseFloat(item.volume24h || '0'),
            timestamp: Date.now(),
          };
        }
      } catch (e) {
        console.error(`[API/prices] Failed to fetch ${symbol} from Bybit linear:`, e);
      }
    }
  }
  
  // Fetch from Bybit Spot (MNT)
  for (const symbol of symbols) {
    if (SPOT_SYMBOLS[symbol] && !result[symbol]) {
      try {
        const res = await fetch(`${BYBIT_SPOT_REST}&symbol=${SPOT_SYMBOLS[symbol]}`, {
          headers: { 'Accept': 'application/json' },
          next: { revalidate: 5 },
        });
        const data = await res.json();
        const item = data?.result?.list?.[0];
        if (item) {
          result[symbol] = {
            symbol,
            price: parseFloat(item.lastPrice || '0'),
            change24h: parseFloat(item.price24hPcnt || '0') * 100,
            high24h: parseFloat(item.highPrice24h || '0'),
            low24h: parseFloat(item.lowPrice24h || '0'),
            volume24h: parseFloat(item.volume24h || '0'),
            timestamp: Date.now(),
          };
        }
      } catch (e) {
        console.error(`[API/prices] Failed to fetch ${symbol} from Bybit spot:`, e);
      }
    }
  }
  
  // Fallback to CoinGecko for any missing
  const missing = symbols.filter(s => !result[s]);
  if (missing.length > 0) {
    try {
      const ids = missing.map(s => COINGECKO_IDS[s]).filter(Boolean).join(',');
      if (ids) {
        const url = `${COINGECKO_API}?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`;
        const res = await fetch(url, {
          headers: { 'Accept': 'application/json' },
          next: { revalidate: 30 }, // CoinGecko rate limits, cache longer
        });
        const data = await res.json();
        
        missing.forEach(symbol => {
          const id = COINGECKO_IDS[symbol];
          const coinData = data[id];
          if (coinData?.usd) {
            result[symbol] = {
              symbol,
              price: coinData.usd,
              change24h: coinData.usd_24h_change || 0,
              high24h: coinData.usd * 1.02,
              low24h: coinData.usd * 0.98,
              volume24h: coinData.usd_24h_vol || 0,
              timestamp: Date.now(),
            };
          }
        });
      }
    } catch (e) {
      console.error('[API/prices] Failed to fetch from CoinGecko:', e);
    }
  }
  
  return NextResponse.json({
    success: true,
    data: result,
    timestamp: Date.now(),
  });
}
