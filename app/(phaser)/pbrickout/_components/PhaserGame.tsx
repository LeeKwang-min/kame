'use client';
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { useSession } from 'next-auth/react';
import { GameOverAdOverlay, useGameOverAd } from '@/components/ads';
import { gameConfig } from '../_lib/config';

function PhaserGame() {
  // 게임 인스턴스와 DOM 컨테이너 참조
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { data: session } = useSession();
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
    // 컨테이너가 없거나 이미 게임이 생성되었으면 리턴
    if (!containerRef.current || gameRef.current) return;

    // Phaser 게임 인스턴스 생성
    // gameConfig의 parent 옵션을 컨테이너 DOM으로 설정
    gameRef.current = new Phaser.Game({
      ...gameConfig,
      parent: containerRef.current,
    });

    // 콜백을 Phaser 레지스트리에 전달
    gameRef.current.registry.set('callbacks', {
      onGameOver,
    });

    gameRef.current.registry.set('shouldShowAdRef', shouldShowAdRef);

    restartRef.current = () => {
      if (gameRef.current) {
        gameRef.current.scene.stop('GameOverScene');
        gameRef.current.scene.start('MainScene');
      }
    };

    // Cleanup: 컴포넌트 언마운트 시 게임 인스턴스 파괴
    // 메모리 누수 방지를 위해 중요!
    return () => {
      restartRef.current = null;
      if (gameRef.current) {
        gameRef.current.destroy(true); // true: 캐시된 텍스처도 제거
        gameRef.current = null;
      }
    };
  }, [onGameOver, shouldShowAdRef, restartRef]);

  return (
    <div className="w-full h-full">
      <div className="relative w-full h-[600px]">
        <div ref={containerRef} className="w-full h-full" />
        <GameOverAdOverlay
          visible={showAdOverlay}
          score={currentScore}
          isLoggedIn={isLoggedIn}
          onSave={async () => ({ saved: false })}
          onSkip={closeOverlay}
          onRestart={handleRestart}
          onClose={closeOverlay}
        />
      </div>
    </div>
  );
}

export default PhaserGame;
