import { claimPayout, type ClaimPayoutParams, type ClaimPayoutResult } from '@/hooks/useClaimPayout';
import { computeRoundResolution } from '@/lib/roundResolution';
import type { Room } from '@/types/room';

const inFlight = new Map<string, Promise<ClaimPayoutResult>>();
const completedKeys = new Set<string>();

function payoutKey(roundId: string, player: string): string {
  return `${roundId}:${player.toLowerCase()}`;
}

export function isPayoutSuccess(result: ClaimPayoutResult): boolean {
  return result.ok && (!!result.txHash || !!result.alreadyClaimed);
}

export function buildPayoutParams(
  room: Room,
  address: string,
  protocolFee: number,
): ClaimPayoutParams | null {
  const resolution = computeRoundResolution(room, address, protocolFee);
  const payload = resolution.recordPayload;
  if (!payload) return null;

  const { outcome, stake, payout } = payload;
  if (outcome !== 'win' && outcome !== 'tie') return null;
  if (payout <= 0) return null;

  return {
    roundId: room.id,
    player: address,
    outcome,
    stake,
    payout: Math.round(payout * 100) / 100,
    winner: resolution.winner,
    upPool: room.upPool,
    downPool: room.downPool,
  };
}

export async function ensureRoundPayout(
  params: ClaimPayoutParams,
  options?: { force?: boolean },
): Promise<ClaimPayoutResult> {
  const key = payoutKey(params.roundId, params.player);
  if (!options?.force && completedKeys.has(key)) {
    return { ok: true, alreadyClaimed: true };
  }

  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = claimPayout({
    ...params,
    player: params.player,
    payout: Math.round(params.payout * 100) / 100,
  }).then(result => {
    if (isPayoutSuccess(result)) completedKeys.add(key);
    return result;
  }).finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, promise);
  return promise;
}
