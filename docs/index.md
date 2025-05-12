# Developer Documentation

Welcome to the extended documentation for **Simple Crypto Trading Bot Chef**.
This site is published automatically via GitHub Pages on every push to `main`.

| Section | Description |
|---------|-------------|
| [Getting Started](getting-started.md) | Local setup, environment variables & first run |
| [Architecture](architecture.md) | High-level system diagram and data-flow |
| [Smart Contracts](contracts.md) | Overview of `SmartAccount` and `SimpleSwap` Solidity code |
| [API Reference](api.md) | REST endpoints exposed by the Flask backend |

> Looking for a quick overview? See the project [README](../README.md).

> **New (v1.2):** The dApp now supports live swaps on **two distinct paths**:
> * **Linea / Local**  – On-chain via the project's `SimpleSwap` contract and EIP-7702 smart-accounts.
> * **Ethereum Mainnet** – Through the embedded **Uniswap Swap Widget** iframe (no local contracts).
>
> The UI auto-detects the connected chain and chooses the correct modal. See [Architecture](architecture.md#swap-execution-modes) for details.
>
> ⚠️ **Disclaimer** — Use at your own risk. The maintainers accept no responsibility for contract bugs, Uniswap router behaviour or financial loss. 