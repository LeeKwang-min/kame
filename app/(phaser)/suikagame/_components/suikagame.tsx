'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { useSession } from 'next-auth/react';
import { useCreateScore, useGameSession } from '@/service/scores';
import { GameOverAdOverlay, useGameOverAd } from '@/components/ads';
import { GAME_WIDTH, GAME_HEIGHT, PHYSICS_CONFIG } from '../_lib/config';
import { BootScene } from '../_lib/scenes/BootScene';
import { GameScene } from '../_lib/scenes/GameScene';
import { UIScene } from '../_lib/scenes/UIScene';
import { GameOverScene } from '../_lib/scenes/GameOverScene';

function SuikaGame() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore('suikagame');
  const { mutateAsync: createSession } = useGameSession('suikagame');
  const isLoggedIn = !!session;
  const {
    showAdOverlay,
    currentScore,
    shouldShowAdRef,
    restartRef,
    onGameOver,
    closeOverlay,
    handleRestart,
  } = useGameOverAd();

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: '#FFF8E7',
      scene: [BootScene, GameScene, UIScene, GameOverScene],
      physics: {
        default: 'matter',
        matter: {
          gravity: PHYSICS_CONFIG.gravity,
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      input: {
        touch: { capture: true },
      },
    };

    gameRef.current = new Phaser.Game(config);

    gameRef.current.registry.set('callbacks', {
      onGameStart: async () => {
        try {
          const gameSession = await createSession();
          sessionTokenRef.current = gameSession.token;
        } catch (error) {
          console.error('Failed to create game session:', error);
        }
      },
      onScoreSave: async (score: number) => {
        if (!sessionTokenRef.current) return { saved: false };
        const result = await saveScore({
          gameType: 'suikagame',
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
      isLoggedIn,
      onGameOver,
    });

    gameRef.current.registry.set('shouldShowAdRef', shouldShowAdRef);

    restartRef.current = () => {
      if (gameRef.current) {
        gameRef.current.scene.stop('GameOverScene');
        gameRef.current.scene.stop('UIScene');
        gameRef.current.scene.start('GameScene');
        (gameRef.current.scene as unknown as { launch(key: string): void }).launch('UIScene');
      }
    };

    return () => {
      restartRef.current = null;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [saveScore, createSession, isLoggedIn, onGameOver, shouldShowAdRef, restartRef]);

  return (
    <div className="w-full h-full flex justify-center">
      <div className="relative w-full max-w-[480px] aspect-[480/720]">
        <div
          ref={containerRef}
          className="w-full h-full border-2 border-amber-300/60 rounded-2xl shadow-lg overflow-hidden"
        />
        <GameOverAdOverlay
          visible={showAdOverlay}
          score={currentScore}
          isLoggedIn={isLoggedIn}
          onSave={async (score) => {
            if (!sessionTokenRef.current) return { saved: false };
            const result = await saveScore({
              gameType: 'suikagame',
              score: Math.floor(score),
              sessionToken: sessionTokenRef.current,
            });
            sessionTokenRef.current = null;
            return result;
          }}
          onSkip={closeOverlay}
          onRestart={handleRestart}
          onClose={closeOverlay}
        />
      </div>
    </div>
  );
}

export default SuikaGame;
