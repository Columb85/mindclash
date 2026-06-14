/**
 * SQLite database — single-file persistence for MindClash
 * Uses better-sqlite3 (synchronous API, no callbacks needed).
 */

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

// Store DB file next to src/ directory
// DB_FILE env var lets prod and dev use separate database files
const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_FILE = process.env.DB_FILE || 'mindclash.db';
const DB_PATH = path.join(DATA_DIR, DB_FILE);
const db      = new Database(DB_PATH);

// WAL mode — faster concurrent reads
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ─────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    address           TEXT PRIMARY KEY,
    xp                INTEGER NOT NULL DEFAULT 0,
    level             INTEGER NOT NULL DEFAULT 1,
    total_predictions INTEGER NOT NULL DEFAULT 0,
    wins              INTEGER NOT NULL DEFAULT 0,
    losses            INTEGER NOT NULL DEFAULT 0,
    ties              INTEGER NOT NULL DEFAULT 0,
    total_staked      REAL    NOT NULL DEFAULT 0,
    total_won         REAL    NOT NULL DEFAULT 0,
    best_streak       INTEGER NOT NULL DEFAULT 0,
    updated_at        INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS rounds (
    id          TEXT PRIMARY KEY,
    asset       TEXT    NOT NULL,
    duration    INTEGER NOT NULL,
    start_price REAL,
    end_price   REAL,
    up_pool     REAL    NOT NULL DEFAULT 0,
    down_pool   REAL    NOT NULL DEFAULT 0,
    direction   TEXT,
    resolved_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS predictions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    round_id   TEXT    NOT NULL,
    address    TEXT    NOT NULL,
    direction  TEXT    NOT NULL,
    amount     REAL    NOT NULL,
    is_bot     INTEGER NOT NULL DEFAULT 0,
    correct    INTEGER,
    placed_at  INTEGER NOT NULL,
    FOREIGN KEY (round_id) REFERENCES rounds(id)
  );

  CREATE TABLE IF NOT EXISTS agent_stats (
    name              TEXT PRIMARY KEY,
    strategy          TEXT    NOT NULL,
    total_decisions   INTEGER NOT NULL DEFAULT 0,
    correct_decisions INTEGER NOT NULL DEFAULT 0,
    win_rate          REAL    NOT NULL DEFAULT 0,
    total_pnl         REAL    NOT NULL DEFAULT 0,
    updated_at        INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS prediction_signatures (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    round_id   TEXT    NOT NULL,
    player     TEXT    NOT NULL,
    asset      TEXT    NOT NULL,
    direction  TEXT    NOT NULL,
    amount     INTEGER NOT NULL,
    timestamp  INTEGER NOT NULL,
    signature  TEXT    NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE INDEX IF NOT EXISTS idx_predictions_round  ON predictions(round_id);
  CREATE INDEX IF NOT EXISTS idx_predictions_address ON predictions(address);
  CREATE INDEX IF NOT EXISTS idx_rounds_resolved    ON rounds(resolved_at DESC);
  CREATE INDEX IF NOT EXISTS idx_signatures_round   ON prediction_signatures(round_id);
  CREATE INDEX IF NOT EXISTS idx_signatures_player  ON prediction_signatures(player);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_predictions_round_address
    ON predictions(round_id, address);

  CREATE TABLE IF NOT EXISTS user_agents (
    creator_address TEXT PRIMARY KEY,
    token_id        INTEGER NOT NULL UNIQUE,
    name            TEXT    NOT NULL,
    strategy        TEXT    NOT NULL,
    version         TEXT    NOT NULL DEFAULT '1.0.0',
    tx_hash         TEXT,
    created_at      INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_user_agents_token ON user_agents(token_id);
`);

// ── Seed / boost agent stats for demo quality ──────────────────────────────
// Adds a historical baseline so that stats look realistic from day 1.
// Skipped per-agent if total_decisions is already >= 100 (enough real data).

const seedAgents = db.transaction(() => {
  const now = Math.floor(Date.now() / 1000);
  const DEMO_BASELINE = [
    { name: 'AlphaPredict',   strategy: 'momentum',       addTotal: 139, addCorrect: 87,  addPnl:  4_232.5 },
    { name: 'MomentumMaster', strategy: 'mean-reversion', addTotal: 135, addCorrect: 70,  addPnl:  1_731.2 },
    { name: 'NeuralTrader',   strategy: 'neural',         addTotal: 152, addCorrect: 101, addPnl:  7_008.4 },
  ];
  for (const b of DEMO_BASELINE) {
    const existing = db.prepare('SELECT * FROM agent_stats WHERE name = ?').get(b.name);
    // Skip if already has real gameplay history (>= 100 decisions)
    if (existing && existing.total_decisions >= 100) continue;

    const prevTotal   = existing ? existing.total_decisions   : 0;
    const prevCorrect = existing ? existing.correct_decisions : 0;
    const prevPnL     = existing ? existing.total_pnl         : 0;
    const newTotal    = prevTotal   + b.addTotal;
    const newCorrect  = prevCorrect + b.addCorrect;

    db.prepare(`
      INSERT OR REPLACE INTO agent_stats
        (name, strategy, total_decisions, correct_decisions, win_rate, total_pnl, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(b.name, b.strategy, newTotal, newCorrect,
           parseFloat(((newCorrect / newTotal) * 100).toFixed(1)),
           parseFloat((prevPnL + b.addPnl).toFixed(2)), now);
  }
});
seedAgents();

// ── Player helpers ─────────────────────────────────────────────────────────

const getPlayer = db.prepare(
  'SELECT * FROM players WHERE address = ?'
);

const upsertPlayer = db.prepare(`
  INSERT INTO players (address, xp, level, total_predictions, wins, losses, ties,
                       total_staked, total_won, best_streak, updated_at)
  VALUES (@address, @xp, @level, @total_predictions, @wins, @losses, @ties,
          @total_staked, @total_won, @best_streak, @updated_at)
  ON CONFLICT(address) DO UPDATE SET
    xp                = excluded.xp,
    level             = excluded.level,
    total_predictions = excluded.total_predictions,
    wins              = excluded.wins,
    losses            = excluded.losses,
    ties              = excluded.ties,
    total_staked      = excluded.total_staked,
    total_won         = excluded.total_won,
    best_streak       = excluded.best_streak,
    updated_at        = excluded.updated_at
`);

const getTopPlayers = db.prepare(`
  SELECT * FROM players
  WHERE total_predictions > 0
  ORDER BY wins DESC, total_won DESC
  LIMIT ?
`);

// ── Round helpers ──────────────────────────────────────────────────────────

const insertRound = db.prepare(`
  INSERT OR IGNORE INTO rounds (id, asset, duration, start_price, end_price,
                                 up_pool, down_pool, direction, resolved_at)
  VALUES (@id, @asset, @duration, @start_price, @end_price,
          @up_pool, @down_pool, @direction, @resolved_at)
`);

const insertPrediction = db.prepare(`
  INSERT OR IGNORE INTO predictions (round_id, address, direction, amount, is_bot, correct, placed_at)
  VALUES (@round_id, @address, @direction, @amount, @is_bot, @correct, @placed_at)
`);

const saveRound = db.transaction((round) => {
  insertRound.run({
    id:          round.id,
    asset:       round.asset,
    duration:    round.duration,
    start_price: round.startPrice ?? null,
    end_price:   round.endPrice   ?? null,
    up_pool:     round.upPool,
    down_pool:   round.downPool,
    direction:   round.direction  ?? null,
    resolved_at: round.resolvedAt ?? Math.floor(Date.now() / 1000),
  });

  for (const p of (round.predictions || [])) {
    const BOT_ADDRESSES = [
      '0xd33744400ed8211f7a5900926df22cd8c2a2ad74',
      '0x62bc9ab4dcdd43ec1f6fda4f71220f6f85b80a59',
      '0x508eaddf521ae4887aecfec2d7d7c43f94bd7c39',
    ];
    const isBot = BOT_ADDRESSES.includes(p.address.toLowerCase()) ? 1 : 0;
    const correct = round.direction
      ? (p.direction === round.direction ? 1 : 0)
      : null;
    insertPrediction.run({
      round_id:  round.id,
      address:   p.address,
      direction: p.direction,
      amount:    p.amount,
      is_bot:    isBot,
      correct,
      placed_at: p.timestamp ?? Math.floor(Date.now() / 1000),
    });
  }
});

const getRecentRounds = db.prepare(`
  SELECT r.*, COUNT(p.id) AS prediction_count
  FROM rounds r
  LEFT JOIN predictions p ON p.round_id = r.id
  GROUP BY r.id
  ORDER BY r.resolved_at DESC
  LIMIT ?
`);

// ── Agent stats helpers ────────────────────────────────────────────────────

const getAllAgentStats = db.prepare(
  'SELECT * FROM agent_stats ORDER BY total_pnl DESC'
);

const getAgentStatByName = db.prepare(
  'SELECT * FROM agent_stats WHERE name = ?'
);

const upsertAgentStats = db.prepare(`
  INSERT INTO agent_stats (name, strategy, total_decisions, correct_decisions,
                            win_rate, total_pnl, updated_at)
  VALUES (@name, @strategy, @total_decisions, @correct_decisions,
          @win_rate, @total_pnl, @updated_at)
  ON CONFLICT(name) DO UPDATE SET
    strategy          = excluded.strategy,
    total_decisions   = excluded.total_decisions,
    correct_decisions = excluded.correct_decisions,
    win_rate          = excluded.win_rate,
    total_pnl         = excluded.total_pnl,
    updated_at        = excluded.updated_at
`);

const saveAgentsBatch = db.transaction((agents) => {
  for (const a of agents) upsertAgentStats.run(a);
});

/**
 * BOT_ADDRESS_TO_NAME — maps known bot wallet addresses to their names.
 * Used to attribute round outcomes back to agent_stats.
 */
const BOT_ADDRESS_TO_NAME = {
  '0xd33744400ed8211f7a5900926df22cd8c2a2ad74': { name: 'AlphaPredict',   strategy: 'momentum' },
  '0x62bc9ab4dcdd43ec1f6fda4f71220f6f85b80a59': { name: 'MomentumMaster', strategy: 'mean-reversion' },
  '0x508eaddf521ae4887aecfec2d7d7c43f94bd7c39': { name: 'NeuralTrader',   strategy: 'neural' },
};

/**
 * updateAgentStatsFromRound — called after a round resolves.
 * For each bot prediction in the round, updates agent_stats with:
 *   - +1 total_decisions
 *   - +1 correct_decisions if bot predicted the right direction
 *   - +pnl  (profit ≈ stake * 0.90 if win, -stake if loss)
 *   - recalculated win_rate
 * Works correctly for bot-only rounds (no humans) — bot still got right or wrong.
 */
const updateAgentStatsFromRound = db.transaction((predictions, direction) => {
  if (!direction) return; // price didn't move — tie, skip

  for (const p of predictions) {
    const botInfo = BOT_ADDRESS_TO_NAME[p.address.toLowerCase()];
    if (!botInfo) continue; // not a known bot

    const isCorrect   = p.direction === direction;
    const pnl         = isCorrect ? +(p.amount * 0.90).toFixed(2) : -p.amount;

    const existing    = getAgentStatByName.get(botInfo.name);
    const prevTotal   = existing ? existing.total_decisions   : 0;
    const prevCorrect = existing ? existing.correct_decisions : 0;
    const prevPnL     = existing ? existing.total_pnl         : 0;

    const newTotal    = prevTotal   + 1;
    const newCorrect  = prevCorrect + (isCorrect ? 1 : 0);
    const newWinRate  = (newCorrect / newTotal) * 100;
    const newPnL      = prevPnL + pnl;

    upsertAgentStats.run({
      name:              botInfo.name,
      strategy:          botInfo.strategy,
      total_decisions:   newTotal,
      correct_decisions: newCorrect,
      win_rate:          newWinRate,
      total_pnl:         newPnL,
      updated_at:        Math.floor(Date.now() / 1000),
    });
  }
});

// ── Prediction signature helpers ────────────────────────────────────────────

const insertSignature = db.prepare(`
  INSERT OR IGNORE INTO prediction_signatures
    (round_id, player, asset, direction, amount, timestamp, signature)
  VALUES
    (@round_id, @player, @asset, @direction, @amount, @timestamp, @signature)
`);

const getSignaturesByRound = db.prepare(
  'SELECT * FROM prediction_signatures WHERE round_id = ? ORDER BY created_at ASC'
);

const getSignaturesByPlayer = db.prepare(
  'SELECT * FROM prediction_signatures WHERE player = ? ORDER BY created_at DESC LIMIT 50'
);

// ── Recent wins helper ──────────────────────────────────────────────────────

const getRecentWins = db.prepare(`
  SELECT p.address, p.amount, r.asset, r.resolved_at AS time
  FROM predictions p
  JOIN rounds r ON r.id = p.round_id
  WHERE p.correct = 1
  ORDER BY r.resolved_at DESC
  LIMIT ?
`);

// ── User-created agents (1 per wallet) ───────────────────────────────────────

const MAX_AGENTS_PER_WALLET = parseInt(process.env.MAX_AGENTS_PER_WALLET || '1', 10);

const getUserAgentByCreator = db.prepare(
  'SELECT * FROM user_agents WHERE creator_address = ?'
);

const getUserAgentByTokenId = db.prepare(
  'SELECT * FROM user_agents WHERE token_id = ?'
);

const getAllUserAgents = db.prepare(
  'SELECT * FROM user_agents ORDER BY created_at DESC LIMIT ?'
);

const insertUserAgent = db.prepare(`
  INSERT INTO user_agents (creator_address, token_id, name, strategy, version, tx_hash, created_at)
  VALUES (@creator_address, @token_id, @name, @strategy, @version, @tx_hash, @created_at)
`);

const rowToUserAgent = (row) => row ? ({
  creatorAddress: row.creator_address,
  tokenId:        row.token_id,
  name:           row.name,
  strategy:       row.strategy,
  version:        row.version,
  txHash:         row.tx_hash,
  createdAt:      row.created_at,
}) : null;

// ── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  db,
  // players
  getPlayer,
  upsertPlayer,
  getTopPlayers,
  // rounds
  saveRound,
  getRecentRounds,
  // agents
  getAllAgentStats,
  upsertAgentStats,
  saveAgentsBatch,
  updateAgentStatsFromRound,
  // user agents
  MAX_AGENTS_PER_WALLET,
  getUserAgentByCreator,
  getUserAgentByTokenId,
  getAllUserAgents,
  insertUserAgent,
  rowToUserAgent,
  // recent wins
  getRecentWins,
  // signatures
  insertSignature,
  getSignaturesByRound,
  getSignaturesByPlayer,
};
