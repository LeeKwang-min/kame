'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { useSocket } from '@/hooks/use-socket';
import { TRoomDetail, TRoomInfo } from '../_lib/types';
import { MAX_PLAYERS } from '../_lib/config';

function RoomLobby() {
  const router = useRouter();
  const { data: session } = useSession();
  const { isConnected, emit, on } = useSocket();
  const [rooms, setRooms] = useState<TRoomInfo[]>([]);
  const [nickname, setNickname] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const isLoggedIn = !!session?.user;

  useEffect(() => {
    if (!isConnected) return;

    const fetchRooms = async () => {
      try {
        const url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
        const res = await fetch(`${url}/rooms/whiteboard`);
        const data = await res.json();
        setRooms(data);
      } catch {
        // 서버 미연결
      }
    };

    fetchRooms();
    const interval = setInterval(fetchRooms, 3000);
    return () => clearInterval(interval);
  }, [isConnected]);

  useEffect(() => {
    const offCreated = on('room:created', (data: { room: TRoomDetail }) => {
      setIsCreating(false);
      router.push(`/whiteboard/${data.room.id}`);
    });

    const offJoined = on('room:joined', (data: { room: TRoomDetail }) => {
      router.push(`/whiteboard/${data.room.id}`);
    });

    const offError = on('room:error', (data: { message: string }) => {
      setIsCreating(false);
      alert(data.message);
    });

    return () => {
      offCreated();
      offJoined();
      offError();
    };
  }, [on, router]);

  const effectivePlayerName = nickname.trim() || session?.user?.name || '';

  const handleCreateRoom = useCallback(() => {
    if (!effectivePlayerName) return;
    setIsCreating(true);
    sessionStorage.setItem('whiteboard:playerName', effectivePlayerName);
    emit('room:create', {
      gameType: 'whiteboard',
      playerName: effectivePlayerName,
      maxPlayers: MAX_PLAYERS,
    });
  }, [effectivePlayerName, emit]);

  const handleJoinRoom = useCallback(
    (roomId: string) => {
      if (!isLoggedIn) {
        signIn('google', { callbackUrl: '/whiteboard' });
        return;
      }
      if (!effectivePlayerName) return;
      sessionStorage.setItem('whiteboard:playerName', effectivePlayerName);
      emit('room:join', { roomId, playerName: effectivePlayerName });
    },
    [isLoggedIn, effectivePlayerName, emit]
  );

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
        <span className="text-sm text-arcade-muted">
          {isConnected ? '서버 연결됨' : '연결 중...'}
        </span>
      </div>

      {isLoggedIn ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm text-arcade-muted">
            <span className="text-arcade-text font-medium">{session.user?.name}</span>
            (으)로 접속 중
          </span>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="닉네임 (비워두면 계정 이름 사용)"
              maxLength={10}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="flex-1 px-4 py-2 bg-arcade-surface border border-arcade-border rounded-lg text-arcade-text placeholder:text-arcade-muted focus:outline-none focus:border-arcade-cyan"
            />
            <button
              onClick={handleCreateRoom}
              disabled={!isConnected || !effectivePlayerName || isCreating}
              className="px-6 py-2 bg-arcade-cyan text-black font-bold rounded-lg disabled:opacity-40 hover:brightness-110 transition"
            >
              {isCreating ? '생성 중...' : '방 만들기'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-arcade-surface border border-arcade-border rounded-lg">
          <span className="text-sm text-arcade-muted">
            방을 만들거나 참가하려면 로그인이 필요합니다.
          </span>
          <button
            onClick={() => signIn('google', { callbackUrl: '/whiteboard' })}
            className="px-5 py-2 bg-arcade-cyan text-black font-bold rounded-lg hover:brightness-110 transition text-sm"
          >
            Google 로그인
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-arcade-text">방 목록</h2>
        {rooms.length === 0 ? (
          <p className="text-arcade-muted text-center py-8">
            열린 방이 없습니다. 새 방을 만들어보세요!
          </p>
        ) : (
          rooms.map((room) => (
            <div
              key={room.id}
              className="flex items-center justify-between p-4 bg-arcade-surface border border-arcade-border rounded-lg"
            >
              <div>
                <span className="text-arcade-text font-mono text-sm">#{room.id}</span>
                <span className="ml-3 text-arcade-muted text-sm">
                  {room.playerCount}/{room.maxPlayers}명
                </span>
                <span className={`ml-3 text-xs px-2 py-0.5 rounded ${
                  room.state === 'waiting'
                    ? 'bg-green-900/40 text-green-400'
                    : 'bg-yellow-900/40 text-yellow-400'
                }`}>
                  {room.state === 'waiting' ? '대기 중' : '진행 중'}
                </span>
              </div>
              <button
                onClick={() => handleJoinRoom(room.id)}
                disabled={!isConnected || room.state !== 'waiting' || room.playerCount >= room.maxPlayers}
                className="px-4 py-1.5 bg-arcade-surface border border-arcade-cyan text-arcade-cyan rounded-lg disabled:opacity-40 hover:bg-arcade-cyan hover:text-black transition text-sm"
              >
                참가
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default RoomLobby;
