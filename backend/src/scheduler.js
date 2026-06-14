/**
 * On-chain decision scheduler.
 *
 * Rotates through the 3 AI bots every INTERVAL_MS (default 5 min),
 * fetches live market data, generates a decision via neural-decision.js,
 * and writes it to the AgentNFT smart contract on Mantle Sepolia.
 *
 * Guards:
 *   - Skips if ENABLE_ONCHAIN_SIGNING !== 'true'
 *   - Skips if AGENT_PRIVATE_KEY is missing / placeholder
 *   - Individual failures do not crash the loop
 */

const { ethers } = require('ethers');
const { generateDecision } = require('./neural-decision');

const AGENT_NFT_ABI = [
  'function recordDecision(uint256 tokenId, string direction, uint256 confidence, uint256 stake, string reasoning) returns (bytes32)',
];

const BOTS = [
  { tokenId: 5, name: 'AlphaPredict',   strategy: 'momentum',       envKey: 'AGENT_ALPHA_PRIVATE_KEY' },
  { tokenId: 6, name: 'MomentumMaster', strategy: 'mean-reversion', envKey: 'AGENT_MOMENTUM_PRIVATE_KEY' },
  { tokenId: 7, name: 'NeuralTrader',   strategy: 'neural',         envKey: 'AGENT_NEURAL_PRIVATE_KEY' },
];

const ASSETS = ['BTC', 'ETH', 'SOL', 'MNT'];
const INTERVAL_MS = 30 * 60 * 1000; // 30 min fallback (rounds write on-chain per-prediction in real time)

let botIdx = 0;
let timer  = null;

async function tick() {
  if (process.env.ENABLE_ONCHAIN_SIGNING !== 'true') return;

  const bot   = BOTS[botIdx % BOTS.length];
  const pk = process.env[bot.envKey] || process.env.AGENT_PRIVATE_KEY;
  if (!pk || pk.includes('your_testnet') || pk === '0x' + '0'.repeat(64)) return;
  const asset = ASSETS[Math.floor(Math.random() * ASSETS.length)];
  botIdx++;

  try {
    const aiResult = await generateDecision({
      agentTokenId: bot.tokenId,
      asset,
      duration: 60,
      strategy: bot.strategy,
    });

    const { direction, confidence, reasoning } = aiResult;
    const stake = 250;

    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const wallet   = new ethers.Wallet(pk, provider);
    const contract = new ethers.Contract(process.env.AGENT_NFT_ADDRESS, AGENT_NFT_ABI, wallet);

    const tx      = await contract.recordDecision(bot.tokenId, direction, confidence, stake, reasoning);
    const receipt = await tx.wait();

    console.log(`[SCHEDULER] ${bot.name} #${bot.tokenId} → ${direction} ${asset} (conf ${confidence}) tx=${receipt.hash}`);
  } catch (err) {
    console.error(`[SCHEDULER] ${bot.name} #${bot.tokenId} ${asset} failed:`, err.message);
  }
}

function start() {
  if (timer) return;
  if (process.env.ENABLE_ONCHAIN_SIGNING !== 'true') {
    console.log('[SCHEDULER] Disabled (ENABLE_ONCHAIN_SIGNING != true)');
    return;
  }
  console.log(`[SCHEDULER] Started — recording on-chain every ${INTERVAL_MS / 1000}s, rotating ${BOTS.length} bots`);

  // First tick after 30s (let server finish startup)
  setTimeout(() => {
    tick();
    timer = setInterval(tick, INTERVAL_MS);
  }, 30_000);
}

function stop() {
  if (timer) { clearInterval(timer); timer = null; }
}

module.exports = { start, stop };
