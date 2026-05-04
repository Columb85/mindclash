/**
 * Mantle Testnet Configuration and Faucet Integration
 * For Turing Test Hackathon 2026
 */

import { Chain } from 'wagmi';

// Mantle Sepolia Testnet Configuration
export const mantleSepolia = {
  id: 5001,
  name: 'Mantle Sepolia',
  network: 'mantle-sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Mantle',
    symbol: 'MNT',
  },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.mantle.xyz'] },
    public: { http: ['https://rpc.testnet.mantle.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Mantlescan', url: 'https://sepolia.mantlescan.xyz' },
  },
  testnet: true,
} as const;

// Testnet Faucet URLs
export const FAUCET_URLS = {
  // Official Mantle faucet (requires X authentication)
  mantleOfficial: 'https://faucet.sepolia.mantle.xyz/',
  
  // QuickNode faucet (no auth required, but queue system)
  quicknode: 'https://faucet.quicknode.com/mantle/sepolia',
  
  // Alternative faucets
  sepoliaETH: {
    infura: 'https://www.infura.io/faucet/sepolia',
    alchemy: 'https://sepoliafaucet.com/',
  },
};

// Testnet Token Contracts
export const TESTNET_TOKENS = {
  // Mock tokens for testing (will be deployed)
  USDT: {
    address: '0x0000000000000000000000000000000000000000', // TBD
    decimals: 6,
    symbol: 'USDT',
    name: 'Tether USD Testnet',
  },
  USDC: {
    address: '0x0000000000000000000000000000000000000000', // TBD
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin Testnet',
  },
  WETH: {
    address: '0x0000000000000000000000000000000000000000', // TBD
    decimals: 18,
    symbol: 'WETH',
    name: 'Wrapped Ether Testnet',
  },
};

// Testnet DeFi Protocols
export const TESTNET_PROTOCOLS = {
  // Mock DEX addresses (will be deployed)
  mockDEX: {
    router: '0x0000000000000000000000000000000000000000', // TBD
    factory: '0x0000000000000000000000000000000000000000', // TBD
  },
};

// Create Wagmi config for Mantle Testnet (simplified for wagmi v1)
export const mantleTestnetConfig = {
  chains: [mantleSepolia],
  rpcUrls: {
    [mantleSepolia.id]: 'https://rpc.testnet.mantle.xyz',
  },
};

// Faucet helper functions
export const getMantleTestnetTokens = async (address: string) => {
  try {
    // Try QuickNode faucet first (no auth required)
    const response = await fetch('https://faucet.quicknode.com/mantle/sepolia', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address,
        amount: '0.1', // 0.1 MNT
        chain: 'mantle-sepolia',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, txHash: data.txHash, message: 'Tokens sent successfully!' };
    } else {
      throw new Error('QuickNode faucet failed');
    }
  } catch (error) {
    console.error('Faucet error:', error);
    return { 
      success: false, 
      message: 'Please use official Mantle faucet at https://faucet.sepolia.mantle.xyz/' 
    };
  }
};

// Check if address has sufficient testnet tokens
export const checkTestnetBalance = async (address: string) => {
  try {
    const response = await fetch(`https://rpc.testnet.mantle.xyz`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: 1,
      }),
    });

    const data = await response.json();
    const balance = parseInt(data.result, 16);
    const balanceInMNT = balance / 1e18;
    
    return {
      balance: balanceInMNT,
      hasTokens: balanceInMNT > 0.01, // Minimum 0.01 MNT for gas
      needsTokens: balanceInMNT < 0.1,  // Suggest faucet if less than 0.1 MNT
    };
  } catch (error) {
    console.error('Balance check error:', error);
    return { balance: 0, hasTokens: false, needsTokens: true };
  }
};

// Get Sepolia ETH for gas fees
export const getSepoliaETH = async (address: string) => {
  const faucets = [
    'https://www.infura.io/faucet/sepolia',
    'https://sepoliafaucet.com/',
  ];

  for (const faucet of faucets) {
    try {
      // This would need to be implemented based on each faucet's API
      console.log(`Try getting Sepolia ETH from: ${faucet}`);
    } catch (error) {
      console.error(`Failed to get ETH from ${faucet}:`, error);
    }
  }

  return {
    success: false,
    message: 'Please visit https://www.infura.io/faucet/sepolia or https://sepoliafaucet.com/ to get Sepolia ETH for gas fees'
  };
};
