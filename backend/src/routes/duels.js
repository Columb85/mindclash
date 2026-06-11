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
const { getUserAgentByTokenId } = require('../db');
const { generateDecision } = require('../neural-decision');

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

function resolveAgentMeta(tokenId) {
  const system = BOT_CONFIGS[tokenId];
  if (system) return { name: system.name, strategy: system.strategy, isUser: false };
  const user = getUserAgentByTokenId.get(tokenId);
  if (user) return { name: user.name, strategy: user.strategy, isUser: true };
  return null;
}

const ONCHAIN_SIGNING_ENABLED =
  process.env.ENABLE_ONCHAIN_SIGNING === 'true' || process.env.ENABLE_ONCHAIN_SIGNING === '1';

async function submitOnChain(tokenId, decision) {
  if (!BOT_CONFIGS[tokenId]) {
    return {
      txHash: null,
      mode: 'user-agent',
      error: null,
      hint: 'User-created agents: sign recordDecision() from your wallet in the app.',
    };
  }

  if (!ONCHAIN_SIGNING_ENABLED) {
    return {
      txHash: null,
      mode: 'read-only',
      error: null,
      hint: 'On-chain signing is disabled in this repo. Live duels with tx: https://api.mindclash.xyz/api/duels',
    };
  }

  const bot = BOT_CONFIGS[tokenId];
  const privateKey = process.env[bot.envKey] || process.env.AGENT_PRIVATE_KEY;
  if (!privateKey || privateKey.includes('your_testnet') || privateKey === '0x' + '0'.repeat(64)) {
    return { txHash: null, error: 'Bot private key not configured (set ENABLE_ONCHAIN_SIGNING=true + keys in .env)' };
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

router.post('/', async (req, res, next) => {
  try {
    const { agentTokenId = 5, asset = 'BTC', humanDirection = 'UP', duration = 60, humanAddress } = req.body;
    const tokenId = parseInt(agentTokenId, 10);

    const meta = resolveAgentMeta(tokenId);
    if (!meta) return res.status(400).json({ error: 'Unknown agent — create one at /create-agent or pick #5, #6, #7' });
    if (!['BTC', 'ETH', 'SOL', 'MNT'].includes(String(asset).toUpperCase())) return res.status(400).json({ error: 'Invalid asset' });
    if (!['UP', 'DOWN'].includes(humanDirection)) return res.status(400).json({ error: 'humanDirection must be UP or DOWN' });

    const duelId = genId();
    const dur = Math.max(30, Math.min(300, parseInt(duration, 10) || 60));
    const agentDecision = await generateDecision({
      agentTokenId: tokenId,
      asset: String(asset).toUpperCase(),
      duration: dur,
      strategy: meta.strategy,
    });
    const onChain = await submitOnChain(tokenId, agentDecision);

    const duel = {
      id: duelId,
      agentTokenId: tokenId,
      agentName: meta.name,
      agentStrategy: meta.strategy,
      isUserAgent: meta.isUser,
      asset: String(asset).toUpperCase(),
      duration: dur,
      humanDirection,
      humanAddress: humanAddress || null,
      agentDirection: agentDecision.direction,
      agentConfidence: agentDecision.confidence,
      agentReasoning: agentDecision.reasoning,
      startPrice: agentDecision.price,
      endPrice: null,
      startedAt: Math.floor(Date.now() / 1000),
      endsAt: Math.floor(Date.now() / 1000) + dur,
      status: 'live',
      winner: null,
      txHash: onChain.txHash,
      explorerUrl: onChain.explorerUrl || null,
      txError: onChain.error || null,
      mode: onChain.mode || (onChain.txHash ? 'on-chain' : 'read-only'),
      liveApiHint: onChain.hint || null,
    };

    duels.set(duelId, duel);
    res.json({ success: true, duel });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/resolve', async (req, res, next) => {
  try {
    const duel = duels.get(req.params.id);
    if (!duel) return res.status(404).json({ error: 'Duel not found' });
    if (duel.status === 'resolved') return res.json({ success: true, duel });

    const now = Math.floor(Date.now() / 1000);
    if (now < duel.endsAt) {
      return res.status(400).json({ error: 'Duel still in progress', remainingSeconds: duel.endsAt - now });
    }

    const symbol  = `${duel.asset}USDT`;
    const tResp   = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`);
    const tJson   = await tResp.json();
    const ticker  = tJson?.result?.list?.[0];
    const endPrice = ticker ? parseFloat(ticker.lastPrice) : duel.startPrice;
    const actualDirection = endPrice > duel.startPrice ? 'UP' : endPrice < duel.startPrice ? 'DOWN' : 'TIE';

    let winner;
    if (actualDirection === 'TIE') winner = 'tie';
    else if (duel.humanDirection === actualDirection && duel.agentDirection !== actualDirection) winner = 'human';
    else if (duel.agentDirection === actualDirection && duel.humanDirection !== actualDirection) winner = 'agent';
    else winner = 'tie';

    duel.endPrice = endPrice;
    duel.status   = 'resolved';
    duel.winner   = winner;
    duel.resolvedAt = now;
    duel.priceChange = ((endPrice - duel.startPrice) / duel.startPrice * 100).toFixed(4);

    res.json({ success: true, duel });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req, res) => {
  const duel = duels.get(req.params.id);
  if (!duel) return res.status(404).json({ error: 'Duel not found' });
  res.json({ success: true, duel });
});

router.get('/', (req, res) => {
  const all = Array.from(duels.values()).sort((a, b) => b.startedAt - a.startedAt).slice(0, 20);
  res.json({ success: true, duels: all, total: duels.size });
});

module.exports = router;
