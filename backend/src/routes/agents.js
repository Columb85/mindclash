/**
 * AI Agents API Routes
 *
 * Endpoints for managing and monitoring AI trading agents
 */

const express = require('express');
const { ethers } = require('ethers');
const router = express.Router();
const { getAllAgentStats, saveAgentsBatch } = require('../db');

// ── Contract ABIs (matching actual deployed contracts) ──────────────────────
const AGENT_NFT_ABI = [
  'function agentProfiles(uint256) view returns (string name, string version, uint256 createdAt, uint256 totalDecisions, uint256 correctDecisions, uint256 totalPnL, bool isActive)',
  'function getAgentStats(uint256 tokenId) view returns (uint256 totalDecisions, uint256 correctDecisions, uint256 totalPnL, uint256 winRate, bool isActive)',
  'function getRecentDecisions(uint256 tokenId, uint256 limit) view returns (tuple(string direction, uint256 confidence, uint256 stake, uint256 timestamp, bool wasCorrect, int256 pnl, string reasoning, bytes32 decisionHash)[])',
  'function agentToToken(address) view returns (uint256)',
  // Standard ERC721 functions
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
  // Events
  'event AgentCreated(uint256 indexed tokenId, address indexed agentAddress, string name, string version)',
];

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

// ── POST /api/agents/stats — batch-upsert agent stats from frontend ─────────
router.post('/stats', (req, res) => {
  const agents = req.body;
  if (!Array.isArray(agents) || agents.length === 0) {
    return res.status(400).json({ error: 'Body must be a non-empty array of agents' });
  }
  try {
    const rows = agents.map(a => ({
      name:              String(a.name              ?? ''),
      strategy:          String(a.strategy          ?? 'neural'),
      total_decisions:   parseInt(a.totalDecisions)  ?? 0,
      correct_decisions: parseInt(a.correctDecisions) ?? 0,
      win_rate:          parseFloat(a.winRate)        ?? 0,
      total_pnl:         parseFloat(a.totalPnL)       ?? 0,
      updated_at:        Math.floor(Date.now() / 1000),
    }));
    saveAgentsBatch(rows);
    res.json({ success: true, saved: rows.length, timestamp: Date.now() });
  } catch (err) {
    console.error('saveAgentsBatch error:', err.message);
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

// ── GET /api/agents/:id/decisions - Get agent decision history (on-chain) ───
router.get('/:id/decisions', async (req, res, next) => {
  try {
    const tokenId = parseInt(req.params.id);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    if (![5, 6, 7].includes(tokenId)) {
      return res.status(400).json({ error: 'Invalid tokenId' });
    }

    const contract = getAgentNFTContract();
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
      result: d.wasCorrect ? 'WIN' : (Number(d.pnl) !== 0 ? 'LOSS' : 'PENDING'),
    }));

    res.json({ tokenId, total: decisions.length, decisions, source: 'chain' });
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

module.exports = router;
