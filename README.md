# 🛡️ SafeVault: Reactive Asset Protection
**Built for the Somnia Shannon Testnet Hackathon (March 2026)**

SafeVault is a next-generation "Reactive" smart contract designed to protect user assets from market volatility. Unlike traditional vaults that require manual withdrawal, SafeVault monitors on-chain price feeds and automatically triggers defensive logic when a safety threshold is breached.

## 🚀 Live Demo & Links
- **Live Dashboard:** [Your Vercel Link Here]
- **Verified Contract:** [0x95E6b1f68aD870C13C94dbB8AEE285AfC7d19749](https://shannon-explorer.somnia.network/address/0x95E6b1f68aD870C13C94dbB8AEE285AfC7d19749#code)
- **Video Demo:** [Your Loom/YouTube Link Here]

## 🧠 How It Works (The Reactive Logic)
SafeVault utilizes Somnia’s native reactivity to perform **automated risk management**.

1. **The Subscription:** Upon deployment, the contract subscribes to specific event topics (e.g., a BTC/USD Price Feed).
2. **The Monitor:** The contract defines a `safetyThreshold` (currently set to $2,500).
3. **The Reaction:** When an on-chain event reports a price below the threshold, Somnia's execution layer triggers the `onEvent` callback in SafeVault.
4. **The Protection:** The vault immediately executes protection logic—locking deposits or moving assets—faster than any manual human intervention.

## 🛠️ Tech Stack
- **Smart Contract:** Solidity 0.8.30 (EVM Paris)
- **Framework:** Hardhat 3
- **Frontend:** Next.js 16 (App Router) + Tailwind CSS
- **Interaction:** Ethers.js v6
- **Network:** Somnia Shannon Testnet

## 🏗️ Local Setup

### 1. Smart Contract
```bash
git clone [Your-Repo-URL]
npm install
npx hardhat compile