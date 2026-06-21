/**
 * Submit historical reputation feedback for MindClash agents to the
 * canonical ERC-8004 ReputationRegistry on Mantle Sepolia.
 *
 * Reads resolved decisions from AgentNFT, then calls giveFeedback()
 * on ReputationRegistry using the deployer wallet (which is NOT the
 * IdentityRegistry owner of these agents, so the call is allowed).
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

function parseAsset(reasoning) {
  const text = String(reasoning || "").toUpperCase();
  for (const a of ["BTC", "ETH", "SOL", "MNT"]) {
    if (text.includes(a)) return a;
  }
  return "BTC";
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  ERC-8004 Reputation — Submit Historical Feedback");
  console.log("═══════════════════════════════════════════════════════════\n");

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // Use deployer wallet (PRIVATE_KEY) — NOT the agent owner
  const deployerKey = process.env.PRIVATE_KEY;
  if (!deployerKey) {
    console.error("ERROR: PRIVATE_KEY not found in protocol/.env");
    process.exit(1);
  }

  const signer = new ethers.Wallet(deployerKey, provider);
  const signerAddr = await signer.getAddress();
  console.log(`Signer (deployer): ${signerAddr}`);

  const balance = await provider.getBalance(signerAddr);
  console.log(`MNT balance: ${ethers.formatEther(balance)} MNT\n`);

  const agentNFT = new ethers.Contract(AGENT_NFT_ADDRESS, AGENT_NFT_ABI, provider);
  const repRegistry = new ethers.Contract(REPUTATION_REGISTRY, REPUTATION_ABI, signer);

  for (const agent of AGENTS) {
    console.log(`── ${agent.name} (tokenId #${agent.tokenId}, ERC-8004 #${agent.erc8004Id}) ──`);

    // Check how many feedbacks already submitted by this signer
    let existingCount = 0;
    try {
      existingCount = Number(await repRegistry.getLastIndex(agent.erc8004Id, signerAddr));
    } catch {
      // getLastIndex returns 0 if no feedback exists
    }
    console.log(`   Existing feedback count: ${existingCount}`);

    // Read resolved decisions from AgentNFT
    const decisions = await agentNFT.getRecentDecisions(agent.tokenId, 500);
    const resolved = decisions.filter(
      (d) => d.wasCorrect || Number(d.pnl) !== 0
    );
    console.log(`   Resolved decisions on-chain: ${resolved.length}`);

    // Skip already-submitted decisions
    const toSubmit = resolved.slice(existingCount);
    if (toSubmit.length === 0) {
      console.log(`   All feedback already submitted. SKIP\n`);
      continue;
    }

    console.log(`   Submitting ${toSubmit.length} feedback entries...`);
    let submitted = 0;

    for (const d of toSubmit) {
      const asset = parseAsset(d.reasoning);
      const value = d.wasCorrect ? 100 : 0;

      try {
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
        console.log(
          `   [${submitted + 1}/${toSubmit.length}] ${d.wasCorrect ? "CORRECT" : "WRONG"} ${asset} tx=${tx.hash}`
        );
        await tx.wait();
        submitted++;
        await new Promise((r) => setTimeout(r, 1500));
      } catch (err) {
        console.error(`   FAILED: ${err.message}`);
      }
    }

    console.log(`   Submitted ${submitted} entries\n`);
  }

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Done! Check reputation on: https://8004scan.io");
  console.log("═══════════════════════════════════════════════════════════");
}

main().catch(console.error);
