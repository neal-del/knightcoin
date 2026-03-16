# KnightCoin — Menlo School Prediction Market

A prediction market platform for Menlo School where students trade on school events, sports, academics, and real-world outcomes using KnightCoin (KC).

## Features

- **Prediction Markets** — Create and trade on binary outcome markets with LMSR-like pricing
- **Off-Chain KC** — Low-friction option: every user gets 1,000 KC to start trading immediately
- **On-Chain KC (Optional)** — Connect MetaMask to trade with real ERC-20 tokens on Ethereum Sepolia testnet
- **Admin Panel** — Create/edit/resolve markets, manage users, monitor activity
- **Leaderboard** — Compete with classmates for the top spot
- **Portfolio Tracking** — View your active positions and P&L

## Tech Stack

- **Frontend:** React + Tailwind CSS + shadcn/ui
- **Backend:** Express.js + TypeScript
- **Blockchain:** Solidity (ERC-20) on Ethereum Sepolia, ethers.js
- **Build:** Vite + esbuild

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
NODE_ENV=production node dist/index.cjs
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|---|---|---|
| `SEPOLIA_RPC_URL` | For on-chain | Alchemy/Infura Sepolia RPC endpoint |
| `KC_CONTRACT_ADDRESS` | For on-chain | Deployed KnightCoin ERC-20 address |

On-chain features auto-activate when `KC_CONTRACT_ADDRESS` is set. Without it, the app runs in off-chain-only mode.

## Smart Contract

The KnightCoin ERC-20 contract is in `contracts/KnightCoin.sol`:
- 1,000,000 initial supply (18 decimals)
- Owner can mint and airdrop
- Deployed to Sepolia: `0x37C397fB96302Dbb09C091754eC51Eaf0bCB6024`

To deploy a new instance:
```bash
SEPOLIA_RPC_URL=<url> DEPLOYER_PRIVATE_KEY=<key> \
  npx hardhat run scripts/deploy.cjs --network sepolia --config hardhat.config.cjs
```

## Hosting

Recommended: [Railway](https://railway.app) or [Render](https://render.com) — $5-12/month for ~600 users.

Set the environment variables in your hosting provider's dashboard, then deploy the repo.

## License

MIT
