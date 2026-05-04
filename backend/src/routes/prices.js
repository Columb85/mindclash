/**
 * Price Feed API Routes
 * 
 * Endpoints for fetching real-time cryptocurrency prices from Bybit
 */

const express = require('express');
const router = express.Router();

// ── Supported trading pairs ─────────────────────────────────────────────────
const SUPPORTED_PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'MNTUSDT'];

// ── Cache for prices (simple in-memory cache) ───────────────────────────────
let priceCache = {
  data: null,
  lastUpdated: 0,
  ttl: 5000, // 5 seconds cache
};

// ── Fetch prices from Bybit REST API ────────────────────────────────────────
async function fetchPricesFromBybit() {
  const now = Date.now();
  
  // Return cached data if still valid
  if (priceCache.data && (now - priceCache.lastUpdated) < priceCache.ttl) {
    return priceCache.data;
  }
  
  try {
    const response = await fetch(
      `${process.env.BYBIT_REST_URL}?category=linear`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Bybit API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.retCode !== 0) {
      throw new Error(`Bybit API error: ${data.retMsg}`);
    }
    
    // Filter and format prices
    const prices = {};
    for (const ticker of data.result.list) {
      if (SUPPORTED_PAIRS.includes(ticker.symbol)) {
        const symbol = ticker.symbol.replace('USDT', '');
        prices[symbol] = {
          symbol: ticker.symbol,
          price: parseFloat(ticker.lastPrice),
          change24h: parseFloat(ticker.price24hPcnt) * 100,
          high24h: parseFloat(ticker.highPrice24h),
          low24h: parseFloat(ticker.lowPrice24h),
          volume24h: parseFloat(ticker.volume24h),
          turnover24h: parseFloat(ticker.turnover24h),
          timestamp: Date.now(),
        };
      }
    }
    
    // Update cache
    priceCache.data = prices;
    priceCache.lastUpdated = now;
    
    return prices;
  } catch (error) {
    console.error('Error fetching Bybit prices:', error.message);
    
    // Return cached data if available, even if stale
    if (priceCache.data) {
      return priceCache.data;
    }
    
    // Return mock data as fallback
    return getMockPrices();
  }
}

// ── Mock prices for fallback ────────────────────────────────────────────────
function getMockPrices() {
  return {
    BTC: {
      symbol: 'BTCUSDT',
      price: 67500.00 + (Math.random() - 0.5) * 500,
      change24h: (Math.random() - 0.5) * 5,
      high24h: 68000.00,
      low24h: 66500.00,
      volume24h: 50000,
      turnover24h: 3375000000,
      timestamp: Date.now(),
    },
    ETH: {
      symbol: 'ETHUSDT',
      price: 3200.00 + (Math.random() - 0.5) * 50,
      change24h: (Math.random() - 0.5) * 5,
      high24h: 3250.00,
      low24h: 3150.00,
      volume24h: 200000,
      turnover24h: 640000000,
      timestamp: Date.now(),
    },
    SOL: {
      symbol: 'SOLUSDT',
      price: 145.00 + (Math.random() - 0.5) * 5,
      change24h: (Math.random() - 0.5) * 5,
      high24h: 148.00,
      low24h: 142.00,
      volume24h: 1000000,
      turnover24h: 145000000,
      timestamp: Date.now(),
    },
    MNT: {
      symbol: 'MNTUSDT',
      price: 0.85 + (Math.random() - 0.5) * 0.05,
      change24h: (Math.random() - 0.5) * 5,
      high24h: 0.88,
      low24h: 0.82,
      volume24h: 5000000,
      turnover24h: 4250000,
      timestamp: Date.now(),
    },
  };
}

// ── GET /api/prices - Get all prices ────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const prices = await fetchPricesFromBybit();
    
    res.json({
      success: true,
      data: prices,
      timestamp: Date.now(),
      source: priceCache.data ? 'bybit' : 'mock',
    });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/prices/:symbol - Get price for specific symbol ─────────────────
router.get('/:symbol', async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const prices = await fetchPricesFromBybit();
    
    if (!prices[symbol]) {
      return res.status(404).json({
        success: false,
        error: `Price not found for symbol: ${symbol}`,
        availableSymbols: Object.keys(prices),
      });
    }
    
    res.json({
      success: true,
      data: prices[symbol],
      timestamp: Date.now(),
    });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/prices/history/:symbol - Get price history (mock) ──────────────
router.get('/history/:symbol', async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const interval = req.query.interval || '1h';
    const limit = Math.min(parseInt(req.query.limit) || 24, 100);
    
    // Generate mock historical data
    const now = Date.now();
    const intervalMs = interval === '1h' ? 3600000 : interval === '15m' ? 900000 : 60000;
    
    const basePrice = symbol === 'BTC' ? 67000 : symbol === 'ETH' ? 3200 : symbol === 'SOL' ? 145 : 0.85;
    
    const history = [];
    for (let i = limit; i >= 0; i--) {
      const timestamp = now - (i * intervalMs);
      const variance = (Math.random() - 0.5) * (basePrice * 0.02);
      const open = basePrice + variance;
      const close = open + (Math.random() - 0.5) * (basePrice * 0.01);
      const high = Math.max(open, close) + Math.random() * (basePrice * 0.005);
      const low = Math.min(open, close) - Math.random() * (basePrice * 0.005);
      
      history.push({
        timestamp,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume: Math.floor(Math.random() * 1000),
      });
    }
    
    res.json({
      success: true,
      symbol,
      interval,
      data: history,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
