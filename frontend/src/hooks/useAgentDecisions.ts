'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { AGENT_NFT_ABI, CONTRACTS } from '@/lib/contracts';

export interface OnChainDecision {
  direction: string;
  confidence: number;
  stake: number;
  timestamp: number;
  wasCorrect: boolean;
  pnl: number;
  reasoning: string;
  decisionHash: string;
}

export function useAgentDecisions(tokenId: number | undefined, limit = 20) {
  const publicClient = usePublicClient();
  const [decisions, setDecisions] = useState<OnChainDecision[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!tokenId || tokenId <= 0 || !publicClient) {
      setDecisions([]);
      return;
    }

    const nft = CONTRACTS.mantleSepolia.agentNFT;
    if (!nft) {
      setError('AgentNFT contract not configured');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const raw = await publicClient.readContract({
        address: nft as `0x${string}`,
        abi: AGENT_NFT_ABI,
        functionName: 'getRecentDecisions',
        args: [BigInt(tokenId), BigInt(limit)],
      });

      const rows = (raw as readonly {
        direction: string;
        confidence: bigint;
        stake: bigint;
        timestamp: bigint;
        wasCorrect: boolean;
        pnl: bigint;
        reasoning: string;
        decisionHash: `0x${string}`;
      }[]).map(d => ({
        direction: d.direction,
        confidence: Number(d.confidence),
        stake: Number(d.stake),
        timestamp: Number(d.timestamp),
        wasCorrect: d.wasCorrect,
        pnl: Number(d.pnl),
        reasoning: d.reasoning,
        decisionHash: d.decisionHash,
      }));

      setDecisions(rows.reverse());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to read on-chain decisions');
      setDecisions([]);
    } finally {
      setLoading(false);
    }
  }, [tokenId, publicClient, limit]);

  useEffect(() => {
    refetch();
    const interval = setInterval(refetch, 15000);
    return () => clearInterval(interval);
  }, [refetch]);

  return { decisions, loading, error, refetch };
}
