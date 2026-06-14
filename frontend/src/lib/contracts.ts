/**
 * Smart Contract Integration for Mantle AI Trading Agent
 * Connects frontend with deployed AgentNFT and AgentRegistry contracts
 */

import { Address } from 'viem';

// Contract ABIs (simplified for frontend use)
export const AGENT_NFT_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "agentAddress", "type": "address" },
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "string", "name": "version", "type": "string" },
      { "internalType": "string", "name": "tokenURI", "type": "string" }
    ],
    "name": "createAgent",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
      { "internalType": "string", "name": "direction", "type": "string" },
      { "internalType": "uint256", "name": "confidence", "type": "uint256" },
      { "internalType": "uint256", "name": "stake", "type": "uint256" },
      { "internalType": "string", "name": "reasoning", "type": "string" }
    ],
    "name": "recordDecision",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
      { "internalType": "uint256", "name": "decisionIndex", "type": "uint256" },
      { "internalType": "bool", "name": "wasCorrect", "type": "bool" },
      { "internalType": "int256", "name": "pnl", "type": "int256" }
    ],
    "name": "resolveDecision",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
    "name": "agentProfiles",
    "outputs": [
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "string", "name": "version", "type": "string" },
      { "internalType": "uint256", "name": "createdAt", "type": "uint256" },
      { "internalType": "uint256", "name": "totalDecisions", "type": "uint256" },
      { "internalType": "uint256", "name": "correctDecisions", "type": "uint256" },
      { "internalType": "uint256", "name": "totalPnL", "type": "uint256" },
      { "internalType": "bool", "name": "isActive", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "agentAddress", "type": "address" }],
    "name": "agentToToken",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
      { "internalType": "uint256", "name": "index", "type": "uint256" }
    ],
    "name": "getDecision",
    "outputs": [
      { "internalType": "string", "name": "direction", "type": "string" },
      { "internalType": "uint256", "name": "confidence", "type": "uint256" },
      { "internalType": "uint256", "name": "stake", "type": "uint256" },
      { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
      { "internalType": "bool", "name": "wasCorrect", "type": "bool" },
      { "internalType": "int256", "name": "pnl", "type": "int256" },
      { "internalType": "string", "name": "reasoning", "type": "string" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
      { "internalType": "uint256", "name": "limit", "type": "uint256" }
    ],
    "name": "getRecentDecisions",
    "outputs": [
      {
        "components": [
          { "internalType": "string", "name": "direction", "type": "string" },
          { "internalType": "uint256", "name": "confidence", "type": "uint256" },
          { "internalType": "uint256", "name": "stake", "type": "uint256" },
          { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
          { "internalType": "bool", "name": "wasCorrect", "type": "bool" },
          { "internalType": "int256", "name": "pnl", "type": "int256" },
          { "internalType": "string", "name": "reasoning", "type": "string" },
          { "internalType": "bytes32", "name": "decisionHash", "type": "bytes32" }
        ],
        "internalType": "struct AgentNFT.Decision[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const AGENT_REGISTRY_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "agentAddress", "type": "address" },
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "string", "name": "version", "type": "string" },
      { "internalType": "string", "name": "tokenURI", "type": "string" }
    ],
    "name": "registerAgent",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "duration", "type": "uint256" }],
    "name": "startSession",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "endSession",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "currentSession",
    "outputs": [
      { "internalType": "uint256", "name": "startTime", "type": "uint256" },
      { "internalType": "uint256", "name": "endTime", "type": "uint256" },
      { "internalType": "uint256", "name": "totalAgents", "type": "uint256" },
      { "internalType": "uint256", "name": "activeAgents", "type": "uint256" },
      { "internalType": "bool", "name": "isActive", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "index", "type": "uint256" }],
    "name": "leaderboard",
    "outputs": [
      { "internalType": "address", "name": "agentAddress", "type": "address" },
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
      { "internalType": "uint256", "name": "winRate", "type": "uint256" },
      { "internalType": "uint256", "name": "totalPnL", "type": "uint256" },
      { "internalType": "uint256", "name": "decisionsCount", "type": "uint256" },
      { "internalType": "uint256", "name": "lastUpdate", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "agentAddress", "type": "address" }],
    "name": "getAgentStats",
    "outputs": [
      { "internalType": "uint256", "name": "decisions", "type": "uint256" },
      { "internalType": "uint256", "name": "wins", "type": "uint256" },
      { "internalType": "int256", "name": "pnl", "type": "int256" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Contract addresses (will be updated after deployment)
export const CONTRACTS = {
  mantleSepolia: {
    agentNFT: (process.env.NEXT_PUBLIC_AGENT_NFT_ADDRESS || '') as Address,
    agentRegistry: (process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS || '') as Address,
  }
};

// Helper function to check if contracts are deployed
export function areContractsDeployed(): boolean {
  return !!(CONTRACTS.mantleSepolia.agentNFT && CONTRACTS.mantleSepolia.agentRegistry);
}

// Load deployed addresses from file (for development)
export async function loadDeployedAddresses() {
  try {
    const response = await fetch('/deployed-addresses.json');
    if (response.ok) {
      const data = await response.json();
      if (data.mantleSepolia?.contracts) {
        CONTRACTS.mantleSepolia.agentNFT = data.mantleSepolia.contracts.AgentNFT;
        CONTRACTS.mantleSepolia.agentRegistry = data.mantleSepolia.contracts.AgentRegistry;
        return true;
      }
    }
  } catch {
    // deployed addresses unavailable
  }
  return false;
}
