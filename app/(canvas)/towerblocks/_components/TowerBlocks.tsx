'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setupTowerBlocks, TTowerBlocksCallbacks } from '../_lib/game';
import { useCreateScore, useGameSession } from '@/service/scores';

function TowerBlocks() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore('towerblocks');
  const { mutateAsync: createSession } = useGameSession('towerblocks');
  const isLoggedIn = !!session;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TTowerBlocksCallbacks = {
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
          gameType: 'towerblocks',
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
      isLoggedIn,
    };

    return setupTowerBlocks(canvas, callbacks);
  }, [saveScore, createSession, isLoggedIn]);

  return (
    <div className="w-full h-full flex justify-center">
      <canvas
        ref={canvasRef}
        className="w-[400px] h-[750px] border border-white/20 rounded-2xl touch-none bg-[#a0c8eb] shadow-lg"
      />
    </div>
  );
}

export default TowerBlocks;
