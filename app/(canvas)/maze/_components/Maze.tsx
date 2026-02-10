'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setupMaze, TMazeCallbacks, TMazeCleanup } from '../_lib/game';
import { useCreateScore, useGameSession } from '@/service/scores';

function Maze() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const gameRef = useRef<TMazeCleanup | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore('maze');
  const { mutateAsync: createSession } = useGameSession('maze');
  const isLoggedIn = !!session;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TMazeCallbacks = {
      onGameStart: async () => {
        try {
          const gameSession = await createSession();
          sessionTokenRef.current = gameSession.token;
        } catch (error) {
          console.error('Failed to create game session:', error);
        }
      },
      onScoreSave: async (score) => {
        if (!sessionTokenRef.current) return { saved: false };
        const result = await saveScore({
          gameType: 'maze',
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
      isLoggedIn,
    };

    const game = setupMaze(canvas, callbacks);
    gameRef.current = game;

    return () => {
      game.cleanup();
      gameRef.current = null;
    };
  }, [saveScore, createSession]); // isLoggedIn 제거

  // isLoggedIn 변경 시 게임 재설정 없이 HUD만 업데이트
  useEffect(() => {
    gameRef.current?.setLoggedIn(isLoggedIn);
  }, [isLoggedIn]);

  return (
    <div className="w-full h-full flex justify-center">
      <canvas
        ref={canvasRef}
        className="w-[800px] h-[600px] border border-white/20 rounded-2xl shadow-lg"
      />
    </div>
  );
}

export default Maze;
