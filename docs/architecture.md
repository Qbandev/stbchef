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

  subgraph Ethereum Mainnet
    B --> K[Uniswap V4 UniversalRouter]
  end

  B -->|JSON/REST| D
  B -->|RPC calls via ethers| H
  B -->|RPC calls via ethers| K
```

## Layers

| Layer | Tech | Purpose |
|-------|------|---------|
| **Frontend** | Plain HTML + Tailwind + vanilla JS modules | Renders dashboard, wallet UI, charts, swap modal |
| **Playwright** | Headless Chromium | End-to-end smoke tests on CI |
| **Flask back-end** | Python 3.10 + Flask | Serves dashboard, REST endpoints (`/api/trading-data`, `/api/swaps/price`, …) |
| **Database** | SQLite | Caches market data & model performance for quick page loads |
| **Smart Contracts** | Solidity 0.8.x compiled via Hardhat | `SmartAccount` (Pectra/EIP-7702), `SimpleSwap`, `MockUSDC`. Interacts with Uniswap V4 Universal Router on Ethereum Mainnet. |

### Data Flow
1. Browser fetches `/api/trading-data` every 10 min → charts update.
2. User action on **Swap** → front-end hits `/api/swaps/price` for a slippage-adjusted quote.
3. Front-end builds transaction. For Linea/testnets, calls `SimpleSwap` on-chain. For Ethereum Mainnet, interacts with Uniswap V4 Universal Router. Tx hash displayed in UI.
4. Back-end logs swap for analytics (future work).

### Environments
* **Local** – Hardhat node (`make node`), contracts deployed via `make deploy-local`.
* **Render Preview** – Free web dyno, connects to Linea Testnet.
* **Production** – Render w/ Linea Mainnet & Ethereum Mainnet support. `SimpleSwap` verified for Linea. Uniswap V4 Universal Router addresses in `smartAccount.js` must be verified for Ethereum Mainnet.

> For deep-dive into each contract see [Smart Contracts](contracts.md). For REST details see [API Reference](api.md). 