/**
 * Duels API — Event-driven agent decisions
 *
 * A duel is a 1v1 between a human and an AI agent on a specific asset.
 * The agent makes its decision ON-CHAIN only when challenged.
 * After the duration expires, the duel is resolved based on actual price movement.
 *
 * Flow:
 *   1. Human calls POST /api/duels (picks agent, asset, direction, duration)
 *   2. Backend triggers agent analysis → recordDecision() on-chain
 *   3. Returns duel ID + agent decision + txHash
 *   4. After duration, POST /api/duels/:id/resolve fetches price & resolves
 */

const express = require('express');
const { ethers } = require('ethers');
const router = express.Router();

// ── Contract ABI ──────────────────────────────────────────────────────────────
const AGENT_NFT_WRITE_ABI = [
  'function recordDecision(uint256 tokenId, string direction, uint256 confidence, uint256 stake, string reasoning) returns (bytes32)',
  'function getRecentDecisions(uint256 tokenId, uint256 limit) view returns (tuple(string direction, uint256 confidence, uint256 stake, uint256 timestamp, bool wasCorrect, int256 pnl, string reasoning, bytes32 decisionHash)[])',
];

const BOT_CONFIGS = {
  5: { name: 'AlphaPredict',   strategy: 'momentum',       envKey: 'AGENT_ALPHA_PRIVATE_KEY' },
  6: { name: 'MomentumMaster', strategy: 'mean-reversion', envKey: 'AGENT_MOMENTUM_PRIVATE_KEY' },
  7: { name: 'NeuralTrader',   strategy: 'neural',         envKey: 'AGENT_NEURAL_PRIVATE_KEY' },
};

// ── In-memory duel store (SQLite optional — for demo, memory is fine) ────────
const duels = new Map();

function genId() {
  return `duel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Indicator helpers ─────────────────────────────────────────────────────────
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

// ── Agent decision logic (same as /agents/analyze but returns decision only) ──
async function generateAgentDecision(tokenId, asset) {
  const bot    = BOT_CONFIGS[tokenId];
  const symbol = `${asset}USDT`;

  // Fetch klines from Bybit
  const kResp = await fetch(`https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=1&limit=30`);
  const kJson = await kResp.json();
  const candles = (kJson?.result?.list ?? []).reverse();
  const closes  = candles.map(c => parseFloat(c[4]));

  // Ticker
  const tResp = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`);
  const tJson = await tResp.json();
  const ticker = tJson?.result?.list?.[0] ?? {};
  const price    = parseFloat(ticker.lastPrice ?? closes[closes.length - 1]);
  const change24h = parseFloat(ticker.price24hPcnt ?? '0');

  // Indicators
  const rsi = calcRSI(closes);
  const sma10 = closes.length >= 10 ? closes.slice(-10).reduce((s, v) => s + v, 0) / 10 : price;
  const sma20 = closes.length >= 20 ? closes.slice(-20).reduce((s, v) => s + v, 0) / 20 : price;

  let direction, confidence, reasoning;

  if (bot.strategy === 'momentum') {
    const bullish = [price > sma10, price > sma20, change24h > 0, rsi != null && rsi > 40 && rsi < 75];
    const bullCount = bullish.filter(Boolean).length;
    direction  = bullCount >= 2 ? 'UP' : 'DOWN';
    confidence = Math.min(950, 400 + bullCount * 130);
    reasoning  = `Momentum: ${bullCount}/4 bullish signals, RSI=${rsi ?? '-'}, 24h=${(change24h * 100).toFixed(2)}% → ${direction}`;
  } else if (bot.strategy === 'mean-reversion') {
    const overbought = rsi != null && rsi > 65;
    const oversold   = rsi != null && rsi < 35;
    const extended   = Math.abs(change24h) > 0.015;
    direction  = (overbought || (change24h > 0.01 && extended)) ? 'DOWN' : (oversold || change24h < -0.01) ? 'UP' : (change24h >= 0 ? 'DOWN' : 'UP');
    confidence = Math.min(920, 450 + (extended ? 200 : 0) + ((overbought || oversold) ? 150 : 0));
    reasoning  = `Mean-Reversion: RSI=${rsi ?? '-'}, 24h=${(change24h * 100).toFixed(2)}%, ${overbought ? 'overbought' : oversold ? 'oversold' : 'neutral'} → fade to ${direction}`;
  } else {
    const smaScore = (price > sma10 ? 1 : -1) + (price > sma20 ? 1 : -1);
    const rsiScore = rsi != null ? (rsi - 50) / 50 : 0;
    const momScore = Math.max(-1, Math.min(1, change24h * 20));
    const composite = smaScore * 0.3 + rsiScore * 0.25 + momScore * 0.35;
    direction  = composite >= 0 ? 'UP' : 'DOWN';
    confidence = Math.min(970, Math.round(500 + Math.abs(composite) * 450));
    reasoning  = `Neural: composite=${composite.toFixed(3)}, SMA=${smaScore}, RSI=${(rsiScore).toFixed(2)}, Mom=${momScore.toFixed(2)} → ${direction}`;
  }

  return { direction, confidence, stake: 250, reasoning, price, asset };
}

// ── Submit agent decision on-chain ────────────────────────────────────────────
async function submitOnChain(tokenId, decision) {
  const bot = BOT_CONFIGS[tokenId];
  const privateKey = process.env[bot.envKey] || process.env.AGENT_PRIVATE_KEY;
  if (!privateKey || privateKey.includes('your_testnet') || privateKey === '0x' + '0'.repeat(64)) {
    return { txHash: null, error: 'Bot private key not configured' };
  }

  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const wallet   = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(process.env.AGENT_NFT_ADDRESS, AGENT_NFT_WRITE_ABI, wallet);

    const tx = await contract.recordDecision(
      tokenId, decision.direction, decision.confidence, decision.stake, decision.reasoning
    );
    const receipt = await tx.wait();
    return { txHash: receipt.hash, explorerUrl: `${process.env.EXPLORER_URL}/tx/${receipt.hash}` };
  } catch (err) {
    console.error(`[DUEL] on-chain submit failed for ${bot.name}:`, err.message);
    return { txHash: null, error: err.message };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/duels — Create a duel, agent makes on-chain decision
// Body: { agentTokenId: 5|6|7, asset: 'BTC'|'ETH'|'SOL', humanDirection: 'UP'|'DOWN', duration: 60 }
// ══════════════════════════════════════════════════════════════════════════════
router.post('/', async (req, res, next) => {
  try {
    const { agentTokenId = 5, asset = 'BTC', humanDirection = 'UP', duration = 60, humanAddress } = req.body;

    if (![5, 6, 7].includes(agentTokenId)) return res.status(400).json({ error: 'agentTokenId must be 5, 6 or 7' });
    if (!['BTC', 'ETH', 'SOL', 'MNT'].includes(asset.toUpperCase())) return res.status(400).json({ error: 'Invalid asset' });
    if (!['UP', 'DOWN'].includes(humanDirection)) return res.status(400).json({ error: 'humanDirection must be UP or DOWN' });

    const duelId = genId();
    const bot    = BOT_CONFIGS[agentTokenId];

    // 1. Agent analyzes market and generates decision
    const agentDecision = await generateAgentDecision(agentTokenId, asset.toUpperCase());

    // 2. Submit on-chain
    const onChain = await submitOnChain(agentTokenId, agentDecision);

    // 3. Store duel
    const duel = {
      id:             duelId,
      agentTokenId,
      agentName:      bot.name,
      agentStrategy:  bot.strategy,
      asset:          asset.toUpperCase(),
      duration:       Math.max(30, Math.min(300, duration)),
      humanDirection,
      humanAddress:   humanAddress || null,
      agentDirection: agentDecision.direction,
      agentConfidence: agentDecision.confidence,
      agentReasoning: agentDecision.reasoning,
      startPrice:     agentDecision.price,
      endPrice:       null,
      startedAt:      Math.floor(Date.now() / 1000),
      endsAt:         Math.floor(Date.now() / 1000) + Math.max(30, Math.min(300, duration)),
      status:         'live', // live | resolved
      winner:         null,   // 'human' | 'agent' | 'tie'
      txHash:         onChain.txHash,
      explorerUrl:    onChain.explorerUrl || null,
      txError:        onChain.error || null,
    };

    duels.set(duelId, duel);

    console.log(`[DUEL] Created ${duelId}: ${humanDirection} vs ${bot.name} ${agentDecision.direction} on ${asset} (${duration}s)`);

    res.json({
      success: true,
      duel: {
        id:              duel.id,
        agentName:       duel.agentName,
        agentStrategy:   duel.agentStrategy,
        agentDirection:  duel.agentDirection,
        agentConfidence: duel.agentConfidence,
        agentReasoning:  duel.agentReasoning,
        humanDirection:  duel.humanDirection,
        asset:           duel.asset,
        startPrice:      duel.startPrice,
        duration:        duel.duration,
        startedAt:       duel.startedAt,
        endsAt:          duel.endsAt,
        txHash:          duel.txHash,
        explorerUrl:     duel.explorerUrl,
        txError:         duel.txError,
      },
    });
  } catch (err) {
    console.error('[DUEL] create error:', err.message);
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/duels/:id/resolve — Resolve a duel by checking current price
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:id/resolve', async (req, res, next) => {
  try {
    const duel = duels.get(req.params.id);
    if (!duel) return res.status(404).json({ error: 'Duel not found' });
    if (duel.status === 'resolved') return res.json({ success: true, duel });

    const now = Math.floor(Date.now() / 1000);
    if (now < duel.endsAt) {
      return res.status(400).json({ error: 'Duel still in progress', remainingSeconds: duel.endsAt - now });
    }

    // Fetch current price
    const symbol  = `${duel.asset}USDT`;
    const tResp   = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`);
    const tJson   = await tResp.json();
    const ticker  = tJson?.result?.list?.[0];
    const endPrice = ticker ? parseFloat(ticker.lastPrice) : duel.startPrice;

    // Determine actual direction
    const actualDirection = endPrice > duel.startPrice ? 'UP' : endPrice < duel.startPrice ? 'DOWN' : 'TIE';

    // Determine winner
    let winner;
    if (actualDirection === 'TIE') {
      winner = 'tie';
    } else if (duel.humanDirection === actualDirection && duel.agentDirection !== actualDirection) {
      winner = 'human';
    } else if (duel.agentDirection === actualDirection && duel.humanDirection !== actualDirection) {
      winner = 'agent';
    } else if (duel.humanDirection === actualDirection && duel.agentDirection === actualDirection) {
      winner = 'tie'; // both right
    } else {
      winner = 'tie'; // both wrong
    }

    duel.endPrice = endPrice;
    duel.status   = 'resolved';
    duel.winner   = winner;
    duel.resolvedAt = now;
    duel.priceChange = ((endPrice - duel.startPrice) / duel.startPrice * 100).toFixed(4);

    console.log(`[DUEL] Resolved ${duel.id}: price ${duel.startPrice} → ${endPrice} (${actualDirection}), winner=${winner}`);

    res.json({ success: true, duel });
  } catch (err) {
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/duels/:id — Get duel status
// ══════════════════════════════════════════════════════════════════════════════
router.get('/:id', (req, res) => {
  const duel = duels.get(req.params.id);
  if (!duel) return res.status(404).json({ error: 'Duel not found' });
  res.json({ success: true, duel });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/duels — List recent duels
// ══════════════════════════════════════════════════════════════════════════════
router.get('/', (req, res) => {
  const all = Array.from(duels.values()).sort((a, b) => b.startedAt - a.startedAt).slice(0, 20);
  res.json({ success: true, duels: all, total: duels.size });
});

module.exports = router;
