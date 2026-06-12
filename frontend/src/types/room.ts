import { ASSETS } from '@/lib/web3-config';

export type RoomStatus = 'open' | 'live' | 'resolved';
export type Direction = 'UP' | 'DOWN';

export interface Prediction {
  address: string;
  direction: Direction;
  amount: number;
  timestamp: number;
}

export interface PricePoint {
  t: number;    // epoch seconds
  price: number;
}

export interface Room {
  id: string;
  asset: keyof typeof ASSETS;
  duration: number; // seconds
  token: 'CLASH';
  minStake: number;
  maxStake: number;
  status: RoomStatus;
  openTime: number;   // predictions accepted from here
  startTime: number;  // round goes live, predictions closed
  endTime: number;    // round resolves
  startPrice?: number;
  currentPrice: number;
  endPrice?: number;
  upPool: number;
  downPool: number;
  predictions: Prediction[];
  priceHistory: PricePoint[];
  agentTxHash?: string;
  agentExplorerUrl?: string;
  agentOnChainStatus?: 'pending' | 'confirmed' | 'failed';
}

