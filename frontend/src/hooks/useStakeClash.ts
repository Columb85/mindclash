'use client';

import { useCallback, useState } from 'react';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { parseUnits } from 'viem';
import { CLASH_TOKEN_ADDRESS, TREASURY_ADDRESS, CLASH_ABI } from '@/contexts/ClashContext';

export function useStakeClash() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [isStaking, setIsStaking] = useState(false);

  const stakeClash = useCallback(async (amount: number): Promise<{ ok: boolean; hash?: string }> => {
    if (!address || !publicClient) return { ok: false };
    if (amount <= 0) return { ok: false };

    setIsStaking(true);
    try {
      const hash = await writeContractAsync({
        address: CLASH_TOKEN_ADDRESS,
        abi: CLASH_ABI,
        functionName: 'transfer',
        args: [TREASURY_ADDRESS, parseUnits(String(Math.floor(amount)), 18)],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return { ok: true, hash };
    } catch {
      return { ok: false };
    } finally {
      setIsStaking(false);
    }
  }, [address, publicClient, writeContractAsync]);

  return { stakeClash, isStaking };
}
