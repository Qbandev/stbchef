# Simple Crypto Trading Bot Chef

## Overview
A web dashboard that compares multiple AI models (Gemini 2 Flash, Groq DeepSeek-R1, Mistral Medium) for crypto-trading accuracy and lets you execute ETH ↔ USDC swaps directly from the browser via KyberSwap.

**Live demo** <https://stbchef.onrender.com/>

<div align="center"><img src="src/web/static/website.jpg" width="800"></div>

## Key Features

### 1 · AI Trading Analysis
• Real-time buy / sell / hold signals from three LLMs.  
• Raw accuracy + weighted performance score.  
• History & 24-h activity heat-maps.

### 2 · Portfolio & Market Data
• Live ETH price / volume, gas fees, Fear-&-Greed index.  
• Automatic imbalance detection and swap suggestions.

### 3 · One-click Swaps (Kyber)
• Supports Ethereum main-net (chain 1) and Linea (59144).  
• ETH ↔ USDC with slippage control, route auto-selection.  
• Gas estimation & pre-flight balance checks.

### 4 · Wallet Integration
• MetaMask connection with persistent session.  
• Network badge & balance refresh.  
• Browser notifications for important signals.

## Tech Stack
Front-end only:
* **Flask** back-end for static serving & small helper APIs.
* **Tailwind CSS** UI + **Chart.js** charts.
* **Ethers v5** & **Web3.js** for wallet / RPC access.
* **KyberSwap Aggregator API** for on-chain execution (no Solidity).

## Quick Start
   ```bash
# 1.  Install deps
make setup        # install Python deps via Poetry

# 2.  Add API keys
cp .env.example .env
#   └── fill GEMINI_API_KEY / GROQ_API_KEY / MISTRAL_API_KEY

# 3.  Launch dev server
make start        # http://localhost:8080
   ```

## Environment Variables (.env)
```dotenv
# API Keys (NO QUOTES AROUND VALUES)
LINEASCAN_API_KEY=
ETHERSCAN_API_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=
MISTRAL_API_KEY=
```
These are the only secrets required – no RPC URLs or private keys.

## Documentation
See the detailed project docs in the `docs/` folder:
* [Getting Started](docs/getting-started.md) – installation steps & usage.
* [Architecture](docs/architecture.md) – component diagram & data-flow.
* [API Reference](docs/api.md) – public JSON endpoints.
* [Documentation Index](docs/index.md) – overall table of contents.

## License

This project is licensed under the [PolyForm Strict License 1.0.0](LICENSE).

---
<div align="center">
  <em>Built with ❤️ for AI and Crypto enthusiasts</em>
</div>
