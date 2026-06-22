/**
 * Rounds API Routes
 * POST /api/rounds/complete  — save a completed round + its predictions
 * GET  /api/rounds/history   — recent resolved rounds
 */

const express = require('express');
const router  = express.Router();
const { saveRound, getRecentRounds, updateAgentStatsFromRound,
        insertSignature, getSignaturesByRound, getSignaturesByPlayer } = require('../db');
const { BOT_MAP, recordAndResolveRound } = require('../onchain-agent');

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

    // Fire-and-forget: record + resolve bot predictions on-chain
    if (direction) {
      (async () => {
        for (const pred of predictions) {
          const bot = BOT_MAP[pred.address?.toLowerCase()];
          if (bot && pred.direction) {
            await recordAndResolveRound(bot, pred.direction, direction, body.asset);
            await new Promise(r => setTimeout(r, 3000));
          }
        }
      })().catch(() => {});
    }
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
