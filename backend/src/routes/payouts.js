/**
 * POST /api/payouts/claim — send CLASH payout from Treasury to winner
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { isPayoutEnabled, payClashFromTreasury } = require('../onchain-payout');
const { getPayoutClaim, insertPayoutClaim } = require('../db');

const router = express.Router();

const PROTOCOL_FEE = 0.04;
const MAX_PAYOUT = 500_000;

const claimLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  message: { error: 'Too many payout requests. Try again shortly.' },
});

function verifyPayout(body) {
  const { outcome, stake, payout, winner, upPool, downPool } = body;
  if (!['win', 'tie'].includes(outcome)) return 'Invalid outcome';
  if (!winner || !['UP', 'DOWN', 'TIE'].includes(winner)) return 'Invalid winner';
  if (typeof stake !== 'number' || stake <= 0 || stake > MAX_PAYOUT) return 'Invalid stake';
  if (typeof payout !== 'number' || payout <= 0 || payout > MAX_PAYOUT) return 'Invalid payout';
  if (typeof upPool !== 'number' || typeof downPool !== 'number') return 'Invalid pools';

  let expected = 0;
  if (outcome === 'tie') {
    expected = stake;
  } else if (outcome === 'win' && winner !== 'TIE') {
    const winningPool = winner === 'UP' ? upPool : downPool;
    const losingPool  = winner === 'UP' ? downPool : upPool;
    const multiplier  = winningPool > 0
      ? 1 + (losingPool * (1 - PROTOCOL_FEE)) / winningPool
      : 1;
    expected = stake * multiplier;
  }

  if (Math.abs(expected - payout) > 1.5) {
    return `Payout mismatch (expected ~${expected.toFixed(2)}, got ${payout})`;
  }
  return null;
}

router.post('/claim', claimLimiter, async (req, res) => {
  const { roundId, player, outcome, stake, payout, winner, upPool, downPool } = req.body ?? {};

  if (!roundId || !player) {
    return res.status(400).json({ error: 'Missing roundId or player' });
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(player)) {
    return res.status(400).json({ error: 'Invalid player address' });
  }

  const playerKey = player.toLowerCase();

  const existing = getPayoutClaim.get(roundId, playerKey);
  if (existing) {
    return res.json({
      success: true,
      alreadyClaimed: true,
      txHash: existing.tx_hash,
      amount: existing.amount,
      explorer: `${process.env.EXPLORER_URL}/tx/${existing.tx_hash}`,
    });
  }

  const verifyErr = verifyPayout({ outcome, stake, payout, winner, upPool, downPool });
  if (verifyErr) {
    return res.status(400).json({ error: verifyErr });
  }

  if (!isPayoutEnabled()) {
    return res.status(503).json({ error: 'On-chain payouts not configured' });
  }

  try {
    const txHash = await payClashFromTreasury(player, payout);
    insertPayoutClaim.run({
      round_id: roundId,
      player:   playerKey,
      outcome,
      amount:   Math.floor(payout),
      tx_hash:  txHash,
      claimed_at: Math.floor(Date.now() / 1000),
    });

    console.log(`[PAYOUT] ${payout} CLASH → ${player} round=${roundId} tx=${txHash}`);

    res.json({
      success: true,
      amount: Math.floor(payout),
      txHash,
      explorer: `${process.env.EXPLORER_URL}/tx/${txHash}`,
    });
  } catch (err) {
    console.error('[PAYOUT] Error:', err.message);
    res.status(500).json({ error: err.message || 'Payout transaction failed' });
  }
});

router.get('/status', (req, res) => {
  const { roundId, player } = req.query;
  if (!roundId || !player) {
    return res.json({ claimed: false });
  }
  const row = getPayoutClaim.get(String(roundId), String(player).toLowerCase());
  res.json({
    claimed: !!row,
    txHash: row?.tx_hash ?? null,
    amount: row?.amount ?? null,
  });
});

module.exports = router;
