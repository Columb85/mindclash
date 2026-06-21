/**
 * Register MindClash AI agents in the canonical ERC-8004 IdentityRegistry
 * on Mantle Sepolia. Each agent wallet calls register(agentURI) to mint
 * an identity NFT in the global registry at 0x8004A818...
 *
 * Usage:  node scripts/register-erc8004.js
 * Env:    reads keys from protocol/.env
 */

const { ethers } = require("../protocol/node_modules/ethers");
const path = require("path");

// ── Load .env from protocol/ ────────────────────────────────────────────────
require("../protocol/node_modules/dotenv").config({ path: path.join(__dirname, "..", "protocol", ".env") });

// ── Mantle Sepolia RPC ──────────────────────────────────────────────────────
const RPC_URL = "https://rpc.sepolia.mantle.xyz";
const CHAIN_ID = 5003;

// ── Official ERC-8004 IdentityRegistry on Mantle Sepolia ────────────────────
const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";

// ── MindClash AgentNFT (our app-level contract) ─────────────────────────────
const AGENT_NFT_ADDRESS = "0xEEc82Ecd81d889D7f1681741cfC1Fc1B7eC4B837";

// ── Minimal ABI for IdentityRegistry.register() ─────────────────────────────
const IDENTITY_ABI = [
  "function register(string agentURI) external returns (uint256)",
  "function setAgentURI(uint256 agentId, string newURI) external",
  "function tokenURI(uint256 agentId) external view returns (string)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function balanceOf(address owner) external view returns (uint256)",
  "event Registered(uint256 indexed agentId, string agentURI, address indexed owner)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

// ── Agent definitions ───────────────────────────────────────────────────────
const AGENTS = [
  {
    name: "AlphaPredict",
    envKey: "AGENT_1_PRIVATE_KEY",
    wallet: "0xD33744400Ed8211F7a5900926Df22CD8C2A2aD74",
    mindclashTokenId: 5,
    erc8004Id: 304,
    strategy: "Momentum",
    description:
      "MindClash autonomous AI trading agent. Momentum strategy — follows trend strength using RSI and SMA indicators. Every decision recorded on-chain via AgentNFT.recordDecision() on Mantle Sepolia.",
  },
  {
    name: "MomentumMaster",
    envKey: "AGENT_2_PRIVATE_KEY",
    wallet: "0x62Bc9Ab4dCdd43eC1f6FdA4F71220f6F85b80A59",
    mindclashTokenId: 6,
    erc8004Id: 305,
    strategy: "Mean Reversion",
    description:
      "MindClash autonomous AI trading agent. Mean Reversion strategy — fades extremes using Bollinger Bands. Every decision recorded on-chain via AgentNFT.recordDecision() on Mantle Sepolia.",
  },
  {
    name: "NeuralTrader",
    envKey: "AGENT_3_PRIVATE_KEY",
    wallet: "0x508EaDdf521Ae4887AecfeC2d7d7C43F94bd7c39",
    mindclashTokenId: 7,
    erc8004Id: 306,
    strategy: "Neural Network",
    description:
      "MindClash autonomous AI trading agent. Neural Network strategy — weighted ensemble of technical signals. Every decision recorded on-chain via AgentNFT.recordDecision() on Mantle Sepolia.",
  },
];

function generateAgentAvatar(name) {
  const initials = name.slice(0, 2).toUpperCase();
  const hue = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">',
    `<rect width="256" height="256" rx="32" fill="hsl(${hue},70%,12%)"/>`,
    `<circle cx="128" cy="128" r="80" fill="hsl(${hue},80%,50%)" opacity="0.15"/>`,
    `<text x="128" y="145" text-anchor="middle" font-size="80" font-family="monospace" font-weight="bold" fill="hsl(${hue},80%,60%)">${initials}</text>`,
    "</svg>",
  ].join("");
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function buildRegistrationFile(agent, erc8004AgentId) {
  return {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: agent.name,
    description: agent.description,
    image: generateAgentAvatar(agent.name),
    services: [
      {
        name: "web",
        endpoint: "https://mindclash.xyz",
      },
      {
        name: "web",
        endpoint: "https://mindclash.xyz/verify",
      },
      {
        name: "MindClash-AgentNFT",
        endpoint: `https://sepolia.mantlescan.xyz/address/${AGENT_NFT_ADDRESS}`,
      },
      {
        name: "MindClash-API",
        endpoint: `https://api.mindclash.xyz/api/agents/${agent.mindclashTokenId}`,
      },
    ],
    active: true,
    registrations: [
      {
        agentId: erc8004AgentId,
        agentRegistry: `eip155:${CHAIN_ID}:${IDENTITY_REGISTRY}`,
      },
    ],
    supportedTrust: ["reputation"],
  };
}

function toDataURI(jsonObj) {
  const jsonStr = JSON.stringify(jsonObj);
  const base64 = Buffer.from(jsonStr).toString("base64");
  return `data:application/json;base64,${base64}`;
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  ERC-8004 Agent Registration — MindClash × Mantle Sepolia");
  console.log("═══════════════════════════════════════════════════════════\n");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const network = await provider.getNetwork();
  console.log(`Network: ${network.name} (chainId ${network.chainId})\n`);

  const registry = new ethers.Contract(IDENTITY_REGISTRY, IDENTITY_ABI, provider);

  for (const agent of AGENTS) {
    console.log(`── ${agent.name} (MindClash #${agent.mindclashTokenId}) ──`);

    const privateKey = process.env[agent.envKey];
    if (!privateKey) {
      console.log(`   SKIP: ${agent.envKey} not found in .env\n`);
      continue;
    }

    const signer = new ethers.Wallet(privateKey, provider);
    const addr = await signer.getAddress();
    console.log(`   Wallet:  ${addr}`);

    if (addr.toLowerCase() !== agent.wallet.toLowerCase()) {
      console.log(`   WARNING: expected ${agent.wallet}, got ${addr}`);
    }

    // Check if already registered (has identity NFT)
    const balance = await registry.balanceOf(addr);
    if (balance > 0n && agent.erc8004Id) {
      console.log(`   Already registered (agentId #${agent.erc8004Id})`);
      const currentURI = await registry.tokenURI(agent.erc8004Id);
      const updatedRegFile = buildRegistrationFile(agent, agent.erc8004Id);
      const updatedURI = toDataURI(updatedRegFile);
      if (currentURI === updatedURI) {
        console.log(`   URI up-to-date. SKIP\n`);
      } else {
        console.log(`   Updating agentURI with new avatar...`);
        const registryWithSigner = registry.connect(signer);
        const updateTx = await registryWithSigner.setAgentURI(agent.erc8004Id, updatedURI);
        console.log(`   TX: ${updateTx.hash}`);
        await updateTx.wait();
        console.log(`   URI updated! MantleScan: https://sepolia.mantlescan.xyz/tx/${updateTx.hash}\n`);
      }
      continue;
    }

    // Check MNT balance for gas
    const mntBalance = await provider.getBalance(addr);
    console.log(`   MNT:     ${ethers.formatEther(mntBalance)} MNT`);
    if (mntBalance < ethers.parseEther("0.01")) {
      console.log(`   SKIP: insufficient MNT for gas\n`);
      continue;
    }

    // Build a placeholder registration file (agentId unknown until minted)
    // We'll use agentId=0 initially, then update via setAgentURI after mint
    const regFile = buildRegistrationFile(agent, 0);
    const agentURI = toDataURI(regFile);
    console.log(`   URI len: ${agentURI.length} chars`);

    // Register in IdentityRegistry
    console.log(`   Calling register() on ${IDENTITY_REGISTRY}...`);
    const registryWithSigner = registry.connect(signer);

    try {
      const tx = await registryWithSigner.register(agentURI);
      console.log(`   TX sent: ${tx.hash}`);
      console.log(`   Waiting for confirmation...`);

      const receipt = await tx.wait();
      console.log(`   Confirmed in block ${receipt.blockNumber}`);

      // Parse Registered event to get agentId
      const registeredEvent = receipt.logs.find((log) => {
        try {
          const parsed = registry.interface.parseLog(log);
          return parsed && parsed.name === "Registered";
        } catch {
          return false;
        }
      });

      let agentId = null;
      if (registeredEvent) {
        const parsed = registry.interface.parseLog(registeredEvent);
        agentId = parsed.args[0];
        console.log(`   ERC-8004 agentId: ${agentId}`);
      }

      // Update agentURI with the real agentId
      if (agentId !== null) {
        const updatedRegFile = buildRegistrationFile(agent, Number(agentId));
        const updatedURI = toDataURI(updatedRegFile);

        console.log(`   Updating agentURI with correct agentId...`);
        const updateTx = await registryWithSigner.setAgentURI(agentId, updatedURI);
        console.log(`   TX sent: ${updateTx.hash}`);
        await updateTx.wait();
        console.log(`   URI updated!`);
      }

      console.log(
        `   MantleScan: https://sepolia.mantlescan.xyz/tx/${tx.hash}`
      );
      console.log(`   SUCCESS\n`);
    } catch (err) {
      console.log(`   ERROR: ${err.message}\n`);
    }
  }

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Done! Check agents on: https://8004scan.io");
  console.log("═══════════════════════════════════════════════════════════");
}

main().catch(console.error);
