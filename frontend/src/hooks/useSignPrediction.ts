'use client';

import { useSignTypedData } from 'wagmi';
import { useCallback } from 'react';

// EIP-712 domain — Mantle Sepolia testnet
const DOMAIN = {
  name:    'MindClash',
  version: '1',
  chainId: 5003,
} as const;

const TYPES = {
  Prediction: [
    { name: 'roundId',   type: 'string'  },
    { name: 'asset',     type: 'string'  },
    { name: 'direction', type: 'string'  },
    { name: 'amount',    type: 'uint256' },
    { name: 'timestamp', type: 'uint256' },
    { name: 'player',    type: 'address' },
  ],
} as const;

export interface PredictionCommitment {
  roundId:   string;
  asset:     string;
  direction: 'UP' | 'DOWN';
  amount:    number;
  timestamp: number;
  player:    `0x${string}`;
}

export interface SignedCommitment extends PredictionCommitment {
  signature: `0x${string}`;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.mindclash.xyz/api';

async function submitSignature(commitment: SignedCommitment) {
  try {
    await fetch(`${API_URL}/rounds/signature`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(commitment),
    });
  } catch {
    // non-blocking — local UI state is source of truth
  }
}

export function useSignPrediction() {
  const { signTypedDataAsync, isLoading } = useSignTypedData();

  const signPrediction = useCallback(async (
    commitment: PredictionCommitment,
  ): Promise<SignedCommitment | null> => {
    try {
      const message = {
        roundId:   commitment.roundId,
        asset:     commitment.asset,
        direction: commitment.direction,
        amount:    BigInt(Math.round(commitment.amount)),
        timestamp: BigInt(commitment.timestamp),
        player:    commitment.player,
      };

      const signature = await signTypedDataAsync({
        domain: DOMAIN,
        types:  TYPES,
        primaryType: 'Prediction',
        message,
      });

      const signed: SignedCommitment = { ...commitment, signature };

      // Fire-and-forget to backend for persistence
      submitSignature(signed);

      return signed;
    } catch {
      // User rejected or wallet error — non-blocking
      return null;
    }
  }, [signTypedDataAsync]);

  return { signPrediction, isSigning: isLoading };
}
