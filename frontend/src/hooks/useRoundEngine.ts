import { useContractRead, useContractWrite, usePrepareContractWrite, useContractEvent, useAccount } from 'wagmi';
import { toast } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { getContractAddress, CHAIN_IDS } from '@/lib/web3-config';

// RoundEngine ABI (core functions)
const ROUND_ENGINE_ABI = ([
  // Read functions
  {
    inputs: [{ name: 'priceId', type: 'bytes32' }, { name: 'duration', type: 'uint256' }],
    name: 'getCurrentRound',
    outputs: [
      { name: 'roundId', type: 'uint256' },
      { name: 'startPrice', type: 'int256' },
      { name: 'lockTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'totalBullAmount', type: 'uint256' },
      { name: 'totalBearAmount', type: 'uint256' },
      { name: 'status', type: 'uint8' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'roundId', type: 'uint256' }, { name: 'user', type: 'address' }],
    name: 'getUserBet',
    outputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'position', type: 'uint8' },
      { name: 'claimed', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'roundId', type: 'uint256' }, { name: 'user', type: 'address' }],
    name: 'calculatePayout',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'priceId', type: 'bytes32' }],
    name: 'getLatestPrice',
    outputs: [{ name: '', type: 'int256' }],
    stateMutability: 'view',
    type: 'function'
  },
  // Write functions
  {
    inputs: [
      { name: 'priceId', type: 'bytes32' },
      { name: 'duration', type: 'uint256' },
      { name: 'position', type: 'uint8' },
      { name: 'amount', type: 'uint256' },
      { name: 'token', type: 'address' }
    ],
    name: 'placeBet',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'roundId', type: 'uint256' }],
    name: 'claim',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'roundId', type: 'uint256' },
      { indexed: true, name: 'priceId', type: 'bytes32' },
      { indexed: false, name: 'startPrice', type: 'int256' },
      { indexed: false, name: 'lockTime', type: 'uint256' },
      { indexed: false, name: 'endTime', type: 'uint256' }
    ],
    name: 'RoundStarted',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'roundId', type: 'uint256' },
      { indexed: true, name: 'user', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'position', type: 'uint8' },
      { indexed: false, name: 'token', type: 'address' }
    ],
    name: 'BetPlaced',
    type: 'event'
  }
]) as const;

export interface RoundInfo {
  roundId: bigint;
  startPrice: bigint;
  lockTime: bigint;
  endTime: bigint;
  totalBullAmount: bigint;
  totalBearAmount: bigint;
  status: number;
}

export interface UserBet {
  amount: bigint;
  position: number; // 0 = BULL, 1 = BEAR
  claimed: boolean;
}

export function useRoundEngine(chainId?: number) {
  const { address } = useAccount();
  const contractAddress = getContractAddress(chainId || 97, 'roundEngine');

  return {
    contractAddress,
    abi: ROUND_ENGINE_ABI,
  };
}

export function useCurrentRound(priceId: string, duration: number, chainId?: number) {
  const { contractAddress, abi } = useRoundEngine(chainId);
  
  const { data: roundData, refetch: refetchRound } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: 'getCurrentRound',
    args: [priceId as `0x${string}`, BigInt(duration)],
    query: {
      enabled: !!contractAddress && !!priceId,
      refetchInterval: 5000, // Refetch every 5 seconds
    }
  });

  const roundInfo: RoundInfo | null = roundData ? {
    roundId: roundData[0],
    startPrice: roundData[1],
    lockTime: roundData[2],
    endTime: roundData[3],
    totalBullAmount: roundData[4],
    totalBearAmount: roundData[5],
    status: roundData[6]
  } : null;

  return {
    roundInfo,
    refetchRound,
    isLoading: !roundData && !!contractAddress,
  };
}

export function useUserBet(roundId: bigint, chainId?: number) {
  const { address } = useAccount();
  const { contractAddress, abi } = useRoundEngine(chainId);

  const { data: betData, refetch: refetchBet } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: 'getUserBet',
    args: [roundId, address!],
    query: {
      enabled: !!contractAddress && !!address && roundId > 0n,
      refetchInterval: 10000, // Refetch every 10 seconds
    }
  });

  const userBet: UserBet | null = betData ? {
    amount: betData[0],
    position: betData[1],
    claimed: betData[2]
  } : null;

  return {
    userBet,
    refetchBet,
    isLoading: !betData && !!contractAddress && !!address,
  };
}

export function useLatestPrice(priceId: string, chainId?: number) {
  const { contractAddress, abi } = useRoundEngine(chainId);

  const { data: price, refetch: refetchPrice } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: 'getLatestPrice',
    args: [priceId as `0x${string}`],
    query: {
      enabled: !!contractAddress && !!priceId,
      refetchInterval: 2000, // Refetch every 2 seconds for price updates
    }
  });

  return {
    price: price as bigint | undefined,
    refetchPrice,
    isLoading: !price && !!contractAddress,
  };
}

export function usePlaceBet(chainId?: number) {
  const { contractAddress, abi } = useRoundEngine(chainId);
  const { writeContractAsync, isPending } = useWriteContract();

  const placeBet = async (
    priceId: string,
    duration: number,
    position: 0 | 1, // 0 = BULL (UP), 1 = BEAR (DOWN)
    amount: bigint,
    token: string
  ) => {
    if (!contractAddress) {
      throw new Error('Contract address not found');
    }

    try {
      const hash = await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: 'placeBet',
        args: [
          priceId as `0x${string}`,
          BigInt(duration),
          position,
          amount,
          token as `0x${string}`
        ],
      });

      toast.success(`Bet placed! Transaction: ${hash}`);
      return hash;
    } catch (error) {
      console.error('Error placing bet:', error);
      toast.error('Failed to place bet');
      throw error;
    }
  };

  return {
    placeBet,
    isPending,
  };
}

export function useClaim(chainId?: number) {
  const { contractAddress, abi } = useRoundEngine(chainId);
  const { writeContractAsync, isPending } = useWriteContract();

  const claim = async (roundId: bigint) => {
    if (!contractAddress) {
      throw new Error('Contract address not found');
    }

    try {
      const hash = await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: 'claim',
        args: [roundId],
      });

      toast.success(`Winnings claimed! Transaction: ${hash}`);
      return hash;
    } catch (error) {
      console.error('Error claiming:', error);
      toast.error('Failed to claim winnings');
      throw error;
    }
  };

  return {
    claim,
    isPending,
  };
}

export function useCalculatePayout(roundId: bigint, chainId?: number) {
  const { address } = useAccount();
  const { contractAddress, abi } = useRoundEngine(chainId);

  const { data: payout, refetch: refetchPayout } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: 'calculatePayout',
    args: [roundId, address!],
    query: {
      enabled: !!contractAddress && !!address && roundId > 0n,
    }
  });

  return {
    payout: payout as bigint | undefined,
    refetchPayout,
    isLoading: !payout && !!contractAddress && !!address,
  };
}

// Hook for tracking contract events
export function useRoundEvents(chainId?: number) {
  const { contractAddress, abi } = useRoundEngine(chainId);
  const [events, setEvents] = useState<any[]>([]);

  // Track BetPlaced events
  useWatchContractEvent({
    address: contractAddress as `0x${string}`,
    abi,
    eventName: 'BetPlaced',
    onLogs(logs: any[]) {
      console.log('New bet placed:', logs);
      setEvents(prev => [...prev, ...logs]);
      toast('New bet placed in the round!', { icon: '🎯' });
    },
  });

  // Track RoundStarted events
  useWatchContractEvent({
    address: contractAddress as `0x${string}`,
    abi,
    eventName: 'RoundStarted',
    onLogs(logs: any[]) {
      console.log('New round started:', logs);
      setEvents(prev => [...prev, ...logs]);
      toast('New prediction round started!', { icon: '🚀' });
    },
  });

  return {
    events,
    clearEvents: () => setEvents([]),
  };
}
