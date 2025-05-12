# STBChef Documentation

Welcome to the **Simple Trading Bot Chef** knowledge-base. 

> **Tip — start with the Quick Start guide if you just want to run the dashboard locally.**

## Contents

| Document | Purpose |
|----------|---------|
| [getting-started.md](getting-started.md) | Installation, environment variables, running the dashboard. |
| [architecture.md](architecture.md) | High-level component diagram and data-flow. |
| [api.md](api.md) | List of external APIs the app calls (KyberSwap, price feeds, AI providers). |
| [contracts.md](contracts.md) | _Legacy reference._ Left here for historical context; no contracts are required anymore. |

## Current Status

* **Swaps**: ETH ↔ USDC on Ethereum Mainnet (chain 1) and Linea (59144) via KyberSwap.  No backend signer or on-chain deployments.
* **Backend**: Flask serves static files + tiny helper JSON endpoints (e.g. cached price, Fear & Greed).
* **Frontend**: Tailwind CSS, Ethers v5.
* **Secrets needed**: `LINEASCAN_API_KEY`, `ETHERSCAN_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `MISTRAL_API_KEY`.

---

Need something that is not covered?  Open an issue or drop a question in the discussions tab! 