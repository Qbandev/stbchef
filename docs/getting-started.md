# Getting Started

This guide walks you through cloning the repo, installing dependencies, adding API keys and running the dashboard locally.

---
## 1  Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Python** | 3.10+ | `brew install python@3.10` (macOS) or your distro package manager |
| **Poetry** | latest | `curl -sSL https://install.python-poetry.org | python3 -` |
| **Make** | GNU Make 4+ | ships with Xcode-CLI or `build-essential` on Linux |

---
## 2  Clone & Install

```bash
# 1 Clone the repo
$ git clone https://github.com/qbandev/stbchef.git && cd stbchef

# 2 Install Python deps
$ make setup    # installs Python dependencies via Poetry
```

---
## 3  Environment Variables

```bash
cp .env.example .env   # then edit
```
Fill the three AI model keys:

```dotenv
LINEASCAN_API_KEY=
ETHERSCAN_API_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=
MISTRAL_API_KEY=
```

---
## 4  Common Make Targets

| Target | What it does |
|--------|--------------|
| `make setup` | Install Python dependencies |
| `make start` | Launch Flask dev server on <http://localhost:8080>. |

---
## 5  Manual Steps

1. Open <http://localhost:8080> in Chrome/Brave.
2. Connect MetaMask (Ethereum Mainnet or Linea Mainnet).
3. Click **New Swap** → execute an ETH ↔ USDC swap.

Swaps are executed entirely in the browser through KyberSwap's Aggregator API; the Flask back-end is never involved in quoting or transaction building.

---
## 6  Troubleshooting

| Symptom | Fix |
|---------|-----|
| **Button stays disabled** | Check the console logs from `moduleLoader.js` – you must be on Mainnet or Linea with MetaMask connected. |
| **Route not found (Kyber 4008)** | Increase the swap amount – Kyber rejects extremely small trades (< 0.003 ETH / 3 USDC on main-net). |

Happy hacking!  For deeper details see the [Architecture](architecture.md) document.