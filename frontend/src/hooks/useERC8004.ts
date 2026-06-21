'use client';

import { useState, useEffect, useCallback } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { decodeEventLog } from 'viem';
import { IDENTITY_REGISTRY_ABI, REPUTATION_REGISTRY_ABI, CONTRACTS } from '@/lib/contracts';

const AGENT_NFT_ADDRESS = '0xEEc82Ecd81d889D7f1681741cfC1Fc1B7eC4B837';
const CHAIN_ID = 5003;

function generateAgentAvatar(name: string): string {
  const initials = name.slice(0, 2).toUpperCase();
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">',
    `<rect width="256" height="256" rx="32" fill="hsl(${hue},70%,12%)"/>`,
    `<circle cx="128" cy="128" r="80" fill="hsl(${hue},80%,50%)" opacity="0.15"/>`,
    `<text x="128" y="145" text-anchor="middle" font-size="80" font-family="monospace" font-weight="bold" fill="hsl(${hue},80%,60%)">${initials}</text>`,
    '</svg>',
  ].join('');
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export function buildERC8004URI(params: {
  name: string;
  tokenId: number;
  strategy?: string;
  description?: string;
}): string {
  const desc =
    params.description ||
    `MindClash autonomous AI trading agent. ${params.strategy || 'Custom'} strategy. ` +
    `Every decision recorded on-chain via AgentNFT.recordDecision() on Mantle Sepolia.`;

  const regFile = {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: params.name,
    description: desc,
    image: generateAgentAvatar(params.name),
    services: [
      { name: 'web', endpoint: 'https://mindclash.xyz' },
      { name: 'web', endpoint: 'https://mindclash.xyz/verify' },
      {
        name: 'MindClash-AgentNFT',
        endpoint: `https://sepolia.mantlescan.xyz/address/${AGENT_NFT_ADDRESS}`,
      },
      {
        name: 'MindClash-API',
        endpoint: `https://api.mindclash.xyz/api/agents/${params.tokenId}`,
      },
    ],
    active: true,
    registrations: [
      {
        agentId: 0,
        agentRegistry: `eip155:${CHAIN_ID}:${CONTRACTS.mantleSepolia.identityRegistry}`,
      },
    ],
    supportedTrust: ['reputation'],
  };

  const jsonStr = JSON.stringify(regFile);
  return `data:application/json;base64,${btoa(unescape(encodeURIComponent(jsonStr)))}`;
}

export function useERC8004Balance() {
  const { address } = useAccount();

  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACTS.mantleSepolia.identityRegistry as `0x${string}`,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  return {
    hasERC8004Identity: data ? Number(data) > 0 : false,
    balance: data ? Number(data) : 0,
    isLoading,
    refetch,
  };
}

export function useRegisterERC8004() {
  const {
    data: hash,
    writeContract,
    isPending,
    error: writeError,
    isError: isWriteError,
    reset,
  } = useWriteContract();

  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess,
    isError: isReceiptError,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash });

  const [erc8004AgentId, setErc8004AgentId] = useState<number | null>(null);

  useEffect(() => {
    if (!receipt?.logs) return;
    for (const log of receipt.logs) {
      try {
        const event = decodeEventLog({
          abi: IDENTITY_REGISTRY_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (event.eventName === 'Registered') {
          const args = event.args as unknown as { agentId: bigint };
          setErc8004AgentId(Number(args.agentId));
          break;
        }
      } catch {
        /* not our event */
      }
    }
  }, [receipt]);

  const registerAgent = useCallback(
    (agentURI: string) => {
      setErc8004AgentId(null);
      writeContract({
        address: CONTRACTS.mantleSepolia.identityRegistry as `0x${string}`,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: 'register',
        args: [agentURI],
      });
    },
    [writeContract],
  );

  return {
    registerAgent,
    isLoading: isPending || isConfirming,
    isPending,
    isConfirming,
    isSuccess,
    isError: isWriteError || isReceiptError,
    error: writeError || receiptError,
    txHash: hash,
    erc8004AgentId,
    reset,
  };
}

export function useERC8004Reputation(agentId: number | null) {
  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACTS.mantleSepolia.reputationRegistry as `0x${string}`,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: 'getSummary',
    args: agentId ? [BigInt(agentId), [], '', ''] : undefined,
    query: { enabled: !!agentId },
  });

  const result = data as [bigint, bigint, number] | undefined;

  return {
    feedbackCount: result ? Number(result[0]) : 0,
    summaryValue: result ? Number(result[1]) : 0,
    summaryDecimals: result ? Number(result[2]) : 0,
    isLoading,
    refetch,
    hasReputation: result ? Number(result[0]) > 0 : false,
  };
}
