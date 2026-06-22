/**
 * Shared on-chain AgentNFT helpers — recordDecision + resolveDecision.
 */

const { ethers } = require('ethers');
const { getErc8004AgentId, getUserAgentsWithErc8004 } = require('./db');

const AGENT_NFT_ABI = [
  'function recordDecision(uint256 tokenId, string direction, uint256 confidence, uint256 stake, string reasoning) returns (bytes32)',
  'function resolveDecision(uint256 tokenId, uint256 decisionIndex, bool wasCorrect, int256 pnl) external',
  'function getRecentDecisions(uint256 tokenId, uint256 limit) view returns (tuple(string direction, uint256 confidence, uint256 stake, uint256 timestamp, bool wasCorrect, int256 pnl, string reasoning, bytes32 decisionHash)[])',
];

const BOTS = [
  { tokenId: 5, name: 'AlphaPredict',   strategy: 'momentum',       envKey: 'AGENT_ALPHA_PRIVATE_KEY' },
  { tokenId: 6, name: 'MomentumMaster', strategy: 'mean-reversion', envKey: 'AGENT_MOMENTUM_PRIVATE_KEY' },
  { tokenId: 7, name: 'NeuralTrader',   strategy: 'neural',         envKey: 'AGENT_NEURAL_PRIVATE_KEY' },
];

const BOT_MAP = {
  '0xd33744400ed8211f7a5900926df22cd8c2a2ad74': BOTS[0],
  '0x62bc9ab4dcdd43ec1f6fda4f71220f6f85b80a59': BOTS[1],
  '0x508eaddf521ae4887aecfec2d7d7c43f94bd7c39': BOTS[2],
};

const ASSETS = ['BTC', 'ETH', 'SOL', 'MNT'];
const RESOLVE_DELAY_MS = 61_000;

// ── ERC-8004 ReputationRegistry (canonical, CREATE2-deterministic) ───────
const REPUTATION_REGISTRY = '0x8004B663056A597Dffe9eCcC1965A193B7388713';
const REPUTATION_ABI = [
  'function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash) external',
];
const ERC8004_MAP = { 5: 304, 6: 305, 7: 306 };

function resolveErc8004Id(tokenId) {
  if (ERC8004_MAP[tokenId]) return ERC8004_MAP[tokenId];
  const row = getErc8004AgentId.get(tokenId);
  return row?.erc8004_agent_id ?? null;
}

let _reputationSigner = null;
function getReputationSigner() {
  if (_reputationSigner) return _reputationSigner;
  const pk = process.env.REPUTATION_PRIVATE_KEY || process.env.AGENT_PRIVATE_KEY;
  if (!pk || pk.includes('your_testnet')) return null;
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  _reputationSigner = new ethers.Wallet(pk, provider);
  return _reputationSigner;
}

function isRateLimitError(err) {
  const msg = String(err?.message || err?.shortMessage || '').toLowerCase();
  const code = err?.error?.code ?? err?.code;
  return msg.includes('rate limit') || code === -32016 || code === 429;
}

// Serialise reputation txs — single wallet, so only one tx at a time
let _repQueue = Promise.resolve();

function submitERC8004Reputation(tokenId, wasCorrect, asset) {
  _repQueue = _repQueue
    .then(() => _doSubmitReputation(tokenId, wasCorrect, asset))
    .catch(() => {});
  return _repQueue;
}

async function _doSubmitReputation(tokenId, wasCorrect, asset) {
  const erc8004Id = resolveErc8004Id(tokenId);
  if (!erc8004Id) return;
  const signer = getReputationSigner();
  if (!signer) return;

  const contract = new ethers.Contract(REPUTATION_REGISTRY, REPUTATION_ABI, signer);
  const value = wasCorrect ? 100 : 0;

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const nonce = await signer.getNonce();
      const tx = await contract.giveFeedback(
        erc8004Id, value, 0, 'accuracy', asset || '',
        `https://api.mindclash.xyz/api/agents/${tokenId}`,
        '', ethers.ZeroHash,
        { nonce }
      );
      await tx.wait();
      console.log(`[ERC8004] Reputation for #${erc8004Id}: ${wasCorrect ? 'CORRECT' : 'WRONG'} tx=${tx.hash}`);
      return;
    } catch (err) {
      const retryable = isRateLimitError(err) || String(err.message || '').includes('nonce');
      if (!retryable || attempt === 5) {
        console.error(`[ERC8004] Reputation failed #${erc8004Id}:`, err.message);
        return;
      }
      const waitMs = Math.min(60000, 5000 * attempt);
      console.warn(`[ERC8004] Retry ${attempt}/5 for #${erc8004Id} in ${waitMs / 1000}s (${err.message})`);
      await new Promise(r => setTimeout(r, waitMs));
    }
  }
}

function isEnabled() {
  return process.env.ENABLE_ONCHAIN_SIGNING === 'true';
}

const _walletCache = {};
function getBotWallet(bot) {
  if (_walletCache[bot.tokenId]) return _walletCache[bot.tokenId];
  const pk = process.env[bot.envKey] || process.env.AGENT_PRIVATE_KEY;
  if (!pk || pk.includes('your_testnet') || pk === '0x' + '0'.repeat(64)) return null;
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  _walletCache[bot.tokenId] = new ethers.Wallet(pk, provider);
  return _walletCache[bot.tokenId];
}

const _botQueues = {};
function enqueueBot(botTokenId, fn) {
  if (!_botQueues[botTokenId]) _botQueues[botTokenId] = Promise.resolve();
  _botQueues[botTokenId] = _botQueues[botTokenId].then(fn).catch(() => {});
  return _botQueues[botTokenId];
}

function getContract(wallet) {
  return new ethers.Contract(process.env.AGENT_NFT_ADDRESS, AGENT_NFT_ABI, wallet);
}

async function getDecisionCount(contract, tokenId) {
  const recent = await contract.getRecentDecisions(tokenId, 10000);
  return recent.length;
}

async function fetchSpotPrice(asset) {
  const symbol = `${String(asset).toUpperCase()}USDT`;
  const res = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`);
  const json = await res.json();
  const price = parseFloat(json?.result?.list?.[0]?.lastPrice ?? '0');
  if (!price) throw new Error(`No price for ${asset}`);
  return price;
}

async function fetchPriceOutcome(asset, startTs, durationSec = 60) {
  const symbol = `${String(asset).toUpperCase()}USDT`;
  const startMs = (startTs - 30) * 1000;
  const endMs = (startTs + durationSec + 30) * 1000;
  const url = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=1&start=${startMs}&end=${endMs}&limit=10`;
  const res = await fetch(url);
  const json = await res.json();
  const candles = (json?.result?.list ?? []).map(c => ({
    ts: parseInt(c[0], 10) / 1000,
    close: parseFloat(c[4]),
  })).sort((a, b) => a.ts - b.ts);

  if (candles.length < 2) return null;

  let startPrice = candles[0].close;
  let endPrice = candles[candles.length - 1].close;
  for (const c of candles) {
    if (c.ts <= startTs) startPrice = c.close;
    if (c.ts >= startTs + durationSec) { endPrice = c.close; break; }
  }
  if (endPrice === startPrice) return null;
  return endPrice > startPrice ? 'UP' : 'DOWN';
}

function parseAssetFromReasoning(reasoning) {
  const text = String(reasoning || '').toUpperCase();
  for (const asset of ASSETS) {
    if (text.includes(asset)) return asset;
  }
  return 'BTC';
}

function calcPnl(wasCorrect, stake) {
  return wasCorrect ? Math.floor(stake * 0.9) : -stake;
}

async function resolveDecisionAt(contract, tokenId, decisionIndex, predDirection, winningDirection, stake) {
  if (!winningDirection) return null;
  const wasCorrect = predDirection === winningDirection;
  const pnl = calcPnl(wasCorrect, stake);
  const tx = await contract.resolveDecision(tokenId, decisionIndex, wasCorrect, pnl);
  const receipt = await tx.wait();
  return { hash: receipt.hash, wasCorrect, pnl };
}

function recordAndResolveRound(bot, predDirection, winningDirection, asset, options = {}) {
  if (!isEnabled()) return Promise.resolve(null);
  if (!winningDirection) return Promise.resolve(null);

  return enqueueBot(bot.tokenId, async () => {
    const wallet = getBotWallet(bot);
    if (!wallet) return null;

    const confidence = options.confidence ?? (700 + Math.floor(Math.random() * 200));
    const stake = options.stake ?? 250;
    const reasoning = options.reasoning ?? `Round prediction: ${predDirection} on ${asset}`;

    try {
      const contract = getContract(wallet);
      const index = await getDecisionCount(contract, bot.tokenId);

      const recordTx = await contract.recordDecision(bot.tokenId, predDirection, confidence, stake, reasoning);
      const recordReceipt = await recordTx.wait();

      const resolved = await resolveDecisionAt(contract, bot.tokenId, index, predDirection, winningDirection, stake);
      if (resolved) submitERC8004Reputation(bot.tokenId, resolved.wasCorrect, asset).catch(() => {});
      console.log(
        `[ONCHAIN] Bot #${bot.tokenId} ${predDirection} vs ${winningDirection} → ${resolved?.wasCorrect ? 'WIN' : 'LOSS'} ` +
        `record=${recordReceipt.hash} resolve=${resolved?.hash}`
      );
      return { recordHash: recordReceipt.hash, resolveHash: resolved?.hash, index, wasCorrect: resolved?.wasCorrect };
    } catch (err) {
      console.error(`[ONCHAIN] Bot #${bot.tokenId} record+resolve failed:`, err.message);
      return null;
    }
  });
}

async function recordWithDelayedResolve(bot, direction, asset, confidence, stake, reasoning) {
  if (!isEnabled()) return null;
  const wallet = getBotWallet(bot);
  if (!wallet) return null;

  try {
    const startPrice = await fetchSpotPrice(asset);
    const contract = getContract(wallet);
    const index = await getDecisionCount(contract, bot.tokenId);

    const recordTx = await contract.recordDecision(bot.tokenId, direction, confidence, stake, reasoning);
    const recordReceipt = await recordTx.wait();
    console.log(`[ONCHAIN] ${bot.name} #${bot.tokenId} recorded ${direction} ${asset} idx=${index} tx=${recordReceipt.hash}`);

    setTimeout(async () => {
      try {
        const endPrice = await fetchSpotPrice(asset);
        let winningDirection = null;
        if (endPrice > startPrice) winningDirection = 'UP';
        else if (endPrice < startPrice) winningDirection = 'DOWN';
        if (!winningDirection) {
          console.log(`[ONCHAIN] Bot #${bot.tokenId} idx=${index} flat price — skip resolve`);
          return;
        }
        const resolved = await resolveDecisionAt(contract, bot.tokenId, index, direction, winningDirection, stake);
        if (resolved) submitERC8004Reputation(bot.tokenId, resolved.wasCorrect, asset).catch(() => {});
        console.log(`[ONCHAIN] Bot #${bot.tokenId} idx=${index} delayed resolve → ${resolved?.wasCorrect ? 'WIN' : 'LOSS'} tx=${resolved?.hash}`);
      } catch (err) {
        console.error(`[ONCHAIN] Bot #${bot.tokenId} delayed resolve failed:`, err.message);
      }
    }, RESOLVE_DELAY_MS);

    return { recordHash: recordReceipt.hash, index };
  } catch (err) {
    console.error(`[ONCHAIN] ${bot.name} record failed:`, err.message);
    return null;
  }
}

async function resolvePendingBacklog(batchPerBot = 2) {
  if (!isEnabled()) return;

  for (const bot of BOTS) {
    const wallet = getBotWallet(bot);
    if (!wallet) continue;

    try {
      const contract = getContract(wallet);
      const recent = await contract.getRecentDecisions(bot.tokenId, 500);
      const fullLen = await getDecisionCount(contract, bot.tokenId);
      const baseIdx = fullLen - recent.length;
      let resolved = 0;

      for (let i = 0; i < recent.length && resolved < batchPerBot; i++) {
        const d = recent[i];
        const pnl = Number(d.pnl);
        if (d.wasCorrect || pnl !== 0) continue;

        const asset = parseAssetFromReasoning(d.reasoning);
        const ts = Number(d.timestamp);
        const winningDirection = await fetchPriceOutcome(asset, ts, 60);
        if (!winningDirection) continue;

        const index = baseIdx + i;
        const stake = Number(d.stake) || 250;
        try {
          const result = await resolveDecisionAt(contract, bot.tokenId, index, d.direction, winningDirection, stake);
          if (result) submitERC8004Reputation(bot.tokenId, result.wasCorrect, asset).catch(() => {});
          console.log(`[ONCHAIN] Backlog #${bot.tokenId} idx=${index} → ${result?.wasCorrect ? 'WIN' : 'LOSS'} tx=${result?.hash}`);
          resolved++;
          await new Promise(r => setTimeout(r, 1500));
        } catch (err) {
          if (!err.message?.includes('already resolved')) {
            console.error(`[ONCHAIN] Backlog #${bot.tokenId} idx=${index}:`, err.message);
          }
        }
      }
    } catch (err) {
      console.error(`[ONCHAIN] Backlog scan bot #${bot.tokenId}:`, err.message);
    }
  }
}

async function resolveUserAgentsBacklog(batchPerAgent = 2) {
  if (!isEnabled()) return;
  const signer = getReputationSigner();
  if (!signer) return;

  const userAgents = getUserAgentsWithErc8004.all();
  if (!userAgents.length) return;

  const contract = new ethers.Contract(process.env.AGENT_NFT_ADDRESS, AGENT_NFT_ABI, signer);

  for (const { token_id: tokenId } of userAgents) {
    try {
      const recent = await contract.getRecentDecisions(tokenId, 500);
      const fullLen = await getDecisionCount(contract, tokenId);
      const baseIdx = fullLen - recent.length;
      let resolved = 0;

      for (let i = 0; i < recent.length && resolved < batchPerAgent; i++) {
        const d = recent[i];
        const pnl = Number(d.pnl);
        if (d.wasCorrect || pnl !== 0) continue;

        const asset = parseAssetFromReasoning(d.reasoning);
        const ts = Number(d.timestamp);
        const winningDirection = await fetchPriceOutcome(asset, ts, 60);
        if (!winningDirection) continue;

        const index = baseIdx + i;
        const stake = Number(d.stake) || 250;
        try {
          const result = await resolveDecisionAt(contract, tokenId, index, d.direction, winningDirection, stake);
          if (result) submitERC8004Reputation(tokenId, result.wasCorrect, asset).catch(() => {});
          console.log(`[ONCHAIN] UserAgent #${tokenId} idx=${index} → ${result?.wasCorrect ? 'WIN' : 'LOSS'} tx=${result?.hash}`);
          resolved++;
          await new Promise(r => setTimeout(r, 1500));
        } catch (err) {
          if (!err.message?.includes('already resolved')) {
            console.error(`[ONCHAIN] UserAgent #${tokenId} idx=${index}:`, err.message);
          }
        }
      }
    } catch (err) {
      console.error(`[ONCHAIN] UserAgent scan #${tokenId}:`, err.message);
    }
  }
}

module.exports = {
  AGENT_NFT_ABI,
  BOTS,
  BOT_MAP,
  isEnabled,
  getBotWallet,
  recordAndResolveRound,
  recordWithDelayedResolve,
  resolvePendingBacklog,
  resolveUserAgentsBacklog,
};
