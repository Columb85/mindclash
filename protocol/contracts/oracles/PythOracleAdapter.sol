// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "../interfaces/IOracleAdapter.sol";

/**
 * @title PythOracleAdapter
 * @notice Oracle adapter for Pyth Network price feeds
 * @dev Implements IOracleAdapter interface for Pyth oracle integration
 */
contract PythOracleAdapter is IOracleAdapter, Ownable {
    IPyth public immutable pyth;
    
    // Price feed configurations
    mapping(bytes32 => bool) public supportedPriceIds;
    mapping(bytes32 => string) public priceIdSymbols;
    
    // Constants
    uint256 public constant PRICE_DECIMALS = 8; // Pyth prices have varying decimals, we normalize to 8
    
    constructor(address _pyth, address _initialOwner) Ownable(_initialOwner) {
        require(_pyth != address(0), "Invalid Pyth address");
        pyth = IPyth(_pyth);
    }

    /**
     * @notice Get the latest price for an asset
     * @param priceId Pyth price feed ID
     * @return priceData Latest price data with timestamp
     */
    function getLatestPrice(bytes32 priceId) 
        external 
        view 
        override
        returns (PriceData memory priceData) 
    {
        require(supportedPriceIds[priceId], "Unsupported price feed");
        
        PythStructs.Price memory pythPrice = pyth.getPriceUnsafe(priceId);
        
        priceData = PriceData({
            price: _normalizePrice(pythPrice.price, pythPrice.expo),
            publishTime: pythPrice.publishTime,
            confidence: _normalizePrice(int64(pythPrice.conf), pythPrice.expo)
        });
    }

    /**
     * @notice Get price data with update
     * @param priceId Pyth price feed ID
     * @param updateData Encoded price update data from Pyth network
     * @return priceData Price data after update
     */
    function getPriceWithUpdate(bytes32 priceId, bytes[] calldata updateData)
        external
        payable
        override
        returns (PriceData memory priceData)
    {
        require(supportedPriceIds[priceId], "Unsupported price feed");
        
        // Update price feeds with provided data
        uint256 fee = pyth.getUpdateFee(updateData);
        require(msg.value >= fee, "Insufficient update fee");
        
        pyth.updatePriceFeeds{value: fee}(updateData);
        
        // Get updated price
        PythStructs.Price memory pythPrice = pyth.getPriceNoOlderThan(priceId, 60); // 60 seconds max age
        
        priceData = PriceData({
            price: _normalizePrice(pythPrice.price, pythPrice.expo),
            publishTime: pythPrice.publishTime,
            confidence: _normalizePrice(int64(pythPrice.conf), pythPrice.expo)
        });
        
        emit PriceUpdated(priceId, priceData.price, priceData.publishTime);
        
        // Refund excess ETH using call() instead of transfer() for better compatibility
        if (msg.value > fee) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - fee}("");
            require(success, "Refund failed");
        }
    }

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
    ) external pure override returns (bool isValid) {
        // Price should be published within maxAge seconds of target time
        if (publishTime > targetTime) {
            // Price published after target - should not be more than maxAge seconds after
            return (publishTime - targetTime) <= maxAge;
        } else {
            // Price published before target - should not be more than maxAge seconds before
            return (targetTime - publishTime) <= maxAge;
        }
    }

    /**
     * @notice Get required fee for price update
     * @param updateData Encoded price update data
     * @return fee Required fee in native token (wei)
     */
    function getUpdateFee(bytes[] calldata updateData)
        external
        view
        override
        returns (uint256 fee)
    {
        return pyth.getUpdateFee(updateData);
    }

    /**
     * @notice Normalize Pyth price to 8 decimals
     * @param price Raw price from Pyth
     * @param expo Price exponent from Pyth
     * @return normalizedPrice Price normalized to 8 decimals
     */
    function _normalizePrice(int64 price, int32 expo) internal pure returns (uint256 normalizedPrice) {
        require(price > 0, "Invalid price");
        
        // Pyth prices come with an exponent (e.g., price * 10^expo)
        // We need to normalize to 8 decimals
        int32 targetExpo = -8; // 8 decimal places
        int32 expoShift = targetExpo - expo;
        
        if (expoShift >= 0) {
            // Need to multiply by 10^expoShift
            normalizedPrice = uint256(uint64(price)) * (10 ** uint32(expoShift));
        } else {
            // Need to divide by 10^(-expoShift)
            normalizedPrice = uint256(uint64(price)) / (10 ** uint32(-expoShift));
        }
    }

    /**
     * @notice Add support for a price feed
     * @param priceId Pyth price feed ID
     * @param symbol Human readable symbol (e.g., "BTC/USD")
     */
    function addSupportedPriceFeed(bytes32 priceId, string calldata symbol) external onlyOwner {
        supportedPriceIds[priceId] = true;
        priceIdSymbols[priceId] = symbol;
        
        emit OracleConfigured(priceId, symbol);
    }

    /**
     * @notice Remove support for a price feed
     * @param priceId Pyth price feed ID
     */
    function removeSupportedPriceFeed(bytes32 priceId) external onlyOwner {
        supportedPriceIds[priceId] = false;
        delete priceIdSymbols[priceId];
    }

    /**
     * @notice Get price feed symbol
     * @param priceId Pyth price feed ID
     * @return symbol Human readable symbol
     */
    function getPriceSymbol(bytes32 priceId) external view returns (string memory symbol) {
        return priceIdSymbols[priceId];
    }

    /**
     * @notice Check if price feed is supported
     * @param priceId Pyth price feed ID
     * @return isSupported True if supported
     */
    function isPriceFeedSupported(bytes32 priceId) external view returns (bool isSupported) {
        return supportedPriceIds[priceId];
    }

    /**
     * @notice Get Pyth contract address
     * @return pythContract Address of the Pyth contract
     */
    function getPythContract() external view returns (address pythContract) {
        return address(pyth);
    }

    /**
     * @notice Emergency withdrawal of native tokens (for refunds stuck in contract)
     */
    function emergencyWithdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
    }
}
