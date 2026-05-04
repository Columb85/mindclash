// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IOracleAdapter.sol";

/**
 * @title MockOracle
 * @notice Mock oracle for testing purposes
 * @dev Implements IOracleAdapter interface with controllable prices
 */
contract MockOracle is IOracleAdapter {
    mapping(bytes32 => PriceData) public prices;
    mapping(bytes32 => bool) public supportedPriceIds;
    
    uint256 public constant UPDATE_FEE = 0.001 ether;
    
    constructor() {
        // Add default test price feeds
        bytes32 btcId = 0xe62df6c8b4c85672d33c0b1d8c9da3468b0c4e3a9f3c2b1a8e7f9d6c5b4a3e2d;
        bytes32 ethId = 0xf1c2b3a4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9f0a1b2c3d4e5f6a7b8c9d0e1f2;
        bytes32 solId = 0xa2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3;
        
        supportedPriceIds[btcId] = true;
        supportedPriceIds[ethId] = true;
        supportedPriceIds[solId] = true;
        
        // Set default prices
        prices[btcId] = PriceData({
            price: 50000_00000000, // $50,000 with 8 decimals
            publishTime: block.timestamp,
            confidence: 1000_00000000 // $1,000 confidence
        });
        
        prices[ethId] = PriceData({
            price: 3000_00000000, // $3,000 with 8 decimals
            publishTime: block.timestamp,
            confidence: 50_00000000 // $50 confidence
        });
        
        prices[solId] = PriceData({
            price: 100_00000000, // $100 with 8 decimals
            publishTime: block.timestamp,
            confidence: 5_00000000 // $5 confidence
        });
    }
    
    /**
     * @notice Get the latest price for an asset
     */
    function getLatestPrice(bytes32 priceId) 
        external 
        view 
        override
        returns (PriceData memory priceData) 
    {
        require(supportedPriceIds[priceId], "Unsupported price feed");
        return prices[priceId];
    }

    /**
     * @notice Get price data with update (mock implementation)
     */
    function getPriceWithUpdate(bytes32 priceId, bytes[] calldata /* updateData */)
        external
        payable
        override
        returns (PriceData memory priceData)
    {
        require(supportedPriceIds[priceId], "Unsupported price feed");
        require(msg.value >= UPDATE_FEE, "Insufficient update fee");
        
        // Update timestamp to current block
        prices[priceId].publishTime = block.timestamp;
        
        priceData = prices[priceId];
        
        emit PriceUpdated(priceId, priceData.price, priceData.publishTime);
        
        // Refund excess
        if (msg.value > UPDATE_FEE) {
            payable(msg.sender).transfer(msg.value - UPDATE_FEE);
        }
    }

    /**
     * @notice Check if timestamp is valid
     */
    function isValidTimestamp(
        uint256 publishTime,
        uint256 targetTime,
        uint256 maxAge
    ) external pure override returns (bool isValid) {
        if (publishTime > targetTime) {
            return (publishTime - targetTime) <= maxAge;
        } else {
            return (targetTime - publishTime) <= maxAge;
        }
    }

    /**
     * @notice Get update fee
     */
    function getUpdateFee(bytes[] calldata /* updateData */)
        external
        pure
        override
        returns (uint256 fee)
    {
        return UPDATE_FEE;
    }
    
    // Test helper functions
    
    /**
     * @notice Set price for testing
     */
    function setPrice(bytes32 priceId, uint256 price, uint256 confidence) external {
        require(supportedPriceIds[priceId], "Unsupported price feed");
        
        prices[priceId] = PriceData({
            price: price,
            publishTime: block.timestamp,
            confidence: confidence
        });
        
        emit PriceUpdated(priceId, price, block.timestamp);
    }
    
    /**
     * @notice Set price with custom timestamp
     */
    function setPriceWithTimestamp(
        bytes32 priceId, 
        uint256 price, 
        uint256 confidence, 
        uint256 publishTime
    ) external {
        require(supportedPriceIds[priceId], "Unsupported price feed");
        
        prices[priceId] = PriceData({
            price: price,
            publishTime: publishTime,
            confidence: confidence
        });
        
        emit PriceUpdated(priceId, price, publishTime);
    }
    
    /**
     * @notice Add supported price ID
     */
    function addSupportedPriceId(bytes32 priceId) external {
        supportedPriceIds[priceId] = true;
        emit OracleConfigured(priceId, "TEST");
    }
    
    /**
     * @notice Get default price IDs for testing
     */
    function getDefaultPriceIds() external pure returns (bytes32 btc, bytes32 eth, bytes32 sol) {
        btc = 0xe62df6c8b4c85672d33c0b1d8c9da3468b0c4e3a9f3c2b1a8e7f9d6c5b4a3e2d;
        eth = 0xf1c2b3a4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9f0a1b2c3d4e5f6a7b8c9d0e1f2;
        sol = 0xa2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3;
    }
}
