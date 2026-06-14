/**
 * Rounds API Routes
 * POST /api/rounds/complete  — save a completed round + its predictions
 * GET  /api/rounds/history   — recent resolved rounds
 */

const express = require('express');
const { ethers } = require('ethers');
const router  = express.Router();
const { saveRound, getRecentRounds, updateAgentStatsFromRound,
        insertSignature, getSignaturesByRound, getSignaturesByPlayer } = require('../db');

const AGENT_NFT_ABI = [
  'function recordDecision(uint256 tokenId, string direction, uint256 confidence, uint256 stake, string reasoning) returns (bytes32)',
];

const BOT_MAP = {
  '0xd33744400ed8211f7a5900926df22cd8c2a2ad74': { tokenId: 5, envKey: 'AGENT_ALPHA_PRIVATE_KEY' },
  '0x62bc9ab4dcdd43ec1f6fda4f71220f6f85b80a59': { tokenId: 6, envKey: 'AGENT_MOMENTUM_PRIVATE_KEY' },
  '0x508eaddf521ae4887aecfec2d7d7c43f94bd7c39': { tokenId: 7, envKey: 'AGENT_NEURAL_PRIVATE_KEY' },
};

async function recordBotDecisionOnChain(bot, direction, asset) {
  if (process.env.ENABLE_ONCHAIN_SIGNING !== 'true') return;
  const pk = process.env[bot.envKey] || process.env.AGENT_PRIVATE_KEY;
  if (!pk || pk.includes('your_testnet')) return;
  try {
    const confidence = 700 + Math.floor(Math.random() * 200); // 700-900
    const stake = 250;
    const reasoning = `Round prediction: ${direction} on ${asset}`;
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const wallet   = new ethers.Wallet(pk, provider);
    const contract = new ethers.Contract(process.env.AGENT_NFT_ADDRESS, AGENT_NFT_ABI, wallet);
    const tx = await contract.recordDecision(bot.tokenId, direction, confidence, stake, reasoning);
    const receipt = await tx.wait();
    console.log(`[ROUND-CHAIN] Bot #${bot.tokenId} ${direction} ${asset} → ${receipt.hash}`);
  } catch (err) {
    console.error(`[ROUND-CHAIN] Bot #${bot.tokenId} failed:`, err.message);
  }
}

// ── POST /api/rounds/complete ─────────────────────────────────────────────────
router.post('/complete', (req, res) => {
  const body = req.body;

  if (!body || !body.id || !body.asset) {
    return res.status(400).json({ error: 'Missing required fields: id, asset' });
  }

  // direction = which side WON
  let direction = null;
  if (body.startPrice != null && body.endPrice != null) {
    direction = body.endPrice > body.startPrice ? 'UP' : 'DOWN';
  }

  const predictions = body.predictions ?? [];
  const humanPredictions = predictions.filter(p => {
    const BOT_ADDRS = [
      '0xd33744400ed8211f7a5900926df22cd8c2a2ad74',
      '0x62bc9ab4dcdd43ec1f6fda4f71220f6f85b80a59',
      '0x508eaddf521ae4887aecfec2d7d7c43f94bd7c39',
    ];
    return !BOT_ADDRS.includes(p.address.toLowerCase());
  });
  const botOnly = humanPredictions.length === 0;

  try {
    saveRound({
      id:          body.id,
      asset:       body.asset,
      duration:    body.duration  ?? 60,
      startPrice:  body.startPrice ?? null,
      endPrice:    body.endPrice   ?? null,
      upPool:      body.upPool    ?? 0,
      downPool:    body.downPool  ?? 0,
      direction,
      resolvedAt:  body.resolvedAt ?? Math.floor(Date.now() / 1000),
      predictions,
    });

    // Always update agent stats from real round outcome (even bot-only rounds)
    if (direction) {
      updateAgentStatsFromRound(predictions, direction);
    }

    res.json({ success: true, direction, botOnly, humanCount: humanPredictions.length, timestamp: Date.now() });

    // Fire-and-forget: record bot predictions on-chain sequentially (avoids nonce conflicts)
    (async () => {
      for (const pred of predictions) {
        const bot = BOT_MAP[pred.address?.toLowerCase()];
        if (bot && pred.direction) {
          await recordBotDecisionOnChain(bot, pred.direction, body.asset);
        }
      }
    })().catch(() => {});
  } catch (err) {
    console.error('saveRound error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/rounds/history ──────────────────────────────────────────────────
router.get('/history', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const rows  = getRecentRounds.all(limit);
  res.json({ success: true, data: rows, timestamp: Date.now() });
});

// ── POST /api/rounds/signature — store EIP-712 signed prediction commitment ──
router.post('/signature', (req, res) => {
  const { roundId, asset, direction, amount, timestamp, player, signature } = req.body ?? {};

  if (!roundId || !player || !signature || !direction) {
    return res.status(400).json({ error: 'Missing required fields: roundId, player, signature, direction' });
  }

  if (!/^0x[0-9a-fA-F]{130}$/.test(signature)) {
    return res.status(400).json({ error: 'Invalid EIP-712 signature format' });
  }

  try {
    insertSignature.run({
      round_id:  roundId,
      player:    player.toLowerCase(),
      asset:     asset ?? '',
      direction: direction,
      amount:    Math.round(amount ?? 0),
      timestamp: timestamp ?? Math.floor(Date.now() / 1000),
      signature,
    });
    res.json({ success: true });
  } catch (err) {
    console.error('insertSignature error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/rounds/:roundId/signatures — list all signed predictions for round
router.get('/:roundId/signatures', (req, res) => {
  const rows = getSignaturesByRound.all(req.params.roundId);
  res.json({ success: true, data: rows, count: rows.length });
});

// ── GET /api/players/:address/signatures — all signed predictions by player
// (mounted on /api/rounds for simplicity, player route also works)
router.get('/player/:address/signatures', (req, res) => {
  const rows = getSignaturesByPlayer.all(req.params.address.toLowerCase());
  res.json({ success: true, data: rows, count: rows.length });
});

module.exports = router;
