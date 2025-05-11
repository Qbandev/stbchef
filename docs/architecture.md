# System Architecture

```mermaid
graph LR
  subgraph Browser
    A[Vue/Tailwind Dashboard] --> B[ethers.js]
    A --> C[Playwright Tests]
  end

  subgraph Flask API
    D[app.py Routes] --> E[Trading-Data Service]
    D --> F[Swap Quote Endpoint]
    E --> G[SQLite trading_data.db]
  end

  subgraph Hardhat (local) / Linea (test|mainnet)
    H[SmartAccount.sol]-- delegate --> I[SimpleSwap.sol]
    I -- uses --> J[MockUSDC.sol]
  end

  B -->|JSON/REST| D
  D -->|RPC calls via ethers| H
```

## Layers

| Layer | Tech | Purpose |
|-------|------|---------|
| **Frontend** | Plain HTML + Tailwind + vanilla JS modules | Renders dashboard, wallet UI, charts, swap modal |
| **Playwright** | Headless Chromium | End-to-end smoke tests on CI |
| **Flask back-end** | Python 3.10 + Flask | Serves dashboard, REST endpoints (`/api/trading-data`, `/api/swaps/price`, …) |
| **Database** | SQLite | Caches market data & model performance for quick page loads |
| **Smart Contracts** | Solidity 0.8.x compiled via Hardhat | `SmartAccount` (Pectra/EIP-7702), `SimpleSwap`, `MockUSDC` |

### Data Flow
1. Browser fetches `/api/trading-data` every 10 min → charts update.
2. User action on **Swap** → front-end hits `/api/swaps/price` for a slippage-adjusted quote.
3. Front-end builds Pectra transaction with `SmartAccount`, calls `SimpleSwap` on-chain; tx hash displayed in UI.
4. Back-end logs swap for analytics (future work).

### Environments
* **Local** – Hardhat node (`make node`), contracts deployed via `make deploy-local`.
* **Render Preview** – Free web dyno, connects to Linea Testnet.
* **Production** – Render w/ Linea Mainnet; contracts verified and addresses configured in `smartAccount.js`.

> For deep-dive into each contract see [Smart Contracts](contracts.md). For REST details see [API Reference](api.md). 