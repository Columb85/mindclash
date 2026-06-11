/**
 * React Hook for interacting with Agent NFT contract
 */

import { useContractRead, useContractWrite, useWaitForTransaction } from 'wagmi';
import { AGENT_NFT_ABI, CONTRACTS } from '@/lib/contracts';
import { Address, parseEther } from 'viem';

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

