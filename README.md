# Simple Crypto Trading Bot Chef

<div align="center">
  <img src="src/web/static/robot.webp" alt="Trading Bot Chef Logo" width="200"/>
  <p><em>Comparing AI Models in Crypto Trading Analysis</em></p>
</div>

## Overview

A proof-of-concept project that evaluates the trading accuracy of different Large Language Models (LLMs) in cryptocurrency trading. The system provides real-time Ethereum (ETH) market data to multiple AI models and analyzes their performance through an interactive dashboard.

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

- **Robust Wallet Integration**
  - Seamless MetaMask connection with persistent session
  - Support for Ethereum and Linea networks
  - Network-specific token balances with easy switching
  - Personalized alerts on important trading signals
  - Wallet-specific performance statistics

## Technical Stack

- **Backend**: Python 3.10+, Flask, SQLite
- **Frontend**: TailwindCSS, Chart.js, Web3.js
- **Architecture**: Modular JavaScript with dedicated service managers for wallet, notifications, and analytics
- **APIs**: Etherscan, Alternative.me (Fear & Greed), Google Gemini, Groq, Mistral
- **Web3**: MetaMask integration with Ethereum and Linea support

## Quick Start

1. **Prerequisites** (Install these before proceeding)
   - Python 3.10+ (recommended version: 3.10.4)
   - [Poetry](https://python-poetry.org/docs/#installation) for dependency management

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
   poetry install
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

## Technical Architecture

```mermaid
graph TD
    A[User Wallet] --> B[Portfolio Analysis]
    C[Market Data APIs] --> D[AI Trading Decisions]
    D --> E[Analysis Engine]
    E --> H[Recommendation Engine]
    B --> G[Dashboard]
    B --> H
    F[(Database)]  -.->|Historical Data| E
    F -.->|User Settings| G
    H --> G
    E --> G
```

The architecture consists of five core components:

- **Market Data APIs**: Provide real-time cryptocurrency data and sentiment indicators
- **AI Trading Decisions**: Multiple LLMs analyze market data and generate buy/sell/hold signals
- **Analysis Engine**: Compares model performance and generates accuracy metrics
- **User Wallet**: Connects to MetaMask for portfolio data and network selection
- **Portfolio Analysis**: Evaluates current holdings and suggests allocation adjustments
- **Recommendation Engine**: Combines AI consensus with portfolio status for actionable insights
- **Dashboard**: Interactive user interface presenting all analysis results
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