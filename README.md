# Simple Crypto Trading Bot Chef

<div align="center">
  <img src="src/web/static/robot.webp" alt="Trading Bot Chef Logo" width="200"/>
  <p><em>AI-Powered Crypto Trading Bot with Ethereum Pectra Support</em></p>
</div>

## Overview

An AI-powered crypto trading application that evaluates different Large Language Models (LLMs) for accuracy in cryptocurrency trading signals. The application provides real-time Ethereum (ETH) market data to multiple AI models, analyzes their performance, and allows users to execute trades based on AI recommendations through an interactive dashboard.

## Live Demo

Check out the live demo at [https://stbchef.onrender.com/](https://stbchef.onrender.com/)

<div align="center">
  <img src="src/web/static/website.jpg" alt="Trading Bot Chef Dashboard" width="800"/>
</div>

## Key Features

- **AI Trading Analysis**
  - Real-time trading signals from multiple LLMs:
    - **Gemini 2.0 Flash** - Google's latest LLM
    - **Groq DeepSeek-R1-Distill-Llama-70B** - High-performance reasoning model
    - **Mistral Medium** - Advanced model for additional perspective
  - Dual accuracy tracking system:
    - Raw accuracy (simple correct/incorrect ratio)
    - Weighted performance score based on decision magnitude
  - Decision distribution analysis (Buy/Sell/Hold)

- **Real-time Market Data**
  - Live ETH price and volume tracking
  - Dynamic gas fee analysis
  - Market sentiment with Fear & Greed Index
  - Price chart with volume indicators

- **Portfolio Management**
  - Dynamic portfolio allocation recommendations
  - Balance between AI consensus and portfolio health
  - Automatic detection of severe portfolio imbalance
  - Visual allocation indicators with target range markers

- **Ethereum Pectra Integration (NEW)**
  - **Smart Account Support** - Implements EIP-7702 for temporary contract functionality
  - **Batch Transactions** - Execute multiple actions in a single transaction
  - **Gas Fee Payment in ERC-20** - Pay transaction fees with USDC instead of ETH
  - **Ethereum & Linea Support** - Seamless operation on both networks

- **Trading Capabilities (NEW)**
  - Execute trades directly from AI recommendations
  - Custom swap interface for manual trading
  - Transaction history tracking
  - Swap confirmation dialogs with price estimates

- **Robust Wallet Integration**
  - Seamless MetaMask connection with persistent session
  - Support for Ethereum and Linea networks
  - Network-specific token balances with easy switching
  - Personalized alerts on important trading signals
  - Wallet-specific performance statistics

## Technical Stack

- **Backend**: Python 3.10+, Flask, SQLite
- **Frontend**: TailwindCSS, Chart.js, Web3.js, Ethers.js
- **Architecture**: Modular JavaScript with dedicated service managers for wallet, notifications, swaps, and analytics
- **APIs**: Etherscan, Alternative.me (Fear & Greed), Google Gemini, Groq, Mistral
- **Web3**: MetaMask integration with Ethereum and Linea support, EIP-7702 implementation

## Quick Start

1. **Prerequisites** (Install these before proceeding)
   - Python 3.10+ (recommended version: 3.10.4)
   - [Poetry](https://python-poetry.org/docs/#installation) for dependency management
   - Node.js 18+ for JavaScript dependencies

2. **Setup Environment** (After prerequisites are installed)
   ```bash
   # Install Python 3.10+ if not installed
   # macOS (using Homebrew):
   brew install python@3.10
   
   # Linux (Ubuntu/Debian):
   sudo apt update
   sudo apt install python3.10 python3.10-venv python3.10-dev
   
   # Install Poetry if not installed
   curl -sSL https://install.python-poetry.org | python3 -
   
   # Clone and set up the project
   git clone https://github.com/qbandev/stbchef.git
   cd stbchef
   
   # Install Python dependencies
   poetry install
   
   # Install JavaScript dependencies
   npm install
   ```

3. **Configure API Keys**
   - Copy `.env.example` to `.env`
   - Add your API keys for:
     - Etherscan
     - Google Gemini
     - Groq
     - Mistral

4. **Launch Application**
   ```bash
   poetry run python -m src.web.app
   # Access at http://localhost:8080
   ```

## Ethereum Pectra Integration

This project implements the new Ethereum Pectra upgrade features:

### EIP-7702 Smart Accounts

The application uses the `@metamask/sdk` and `ethers` libraries to create temporary smart accounts for users' Externally Owned Accounts (EOAs), providing smart contract capabilities without permanent deployment.

```javascript
// Create a smart account
const smartAccount = await createSmartAccount(signer);

// Enable EIP-7702 features
await smartAccount.enableFeature(Feature.SessionKeys);
await smartAccount.enableFeature(Feature.BatchTransactions);
await smartAccount.enableFeature(Feature.GasTokenPayment);
```

### Batch Transactions

Group multiple operations (like token approvals and swaps) into a single transaction:

```javascript
const transactions = [
  { to: tokenAddress, data: approvalData },
  { to: swapRouterAddress, data: swapData }
];

// Execute batch transaction
const txHash = await executeBatchTransactions(signer, transactions, useGasToken);
```

### Gas Fee Payment in ERC-20

Pay transaction gas fees using USDC instead of ETH:

```javascript
// Build a Pectra transaction
const pectraTx = buildPectraTx({
  to: recipient,
  data: txData,
  value: 0
}, TokenAddresses.USDC_ETHEREUM); // Use USDC for gas

// Send the transaction
const tx = await signer.sendTransaction(pectraTx);
```

## Technical Architecture

```mermaid
graph TD
    A[User Wallet] --> B[Smart Account]
    B --> C[Portfolio Analysis]
    D[Market Data APIs] --> E[AI Trading Decisions]
    E --> F[Analysis Engine]
    F --> G[Recommendation Engine]
    B --> H[Transaction Builder]
    C --> G
    G --> H
    F --> I[Dashboard]
    C --> I
    G --> I
    H --> J[Web3 Transaction]
    K[(Database)]  -.->|Historical Data| F
    K -.->|User Settings| I
```

The architecture consists of ten core components:
- **User Wallet**: Connects to MetaMask for EOA access and network selection
- **Smart Account**: Implements EIP-7702 for enhanced wallet capabilities
- **Portfolio Analysis**: Evaluates current holdings and suggests allocation adjustments
- **Market Data APIs**: Provide real-time cryptocurrency data and sentiment indicators
- **AI Trading Decisions**: Multiple LLMs analyze market data and generate buy/sell/hold signals
- **Analysis Engine**: Compares model performance and generates accuracy metrics
- **Recommendation Engine**: Combines AI consensus with portfolio status for actionable insights
- **Transaction Builder**: Creates and executes swap transactions based on recommendations
- **Dashboard**: Interactive user interface presenting all analysis results and swap functionality
- **Database**: Stores historical model performance and user preferences

This modular design ensures separation of concerns while maintaining efficient data flow.

## Important Disclaimer

This is an **experimental project** for educational and research purposes only:
- NOT financial advice
- NOT intended for real trading
- For AI model comparison only
- Does NOT execute actual trades

## License

This project is licensed under the [MIT License](LICENSE).

---
<div align="center">
  <em>Built with ❤️ for AI and Crypto enthusiasts</em>
</div>