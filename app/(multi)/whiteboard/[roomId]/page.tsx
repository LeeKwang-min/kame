'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/use-socket';
import { useIsMobile } from '@/hooks/use-mobile';
import WhiteboardCanvas from '../_components/whiteboard-canvas';
import PlayerList from '../_components/player-list';
import { TRoomDetail, TStroke } from '../_lib/types';
import { Menu } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

function WhiteboardRoomPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const { socket, isConnected, emit, on } = useSocket();
  const isMobile = useIsMobile();

  const [room, setRoom] = useState<TRoomDetail | null>(null);
  const [strokes, setStrokes] = useState<TStroke[]>([]);
  const [error, setError] = useState<string | null>(null);
  const joinedRef = useRef(false);

  useEffect(() => {
    if (!isConnected || joinedRef.current) return;
    joinedRef.current = true;

    const playerName = sessionStorage.getItem('whiteboard:playerName') || '익명';
    emit('room:join', { roomId: params.roomId, playerName });
    emit('draw:request-sync');
  }, [isConnected, emit, params.roomId]);

  useEffect(() => {
    const offJoined = on('room:joined', (data: { room: TRoomDetail }) => {
      setRoom(data.room);
    });
    const offStroke = on('draw:stroke', (stroke: TStroke) => {
      setStrokes((prev) => [...prev, stroke]);
    });
    const offSync = on('draw:sync', (data: { strokes: TStroke[] }) => {
      setStrokes(data.strokes);
    });
    const offClear = on('draw:clear', () => {
      setStrokes([]);
    });
    const offPlayerJoined = on(
      'room:player-joined',
      (data: { room: TRoomDetail }) => {
        setRoom(data.room);
      }
    );
    const offPlayerLeft = on(
      'room:player-left',
      (data: { room: TRoomDetail }) => {
        setRoom(data.room);
      }
    );
    const offClosed = on('room:closed', () => {
      setError('방이 닫혔습니다.');
      setTimeout(() => router.push('/whiteboard'), 2000);
    });
    const offError = on('room:error', (data: { message: string }) => {
      setError(data.message);
    });

    return () => {
      offJoined();
      offStroke();
      offSync();
      offClear();
      offPlayerJoined();
      offPlayerLeft();
      offClosed();
      offError();
    };
  }, [on, router]);

  const handleStroke = useCallback(
    (stroke: TStroke) => emit('draw:stroke', stroke),
    [emit]
  );
  const handleClear = useCallback(() => {
    emit('draw:clear');
  }, [emit]);
  const handleUndo = useCallback(() => emit('draw:undo'), [emit]);
  const handleLeave = useCallback(() => {
    emit('room:leave');
    router.push('/whiteboard');
  }, [emit, router]);

  const myId = socket.current?.id || '';
  const isHost = room ? room.hostId === myId : false;

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  const playerListContent = room ? (
    <div className="flex flex-col gap-4">
      <PlayerList players={room.players} hostId={room.hostId} myId={myId} />
      <button
        onClick={handleLeave}
        className="w-full px-4 py-2 text-sm border border-red-800 rounded-lg text-red-400 hover:bg-red-900/20 transition"
      >
        방 나가기
      </button>
    </div>
  ) : null;

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
                {playerListContent}
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex-1 w-full">
          <WhiteboardCanvas
            onStroke={handleStroke}
            onClear={handleClear}
            onUndo={handleUndo}
            remoteStrokes={strokes}
            myId={myId}
            isHost={isHost}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <div className="flex-1 max-w-[850px]">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-arcade-muted font-mono">
            방 #{params.roomId}
          </span>
          {!isConnected && (
            <span className="text-xs text-red-400">연결 끊김</span>
          )}
        </div>
        <WhiteboardCanvas
          onStroke={handleStroke}
          onClear={handleClear}
          onUndo={handleUndo}
          remoteStrokes={strokes}
          myId={myId}
          isHost={isHost}
        />
      </div>
      <aside className="shrink-0 w-56">{playerListContent}</aside>
    </section>
  );
}

export default WhiteboardRoomPage;
