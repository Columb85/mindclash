// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./AgentNFT.sol";

/**
 * @title Agent Registry
 * @dev Registry for managing AI agents and their on-chain activities
 * Implements benchmarking and performance tracking for Turing Test Hackathon
 */
contract AgentRegistry is Ownable, ReentrancyGuard {
    
    AgentNFT public immutable agentNFT;
    
    struct BenchmarkSession {
        uint256 startTime;
        uint256 endTime;
        uint256 totalAgents;
        uint256 activeAgents;
        bool isActive;
    }
    
    struct GlobalLeaderboard {
        address agentAddress;
        uint256 tokenId;
        uint256 winRate;
        uint256 totalPnL;
        uint256 decisionsCount;
        uint256 lastUpdate;
    }
    
    // Current benchmark session
    BenchmarkSession public currentSession;
    
    // Global leaderboard (sorted by performance)
    GlobalLeaderboard[] public leaderboard;
    
    // Mapping from agent address to leaderboard index
    mapping(address => uint256) public agentLeaderboardIndex;
    
    // Performance tracking
    mapping(address => uint256) public agentSessionDecisions;
    mapping(address => uint256) public agentSessionWins;
    mapping(address => int256) public agentSessionPnL;
    
    // Events
    event SessionStarted(uint256 startTime, uint256 endTime);
    event SessionEnded(uint256 endTime, uint256 totalAgents);
    event AgentRegistered(address indexed agentAddress, uint256 tokenId);
    event LeaderboardUpdated(address indexed agentAddress, uint256 rank, uint256 winRate);
    event BenchmarkResult(
        address indexed agentAddress,
        uint256 decisions,
        uint256 wins,
        int256 pnl,
        uint256 timestamp
    );
    
    constructor(address _agentNFTAddress) {
        agentNFT = AgentNFT(_agentNFTAddress);
    }
    
    /**
     * @dev Start new benchmark session
     * @param duration Session duration in seconds
     */
    function startSession(uint256 duration) external onlyOwner {
        require(!currentSession.isActive, "Session already active");
        
        currentSession = BenchmarkSession({
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            totalAgents: 0,
            activeAgents: 0,
            isActive: true
        });
        
        emit SessionStarted(currentSession.startTime, currentSession.endTime);
    }
    
    /**
     * @dev End current benchmark session
     */
    function endSession() external onlyOwner {
        require(currentSession.isActive, "No active session");
        
        currentSession.isActive = false;
        currentSession.endTime = block.timestamp;
        
        emit SessionEnded(currentSession.endTime, currentSession.totalAgents);
    }
    
    /**
     * @dev Register AI agent for benchmarking
     * @param agentAddress Agent contract address
     * @param name Agent name
     * @param version Agent version
     * @param tokenURI Metadata URI
     */
    function registerAgent(
        address agentAddress,
        string memory name,
        string memory version,
        string memory tokenURI
    ) external nonReentrant returns (uint256) {
        require(currentSession.isActive, "No active session");
        require(agentAddress != address(0), "Invalid address");
        require(agentLeaderboardIndex[agentAddress] == 0, "Agent already registered");
        
        // Create agent NFT
        uint256 tokenId = agentNFT.createAgent(agentAddress, name, version, tokenURI);
        
        // Update session stats
        currentSession.totalAgents++;
        currentSession.activeAgents++;
        
        // Add to leaderboard
        leaderboard.push(GlobalLeaderboard({
            agentAddress: agentAddress,
            tokenId: tokenId,
            winRate: 0,
            totalPnL: 0,
            decisionsCount: 0,
            lastUpdate: block.timestamp
        }));
        
        agentLeaderboardIndex[agentAddress] = leaderboard.length - 1;
        
        emit AgentRegistered(agentAddress, tokenId);
        emit LeaderboardUpdated(agentAddress, leaderboard.length - 1, 0);
        
        return tokenId;
    }
    
    /**
     * @dev Record agent decision for benchmarking
     * @param agentAddress Agent address
     * @param direction Decision direction
     * @param confidence Decision confidence (0-1000)
     * @param stake Amount staked
     * @param reasoning Decision reasoning
     */
    function recordAgentDecision(
        address agentAddress,
        string memory direction,
        uint256 confidence,
        uint256 stake,
        string memory reasoning
    ) external nonReentrant returns (bytes32) {
        require(currentSession.isActive, "No active session");
        require(agentLeaderboardIndex[agentAddress] != 0, "Agent not registered");
        
        uint256 tokenId = agentLeaderboardIndex[agentAddress];
        
        // Record decision in NFT contract
        bytes32 decisionHash = agentNFT.recordDecision(
            tokenId,
            direction,
            confidence,
            stake,
            reasoning
        );
        
        // Update session stats
        agentSessionDecisions[agentAddress]++;
        
        return decisionHash;
    }
    
    /**
     * @dev Resolve agent decision and update performance
     * @param agentAddress Agent address
     * @param decisionIndex Decision index
     * @param wasCorrect Whether decision was correct
     * @param pnl Profit/loss amount
     */
    function resolveAgentDecision(
        address agentAddress,
        uint256 decisionIndex,
        bool wasCorrect,
        int256 pnl
    ) external nonReentrant {
        require(currentSession.isActive, "No active session");
        require(agentLeaderboardIndex[agentAddress] != 0, "Agent not registered");
        
        uint256 tokenId = agentLeaderboardIndex[agentAddress];
        
        // Resolve decision in NFT contract
        agentNFT.resolveDecision(tokenId, decisionIndex, wasCorrect, pnl);
        
        // Update session stats
        if (wasCorrect) {
            agentSessionWins[agentAddress]++;
        }
        agentSessionPnL[agentAddress] += pnl;
        
        // Update leaderboard
        _updateLeaderboard(agentAddress);
        
        emit BenchmarkResult(
            agentAddress,
            agentSessionDecisions[agentAddress],
            agentSessionWins[agentAddress],
            agentSessionPnL[agentAddress],
            block.timestamp
        );
    }
    
    /**
     * @dev Update agent leaderboard position
     * @param agentAddress Agent address
     */
    function _updateLeaderboard(address agentAddress) internal {
        uint256 index = agentLeaderboardIndex[agentAddress];
        require(index < leaderboard.length, "Invalid index");
        
        // Get current stats from NFT contract
        (
            uint256 totalDecisions,
            uint256 correctDecisions,
            uint256 totalPnL,
            uint256 winRate,
            bool isActive
        ) = agentNFT.getAgentStats(index);
        
        // Update leaderboard entry
        GlobalLeaderboard storage entry = leaderboard[index];
        entry.winRate = winRate;
        entry.totalPnL = totalPnL;
        entry.decisionsCount = totalDecisions;
        entry.lastUpdate = block.timestamp;
        
        // Re-sort leaderboard if needed (simple implementation)
        // In production, use more efficient sorting algorithm
        _sortLeaderboard();
        
        emit LeaderboardUpdated(agentAddress, agentLeaderboardIndex[agentAddress], winRate);
    }
    
    /**
     * @dev Sort leaderboard by performance (win rate, then PnL)
     */
    function _sortLeaderboard() internal {
        // Simple bubble sort for demonstration
        // In production, use more efficient algorithm
        for (uint256 i = 0; i < leaderboard.length - 1; i++) {
            for (uint256 j = 0; j < leaderboard.length - i - 1; j++) {
                if (_shouldSwap(leaderboard[j], leaderboard[j + 1])) {
                    // Swap entries
                    GlobalLeaderboard memory temp = leaderboard[j];
                    leaderboard[j] = leaderboard[j + 1];
                    leaderboard[j + 1] = temp;
                    
                    // Update index mappings
                    agentLeaderboardIndex[leaderboard[j].agentAddress] = j;
                    agentLeaderboardIndex[leaderboard[j + 1].agentAddress] = j + 1;
                }
            }
        }
    }
    
    /**
     * @dev Check if two leaderboard entries should be swapped
     */
    function _shouldSwap(
        GlobalLeaderboard memory a,
        GlobalLeaderboard memory b
    ) internal pure returns (bool) {
        // Sort by win rate first, then by total PnL
        if (a.winRate != b.winRate) {
            return a.winRate < b.winRate;
        }
        return a.totalPnL < b.totalPnL;
    }
    
    /**
     * @dev Get top agents from leaderboard
     * @param limit Maximum number of agents to return
     */
    function getTopAgents(uint256 limit) external view returns (GlobalLeaderboard[] memory) {
        uint256 returnLength = limit > leaderboard.length ? leaderboard.length : limit;
        GlobalLeaderboard[] memory topAgents = new GlobalLeaderboard[](returnLength);
        
        for (uint256 i = 0; i < returnLength; i++) {
            topAgents[i] = leaderboard[i];
        }
        
        return topAgents;
    }
    
    /**
     * @dev Get agent session performance
     * @param agentAddress Agent address
     */
    function getAgentSessionPerformance(address agentAddress) external view returns (
        uint256 decisions,
        uint256 wins,
        int256 pnl,
        uint256 winRate
    ) {
        decisions = agentSessionDecisions[agentAddress];
        wins = agentSessionWins[agentAddress];
        pnl = agentSessionPnL[agentAddress];
        winRate = decisions > 0 ? (wins * 10000) / decisions : 0;
    }
    
    /**
     * @dev Get current session info
     */
    function getCurrentSession() external view returns (
        uint256 startTime,
        uint256 endTime,
        uint256 totalAgents,
        uint256 activeAgents,
        bool isActive
    ) {
        BenchmarkSession memory session = currentSession;
        return (
            session.startTime,
            session.endTime,
            session.totalAgents,
            session.activeAgents,
            session.isActive
        );
    }
}
