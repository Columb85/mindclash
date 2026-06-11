import { configureChains, createConfig } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';

// ─── Chain IDs ────────────────────────────────────────────────────────────────
export const CHAIN_IDS = {
  MANTLE_SEPOLIA: 5003,
  MANTLE_MAINNET: 5000,
} as const;

// ─── Mantle Sepolia (testnet for hackathon) ───────────────────────────────────
const mantleSepolia = {
  id: 5003,
  name: 'Mantle Sepolia',
  network: 'mantle-sepolia',
  nativeCurrency: {
    name: 'Mantle',
    symbol: 'MNT',
    decimals: 18,
  },
  rpcUrls: {
    public: { http: ['https://rpc.sepolia.mantle.xyz'] },
    default: { http: ['https://rpc.sepolia.mantle.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Mantlescan', url: 'https://sepolia.mantlescan.xyz' },
  },
  testnet: true,
} as const;

// ─── Mantle Mainnet ───────────────────────────────────────────────────────────
const mantleMainnet = {
  id: 5000,
  name: 'Mantle',
  network: 'mantle',
  nativeCurrency: {
    name: 'Mantle',
    symbol: 'MNT',
    decimals: 18,
  },
  rpcUrls: {
    public: { http: ['https://rpc.mantle.xyz'] },
    default: { http: ['https://rpc.mantle.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Mantlescan', url: 'https://mantlescan.xyz' },
  },
  testnet: false,
} as const;

// ─── Contract Addresses (filled after deploy) ─────────────────────────────────
export const CONTRACT_ADDRESSES = {
  [CHAIN_IDS.MANTLE_SEPOLIA]: {
    roundEngine:   process.env.NEXT_PUBLIC_ROUND_ENGINE_ADDRESS   || '',
    treasury:      process.env.NEXT_PUBLIC_TREASURY_ADDRESS       || '',
    oracleAdapter: process.env.NEXT_PUBLIC_ORACLE_ADAPTER_ADDRESS || '',
    usdc:          process.env.NEXT_PUBLIC_USDC_ADDRESS           || '0x2c852e740B62308c46DD29B982FBb650D063Bd07', // Mantle Sepolia USDC
    usdt:          process.env.NEXT_PUBLIC_USDT_ADDRESS           || '0xAE1A6b5b0e7E3e3e3e3e3e3e3e3e3e3e3e3e3e3e', // placeholder
    agentNFT:      process.env.NEXT_PUBLIC_AGENT_NFT_ADDRESS      || '',
    agentRegistry: process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS || '',
  },
  [CHAIN_IDS.MANTLE_MAINNET]: {
    roundEngine:   '',
    treasury:      '',
    oracleAdapter: '',
    usdc:          '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9', // USDC on Mantle mainnet
    usdt:          '0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE', // USDT on Mantle mainnet
    agentNFT:      '',
    agentRegistry: '',
  },
} as const;

// ─── Pyth Price Feed IDs (used by on-chain oracle) ────────────────────────────
export const PRICE_FEEDS = {
  BTC: '0xe62df6c8b4c85fe1a06cc3b68a5b4a8e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3',
  ETH: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  SOL: '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  MNT: '0x4e3037c822d852d79af3ac80e35eb420ee3b37bf5ebeffd55b16a1ad3b4dc6ec',
} as const;

// ─── Asset configurations ─────────────────────────────────────────────────────
export const ASSETS = {
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    icon: '₿',
    priceId: PRICE_FEEDS.BTC,
    color: '#f7931a',
    decimals: 8,
    bybitSymbol: 'BTCUSDT',
  },
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    icon: 'Ξ',
    priceId: PRICE_FEEDS.ETH,
    color: '#627eea',
    decimals: 8,
    bybitSymbol: 'ETHUSDT',
  },
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    icon: '◎',
    priceId: PRICE_FEEDS.SOL,
    color: '#14f195',
    decimals: 8,
    bybitSymbol: 'SOLUSDT',
  },
  MNT: {
    symbol: 'MNT',
    name: 'Mantle',
    icon: 'M',
    priceId: PRICE_FEEDS.MNT,
    color: '#00D4AA',
    decimals: 8,
    bybitSymbol: 'MNTUSDT',
  },
} as const;

// ─── Round durations ──────────────────────────────────────────────────────────
export const ROUND_DURATIONS = [
  { label: '1 MIN', value: 60,  icon: '⚡' },
  { label: '3 MIN', value: 180, icon: '🔥' },
  { label: '5 MIN', value: 300, icon: '⭐' },
] as const;

// ─── Supported chains — testnet only until mainnet contracts are deployed ─────
export const SUPPORTED_CHAINS = [mantleSepolia];

// ─── Wagmi config ─────────────────────────────────────────────────────────────
const { chains, publicClient } = configureChains(
  SUPPORTED_CHAINS,
  [publicProvider()]
);

export const wagmiConfig = createConfig({
  autoConnect: false,
  publicClient,
});

export { chains };

// ─── Utility helpers ──────────────────────────────────────────────────────────
export function getContractAddress(
  chainId: number,
  contract: keyof (typeof CONTRACT_ADDRESSES)[typeof CHAIN_IDS.MANTLE_SEPOLIA]
): string {
  const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  return addresses?.[contract] ?? '';
}

export function isChainSupported(chainId: number): boolean {
  return SUPPORTED_CHAINS.some(chain => chain.id === chainId);
}

export function getAssetBySymbol(symbol: string) {
  return Object.values(ASSETS).find(asset => asset.symbol === symbol);
}

export function formatPrice(price: bigint, decimals: number = 8): string {
  const formatted = Number(price) / Math.pow(10, decimals);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(formatted);
}

export function formatTokenAmount(amount: bigint, decimals: number = 6): string {
  const formatted = Number(amount) / Math.pow(10, decimals);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(formatted);
}
