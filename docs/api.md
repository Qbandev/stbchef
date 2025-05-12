# API Reference

All endpoints are served by the Flask app (`src/web/app.py`). Default base URL is `http://localhost:8080` during local development and your Render URL in production.

> All responses are JSON unless otherwise noted.

---
## Trading Data

### `GET /api/trading-data`
Returns consolidated ETH price, volume, Fear & Greed index and cached AI model decisions.

**Response** (trimmed):
```jsonc
{
  "price_usd": 3125.55,
  "volume_24h": 14000000000,
  "fear_greed": 74,
  "models": {
    "gemini": { "decision": "BUY", "confidence": 0.82 },
    "groq":   { "decision": "HOLD", "confidence": 0.40 },
    "mistral":{ "decision": "SELL", "confidence": 0.61 }
  }
}
```

---
## Swap Quotes

### Linea & Local (SimpleSwap)

#### `GET /api/swaps/price`
Returns a slippage-adjusted quote fetched from the **SimpleSwap** contract that is deployed on **Linea Mainnet/Testnet** or the local Hardhat chain.  
This endpoint is **not available when the dashboard is connected to Ethereum Mainnet**—see below.

| Query Param | Type | Default | Description |
|-------------|------|---------|-------------|
| `direction` | `eth-to-usdc` \| `usdc-to-eth` | `eth-to-usdc` | Swap path |
| `amount` | number (string) | – | Amount of **from** token |

**Example**
```text
GET /api/swaps/price?direction=eth-to-usdc&amount=1
```
**Response**
```json
{
  "direction": "eth-to-usdc",
  "amount": 1,
  "quote": 1990,
  "slippage_bps": 50
}
```

Possible error responses: 400 with `{ "error": "Invalid amount" }`.

#### Ethereum Mainnet (Uniswap Widget)

When the connected network has `chainId === 1` the dashboard opens the **Uniswap Swap Widget** iframe.  
All quoting, routing and transaction submission is handled inside the widget and **no request is sent to your Flask back-end**. If you see network activity it will be calls from the iframe directly to Uniswap's API / smart-contracts, not to `/api/swaps/price`.

---
## Wallet Utilities

### `GET /api/wallet/connection`
Returns whether the user (via cookies/session) has a wallet connected.
```json
{ "is_connected": true, "wallet_address": "0x…" }
```

### `POST /api/wallet/connection`
Persist current wallet connection or mark disconnected.
```jsonc
{
  "wallet_address": "0xAbc…",   // null to disconnect
  "is_connected": true
}
```
Returns 200 OK.

---
## Storage Helpers

### `POST /clear-storage`
Used only by Playwright tests to reset `localStorage` on the hosted page. No body. Returns 204.

---
### Rate-Limit & Security Notes
All mutating POST routes inherit the Flask-Limiter default (120 req/min per IP) and standard security headers via Flask-Talisman when the optional dependencies are installed.

---
Back to [Developer Documentation](index.md) 