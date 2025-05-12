# Getting Started

This guide walks you through cloning the repo, installing dependencies, adding AI API keys and running the dashboard locally.

---
## 1  Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Python** | 3.10+ | `brew install python@3.10` (macOS) or your distro package manager |
| **Poetry** | latest | `curl -sSL https://install.python-poetry.org | python3 -` |
| **Node.js** | 18 LTS | `nvm install 18 && nvm use 18` or <https://nodejs.org/> |
| **Make** | GNU Make 4+ | ships with Xcode-CLI or `build-essential` on Linux |

---
## 2  Clone & Install

```bash
# 1 Clone the repo
$ git clone https://github.com/qbandev/stbchef.git && cd stbchef

# 2 Install Python + Node deps
$ make setup    # poetry install  +  npm install
```

`make setup` creates a Poetry venv and installs JavaScript packages (Playwright, Tailwind CLI, etc.). No Solidity toolchain is downloaded — the project is front-end only.

---
## 3  Environment Variables

```bash
cp .env.example .env   # then edit
```
Fill the three AI model keys:

```dotenv
GEMINI_API_KEY=
GROQ_API_KEY=
MISTRAL_API_KEY=
```
Nothing else is required – RPC URLs & private keys were removed in the Kyber refactor.

---
## 4  Common Make Targets

| Target | What it does |
|--------|--------------|
| `make start` | Launch Flask dev server on <http://localhost:8080>. |
| `make test` | Run **pytest** (if any) and Playwright e2e UI tests. |
| `make clean` | Remove caches (`__pycache__`, Playwright results). |

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
| **Playwright errors** | Ensure the dev server is listening on `:8080` before running `make test`. |

Happy hacking!  For deeper details see the [Architecture](architecture.md) document. 