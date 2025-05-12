# Architecture

```mermaid
graph TD
    subgraph Browser
        A[Dashboard (HTML + Tailwind)] --> B[Ethers.js]
        A --> C[Wallet UI]
    end

    subgraph Flask Server
        D[/Static Flask Routes/] --> E[Trading-Data Cache]
    end

    subgraph External Services
        F[KyberSwap Aggregator API] --> G[Ethereum / Linea RPC]
        H[Price & Sentiment APIs]
        I[Gemini \| Groq \| Mistral]
    end

    B -->|HTTP fetch| F
    B -->|REST / JSON| D
    D -->|Cron jobs| H
    D -->|AI requests| I
```

## Components

| Component | Tech | Responsibility |
|-----------|------|----------------|
| **Dashboard** | Vanilla JS modules | Renders charts, wallet balances, swap modal. |
| **Ethers.js** | v5 Web3 lib | Reads connected network, builds & submits Kyber swap TX. |
| **Flask server** | Python 3.10 | Serves files, caches market data every 5 min. No swap endpoints. |
| **KyberSwap API** | `https://aggregator-api.kyberswap.com` | Provides encoded calldata & router for each swap. |
| **AI Providers** | Gemini 2 Flash, Groq DeepSeek-R1, Mistral Medium | Produce buy/sell/hold signals shown in the UI. |

## Swap Flow  (ETH → USDC)
1. User enters amount and confirms.
2. Front-end calls Kyber `/route/encode` with `tokenIn`, `tokenOut`, amount, slippage.
3. Response contains `routerAddress`, `encodedSwapData`, `transactionValue`.
4. If the **from** token is ERC-20 the UI first sends an `approve` TX. (Native ETH skips this.)
5. UI sends `encodedSwapData` to `routerAddress` with `value=transactionValue`.
6. After `tx.wait()` the dashboard refreshes balances.

_No Solidity contracts are deployed or required._

## Data Refresh
* Price & volume → Alternative.me + CoinGecko every 60 s.
* Fear & Greed index every 10 min.
* AI model calls every 10 min per model.
* All cached in SQLite and exposed via `/api/trading-data`.

## Environments
* **Local Dev** – `make start` (Flask) + MetaMask on any supported chain.
* **Render Preview & Production** – same container; only API keys differ.

---
Legacy Hardhat diagrams & contract docs were removed in May 2025 when the project switched fully to KyberSwap. 