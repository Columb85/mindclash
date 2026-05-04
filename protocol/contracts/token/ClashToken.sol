// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ClashToken
 * @notice The native token for MindClash platform
 * @dev ERC20 token with minting capability for faucet functionality
 */
contract ClashToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18; // 100M CLASH
    uint256 public constant FAUCET_AMOUNT = 1000 * 10**18; // 1000 CLASH per claim
    uint256 public constant FAUCET_COOLDOWN = 24 hours;
    
    mapping(address => uint256) public lastFaucetClaim;
    
    event FaucetClaimed(address indexed user, uint256 amount);
    
    constructor(address _initialOwner) ERC20("Clash Token", "CLASH") Ownable(_initialOwner) {
        // Mint initial supply to deployer for distribution
        _mint(_initialOwner, 10_000_000 * 10**18); // 10M initial
    }
    
    /**
     * @notice Claim free CLASH tokens from faucet (testnet only)
     * @dev Limited to once per 24 hours per address
     */
    function claimFaucet() external {
        require(
            block.timestamp >= lastFaucetClaim[msg.sender] + FAUCET_COOLDOWN,
            "Faucet: cooldown not expired"
        );
        require(totalSupply() + FAUCET_AMOUNT <= MAX_SUPPLY, "Faucet: max supply reached");
        
        lastFaucetClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        
        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }
    
    /**
     * @notice Check if user can claim from faucet
     * @param user Address to check
     * @return canClaim True if user can claim
     * @return timeLeft Seconds until next claim (0 if can claim now)
     */
    function canClaimFaucet(address user) external view returns (bool canClaim, uint256 timeLeft) {
        uint256 nextClaimTime = lastFaucetClaim[user] + FAUCET_COOLDOWN;
        if (block.timestamp >= nextClaimTime) {
            return (true, 0);
        }
        return (false, nextClaimTime - block.timestamp);
    }
    
    /**
     * @notice Mint tokens (owner only, for rewards/airdrops)
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Mint: max supply exceeded");
        _mint(to, amount);
    }
    
    /**
     * @notice Burn tokens from caller's balance
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
