'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import toast from 'react-hot-toast';
import { useRooms } from '@/contexts/RoomsContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { useClash, POINTS_REWARDS } from '@/contexts/ClashContext';
import { useActivity } from '@/contexts/ActivityContext';
import { Room } from '@/types/room';
import {
  computeRoundResolution,
  tryMarkRoomProcessed,
} from '@/lib/roundResolution';
import { AchievementToast } from '@/components/player/AchievementToast';
import { RoundResultToast } from '@/components/game/RoundResultToast';

const STORAGE_KEY = 'mindclash_active_room';

function loadPinnedId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(STORAGE_KEY);
}

function savePinnedId(id: string | null) {
  if (typeof window === 'undefined') return;
  if (id) sessionStorage.setItem(STORAGE_KEY, id);
  else sessionStorage.removeItem(STORAGE_KEY);
}

function findUserActiveRoom(rooms: Room[], address: string | undefined): Room | undefined {
  if (!address) return undefined;
  const addr = address.toLowerCase();
  return rooms.find(
    r =>
      (r.status === 'open' || r.status === 'live') &&
      r.predictions.some(p => p.address.toLowerCase() === addr),
  );
}

interface ActiveRoundContextType {
  pinnedRoomId: string | null;
  pinnedRoom: Room | undefined;
  viewingRoomId: string | null;
  pinRoom: (roomId: string) => void;
  setViewingRoom: (roomId: string | null) => void;
  clearPin: () => void;
  returnToRound: () => void;
  isAwayFromRound: boolean;
  hasActiveRound: boolean;
}

const ActiveRoundContext = createContext<ActiveRoundContextType | undefined>(undefined);

export function ActiveRoundProvider({ children }: { children: ReactNode }) {
  const { rooms, protocolFee } = useRooms();
  const { address } = useAccount();
  const { stats, recordResult } = usePlayer();
  const { addPoints } = useClash();
  const { push: pushActivity } = useActivity();
  const router = useRouter();
  const pathname = usePathname();

  const [pinnedRoomId, setPinnedRoomId] = useState<string | null>(loadPinnedId);
  const [viewingRoomId, setViewingRoomId] = useState<string | null>(null);

  const pinnedRoom = pinnedRoomId ? rooms.find(r => r.id === pinnedRoomId) : undefined;

  const pinRoom = useCallback((roomId: string) => {
    setPinnedRoomId(roomId);
    savePinnedId(roomId);
  }, []);

  const clearPin = useCallback(() => {
    setPinnedRoomId(null);
    savePinnedId(null);
  }, []);

  const setViewingRoom = useCallback((roomId: string | null) => {
    setViewingRoomId(roomId);
  }, []);

  const returnToRound = useCallback(() => {
    if (!pinnedRoomId) return;
    if (pathname === '/app') {
      window.dispatchEvent(new CustomEvent('mindclash:return-to-round', { detail: { roomId: pinnedRoomId } }));
    } else {
      router.push(`/app?room=${encodeURIComponent(pinnedRoomId)}`);
    }
  }, [pinnedRoomId, pathname, router]);

  // Auto-pin when user has an open/live bet
  useEffect(() => {
    const active = findUserActiveRoom(rooms, address);
    if (active) {
      setPinnedRoomId(active.id);
      savePinnedId(active.id);
    } else if (pinnedRoomId && rooms.length > 0) {
      const pinned = rooms.find(r => r.id === pinnedRoomId);
      // Wait for rooms to load before clearing; resolved rooms handled by resolution watcher
      if (!pinned) clearPin();
    }
  }, [rooms, address, pinnedRoomId, clearPin]);

  // Process resolution when user is away from the round
  useEffect(() => {
    if (!pinnedRoom || pinnedRoom.status !== 'resolved') return;
    if (viewingRoomId === pinnedRoom.id) return;
    if (!tryMarkRoomProcessed(pinnedRoom.id)) return;

    const resolution = computeRoundResolution(pinnedRoom, address, protocolFee);

    if (resolution.recordPayload) {
      const { outcome, stake, payout, botsBeaten } = resolution.recordPayload;

      if (outcome === 'win') {
        addPoints(POINTS_REWARDS.ROUND_WON, 'round_won');
        if (botsBeaten >= 1) addPoints(POINTS_REWARDS.BEAT_AI, 'beat_ai');
        const newStreak = stats.currentStreak + 1;
        if (newStreak === 3) addPoints(POINTS_REWARDS.WIN_STREAK_3, 'streak_3');
        if (newStreak === 5) addPoints(POINTS_REWARDS.WIN_STREAK_5, 'streak_5');
      }

      recordResult({ outcome, stake, payout, botsBeaten }).forEach(ach =>
        toast.custom(() => <AchievementToast achievement={ach} />, { duration: 5000 }),
      );
    }

    pushActivity({
      type: 'round_end',
      asset: pinnedRoom.asset,
      winner: resolution.winner,
      text: `${pinnedRoom.asset} round ended — ${resolution.winner} won`,
    });

    if (resolution.userOutcome) {
      toast.custom(
        t => (
          <RoundResultToast
            toastId={t.id}
            asset={pinnedRoom.asset}
            winner={resolution.winner}
            outcome={resolution.userOutcome!}
            payout={resolution.userPayout}
            stake={resolution.userStake}
            profit={resolution.profit}
            ptsGained={resolution.ptsGained}
            onViewResults={() => {
              toast.dismiss(t.id);
              pinRoom(pinnedRoom.id);
              returnToRound();
            }}
          />
        ),
        { duration: 8000 },
      );
    } else {
      toast(`🏁 ${pinnedRoom.asset} round ended — ${resolution.winner}`, {
        icon: resolution.winner === 'UP' ? '📈' : resolution.winner === 'DOWN' ? '📉' : '➖',
        duration: 4000,
      });
    }

    clearPin();
  }, [
    pinnedRoom,
    viewingRoomId,
    address,
    protocolFee,
    stats.currentStreak,
    recordResult,
    addPoints,
    pushActivity,
    clearPin,
    pinRoom,
    returnToRound,
  ]);

  const hasActiveRound = !!pinnedRoom && (pinnedRoom.status === 'open' || pinnedRoom.status === 'live');
  const isAwayFromRound = hasActiveRound && viewingRoomId !== pinnedRoomId;

  return (
    <ActiveRoundContext.Provider
      value={{
        pinnedRoomId,
        pinnedRoom,
        viewingRoomId,
        pinRoom,
        setViewingRoom,
        clearPin,
        returnToRound,
        isAwayFromRound,
        hasActiveRound,
      }}
    >
      {children}
    </ActiveRoundContext.Provider>
  );
}

export function useActiveRound() {
  const ctx = useContext(ActiveRoundContext);
  if (!ctx) throw new Error('useActiveRound must be used within ActiveRoundProvider');
  return ctx;
}
