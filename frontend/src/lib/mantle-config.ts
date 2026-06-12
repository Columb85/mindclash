import { Chain } from 'wagmi';

// Mantle Network Configuration
export const mantleTestnet: Chain = {
  id: 5003,
  name: 'Mantle Sepolia',
  network: 'mantle-sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Mantle',
    symbol: 'MNT',
  },
  rpcUrls: {
    default: { http: ['https://rpc.sepolia.mantle.xyz'] },
    public: { http: ['https://rpc.sepolia.mantle.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Mantlescan', url: 'https://sepolia.mantlescan.xyz' },
  },
  testnet: true,
};

export const mantleMainnet: Chain = {
  id: 5000,
  name: 'Mantle',
  network: 'mantle',
  nativeCurrency: {
    decimals: 18,
    name: 'Mantle',
    symbol: 'MNT',
  },
  rpcUrls: {
    default: { http: ['https://rpc.mantle.xyz'] },
    public: { http: ['https://rpc.mantle.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Mantlescan', url: 'https://mantlescan.xyz' },
  },
  testnet: false,
};

// AI Agent Registry Contract Address (will be deployed)
export const AI_AGENT_REGISTRY_ADDRESS = {
  5001: '0x...', // Testnet - TBD
  5000: '0x...', // Mainnet - TBD
} as const;

// ERC-8004 Agent NFT Contract Address
export const AGENT_NFT_ADDRESS = {
  5001: '0x...', // Testnet - TBD
  5000: '0x...', // Mainnet - TBD
} as const;

// RealClaw Integration
export const REALCLAW_CONFIG = {
  baseURL: 'https://api.realclaw.ai',
  endpoints: {
    agents: '/agents',
    decisions: '/decisions',
    performance: '/performance',
  },
  supportedProtocols: [
    'merchant-moe',
    'agni-finance',
    'fluxion',
  ],
};

// DeFi Protocols on Mantle
export const MANTLE_PROTOCOLS = {
  merchantMoe: {
    address: '0x...',
    name: 'Merchant Moe',
    type: 'DEX',
  },
  agniFinance: {
    address: '0x...',
    name: 'Agni Finance',
    type: 'DEX',
  },
  fluxion: {
    address: '0x...',
    name: 'Fluxion',
    type: 'Lending',
  },
} as const;

// AI Agent Configuration
export const AI_CONFIG = {
  // Decision intervals in seconds
  decisionInterval: 30,
  
  // Risk management parameters
  maxPositionSize: 0.1, // 10% of total pool
  stopLossThreshold: 0.05, // 5% loss
  
  // Technical analysis indicators
  indicators: {
    rsiPeriod: 14,
    smaShort: 20,
    smaLong: 50,
    bollingerPeriod: 20,
    bollingerStdDev: 2,
  },
  
  // Machine learning parameters
  ml: {
    lookbackPeriod: 100, // candles
    predictionHorizon: 1, // next candle
    features: [
      'price_change',
      'volume_change',
      'rsi',
      'sma_cross',
      'bollinger_position',
      'volatility',
    ],
  },
};
