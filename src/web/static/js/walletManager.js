// src/web/static/js/walletManager.js
// Wallet Manager shim – legacy renderer only
// ------------------------------------------------------------
window.lastNotificationTimestamps = window.lastNotificationTimestamps || {
  BUY: 0,
  SELL: 0,
  HOLD: 0,
};

/**
 * Update wallet card with current balances and portfolio recommendations
 */
function updateWalletCard() {
    const walletCard = document.getElementById('wallet-card');
    if (!walletCard) return;
    
    console.log(`Updating wallet card for account: ${window.userAccount || 'none'}`);
    
    if (!window.userAccount) {
        walletCard.innerHTML = `
            <div class="p-4">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="text-lg font-semibold cyber-title">Wallet Status</h3>
                </div>
                <div class="grid grid-cols-2 gap-2 text-sm">
                    <div>
                        <div class="text-gray-400">ETH Balance:</div>
                        <div class="font-bold text-cyber-text">0.0000 ETH</div>
                        <div class="text-xs text-gray-400">$0.00</div>
                    </div>
                    <div>
                        <div class="text-gray-400">USDC Balance:</div>
                        <div class="font-bold text-cyber-text">0.00 USDC</div>
                    </div>
                    <div class="col-span-2 mt-2">
                        <div class="text-gray-400">Portfolio Allocation:</div>
                        <div class="w-full bg-gray-700 rounded-full h-2.5 mt-1 relative">
                            <div class="bg-gray-600 h-2.5 rounded-full" style="width: 0%"></div>
                            <!-- Target range indicators for empty portfolio -->
                            <div class="absolute top-0 bottom-0 border-l border-white opacity-50" style="left: 20%; height: 100%;"></div>
                            <div class="absolute top-0 bottom-0 border-l border-white opacity-50" style="left: 40%; height: 100%;"></div>
                        </div>
                        <div class="flex justify-center text-xs mt-1">
                            <span class="text-gray-400">ETH: 0.0% | USDC: 0.0%</span>
                        </div>
                    </div>
                    
                    <div class="col-span-2 mt-3 flex justify-center space-x-4">
                        <button class="network-btn opacity-50 cursor-not-allowed flex items-center">
                            <div class="network-icon eth-icon">
                                <svg class="w-4 h-4" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M16 32C24.8366 32 32 24.8366 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 24.8366 7.16344 32 16 32ZM15.9963 5.33333L15.8 5.88333V20.2L15.9963 20.3967L22.6599 16.405L15.9963 5.33333Z" fill="#627EEA" fill-opacity="0.7"/>
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M16 5.33333L9.33333 16.405L16 20.3967V13.4183V5.33333Z" fill="#627EEA"/>
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M16 21.93L15.8917 22.0633V26.4117L16 26.6633L22.6667 17.94L16 21.93Z" fill="#627EEA" fill-opacity="0.7"/>
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M16 26.6633V21.93L9.33333 17.94L16 26.6633Z" fill="#627EEA"/>
                                </svg>
                            </div>
                            <span>Ethereum</span>
                        </button>
                        <button class="network-btn opacity-50 cursor-not-allowed flex items-center">
                            <div class="network-icon linea-icon">
                                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z" fill="#121212"/>
                                    <path d="M18.75 6.75H5.25V8.25H18.75V6.75Z" fill="#00ABFF"/>
                                    <path d="M18.75 11.25H5.25V12.75H18.75V11.25Z" fill="#00ABFF"/>
                                    <path d="M18.75 15.75H5.25V17.25H18.75V15.75Z" fill="#00ABFF"/>
                                </svg>
                            </div>
                            <span>Linea</span>
                        </button>
                    </div>
                    <div class="col-span-2 mt-3 mb-1 space-y-2">
                        <div class="flex items-center">
                            <span class="text-gray-400 w-40">Recommended Action:</span>
                            <span class="font-bold text-xl cyber-value animate-pulse text-gray-400">Connect your wallet first</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return;
    }
    if (!window.web3) {
        console.log("No web3 instance available, but user account exists");
        // Try to initialize web3 if ethereum is available
        if (typeof window.ethereum !== 'undefined') {
            window.web3 = new Web3(window.ethereum);
        } else {
            // If still no web3, show empty wallet card with error message
            walletCard.innerHTML = `
                <div class="p-4">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="text-lg font-semibold cyber-title">Wallet Status</h3>
                    </div>
                    <div class="flex flex-col items-center justify-center py-6">
                        <p class="text-red-400 mb-2">Web3 provider not available</p>
                        <p class="text-gray-400 text-sm mb-4">Please make sure MetaMask is installed and enabled</p>
                        <button onclick="window.location.reload()" class="cyber-btn text-xs px-3 py-1">
                            <i class="fas fa-sync-alt mr-1"></i> Refresh Page
                        </button>
                    </div>
                </div>
            `;
            return;
        }
    }

    // Check if we have valid price data
    const hasValidPrice = window.walletBalances && window.walletBalances.ethusd && 
                         !isNaN(window.walletBalances.ethusd) && window.walletBalances.ethusd > 0;
    
    // Log the current balances for debugging
    console.log(`Wallet balances for ${window.userAccount}:`, 
        JSON.stringify({
            eth: window.walletBalances.eth,
            usdc: window.walletBalances.usdc,
            ethusd: window.walletBalances.ethusd
        })
    );
    
    // Check if we're on Linea network
    window.web3.eth.getChainId().then(chainId => {
        const isLinea = chainId === 59144;
        const isEthereum = chainId === 1;
        const isHardhat = chainId === 31337; // Add support for local Hardhat network
        const networkName = isLinea ? 'Linea' : 
                           isEthereum ? 'Ethereum' : 
                           isHardhat ? 'Hardhat Local' : 'Unknown Network';
        const networkClass = isLinea || isEthereum || isHardhat ? 'text-green-400' : 'text-yellow-400';
        const isSupportedNetwork = isLinea || isEthereum || isHardhat;
        
        if (!isSupportedNetwork) {
            showNotification(`Unsupported network (Chain ID: ${chainId}). Please switch to Linea, Ethereum mainnet, or Local Hardhat Network.`, 'warning');
            console.log(`Unsupported network: ${chainId}`);
            
            // Update loading state to show network issue
            showLoadingWalletState("Connected to unsupported network - please switch");
        }
        
        // Network switching buttons
        const switchNetworkButtons = isLinea || isEthereum ? `
            <div class="col-span-2 mt-3 flex justify-center space-x-4">
                <button onclick="${isEthereum ? 'void(0)' : 'switchNetwork(1)'}" class="network-btn ${isEthereum ? 'network-active cursor-not-allowed opacity-80' : ''} flex items-center">
                    <div class="network-icon eth-icon">
                        <svg class="w-4 h-4" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M16 32C24.8366 32 32 24.8366 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 24.8366 7.16344 32 16 32ZM15.9963 5.33333L15.8 5.88333V20.2L15.9963 20.3967L22.6599 16.405L15.9963 5.33333Z" fill="#627EEA" fill-opacity="0.7"/>
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M16 5.33333L9.33333 16.405L16 20.3967V13.4183V5.33333Z" fill="#627EEA"/>
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M16 21.93L15.8917 22.0633V26.4117L16 26.6633L22.6667 17.94L16 21.93Z" fill="#627EEA" fill-opacity="0.7"/>
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M16 26.6633V21.93L9.33333 17.94L16 26.6633Z" fill="#627EEA"/>
                        </svg>
                    </div>
                    <span>Ethereum</span>
                    ${isEthereum ? '<span class="active-indicator">●</span>' : ''}
                </button>
                <button onclick="${isLinea ? 'void(0)' : 'switchNetwork(59144)'}" class="network-btn ${isLinea ? 'network-active cursor-not-allowed opacity-80' : ''} flex items-center">
                    <div class="network-icon linea-icon">
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z" fill="#121212"/>
                            <path d="M18.75 6.75H5.25V8.25H18.75V6.75Z" fill="#00ABFF"/>
                            <path d="M18.75 11.25H5.25V12.75H18.75V11.25Z" fill="#00ABFF"/>
                            <path d="M18.75 15.75H5.25V17.25H18.75V15.75Z" fill="#00ABFF"/>
                        </svg>
                    </div>
                    <span>Linea</span>
                    ${isLinea ? '<span class="active-indicator">●</span>' : ''}
                </button>
            </div>
        ` : `
            <div class="col-span-2 mt-3">
                <div class="text-yellow-400 text-xs text-center mb-2">Switch to a supported network</div>
                <div class="flex justify-center space-x-4">
                    <button onclick="switchNetwork(1)" class="network-btn flex items-center">
                        <div class="network-icon eth-icon">
                            <svg class="w-4 h-4" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M16 32C24.8366 32 32 24.8366 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 24.8366 7.16344 32 16 32ZM15.9963 5.33333L15.8 5.88333V20.2L15.9963 20.3967L22.6599 16.405L15.9963 5.33333Z" fill="#627EEA" fill-opacity="0.7"/>
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M16 5.33333L9.33333 16.405L16 20.3967V13.4183V5.33333Z" fill="#627EEA"/>
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M16 21.93L15.8917 22.0633V26.4117L16 26.6633L22.6667 17.94L16 21.93Z" fill="#627EEA" fill-opacity="0.7"/>
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M16 26.6633V21.93L9.33333 17.94L16 26.6633Z" fill="#627EEA"/>
                            </svg>
                        </div>
                        <span>Ethereum</span>
                    </button>
                    <button onclick="switchNetwork(59144)" class="network-btn flex items-center">
                        <div class="network-icon linea-icon">
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z" fill="#121212"/>
                                <path d="M18.75 6.75H5.25V8.25H18.75V6.75Z" fill="#00ABFF"/>
                                <path d="M18.75 11.25H5.25V12.75H18.75V11.25Z" fill="#00ABFF"/>
                                <path d="M18.75 15.75H5.25V17.25H18.75V15.75Z" fill="#00ABFF"/>
                            </svg>
                        </div>
                        <span>Linea</span>
                    </button>
                </div>
            </div>
        `;
        
        // If we don't have a valid ETH price, show error and don't make calculations
        if (!hasValidPrice) {
            walletCard.innerHTML = `
                <div class="p-4">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="text-lg font-semibold cyber-title">Wallet Status</h3>
                        <div class="network-address-badge flex items-center bg-cyber-dark rounded-full px-2 py-1 border border-opacity-30 ${isLinea ? 'border-blue-400' : isEthereum ? 'border-indigo-400' : 'border-yellow-400'} hover:shadow-glow transition-all duration-300">
                            ${isLinea ? `
                                <div class="network-icon-container mr-2 relative overflow-hidden">
                                    <svg class="w-5 h-5 text-blue-400 animate-pulse-slow" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                        <path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z" fill="#121212"/>
                                        <path d="M18.75 6.75H5.25V8.25H18.75V6.75Z" fill="#00ABFF"/>
                                        <path d="M18.75 11.25H5.25V12.75H18.75V11.25Z" fill="#00ABFF"/>
                                        <path d="M18.75 15.75H5.25V17.25H18.75V15.75Z" fill="#00ABFF"/>
                                    </svg>
                                    <div class="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-30 blur-sm network-scan"></div>
                                </div>
                            ` : isEthereum ? `
                                <div class="network-icon-container mr-2 relative overflow-hidden">
                                    <!-- Note: Ethereum icon uses 32x32 viewBox intentionally for correct proportions, 
                                         while still constrained to w-5 h-5 display size like other icons -->
                                    <svg class="w-5 h-5 text-indigo-400 animate-pulse-slow" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
                                        <path fill-rule="evenodd" clip-rule="evenodd" d="M16 32C24.8366 32 32 24.8366 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 24.8366 7.16344 32 16 32ZM15.9963 5.33333L15.8 5.88333V20.2L15.9963 20.3967L22.6599 16.405L15.9963 5.33333Z" fill="#627EEA" fill-opacity="0.7"/>
                                        <path fill-rule="evenodd" clip-rule="evenodd" d="M16 5.33333L9.33333 16.405L16 20.3967V13.4183V5.33333Z" fill="#627EEA"/>
                                        <path fill-rule="evenodd" clip-rule="evenodd" d="M16 21.93L15.8917 22.0633V26.4117L16 26.6633L22.6667 17.94L16 21.93Z" fill="#627EEA" fill-opacity="0.7"/>
                                        <path fill-rule="evenodd" clip-rule="evenodd" d="M16 26.6633V21.93L9.33333 17.94L16 26.6633Z" fill="#627EEA"/>
                                    </svg>
                                    <div class="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-30 blur-sm network-scan"></div>
                                </div>
                            ` : `
                                <div class="network-icon-container mr-2 relative overflow-hidden">
                                    <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                            `}
                            <div class="flex flex-col">
                                <div class="text-xs ${isLinea ? 'text-blue-400' : isEthereum ? 'text-indigo-400' : 'text-yellow-400'} font-medium network-name">${networkName}</div>
                                <div class="flex items-center">
                                    <span class="wallet-address text-xs font-mono bg-gradient-to-r from-gray-400 to-white bg-clip-text text-transparent transition-all duration-300">${formatWalletAddress(window.userAccount)}</span>
                                    <button onclick="copyToClipboard('${window.userAccount}')" class="ml-1 text-gray-400 hover:text-blue-400 transition-colors duration-200">
                                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-sm">
                        <div>
                            <div class="text-gray-400">ETH Balance:</div>
                            <div class="font-bold text-cyber-text">${window.walletBalances.eth.toFixed(4)} ETH</div>
                            <div class="text-xs text-gray-400">${!isLinea && !isEthereum ? '(Only available on Linea or Ethereum)' : ''}</div>
                        </div>
                        <div>
                            <div class="text-gray-400">USDC Balance:</div>
                            <div class="font-bold text-cyber-text">${window.walletBalances.usdc.toFixed(2)} USDC</div>
                            <div class="text-xs text-gray-400">${!isLinea && !isEthereum ? '(Only available on Linea or Ethereum)' : ''}</div>
                        </div>
                        ${switchNetworkButtons}
                        <div class="col-span-2 mt-3 text-center">
                            <p class="text-yellow-400">Wallet portfolio analysis paused</p>
                            <p class="text-xs text-gray-400 mt-1">Portfolio recommendations will resume once data is available</p>
                        </div>
                    </div>
                </div>
            `;
            return;
        }
        
        // Calculate optimal action based on current portfolio allocation
        const ethValue = window.walletBalances.eth || 0;
        const usdcValue = window.walletBalances.usdc || 0;
        const ethPrice = window.walletBalances.ethusd || 0;
        
        const ethValueUSD = ethValue * ethPrice;
        const totalValue = (ethValueUSD + usdcValue) || 0;
        
        // Handle zero balance case properly with additional validation
        const hasNonZeroBalance = (ethValue > 0 || usdcValue > 0) && totalValue > 0;
        const currentEthAllocation = hasNonZeroBalance ? Math.min(100, Math.max(0, (ethValueUSD / totalValue * 100))) : 0;
        const currentUsdcAllocation = hasNonZeroBalance ? Math.min(100, Math.max(0, 100 - currentEthAllocation)) : 0;
        
        // Target allocation range: 60-80% ETH in bullish, 20-40% in bearish
        const marketSentiment = document.getElementById('sentiment');
        const isBullish = marketSentiment && marketSentiment.textContent.includes('bullish');
        
        const targetEthMin = isBullish ? 60 : 20;
        const targetEthMax = isBullish ? 80 : 40;
        
        // Instead of portfolio-based decision, use AI consensus or latest decisions if available
        let recommendedAction = 'HOLD';
        let swapAmount = 0;
        let swapDirection = '';
        
        // Get decisions from AI models
        const geminiDecision = document.getElementById('gemini-decision');
        const groqDecision = document.getElementById('groq-decision');
        const mistralDecision = document.getElementById('mistral-decision');
        
        const decisions = {
            gemini: geminiDecision ? geminiDecision.textContent : null,
            groq: groqDecision ? groqDecision.textContent : null,
            mistral: mistralDecision ? mistralDecision.textContent : null
        };
        
        // Check for consensus
        const aiConsensus = window.checkLLMConsensus(decisions);
        
        // Check for severe portfolio imbalance first
        const severeImbalanceThreshold = 10; // 10% threshold for severe imbalance
        
        if (totalValue > 0) {
            if (currentEthAllocation < targetEthMin - severeImbalanceThreshold) {
                // Severe imbalance - too little ETH regardless of consensus
                recommendedAction = 'BUY';
                const targetEthValue = (totalValue * targetEthMin / 100);
                swapAmount = targetEthValue - ethValueUSD;
                console.log(`Portfolio rebalance (BUY): Target ETH Value: $${targetEthValue.toFixed(2)}, Current ETH Value: $${ethValueUSD.toFixed(2)}, Swap Amount: $${swapAmount.toFixed(2)}`);
                swapDirection = 'USDC → ETH';
            } else if (currentEthAllocation > targetEthMax + severeImbalanceThreshold) {
                // Severe imbalance - too much ETH regardless of consensus
                recommendedAction = 'SELL';
                const targetEthValue = (totalValue * targetEthMax / 100);
                swapAmount = ethValueUSD - targetEthValue;
                console.log(`Portfolio rebalance (SELL): Target ETH Value: $${targetEthValue.toFixed(2)}, Current ETH Value: $${ethValueUSD.toFixed(2)}, Swap Amount: $${swapAmount.toFixed(2)}`);
                swapDirection = 'ETH → USDC';
            } else if (aiConsensus) {
                // For moderate imbalance, use consensus if available
                recommendedAction = aiConsensus;
                
                // Calculate swap amount based on consensus
                if (recommendedAction === 'BUY' && currentEthAllocation < targetEthMin) {
                    // Below range - bring to minimum target
                    const targetEthValue = (totalValue * targetEthMin / 100);
                    swapAmount = targetEthValue - ethValueUSD;
                    console.log(`LLM Consensus BUY (below range): Current: ${currentEthAllocation.toFixed(1)}%, Target: ${targetEthMin}%, Swap Amount: $${swapAmount.toFixed(2)}`);
                    swapDirection = 'USDC → ETH';
                } else if (recommendedAction === 'BUY' && currentEthAllocation >= targetEthMin && currentEthAllocation <= targetEthMax) {
                    // If already within range, make a balanced buy recommendation
                    // Calculate a moderate buy that moves halfway from current to target max
                    const midPoint = (targetEthMax + currentEthAllocation) / 2;
                    const targetEthValue = (totalValue * midPoint / 100);
                    swapAmount = targetEthValue - ethValueUSD;
                    console.log(`LLM Consensus BUY (within range): Current: ${currentEthAllocation.toFixed(1)}%, Target: ${midPoint.toFixed(1)}%, Swap Amount: $${swapAmount.toFixed(2)}`);
                    swapDirection = 'USDC → ETH';
                } else if (recommendedAction === 'BUY') {
                    // If above range, no buy needed
                    swapAmount = 0;
                    console.log(`LLM Consensus BUY (unusual scenario): Current: ${currentEthAllocation.toFixed(1)}%, above target range, no swap needed`);
                    swapDirection = 'USDC → ETH';
                } else if (recommendedAction === 'SELL') {
                    // If already within range, make a balanced sell recommendation
                    if (currentEthAllocation >= targetEthMin && currentEthAllocation <= targetEthMax) {
                        // Calculate a moderate sell that moves 1/3 of the way from current to target min
                        const midPoint = (targetEthMin + currentEthAllocation) / 2;
                        const targetEthValue = (totalValue * midPoint / 100);
                        swapAmount = ethValueUSD - targetEthValue;
                        console.log(`LLM Consensus SELL (within range): Current: ${currentEthAllocation.toFixed(1)}%, Target: ${midPoint.toFixed(1)}%, Swap Amount: $${swapAmount.toFixed(2)}`);
                    } else if (currentEthAllocation > targetEthMax) {
                        // If above range, bring to maximum target
                        const targetEthValue = (totalValue * targetEthMax / 100);
                        swapAmount = ethValueUSD - targetEthValue;
                        console.log(`LLM Consensus SELL (above range): Current: ${currentEthAllocation.toFixed(1)}%, Target: ${targetEthMax}%, Swap Amount: $${swapAmount.toFixed(2)}`);
                    } else {
                        // If below range, no sell needed (this shouldn't happen for SELL)
                        swapAmount = 0;
                        console.log(`LLM Consensus SELL (unusual scenario): Current: ${currentEthAllocation.toFixed(1)}%, below target range, no swap needed`);
                    }
                    swapDirection = 'ETH → USDC';
                }
            } else {
                // Fall back to portfolio-based recommendation if no consensus 
                // and no severe imbalance
                if (currentEthAllocation < targetEthMin) {
                    recommendedAction = 'BUY';
                    const targetEthValue = (totalValue * targetEthMin / 100);
                    swapAmount = targetEthValue - ethValueUSD;
                    console.log(`Portfolio rebalance (BUY): Target ETH Value: $${targetEthValue.toFixed(2)}, Current ETH Value: $${ethValueUSD.toFixed(2)}, Swap Amount: $${swapAmount.toFixed(2)}`);
                    swapDirection = 'USDC → ETH';
                } else if (currentEthAllocation > targetEthMax) {
                    recommendedAction = 'SELL';
                    const targetEthValue = (totalValue * targetEthMax / 100);
                    swapAmount = ethValueUSD - targetEthValue;
                    console.log(`Portfolio rebalance (SELL): Target ETH Value: $${targetEthValue.toFixed(2)}, Current ETH Value: $${ethValueUSD.toFixed(2)}, Swap Amount: $${swapAmount.toFixed(2)}`);
                    swapDirection = 'ETH → USDC';
                }
            }
        }
        
        // Ensure swap amount is always positive and meaningful
        if (swapAmount < 0) {
            console.log(`Correcting negative swap amount (${swapAmount.toFixed(2)}) to 0`);
            swapAmount = 0;
        }
        
        // Minimum significant swap amount (to avoid dust trades)
        const MIN_SIGNIFICANT_SWAP = 0.10; // $0.10 minimum
        if (swapAmount > 0 && swapAmount < MIN_SIGNIFICANT_SWAP) {
            console.log(`Increasing tiny swap amount from ${swapAmount.toFixed(2)} to minimum ${MIN_SIGNIFICANT_SWAP}`);
            swapAmount = MIN_SIGNIFICANT_SWAP;
        }
        
        // Get recommending models
        let recommendingModels = [];
        if (decisions.gemini === recommendedAction) recommendingModels.push('Gemini');
        if (decisions.groq === recommendedAction) recommendingModels.push('Groq');
        if (decisions.mistral === recommendedAction) recommendingModels.push('Mistral');
        
        const modelText = recommendingModels.length > 0 
            ? `<div class="text-xs mt-1 text-gray-300">Recommended by: ${recommendingModels.join(', ')}</div>` 
            : '';
        
        // Modify the portfolio allocation bar display for zero balances
        const portfolioAllocationBar = hasNonZeroBalance 
            ? `<div class="w-full bg-gray-700 rounded-full h-2.5 mt-1 relative">
                <div class="${window.getPortfolioBarColor(currentEthAllocation, targetEthMin, targetEthMax)} h-2.5 rounded-full" style="width: ${currentEthAllocation}%"></div>
                
                <!-- Target range indicators -->
                <div class="absolute top-0 bottom-0 border-l border-white opacity-50" style="left: ${targetEthMin}%; height: 100%;"></div>
                <div class="absolute top-0 bottom-0 border-l border-white opacity-50" style="left: ${targetEthMax}%; height: 100%;"></div>
              </div>
              <div class="flex justify-between text-xs mt-1">
                <span>ETH: ${currentEthAllocation.toFixed(1)}%</span>
                <span>USDC: ${currentUsdcAllocation.toFixed(1)}%</span>
              </div>`
            : `<div class="w-full bg-gray-700 rounded-full h-2.5 mt-1 relative">
                <div class="bg-gray-600 h-2.5 rounded-full" style="width: 0%"></div>
                
                <!-- Target range indicators -->
                <div class="absolute top-0 bottom-0 border-l border-white opacity-50" style="left: ${targetEthMin}%; height: 100%;"></div>
                <div class="absolute top-0 bottom-0 border-l border-white opacity-50" style="left: ${targetEthMax}%; height: 100%;"></div>
              </div>
              <div class="flex justify-center text-xs mt-1">
                <span class="text-gray-400">(Empty Portfolio)</span>
              </div>`;
        
        // Only trigger notifications if we have a valid recommendation and sufficient imbalance
        if (recommendedAction !== 'HOLD' && swapAmount > 0) {
            // Check conditions based on specified rules:
            // 1. Portfolio is outside target range (trigger notification for rebalancing)
            const isPortfolioOutOfRange = (currentEthAllocation < targetEthMin || currentEthAllocation > targetEthMax);
            
            // 2. At least 2 LLMs agree on a BUY/SELL action
            const consensusModels = recommendingModels.length;
            const hasLLMConsensus = consensusModels >= 2;
            
            // Only send notification if:
            // - Portfolio is outside target range (for rebalancing) OR
            // - We have LLM consensus from at least 2 models
            if (isPortfolioOutOfRange || hasLLMConsensus) {
                
                // Check if enough time has passed since last notification (5 minutes minimum)
                const now = Date.now();
                const timeSinceLastNotification = now - (window.lastNotificationTimestamps[recommendedAction] || 0);
                const minimumInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
                
                if (timeSinceLastNotification >= minimumInterval) {
                    console.log(`Triggering notification for ${recommendedAction} based on ${
                        isPortfolioOutOfRange ? 'portfolio imbalance' : 'LLM consensus'
                    }`);
                    
                    // Get current ETH price with safety check
                    const ethPrice = window.walletBalances.ethusd || 0;
                    
                    // Create appropriate message for the notification
                    let notificationMessage = '';
                    if (recommendedAction === 'BUY') {
                        notificationMessage = `Suggested Swap: ~$${swapAmount.toFixed(2)} ${swapDirection}`;
                        console.log(`Notification message for BUY: ${notificationMessage} (swapAmount: ${swapAmount})`);
                    } else if (recommendedAction === 'SELL' && ethPrice > 0) {
                        // For SELL, we need to convert the USD amount to ETH
                        const ethAmount = swapAmount / ethPrice;
                        notificationMessage = `Suggested Swap: ~${ethAmount.toFixed(4)} ${swapDirection}`;
                        console.log(`Notification message for SELL: ${notificationMessage} (ethAmount: ${ethAmount}, swapAmount: ${swapAmount})`);
                    }
                    
                    // Trigger the notification only if we have a valid message
                    if (notificationMessage && window.sendWalletNotification) {
                        window.sendWalletNotification(recommendedAction, notificationMessage);
                        // Update the timestamp
                        window.lastNotificationTimestamps[recommendedAction] = now;
                    }
                } else {
                    console.log(`Skipping ${recommendedAction} notification - too soon since last one (${Math.floor(timeSinceLastNotification/1000)}s ago)`);
                }
            } else {
                console.log(`Not sending notification: portfolio in range=${currentEthAllocation >= targetEthMin && currentEthAllocation <= targetEthMax}, consensus=${hasLLMConsensus}`);
            }
        }
        
        // Recommendation section based on whether we have balances and AI decisions
        const recommendationSection = `
            <div class="col-span-2 mt-3 mb-1 space-y-2">
                <div class="flex items-center">
                    <span class="text-gray-400 w-40">Recommended Action:</span>
                    <span class="${
                        recommendedAction === 'BUY' ? 'text-white' :
                        recommendedAction === 'SELL' ? 'text-gray-300' :
                        'text-white'
                    }" data-recommended-action="${recommendedAction}">${recommendedAction}</span>
                </div>
                ${recommendingModels.length > 0 ? `
                <div class="flex items-center">
                    <span class="text-gray-400 w-40">Recommended by:</span>
                    <span class="text-gray-300">${recommendingModels.join(', ')}</span>
                </div>
                ` : ''}
                ${swapAmount > 0 && (recommendedAction === 'BUY' || (recommendedAction === 'SELL' && ethPrice > 0)) ? `
                <div class="flex items-center">
                    <span class="text-gray-400 w-40">Suggested Swap:</span>
                    <span class="text-gray-300" data-suggested-swap="${recommendedAction === 'BUY' ? `~$${swapAmount.toFixed(2)} ${swapDirection}` : `~${(swapAmount / ethPrice).toFixed(4)} ${swapDirection}`}">
                        ${recommendedAction === 'BUY' ? `~$${swapAmount.toFixed(2)} ${swapDirection}` : `~${(swapAmount / ethPrice).toFixed(4)} ${swapDirection}`}
                    </span>
                </div>
                ` : ''}
                ${totalValue > 0 ? `
                <div class="flex items-center">
                    <span class="text-gray-400 w-40">Target Allocation:</span>
                    <span class="text-gray-300">${targetEthMin}%-${targetEthMax}% ETH in ${isBullish ? 'bullish' : 'bearish'} market</span>
                </div>
                ` : ''}
                ${(currentEthAllocation < targetEthMin - severeImbalanceThreshold || currentEthAllocation > targetEthMax + severeImbalanceThreshold) && totalValue > 0 ? `
                <div class="flex items-center">
                    <span class="text-gray-400 w-40">Warning:</span>
                    <span class="text-yellow-400">Portfolio significantly ${currentEthAllocation < targetEthMin ? 'below' : 'above'} target range</span>
                </div>
                ` : ''}
                ${swapAmount > 0 ? `
                <div class="mt-3 border-t border-gray-700 pt-3">
                    <div class="flex items-center justify-between">
                        <span class="text-gray-400">Enable MetaMask Test Notifications:</span>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="enable-swap-recommendations" class="sr-only peer" ${window.enableSwapRecommendations ? 'checked' : ''}>
                            <div class="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                    <p class="text-xs text-gray-400 mt-1">
                        ${window.enableSwapRecommendations ? 
                            'You will receive test notifications in MetaMask but will not send any transactions' : 
                            'Enable to receive test notifications in MetaMask'}
                    </p>
                </div>
                ` : ''}
            </div>
        `;
        
        walletCard.innerHTML = `
            <div class="p-4">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="text-lg font-semibold cyber-title">Wallet Status</h3>
                    <div class="network-address-badge flex items-center bg-cyber-dark rounded-full px-2 py-1 border border-opacity-30 ${isLinea ? 'border-blue-400' : isEthereum ? 'border-indigo-400' : 'border-yellow-400'} hover:shadow-glow transition-all duration-300">
                        ${isLinea ? `
                            <div class="network-icon-container mr-2 relative overflow-hidden">
                                <svg class="w-5 h-5 text-blue-400 animate-pulse-slow" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                    <path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z" fill="#121212"/>
                                    <path d="M18.75 6.75H5.25V8.25H18.75V6.75Z" fill="#00ABFF"/>
                                    <path d="M18.75 11.25H5.25V12.75H18.75V11.25Z" fill="#00ABFF"/>
                                    <path d="M18.75 15.75H5.25V17.25H18.75V15.75Z" fill="#00ABFF"/>
                                </svg>
                                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-30 blur-sm network-scan"></div>
                            </div>
                        ` : isEthereum ? `
                            <div class="network-icon-container mr-2 relative overflow-hidden">
                                <!-- Note: Ethereum icon uses 32x32 viewBox intentionally for correct proportions, 
                                     while still constrained to w-5 h-5 display size like other icons -->
                                <svg class="w-5 h-5 text-indigo-400 animate-pulse-slow" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M16 32C24.8366 32 32 24.8366 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 24.8366 7.16344 32 16 32ZM15.9963 5.33333L15.8 5.88333V20.2L15.9963 20.3967L22.6599 16.405L15.9963 5.33333Z" fill="#627EEA" fill-opacity="0.7"/>
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M16 5.33333L9.33333 16.405L16 20.3967V13.4183V5.33333Z" fill="#627EEA"/>
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M16 21.93L15.8917 22.0633V26.4117L16 26.6633L22.6667 17.94L16 21.93Z" fill="#627EEA" fill-opacity="0.7"/>
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M16 26.6633V21.93L9.33333 17.94L16 26.6633Z" fill="#627EEA"/>
                                </svg>
                                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-30 blur-sm network-scan"></div>
                            </div>
                        ` : `
                            <div class="network-icon-container mr-2 relative overflow-hidden">
                                <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                        `}
                        <div class="flex flex-col">
                            <div class="text-xs ${isLinea ? 'text-blue-400' : isEthereum ? 'text-indigo-400' : 'text-yellow-400'} font-medium network-name">${networkName}</div>
                            <div class="flex items-center">
                                <span class="wallet-address text-xs font-mono bg-gradient-to-r from-gray-400 to-white bg-clip-text text-transparent transition-all duration-300">${formatWalletAddress(window.userAccount)}</span>
                                <button onclick="copyToClipboard('${window.userAccount}')" class="ml-1 text-gray-400 hover:text-blue-400 transition-colors duration-200">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2 text-sm">
                    <div>
                        <div class="text-gray-400">ETH Balance:</div>
                        <div class="font-bold text-cyber-text">${ethValue.toFixed(4)} ETH</div>
                        <div class="text-xs text-gray-400">$${(ethValue * ethPrice).toFixed(2)}</div>
                    </div>
                    <div>
                        <div class="text-gray-400">USDC Balance:</div>
                        <div class="font-bold text-cyber-text">${usdcValue.toFixed(2)} USDC</div>
                        <div class="text-xs text-gray-400">${!isLinea && !isEthereum ? '(Only available on Linea or Ethereum)' : ''}</div>
                    </div>
                    
                    <div class="col-span-2 mt-2">
                        <div class="text-gray-400">Portfolio Allocation:</div>
                        ${portfolioAllocationBar}
                    </div>
                    
                    ${switchNetworkButtons}
                    
                    ${recommendationSection}
                </div>
            </div>
        `;
    }).catch(err => {
        console.log("Error getting chain ID:", err.message);
        
        // Fallback wallet card with error state
        walletCard.innerHTML = `
            <div class="p-4">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="text-lg font-semibold cyber-title">Wallet Status</h3>
                    ${window.userAccount ? `
                    <div class="network-address-badge flex items-center bg-cyber-dark rounded-full px-2 py-1 border border-opacity-30 border-yellow-400 hover:shadow-glow transition-all duration-300">
                        <div class="network-icon-container mr-2 relative overflow-hidden">
                            <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div class="flex flex-col">
                            <div class="text-xs text-yellow-400 font-medium">Connection Issue</div>
                            <div class="flex items-center">
                                <span class="wallet-address text-xs font-mono bg-gradient-to-r from-gray-400 to-white bg-clip-text text-transparent transition-all duration-300">${formatWalletAddress(window.userAccount)}</span>
                                <button onclick="copyToClipboard('${window.userAccount}')" class="ml-1 text-gray-400 hover:text-blue-400 transition-colors duration-200">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
                <div class="flex flex-col items-center justify-center h-24">
                    <p class="text-red-400 mb-2">Error loading wallet data</p>
                    <p class="text-xs text-gray-400 mb-2">Network error: ${err.message}</p>
                    <button onclick="getWalletBalances()" class="cyber-btn mt-2 text-xs px-3 py-1">
                        <i class="fas fa-sync-alt mr-1"></i> Retry
                    </button>
                </div>
            </div>
        `;
    });
}

window.updateWalletCard = updateWalletCard;