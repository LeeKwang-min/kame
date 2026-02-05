'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setupTetris, TTetrisCallbacks } from '../_lib/game';
import { CELL, COLS, ROWS, SIDE_PANEL_WIDTH } from '../_lib/config';
import { useCreateScore, useGameSession } from '@/service/scores';

function Tetris() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore('tetris');
  const { mutateAsync: createSession } = useGameSession('tetris');
  const isLoggedIn = !!session;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TTetrisCallbacks = {
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
          gameType: 'tetris',
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
      isLoggedIn,
    };

    return setupTetris(canvas, callbacks);
  }, [saveScore, createSession, isLoggedIn]);

  return (
    <div className="w-full h-full">
      <canvas
        ref={canvasRef}
        className="border touch-none mx-auto bg-white"
        style={{
          width: COLS * CELL + SIDE_PANEL_WIDTH,
          height: ROWS * CELL,
        }}
      />
    </div>
  );
}

export default Tetris;
