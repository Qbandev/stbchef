# Getting Started

Welcome! This guide walks you through cloning the repo, installing dependencies, setting up environment variables, and running all tests & services locally.

---
## 1  Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Python** | 3.10+ | `brew install python@3.10` (macOS) or your distro package manager |
| **Poetry** | latest | `curl -sSL https://install.python-poetry.org | python3 -` |
| **Node.js** | 18 LTS | `nvm install 18 && nvm use 18` or <https://nodejs.org/> |
| **Make** | GNU Make 4+ | comes with Xcode CLI on macOS or build-essential on Linux |

---
## 2  Clone & Install

```bash
# 1 Grab the code
$ git clone https://github.com/qbandev/stbchef.git
$ cd stbchef

# 2 Install everything with one command
$ make setup
```

`make setup` runs:
* `poetry install` – resolves Python deps into a virtual-env
* `npm install` – installs Node/Hardhat/Playwright packages

---
## 3  Environment Variables

```bash
cp .env.example .env   # then edit with your favourite editor
```
See the main README for full variable descriptions. **Never** commit real secrets.

---
## 4  Useful Make Targets

```bash
make start          # run Flask dev server on :8080
make node           # start local Hardhat chain (background)
make deploy-local   # deploy SmartAccount + SimpleSwap to 127.0.0.1:8545
make test           # hardhat ▸ pytest ▸ playwright in one go
make clean          # remove build artefacts
```

> Tip: open two terminals—one with `make node`, another with `make start`—
> then visit http://localhost:8080.

---
## 5  Running Individual Layers

### Solidity / Hardhat
```bash
npx hardhat compile
npx hardhat test
```

### Python
```bash
poetry run pytest -q
```

### Playwright (UI)
```bash
npm run test:e2e          # or make test (runs all)
```

Playwright automatically starts the Flask server via `playwright.config.js`.

---
## 6  Troubleshooting

| Symptom | Fix |
|---------|-----|
| **Node < 18 error** | `nvm install 18 && nvm use 18` |
| **Flask ImportError (Werkzeug url_quote)** | Ensure `flask==2.0.1` & `werkzeug==2.0.1` (already pinned) |
| **MetaMask "external transactions" error on local swaps** | Deploy `MockUSDC` (`make deploy-local`) and restart the dApp |

Have fun hacking! For deeper architecture & contract details, jump to the other docs pages listed on the [docs index](index.md). 