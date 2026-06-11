/**
 * React Hook for interacting with Agent NFT and Registry contracts
 */

import { useContractRead, useContractWrite, useWaitForTransaction } from 'wagmi';
import { AGENT_NFT_ABI, AGENT_REGISTRY_ABI, CONTRACTS } from '@/lib/contracts';
import { Address, parseEther } from 'viem';
import { useState, useEffect } from 'react';

export function useAgentProfile(tokenId: bigint | undefined) {
  const { data, isError, isLoading, refetch } = useContractRead({
    address: CONTRACTS.mantleSepolia.agentNFT,
    abi: AGENT_NFT_ABI,
    functionName: 'agentProfiles',
    args: tokenId !== undefined ? [tokenId] : undefined,
    enabled: !!tokenId && tokenId > 0n,
  });

  return {
    profile: data ? {
      name: data[0],
      version: data[1],
      createdAt: data[2],
      totalDecisions: data[3],
      correctDecisions: data[4],
      totalPnL: data[5],
      isActive: data[6],
    } : null,
    isError,
    isLoading,
    refetch,
  };
}

export function useAgentTokenId(agentAddress: Address | undefined) {
  const { data, isError, isLoading } = useContractRead({
    address: CONTRACTS.mantleSepolia.agentNFT,
    abi: AGENT_NFT_ABI,
    functionName: 'agentToToken',
    args: agentAddress ? [agentAddress] : undefined,
    enabled: !!agentAddress,
  });

  return {
    tokenId: data as bigint | undefined,
    isError,
    isLoading,
  };
}

export function useRegisterAgent() {
  const { data, write, isLoading: isWriting } = useContractWrite({
    address: CONTRACTS.mantleSepolia.agentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'registerAgent',
  });

  const { isLoading: isConfirming, isSuccess } = useWaitForTransaction({
    hash: data?.hash,
  });

  const registerAgent = (
    agentAddress: Address,
    name: string,
    version: string,
    tokenURI: string
  ) => {
    write?.({
      args: [agentAddress, name, version, tokenURI],
    });
  };

  return {
    registerAgent,
    isLoading: isWriting || isConfirming,
    isSuccess,
    txHash: data?.hash,
  };
}

export function useRecordDecision() {
  const { data, write, isLoading: isWriting } = useContractWrite({
    address: CONTRACTS.mantleSepolia.agentNFT,
    abi: AGENT_NFT_ABI,
    functionName: 'recordDecision',
  });

  const { isLoading: isConfirming, isSuccess } = useWaitForTransaction({
    hash: data?.hash,
  });

  const recordDecision = (
    tokenId: bigint,
    direction: 'UP' | 'DOWN',
    confidence: number, // 0-1000
    stakeAmount: string, // in ETH
    reasoning: string
  ) => {
    write?.({
      args: [
        tokenId,
        direction,
        BigInt(confidence),
        parseEther(stakeAmount),
        reasoning,
      ],
    });
  };

  return {
    recordDecision,
    isLoading: isWriting || isConfirming,
    isSuccess,
    txHash: data?.hash,
  };
}

export function useCreateAgent() {
  const { data, write, isLoading: isWriting } = useContractWrite({
    address: CONTRACTS.mantleSepolia.agentNFT,
    abi: AGENT_NFT_ABI,
    functionName: 'createAgent',
  });

  const { isLoading: isConfirming, isSuccess } = useWaitForTransaction({
    hash: data?.hash,
  });

  const createAgent = (
    agentAddress: Address,
    name: string,
    version: string,
    tokenURI: string
  ) => {
    write?.({
      args: [agentAddress, name, version, tokenURI],
    });
  };

  return {
    createAgent,
    isLoading: isWriting || isConfirming,
    isSuccess,
    txHash: data?.hash,
  };
}

export function useCurrentSession() {
  const { data, isError, isLoading, refetch } = useContractRead({
    address: CONTRACTS.mantleSepolia.agentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'currentSession',
  });

  return {
    session: data ? {
      startTime: data[0],
      endTime: data[1],
      totalAgents: data[2],
      activeAgents: data[3],
      isActive: data[4],
    } : null,
    isError,
    isLoading,
    refetch,
  };
}

export function useLeaderboard(maxEntries: number = 10) {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      setIsLoading(true);
      const entries: { rank: number; address: string; tokenId: string; winRate: number; totalPnL: number }[] = [];
      
      // Fetch leaderboard entries one by one
      // Note: In production, you'd want a better way to get the total count
      for (let i = 0; i < maxEntries; i++) {
        try {
          // This would need to be implemented with proper contract reads
          // For now, this is a placeholder structure
          break;
        } catch (error) {
          break; // No more entries
        }
      }
      
      setLeaderboard(entries);
      setIsLoading(false);
    }

    fetchLeaderboard();
  }, [maxEntries]);

  return {
    leaderboard,
    isLoading,
  };
}

export function useStartSession() {
  const { data, write, isLoading: isWriting } = useContractWrite({
    address: CONTRACTS.mantleSepolia.agentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'startSession',
  });

  const { isLoading: isConfirming, isSuccess } = useWaitForTransaction({
    hash: data?.hash,
  });

  const startSession = (durationInSeconds: number) => {
    write?.({
      args: [BigInt(durationInSeconds)],
    });
  };

  return {
    startSession,
    isLoading: isWriting || isConfirming,
    isSuccess,
    txHash: data?.hash,
  };
}

export function useEndSession() {
  const { data, write, isLoading: isWriting } = useContractWrite({
    address: CONTRACTS.mantleSepolia.agentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'endSession',
  });

  const { isLoading: isConfirming, isSuccess } = useWaitForTransaction({
    hash: data?.hash,
  });

  const endSession = () => {
    write?.();
  };

  return {
    endSession,
    isLoading: isWriting || isConfirming,
    isSuccess,
    txHash: data?.hash,
  };
}
