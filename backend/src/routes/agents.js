/**
 * AI Agents API Routes
 *
 * Endpoints for managing and monitoring AI trading agents
 */

const express  = require('express');
const rateLimit = require('express-rate-limit');
const { ethers } = require('ethers');
const router = express.Router();
const { getAllAgentStats, saveAgentsBatch, getUserAgent, insertUserAgent, setErc8004AgentId, getErc8004AgentId } = require('../db');
const { generateDecision } = require('../neural-decision');

// Rate limit for on-chain demo endpoint (costs gas + Groq credits)
// Generous for hackathon judging, can tighten later for mainnet
const demoLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minute window
  max: 20,                   // 20 requests per minute per IP
  message: { error: 'Too many demo requests. Try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Contract ABIs (matching actual deployed contracts) ──────────────────────
const AGENT_NFT_ABI = [
  'function agentProfiles(uint256) view returns (string name, string version, uint256 createdAt, uint256 totalDecisions, uint256 correctDecisions, uint256 totalPnL, bool isActive)',
  'function getAgentStats(uint256 tokenId) view returns (uint256 totalDecisions, uint256 correctDecisions, uint256 totalPnL, uint256 winRate, bool isActive)',
  'function agentToToken(address) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
  'event AgentCreated(uint256 indexed tokenId, address indexed agentAddress, string name, string version)',
];

const AGENT_NFT_WRITE_ABI = [
  'function recordDecision(uint256 tokenId, string direction, uint256 confidence, uint256 stake, string reasoning) returns (bytes32)',
  'function getRecentDecisions(uint256 tokenId, uint256 limit) view returns (tuple(string direction, uint256 confidence, uint256 stake, uint256 timestamp, bool wasCorrect, int256 pnl, string reasoning, bytes32 decisionHash)[])',
];

// Known bots (tokenId → metadata)
const BOT_CONFIGS = {
  5: { name: 'AlphaPredict',   strategy: 'momentum',       envKey: 'AGENT_ALPHA_PRIVATE_KEY' },
  6: { name: 'MomentumMaster', strategy: 'mean-reversion', envKey: 'AGENT_MOMENTUM_PRIVATE_KEY' },
  7: { name: 'NeuralTrader',   strategy: 'neural',         envKey: 'AGENT_NEURAL_PRIVATE_KEY' },
};

const AGENT_REGISTRY_ABI = [
  'function currentSession() view returns (uint256)',
  'function sessionEndTime() view returns (uint256)',
  'function isSessionActive() view returns (bool)',
  'function getAgentSessionStats(uint256 tokenId) view returns (uint256 decisions, uint256 wins, int256 pnl)',
];

// Known agent IDs from deployment (3 agents created)
const KNOWN_AGENT_IDS = [5, 6, 7];

// ── Initialize provider ─────────────────────────────────────────────────────
const getProvider = () => {
  return new ethers.JsonRpcProvider(process.env.RPC_URL);
};

const getAgentNFTContract = () => {
  const provider = getProvider();
  return new ethers.Contract(
    process.env.AGENT_NFT_ADDRESS,
    AGENT_NFT_ABI,
    provider
  );
};

const getAgentRegistryContract = () => {
  const provider = getProvider();
  return new ethers.Contract(
    process.env.AGENT_REGISTRY_ADDRESS,
    AGENT_REGISTRY_ABI,
    provider
  );
};

// ── GET /api/agents/stats — read all agent stats from DB ────────────────────
// (must be before /:id to avoid being matched as tokenId)
router.get('/stats', (req, res) => {
  const rows = getAllAgentStats.all();
  res.json({ success: true, data: rows, timestamp: Date.now() });
});

// ── POST /api/agents/stats — batch-upsert agent stats (admin-only) ───────────
router.post('/stats', requireAdminAuth, (req, res) => {
  const agents = req.body;
  if (!Array.isArray(agents) || agents.length === 0) {
    return res.status(400).json({ error: 'Body must be a non-empty array of agents' });
  }
  try {
    const rows = agents.map(a => ({
      name:              String(a.name              ?? ''),
      strategy:          String(a.strategy          ?? 'neural'),
      total_decisions:   parseInt(a.totalDecisions)  || 0,
      correct_decisions: parseInt(a.correctDecisions) || 0,
      win_rate:          parseFloat(a.winRate)        || 0,
      total_pnl:         parseFloat(a.totalPnL)       || 0,
      updated_at:        Math.floor(Date.now() / 1000),
    }));
    saveAgentsBatch(rows);
    res.json({ success: true, saved: rows.length, timestamp: Date.now() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/agents/decide — generate AI decision without on-chain tx ──────
router.post('/decide', async (req, res, next) => {
  try {
    const tokenId  = parseInt(req.body.agentTokenId) || 5;
    const asset    = (req.body.asset || 'BTC').toUpperCase();
    const duration = parseInt(req.body.duration) || 60;
    const strategy = req.body.strategy || 'neural';

    if (!['BTC', 'ETH', 'SOL', 'MNT'].includes(asset)) {
      return res.status(400).json({ error: 'asset must be BTC, ETH, SOL or MNT' });
    }

    const aiResult = await generateDecision({ agentTokenId: tokenId, asset, duration, strategy });

    // Fetch current price for response
    const symbol    = `${asset}USDT`;
    const priceResp = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`);
    const priceJson = await priceResp.json();
    const ticker    = priceJson?.result?.list?.[0];
    const price     = ticker ? parseFloat(ticker.lastPrice) : 0;

    res.json({
      success: true,
      decision: { ...aiResult, price },
      timestamp: Date.now(),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/agents/mine/:address — get user-registered agent ────────────────
router.get('/mine/:address', (req, res) => {
  const address = req.params.address.toLowerCase();
  const agent = getUserAgent.get(address);

  if (!agent) {
    return res.json({ success: true, data: null, chainTokenId: 0 });
  }

  res.json({
    success: true,
    data: {
      id: agent.id,
      creatorAddress: agent.creator_address,
      tokenId: agent.token_id,
      name: agent.name,
      strategy: agent.strategy,
      version: agent.version,
      txHash: agent.tx_hash,
      createdAt: agent.created_at,
    },
    chainTokenId: agent.token_id,
  });
});

// ── POST /api/agents/register — register user-created agent ──────────────────
router.post('/register', (req, res) => {
  const { creatorAddress, tokenId, name, strategy, version, txHash } = req.body;

  if (!creatorAddress || !name || !strategy) {
    return res.status(400).json({ error: 'creatorAddress, name, and strategy are required' });
  }

  try {
    insertUserAgent.run({
      creator_address: creatorAddress.toLowerCase(),
      token_id: tokenId || 0,
      name: String(name).slice(0, 32),
      strategy: String(strategy).slice(0, 32),
      version: version || '1.0',
      tx_hash: txHash || null,
      created_at: Math.floor(Date.now() / 1000),
    });

    res.json({ success: true, message: 'Agent registered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/agents/erc8004-link — save tokenId→erc8004AgentId mapping ─────
router.post('/erc8004-link', (req, res) => {
  const { tokenId, erc8004AgentId } = req.body;
  if (tokenId == null || erc8004AgentId == null) {
    return res.status(400).json({ error: 'tokenId and erc8004AgentId are required' });
  }
  try {
    setErc8004AgentId.run(Number(erc8004AgentId), Number(tokenId));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/agents - List all agents ───────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const contract = getAgentNFTContract();
    
    const agents = [];
    // Iterate through known agent IDs
    for (const tokenId of KNOWN_AGENT_IDS) {
      try {
        // Get profile from mapping
        const profile = await contract.agentProfiles(tokenId);
        const owner = await contract.ownerOf(tokenId);
        
        agents.push({
          tokenId,
          name: profile.name,
          version: profile.version,
          createdAt: Number(profile.createdAt),
          totalDecisions: Number(profile.totalDecisions),
          correctDecisions: Number(profile.correctDecisions),
          totalPnL: profile.totalPnL.toString(),
          isActive: profile.isActive,
          owner: owner,
          winRate: profile.totalDecisions > 0
            ? ((Number(profile.correctDecisions) / Number(profile.totalDecisions)) * 100).toFixed(2)
            : '0.00',
          explorerUrl: `${process.env.EXPLORER_URL}/address/${owner}`,
        });
      } catch (err) {
        console.log(`Agent ${tokenId} not found or error:`, err.message);
      }
    }
    
    res.json({
      success: true,
      total: agents.length,
      agents,
      timestamp: Date.now(),
    });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/agents/:id - Get agent by token ID ─────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const tokenId = parseInt(req.params.id);
    if (isNaN(tokenId) || tokenId < 1) {
      return res.status(400).json({ error: 'Invalid token ID' });
    }
    
    const nftContract = getAgentNFTContract();
    
    // Get profile from mapping
    const profile = await nftContract.agentProfiles(tokenId);
    const owner = await nftContract.ownerOf(tokenId);
    
    // Check if agent exists (name should not be empty)
    if (!profile.name || profile.name === '') {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    const agent = {
      tokenId,
      name: profile.name,
      version: profile.version,
      createdAt: Number(profile.createdAt),
      totalDecisions: Number(profile.totalDecisions),
      correctDecisions: Number(profile.correctDecisions),
      totalPnL: profile.totalPnL.toString(),
      isActive: profile.isActive,
      owner,
      winRate: profile.totalDecisions > 0
        ? ((Number(profile.correctDecisions) / Number(profile.totalDecisions)) * 100).toFixed(2)
        : '0.00',
      explorerUrl: `${process.env.EXPLORER_URL}/address/${owner}`,
      nftUrl: `${process.env.EXPLORER_URL}/token/${process.env.AGENT_NFT_ADDRESS}?a=${tokenId}`,
    };
    
    res.json({
      success: true,
      data: agent,
      timestamp: Date.now(),
    });
  } catch (error) {
    if (error.message.includes('nonexistent') || error.message.includes('invalid token')) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    next(error);
  }
});

// ── GET /api/agents/demo/decisions — recent on-chain decisions for all bots ──
// NOTE: must be defined BEFORE /:id/decisions to prevent Express param shadowing
router.get('/demo/decisions', async (req, res, next) => {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const contract = new ethers.Contract(process.env.AGENT_NFT_ADDRESS, AGENT_NFT_WRITE_ABI, provider);

    const results = await Promise.all(
      [5, 6, 7].map(async tokenId => {
        try {
          const decisions = await contract.getRecentDecisions(tokenId, 5);
          const bot = BOT_CONFIGS[tokenId];
          return {
            tokenId,
            name:     bot.name,
            strategy: bot.strategy,
            decisions: decisions.map(d => ({
              direction:  d.direction,
              confidence: Number(d.confidence),
              stake:      Number(d.stake),
              timestamp:  Number(d.timestamp),
              wasCorrect: d.wasCorrect,
              reasoning:  d.reasoning,
            })),
          };
        } catch {
          return { tokenId, name: BOT_CONFIGS[tokenId].name, decisions: [] };
        }
      })
    );

    res.json({ success: true, bots: results, timestamp: Date.now() });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/agents/:id/decisions - Get agent decision history (on-chain) ───
router.get('/:id/decisions', async (req, res, next) => {
  try {
    const tokenId = parseInt(req.params.id);
    if (isNaN(tokenId)) return res.status(400).json({ error: 'Invalid tokenId' });
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    if (tokenId < 1 || tokenId > 9999) {
      return res.status(400).json({ error: 'Invalid tokenId' });
    }

    const provider = getProvider();
    const contract = new ethers.Contract(process.env.AGENT_NFT_ADDRESS, AGENT_NFT_WRITE_ABI, provider);
    const raw = await contract.getRecentDecisions(tokenId, limit);

    const decisions = raw.map((d, i) => ({
      id: i + 1,
      timestamp: Number(d.timestamp) * 1000,
      direction: d.direction,
      confidence: Number(d.confidence) / 10,
      stake: Number(d.stake),
      wasCorrect: d.wasCorrect,
      pnl: Number(d.pnl),
      reasoning: d.reasoning,
      decisionHash: d.decisionHash,
      result: d.wasCorrect ? 'WIN' : (d.pnl !== 0n && d.pnl !== 0 ? 'LOSS' : 'PENDING'),
    }));

    res.json({
      tokenId,
      total: decisions.length,
      decisions,
      source: 'chain',
    });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/agents/session - Get current benchmark session ─────────────────
router.get('/session/info', async (req, res, next) => {
  try {
    const contract = getAgentRegistryContract();
    const session = await contract.getSessionInfo();
    
    res.json({
      sessionId: Number(session.sessionId),
      startTime: Number(session.startTime),
      endTime: Number(session.endTime),
      isActive: session.isActive,
      remainingTime: session.isActive 
        ? Math.max(0, Number(session.endTime) - Math.floor(Date.now() / 1000))
        : 0,
    });
  } catch (error) {
    next(error);
  }
});

// ── Indicator helpers ────────────────────────────────────────────────────────
function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  const changes = closes.slice(1).map((c, i) => c - closes[i]);
  let avgGain = 0, avgLoss = 0;
  for (let i = 0; i < period; i++) {
    const d = changes[changes.length - period + i];
    if (d > 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= period; avgLoss /= period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return parseFloat((100 - 100 / (1 + rs)).toFixed(2));
}

function calcSMA(closes, period) {
  if (closes.length < period) return null;
  return parseFloat((closes.slice(-period).reduce((s, v) => s + v, 0) / period).toFixed(2));
}

function calcBollinger(closes, period = 20) {
  if (closes.length < period) return null;
  const sma = closes.slice(-period).reduce((s, v) => s + v, 0) / period;
  const std = Math.sqrt(closes.slice(-period).reduce((s, v) => s + (v - sma) ** 2, 0) / period);
  return {
    upper:  parseFloat((sma + 2 * std).toFixed(2)),
    middle: parseFloat(sma.toFixed(2)),
    lower:  parseFloat((sma - 2 * std).toFixed(2)),
  };
}

// ── GET /api/agents/analyze — real klines + indicators + signal ──────────────
router.get('/analyze', async (req, res, next) => {
  try {
    const tokenId = parseInt(req.query.tokenId) || 5;
    const asset   = (req.query.asset || 'BTC').toUpperCase();

    if (![5, 6, 7].includes(tokenId)) return res.status(400).json({ error: 'Invalid tokenId' });
    if (!['BTC', 'ETH', 'SOL', 'MNT'].includes(asset)) return res.status(400).json({ error: 'Invalid asset' });

    const bot    = BOT_CONFIGS[tokenId];
    const symbol = `${asset}USDT`;

    // Fetch 1-min klines (30 candles) from Bybit
    const kUrl  = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=1&limit=30`;
    const kResp = await fetch(kUrl);
    const kJson = await kResp.json();
    // Bybit returns newest-first → reverse
    const candles = (kJson?.result?.list ?? []).reverse();
    const closes  = candles.map(c => parseFloat(c[4]));  // index 4 = close
    const volumes = candles.map(c => parseFloat(c[5]));  // index 5 = volume

    // Fetch ticker for 24h stats
    const tResp   = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`);
    const tJson   = await tResp.json();
    const ticker  = tJson?.result?.list?.[0] ?? {};
    const price   = parseFloat(ticker.lastPrice   ?? closes[closes.length - 1]);
    const change24h = parseFloat(ticker.price24hPcnt ?? 0);

    // Technical indicators
    const rsi    = calcRSI(closes, 14);
    const sma10  = calcSMA(closes, 10);
    const sma20  = calcSMA(closes, 20);
    const boll   = calcBollinger(closes, 20);
    const avgVol = volumes.slice(-10).reduce((s, v) => s + v, 0) / 10;
    const lastVol = volumes[volumes.length - 1];
    const volumeSpike = lastVol > avgVol * 1.3;

    // Generate signals per strategy
    const signals = [];
    let direction, confidence, reasoning;

    if (bot.strategy === 'momentum') {
      const aboveSMA10 = sma10 != null && price > sma10;
      const aboveSMA20 = sma20 != null && price > sma20;
      const posChange  = change24h > 0;
      const rsiOk      = rsi != null && rsi > 40 && rsi < 75;
      signals.push({ label: `Price ${aboveSMA10 ? '>' : '<'} SMA10 ($${sma10})`, bullish: aboveSMA10 });
      signals.push({ label: `Price ${aboveSMA20 ? '>' : '<'} SMA20 ($${sma20})`, bullish: aboveSMA20 });
      signals.push({ label: `24h change: ${change24h >= 0 ? '+' : ''}${(change24h * 100).toFixed(2)}%`, bullish: posChange });
      signals.push({ label: `RSI(14) = ${rsi} (${rsiOk ? 'not extreme' : 'extreme'})`, bullish: rsiOk });
      if (volumeSpike) signals.push({ label: 'Volume spike (+30%)', bullish: true });
      const bullCount = signals.filter(s => s.bullish).length;
      direction  = bullCount >= signals.length / 2 ? 'UP' : 'DOWN';
      confidence = Math.min(950, 400 + bullCount * 120);
      reasoning  = `Momentum: ${bullCount}/${signals.length} bullish signals → ${direction}`;

    } else if (bot.strategy === 'mean-reversion') {
      const overbought  = rsi != null && rsi > 65;
      const oversold    = rsi != null && rsi < 35;
      const nearUpper   = boll && price > boll.upper * 0.98;
      const nearLower   = boll && price < boll.lower * 1.02;
      signals.push({ label: `RSI(14) = ${rsi} → ${overbought ? 'Overbought' : oversold ? 'Oversold' : 'Neutral'}`, bullish: oversold });
      signals.push({ label: `Bollinger: price ${nearUpper ? 'near upper band (sell)' : nearLower ? 'near lower band (buy)' : 'in middle range'}`, bullish: nearLower });
      signals.push({ label: `24h move: ${(change24h * 100).toFixed(2)}% → ${Math.abs(change24h) > 0.02 ? 'Extended, expect reversion' : 'Normal range'}`, bullish: change24h < 0 });
      const bullCount = signals.filter(s => s.bullish).length;
      direction  = bullCount >= 2 ? 'UP' : 'DOWN';
      confidence = Math.min(920, 450 + bullCount * 140);
      reasoning  = `Mean-Reversion: ${overbought || nearUpper ? 'Extended upside → fade DOWN' : oversold || nearLower ? 'Oversold → bounce UP' : 'Neutral → slight ' + direction}`;

    } else {
      // neural — weighted blend
      const smaScore  = (sma10 && price > sma10 ? 1 : -1) + (sma20 && price > sma20 ? 1 : -1);
      const rsiScore  = rsi != null ? (rsi - 50) / 50 : 0;  // -1..+1
      const momScore  = Math.max(-1, Math.min(1, change24h * 20));
      const bollScore = boll ? (price - boll.middle) / (boll.upper - boll.middle) : 0;
      const composite = smaScore * 0.3 + rsiScore * 0.25 + momScore * 0.35 + bollScore * 0.1;
      signals.push({ label: `SMA cross score: ${smaScore > 0 ? '+' : ''}${smaScore.toFixed(2)}`, bullish: smaScore > 0 });
      signals.push({ label: `RSI weight: ${(rsiScore).toFixed(2)} (RSI=${rsi})`, bullish: rsiScore > 0 });
      signals.push({ label: `Momentum weight: ${momScore.toFixed(2)}`, bullish: momScore > 0 });
      signals.push({ label: `Bollinger position: ${bollScore.toFixed(2)}`, bullish: bollScore < 0.5 });
      direction  = composite >= 0 ? 'UP' : 'DOWN';
      confidence = Math.min(970, Math.round(500 + Math.abs(composite) * 450));
      reasoning  = `Neural: composite score ${composite.toFixed(3)} → ${direction}`;
    }

    res.json({
      success: true,
      bot:     { tokenId, name: bot.name, strategy: bot.strategy },
      market:  { asset, symbol, price, change24h, lastVolume: lastVol, avgVolume: parseFloat(avgVol.toFixed(2)) },
      indicators: { rsi, sma10, sma20, bollinger: boll },
      signals,
      decision:  { direction, confidence, stake: 250, reasoning },
      timestamp: Date.now(),
    });
  } catch (err) {
    next(err);
  }
});

// ── Admin auth middleware ─────────────────────────────────────────────────────
function requireAdminAuth(req, res, next) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return res.status(503).json({ error: 'Admin auth not configured' });
  const auth = req.headers['authorization'] || '';
  const b64 = auth.replace('Basic ', '');
  let pass = '';
  try { pass = Buffer.from(b64, 'base64').toString('utf8').split(':')[1] || ''; } catch {}
  if (pass !== adminPassword) {
    res.set('WWW-Authenticate', 'Basic realm="MindClash Admin"');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ── POST /api/agents/demo — trigger a real on-chain bot decision ─────────────
// Protected by IP rate limit (5/10min) instead of admin auth so the UI demo works
router.post('/demo', demoLimiter, async (req, res, next) => {
  try {
    const tokenId = parseInt(req.body.tokenId) || 5;
    const asset   = (req.body.asset || 'BTC').toUpperCase();

    if (![5, 6, 7].includes(tokenId)) {
      return res.status(400).json({ error: 'tokenId must be 5, 6 or 7' });
    }
    if (!['BTC', 'ETH', 'SOL', 'MNT'].includes(asset)) {
      return res.status(400).json({ error: 'asset must be BTC, ETH, SOL or MNT' });
    }

    const bot = BOT_CONFIGS[tokenId];

    // Resolve private key: bot-specific first, then shared fallback
    const privateKey = process.env[bot.envKey] || process.env.AGENT_PRIVATE_KEY;
    if (!privateKey || privateKey.includes('your_testnet') || privateKey === '0x' + '0'.repeat(64)) {
      return res.status(503).json({
        error: 'Bot private key not configured. Set AGENT_ALPHA_PRIVATE_KEY / AGENT_MOMENTUM_PRIVATE_KEY / AGENT_NEURAL_PRIVATE_KEY in .env',
      });
    }

    // Fetch current price + 24h change from Bybit
    const symbol    = `${asset}USDT`;
    const priceResp = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`);
    const priceJson = await priceResp.json();
    const ticker    = priceJson?.result?.list?.[0];
    if (!ticker) return res.status(502).json({ error: 'Price fetch failed' });

    const price     = parseFloat(ticker.lastPrice);
    const change24h = parseFloat(ticker.price24hPcnt); // e.g. 0.0123 = +1.23%

    // Use unified decision engine (LLM if GROQ_API_KEY set, else rules fallback)
    const aiResult = await generateDecision({
      agentTokenId: tokenId,
      asset,
      duration: 60,
      strategy: bot.strategy,
    });

    const { direction, confidence, reasoning } = aiResult;
    const stake = 250;

    // Submit on-chain
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const wallet   = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(
      process.env.AGENT_NFT_ADDRESS,
      AGENT_NFT_WRITE_ABI,
      wallet
    );

    const tx      = await contract.recordDecision(tokenId, direction, confidence, stake, reasoning);
    const receipt = await tx.wait();

    const explorerUrl = `${process.env.EXPLORER_URL}/tx/${receipt.hash}`;
    console.log(`[DEMO] ${bot.name} recorded ${direction} on ${asset} → ${receipt.hash}`);

    res.json({
      success:  true,
      bot:      { tokenId, name: bot.name, strategy: bot.strategy },
      decision: { asset, direction, confidence, stake, reasoning, price },
      txHash:   receipt.hash,
      explorerUrl,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('[DEMO] error:', err.message);
    next(err);
  }
});

module.exports = router;
