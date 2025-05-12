# STBChef Documentation

Welcome to the **Simple Trading Bot Chef** knowledge-base.  The project has recently been refactored to remove all Solidity contracts and Hardhat tooling; swaps are executed directly through the **KyberSwap Aggregator API**.

> **Tip — start with the Quick Start guide if you just want to run the dashboard locally.**

## Contents

| Document | Purpose |
|----------|---------|
| [getting-started.md](getting-started.md) | Installation, environment variables, running & testing. |
| [architecture.md](architecture.md) | High-level component diagram and data-flow. |
| [api.md](api.md) | List of external APIs the app calls (KyberSwap, price feeds, AI providers). |
| [contracts.md](contracts.md) | _Legacy reference._ Left here for historical context; no contracts are required anymore. |

## Current Status (May 2025)

* **Swaps**: ETH ↔ USDC on Ethereum Mainnet (chain 1) and Linea (59144) via KyberSwap.  No backend signer or on-chain deployments.
* **Backend**: Flask serves static files + tiny helper JSON endpoints (e.g. cached price, Fear & Greed).
* **Frontend**: Tailwind CSS, Ethers v5, Playwright test suite.
* **Secrets needed**: only AI model API keys — `GEMINI_API_KEY`, `GROQ_API_KEY`, `MISTRAL_API_KEY`.

---

Need something that is not covered?  Open an issue or drop a question in the discussions tab! 