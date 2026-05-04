// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

import "../interfaces/IRoundEngine.sol";
import "../interfaces/IOracleAdapter.sol";

/**
 * @title RoundEngine
 * @notice Core contract for prediction rounds with parimutuel betting
 * @dev Implements 2-phase rounds: Betting -> Lock -> Close -> Claim
 */
contract RoundEngine is IRoundEngine, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant MAX_FEE_BPS = 1000; // 10% max fee
    uint256 public constant MIN_BET_AMOUNT = 1e6; // 1 USDT/USDC (6 decimals)
    uint256 public constant ORACLE_TIMEOUT = 30; // 30 seconds oracle window

    // Configuration
    IOracleAdapter public immutable oracleAdapter;
    address public treasury;
    
    uint256 public feeBps = 200; // 2% fee
    uint256 public treasuryShare = 8000; // 80% to treasury
    uint256 public closerShare = 1000; // 10% to closer
    uint256 public seasonShare = 1000; // 10% to season pool

    uint256 public minBetAmount = MIN_BET_AMOUNT;
    uint256 public maxBetAmount = 1000e6; // 1000 USDT/USDC
    uint256 public maxBetPerDay = 10000e6; // 10k USDT/USDC daily limit per user

    // State
    uint256 public currentRoundId;
    mapping(uint256 => Round) public rounds;
    mapping(uint256 => mapping(address => UserBet)) public userBets;
    mapping(address => mapping(uint256 => uint256)) public userDailyBets; // user -> day -> amount

    // Supported markets
    mapping(bytes32 => bool) public supportedPriceIds;
    mapping(address => bool) public supportedTokens;

    constructor(
        address _oracleAdapter,
        address _treasury,
        address _initialOwner
    ) Ownable(_initialOwner) {
        require(_oracleAdapter != address(0), "Invalid oracle adapter");
        require(_treasury != address(0), "Invalid treasury");
        
        oracleAdapter = IOracleAdapter(_oracleAdapter);
        treasury = _treasury;
    }

    modifier validRound(uint256 roundId) {
        require(rounds[roundId].roundId != 0, "Round does not exist");
        _;
    }

    modifier onlyValidBet(uint256 amount) {
        require(amount >= minBetAmount, "Bet too small");
        require(amount <= maxBetAmount, "Bet too large");
        _;
    }

    /**
     * @notice Create a new prediction round
     */
    function createRound(
        bytes32 priceId,
        address betToken,
        uint256 lockTime,
        uint256 closeTime
    ) external onlyOwner returns (uint256 roundId) {
        require(supportedPriceIds[priceId], "Unsupported price feed");
        require(supportedTokens[betToken], "Unsupported bet token");
        require(lockTime > block.timestamp, "Lock time in past");
        require(closeTime > lockTime, "Invalid close time");
        require(closeTime - lockTime >= 60, "Round too short"); // Min 1 minute
        require(closeTime - lockTime <= 300, "Round too long"); // Max 5 minutes

        roundId = ++currentRoundId;

        rounds[roundId] = Round({
            roundId: roundId,
            priceId: priceId,
            betToken: betToken,
            lockTime: lockTime,
            closeTime: closeTime,
            lockPrice: 0,
            closePrice: 0,
            totalUp: 0,
            totalDown: 0,
            feeCollected: 0,
            status: RoundStatus.BettingOpen,
            winner: BetSide.Up, // Default, will be set correctly on close
            isDraw: false
        });

        emit RoundCreated(roundId, priceId, betToken, lockTime, closeTime);
    }

    /**
     * @notice Place UP bet
     */
    function betUp(uint256 roundId, uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
        validRound(roundId)
        onlyValidBet(amount)
    {
        _placeBet(roundId, BetSide.Up, amount);
    }

    /**
     * @notice Place DOWN bet
     */
    function betDown(uint256 roundId, uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
        validRound(roundId)
        onlyValidBet(amount)
    {
        _placeBet(roundId, BetSide.Down, amount);
    }

    /**
     * @notice Lock round and set lock price
     */
    function lockRound(uint256 roundId, bytes[] calldata updateData)
        external
        payable
        validRound(roundId)
    {
        Round storage round = rounds[roundId];
        require(round.status == RoundStatus.BettingOpen, "Round not open for betting");
        require(block.timestamp >= round.lockTime, "Too early to lock");
        
        // M-02 FIX: Require minimum participation on both sides
        require(round.totalUp > 0 && round.totalDown > 0, "Insufficient participation");

        // Update oracle and get price
        IOracleAdapter.PriceData memory priceData = oracleAdapter.getPriceWithUpdate{value: msg.value}(
            round.priceId, 
            updateData
        );

        // Validate timestamp
        require(
            oracleAdapter.isValidTimestamp(priceData.publishTime, round.lockTime, ORACLE_TIMEOUT),
            "Price timestamp invalid"
        );

        round.lockPrice = priceData.price;
        round.status = RoundStatus.Locked;

        emit RoundLocked(roundId, priceData.price, block.timestamp);
    }

    /**
     * @notice Close round and determine winner
     */
    function closeRound(uint256 roundId, bytes[] calldata updateData) 
        external 
        payable 
        validRound(roundId) 
    {
        Round storage round = rounds[roundId];
        require(round.status == RoundStatus.Locked, "Round not locked");
        require(block.timestamp >= round.closeTime, "Too early to close");

        // Update oracle and get price
        IOracleAdapter.PriceData memory priceData = oracleAdapter.getPriceWithUpdate{value: msg.value}(
            round.priceId, 
            updateData
        );

        // Validate timestamp
        require(
            oracleAdapter.isValidTimestamp(priceData.publishTime, round.closeTime, ORACLE_TIMEOUT),
            "Price timestamp invalid"
        );

        round.closePrice = priceData.price;

        // Determine winner and collect fees
        if (priceData.price > round.lockPrice) {
            round.winner = BetSide.Up;
            round.isDraw = false;
            _collectFees(round, round.totalDown);
        } else if (priceData.price < round.lockPrice) {
            round.winner = BetSide.Down;
            round.isDraw = false;
            _collectFees(round, round.totalUp);
        } else {
            round.isDraw = true;
            // No fees on draw
        }

        round.status = RoundStatus.Claimable;

        // Reward closer with bounty
        if (!round.isDraw && round.feeCollected > 0) {
            uint256 closerBounty = (round.feeCollected * closerShare) / 10000;
            if (closerBounty > 0) {
                IERC20(round.betToken).safeTransfer(msg.sender, closerBounty);
            }
        }

        emit RoundClosed(roundId, priceData.price, round.winner, round.isDraw);
    }

    /**
     * @notice Claim winnings or refund
     */
    function claim(uint256 roundId) 
        external 
        nonReentrant 
        validRound(roundId) 
    {
        require(canClaim(roundId, msg.sender), "Cannot claim");
        
        Round storage round = rounds[roundId];
        UserBet storage userBet = userBets[roundId][msg.sender];
        
        uint256 payout = calculatePayout(roundId, msg.sender);
        require(payout > 0, "No payout available");
        
        userBet.claimed = true;

        IERC20(round.betToken).safeTransfer(msg.sender, payout);
        
        emit Claimed(roundId, msg.sender, payout);
    }

    /**
     * @notice Calculate payout for user
     */
    function calculatePayout(uint256 roundId, address user) 
        public 
        view 
        validRound(roundId)
        returns (uint256) 
    {
        Round memory round = rounds[roundId];
        UserBet memory userBet = userBets[roundId][user];
        
        if (userBet.amount == 0 || userBet.claimed) {
            return 0;
        }

        if (round.status != RoundStatus.Claimable) {
            return 0;
        }

        // Draw: refund original bet
        if (round.isDraw) {
            return userBet.amount;
        }

        // Loss: no payout
        if (userBet.side != round.winner) {
            return 0;
        }

        // Win: original bet + share of losing pool
        uint256 winnersPool = (round.winner == BetSide.Up) ? round.totalUp : round.totalDown;
        uint256 losersPool = (round.winner == BetSide.Up) ? round.totalDown : round.totalUp;
        uint256 distributable = losersPool - round.feeCollected;

        return userBet.amount + (distributable * userBet.amount) / winnersPool;
    }

    /**
     * @notice Check if user can claim
     */
    function canClaim(uint256 roundId, address user) 
        public 
        view 
        returns (bool) 
    {
        if (rounds[roundId].roundId == 0) return false;
        if (rounds[roundId].status != RoundStatus.Claimable) return false;
        if (userBets[roundId][user].amount == 0) return false;
        if (userBets[roundId][user].claimed) return false;
        
        return true;
    }

    /**
     * @notice Get round info
     */
    function getRound(uint256 roundId) 
        external 
        view 
        returns (Round memory) 
    {
        return rounds[roundId];
    }

    /**
     * @notice Get user bet info
     */
    function getUserBet(uint256 roundId, address user) 
        external 
        view 
        returns (UserBet memory) 
    {
        return userBets[roundId][user];
    }

    // Internal functions

    function _placeBet(uint256 roundId, BetSide side, uint256 amount) internal {
        Round storage round = rounds[roundId];
        require(round.status == RoundStatus.BettingOpen, "Betting closed");
        require(block.timestamp < round.lockTime, "Betting period ended");

        // Check daily limits
        uint256 today = block.timestamp / 86400;
        require(
            userDailyBets[msg.sender][today] + amount <= maxBetPerDay,
            "Daily limit exceeded"
        );

        // Transfer tokens
        IERC20(round.betToken).safeTransferFrom(msg.sender, address(this), amount);

        // Update state
        UserBet storage userBet = userBets[roundId][msg.sender];
        require(userBet.amount == 0, "Already bet on this round");

        userBet.amount = amount;
        userBet.side = side;
        userBet.claimed = false;

        if (side == BetSide.Up) {
            round.totalUp += amount;
        } else {
            round.totalDown += amount;
        }

        userDailyBets[msg.sender][today] += amount;

        emit BetPlaced(roundId, msg.sender, side, amount);
    }

    function _collectFees(Round storage round, uint256 losersPool) internal {
        if (losersPool == 0) return;

        uint256 totalFee = (losersPool * feeBps) / 10000;
        round.feeCollected = totalFee;

        if (totalFee > 0) {
            uint256 treasuryAmount = (totalFee * treasuryShare) / 10000;
            uint256 seasonAmount = (totalFee * seasonShare) / 10000;
            // Closer bounty handled in closeRound

            if (treasuryAmount > 0) {
                IERC20(round.betToken).safeTransfer(treasury, treasuryAmount);
            }

            // Season pool transfer (implement treasury contract to handle this)
            if (seasonAmount > 0) {
                IERC20(round.betToken).safeTransfer(treasury, seasonAmount);
            }

            emit FeeCollected(round.roundId, totalFee, treasury);
        }
    }

    // Admin functions

    function setSupportedPriceId(bytes32 priceId, bool supported) external onlyOwner {
        supportedPriceIds[priceId] = supported;
    }

    function setSupportedToken(address token, bool supported) external onlyOwner {
        supportedTokens[token] = supported;
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }

    function setFeeConfiguration(
        uint256 _feeBps,
        uint256 _treasuryShare,
        uint256 _closerShare,
        uint256 _seasonShare
    ) external onlyOwner {
        require(_feeBps <= MAX_FEE_BPS, "Fee too high");
        require(_treasuryShare + _closerShare + _seasonShare == 10000, "Shares must sum to 100%");
        
        feeBps = _feeBps;
        treasuryShare = _treasuryShare;
        closerShare = _closerShare;
        seasonShare = _seasonShare;
    }

    function setBetLimits(
        uint256 _minBetAmount,
        uint256 _maxBetAmount,
        uint256 _maxBetPerDay
    ) external onlyOwner {
        require(_minBetAmount > 0, "Invalid min bet");
        require(_maxBetAmount >= _minBetAmount, "Invalid max bet");
        
        minBetAmount = _minBetAmount;
        maxBetAmount = _maxBetAmount;
        maxBetPerDay = _maxBetPerDay;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Emergency functions
    
    function cancelRound(uint256 roundId) external onlyOwner validRound(roundId) {
        Round storage round = rounds[roundId];
        require(round.status == RoundStatus.BettingOpen || round.status == RoundStatus.Locked, "Cannot cancel");
        
        round.status = RoundStatus.Cancelled;
        round.isDraw = true; // Treat as draw for refunds
    }
}
