# Smart Contracts

This project ships three Solidity contracts compiled with **Hardhat 2.19.x** and Solidity 0.8.x.

| Contract | Path | Purpose |
|----------|------|---------|
| `SmartAccount` | `contracts/SmartAccount.sol` | EIP-7702-style account abstraction: session keys, batch execution, pay-gas-in-token |
| `SimpleSwap` | `contracts/SimpleSwap.sol` | Minimal ETH ↔ USDC desk used by the dApp |
| `MockUSDC` | `contracts/mocks/MockUSDC.sol` | 6-decimal ERC-20 for local testing |

---
## 1  SmartAccount

Implements a **temporary smart account** that is **delegated from an EOA** only for the duration of a single transaction (per Pectra/EIP-7702 draft).

### Key Features
* **Session Keys** — `addSessionKey(address,uint256 expiry)` lets an owner delegate limited authority.
* **Batch Transactions** — `executeBatch(address[] targets,uint256[] values,bytes[] datas)` saves gas and improves UX.
* **Gas Token Payment** — `executeWithGasToken(address token,uint256 amount,…)` pulls an ERC-20 (USDC) to reimburse the bundler.
* Ownership can be transferred (`transferOwnership`).

### Security
`onlyOwner` and `onlySessionKey` modifiers gate critical functions. Reentrancy not an issue; contract only makes external calls via delegatee functions.

---
## 2  SimpleSwap

A deliberately simple desk for demonstration; **not production-grade**.

```solidity
function swapEthToUsdc() external payable nonReentrant returns (uint256)
function swapUsdcToEth(uint256 usdcAmount) external nonReentrant returns (uint256)
function getQuoteEthToUsdc(uint256 ethAmount) external view returns (uint256)
function getQuoteUsdcToEth(uint256 usdcAmount) external view returns (uint256)
```

Constants:
* `SLIPPAGE_BPS = 50` → 0.5 % penalty applied to every swap.
* Inherits **OpenZeppelin `ReentrancyGuard`**.

### Constructor
```solidity
constructor(address usdc, uint256 initialPrice) { … }
```
`initialPrice` is expressed in USDC (6 decimals) per 1 ETH.

### Update Price (demo-only!)
`updateEthPrice(uint256 newPrice)` is `external` and **UNRESTRICTED** for easier demo; do **not** use on mainnet.

---
## 3  MockUSDC

Extends OZ `ERC20` with 6 decimals and pre-mints 1 000 000 tokens to `msg.sender` for local liquidity.

Used by unit tests and the Hardhat deploy script on chainId 31337.

---
## 4  Deployment Matrix

| Network | Address `SmartAccount` | Address `SimpleSwap` | Notes |
|---------|------------------------|----------------------|-------|
| **Linea Testnet** | see `deployment.log` | see `deployment.log` | Deployed via `npm run deploy` |
| **Hardhat** (31337) | auto-deploy by `scripts/deploy.js` | auto-deploy; also deploys `MockUSDC` |

(After each deploy run `scripts/verify.js` to verify both contracts.)

---
Next → [API Reference](api.md) 