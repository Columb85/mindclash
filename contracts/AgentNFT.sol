// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title ERC-8004 Agent NFT
 * @dev NFT representing AI agent identity and achievements
 * Based on ERC-8004 standard for on-chain AI agent representation
 */
contract AgentNFT is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _tokenIds;
    
    struct AgentProfile {
        string name;
        string version;
        uint256 createdAt;
        uint256 totalDecisions;
        uint256 correctDecisions;
        uint256 totalPnL;
        bool isActive;
    }
    
    struct DecisionRecord {
        string direction;      // "UP", "DOWN", or "HOLD"
        uint256 confidence;    // 0-1000 (0.1% precision)
        uint256 stake;         // Amount staked
        uint256 timestamp;
        bool wasCorrect;
        int256 pnl;
        string reasoning;      // Decision reasoning
        bytes32 decisionHash;  // On-chain verification
    }
    
    // Mapping from token ID to agent profile
    mapping(uint256 => AgentProfile) public agentProfiles;
    
    // Mapping from token ID to decision history
    mapping(uint256 => DecisionRecord[]) public decisionHistory;
    
    // Mapping from agent address to token ID
    mapping(address => uint256) public agentToToken;
    
    // Events
    event AgentCreated(
        uint256 indexed tokenId,
        address indexed agentAddress,
        string name,
        string version
    );
    
    event DecisionRecorded(
        uint256 indexed tokenId,
        string direction,
        uint256 confidence,
        uint256 stake,
        bytes32 decisionHash
    );
    
    event DecisionResolved(
        uint256 indexed tokenId,
        uint256 decisionIndex,
        bool wasCorrect,
        int256 pnl
    );
    
    event AgentUpdated(
        uint256 indexed tokenId,
        uint256 totalDecisions,
        uint256 correctDecisions,
        uint256 totalPnL
    );
    
    constructor() ERC721("AI Agent NFT", "AGENT") {}
    
    /**
     * @dev Create new agent NFT
     * @param agentAddress Address of the AI agent
     * @param name Agent name
     * @param version Agent version
     * @param tokenURI Metadata URI
     */
    function createAgent(
        address agentAddress,
        string memory name,
        string memory version,
        string memory tokenURI
    ) external returns (uint256) {
        require(agentAddress != address(0), "Invalid agent address");
        require(agentToToken[agentAddress] == 0, "Agent already exists");
        
        _tokenIds.increment();
        uint256 tokenId = _tokenIds.current();
        
        // Mint NFT to agent address
        _safeMint(agentAddress, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        // Create agent profile
        agentProfiles[tokenId] = AgentProfile({
            name: name,
            version: version,
            createdAt: block.timestamp,
            totalDecisions: 0,
            correctDecisions: 0,
            totalPnL: 0,
            isActive: true
        });
        
        agentToToken[agentAddress] = tokenId;
        
        emit AgentCreated(tokenId, agentAddress, name, version);
        
        return tokenId;
    }
    
    /**
     * @dev Record trading decision on-chain
     * @param tokenId Agent token ID
     * @param direction Trading direction
     * @param confidence Decision confidence (0-1000)
     * @param stake Amount staked
     * @param reasoning Decision reasoning
     */
    function recordDecision(
        uint256 tokenId,
        string memory direction,
        uint256 confidence,
        uint256 stake,
        string memory reasoning
    ) external returns (bytes32) {
        require(_exists(tokenId), "Agent does not exist");
        require(agentProfiles[tokenId].isActive, "Agent not active");
        require(confidence <= 1000, "Invalid confidence");
        
        // Create decision hash for verification
        bytes32 decisionHash = keccak256(
            abi.encodePacked(
                tokenId,
                direction,
                confidence,
                stake,
                block.timestamp,
                reasoning
            )
        );
        
        // Add to decision history
        decisionHistory[tokenId].push(DecisionRecord({
            direction: direction,
            confidence: confidence,
            stake: stake,
            timestamp: block.timestamp,
            wasCorrect: false, // Will be set when resolved
            pnl: 0,
            reasoning: reasoning,
            decisionHash: decisionHash
        }));
        
        emit DecisionRecorded(tokenId, direction, confidence, stake, decisionHash);
        
        return decisionHash;
    }
    
    /**
     * @dev Resolve decision outcome
     * @param tokenId Agent token ID
     * @param decisionIndex Index of decision to resolve
     * @param wasCorrect Whether decision was correct
     * @param pnl Profit/loss amount
     */
    function resolveDecision(
        uint256 tokenId,
        uint256 decisionIndex,
        bool wasCorrect,
        int256 pnl
    ) external {
        require(_exists(tokenId), "Agent does not exist");
        require(decisionIndex < decisionHistory[tokenId].length, "Invalid decision index");
        
        DecisionRecord storage decision = decisionHistory[tokenId][decisionIndex];
        require(!decision.wasCorrect, "Decision already resolved");
        
        // Update decision
        decision.wasCorrect = wasCorrect;
        decision.pnl = pnl;
        
        // Update agent profile
        AgentProfile storage profile = agentProfiles[tokenId];
        profile.totalDecisions++;
        if (wasCorrect) {
            profile.correctDecisions++;
        }
        profile.totalPnL += uint256(pnl >= 0 ? pnl : -pnl);
        
        emit DecisionResolved(tokenId, decisionIndex, wasCorrect, pnl);
        emit AgentUpdated(tokenId, profile.totalDecisions, profile.correctDecisions, profile.totalPnL);
    }
    
    /**
     * @dev Get agent statistics
     * @param tokenId Agent token ID
     */
    function getAgentStats(uint256 tokenId) external view returns (
        uint256 totalDecisions,
        uint256 correctDecisions,
        uint256 totalPnL,
        uint256 winRate,
        bool isActive
    ) {
        require(_exists(tokenId), "Agent does not exist");
        
        AgentProfile memory profile = agentProfiles[tokenId];
        winRate = profile.totalDecisions > 0 
            ? (profile.correctDecisions * 10000) / profile.totalDecisions 
            : 0;
        
        return (
            profile.totalDecisions,
            profile.correctDecisions,
            profile.totalPnL,
            winRate,
            profile.isActive
        );
    }
    
    /**
     * @dev Get recent decisions
     * @param tokenId Agent token ID
     * @param limit Maximum number of decisions to return
     */
    function getRecentDecisions(uint256 tokenId, uint256 limit) external view returns (DecisionRecord[] memory) {
        require(_exists(tokenId), "Agent does not exist");
        
        DecisionRecord[] storage allDecisions = decisionHistory[tokenId];
        uint256 length = allDecisions.length;
        
        if (length == 0) {
            return new DecisionRecord[](0);
        }
        
        uint256 returnLength = length > limit ? limit : length;
        DecisionRecord[] memory recentDecisions = new DecisionRecord[](returnLength);
        
        for (uint256 i = 0; i < returnLength; i++) {
            recentDecisions[i] = allDecisions[length - returnLength + i];
        }
        
        return recentDecisions;
    }
    
    /**
     * @dev Activate/deactivate agent
     * @param tokenId Agent token ID
     * @param isActive Active status
     */
    function setAgentActive(uint256 tokenId, bool isActive) external {
        require(_exists(tokenId), "Agent does not exist");
        require(ownerOf(tokenId) == msg.sender || owner() == msg.sender, "Not authorized");
        
        agentProfiles[tokenId].isActive = isActive;
    }
    
    /**
     * @dev Set registry address (only owner)
     * @param registryAddress Address of AgentRegistry contract
     */
    function setRegistry(address registryAddress) external onlyOwner {
        require(registryAddress != address(0), "Invalid registry address");
        // Note: In production, you might want to store this in a state variable
        // For now, we'll rely on the AgentRegistry to manage this relationship
    }
    
    // The following functions are overrides required by Solidity.
    
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
