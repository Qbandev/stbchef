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

1. **Prerequisites**
   - Python 3.10+ (recommended version: 3.10.4)
   - [Poetry](https://python-poetry.org/docs/#installation) for dependency management

2. **Setup Environment**
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
    A[Market Data APIs] --> B[AI Trading Decisions]
    
    B --> C[Analysis Engine]
    D[User Wallet] --> E[Portfolio Analysis]
    
    E --> F[Recommendation Engine]
    C --> F
    
    F --> G[Dashboard]
    C --> G
    E --> G
    
    H[(Database)] -.-> C
    H -.-> G
```

The architecture consists of five core components:

- **Data Collection**: APIs provide market data and sentiment indicators
- **AI Processing**: Multiple LLMs analyze market data and generate trading decisions
- **Analysis**: Models are compared and performance metrics are generated
- **User Interface**: Interactive dashboard presents the analysis results
- **Persistence**: SQLite database stores model performance and user settings

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