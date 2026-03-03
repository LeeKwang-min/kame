'use client';

import { TPlayer } from '../_lib/types';

type TProps = {
  players: TPlayer[];
  hostId: string;
  myId: string;
};

const PLAYER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
];

function PlayerList({ players, hostId, myId }: TProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-bold text-arcade-muted uppercase tracking-wide">
        Players ({players.length})
      </h3>
      {players.map((player, i) => (
        <div
          key={player.id}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-arcade-surface/50"
        >
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: PLAYER_COLORS[i % PLAYER_COLORS.length] }}
          />
          <span className="text-sm text-arcade-text truncate">
            {player.name}
            {player.id === myId && <span className="text-arcade-muted ml-1">(나)</span>}
          </span>
          {player.id === hostId && (
            <span className="text-[10px] px-1.5 py-0.5 bg-yellow-900/40 text-yellow-400 rounded ml-auto">
              HOST
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default PlayerList;
