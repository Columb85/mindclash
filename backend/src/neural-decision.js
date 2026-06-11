/**
 * Unified bot decision engine — optional LLM + rules fallback.
 *
 * NEURAL_PROVIDER env:
 *   rules     — TA-based (default, no API key)
 *   openai    — OpenAI chat completions
 *   groq      — Groq OpenAI-compatible API
 *
 * Used by POST /api/agents/decide
 */

const STRATEGY_MAP = {
  5: 'momentum',
  6: 'mean-reversion',
  7: 'neural',
};

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let avgGain = 0, avgLoss = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= period; avgLoss /= period;
  if (avgLoss === 0) return 100;
  return parseFloat((100 - 100 / (1 + avgGain / avgLoss)).toFixed(2));
}

async function fetchMarketSnapshot(asset) {
  const symbol = `${asset.toUpperCase()}USDT`;
  const kResp = await fetch(`https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=1&limit=30`);
  const kJson = await kResp.json();
  const candles = (kJson?.result?.list ?? []).reverse();
  const closes  = candles.map(c => parseFloat(c[4]));

  const tResp = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`);
  const tJson = await tResp.json();
  const ticker = tJson?.result?.list?.[0] ?? {};
  const price    = parseFloat(ticker.lastPrice ?? closes[closes.length - 1] ?? 0);
  const change24h = parseFloat(ticker.price24hPcnt ?? '0');
  const rsi = calcRSI(closes);
  const sma10 = closes.length >= 10 ? closes.slice(-10).reduce((s, v) => s + v, 0) / 10 : price;
  const sma20 = closes.length >= 20 ? closes.slice(-20).reduce((s, v) => s + v, 0) / 20 : price;

  return { asset: asset.toUpperCase(), symbol, price, change24h, rsi, sma10, sma20, closes };
}

function rulesDecision(strategy, market) {
  const { price, change24h, rsi, sma10, sma20 } = market;
  let direction, confidence, reasoning;

  if (strategy === 'momentum') {
    const bullish = [price > sma10, price > sma20, change24h > 0, rsi != null && rsi > 40 && rsi < 75];
    const bullCount = bullish.filter(Boolean).length;
    direction  = bullCount >= 2 ? 'UP' : 'DOWN';
    confidence = Math.min(950, 400 + bullCount * 130);
    reasoning  = `Momentum: ${bullCount}/4 bullish, RSI=${rsi ?? '-'}, 24h=${(change24h * 100).toFixed(2)}% → ${direction}`;
  } else if (strategy === 'mean-reversion') {
    const overbought = rsi != null && rsi > 65;
    const oversold   = rsi != null && rsi < 35;
    const extended   = Math.abs(change24h) > 0.015;
    direction  = (overbought || (change24h > 0.01 && extended)) ? 'DOWN'
      : (oversold || change24h < -0.01) ? 'UP' : (change24h >= 0 ? 'DOWN' : 'UP');
    confidence = Math.min(920, 450 + (extended ? 200 : 0) + ((overbought || oversold) ? 150 : 0));
    reasoning  = `Mean-Reversion: RSI=${rsi ?? '-'}, 24h=${(change24h * 100).toFixed(2)}% → ${direction}`;
  } else {
    const smaScore = (price > sma10 ? 1 : -1) + (price > sma20 ? 1 : -1);
    const rsiScore = rsi != null ? (rsi - 50) / 50 : 0;
    const momScore = Math.max(-1, Math.min(1, change24h * 20));
    const composite = smaScore * 0.3 + rsiScore * 0.25 + momScore * 0.35;
    direction  = composite >= 0 ? 'UP' : 'DOWN';
    confidence = Math.min(970, Math.round(500 + Math.abs(composite) * 450));
    reasoning  = `Neural rules: composite=${composite.toFixed(3)} → ${direction}`;
  }

  return { direction, confidence, stake: 250, reasoning, source: 'rules' };
}

function getLlmConfig() {
  const provider = (process.env.NEURAL_PROVIDER || 'rules').toLowerCase();
  if (provider === 'rules') return null;

  if (provider === 'groq') {
    const key = process.env.GROQ_API_KEY;
    if (!key) return null;
    return {
      url: 'https://api.groq.com/openai/v1/chat/completions',
      key,
      model: process.env.NEURAL_MODEL || 'llama-3.3-70b-versatile',
      provider: 'groq',
    };
  }

  if (provider === 'openai') {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return null;
    return {
      url: 'https://api.openai.com/v1/chat/completions',
      key,
      model: process.env.NEURAL_MODEL || 'gpt-4o-mini',
      provider: 'openai',
    };
  }

  return null;
}

async function llmDecision(strategy, market, duration = 60) {
  const cfg = getLlmConfig();
  if (!cfg) return null;

  const agentNames = { momentum: 'AlphaPredict', 'mean-reversion': 'MomentumMaster', neural: 'NeuralTrader' };
  const prompt = `You are ${agentNames[strategy] || 'NeuralTrader'}, an AI crypto prediction agent in MindClash.
Strategy: ${strategy}. Predict if ${market.asset}/USDT price goes UP or DOWN in the next ${duration} seconds.

Market data:
- Price: $${market.price}
- 24h change: ${(market.change24h * 100).toFixed(2)}%
- RSI(14): ${market.rsi ?? 'N/A'}
- SMA10: $${market.sma10.toFixed(2)}, SMA20: $${market.sma20.toFixed(2)}
- Last 5 closes: [${market.closes.slice(-5).map(c => c.toFixed(2)).join(', ')}]

Reply with ONLY valid JSON, no markdown:
{"direction":"UP"|"DOWN","confidence":400-970,"reasoning":"max 180 chars"}`;

  try {
    const resp = await fetch(cfg.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.key}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.2,
        max_tokens: 200,
        messages: [
          { role: 'system', content: 'You are a trading AI. Output strict JSON only.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!resp.ok) {
      console.warn(`[neural-decision] LLM HTTP ${resp.status}`);
      return null;
    }

    const json = await resp.json();
    const text = json?.choices?.[0]?.message?.content ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    const parsed = JSON.parse(match[0]);
    const direction = parsed.direction === 'DOWN' ? 'DOWN' : 'UP';
    const confidence = Math.min(970, Math.max(400, parseInt(parsed.confidence, 10) || 600));
    const reasoning = String(parsed.reasoning || 'LLM analysis').slice(0, 256);

    return {
      direction,
      confidence,
      stake: 250,
      reasoning: `[${cfg.provider}/${cfg.model}] ${reasoning}`,
      source: cfg.provider,
    };
  } catch (err) {
    console.warn('[neural-decision] LLM error:', err.message);
    return null;
  }
}

/**
 * Main entry — LLM if configured, else rules.
 */
async function generateDecision({ agentTokenId = 7, asset = 'BTC', duration = 60, strategy: strategyOverride }) {
  const strategy = strategyOverride || STRATEGY_MAP[agentTokenId] || 'neural';
  const market = await fetchMarketSnapshot(asset);

  const useLlm = strategy === 'neural' || process.env.NEURAL_ALL_STRATEGIES === 'true';
  let decision = null;
  if (useLlm) {
    decision = await llmDecision(strategy, market, duration);
  }

  if (!decision) {
    decision = rulesDecision(strategy, market);
  }

  return {
    ...decision,
    strategy,
    agentTokenId,
    asset: market.asset,
    price: market.price,
    market: {
      rsi: market.rsi,
      change24h: market.change24h,
      sma10: market.sma10,
      sma20: market.sma20,
    },
  };
}

module.exports = { generateDecision, fetchMarketSnapshot, rulesDecision };
