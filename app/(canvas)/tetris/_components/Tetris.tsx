'use client';

import { useEffect, useRef } from 'react';
import { setupTetris, TTetrisCallbacks } from '../_lib/game';
import { CELL, COLS, ROWS, SIDE_PANEL_WIDTH } from '../_lib/config';
import { useCreateScore, useGameSession } from '@/service/scores';

function Tetris() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { mutateAsync: saveScore } = useCreateScore('tetris');
  const { mutateAsync: createSession } = useGameSession('tetris');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TTetrisCallbacks = {
      onGameStart: async () => {
        try {
          const session = await createSession();
          sessionTokenRef.current = session.token;
        } catch (error) {
          console.error('Failed to create game session:', error);
        }
      },
      onScoreSave: async (initials, score) => {
        if (!sessionTokenRef.current) return;
        await saveScore({
          gameType: 'tetris',
          initials,
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
      },
    };

    return setupTetris(canvas, callbacks);
  }, [saveScore, createSession]);

  return (
    <div className="w-full h-full">
      <canvas
        ref={canvasRef}
        className="border touch-none mx-auto"
        style={{
          width: COLS * CELL + SIDE_PANEL_WIDTH,
          height: ROWS * CELL,
        }}
      />
    </div>
  );
}

export default Tetris;
