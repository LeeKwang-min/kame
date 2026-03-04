'use client';

import { TPlayer } from '../_lib/types';

type TProps = {
  players: TPlayer[];
  playerOrder: [string, string] | null;
  currentTurn: 1 | 2;
  myId: string;
  winner: 1 | 2 | null;
  isDraw: boolean;
};

function PlayerInfo({ players, playerOrder, currentTurn, myId, winner, isDraw }: TProps) {
  const getPlayerBySocketId = (socketId: string): TPlayer | undefined => {
    return players.find((p) => p.id === socketId);
  };

  const blackPlayer = playerOrder ? getPlayerBySocketId(playerOrder[0]) : null;
  const whitePlayer = playerOrder ? getPlayerBySocketId(playerOrder[1]) : null;

  const isGameOver = winner !== null || isDraw;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-bold text-arcade-muted uppercase tracking-wide">
        Players ({players.length}/2)
      </h3>

      {/* Black player */}
      <div
        className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition ${
          !isGameOver && currentTurn === 1
            ? 'border-arcade-cyan bg-arcade-cyan/10'
            : winner === 1
              ? 'border-green-500 bg-green-900/20'
              : 'border-arcade-border bg-arcade-surface/50'
        }`}
      >
        <div className="w-5 h-5 rounded-full bg-gray-900 border border-gray-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm text-arcade-text truncate block">
            {blackPlayer?.name || '대기 중...'}
            {blackPlayer && blackPlayer.id === myId && (
              <span className="text-arcade-muted ml-1">(나)</span>
            )}
          </span>
          <span className="text-xs text-arcade-muted">흑</span>
        </div>
        {!isGameOver && currentTurn === 1 && (
          <span className="text-xs px-1.5 py-0.5 bg-arcade-cyan/20 text-arcade-cyan rounded shrink-0">
            차례
          </span>
        )}
        {winner === 1 && (
          <span className="text-xs px-1.5 py-0.5 bg-green-900/40 text-green-400 rounded shrink-0">
            승리
          </span>
        )}
      </div>

      {/* White player */}
      <div
        className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition ${
          !isGameOver && currentTurn === 2
            ? 'border-arcade-cyan bg-arcade-cyan/10'
            : winner === 2
              ? 'border-green-500 bg-green-900/20'
              : 'border-arcade-border bg-arcade-surface/50'
        }`}
      >
        <div className="w-5 h-5 rounded-full bg-gray-100 border border-gray-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm text-arcade-text truncate block">
            {whitePlayer?.name || '대기 중...'}
            {whitePlayer && whitePlayer.id === myId && (
              <span className="text-arcade-muted ml-1">(나)</span>
            )}
          </span>
          <span className="text-xs text-arcade-muted">백</span>
        </div>
        {!isGameOver && currentTurn === 2 && (
          <span className="text-xs px-1.5 py-0.5 bg-arcade-cyan/20 text-arcade-cyan rounded shrink-0">
            차례
          </span>
        )}
        {winner === 2 && (
          <span className="text-xs px-1.5 py-0.5 bg-green-900/40 text-green-400 rounded shrink-0">
            승리
          </span>
        )}
      </div>

      {isDraw && (
        <div className="text-center text-sm text-yellow-400 py-1">무승부</div>
      )}

      {/* Renju rule note */}
      <div className="text-xs text-arcade-muted mt-2 leading-relaxed">
        렌주룰 적용: 흑은 33/44/장목 금지
      </div>
    </div>
  );
}

export default PlayerInfo;
