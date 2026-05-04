// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IRoundEngine
 * @notice Interface for the prediction round engine
 */
interface IRoundEngine {
    enum RoundStatus {
        Created,
        BettingOpen,
        Locked,
        Closed,
        Claimable,
        Cancelled
    }

    enum BetSide {
        Up,
        Down
    }

    struct Round {
        uint256 roundId;
        bytes32 priceId;          // Oracle price feed ID (e.g., BTC/USD)
        address betToken;         // USDC/USDT address
        uint256 lockTime;         // When betting closes
        uint256 closeTime;        // When round ends
        uint256 lockPrice;        // Price at lock time (8 decimals)
        uint256 closePrice;       // Price at close time (8 decimals)
        uint256 totalUp;          // Total UP bets
        uint256 totalDown;        // Total DOWN bets
        uint256 feeCollected;     // Fee collected from losing side
        RoundStatus status;
        BetSide winner;           // Winning side (only valid after close)
        bool isDraw;              // True if prices are equal
    }

    struct UserBet {
        uint256 amount;
        BetSide side;
        bool claimed;
    }

    /// @notice Place a bet on UP direction
    function betUp(uint256 roundId, uint256 amount) external;
    
    /// @notice Place a bet on DOWN direction
    function betDown(uint256 roundId, uint256 amount) external;
    
    /// @notice Lock a round (set lock price, stop betting)
    function lockRound(uint256 roundId, bytes[] calldata updateData) external payable;
    
    /// @notice Close a round (set close price, determine winner)
    function closeRound(uint256 roundId, bytes[] calldata updateData) external payable;
    
    /// @notice Claim winnings or refund for a round
    function claim(uint256 roundId) external;
    
    /// @notice Get round information
    function getRound(uint256 roundId) external view returns (Round memory);
    
    /// @notice Get user bet information
    function getUserBet(uint256 roundId, address user) external view returns (UserBet memory);
    
    /// @notice Calculate potential payout for a user
    function calculatePayout(uint256 roundId, address user) external view returns (uint256);
    
    /// @notice Check if user can claim for a round
    function canClaim(uint256 roundId, address user) external view returns (bool);

    // Events
    event RoundCreated(uint256 indexed roundId, bytes32 indexed priceId, address betToken, uint256 lockTime, uint256 closeTime);
    event BetPlaced(uint256 indexed roundId, address indexed user, BetSide side, uint256 amount);
    event RoundLocked(uint256 indexed roundId, uint256 lockPrice, uint256 lockTime);
    event RoundClosed(uint256 indexed roundId, uint256 closePrice, BetSide winner, bool isDraw);
    event Claimed(uint256 indexed roundId, address indexed user, uint256 amount);
    event FeeCollected(uint256 indexed roundId, uint256 feeAmount, address treasury);
}
