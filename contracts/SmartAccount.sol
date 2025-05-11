// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title SmartAccount
 * @dev Implementation of EIP-7702 compatible smart account with session keys, batch transactions and gas abstraction
 */
contract SmartAccount {
    address public owner;
    mapping(address => uint256) public sessionKeys; // sessionKey => expiry timestamp
    
    enum Feature { SessionKeys, BatchTransactions, GasTokenPayment }
    mapping(Feature => bool) public enabledFeatures;
    
    event FeatureEnabled(Feature indexed feature);
    event Executed(address indexed target, uint256 value, bytes data);
    event BatchExecuted(uint256 txCount);
    event SessionKeyAdded(address indexed sessionKey, uint256 expiry);
    event SessionKeyRemoved(address indexed sessionKey);
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "SmartAccount: caller is not the owner");
        _;
    }
    
    modifier onlyAuthorized() {
        require(
            msg.sender == owner || (sessionKeys[msg.sender] > block.timestamp), 
            "SmartAccount: caller is not authorized"
        );
        _;
    }
    
    /**
     * @dev Enable a feature on this smart account
     * @param feature Feature to enable
     */
    function enableFeature(Feature feature) external onlyOwner {
        enabledFeatures[feature] = true;
        emit FeatureEnabled(feature);
    }
    
    /**
     * @dev Add a session key with an expiry time
     * @param sessionKey Address to authorize as a session key
     * @param expiry Timestamp when the session key expires
     */
    function addSessionKey(address sessionKey, uint256 expiry) external onlyOwner {
        require(enabledFeatures[Feature.SessionKeys], "SmartAccount: SessionKeys feature not enabled");
        require(expiry > block.timestamp, "SmartAccount: Expiry must be in the future");
        sessionKeys[sessionKey] = expiry;
        emit SessionKeyAdded(sessionKey, expiry);
    }
    
    /**
     * @dev Remove a session key
     * @param sessionKey Address to remove authorization from
     */
    function removeSessionKey(address sessionKey) external onlyOwner {
        delete sessionKeys[sessionKey];
        emit SessionKeyRemoved(sessionKey);
    }
    
    /**
     * @dev Execute a single transaction
     * @param target Address of the contract to call
     * @param value Amount of ETH to send
     * @param data Calldata to send
     * @return result The result of the call
     */
    function execute(address target, uint256 value, bytes calldata data) 
        external 
        onlyAuthorized 
        returns (bytes memory) 
    {
        (bool success, bytes memory result) = target.call{value: value}(data);
        require(success, "SmartAccount: execution failed");
        emit Executed(target, value, data);
        return result;
    }
    
    /**
     * @dev Execute a batch of transactions
     * @param targets Array of addresses to call
     * @param values Array of ETH amounts to send
     * @param datas Array of calldatas to send
     * @return results Array of call results
     */
    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas
    ) 
        external 
        onlyAuthorized 
        returns (bytes[] memory) 
    {
        require(enabledFeatures[Feature.BatchTransactions], "SmartAccount: BatchTransactions feature not enabled");
        require(targets.length == values.length && values.length == datas.length, "SmartAccount: array lengths mismatch");
        
        bytes[] memory results = new bytes[](targets.length);
        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, bytes memory result) = targets[i].call{value: values[i]}(datas[i]);
            require(success, "SmartAccount: batch execution failed");
            results[i] = result;
        }
        emit BatchExecuted(targets.length);
        return results;
    }
    
    /**
     * @dev Pay for gas with ERC20 token
     * @param gasToken Address of the ERC20 token to use for gas
     * @param gasAmount Amount of tokens to pay
     * @param target Address of the contract to call
     * @param value Amount of ETH to send
     * @param data Calldata to send
     */
    function executeWithGasToken(
        address gasToken, 
        uint256 gasAmount,
        address target, 
        uint256 value, 
        bytes calldata data
    ) 
        external 
        onlyAuthorized 
        returns (bytes memory) 
    {
        require(enabledFeatures[Feature.GasTokenPayment], "SmartAccount: GasTokenPayment feature not enabled");
        
        // First execute the ERC20 transfer to pay for gas
        bytes memory transferCalldata = abi.encodeWithSignature(
            "transfer(address,uint256)", 
            msg.sender, // Send gas payment to the caller
            gasAmount
        );
        
        (bool transferSuccess, bytes memory transferResult) = gasToken.call(transferCalldata);
        require(transferSuccess, "SmartAccount: gas payment failed");
        
        // Then execute the actual transaction
        (bool success, bytes memory result) = target.call{value: value}(data);
        require(success, "SmartAccount: execution failed");
        
        emit Executed(target, value, data);
        return result;
    }
    
    /**
     * @dev Execute batch transactions with ERC20 token for gas
     * @param gasToken Address of the ERC20 token to use for gas
     * @param gasAmount Amount of tokens to pay
     * @param targets Array of addresses to call
     * @param values Array of ETH amounts to send
     * @param datas Array of calldatas to send
     */
    function executeBatchWithGasToken(
        address gasToken,
        uint256 gasAmount,
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas
    ) 
        external 
        onlyAuthorized 
        returns (bytes[] memory) 
    {
        require(enabledFeatures[Feature.BatchTransactions], "SmartAccount: BatchTransactions feature not enabled");
        require(enabledFeatures[Feature.GasTokenPayment], "SmartAccount: GasTokenPayment feature not enabled");
        require(targets.length == values.length && values.length == datas.length, "SmartAccount: array lengths mismatch");
        
        // First execute the ERC20 transfer to pay for gas
        bytes memory transferCalldata = abi.encodeWithSignature(
            "transfer(address,uint256)", 
            msg.sender, // Send gas payment to the caller
            gasAmount
        );
        
        (bool transferSuccess, bytes memory transferResult) = gasToken.call(transferCalldata);
        require(transferSuccess, "SmartAccount: gas payment failed");
        
        // Then execute the batch transactions
        bytes[] memory results = new bytes[](targets.length);
        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, bytes memory result) = targets[i].call{value: values[i]}(datas[i]);
            require(success, "SmartAccount: batch execution failed");
            results[i] = result;
        }
        
        emit BatchExecuted(targets.length);
        return results;
    }
    
    /**
     * @dev Transfer ownership of the smart account
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "SmartAccount: new owner is the zero address");
        owner = newOwner;
    }
    
    /**
     * @dev Fallback function to receive ETH
     */
    receive() external payable {}
} 