# MindClash — AI Prediction Battles on Mantle

> **Mantle Turing Test Hackathon 2026** | Track: AI Awakening (Phase 2)

[![Mantle](https://img.shields.io/badge/Mantle-Sepolia-00D4AA)](https://sepolia.mantlescan.xyz)
[![Hackathon](https://img.shields.io/badge/Hackathon-Turing%20Test%202026-purple)](https://dorahacks.io/hackathon/mantleturingtesthackathon2026)

---

## What Is MindClash?

A GameFi platform where humans compete against autonomous AI agents in real-time crypto price prediction battles. Every AI decision is recorded on-chain — fully transparent, fully verifiable.

**The Problem:** AI trading systems are black boxes. Users can't verify what the AI actually did or whether its performance claims are real.

**Our Solution:** Every prediction an AI agent makes is submitted as a blockchain transaction on Mantle Network — creating an immutable, public audit trail.

---

## Key Innovation: ERC-8004

The first implementation of the **ERC-8004** standard — on-chain identity for AI agents:

- Each AI agent has a unique NFT with embedded performance history
- Win rate, total predictions, PnL tracked on-chain
- Verifiable reputation that can't be faked
- Transferable agent ownership

---

## How It Works

1. **AI agents** analyze live prices from Bybit (BTC, ETH, SOL, MNT)
2. **Prediction submitted** on-chain via `AgentRegistry.recordDecision()`
3. **Round opens** — humans can place competing predictions using $CLASH tokens
4. **Price resolves** after 60 seconds — winner determined by actual market move
5. **Results recorded** on-chain, performance metrics updated, PTS distributed

---

## Deployed Contracts (Mantle Sepolia, Chain ID: 5003)

| Contract | Address |
|----------|---------|
| AgentNFT (ERC-8004) | [`0xEEc82Ecd81d889D7f1681741cfC1Fc1B7eC4B837`](https://sepolia.mantlescan.xyz/address/0xEEc82Ecd81d889D7f1681741cfC1Fc1B7eC4B837) |
| AgentRegistry | [`0xbD19d3ec1B4d0f3852729b0dcC87bd739839cBDC`](https://sepolia.mantlescan.xyz/address/0xbD19d3ec1B4d0f3852729b0dcC87bd739839cBDC) |
| RoundEngine | [`0x69656D3220fDF9F59F005b0D73834D6af2E9cf9a`](https://sepolia.mantlescan.xyz/address/0x69656D3220fDF9F59F005b0D73834D6af2E9cf9a) |
| Treasury | [`0xA82615C3882170BAFCFb145C19B2D388E7aF5952`](https://sepolia.mantlescan.xyz/address/0xA82615C3882170BAFCFb145C19B2D388E7aF5952) |
| $CLASH Token | [`0xFb178c931e5F64bBA180A4419E4E2f216d1eEDDe`](https://sepolia.mantlescan.xyz/address/0xFb178c931e5F64bBA180A4419E4E2f216d1eEDDe) |
| PythOracleAdapter | [`0x246CD1fcdF43dDfF09b7619375bD4E8C98ECa612`](https://sepolia.mantlescan.xyz/address/0x246CD1fcdF43dDfF09b7619375bD4E8C98ECa612) |

## Live AI Agents

| Agent | Strategy | NFT | Wallet |
|-------|----------|-----|--------|
| AlphaPredict | Momentum | #5 | [`0xD337...aD74`](https://sepolia.mantlescan.xyz/address/0xD33744400Ed8211F7a5900926Df22CD8C2A2aD74) |
| MomentumMaster | Mean Reversion | #6 | [`0x62Bc...0A59`](https://sepolia.mantlescan.xyz/address/0x62Bc9Ab4dCdd43eC1f6FdA4F71220f6F85b80A59) |
| NeuralTrader | Neural Network | #7 | [`0x508E...7c39`](https://sepolia.mantlescan.xyz/address/0x508EaDdf521Ae4887AecfeC2d7d7C43F94bd7c39) |

---

## Running the Frontend

Contracts are already deployed — you only need to run the frontend.

### Prerequisites
- Node.js 18+
- MetaMask or Rabby wallet
- Mantle Sepolia testnet MNT → [faucet.sepolia.mantle.xyz](https://faucet.sepolia.mantle.xyz)

### Setup
```bash
git clone https://github.com/your-org/mindclash
cd mindclash/frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), connect wallet, claim $CLASH from the in-app faucet, and start predicting.

---

## Project Structure (Public)

```
├── frontend/            # Next.js 14 web application
│   └── src/
│       ├── app/         # Pages & API routes
│       ├── components/  # UI components
│       ├── contexts/    # State (Rooms, Player, Clash)
│       ├── hooks/       # Contract interaction hooks
│       └── lib/         # Web3 config, utilities
│
├── contracts/           # Core ERC-8004 contracts (Solidity)
│   ├── AgentNFT.sol
│   └── AgentRegistry.sol
│
└── protocol/            # Protocol contracts (RoundEngine, Treasury, etc.)
```

> Backend API and AI agent source are hosted on a private server.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Blockchain | Mantle Sepolia (EVM) |
| Smart Contracts | Solidity 0.8.19+, OpenZeppelin, Hardhat |
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Animations | Framer Motion |
| Wallet | RainbowKit, Wagmi v1, Viem |
| Price Feed | Bybit WebSocket API |
| Oracle | Pyth Network |

---

## License

This code is **source available, not open source**.  
Commercial use, redeployment, and derivative works are prohibited without explicit permission.  
See [LICENSE](./LICENSE) for full terms.

---

*Built for Mantle Turing Test Hackathon 2026*
