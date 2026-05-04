/**
 * AI Agents API Routes
 *
 * Endpoints for managing and monitoring AI trading agents
 */

const express = require('express');
const { ethers } = require('ethers');
const router = express.Router();

// ── Contract ABIs (matching actual deployed contracts) ──────────────────────
const AGENT_NFT_ABI = [
  // Agent profile struct mapping
  'function agentProfiles(uint256) view returns (string name, string version, uint256 createdAt, uint256 totalDecisions, uint256 correctDecisions, uint256 totalPnL, bool isActive)',
  // Get agent stats
  'function getAgentStats(uint256 tokenId) view returns (uint256 totalDecisions, uint256 correctDecisions, uint256 totalPnL, uint256 winRate, bool isActive)',
  // Address to token mapping
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
const KNOWN_AGENT_IDS = [1, 2, 3];

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

// ── GET /api/agents/:id/decisions - Get agent decision history ──────────────
router.get('/:id/decisions', async (req, res, next) => {
  try {
    const tokenId = parseInt(req.params.id);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    
    // For now, return mock data (actual implementation would read from events)
    const decisions = [
      {
        id: 1,
        timestamp: Date.now() - 3600000,
        direction: 'UP',
        confidence: 85,
        asset: 'BTC',
        entryPrice: '67000.00',
        exitPrice: '67500.00',
        result: 'WIN',
        pnl: '+500.00',
        txHash: '0x...',
      },
      {
        id: 2,
        timestamp: Date.now() - 7200000,
        direction: 'DOWN',
        confidence: 72,
        asset: 'ETH',
        entryPrice: '3200.00',
        exitPrice: '3150.00',
        result: 'WIN',
        pnl: '+50.00',
        txHash: '0x...',
      },
    ];
    
    res.json({
      tokenId,
      total: decisions.length,
      decisions: decisions.slice(0, limit),
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

module.exports = router;
