// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

/**
 * @title SimpleSwap
 * @dev A minimal DEX implementation for ETH/USDC swaps
 */
contract SimpleSwap is ReentrancyGuard {
    address public usdcAddress;
    uint256 public ethPrice; // USDC per ETH with 6 decimals
    
    // Basis-points denominator (1 bp = 0.01 %)
    uint256 private constant BPS_DENOMINATOR = 10_000;
    // Hard-coded slippage applied to every swap (default 0.5 %)
    uint256 public constant SLIPPAGE_BPS = 50; // 50 bp = 0.5 %
    
    event Swapped(address indexed user, address indexed fromToken, address indexed toToken, uint256 fromAmount, uint256 toAmount);
    
    constructor(address _usdcAddress, uint256 _initialEthPrice) {
        usdcAddress = _usdcAddress;
        ethPrice = _initialEthPrice;
    }
    
    /**
     * @dev Update the ETH price
     * @param _newPrice New ETH price in USDC with 6 decimals
     */
    function updateEthPrice(uint256 _newPrice) external {
        ethPrice = _newPrice;
    }
    
    /**
     * @dev Get the current ETH price in USDC
     * @return Current ETH price with 6 decimals
     */
    function getEthPrice() external view returns (uint256) {
        return ethPrice;
    }
    
    /**
     * @dev Swap ETH to USDC
     * @return Amount of USDC received
     */
    function swapEthToUsdc() external payable nonReentrant returns (uint256) {
        require(msg.value > 0, "Must send ETH");
        
        // Apply slippage: user receives slightly less USDC
        uint256 ethAmount = msg.value;
        uint256 usdcAmount = (ethAmount * ethPrice * (BPS_DENOMINATOR - SLIPPAGE_BPS)) / 1e18 / BPS_DENOMINATOR;
        
        IERC20 usdc = IERC20(usdcAddress);
        require(usdc.transfer(msg.sender, usdcAmount), "USDC transfer failed");
        
        emit Swapped(msg.sender, address(0), usdcAddress, ethAmount, usdcAmount);
        
        return usdcAmount;
    }
    
    /**
     * @dev Swap USDC to ETH
     * @param usdcAmount Amount of USDC to swap
     * @return Amount of ETH received
     */
    function swapUsdcToEth(uint256 usdcAmount) external nonReentrant returns (uint256) {
        require(usdcAmount > 0, "Must send USDC");
        
        // Transfer USDC from user
        IERC20 usdc = IERC20(usdcAddress);
        require(usdc.transferFrom(msg.sender, address(this), usdcAmount), "USDC transfer failed");
        
        // Calculate ETH amount to send based on current price
        uint256 ethAmount = (usdcAmount * 1e18 * (BPS_DENOMINATOR - SLIPPAGE_BPS)) / (ethPrice * BPS_DENOMINATOR);
        
        // Send ETH to user
        (bool success, ) = msg.sender.call{value: ethAmount}("");
        require(success, "ETH transfer failed");
        
        emit Swapped(msg.sender, usdcAddress, address(0), usdcAmount, ethAmount);
        
        return ethAmount;
    }
    
    /**
     * @dev Get a quote for how much USDC will be received for a given ETH amount
     * @param ethAmount Amount of ETH to swap
     * @return Amount of USDC that would be received
     */
    function getQuoteEthToUsdc(uint256 ethAmount) external view returns (uint256) {
        return (ethAmount * ethPrice * (BPS_DENOMINATOR - SLIPPAGE_BPS)) / 1e18 / BPS_DENOMINATOR;
    }
    
    /**
     * @dev Get a quote for how much ETH will be received for a given USDC amount
     * @param usdcAmount Amount of USDC to swap
     * @return Amount of ETH that would be received
     */
    function getQuoteUsdcToEth(uint256 usdcAmount) external view returns (uint256) {
        return (usdcAmount * 1e18 * (BPS_DENOMINATOR - SLIPPAGE_BPS)) / (ethPrice * BPS_DENOMINATOR);
    }
    
    /**
     * @dev Fallback function to receive ETH
     */
    receive() external payable {}
} 