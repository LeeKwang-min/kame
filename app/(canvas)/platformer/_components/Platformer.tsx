'use client';
import { useEffect, useRef } from 'react';
import { setupPlatformer, TPlatformerCallbacks } from '../_lib/game';
import { useCreateScore, useGameSession } from '@/service/scores';

function Platformer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { mutateAsync: saveScore } = useCreateScore('platformer');
  const { mutateAsync: createSession } = useGameSession('platformer');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TPlatformerCallbacks = {
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
          gameType: 'platformer',
          initials,
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
      },
    };

    return setupPlatformer(canvas, callbacks);
  }, [saveScore, createSession]);

  return (
    <div className="w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full max-w-[1200px] max-h-[800px] mx-auto border touch-none"
      />
    </div>
  );
}

export default Platformer;
