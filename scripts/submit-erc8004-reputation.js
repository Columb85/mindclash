/**
 * Submit historical reputation feedback for MindClash agents to the
 * canonical ERC-8004 ReputationRegistry on Mantle Sepolia.
 *
 * Reads resolved decisions from AgentNFT, then calls giveFeedback()
 * on ReputationRegistry using the deployer wallet (which is NOT the
 * IdentityRegistry owner of these agents, so the call is allowed).
 *
 * Resumable: uses getLastIndex() to skip already-submitted feedback.
 * Retries RPC rate limits with exponential backoff — safe to re-run anytime.
 *
 * Usage:  node scripts/submit-erc8004-reputation.js
 * Env:    reads keys from protocol/.env
 */

const { ethers } = require("../protocol/node_modules/ethers");
const path = require("path");

require("../protocol/node_modules/dotenv").config({
  path: path.join(__dirname, "..", "protocol", ".env"),
});

// ── Network ──────────────────────────────────────────────────────────────
const RPC_URL = "https://rpc.sepolia.mantle.xyz";
const TX_DELAY_MS = 2500;
const MAX_RETRIES = 8;
const DECISION_LIMIT = 500;

// ── Contracts ────────────────────────────────────────────────────────────
const AGENT_NFT_ADDRESS = "0xEEc82Ecd81d889D7f1681741cfC1Fc1B7eC4B837";
const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713";

const AGENT_NFT_ABI = [
  "function getRecentDecisions(uint256 tokenId, uint256 limit) view returns (tuple(string direction, uint256 confidence, uint256 stake, uint256 timestamp, bool wasCorrect, int256 pnl, string reasoning, bytes32 decisionHash)[])",
];

const REPUTATION_ABI = [
  "function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash) external",
  "function getLastIndex(uint256 agentId, address clientAddress) view returns (uint64)",
];

// ── Agents ────────────────────────────────────────────────────────────────
const AGENTS = [
  { tokenId: 5, erc8004Id: 304, name: "AlphaPredict" },
  { tokenId: 6, erc8004Id: 305, name: "MomentumMaster" },
  { tokenId: 7, erc8004Id: 306, name: "NeuralTrader" },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRateLimitError(err) {
  const msg = String(err?.message || err?.shortMessage || err || "").toLowerCase();
  const code = err?.error?.code ?? err?.code;
  return (
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("429") ||
    code === -32016 ||
    code === 429
  );
}

function isRetryableError(err) {
  if (isRateLimitError(err)) return true;
  const msg = String(err?.message || err?.shortMessage || "").toLowerCase();
  return (
    msg.includes("timeout") ||
    msg.includes("network") ||
    msg.includes("econnreset") ||
    msg.includes("socket") ||
    msg.includes("nonce") ||
    msg.includes("replacement")
  );
}

async function withRetry(label, fn) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryableError(err) || attempt === MAX_RETRIES) throw err;
      const waitMs = Math.min(60000, 3000 * 2 ** (attempt - 1));
      console.error(
        `   [retry ${attempt}/${MAX_RETRIES}] ${label}: ${err.message || err} — waiting ${Math.round(waitMs / 1000)}s`
      );
      await sleep(waitMs);
    }
  }
  throw lastErr;
}

function parseAsset(reasoning) {
  const text = String(reasoning || "").toUpperCase();
  for (const a of ["BTC", "ETH", "SOL", "MNT"]) {
    if (text.includes(a)) return a;
  }
  return "BTC";
}

async function submitOneFeedback(repRegistry, agent, decision) {
  const asset = parseAsset(decision.reasoning);
  const value = decision.wasCorrect ? 100 : 0;

  return withRetry(`giveFeedback #${agent.erc8004Id}`, async () => {
    const tx = await repRegistry.giveFeedback(
      agent.erc8004Id,
      value,
      0,
      "accuracy",
      asset,
      `https://api.mindclash.xyz/api/agents/${agent.tokenId}`,
      "",
      ethers.ZeroHash
    );
    await withRetry("tx.wait", () => tx.wait());
    return { hash: tx.hash, asset, value, wasCorrect: decision.wasCorrect };
  });
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  ERC-8004 Reputation — Submit Historical Feedback");
  console.log("═══════════════════════════════════════════════════════════\n");

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  const deployerKey = process.env.PRIVATE_KEY;
  if (!deployerKey) {
    console.error("ERROR: PRIVATE_KEY not found in protocol/.env");
    process.exit(1);
  }

  const signer = new ethers.Wallet(deployerKey, provider);
  const signerAddr = await withRetry("getAddress", () => signer.getAddress());
  console.log(`Signer (deployer): ${signerAddr}`);

  const balance = await withRetry("getBalance", () => provider.getBalance(signerAddr));
  console.log(`MNT balance: ${ethers.formatEther(balance)} MNT\n`);

  const agentNFT = new ethers.Contract(AGENT_NFT_ADDRESS, AGENT_NFT_ABI, provider);
  const repRegistry = new ethers.Contract(REPUTATION_REGISTRY, REPUTATION_ABI, signer);

  let totalSubmitted = 0;
  let totalFailed = 0;

  for (const agent of AGENTS) {
    console.log(`── ${agent.name} (tokenId #${agent.tokenId}, ERC-8004 #${agent.erc8004Id}) ──`);

    let existingCount = 0;
    try {
      existingCount = Number(
        await withRetry("getLastIndex", () =>
          repRegistry.getLastIndex(agent.erc8004Id, signerAddr)
        )
      );
    } catch {
      existingCount = 0;
    }
    console.log(`   Existing feedback count: ${existingCount}`);

    const decisions = await withRetry("getRecentDecisions", () =>
      agentNFT.getRecentDecisions(agent.tokenId, DECISION_LIMIT)
    );
    const resolved = decisions.filter((d) => d.wasCorrect || Number(d.pnl) !== 0);
    console.log(`   Resolved decisions on-chain: ${resolved.length}`);

    const toSubmit = resolved.slice(existingCount);
    if (toSubmit.length === 0) {
      console.log(`   All feedback already submitted. SKIP\n`);
      continue;
    }

    console.log(`   Submitting ${toSubmit.length} feedback entries...`);
    let submitted = 0;
    let failed = 0;

    for (const d of toSubmit) {
      try {
        const result = await submitOneFeedback(repRegistry, agent, d);
        submitted++;
        totalSubmitted++;
        console.log(
          `   [${submitted}/${toSubmit.length}] ${result.wasCorrect ? "CORRECT" : "WRONG"} ${result.asset} tx=${result.hash}`
        );
        await sleep(TX_DELAY_MS);
      } catch (err) {
        failed++;
        totalFailed++;
        console.error(`   FAILED [${submitted + failed}/${toSubmit.length}]: ${err.message || err}`);
        if (isRateLimitError(err)) {
          console.error(`   Rate limit — pausing 60s before continuing...`);
          await sleep(60000);
        } else {
          await sleep(TX_DELAY_MS);
        }
      }
    }

    console.log(`   Submitted ${submitted} entries, failed ${failed}\n`);
  }

  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Done! Submitted: ${totalSubmitted}, failed: ${totalFailed}`);
  console.log("  Re-run anytime to resume from getLastIndex()");
  console.log("  Check reputation on: https://8004scan.io");
  console.log("═══════════════════════════════════════════════════════════");

  if (totalFailed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("\nFatal error (re-run script to resume):", err.message || err);
  process.exitCode = 1;
});
