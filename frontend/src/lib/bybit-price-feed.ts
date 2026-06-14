'use client';

/**
 * Price feed using local API proxy to avoid CORS issues
 * Provides real-time prices for BTC, ETH, SOL, MNT
 * 
 * Uses:
 * - /api/prices route as proxy (Bybit + CoinGecko fallback)
 * - WebSocket for real-time updates (BTC, ETH, SOL only)
 */

export type AssetSymbol = 'BTC' | 'ETH' | 'SOL' | 'MNT';

export interface PriceTick {
  symbol: AssetSymbol;
  price: number;
  change24h: number;   // percent
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: number;
}

type PriceListener = (tick: PriceTick) => void;

// Local API proxy endpoint
const PRICE_API = '/api/prices';

// Bybit WebSocket for real-time updates (BTC, ETH, SOL - MNT not available)
const BYBIT_WS_URL = 'wss://stream.bybit.com/v5/public/linear';

const WS_SYMBOLS: Record<string, AssetSymbol> = {
  BTCUSDT: 'BTC',
  ETHUSDT: 'ETH',
  SOLUSDT: 'SOL',
};

class BybitPriceFeed {
  private ws: WebSocket | null = null;
  private listeners = new Map<AssetSymbol, Set<PriceListener>>();
  private latestPrices = new Map<AssetSymbol, PriceTick>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private isConnecting = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  // ── Public API ──────────────────────────────────────────────────────────────

  subscribe(symbol: AssetSymbol, listener: PriceListener): () => void {
    if (!this.listeners.has(symbol)) {
      this.listeners.set(symbol, new Set());
    }
    this.listeners.get(symbol)!.add(listener);

    // Immediately emit cached price if available
    const cached = this.latestPrices.get(symbol);
    if (cached) {
      listener(cached);
    }

    // Initialize if not already
    if (!this.initialized) {
      this.initialize();
    }

    return () => {
      this.listeners.get(symbol)?.delete(listener);
      if (this.listeners.get(symbol)?.size === 0) {
        this.listeners.delete(symbol);
      }
      if (this.listeners.size === 0) {
        this.disconnect();
      }
    };
  }

  getLatestPrice(symbol: AssetSymbol): PriceTick | null {
    return this.latestPrices.get(symbol) ?? null;
  }

  /** Fetch all prices once via API proxy */
  async fetchOnce(symbols: AssetSymbol[] = ['BTC', 'ETH', 'SOL', 'MNT']): Promise<Map<AssetSymbol, PriceTick>> {
    const result = new Map<AssetSymbol, PriceTick>();
    
    try {
      const response = await fetch(`${PRICE_API}?symbols=${symbols.join(',')}`);
      const json = await response.json();
      
      if (json.success && json.data) {
        symbols.forEach(symbol => {
          const tickData = json.data[symbol];
          if (tickData && tickData.price > 0) {
            const tick: PriceTick = {
              symbol,
              price: tickData.price,
              change24h: tickData.change24h,
              high24h: tickData.high24h,
              low24h: tickData.low24h,
              volume24h: tickData.volume24h,
              timestamp: tickData.timestamp || Date.now(),
            };
            result.set(symbol, tick);
            this.latestPrices.set(symbol, tick);
          }
        });
      }
    } catch {
      // silently handle API fetch failure
    }
    
    return result;
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async initialize() {
    if (this.initialized) return;
    this.initialized = true;
    
    const prices = await this.fetchOnce(['BTC', 'ETH', 'SOL', 'MNT']);
    
    // Notify all listeners of initial prices
    prices.forEach((tick, symbol) => {
      this.listeners.get(symbol)?.forEach(fn => fn(tick));
    });
    
    // Start polling for updates
    this.startPolling();
    
    // Try to connect WebSocket for faster updates (may fail due to CORS)
    if (typeof window !== 'undefined') {
      this.connectWebSocket();
    }
  }

  private startPolling() {
    if (this.pollTimer) return;
    
    const poll = async () => {
      const prices = await this.fetchOnce(['BTC', 'ETH', 'SOL', 'MNT']);
      prices.forEach((tick, symbol) => {
        this.listeners.get(symbol)?.forEach(fn => fn(tick));
      });
    };
    
    this.pollTimer = setInterval(poll, 5000);
  }

  private stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private connectWebSocket() {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) return;
    
    this.isConnecting = true;
    
    try {
      this.ws = new WebSocket(BYBIT_WS_URL);
    } catch {
      this.isConnecting = false;
      return;
    }

    this.ws.onopen = () => {
      this.isConnecting = false;
      this.sendSubscription();
      this.startPing();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.topic?.startsWith('tickers.') && msg.data) {
          const bybitSym: string = msg.data.symbol;
          const asset = WS_SYMBOLS[bybitSym];
          if (!asset) return;
          
          const tick: PriceTick = {
            symbol: asset,
            price: parseFloat(msg.data.lastPrice || '0'),
            change24h: parseFloat(msg.data.price24hPcnt || '0') * 100,
            high24h: parseFloat(msg.data.highPrice24h || '0'),
            low24h: parseFloat(msg.data.lowPrice24h || '0'),
            volume24h: parseFloat(msg.data.volume24h || '0'),
            timestamp: Date.now(),
          };
          
          if (tick.price > 0) {
            this.latestPrices.set(asset, tick);
            this.listeners.get(asset)?.forEach(fn => fn(tick));
          }
        }
      } catch {
        // ignore parse errors
      }
    };

    this.ws.onerror = () => {
      this.isConnecting = false;
    };

    this.ws.onclose = () => {
      this.isConnecting = false;
      this.stopPing();
      
      // Reconnect after 10 seconds if still have listeners
      if (this.listeners.size > 0) {
        this.reconnectTimer = setTimeout(() => this.connectWebSocket(), 10000);
      }
    };
  }

  private sendSubscription() {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    
    const args = Object.keys(WS_SYMBOLS).map(sym => `tickers.${sym}`);
    this.ws.send(JSON.stringify({ op: 'subscribe', args }));
  }

  private startPing() {
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ op: 'ping' }));
      }
    }, 20_000);
  }

  private stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private disconnect() {
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.stopPing();
    this.stopPolling();
    
    this.ws?.close();
    this.ws = null;
    this.isConnecting = false;
    this.initialized = false;
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────
export const bybitPriceFeed = new BybitPriceFeed();
