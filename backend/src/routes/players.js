/**
 * Players API Routes
 * GET  /api/players/:address/stats  — load player stats
 * POST /api/players/:address/stats  — save / update player stats
 * GET  /api/players/leaderboard     — top players by wins
 */

const express = require('express');
const router  = express.Router();
const { getPlayer, upsertPlayer, getTopPlayers } = require('../db');

// ── GET /api/players/leaderboard ─────────────────────────────────────────────
router.get('/leaderboard', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const rows  = getTopPlayers.all(limit);
  res.json({ success: true, data: rows, timestamp: Date.now() });
});

// ── GET /api/players/:address/stats ──────────────────────────────────────────
router.get('/:address/stats', (req, res) => {
  const address = req.params.address.toLowerCase();
  const row     = getPlayer.get(address);
  if (!row) {
    return res.json({ success: true, data: null }); // new player — no record yet
  }
  res.json({ success: true, data: row, timestamp: Date.now() });
});

// ── POST /api/players/:address/stats ─────────────────────────────────────────
router.post('/:address/stats', (req, res) => {
  const address = req.params.address.toLowerCase();
  const body    = req.body;

  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Invalid body' });
  }

  upsertPlayer.run({
    address,
    xp:                parseInt(body.xp)                ?? 0,
    level:             parseInt(body.level)             ?? 1,
    total_predictions: parseInt(body.totalPredictions)  ?? 0,
    wins:              parseInt(body.wins)              ?? 0,
    losses:            parseInt(body.losses)            ?? 0,
    ties:              parseInt(body.ties)              ?? 0,
    total_staked:      parseFloat(body.totalStaked)     ?? 0,
    total_won:         parseFloat(body.totalWon)        ?? 0,
    best_streak:       parseInt(body.bestStreak)        ?? 0,
    updated_at:        Math.floor(Date.now() / 1000),
  });

  res.json({ success: true, timestamp: Date.now() });
});

module.exports = router;
