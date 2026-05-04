/**
 * Leaderboard API Routes
 * 
 * Endpoints for fetching AI agent rankings and competition stats
 */

const express = require('express');
const { ethers } = require('ethers');
const router = express.Router();

// ── Contract ABIs ───────────────────────────────────────────────────────────
const AGENT_NFT_ABI = [
  'function totalAgents() view returns (uint256)',
  'function getAgentInfo(uint256 tokenId) view returns (tuple(address agentAddress, string name, string version, uint256 createdAt, uint256 totalDecisions, uint256 successfulDecisions, int256 totalPnL, bool isActive))',
];

const AGENT_REGISTRY_ABI = [
  'function getLeaderboard(uint256 limit) view returns (uint256[] tokenIds, int256[] scores)',
  'function getSessionInfo() view returns (tuple(uint256 sessionId, uint256 startTime, uint256 endTime, bool isActive))',
];

// ── Initialize provider and contracts ───────────────────────────────────────
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

// ── GET /api/leaderboard - Get top agents ───────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const sortBy = req.query.sortBy || 'pnl'; // pnl, winRate, decisions
    
    const nftContract = getAgentNFTContract();
    const totalAgents = await nftContract.totalAgents();
    
    // Fetch all agent data
    const agents = [];
    for (let i = 1; i <= totalAgents; i++) {
      try {
        const info = await nftContract.getAgentInfo(i);
        
        const winRate = info.totalDecisions > 0 
          ? (Number(info.successfulDecisions) / Number(info.totalDecisions)) * 100
          : 0;
        
        agents.push({
          tokenId: i,
          name: info.name,
          version: info.version,
          address: info.agentAddress,
          totalDecisions: Number(info.totalDecisions),
          successfulDecisions: Number(info.successfulDecisions),
          totalPnL: Number(info.totalPnL),
          winRate: winRate,
          isActive: info.isActive,
          createdAt: Number(info.createdAt),
        });
      } catch (err) {
        console.error(`Error fetching agent ${i}:`, err.message);
      }
    }
    
    // Sort agents
    switch (sortBy) {
      case 'winRate':
        agents.sort((a, b) => b.winRate - a.winRate);
        break;
      case 'decisions':
        agents.sort((a, b) => b.totalDecisions - a.totalDecisions);
        break;
      case 'pnl':
      default:
        agents.sort((a, b) => b.totalPnL - a.totalPnL);
        break;
    }
    
    // Add rank
    const rankedAgents = agents.slice(0, limit).map((agent, index) => ({
      rank: index + 1,
      ...agent,
      winRateFormatted: agent.winRate.toFixed(2) + '%',
      pnlFormatted: (agent.totalPnL >= 0 ? '+' : '') + agent.totalPnL.toFixed(2),
    }));
    
    res.json({
      success: true,
      sortBy,
      total: agents.length,
      data: rankedAgents,
      timestamp: Date.now(),
    });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/leaderboard/stats - Get overall competition stats ──────────────
router.get('/stats', async (req, res, next) => {
  try {
    const nftContract = getAgentNFTContract();
    const registryContract = getAgentRegistryContract();
    
    const totalAgents = await nftContract.totalAgents();
    
    // Get session info
    let sessionInfo = null;
    try {
      const session = await registryContract.getSessionInfo();
      sessionInfo = {
        sessionId: Number(session.sessionId),
        startTime: Number(session.startTime),
        endTime: Number(session.endTime),
        isActive: session.isActive,
      };
    } catch (err) {
      console.log('Could not fetch session info');
    }
    
    // Aggregate stats
    let totalDecisions = 0;
    let totalWins = 0;
    let totalPnL = 0;
    let activeAgents = 0;
    
    for (let i = 1; i <= totalAgents; i++) {
      try {
        const info = await nftContract.getAgentInfo(i);
        totalDecisions += Number(info.totalDecisions);
        totalWins += Number(info.successfulDecisions);
        totalPnL += Number(info.totalPnL);
        if (info.isActive) activeAgents++;
      } catch (err) {
        // Skip invalid agents
      }
    }
    
    res.json({
      success: true,
      stats: {
        totalAgents: Number(totalAgents),
        activeAgents,
        totalDecisions,
        totalWins,
        overallWinRate: totalDecisions > 0 
          ? ((totalWins / totalDecisions) * 100).toFixed(2) + '%'
          : '0.00%',
        totalPnL: totalPnL.toFixed(2),
      },
      session: sessionInfo,
      contracts: {
        agentNFT: process.env.AGENT_NFT_ADDRESS,
        agentRegistry: process.env.AGENT_REGISTRY_ADDRESS,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/leaderboard/human-vs-ai - Compare human and AI performance ─────
router.get('/human-vs-ai', async (req, res, next) => {
  try {
    const nftContract = getAgentNFTContract();
    const totalAgents = await nftContract.totalAgents();
    
    // Calculate AI aggregate stats
    let aiStats = {
      totalDecisions: 0,
      wins: 0,
      pnl: 0,
      agentCount: Number(totalAgents),
    };
    
    for (let i = 1; i <= totalAgents; i++) {
      try {
        const info = await nftContract.getAgentInfo(i);
        aiStats.totalDecisions += Number(info.totalDecisions);
        aiStats.wins += Number(info.successfulDecisions);
        aiStats.pnl += Number(info.totalPnL);
      } catch (err) {
        // Skip
      }
    }
    
    aiStats.winRate = aiStats.totalDecisions > 0 
      ? ((aiStats.wins / aiStats.totalDecisions) * 100).toFixed(2)
      : '0.00';
    
    // Mock human stats (would come from user database)
    const humanStats = {
      totalDecisions: Math.floor(Math.random() * 1000) + 100,
      wins: 0,
      pnl: 0,
      playerCount: 42, // Mock
    };
    humanStats.wins = Math.floor(humanStats.totalDecisions * (0.45 + Math.random() * 0.15));
    humanStats.pnl = (Math.random() - 0.5) * 10000;
    humanStats.winRate = ((humanStats.wins / humanStats.totalDecisions) * 100).toFixed(2);
    
    res.json({
      success: true,
      ai: {
        ...aiStats,
        label: 'AI Agents',
        color: '#00D4AA', // Mantle green
      },
      human: {
        ...humanStats,
        label: 'Human Players',
        color: '#FF6B6B',
      },
      winner: parseFloat(aiStats.winRate) > parseFloat(humanStats.winRate) ? 'AI' : 'Human',
      timestamp: Date.now(),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
