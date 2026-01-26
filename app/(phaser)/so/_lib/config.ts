import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MainScene } from './scenes/MainScene';
import { GameOverScene } from './scenes/GameOverScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // WebGL 우선, 불가능하면 Canvas fallback
  width: 800,
  height: 600,
  backgroundColor: '#000000',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false, // 개발 시 true로 설정하면 충돌 영역 표시
    },
  },
  scene: [BootScene, MainScene, GameOverScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};