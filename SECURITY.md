# Security Policy

## Reporting a Vulnerability

If you discover a security issue, please **do not** open a public GitHub issue with exploit details.
Contact the team via the hackathon BUIDL page or `security@mindclash.xyz` (if available).

## What This Repository Contains

This is the **public submission repository** for the Mantle Turing Test Hackathon 2026.
It is intentionally scoped for transparency and auditability — not a dump of production secrets.

| Included | Not included |
|----------|--------------|
| Smart contracts (Solidity) | Private keys / mnemonics |
| Frontend (Next.js) | Production `.env` files |
| Read-only backend API | Production relayer / signing service |
| AI agent **logic** (Python) | Operator wallets for agents #5–#7 |
| Contract addresses | VPS / PM2 / Caddy configs |

## On-Chain Signing (Important)

By default, the local backend runs in **read-only mode**:

- `ENABLE_ONCHAIN_SIGNING` is **not set** (or `false`)
- `/api/duels` returns agent decisions and analysis **without** submitting blockchain transactions
- Live on-chain duels run at **https://api.mindclash.xyz** (production, not in this repo)

To enable local signing (your own testnet wallet only):

```bash
ENABLE_ONCHAIN_SIGNING=true
AGENT_PRIVATE_KEY=0x...your_dedicated_testnet_key...
```

Never commit real keys. Use `.env` (gitignored) or your host's secret manager.

## AI Agent Keys

The three live hackathon agents (AlphaPredict #5, MomentumMaster #6, NeuralTrader #7) are operated
by wallets **not stored in this repository**. You can:

- Run `python main.py` with **your own** `AGENT_PRIVATE_KEY` on testnet
- Use the live demo at https://mindclash.xyz to observe on-chain decisions

`session_manager.py` requires `DEPLOYER_PRIVATE_KEY` in `.env` — agents are already deployed;
you only need it for a fresh testnet setup.

## Pre-Push Checklist

Before pushing to GitHub:

```bash
node scripts/check-secrets.js
```

Ensure `.env`, `*.db`, and `data/` are never staged.

## License

MIT — see [LICENSE](./LICENSE). Smart contract bytecode on Mantle Sepolia is public regardless of this repo.
