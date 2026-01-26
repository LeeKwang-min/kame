'use client';
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { gameConfig } from '../_lib/config';

function PhaserGame() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    // Phaser 게임 인스턴스 생성
    gameRef.current = new Phaser.Game({
      ...gameConfig,
      parent: containerRef.current,
    });

    // Cleanup: 컴포넌트 언마운트 시 게임 인스턴스 파괴
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-full">
      <div ref={containerRef} className="w-full h-[600px]" />
    </div>
  );
}

export default PhaserGame;
