# Simple Crypto Trading Bot Chef

<div align="center">
  <img src="src/web/static/robot.webp" alt="Trading Bot Chef Logo" width="200"/>
  <p><em>Comparing AI Models in Crypto Trading Analysis</em></p>
</div>

## Overview

A proof-of-concept project that evaluates and compares the trading accuracy of different Large Language Models (LLMs) in cryptocurrency trading. The system provides real-time Ethereum (ETH) market data to multiple AI models and analyzes their performance through an interactive dashboard.

## Live Demo

Check out the live demo at [https://stbchef.onrender.com/](https://stbchef.onrender.com/)

<div align="center">
  <img src="src/web/static/website.jpg" alt="Trading Bot Chef Dashboard" width="800"/>
  <p><em>Trading Bot Chef Dashboard - Real-time AI Trading Analysis</em></p>
</div>

### AI Models in Action

- **Gemini 1.5 Flash** - Google's latest LLM optimized for fast, accurate trading analysis
- **Groq LLaMA-3.1-70B-Versatile** - High-performance model for comprehensive market insights
- **Mistral Large** - Advanced model providing additional trading perspectives

## Key Features

- **Real-time Monitoring**
  - Live ETH price tracking via Etherscan
  - Dynamic gas fee analysis
  - Market sentiment tracking with Fear & Greed Index

- **AI Analysis**
  - Comparative trading signals from multiple LLMs
  - Real-time performance metrics
  - Advanced accuracy tracking system:
    - Tracks last 50 trades per model
    - Calculates profitability based on 1% price movement threshold
    - Measures average profit per correct trade
    - Shows decision distribution (Buy/Sell/Hold)

- **Interactive Dashboard**
  - ETH Live price and volume charts
  - Model performance visualization
  - Gas price in real time
  - Performance metrics:
    - Total trades
    - Correct trades
    - Incorrect trades
    - Average profit
    - Decision distribution

- **MetaMask Integration**
  - Connect wallet for personalized notifications
  - Receive alerts on LLM consensus signals
  - Track performance with wallet connection

## Performance Tracking

The system implements a sophisticated accuracy tracking system:

1. **Trade Recording**
   - Records all trading decisions (BUY/SELL/HOLD)
   - Tracks price changes after each decision
   - Maintains history of last 50 trades per model

2. **Profitability Calculation**
   - BUY: Profitable if price increases by >1%
   - SELL: Profitable if price decreases by >1%
   - HOLD: Profitable if price stays within ±1%

3. **Performance Metrics**
   - Accuracy: Percentage of profitable trades
   - Average Profit: Mean price change for correct trades
   - Decision Distribution: Ratio of BUY/SELL/HOLD decisions

4. **Visual Indicators**
   - Green: ≥65% accuracy
   - Yellow: ≥45% accuracy
   - Red: <45% accuracy

## Quick Start

1. **Setup**
   ```bash
   # Clone the repository
   git clone https://github.com/yourusername/stbchef.git
   cd stbchef

   # Install dependencies
   poetry install
   ```

2. **Configuration**
   - Copy `.env.example` to `.env`
   - Add your API keys:
     ```env
     ETHERSCAN_API_KEY=your_key_here
     GEMINI_API_KEY=your_key_here
     GROQ_API_KEY=your_key_here
     MISTRAL_API_KEY=your_key_here
     ```

3. **Launch**
   ```bash
   poetry run python src/web/app.py
   ```

## Technical Stack

- **Backend**
  - Python 3.10+
  - Flask web server
  - Poetry for dependency management

- **Frontend**
  - TailwindCSS for modern styling
  - Chart.js for dynamic visualizations
  - Web3.js for MetaMask integration

- **APIs**
  - Etherscan for market data
  - Multiple LLM providers for analysis

## System Architecture

```mermaid
graph LR
    A[Market Data Collection] --> B[AI Analysis]
    B --> C[Performance Tracking]
    C --> D[Web Dashboard]
    
    subgraph Data Sources
        E[Etherscan API]
        F[Fear & Greed API]
    end
    
    subgraph AI Models
        G[Gemini]
        H[Groq]
        I[Mistral]
    end
    
    subgraph Storage
        J[SQLite DB]
    end
    
    subgraph Performance
        K[Trade History]
        L[Accuracy Tracking]
        M[Profit Calculation]
    end
    
    E --> A
    F --> A
    B --> G & H & I
    G & H & I --> C
    J --> C
    C --> J
    C --> K & L & M
    K & L & M --> D
```

## Important Disclaimer

This is an **experimental project** for educational and research purposes only:

- NOT financial advice
- NOT intended for real trading
- NO guarantee of accuracy
- Use at your own risk
- For AI model comparison only

## Requirements

- **System**
  - Python 3.10 or higher
  - Poetry package manager

- **API Keys**
  - Etherscan
  - Google Gemini
  - Groq
  - Mistral

## License

This project is licensed under the [MIT License](LICENSE).

---
<div align="center">
  <em>Built with ❤️ for AI and Crypto enthusiasts</em>
</div>