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

1. **Setup Environment**
   ```bash
   git clone https://github.com/yourusername/stbchef.git
   cd stbchef
   poetry install
   ```

2. **Configure API Keys**
   - Copy `.env.example` to `.env`
   - Add your API keys for Etherscan, Gemini, Groq, and Mistral

3. **Launch Application**
   ```bash
   poetry run python -m src.web.app
   # Access at http://localhost:8080
   ```

## Technical Architecture

```mermaid
graph TD
    A[Market Data APIs] --> B[Web API Layer]
    M[Fear & Greed API] --> B
    B --> C[Background Scheduler]
    C --> P[State Management]
    P --> D[Database/SQLite]
    
    C --> E1[Gemini LLM]
    C --> E2[Groq LLM]
    C --> E3[Mistral LLM]
    
    E1 --> F[Trading Decisions]
    E2 --> F
    E3 --> F
    
    F --> G[Performance Analysis]
    F --> K[Model Comparison]
    G --> K
    
    H[User Wallet] --> I[Portfolio Analysis]
    H --> J[Session Management]
    I --> L[Recommendation Engine]
    F --> L
    
    L --> N[User Dashboard]
    K --> N
    J --> N
    
    D -.-> |Data Retrieval| N
    D -.-> |Historical Data| K
```

The architecture follows a modular design with distinct components:

- **Data Sources**: External APIs provide market data and sentiment indicators
- **Core Processing**: Background scheduler manages the data flow and model interactions
- **AI Layer**: Multiple LLM models analyze market data independently
- **Analysis Engine**: Compares model performance and generates recommendations
- **Persistence**: SQLite database stores historical data and user interactions
- **User Interface**: Interactive dashboard with real-time updates and wallet integration

This design ensures separation of concerns while maintaining data flow through the system.

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