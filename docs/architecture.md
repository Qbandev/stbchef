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
  A -. (Main-net swap via iframe) .-> K[[Uniswap
    Widget]]
  K -->|Router calls| L((Uniswap
    Pools))
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
2. User action on **Swap**:
   * **Linea or Local** – front-end hits `/api/swaps/price` for a slippage-adjusted quote, then builds a Pectra transaction targeting the `SimpleSwap` contract and sends it via the connected `SmartAccount`.
   * **Ethereum Mainnet** – dashboard opens the **Uniswap Swap Widget** iframe. The widget handles quoting, routing and transaction submission directly through Uniswap routers; our back-end is bypassed.
3. For Linea: tx hash is displayed in UI and the back-end logs the swap (future work). For Ethereum the widget shows its own confirmation UI and Etherscan link.
4. Historical swaps are polled by the browser and rendered in the "Recent Transactions" table.

### Environments
* **Local** – Hardhat node (`make node`), contracts deployed via `make deploy-local`.
* **Render Preview** – Free web dyno, connects to Linea Testnet.
* **Production** – Render w/ Linea Mainnet; contracts verified and addresses configured in `smartAccount.js`.

> For deep-dive into each contract see [Smart Contracts](contracts.md). For REST details see [API Reference](api.md). 

### Swap Execution Modes

| Network | Execution Path | Gas Payment Options |
|---------|----------------|---------------------|
| **Linea** (mainnet/testnet) | Custom Pectra transaction `SmartAccount` → `SimpleSwap` | ETH or USDC (EIP-7702) |
| **Hardhat** (local) | Same as Linea | ETH (demo) |
| **Ethereum Mainnet** | Embedded **Uniswap Swap Widget** | ETH only (handled by Uniswap) |

The application automatically detects the connected chain (`window.ethersProvider.getNetwork()`) and opens the correct modal:
1. `swap-modal` → Linea / local custom swap form.
2. `swap-widget-modal` → Ethereum Mainnet Uniswap widget.

> The maintainers provide the software **as-is**. Use the swap features at your own risk; we are not responsible for smart-contract vulnerabilities, Uniswap router behaviour, or financial loss. 