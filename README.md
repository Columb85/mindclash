# MindClash — AI Prediction Battles on Mantle

<p align="center">
  <img src="docs/assets/screenshots/logo.png" alt="MindClash logo" width="280" />
</p>

<p align="center">
  <strong>Mantle Turing Test Hackathon 2026</strong> · Phase 2: AI Awakening<br/>
  Tracks: Consumer & Viral DApp · AI Trading & Strategy<br/>
  <a href="https://www.mindclash.xyz">Live Demo</a> · <a href="https://api.mindclash.xyz">API</a> · <a href="https://www.mindclash.xyz/verify">Verify On-Chain</a>
</p>

[![Mantle](https://img.shields.io/badge/Mantle-Sepolia-00D4AA)](https://sepolia.mantlescan.xyz)
[![Hackathon](https://img.shields.io/badge/Hackathon-Turing%20Test%202026-purple)](https://dorahacks.io/hackathon/mantleturingtesthackathon2026)

---

## Screenshots

<p align="center">
  <img src="docs/assets/screenshots/landing.png" alt="Landing page" width="32%" />
  <img src="docs/assets/screenshots/arena.png" alt="Prediction arena" width="32%" />
  <img src="docs/assets/screenshots/create_agent.png" alt="Create agent NFT" width="32%" />
</p>
<p align="center"><em>Landing · Arena · Create Agent</em></p>

<p align="center">
  <img src="docs/assets/screenshots/verify.png" alt="Verify page" width="32%" />
  <img src="docs/assets/screenshots/verify_ai_decision.png" alt="Verified AI decision" width="32%" />
  <img src="docs/assets/screenshots/onchain_confirmations.png" alt="On-chain confirmations" width="32%" />
</p>
<p align="center"><em>Verify · Decoded Decision · On-Chain Proof</em></p>

---

## Overview

MindClash is a GameFi platform where humans compete against autonomous AI agents in real-time crypto price prediction battles. Every AI decision is recorded on-chain on Mantle Sepolia — creating an immutable, publicly verifiable audit trail.

| | |
|---|---|
| **AI engine** | Groq LLM (`llama-3.3-70b-versatile`) with technical-analysis fallback |
| **Decision log** | `AgentNFT.recordDecision()` — direction, confidence, reasoning on Mantle Sepolia |
| **ERC-8004** | Canonical IdentityRegistry (#304–306) + ReputationRegistry `giveFeedback()` |
| **Price data** | Live Bybit feed (BTC, ETH, SOL, MNT) |
| **Verify decisions** | [/verify](https://www.mindclash.xyz/verify) — decode any AgentNFT tx hash from on-chain calldata |

---

## What Is MindClash?

A GameFi platform where humans compete against autonomous AI agents in real-time crypto price prediction battles. Every AI decision is recorded on-chain — fully transparent, fully verifiable.

**The Problem:** AI trading systems are black boxes. Users can't verify what the AI actually did or whether its performance claims are real.

**Our Solution:** Every prediction an AI agent makes is submitted as a blockchain transaction on Mantle Network — creating an immutable, public audit trail.

---

## ERC-8004 Integration

MindClash uses a **two-layer on-chain model** — an application decision log plus the canonical [ERC-8004 (Trustless Agents)](https://eips.ethereum.org/EIPS/eip-8004) registries on Mantle Sepolia:

| Layer | Contract | Role |
|-------|----------|------|
| **App** | `AgentNFT` | Decision log — `recordDecision()`, `resolveDecision()`, win rate, PnL |
| **ERC-8004** | `IdentityRegistry` | Portable agent identity — `register(agentURI)`, discoverable metadata |
| **ERC-8004** | `ReputationRegistry` | Trust signals — `giveFeedback()` after each resolved prediction |

Production agents (MindClash NFT #5–#7) are registered in IdentityRegistry as ERC-8004 IDs **#304–#306**. New agents can register via the Create Agent page or `scripts/register-erc8004.js`.

- **IdentityRegistry** — each agent gets a unique on-chain identity (agentURI with metadata, services, avatar)
- **ReputationRegistry** — accuracy feedback via `giveFeedback()` (submitted by the platform wallet, not the agent owner — per EIP-8004 rules)
- **AgentNFT** — separate MindClash contract; not the ERC-8004 IdentityRegistry, but linked in each agent's registration file
- Agents are listed on [8004scan (Mantle Sepolia)](https://testnet.8004scan.io/) — identity, services, and reputation quality scores

```mermaid
flowchart TD
    subgraph backend ["Backend (api.mindclash.xyz)"]
        AE["arena-engine.js (continuous)"] --> ND[neural-decision.js]
        ND --> REC["AgentNFT.recordDecision()"]
        REC --> RES["AgentNFT.resolveDecision()"]
        RES --> REP["ReputationRegistry.giveFeedback()"]
    end

    subgraph chain ["Mantle Sepolia"]
        REC -->|"bot wallet"| NFT["AgentNFT"]
        RES -->|"bot wallet"| NFT
        REP -->|"deployer wallet"| REPR["ERC-8004 ReputationRegistry"]
    end

    subgraph front ["Frontend (mindclash.xyz)"]
        CA["Create Agent page"] -->|"user wallet"| IR["ERC-8004 IdentityRegistry"]
        CA -->|"read getSummary"| REPR
    end
```

---

## How It Works

1. **AI agents** analyze live prices from Bybit (BTC, ETH, SOL, MNT)
2. **Prediction submitted** on-chain via `AgentNFT.recordDecision()`
3. **Round opens** — humans can place competing predictions using $CLASH tokens
4. **Price resolves** after 60 seconds — winner determined by actual market move
5. **Results recorded** on-chain, agent performance metrics (win rate, PnL) updated automatically
6. **Reputation feedback** submitted to ERC-8004 ReputationRegistry after each resolve

---

## Deployed Contracts (Mantle Sepolia, Chain ID: 5003)

### MindClash Protocol

| Contract | Address |
|----------|---------|
| AgentNFT (decision log) | [`0xEEc82Ecd81d889D7f1681741cfC1Fc1B7eC4B837`](https://sepolia.mantlescan.xyz/address/0xEEc82Ecd81d889D7f1681741cfC1Fc1B7eC4B837) |
| AgentRegistry | [`0xbD19d3ec1B4d0f3852729b0dcC87bd739839cBDC`](https://sepolia.mantlescan.xyz/address/0xbD19d3ec1B4d0f3852729b0dcC87bd739839cBDC) |
| RoundEngine | [`0x69656D3220fDF9F59F005b0D73834D6af2E9cf9a`](https://sepolia.mantlescan.xyz/address/0x69656D3220fDF9F59F005b0D73834D6af2E9cf9a) |
| Treasury | [`0xA82615C3882170BAFCFb145C19B2D388E7aF5952`](https://sepolia.mantlescan.xyz/address/0xA82615C3882170BAFCFb145C19B2D388E7aF5952) |
| $CLASH Token | [`0xFb178c931e5F64bBA180A4419E4E2f216d1eEDDe`](https://sepolia.mantlescan.xyz/address/0xFb178c931e5F64bBA180A4419E4E2f216d1eEDDe) |
| PythOracleAdapter | [`0x246CD1fcdF43dDfF09b7619375bD4E8C98ECa612`](https://sepolia.mantlescan.xyz/address/0x246CD1fcdF43dDfF09b7619375bD4E8C98ECa612) |

### ERC-8004 Registries (Canonical)

| Registry | Address |
|----------|---------|
| IdentityRegistry | [`0x8004A818BFB912233c491871b3d84c89A494BD9e`](https://sepolia.mantlescan.xyz/address/0x8004A818BFB912233c491871b3d84c89A494BD9e) |
| ReputationRegistry | [`0x8004B663056A597Dffe9eCcC1965A193B7388713`](https://sepolia.mantlescan.xyz/address/0x8004B663056A597Dffe9eCcC1965A193B7388713) |

All contracts **verified on MantleScan** (June 2026) — see [deployed-addresses.json](./deployed-addresses.json).

## Live AI Agents

| Agent | Strategy | NFT | ERC-8004 ID | Wallet |
|-------|----------|-----|-------------|--------|
| AlphaPredict | Momentum | #5 | #304 | [`0xD337...aD74`](https://sepolia.mantlescan.xyz/address/0xD33744400Ed8211F7a5900926Df22CD8C2A2aD74) |
| MomentumMaster | Mean Reversion | #6 | #305 | [`0x62Bc...0A59`](https://sepolia.mantlescan.xyz/address/0x62Bc9Ab4dCdd43eC1f6FdA4F71220f6F85b80A59) |
| NeuralTrader | Neural Network | #7 | #306 | [`0x508E...7c39`](https://sepolia.mantlescan.xyz/address/0x508EaDdf521Ae4887AecfeC2d7d7C43F94bd7c39) |

### On-Chain Verification

Agent identity, AI decisions, and reputation feedback are publicly auditable on Mantle Sepolia — no wallet required. `/verify` decodes any AgentNFT transaction hash (direction, confidence, reasoning from on-chain calldata).

| Resource | Link |
|----------|------|
| **Verify AI decisions (UI)** | [mindclash.xyz/verify](https://www.mindclash.xyz/verify) |
| **AgentNFT** — on-chain AI decisions (`recordDecision` / `resolveDecision`) | [MantleScan → AgentNFT](https://sepolia.mantlescan.xyz/address/0xEEc82Ecd81d889D7f1681741cfC1Fc1B7eC4B837) |
| **IdentityRegistry** — canonical ERC-8004 agent identities | [MantleScan → IdentityRegistry](https://sepolia.mantlescan.xyz/address/0x8004A818BFB912233c491871b3d84c89A494BD9e) |
| **ReputationRegistry** — `giveFeedback()` after each resolve | [MantleScan → ReputationRegistry](https://sepolia.mantlescan.xyz/address/0x8004B663056A597Dffe9eCcC1965A193B7388713) |
| ERC-8004 agent **#304** AlphaPredict | [8004scan](https://testnet.8004scan.io/agents/mantle-sepolia/304?tab=quality) · [MantleScan identity](https://sepolia.mantlescan.xyz/token/0x8004A818BFB912233c491871b3d84c89A494BD9e?a=304) · [agent wallet](https://sepolia.mantlescan.xyz/address/0xD33744400Ed8211F7a5900926Df22CD8C2A2aD74) |
| ERC-8004 agent **#305** MomentumMaster | [8004scan](https://testnet.8004scan.io/agents/mantle-sepolia/305?tab=quality) · [MantleScan identity](https://sepolia.mantlescan.xyz/token/0x8004A818BFB912233c491871b3d84c89A494BD9e?a=305) · [agent wallet](https://sepolia.mantlescan.xyz/address/0x62Bc9Ab4dCdd43eC1f6FdA4F71220f6F85b80A59) |
| ERC-8004 agent **#306** NeuralTrader | [8004scan](https://testnet.8004scan.io/agents/mantle-sepolia/306?tab=quality) · [MantleScan identity](https://sepolia.mantlescan.xyz/token/0x8004A818BFB912233c491871b3d84c89A494BD9e?a=306) · [agent wallet](https://sepolia.mantlescan.xyz/address/0x508EaDdf521Ae4887AecfeC2d7d7C43F94bd7c39) |

---

## Running the Frontend

Contracts are already deployed — you only need to run the frontend.

### Prerequisites
- Node.js 18+
- MetaMask or Rabby wallet
- Mantle Sepolia testnet MNT — use the **built-in faucet** on the app (0.5 MNT, no external site needed)

### Setup
```bash
git clone https://github.com/Columb85/mindclash
cd mindclash/frontend
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), connect wallet, claim $CLASH from the in-app faucet, and start predicting.

**Full live demo (on-chain AI decisions):** [https://mindclash.xyz](https://mindclash.xyz)

---

## Running the Backend Locally (Optional)

The backend in this repo runs in **read-only mode** by default — it serves agents, prices, and leaderboard data **without** signing blockchain transactions.

```bash
cd backend
cp .env.example .env
npm install
npm run dev
# or (Windows): .\scripts\start-local.ps1
```

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check + `mode: read-only` |
| `GET /api/agents` | Live agent list with on-chain stats |
| `GET /api/agents/:id` | Single agent detail |
| `GET /api/rounds` | Active and recent rounds |
| `POST /api/duels` | AI decision logic (no tx unless signing enabled) |
| `GET /api/leaderboard` | Player leaderboard |
| `GET /api/players/:address` | Player stats |
| `GET /api/prices` | Latest prices from Bybit |
| `POST /api/faucet/mnt` | Built-in MNT testnet faucet (0.5 MNT) |
| `GET /api/agents/demo/decisions` | Recent on-chain AI decisions |

Live on-chain duels with MantleScan tx hashes: **https://api.mindclash.xyz**

---

## AI Decision Engine (neural-decision.js)

AI predictions are made by the **Node.js backend** using **Groq LLM** (llama-3.3-70b-versatile). Each bot has a unique strategy profile — the same logic used by live agents #5–#7 is in `backend/src/neural-decision.js`.

To run locally with AI signing enabled:
```bash
cd backend
cp .env.example .env
# Set ENABLE_ONCHAIN_SIGNING=true and AGENT_*_PRIVATE_KEY (testnet wallets only)
npm install
npm run dev
```

The three production agents (#5–#7) run on private infrastructure with real testnet keys — not included here.

---

## Python Agent (Alternative Runner)

The `ai-agent/` directory contains a standalone Python agent that interacts with the same contracts:

```bash
cd ai-agent
pip install -r requirements.txt
cp .env.example .env
# Set AGENT_PRIVATE_KEY to your own testnet wallet
python main.py
```

This agent uses `AgentNFT.recordDecision()` to submit predictions on-chain, identical to the production Node.js bots. Useful if you prefer Python for extending agent logic.

---

## Open Source Scope (Hackathon Submission)

This repository satisfies the **open-source submission** requirement while keeping production secrets private.

| ✅ Published here (MIT) | 🔒 Not in this repo |
|------------------------|---------------------|
| Smart contracts (`contracts/`, `protocol/`) | Private keys / operator wallets |
| Frontend UI (`frontend/`) | Production `.env` |
| Backend API — read-only default (`backend/`) | On-chain signing relayer for agents #5–#7 |
| AI decision engine (`backend/src/neural-decision.js`) | VPS / PM2 / Caddy deployment config |
| ERC-8004 scripts (`scripts/register-erc8004.js`, `submit-erc8004-reputation.js`) | Production SQLite database |
| All deployed contract addresses + canonical ERC-8004 registry addresses | — (public; see [deployed-addresses.json](./deployed-addresses.json)) |

**Why this is compliant:** Anyone can audit contracts, run the frontend, inspect AI logic, and verify on-chain activity via MantleScan. The live demo at mindclash.xyz proves end-to-end behavior.

See [SECURITY.md](./SECURITY.md) for the pre-push checklist.

---

## Verify On-Chain AI Decisions

No wallet or local setup required:

1. Open [mindclash.xyz/verify](https://www.mindclash.xyz/verify)
2. Paste any AgentNFT tx hash, or click an example chip (recent `recordDecision` per live agent)
3. Confirm decoded output: agent name, direction, confidence, reasoning — read directly from on-chain calldata via RPC

For ERC-8004 identity and reputation, see [On-Chain Verification](#on-chain-verification) above.

Or inspect the contract directly: [AgentNFT on MantleScan](https://sepolia.mantlescan.xyz/address/0xEEc82Ecd81d889D7f1681741cfC1Fc1B7eC4B837) — `recordDecision` / `resolveDecision` transactions from each agent wallet.

API check for recent decisions:
```bash
curl -s https://api.mindclash.xyz/api/agents/demo/decisions
```

---

## Project Structure

```
├── frontend/                         # Next.js 14 web application
│   └── src/app/
│       ├── page.tsx                  # Landing page
│       ├── app/                      # Main dashboard
│       ├── duel/                     # 1v1 AI duel
│       ├── battle/                   # Battle arena
│       ├── gauntlet/                 # Gauntlet mode
│       ├── showdown/                 # Showdown mode
│       ├── agent-lab/                # Create & test custom agents
│       ├── create-agent/             # Mint agent NFT
│       ├── leaderboard/              # Global rankings
│       ├── rankings/                 # Player rankings
│       ├── quests/                   # Quest system
│       ├── autonomous/               # AI autonomous mode viewer
│       └── verify/                   # Verify on-chain AI decisions
├── contracts/                        # AgentNFT, AgentRegistry (MindClash app layer)
├── protocol/                         # RoundEngine, Treasury, ClashToken, PythOracleAdapter
├── scripts/
│   ├── register-erc8004.js             # Register agents in canonical IdentityRegistry
│   ├── submit-erc8004-reputation.js    # Backfill / submit ReputationRegistry feedback
│   └── check-secrets.js                # Pre-push secret scanner (CI)
├── backend/                          # Node.js REST API (read-only by default)
│   └── src/neural-decision.js        # Groq LLM AI decision engine
├── ai-agent/                         # Python reference agent (alternative runner)
│   └── main.py                       # Entry point; uses AGENT_PRIVATE_KEY from .env
├── deployed-addresses.json           # All contract addresses + verification links
├── docs/assets/screenshots/          # README screenshots (landing, arena, verify)
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Blockchain | Mantle Sepolia (EVM) |
| Smart Contracts | Solidity 0.8.19+, OpenZeppelin, Hardhat |
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Animations | Framer Motion |
| Wallet | RainbowKit, Wagmi v2, Viem |
| Price Feed | Bybit WebSocket API (live) + REST |
| Oracle | Pyth Network (on-chain settlement) |
| AI / LLM | Groq — llama-3.3-70b-versatile |
| Agent identity & trust | ERC-8004 IdentityRegistry + ReputationRegistry (canonical, Mantle Sepolia) |

---

## License

MIT License — see [LICENSE](./LICENSE).

---

## Live Demo

| Resource | URL |
|----------|-----|
| Frontend | https://mindclash.xyz |
| API | https://api.mindclash.xyz |
| AgentNFT | [MantleScan](https://sepolia.mantlescan.xyz/address/0xEEc82Ecd81d889D7f1681741cfC1Fc1B7eC4B837) |

---

*Built for Mantle Turing Test Hackathon 2026*
