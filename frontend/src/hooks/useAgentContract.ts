/**
 * React Hook for interacting with Agent NFT contract
 */

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { AGENT_NFT_ABI, CONTRACTS } from '@/lib/contracts';
import { Address, parseEther } from 'viem';

export function useAgentProfile(tokenId: bigint | undefined) {
  const { data, isError, isLoading, refetch } = useReadContract({
    address: CONTRACTS.mantleSepolia.agentNFT,
    abi: AGENT_NFT_ABI,
    functionName: 'agentProfiles',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled: !!tokenId && tokenId > 0n },
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
  const { data, isError, isLoading } = useReadContract({
    address: CONTRACTS.mantleSepolia.agentNFT,
    abi: AGENT_NFT_ABI,
    functionName: 'agentToToken',
    args: agentAddress ? [agentAddress] : undefined,
    query: { enabled: !!agentAddress },
  });

  return {
    tokenId: data as bigint | undefined,
    isError,
    isLoading,
  };
}

export function useCreateAgent() {
  const { data: hash, writeContract, isPending: isWriting } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const createAgent = (
    agentAddress: Address,
    name: string,
    version: string,
    tokenURI: string
  ) => {
    writeContract({
      address: CONTRACTS.mantleSepolia.agentNFT,
      abi: AGENT_NFT_ABI,
      functionName: 'createAgent',
      args: [agentAddress, name, version, tokenURI],
    });
  };

  return {
    createAgent,
    isLoading: isWriting || isConfirming,
    isSuccess,
    txHash: hash,
  };
}

