'use client';
import { useEffect, useRef } from 'react';
import { setupMissileCommand, TMissileCommandCallbacks } from '../_lib/game';
import { useCreateScore, useGameSession } from '@/service/scores';

function MissileCommand() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { mutateAsync: saveScore } = useCreateScore('missilecommand');
  const { mutateAsync: createSession } = useGameSession('missilecommand');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TMissileCommandCallbacks = {
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
          gameType: 'missilecommand',
          initials,
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
      },
    };

    return setupMissileCommand(canvas, callbacks);
  }, [saveScore, createSession]);

  return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-[600px] border touch-none" />
    </div>
  );
}

export default MissileCommand;
