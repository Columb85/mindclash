/**
 * MindClash Backend API Server
 * 
 * This server provides REST API endpoints for:
 * - AI agent management and monitoring
 * - Contract interactions
 * - Real-time price feeds
 * - Leaderboard data
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import routes
const agentsRouter      = require('./routes/agents');
const pricesRouter      = require('./routes/prices');
const leaderboardRouter = require('./routes/leaderboard');
const contractsRouter   = require('./routes/contracts');
const playersRouter     = require('./routes/players');
const roundsRouter      = require('./routes/rounds');
const duelsRouter       = require('./routes/duels');

// Initialize DB (creates file + tables on first run)
require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security middleware ─────────────────────────────────────────────────────
app.use(helmet());

// ── CORS configuration ──────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://www.mindclash.xyz',
  'https://mindclash.xyz',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  ...(process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : []),
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, mobile apps, server-to-server)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Rate limiting ───────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ── Request parsing ─────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Logging — 'tiny' in prod to reduce disk usage, 'dev' in development ──────
if (process.env.NODE_ENV !== 'test') {
  const logFormat = process.env.NODE_ENV === 'production' ? 'tiny' : 'dev';
  app.use(morgan(logFormat));
}

// ── Root endpoint ───────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'MindClash Backend API',
    version: '1.0.0',
    status: 'running',
    network: 'Mantle Sepolia',
    endpoints: {
      health:           'GET /health',
      config:           'GET /api/config',
      agents:           'GET /api/agents',
      agentStats:       'GET|POST /api/agents/stats',
      prices:           'GET /api/prices',
      leaderboard:      'GET /api/leaderboard',
      leaderboardPlayers: 'GET /api/leaderboard/players',
      leaderboardAgents:  'GET /api/leaderboard/agents',
      playerStats:      'GET|POST /api/players/:address/stats',
      roundsComplete:   'POST /api/rounds/complete',
      roundsHistory:    'GET /api/rounds/history',
      contractStats:    'GET /api/contracts/stats',
    },
  });
});

// ── Health check endpoint ───────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    mode: process.env.ENABLE_ONCHAIN_SIGNING === 'true' ? 'signing-enabled' : 'read-only',
    network: {
      chainId: process.env.CHAIN_ID,
      rpcUrl: process.env.RPC_URL,
    },
  });
});

// ── API routes ──────────────────────────────────────────────────────────────
app.use('/api/agents',      agentsRouter);
app.use('/api/prices',      pricesRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/contracts',   contractsRouter);
app.use('/api/players',     playersRouter);
app.use('/api/rounds',      roundsRouter);
app.use('/api/duels',       duelsRouter);

// ── Contract addresses endpoint ─────────────────────────────────────────────
app.get('/api/config', (req, res) => {
  res.json({
    mode: process.env.ENABLE_ONCHAIN_SIGNING === 'true' ? 'signing-enabled' : 'read-only',
    liveProductionApi: 'https://api.mindclash.xyz',
    network: {
      chainId: parseInt(process.env.CHAIN_ID),
      rpcUrl: process.env.RPC_URL,
      explorerUrl: process.env.EXPLORER_URL,
    },
    contracts: {
      agentNFT: process.env.AGENT_NFT_ADDRESS,
      agentRegistry: process.env.AGENT_REGISTRY_ADDRESS,
      roundEngine: process.env.ROUND_ENGINE_ADDRESS,
      treasury: process.env.TREASURY_ADDRESS,
      clashToken: process.env.CLASH_TOKEN_ADDRESS,
      oracleAdapter: process.env.ORACLE_ADAPTER_ADDRESS,
    },
  });
});

// ── Error handling middleware ───────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ── Start server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🚀 MindClash Backend API Server');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Port:        ${PORT}`);
  console.log(`  Chain ID:    ${process.env.CHAIN_ID}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Endpoints:');
  console.log('  GET  /health              - Health check');
  console.log('  GET  /api/config          - Contract addresses');
  console.log('  GET  /api/agents          - List AI agents');
  console.log('  GET  /api/agents/:id      - Get agent details');
  console.log('  GET  /api/prices          - Current prices');
  console.log('  GET  /api/leaderboard     - Top agents');
  console.log('  GET  /api/contracts/stats - Protocol stats');
  console.log('═══════════════════════════════════════════════════════\n');
});

module.exports = app;
