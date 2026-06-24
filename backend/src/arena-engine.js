/**
 * Server-side Arena Engine — autonomous bot rounds, no browser needed.
 *
 * Two concurrent loops:
 *   fast  — 60s rounds, rotates assets (BTC→ETH→SOL→MNT), ~75s cycle
 *   slow  — 180/300s rounds, runs in parallel so short rounds aren't blocked
 *
 * This keeps on-chain activity continuous with no multi-minute gaps.
 */

const { generateDecision } = require('./neural-decision');
const {
  BOTS, isEnabled, recordAndResolveRound,
  resolvePendingBacklog, resolveUserAgentsBacklog,
} = require('./onchain-agent');

const FAST_TRACKS = [
  { asset: 'BTC', duration: 60 },
  { asset: 'ETH', duration: 60 },
  { asset: 'SOL', duration: 60 },
  { asset: 'MNT', duration: 60 },
];

const SLOW_TRACKS = [
  { asset: 'BTC', duration: 180 },
  { asset: 'ETH', duration: 300 },
  { asset: 'SOL', duration: 180 },
  { asset: 'MNT', duration: 180 },
];

const PAUSE_BETWEEN_ROUNDS_SEC = 15;
const PAUSE_BETWEEN_BOTS_MS = 4000;
const STARTUP_DELAY_MS = 30_000;
const BACKLOG_INTERVAL_MS = 10 * 60 * 1000;

let running = false;
let backlogTimer = null;

async function fetchSpotPrice(asset) {
  const symbol = `${String(asset).toUpperCase()}USDT`;
  const res = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`);
  const json = await res.json();
  const price = parseFloat(json?.result?.list?.[0]?.lastPrice ?? '0');
  if (!price) throw new Error(`No price for ${asset}`);
  return price;
}

async function runRound(asset, duration) {
  const startPrice = await fetchSpotPrice(asset);

  const botsDecisions = [];
  for (const bot of BOTS) {
    try {
      const ai = await generateDecision({
        agentTokenId: bot.tokenId,
        asset,
        duration,
        strategy: bot.strategy,
      });
      botsDecisions.push({ bot, direction: ai.direction, confidence: ai.confidence, reasoning: ai.reasoning });
    } catch (err) {
      console.error(`[ARENA] Decision failed ${bot.name} ${asset}:`, err.message);
    }
  }

  if (botsDecisions.length === 0) return;

  console.log(`[ARENA] Round ${asset} ${duration}s: start=$${startPrice.toFixed(2)}, ${botsDecisions.length} bots, waiting ${duration}s...`);

  await new Promise(r => setTimeout(r, duration * 1000));

  let endPrice;
  try {
    endPrice = await fetchSpotPrice(asset);
  } catch {
    console.error(`[ARENA] End price fetch failed for ${asset} — skipping resolve`);
    return;
  }

  if (endPrice === startPrice) {
    console.log(`[ARENA] Round ${asset}: flat price — skipping`);
    return;
  }

  const winningDirection = endPrice > startPrice ? 'UP' : 'DOWN';
  console.log(`[ARENA] Round ${asset} ${duration}s: end=$${endPrice.toFixed(2)} → ${winningDirection}`);

  for (const { bot, direction, confidence, reasoning } of botsDecisions) {
    try {
      await recordAndResolveRound(bot, direction, winningDirection, asset, {
        confidence, stake: 250, reasoning,
      });
    } catch (err) {
      console.error(`[ARENA] On-chain failed ${bot.name}:`, err.message);
    }
    await new Promise(r => setTimeout(r, PAUSE_BETWEEN_BOTS_MS));
  }
}

async function fastLoop() {
  let idx = 0;
  while (running) {
    if (!isEnabled()) {
      await new Promise(r => setTimeout(r, 60_000));
      continue;
    }
    const track = FAST_TRACKS[idx % FAST_TRACKS.length];
    idx++;
    try {
      await runRound(track.asset, track.duration);
    } catch (err) {
      console.error(`[ARENA-FAST] Round error ${track.asset}:`, err.message);
    }
    if (running) await new Promise(r => setTimeout(r, PAUSE_BETWEEN_ROUNDS_SEC * 1000));
  }
}

async function slowLoop() {
  let idx = 0;
  // stagger start so slow loop doesn't fire at the same instant as fast
  await new Promise(r => setTimeout(r, 10_000));
  while (running) {
    if (!isEnabled()) {
      await new Promise(r => setTimeout(r, 60_000));
      continue;
    }
    const track = SLOW_TRACKS[idx % SLOW_TRACKS.length];
    idx++;
    try {
      await runRound(track.asset, track.duration);
    } catch (err) {
      console.error(`[ARENA-SLOW] Round error ${track.asset} ${track.duration}s:`, err.message);
    }
    if (running) await new Promise(r => setTimeout(r, PAUSE_BETWEEN_ROUNDS_SEC * 1000));
  }
}

function start() {
  if (running) return;
  if (!isEnabled()) {
    console.log('[ARENA] Disabled (ENABLE_ONCHAIN_SIGNING != true)');
    return;
  }

  running = true;
  console.log(`[ARENA] Starting — fast loop (${FAST_TRACKS.length}x60s) + slow loop (${SLOW_TRACKS.length}x180-300s), ${BOTS.length} bots`);

  setTimeout(() => {
    resolvePendingBacklog(3).catch(() => {});
    fastLoop();
    slowLoop();

    backlogTimer = setInterval(() => {
      resolvePendingBacklog(2).catch(() => {});
      resolveUserAgentsBacklog(2).catch(() => {});
    }, BACKLOG_INTERVAL_MS);
  }, STARTUP_DELAY_MS);
}

function stop() {
  running = false;
  if (backlogTimer) { clearInterval(backlogTimer); backlogTimer = null; }
}

module.exports = { start, stop };
