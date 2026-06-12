'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, TrendingUp, TrendingDown, Trophy, CheckCircle2, Zap } from 'lucide-react';
import { useActivity, ActivityEvent } from '@/contexts/ActivityContext';
import { bybitPriceFeed, AssetSymbol, PriceTick } from '@/lib/bybit-price-feed';
import { CryptoImg } from '@/components/icons/CryptoIcons';

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

function EventRow({ ev }: { ev: ActivityEvent }) {
  if (ev.type === 'prediction') {
    const isUp = ev.direction === 'UP';
    return (
      <div className="flex items-center gap-2 text-sm">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isUp ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
          {isUp ? <TrendingUp className="w-3.5 h-3.5 text-green-500" /> : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-gray-300 truncate">
            <span className="font-mono text-xs text-gray-400">{ev.actor}</span>
            <span className="mx-1 text-gray-500">→</span>
            <span className={`font-bold ${isUp ? 'text-green-500' : 'text-red-500'}`}>{ev.direction}</span>
            <span className="text-gray-400"> {ev.asset}</span>
          </div>
          <div className="text-xs text-gray-500">{ev.amount} {ev.token}</div>
        </div>
        <span className="text-[10px] text-gray-500 flex-shrink-0">{timeAgo(ev.timestamp)}</span>
      </div>
    );
  }
  if (ev.type === 'round_end') {
    const isUp = ev.winner === 'UP';
    return (
      <div className="flex items-center gap-2 text-sm">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-500/20">
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0 text-gray-300 truncate">
          <span className="text-gray-400">{ev.asset} round ended</span>
          <span className={`ml-2 font-bold ${isUp ? 'text-green-500' : 'text-red-500'}`}>{ev.winner} won</span>
        </div>
        <span className="text-[10px] text-gray-500 flex-shrink-0">{timeAgo(ev.timestamp)}</span>
      </div>
    );
  }
  if (ev.type === 'big_win') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-yellow-500/20">
          <Trophy className="w-3.5 h-3.5 text-yellow-400" />
        </div>
        <div className="flex-1 min-w-0 truncate">
          <span className="font-mono text-xs text-gray-400">{ev.actor}</span>
          <span className="text-yellow-400 font-bold ml-1">won {ev.amount} {ev.token}</span>
        </div>
        <span className="text-[10px] text-gray-500 flex-shrink-0">{timeAgo(ev.timestamp)}</span>
      </div>
    );
  }
  return null;
}

export function ActivityFeed() {
  const { events } = useActivity();

  return (
    <div className="glass rounded-2xl border border-dark-border overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-dark-border bg-dark-surface/50">
        <Activity className="w-4 h-4 text-blue-500" />
        <span className="font-semibold text-white text-sm">Your Activity</span>
        <span className="ml-auto flex w-2 h-2">
          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
      </div>
      <div className="max-h-[420px] overflow-y-auto">
        {events.length === 0 ? (
          <p className="px-4 py-8 text-sm text-gray-500 text-center">
            Your predictions and round results appear here during play.
          </p>
        ) : (
        <AnimatePresence initial={false}>
          {events.slice(0, 25).map(ev => (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, x: -10, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="px-4 py-2.5 border-b border-dark-border/50 hover:bg-dark-surface/30 transition-colors"
            >
              <EventRow ev={ev} />
            </motion.div>
          ))}
        </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ── Asset config for ticker ───────────────────────────────────────────────────

const TICKER_ASSETS: { symbol: AssetSymbol; label: string; color: string }[] = [
  { symbol: 'BTC', label: 'Bitcoin',  color: '#f7931a' },
  { symbol: 'ETH', label: 'Ethereum', color: '#627eea' },
  { symbol: 'SOL', label: 'Solana',   color: '#14f195' },
  { symbol: 'MNT', label: 'Mantle',   color: '#00D4AA' },
];

function formatPrice(price: number, symbol: AssetSymbol): string {
  if (symbol === 'MNT') return `$${price.toFixed(4)}`;
  if (symbol === 'SOL') return `$${price.toFixed(2)}`;
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface PriceCardProps {
  asset: typeof TICKER_ASSETS[number];
  tick: PriceTick | null;
}

function PriceCard({ asset, tick }: PriceCardProps) {
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (!tick) return;
    if (prevPrice !== null && tick.price !== prevPrice) {
      setFlash(tick.price > prevPrice ? 'up' : 'down');
      const t = setTimeout(() => setFlash(null), 600);
      return () => clearTimeout(t);
    }
    setPrevPrice(tick.price);
  }, [tick?.price]);

  const change = tick?.change24h ?? 0;
  const isUp   = change >= 0;

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors duration-300"
      style={{
        borderColor: flash === 'up' ? '#22c55e55' : flash === 'down' ? '#ef444455' : '#ffffff15',
        background:  flash === 'up' ? '#22c55e08' : flash === 'down' ? '#ef444408' : 'transparent',
      }}
    >
      <CryptoImg symbol={asset.symbol} className="w-5 h-5" />
      <div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-gray-300">{asset.symbol}</span>
          <span
            className="text-sm font-mono font-bold transition-colors"
            style={{ color: flash === 'up' ? '#22c55e' : flash === 'down' ? '#ef4444' : '#fff' }}
          >
            {tick ? formatPrice(tick.price, asset.symbol) : '—'}
          </span>
        </div>
        <div className={`text-[10px] font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          {tick ? `${isUp ? '+' : ''}${change.toFixed(2)}%` : '…'}
        </div>
      </div>
    </div>
  );
}

/**
 * LiveTicker — real-time Bybit prices scrolling strip
 * Replaces the old activity-event ticker with actual market data
 */
export function LiveTicker() {
  const [prices, setPrices] = useState<Record<string, PriceTick>>({});

  useEffect(() => {
    const unsubs = TICKER_ASSETS.map(({ symbol }) =>
      bybitPriceFeed.subscribe(symbol, tick => {
        setPrices(prev => ({ ...prev, [symbol]: tick }));
      })
    );

    bybitPriceFeed.fetchOnce(TICKER_ASSETS.map(a => a.symbol)).then(map => {
      const p: Record<string, PriceTick> = {};
      map.forEach((tick, sym) => { p[sym] = tick; });
      setPrices(p);
    });

    return () => unsubs.forEach(u => u());
  }, []);

  return (
    <div className="relative overflow-hidden rounded-xl border border-dark-border bg-dark-surface/40 backdrop-blur-sm px-4 py-2">
      {/* Left/right fade */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-dark-surface/80 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-dark-surface/80 to-transparent z-10 pointer-events-none" />

      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {/* Live badge */}
        <div className="flex items-center gap-1.5 pr-4 border-r border-dark-border mr-2 flex-shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Bybit Live</span>
        </div>

        {/* Price cards */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {TICKER_ASSETS.map(asset => (
            <PriceCard key={asset.symbol} asset={asset} tick={prices[asset.symbol] ?? null} />
          ))}
        </div>

        {/* Powered by */}
        <div className="ml-4 pl-4 border-l border-dark-border flex-shrink-0">
          <span className="text-[10px] text-gray-600">Powered by Bybit</span>
        </div>
      </div>
    </div>
  );
}
