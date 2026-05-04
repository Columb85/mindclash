/**
 * Contract Interaction API Routes
 * 
 * Endpoints for interacting with deployed smart contracts
 */

const express = require('express');
const { ethers } = require('ethers');
const router = express.Router();

// ── Contract ABIs ───────────────────────────────────────────────────────────
const CLASH_TOKEN_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function faucet() external',
  'function faucetAmount() view returns (uint256)',
  'function lastFaucetTime(address) view returns (uint256)',
];

const ROUND_ENGINE_ABI = [
  'function roundDuration() view returns (uint256)',
  'function minStake() view returns (uint256)',
  'function totalRounds() view returns (uint256)',
];

const TREASURY_ABI = [
  'function totalFees() view returns (uint256)',
  'function platformBalance() view returns (uint256)',
];

// ── Initialize provider ─────────────────────────────────────────────────────
const getProvider = () => {
  return new ethers.JsonRpcProvider(process.env.RPC_URL);
};

// ── GET /api/contracts/stats - Get protocol statistics ──────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const provider = getProvider();
    
    // Get CLASH token info
    const clashToken = new ethers.Contract(
      process.env.CLASH_TOKEN_ADDRESS,
      CLASH_TOKEN_ABI,
      provider
    );
    
    const [name, symbol, decimals, totalSupply, faucetAmount] = await Promise.all([
      clashToken.name(),
      clashToken.symbol(),
      clashToken.decimals(),
      clashToken.totalSupply(),
      clashToken.faucetAmount(),
    ]);
    
    // Get RoundEngine info
    let roundEngineStats = null;
    try {
      const roundEngine = new ethers.Contract(
        process.env.ROUND_ENGINE_ADDRESS,
        ROUND_ENGINE_ABI,
        provider
      );
      
      const [roundDuration, minStake, totalRounds] = await Promise.all([
        roundEngine.roundDuration(),
        roundEngine.minStake(),
        roundEngine.totalRounds(),
      ]);
      
      roundEngineStats = {
        roundDuration: Number(roundDuration),
        minStake: ethers.formatUnits(minStake, decimals),
        totalRounds: Number(totalRounds),
      };
    } catch (err) {
      console.log('Could not fetch RoundEngine stats');
    }
    
    // Get Treasury info
    let treasuryStats = null;
    try {
      const treasury = new ethers.Contract(
        process.env.TREASURY_ADDRESS,
        TREASURY_ABI,
        provider
      );
      
      const [totalFees, platformBalance] = await Promise.all([
        treasury.totalFees(),
        treasury.platformBalance(),
      ]);
      
      treasuryStats = {
        totalFees: ethers.formatUnits(totalFees, decimals),
        platformBalance: ethers.formatUnits(platformBalance, decimals),
      };
    } catch (err) {
      console.log('Could not fetch Treasury stats');
    }
    
    res.json({
      success: true,
      token: {
        address: process.env.CLASH_TOKEN_ADDRESS,
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: ethers.formatUnits(totalSupply, decimals),
        faucetAmount: ethers.formatUnits(faucetAmount, decimals),
      },
      roundEngine: roundEngineStats,
      treasury: treasuryStats,
      network: {
        chainId: parseInt(process.env.CHAIN_ID),
        rpcUrl: process.env.RPC_URL,
        explorerUrl: process.env.EXPLORER_URL,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/contracts/balance/:address - Get token balance ─────────────────
router.get('/balance/:address', async (req, res, next) => {
  try {
    const { address } = req.params;
    
    if (!ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address',
      });
    }
    
    const provider = getProvider();
    
    // Get native MNT balance
    const mntBalance = await provider.getBalance(address);
    
    // Get CLASH token balance
    const clashToken = new ethers.Contract(
      process.env.CLASH_TOKEN_ADDRESS,
      CLASH_TOKEN_ABI,
      provider
    );
    
    const [clashBalance, decimals, lastFaucetTime] = await Promise.all([
      clashToken.balanceOf(address),
      clashToken.decimals(),
      clashToken.lastFaucetTime(address),
    ]);
    
    // Check if faucet is available (24h cooldown)
    const now = Math.floor(Date.now() / 1000);
    const faucetCooldown = 24 * 60 * 60; // 24 hours
    const canUseFaucet = (now - Number(lastFaucetTime)) >= faucetCooldown;
    const faucetAvailableIn = canUseFaucet 
      ? 0 
      : faucetCooldown - (now - Number(lastFaucetTime));
    
    res.json({
      success: true,
      address,
      balances: {
        MNT: {
          raw: mntBalance.toString(),
          formatted: ethers.formatEther(mntBalance),
        },
        CLASH: {
          raw: clashBalance.toString(),
          formatted: ethers.formatUnits(clashBalance, decimals),
        },
      },
      faucet: {
        canUseFaucet,
        lastUsed: Number(lastFaucetTime),
        availableIn: faucetAvailableIn,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/contracts/addresses - Get all contract addresses ───────────────
router.get('/addresses', (req, res) => {
  res.json({
    success: true,
    network: {
      name: 'Mantle Sepolia',
      chainId: parseInt(process.env.CHAIN_ID),
      rpcUrl: process.env.RPC_URL,
      explorerUrl: process.env.EXPLORER_URL,
    },
    contracts: {
      agentNFT: {
        address: process.env.AGENT_NFT_ADDRESS,
        explorer: `${process.env.EXPLORER_URL}/address/${process.env.AGENT_NFT_ADDRESS}`,
      },
      agentRegistry: {
        address: process.env.AGENT_REGISTRY_ADDRESS,
        explorer: `${process.env.EXPLORER_URL}/address/${process.env.AGENT_REGISTRY_ADDRESS}`,
      },
      roundEngine: {
        address: process.env.ROUND_ENGINE_ADDRESS,
        explorer: `${process.env.EXPLORER_URL}/address/${process.env.ROUND_ENGINE_ADDRESS}`,
      },
      treasury: {
        address: process.env.TREASURY_ADDRESS,
        explorer: `${process.env.EXPLORER_URL}/address/${process.env.TREASURY_ADDRESS}`,
      },
      clashToken: {
        address: process.env.CLASH_TOKEN_ADDRESS,
        explorer: `${process.env.EXPLORER_URL}/address/${process.env.CLASH_TOKEN_ADDRESS}`,
      },
      oracleAdapter: {
        address: process.env.ORACLE_ADAPTER_ADDRESS,
        explorer: `${process.env.EXPLORER_URL}/address/${process.env.ORACLE_ADAPTER_ADDRESS}`,
      },
    },
    timestamp: Date.now(),
  });
});

// ── POST /api/contracts/faucet - Request CLASH tokens (placeholder) ─────────
router.post('/faucet', async (req, res, next) => {
  try {
    const { address } = req.body;
    
    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Valid address required',
      });
    }
    
    // NOTE: Actual faucet transaction would require a signer
    // This is a placeholder that shows the expected response
    res.json({
      success: true,
      message: 'Faucet request noted. Use the frontend with wallet connection to claim tokens.',
      address,
      instructions: [
        '1. Connect your wallet to the frontend',
        '2. Ensure you have some MNT for gas',
        '3. Click the "Claim CLASH" button',
        '4. Approve the transaction in your wallet',
      ],
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
