import { BOT_PROFILES } from '@/contexts/RoomsContext';
import { xpForOutcome, xpForBotBeating } from '@/contexts/PlayerContext';
import { Direction, Room } from '@/types/room';

export interface BotResult {
  name: string;
  strategy: string;
  direction: Direction | null;
  beat: boolean;
}

export type UserOutcome = 'win' | 'loss' | 'tie' | null;

export interface RoundResolution {
  winner: Direction | 'TIE';
  userOutcome: UserOutcome;
  userPayout: number;
  userStake: number;
  ptsGained: number;
  botsBeatenCount: number;
  botResults: BotResult[];
  profit: number;
  recordPayload: {
    outcome: 'win' | 'loss' | 'tie';
    stake: number;
    payout: number;
    botsBeaten: number;
  } | null;
}

const processedRoomIds = new Set<string>();

export function tryMarkRoomProcessed(roomId: string): boolean {
  if (processedRoomIds.has(roomId)) return false;
  processedRoomIds.add(roomId);
  return true;
}

export function isRoomProcessed(roomId: string): boolean {
  return processedRoomIds.has(roomId);
}

export function computeRoundResolution(
  room: Room,
  userAddress: string | undefined,
  protocolFee: number,
): RoundResolution {
  const myAddr = userAddress?.toLowerCase();
  const myPreds = myAddr
    ? room.predictions.filter(p => p.address.toLowerCase() === myAddr)
    : [];

  const resolvedWinner: Direction | 'TIE' =
    (room.endPrice ?? 0) > (room.startPrice ?? 0) ? 'UP' :
    (room.endPrice ?? 0) < (room.startPrice ?? 0) ? 'DOWN' : 'TIE';

  const resolved: (BotResult & { botWon: boolean })[] = BOT_PROFILES.map(bot => {
    const pred = room.predictions.find(p => p.address.toLowerCase() === bot.address.toLowerCase());
    const botDir = (pred?.direction ?? null) as Direction | null;
    const botWon = resolvedWinner !== 'TIE' && botDir === resolvedWinner;
    return { name: bot.name, strategy: bot.strategy, direction: botDir, beat: false, botWon };
  });

  let userOutcome: UserOutcome = null;
  let userPayout = 0;
  let userStake = 0;
  let ptsGained = 0;
  let botsBeatenCount = 0;
  let profit = 0;
  let recordPayload: RoundResolution['recordPayload'] = null;

  if (myPreds.length > 0 && room.startPrice != null && room.endPrice != null) {
    const totalStake = myPreds.reduce((s, p) => s + p.amount, 0);
    userStake = totalStake;

    if (resolvedWinner === 'TIE') {
      userOutcome = 'tie';
      userPayout = totalStake;
      ptsGained = xpForOutcome('tie', 0);
      recordPayload = { outcome: 'tie', stake: totalStake, payout: totalStake, botsBeaten: 0 };
    } else {
      const winnerStake = myPreds
        .filter(p => p.direction === resolvedWinner)
        .reduce((s, p) => s + p.amount, 0);
      const userWon = winnerStake > 0;

      resolved.forEach(b => { b.beat = userWon && !b.botWon; });
      botsBeatenCount = resolved.filter(b => b.beat).length;

      if (userWon) {
        const winningPool = resolvedWinner === 'UP' ? room.upPool : room.downPool;
        const losingPool  = resolvedWinner === 'UP' ? room.downPool : room.upPool;
        const multiplier  = winningPool > 0 ? 1 + (losingPool * (1 - protocolFee)) / winningPool : 1;
        userPayout = winnerStake * multiplier;
        profit = Math.max(0, userPayout - winnerStake);
        userOutcome = 'win';
        ptsGained = xpForOutcome('win', profit) + xpForBotBeating(botsBeatenCount);
        recordPayload = { outcome: 'win', stake: winnerStake, payout: userPayout, botsBeaten: botsBeatenCount };
      } else {
        userOutcome = 'loss';
        userPayout = 0;
        ptsGained = xpForOutcome('loss', 0);
        recordPayload = { outcome: 'loss', stake: totalStake, payout: 0, botsBeaten: 0 };
      }
    }
  } else {
    resolved.forEach(b => { b.beat = false; });
  }

  return {
    winner: resolvedWinner,
    userOutcome,
    userPayout,
    userStake,
    ptsGained,
    botsBeatenCount,
    botResults: resolved.map(({ botWon: _, ...rest }) => rest),
    profit,
    recordPayload,
  };
}
