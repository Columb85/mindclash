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

function formatMintError(err: unknown): string {
  const msg = String((err as { message?: string })?.message || err || '').toLowerCase();
  if (msg.includes('agent already exists') || msg.includes('already exists')) {
    return 'This wallet already has an Agent NFT. Only one agent per wallet is allowed on-chain.';
  }
  if (msg.includes('user rejected') || msg.includes('denied') || msg.includes('rejected')) {
    return 'Transaction cancelled in your wallet.';
  }
  if (msg.includes('revert') || msg.includes('execution reverted')) {
    return 'Mint transaction reverted. If you already created an agent, a second mint is not possible.';
  }
  return 'Mint failed. Each wallet can only create one Agent NFT.';
}

export function parseMintError(err: unknown): string {
  return formatMintError(err);
}

export function useCreateAgent() {
  const {
    data: hash,
    writeContract,
    isPending: isWriting,
    error: writeError,
    isError: isWriteError,
    reset,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    isError: isReceiptError,
    error: receiptError,
  } = useWaitForTransactionReceipt({
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
    isError: isWriteError || isReceiptError,
    error: writeError || receiptError,
    txHash: hash,
    reset,
  };
}

