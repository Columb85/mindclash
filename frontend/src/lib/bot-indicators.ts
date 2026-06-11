/**
 * Client-side technical indicator calculations for bot decision visualization.
 * Fetches real klines from Bybit REST (CORS-enabled public API).
 */

export interface Bollinger { upper: number; middle: number; lower: number }

export interface BotAnalysis {
  market: {
    asset: string; price: number; change24h: number;
    lastVolume: number; avgVolume: number;
  };
  indicators: {
    rsi: number | null;
    sma10: number | null;
    sma20: number | null;
    bollinger: Bollinger | null;
  };
  signals: Array<{ label: string; bullish: boolean }>;
  decision: { direction: 'UP' | 'DOWN'; confidence: number; stake: number; reasoning: string };
}

function calcRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  const changes = closes.slice(1).map((c, i) => c - closes[i]);
  let avgGain = 0, avgLoss = 0;
  const slice = changes.slice(-period);
  for (const d of slice) { if (d > 0) avgGain += d; else avgLoss -= d; }
  avgGain /= period; avgLoss /= period;
  if (avgLoss === 0) return 100;
  return parseFloat((100 - 100 / (1 + avgGain / avgLoss)).toFixed(2));
}

function calcSMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  return parseFloat((closes.slice(-period).reduce((s, v) => s + v, 0) / period).toFixed(2));
}

function calcBollinger(closes: number[], period = 20): Bollinger | null {
  if (closes.length < period) return null;
  const sma = closes.slice(-period).reduce((s, v) => s + v, 0) / period;
  const std = Math.sqrt(closes.slice(-period).reduce((s, v) => s + (v - sma) ** 2, 0) / period);
  return {
    upper:  parseFloat((sma + 2 * std).toFixed(2)),
    middle: parseFloat(sma.toFixed(2)),
    lower:  parseFloat((sma - 2 * std).toFixed(2)),
  };
}

export async function analyzeBotDecision(
  tokenId: 5 | 6 | 7,
  asset: string,
  strategy: string,
): Promise<BotAnalysis> {
  const sym = `${asset}USDT`;

  // Fetch klines + ticker in parallel from Bybit (public, CORS-enabled)
  const [kResp, tResp] = await Promise.all([
    fetch(`https://api.bybit.com/v5/market/kline?category=spot&symbol=${sym}&interval=1&limit=30`),
    fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${sym}`),
  ]);
  const [kJson, tJson] = await Promise.all([kResp.json(), tResp.json()]);

  // Bybit returns newest-first → reverse
  const candles: string[][] = (kJson?.result?.list ?? []).slice().reverse();
  const closes  = candles.map(c => parseFloat(c[4]));
  const volumes = candles.map(c => parseFloat(c[5]));

  const ticker   = tJson?.result?.list?.[0] ?? {};
  const price    = parseFloat(ticker.lastPrice   ?? String(closes[closes.length - 1] ?? 0));
  const change24h = parseFloat(ticker.price24hPcnt ?? '0');

  const avgVol  = volumes.slice(-10).reduce((s, v) => s + v, 0) / 10;
  const lastVol = volumes[volumes.length - 1] ?? 0;
  const volSpike = lastVol > avgVol * 1.3;

  const rsi   = calcRSI(closes, 14);
  const sma10 = calcSMA(closes, 10);
  const sma20 = calcSMA(closes, 20);
  const boll  = calcBollinger(closes, 20);

  const signals: BotAnalysis['signals'] = [];
  let direction: 'UP' | 'DOWN';
  let confidence: number;
  let reasoning: string;

  if (strategy === 'Momentum') {
    const aboveSMA10 = sma10 != null && price > sma10;
    const aboveSMA20 = sma20 != null && price > sma20;
    const posChange  = change24h > 0;
    const rsiOk      = rsi != null && rsi > 40 && rsi < 75;
    signals.push({ label: `Price ${aboveSMA10 ? '>' : '<'} SMA10 ($${sma10 ?? '—'})`,   bullish: aboveSMA10 });
    signals.push({ label: `Price ${aboveSMA20 ? '>' : '<'} SMA20 ($${sma20 ?? '—'})`,   bullish: aboveSMA20 });
    signals.push({ label: `24h change: ${change24h >= 0 ? '+' : ''}${(change24h * 100).toFixed(2)}%`, bullish: posChange });
    signals.push({ label: `RSI(14) = ${rsi ?? '—'} (${rsiOk ? 'healthy range' : 'extreme — caution'})`, bullish: rsiOk });
    if (volSpike) signals.push({ label: `Volume spike ×${(lastVol / avgVol).toFixed(1)} — strong momentum`, bullish: true });
    const bull = signals.filter(s => s.bullish).length;
    direction  = bull >= Math.ceil(signals.length / 2) ? 'UP' : 'DOWN';
    confidence = Math.min(950, 400 + bull * 120);
    reasoning  = `Momentum: ${bull}/${signals.length} bullish signals → ${direction}`;

  } else if (strategy === 'Mean-Reversion') {
    const overbought = rsi != null && rsi > 65;
    const oversold   = rsi != null && rsi < 35;
    const nearUpper  = boll != null && price > boll.upper * 0.98;
    const nearLower  = boll != null && price < boll.lower * 1.02;
    signals.push({ label: `RSI(14) = ${rsi ?? '—'} → ${overbought ? 'Overbought ↓' : oversold ? 'Oversold ↑' : 'Neutral'}`, bullish: oversold });
    signals.push({ label: `Bollinger: price ${nearUpper ? 'at upper band → sell' : nearLower ? 'at lower band → buy' : 'in mid range'}`, bullish: nearLower });
    signals.push({ label: `Extended 24h move ${(change24h * 100).toFixed(2)}% → ${Math.abs(change24h) > 0.02 ? 'reversion expected' : 'within normal range'}`, bullish: change24h < -0.005 });
    const bull = signals.filter(s => s.bullish).length;
    direction  = bull >= 2 ? 'UP' : 'DOWN';
    confidence = Math.min(920, 450 + bull * 155);
    reasoning  = `Mean-Reversion: ${overbought || nearUpper ? 'Extended up → fade DOWN' : oversold || nearLower ? 'Oversold → bounce UP' : 'Neutral range → ' + direction}`;

  } else {
    // Neural
    const smaScore  = ((sma10 && price > sma10) ? 1 : -1) + ((sma20 && price > sma20) ? 1 : -1);
    const rsiScore  = rsi != null ? (rsi - 50) / 50 : 0;
    const momScore  = Math.max(-1, Math.min(1, change24h * 20));
    const bollScore = boll ? (price - boll.middle) / (boll.upper - boll.middle) : 0;
    const w = [0.30, 0.25, 0.35, 0.10];
    const composite = smaScore * w[0] + rsiScore * w[1] + momScore * w[2] + bollScore * w[3];
    signals.push({ label: `SMA cross score: ${smaScore > 0 ? '+' : ''}${smaScore} (weight 30%)`, bullish: smaScore > 0 });
    signals.push({ label: `RSI factor: ${rsiScore.toFixed(3)} (weight 25%)`,                      bullish: rsiScore > 0 });
    signals.push({ label: `Momentum factor: ${momScore.toFixed(3)} (weight 35%)`,                 bullish: momScore > 0 });
    signals.push({ label: `Bollinger position: ${bollScore.toFixed(3)} (weight 10%)`,             bullish: bollScore < 0.5 });
    direction  = composite >= 0 ? 'UP' : 'DOWN';
    confidence = Math.min(970, Math.round(500 + Math.abs(composite) * 450));
    reasoning  = `Neural composite: ${composite.toFixed(4)} → ${direction}`;
  }

  return {
    market:     { asset, price, change24h, lastVolume: lastVol, avgVolume: parseFloat(avgVol.toFixed(2)) },
    indicators: { rsi, sma10, sma20, bollinger: boll },
    signals,
    decision:   { direction, confidence, stake: 250, reasoning },
  };
}
