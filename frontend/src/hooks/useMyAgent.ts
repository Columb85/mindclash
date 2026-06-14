'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAccount, usePublicClient, useChainId } from 'wagmi';
import { AGENT_NFT_ABI, CONTRACTS } from '@/lib/contracts';

const MANTLE_SEPOLIA_ID = 5003;
import { MAX_AGENTS_PER_WALLET, UserAgentRecord } from '@/lib/agent-config';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.mindclash.xyz/api';

export interface MyAgentState {
  /** On-chain tokenId (0 = none) */
  tokenId: number;
  /** Registered in backend DB */
  registered: UserAgentRecord | null;
  /** Can user mint another? */
  canCreate: boolean;
  remaining: number;
  limit: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  registerAgent: (payload: {
    tokenId: number;
    name: string;
    strategy: string;
    version: string;
    txHash?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
}

export function useMyAgent(): MyAgentState {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const isCorrectNetwork = !isConnected || chainId === MANTLE_SEPOLIA_ID;
  const [tokenId, setTokenId] = useState(0);
  const [registered, setRegistered] = useState<UserAgentRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!isConnected || !address || !isCorrectNetwork) {
      setTokenId(0);
      setRegistered(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nftAddress = CONTRACTS.mantleSepolia.agentNFT;
      let chainTokenId = 0;

      if (publicClient && nftAddress) {
        const raw = await publicClient.readContract({
          address: nftAddress as `0x${string}`,
          abi: AGENT_NFT_ABI,
          functionName: 'agentToToken',
          args: [address as `0x${string}`],
        });
        chainTokenId = Number(raw ?? 0);
      }

      const res = await fetch(`${API_URL}/agents/mine/${address}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setRegistered(json.data ?? null);
        if (json.chainTokenId && json.chainTokenId > 0) {
          chainTokenId = json.chainTokenId;
        }
      } else {
        setRegistered(null);
      }

      setTokenId(chainTokenId);
    } catch (e: any) {
      setError(e.message || 'Failed to load agent');
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, publicClient]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll, chainId]);

  const registerAgent = useCallback(async (payload: {
    tokenId: number;
    name: string;
    strategy: string;
    version: string;
    txHash?: string;
  }) => {
    if (!address) return { ok: false, error: 'Wallet not connected' };

    try {
      const res = await fetch(`${API_URL}/agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorAddress: address,
          ...payload,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        return { ok: false, error: json.error || 'Registration failed' };
      }
      await fetchAll();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }, [address, fetchAll]);

  const hasAgent = tokenId > 0 || !!registered;
  const canCreate = !hasAgent && isConnected;

  return {
    tokenId,
    registered,
    canCreate,
    remaining: canCreate ? MAX_AGENTS_PER_WALLET : 0,
    limit: MAX_AGENTS_PER_WALLET,
    isLoading,
    error,
    refetch: fetchAll,
    registerAgent,
  };
}
