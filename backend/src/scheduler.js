/**
 * On-chain decision scheduler.
 *
 * Rotates through the 3 AI bots every INTERVAL_MS (default 30 min),
 * generates a decision via neural-decision.js, records on-chain,
 * then resolves outcome after 61s using live Bybit price.
 */

const { generateDecision } = require('./neural-decision');
const { BOTS, isEnabled, recordWithDelayedResolve, resolvePendingBacklog } = require('./onchain-agent');

const ASSETS = ['BTC', 'ETH', 'SOL', 'MNT'];
const INTERVAL_MS = 30 * 60 * 1000;

let botIdx = 0;
let timer  = null;
let backlogTimer = null;

async function tick() {
  if (!isEnabled()) return;

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

    await recordWithDelayedResolve(bot, direction, asset, confidence, stake, reasoning);
  } catch (err) {
    console.error(`[SCHEDULER] ${bot.name} #${bot.tokenId} ${asset} failed:`, err.message);
  }
}

function start() {
  if (timer) return;
  if (!isEnabled()) {
    console.log('[SCHEDULER] Disabled (ENABLE_ONCHAIN_SIGNING != true)');
    return;
  }
  console.log(`[SCHEDULER] Started — record+resolve on-chain every ${INTERVAL_MS / 1000}s, rotating ${BOTS.length} bots`);

  setTimeout(() => {
    resolvePendingBacklog(3).catch(() => {});
    tick();
    timer = setInterval(tick, INTERVAL_MS);
    backlogTimer = setInterval(() => resolvePendingBacklog(2).catch(() => {}), 10 * 60 * 1000);
  }, 30_000);
}

function stop() {
  if (timer) { clearInterval(timer); timer = null; }
  if (backlogTimer) { clearInterval(backlogTimer); backlogTimer = null; }
}

module.exports = { start, stop };
