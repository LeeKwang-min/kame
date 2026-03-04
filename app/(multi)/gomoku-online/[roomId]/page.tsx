'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useSocket } from '@/hooks/use-socket';
import { useIsMobile } from '@/hooks/use-mobile';
import GomokuBoard from '../_components/gomoku-board';
import PlayerInfo from '../_components/player-info';
import {
  TRoomDetail,
  TGomokuStone,
  TGomokuPlacedPayload,
  TGomokuGameOverPayload,
  TGomokuSyncPayload,
  TGomokuRestartPayload,
} from '../_lib/types';
import { BOARD_SIZE } from '@/lib/gomoku';
import { createBoard } from '@/lib/gomoku';
import type { TPosition } from '@/lib/gomoku';
import { Menu } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

function GomokuOnlineRoomPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const { socket, isConnected, emit, on } = useSocket();
  const isMobile = useIsMobile();

  const [room, setRoom] = useState<TRoomDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const joinedRef = useRef(false);
  const closedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Game state
  const [board, setBoard] = useState<TGomokuStone[][]>(createBoard());
  const [currentTurn, setCurrentTurn] = useState<1 | 2>(1);
  const [lastMove, setLastMove] = useState<TPosition | null>(null);
  const [winLine, setWinLine] = useState<TPosition[] | null>(null);
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [playerOrder, setPlayerOrder] = useState<[string, string] | null>(null);
  const [gameStarted, setGameStarted] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.replace('/gomoku-online');
    }
  }, [authStatus, router]);

  // Join room on connect
  useEffect(() => {
    if (!isConnected || joinedRef.current || authStatus !== 'authenticated') return;
    joinedRef.current = true;

    const playerName =
      sessionStorage.getItem('gomoku:playerName') || session?.user?.name || '익명';
    emit('room:join', { roomId: params.roomId, playerName });
    emit('gomoku:request-sync');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, emit, params.roomId, authStatus]);

  // Leave room on unmount
  useEffect(() => {
    return () => {
      if (joinedRef.current) {
        emit('room:leave');
        joinedRef.current = false;
      }
    };
  }, [emit]);

  // Room events
  useEffect(() => {
    const offJoined = on('room:joined', (data: { room: TRoomDetail }) => {
      setRoom(data.room);
    });

    const offPlayerJoined = on('room:player-joined', (data: { room: TRoomDetail }) => {
      setRoom(data.room);
    });

    const offPlayerLeft = on('room:player-left', (data: { room: TRoomDetail }) => {
      setRoom(data.room);
    });

    const offClosed = on('room:closed', () => {
      setError('방이 닫혔습니다.');
      closedTimerRef.current = setTimeout(() => router.push('/gomoku-online'), 2000);
    });

    const offError = on('room:error', (data: { message: string }) => {
      setError(data.message);
    });

    return () => {
      offJoined();
      offPlayerJoined();
      offPlayerLeft();
      offClosed();
      offError();
      if (closedTimerRef.current) clearTimeout(closedTimerRef.current);
    };
  }, [on, router]);

  // Game events
  useEffect(() => {
    const offStarted = on('gomoku:started', (data: TGomokuSyncPayload) => {
      setBoard(data.board);
      setCurrentTurn(data.turn);
      setPlayerOrder(data.playerOrder);
      setWinner(data.winner);
      setWinLine(data.winLine);
      setIsDraw(data.isDraw);
      setLastMove(null);
      setGameStarted(true);
    });

    const offPlaced = on('gomoku:placed', (data: TGomokuPlacedPayload) => {
      setBoard((prev) => {
        const newBoard = prev.map((row) => [...row]);
        newBoard[data.y][data.x] = data.stone;
        return newBoard;
      });
      setLastMove({ x: data.x, y: data.y });
      setCurrentTurn(data.nextTurn);
    });

    const offGameOver = on('gomoku:gameover', (data: TGomokuGameOverPayload) => {
      setWinner(data.winner);
      setWinLine(data.winLine);
      setIsDraw(data.isDraw);
    });

    const offSync = on('gomoku:sync', (data: TGomokuSyncPayload | null) => {
      if (!data) return;
      setBoard(data.board);
      setCurrentTurn(data.turn);
      setPlayerOrder(data.playerOrder);
      setWinner(data.winner);
      setWinLine(data.winLine);
      setIsDraw(data.isDraw);
      setGameStarted(true);

      // Reconstruct lastMove from moveHistory
      if (data.moveHistory.length > 0) {
        const last = data.moveHistory[data.moveHistory.length - 1];
        setLastMove({ x: last.x, y: last.y });
      }
    });

    const offRestarted = on('gomoku:restarted', (data: TGomokuRestartPayload) => {
      setBoard(data.board);
      setCurrentTurn(data.turn);
      setPlayerOrder(data.playerOrder);
      setWinner(null);
      setWinLine(null);
      setIsDraw(false);
      setLastMove(null);
      setGameStarted(true);
    });

    return () => {
      offStarted();
      offPlaced();
      offGameOver();
      offSync();
      offRestarted();
    };
  }, [on]);

  const handlePlace = useCallback(
    (x: number, y: number) => {
      emit('gomoku:place', { x, y });
    },
    [emit]
  );

  const handleStartGame = useCallback(() => {
    emit('gomoku:init');
  }, [emit]);

  const handleSurrender = useCallback(() => {
    emit('gomoku:surrender');
  }, [emit]);

  const handleRestart = useCallback(() => {
    emit('gomoku:restart');
  }, [emit]);

  const handleLeave = useCallback(() => {
    router.push('/gomoku-online');
  }, [router]);

  const myId = socket.current?.id || '';
  const isHost = room ? room.hostId === myId : false;
  const isGameOver = winner !== null || isDraw;
  const canStart = isHost && room && room.players.length === 2 && !gameStarted;

  if (authStatus === 'loading') {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-arcade-muted">로딩 중...</p>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    return null;
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  const sidebarContent = (
    <div className="flex flex-col gap-4">
      {room && (
        <PlayerInfo
          players={room.players}
          playerOrder={playerOrder}
          currentTurn={currentTurn}
          myId={myId}
          winner={winner}
          isDraw={isDraw}
        />
      )}

      {/* Start button (host only, when 2 players joined, game not started) */}
      {canStart && (
        <button
          onClick={handleStartGame}
          className="w-full px-4 py-2 text-sm bg-arcade-cyan text-black font-bold rounded-lg hover:brightness-110 transition"
        >
          게임 시작
        </button>
      )}

      {/* Waiting for opponent */}
      {room && room.players.length < 2 && !gameStarted && (
        <div className="text-center text-sm text-arcade-muted py-2">
          상대를 기다리는 중...
        </div>
      )}

      {/* Waiting for host to start */}
      {room && room.players.length === 2 && !gameStarted && !isHost && (
        <div className="text-center text-sm text-arcade-muted py-2">
          호스트가 게임을 시작하기를 기다리는 중...
        </div>
      )}

      {/* Surrender button (during game) */}
      {gameStarted && !isGameOver && (
        <button
          onClick={handleSurrender}
          className="w-full px-4 py-2 text-sm border border-red-800 rounded-lg text-red-400 hover:bg-red-900/20 transition"
        >
          기권
        </button>
      )}

      {/* Restart button (after game over, host only) */}
      {isGameOver && isHost && (
        <button
          onClick={handleRestart}
          className="w-full px-4 py-2 text-sm bg-arcade-cyan text-black font-bold rounded-lg hover:brightness-110 transition"
        >
          재대국 (흑백 교체)
        </button>
      )}

      {isGameOver && !isHost && (
        <div className="text-center text-sm text-arcade-muted py-2">
          호스트가 재대국을 시작하기를 기다리는 중...
        </div>
      )}

      <button
        onClick={handleLeave}
        className="w-full px-4 py-2 text-sm border border-red-800 rounded-lg text-red-400 hover:bg-red-900/20 transition"
      >
        방 나가기
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <section className="w-full h-full flex flex-col items-center">
        <div className="w-full flex items-center justify-between px-2 pb-2">
          <span className="text-sm text-arcade-muted font-mono">
            #{params.roomId}
          </span>
          <Sheet>
            <SheetTrigger asChild>
              <button className="p-2 rounded-lg border border-arcade-border bg-arcade-surface text-arcade-text">
                <Menu size={20} />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="bg-arcade-bg border-arcade-border overflow-y-auto"
            >
              <SheetHeader>
                <SheetTitle className="text-arcade-text">Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-6 p-4">
                {sidebarContent}
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex-1 w-full">
          <GomokuBoard
            myId={myId}
            playerOrder={playerOrder}
            board={board}
            currentTurn={currentTurn}
            lastMove={lastMove}
            winLine={winLine}
            winner={winner}
            isDraw={isDraw}
            onPlace={handlePlace}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <div className="flex-1 max-w-[680px]">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-arcade-muted font-mono">
            방 #{params.roomId}
          </span>
          {!isConnected && (
            <span className="text-xs text-red-400">연결 끊김</span>
          )}
        </div>
        <GomokuBoard
          myId={myId}
          playerOrder={playerOrder}
          board={board}
          currentTurn={currentTurn}
          lastMove={lastMove}
          winLine={winLine}
          winner={winner}
          isDraw={isDraw}
          onPlace={handlePlace}
        />
      </div>
      <aside className="shrink-0 w-56">{sidebarContent}</aside>
    </section>
  );
}

export default GomokuOnlineRoomPage;
