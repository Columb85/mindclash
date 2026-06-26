'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.mindclash.xyz/api';

export type PayoutOutcome = 'win' | 'tie';

export interface ClaimPayoutParams {
  roundId: string;
  player: string;
  outcome: PayoutOutcome;
  stake: number;
  payout: number;
  winner: 'UP' | 'DOWN' | 'TIE';
  upPool: number;
  downPool: number;
}

export interface ClaimPayoutResult {
  ok: boolean;
  txHash?: string | null;
  amount?: number;
  alreadyClaimed?: boolean;
  error?: string;
}

export async function claimPayout(params: ClaimPayoutParams): Promise<ClaimPayoutResult> {
  try {
    const res = await fetch(`${API_URL}/payouts/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: json.error || json.message || 'Payout failed' };
    }
    return {
      ok: true,
      txHash: json.txHash ?? null,
      amount: json.amount,
      alreadyClaimed: !!json.alreadyClaimed,
    };
  } catch {
    return { ok: false, error: 'Network error' };
  }
}
