import { http, createConfig } from 'wagmi';
import { defineChain } from 'viem';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  injectedWallet,
  metaMaskWallet,
  rabbyWallet,
  coinbaseWallet,
  walletConnectWallet,
  rainbowWallet,
  trustWallet,
  braveWallet,
  okxWallet,
} from '@rainbow-me/rainbowkit/wallets';

// ─── Chain IDs ────────────────────────────────────────────────────────────────
export const CHAIN_IDS = {
  MANTLE_SEPOLIA: 5003,
  MANTLE_MAINNET: 5000,
} as const;

// ─── Mantle Sepolia (testnet for hackathon) ───────────────────────────────────
const mantleSepolia = defineChain({
  id: 5003,
  name: 'Mantle Sepolia',
  nativeCurrency: {
    name: 'Mantle',
    symbol: 'MNT',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://rpc.sepolia.mantle.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Mantlescan', url: 'https://sepolia.mantlescan.xyz' },
  },
  testnet: true,
});

// ─── Mantle Mainnet ───────────────────────────────────────────────────────────
const mantleMainnet = defineChain({
  id: 5000,
  name: 'Mantle',
  nativeCurrency: {
    name: 'Mantle',
    symbol: 'MNT',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://rpc.mantle.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Mantlescan', url: 'https://mantlescan.xyz' },
  },
  testnet: false,
});

// ─── Contract Addresses (filled after deploy) ─────────────────────────────────
export const CONTRACT_ADDRESSES = {
  [CHAIN_IDS.MANTLE_SEPOLIA]: {
    roundEngine:   process.env.NEXT_PUBLIC_ROUND_ENGINE_ADDRESS   || '',
    treasury:      process.env.NEXT_PUBLIC_TREASURY_ADDRESS       || '',
    oracleAdapter: process.env.NEXT_PUBLIC_ORACLE_ADAPTER_ADDRESS || '',
    usdc:          process.env.NEXT_PUBLIC_USDC_ADDRESS           || '0x2c852e740B62308c46DD29B982FBb650D063Bd07',
    usdt:          process.env.NEXT_PUBLIC_USDT_ADDRESS           || '0xAE1A6b5b0e7E3e3e3e3e3e3e3e3e3e3e3e3e3e3e',
    agentNFT:      process.env.NEXT_PUBLIC_AGENT_NFT_ADDRESS      || '',
    agentRegistry: process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS || '',
  },
  [CHAIN_IDS.MANTLE_MAINNET]: {
    roundEngine:   '',
    treasury:      '',
    oracleAdapter: '',
    usdc:          '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9',
    usdt:          '0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE',
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

// ─── Supported chains ─────────────────────────────────────────────────────────
export const SUPPORTED_CHAINS = [mantleSepolia] as const;

// ─── Wagmi v2 config ──────────────────────────────────────────────────────────
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'b5ebf3f65b29b6b6ed6ff4e2ba4ebb68';
const isDev = process.env.NODE_ENV === 'development';

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Popular',
      wallets: isDev
        ? [injectedWallet, metaMaskWallet]
        : [
            injectedWallet,
            rabbyWallet,
            metaMaskWallet,
            coinbaseWallet,
            walletConnectWallet,
          ],
    },
    ...(isDev
      ? []
      : [{
          groupName: 'More',
          wallets: [
            trustWallet,
            braveWallet,
            okxWallet,
            rainbowWallet,
          ],
        }]),
  ],
  { appName: 'MindClash', projectId }
);

export const wagmiConfig = createConfig({
  chains: SUPPORTED_CHAINS,
  connectors,
  transports: {
    [mantleSepolia.id]: http('https://rpc.sepolia.mantle.xyz'),
  },
  ssr: true,
});

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
