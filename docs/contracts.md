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

A deliberately simple desk for demonstration, used by default on Linea and testnets. **For Ethereum Mainnet, the application now uses the Uniswap V4 Universal Router for swaps.**

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

### Ethereum Mainnet Swaps: Uniswap V4 Universal Router

For transactions on Ethereum Mainnet (chainId 1), the application no longer uses `SimpleSwap`. Instead, it interacts with the **Uniswap V4 Universal Router** to perform ETH ↔︎ USDC swaps. This leverages a public, well-audited, and gas-efficient contract infrastructure provided by Uniswap.

**User Responsibility and Risk Disclaimer:**
While this integration uses established Uniswap contracts for mainnet operations, all swap transactions executed through this application are initiated and confirmed by you, the user. You are solely responsible for understanding the transaction details, associated risks (including market volatility and potential smart contract risks), and any resulting financial outcomes. The authors of STBChef are not liable for any loss of funds. Always use with caution and at your own risk.

**Key Details:**
*   **Router Address (Mainnet):** `0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD` (This address **must be verified** from official Uniswap V4 documentation/deployments before any production use with real funds. See [Uniswap Deployments](https://github.com/Uniswap/deploy-v4)).
*   **Interaction Flow:** The frontend JavaScript (`smartAccount.js`) constructs the necessary commands and parameters to call the `execute` function on the Universal Router.
    *   **Command:** `V4_SWAP (0x0b)`
    *   **Actions:** `SWAP_EXACT_IN_SINGLE (0x00)`, `SETTLE_ALL (0x10)`, `TAKE_ALL (0x11)`
    *   **PoolKey:** A WETH/USDC pool is targeted (e.g., 0.3% fee tier). The `PoolKey` struct (currency0, currency1, fee, tickSpacing, hooks) is encoded.
    *   **Parameters:** Encoded parameters for each action, including the `ExactInputSingleParams` struct (containing the `PoolKey`, amounts, and `hookData`), are prepared.
*   **Tokens Used (Mainnet):**
    *   WETH: `0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2`
    *   USDC: `0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`
*   **Slippage:** Basic 0.5% slippage protection is implemented in the frontend when calculating `amountOutMinimum`.
*   **Approvals:** For USDC → ETH swaps, the Universal Router address is approved to spend the user's USDC.

The `SimpleSwap` contract's `updateEthPrice` function remains for local/testnet demonstration purposes only and is not used on mainnet.

---
## 3  MockUSDC

Extends OZ `ERC20` with 6 decimals and pre-mints 1 000 000 tokens to `msg.sender` for local liquidity.

Used by unit tests and the Hardhat deploy script on chainId 31337.

---
## 4  Deployment Matrix

| Network | Address `SmartAccount` | Address `SimpleSwap` | Notes |
|---------|------------------------|----------------------|-------|
| **Linea Testnet** | see `deployment.log` | see `deployment.log` | Deployed via `npm run deploy` |
| **Ethereum Mainnet** | N/A (uses user's EOA/AA) | N/A (uses Uniswap V4 Universal Router) | Swaps via Universal Router: `0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD` (Verify!) |
| **Hardhat** (31337) | auto-deploy by `scripts/deploy.js` | auto-deploy; also deploys `MockUSDC` |

(After each deploy run `scripts/verify.js` to verify both contracts.)

---
Next → [API Reference](api.md) 