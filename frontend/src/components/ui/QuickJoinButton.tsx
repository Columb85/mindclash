'use client';

import { useMemo } from 'react';
import { useRooms } from '@/contexts/RoomsContext';
import { Room } from '@/types/room';
import { Tooltip } from './Tooltip';

interface QuickJoinButtonProps {
  onJoin: (room: Room) => void;
}

export function QuickJoinButton({ onJoin }: QuickJoinButtonProps) {
  const { rooms } = useRooms();

  const nextRoom = useMemo(() => {
    const openRooms = rooms.filter(r => r.status === 'open');
    if (!openRooms.length) return null;
    return openRooms.sort((a, b) => (a.startTime ?? 0) - (b.startTime ?? 0))[0];
  }, [rooms]);

  if (!nextRoom) {
    return (
      <Tooltip text="No rounds open for joining" position="bottom">
        <button className="quick-join-btn" disabled>
          <i className="fa-solid fa-clock" />
          No Open Rounds
        </button>
      </Tooltip>
    );
  }

  const asset = nextRoom.asset || 'BTC';
  
  return (
    <Tooltip text="Press Q to quick join" position="bottom">
      <button className="quick-join-btn" onClick={() => onJoin(nextRoom)}>
        <i className="fa-solid fa-bolt" />
        Quick Join {asset}
        <span style={{ opacity: 0.6, fontSize: 12, marginLeft: 4 }}>
          #{nextRoom.id?.slice(-4) || ''}
        </span>
      </button>
    </Tooltip>
  );
}
