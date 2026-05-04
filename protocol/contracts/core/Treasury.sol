// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Treasury
 * @notice Manages protocol fees and season rewards
 * @dev Receives fees from RoundEngine and distributes season rewards
 */
contract Treasury is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct SeasonConfig {
        uint256 startTime;
        uint256 endTime;
        uint256 totalRewards;
        bool isActive;
        mapping(address => uint256) userRewards;
        address[] rewardTokens;
        mapping(address => uint256) tokenAllocations; // token -> amount allocated
    }

    // State
    mapping(uint256 => SeasonConfig) public seasons;
    uint256 public currentSeasonId;
    
    // Fee tracking
    mapping(address => uint256) public collectedFees; // token -> total fees collected
    mapping(address => uint256) public seasonAllocations; // token -> allocated to seasons
    
    // Authorized contracts that can report fees
    mapping(address => bool) public authorizedReporters;

    // Tracking claimed amounts per season
    mapping(uint256 => mapping(address => uint256)) public claimedAmounts; // seasonId -> token -> amount claimed

    // Events
    event FeeReceived(address indexed token, uint256 amount, address indexed from);
    event SeasonCreated(uint256 indexed seasonId, uint256 startTime, uint256 endTime, uint256 totalRewards);
    event SeasonRewardAllocated(uint256 indexed seasonId, address indexed token, uint256 amount);
    event RewardClaimed(uint256 indexed seasonId, address indexed user, address indexed token, uint256 amount);
    event AuthorizedReporterUpdated(address indexed reporter, bool authorized);
    event RewardsAllocated(uint256 indexed seasonId, uint256 usersCount, uint256 totalBps);
    event ExcessFeesWithdrawn(address indexed token, uint256 amount, address indexed recipient);

    constructor(address _initialOwner) Ownable(_initialOwner) {}

    modifier onlyAuthorized() {
        require(authorizedReporters[msg.sender], "Not authorized");
        _;
    }

    /**
     * @notice Receive fees from protocol operations
     * @param token The token being deposited
     * @param amount Amount of tokens
     */
    function receiveFees(address token, uint256 amount) external onlyAuthorized {
        require(amount > 0, "Invalid amount");
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        collectedFees[token] += amount;
        
        emit FeeReceived(token, amount, msg.sender);
    }

    /**
     * @notice Create a new season for rewards
     * @param startTime When the season starts
     * @param endTime When the season ends
     * @param rewardTokens Array of tokens to distribute as rewards
     * @param tokenAmounts Array of amounts for each token
     */
    function createSeason(
        uint256 startTime,
        uint256 endTime,
        address[] calldata rewardTokens,
        uint256[] calldata tokenAmounts
    ) external onlyOwner returns (uint256 seasonId) {
        require(startTime > block.timestamp, "Start time in past");
        require(endTime > startTime, "Invalid end time");
        require(rewardTokens.length == tokenAmounts.length, "Array length mismatch");
        require(rewardTokens.length > 0, "No reward tokens");

        // End current season if active
        if (currentSeasonId > 0 && seasons[currentSeasonId].isActive) {
            seasons[currentSeasonId].isActive = false;
        }

        seasonId = ++currentSeasonId;
        SeasonConfig storage season = seasons[seasonId];
        
        season.startTime = startTime;
        season.endTime = endTime;
        season.isActive = true;
        
        uint256 totalRewardValue = 0;
        
        for (uint256 i = 0; i < rewardTokens.length; i++) {
            address token = rewardTokens[i];
            uint256 amount = tokenAmounts[i];
            
            require(amount > 0, "Invalid token amount");
            require(collectedFees[token] >= seasonAllocations[token] + amount, "Insufficient fees");
            
            season.rewardTokens.push(token);
            season.tokenAllocations[token] = amount;
            seasonAllocations[token] += amount;
            
            totalRewardValue += amount; // Simplified - should use price oracle for real value
            
            emit SeasonRewardAllocated(seasonId, token, amount);
        }
        
        season.totalRewards = totalRewardValue;
        
        emit SeasonCreated(seasonId, startTime, endTime, totalRewardValue);
    }

    /**
     * @notice Allocate rewards to users (called by authorized reporter, e.g., backend)
     * @param seasonId The season to allocate rewards for
     * @param users Array of user addresses
     * @param amounts Array of reward amounts (in basis points, 10000 = 100%)
     */
    function allocateRewards(
        uint256 seasonId,
        address[] calldata users,
        uint256[] calldata amounts
    ) external onlyAuthorized {
        require(users.length == amounts.length, "Array length mismatch");
        require(users.length <= 100, "Too many users in single call"); // Gas limit protection
        require(seasons[seasonId].startTime > 0, "Season does not exist");
        require(block.timestamp > seasons[seasonId].endTime, "Season not ended");
        
        SeasonConfig storage season = seasons[seasonId];
        uint256 totalAllocated = 0;
        
        for (uint256 i = 0; i < users.length; i++) {
            require(amounts[i] > 0 && amounts[i] <= 10000, "Invalid amount");
            // M-01 FIX: Prevent re-allocation of rewards
            require(season.userRewards[users[i]] == 0, "User already allocated");
            season.userRewards[users[i]] = amounts[i];
            totalAllocated += amounts[i];
        }
        
        require(totalAllocated <= 10000, "Total allocation exceeds 100%");
        
        // M-05 FIX: Emit event for tracking
        emit RewardsAllocated(seasonId, users.length, totalAllocated);
    }

    /**
     * @notice Claim season rewards
     * @param seasonId The season to claim rewards from
     */
    function claimSeasonRewards(uint256 seasonId) external nonReentrant {
        require(seasons[seasonId].startTime > 0, "Season does not exist");
        require(block.timestamp > seasons[seasonId].endTime, "Season not ended");
        
        SeasonConfig storage season = seasons[seasonId];
        uint256 userShare = season.userRewards[msg.sender];
        require(userShare > 0, "No rewards allocated");
        
        // Clear user rewards to prevent double claiming
        season.userRewards[msg.sender] = 0;
        
        // Transfer each reward token
        for (uint256 i = 0; i < season.rewardTokens.length; i++) {
            address token = season.rewardTokens[i];
            uint256 totalTokenReward = season.tokenAllocations[token];
            uint256 userTokenReward = (totalTokenReward * userShare) / 10000;
            
            if (userTokenReward > 0) {
                IERC20(token).safeTransfer(msg.sender, userTokenReward);
                
                // H-02 FIX: Track claimed amounts and decrease season allocations
                claimedAmounts[seasonId][token] += userTokenReward;
                seasonAllocations[token] -= userTokenReward;
                
                emit RewardClaimed(seasonId, msg.sender, token, userTokenReward);
            }
        }
    }

    /**
     * @notice Withdraw excess fees (not allocated to seasons)
     * @param token Token to withdraw
     * @param amount Amount to withdraw
     * @param recipient Recipient address
     */
    function withdrawExcessFees(
        address token,
        uint256 amount,
        address recipient
    ) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        
        uint256 available = collectedFees[token] - seasonAllocations[token];
        require(amount <= available, "Amount exceeds available");
        
        IERC20(token).safeTransfer(recipient, amount);
        collectedFees[token] -= amount;
        
        // M-05 FIX: Emit event for tracking
        emit ExcessFeesWithdrawn(token, amount, recipient);
    }

    /**
     * @notice Set authorized reporter status
     * @param reporter Address to update
     * @param authorized Whether the address is authorized
     */
    function setAuthorizedReporter(address reporter, bool authorized) external onlyOwner {
        authorizedReporters[reporter] = authorized;
        emit AuthorizedReporterUpdated(reporter, authorized);
    }

    /**
     * @notice Get season information
     * @param seasonId Season ID
     */
    function getSeasonInfo(uint256 seasonId) external view returns (
        uint256 startTime,
        uint256 endTime,
        uint256 totalRewards,
        bool isActive,
        address[] memory rewardTokens
    ) {
        SeasonConfig storage season = seasons[seasonId];
        return (
            season.startTime,
            season.endTime,
            season.totalRewards,
            season.isActive,
            season.rewardTokens
        );
    }

    /**
     * @notice Get user's reward allocation for a season
     * @param seasonId Season ID
     * @param user User address
     */
    function getUserRewards(uint256 seasonId, address user) external view returns (uint256) {
        return seasons[seasonId].userRewards[user];
    }

    /**
     * @notice Get token allocation for a season
     * @param seasonId Season ID
     * @param token Token address
     */
    function getSeasonTokenAllocation(uint256 seasonId, address token) external view returns (uint256) {
        return seasons[seasonId].tokenAllocations[token];
    }

    /**
     * @notice Get available fees for withdrawal
     * @param token Token address
     */
    function getAvailableFees(address token) external view returns (uint256) {
        return collectedFees[token] - seasonAllocations[token];
    }

    /**
     * @notice Emergency withdrawal (only owner)
     * @dev Should only be used in emergencies
     */
    function emergencyWithdraw(address token, uint256 amount, address recipient) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        IERC20(token).safeTransfer(recipient, amount);
    }
}
