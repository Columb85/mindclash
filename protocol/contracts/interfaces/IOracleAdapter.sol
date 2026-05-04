// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IOracleAdapter
 * @notice Interface for oracle price feeds with timestamp validation
 * @dev Used to abstract different oracle implementations (Pyth, Chainlink, etc.)
 */
interface IOracleAdapter {
    struct PriceData {
        uint256 price;          // Price with 8 decimals (e.g., $50000.12345678 = 5000012345678)
        uint256 publishTime;    // Timestamp when price was published
        uint256 confidence;     // Price confidence interval
    }

    /**
     * @notice Get the latest price for an asset
     * @param priceId Unique identifier for the price feed (e.g., BTC/USD)
     * @return priceData Latest price data with timestamp
     */
    function getLatestPrice(bytes32 priceId) 
        external 
        view 
        returns (PriceData memory priceData);

    /**
     * @notice Get price data with update (for Pyth-style oracles)
     * @param priceId Unique identifier for the price feed
     * @param updateData Encoded price update data from oracle network
     * @return priceData Price data after update
     */
    function getPriceWithUpdate(bytes32 priceId, bytes[] calldata updateData)
        external
        payable
        returns (PriceData memory priceData);

    /**
     * @notice Check if a price timestamp is within acceptable window
     * @param publishTime Oracle publish timestamp
     * @param targetTime Target timestamp (lock/close time)
     * @param maxAge Maximum acceptable age in seconds
     * @return isValid True if timestamp is within acceptable range
     */
    function isValidTimestamp(
        uint256 publishTime,
        uint256 targetTime,
        uint256 maxAge
    ) external pure returns (bool isValid);

    /**
     * @notice Get required fee for price update (for Pyth-style oracles)
     * @param updateData Encoded price update data
     * @return fee Required fee in native token
     */
    function getUpdateFee(bytes[] calldata updateData)
        external
        view
        returns (uint256 fee);

    /// @notice Emitted when price is updated
    event PriceUpdated(bytes32 indexed priceId, uint256 price, uint256 publishTime);
    
    /// @notice Emitted when oracle configuration changes
    event OracleConfigured(bytes32 indexed priceId, string symbol);
}
