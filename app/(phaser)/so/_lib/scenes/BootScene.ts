// app/(phaser)/_template/_lib/scenes/BootScene.ts

import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // 로딩 바 UI 생성
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;

    // 로딩 텍스트
    const loadingText = this.add.text(centerX, centerY - 50, 'Loading...', {
      fontSize: '24px',
      color: '#ffffff',
    });
    loadingText.setOrigin(0.5);

    // 로딩 바 배경
    const progressBarBg = this.add.graphics();
    progressBarBg.fillStyle(0x222222, 1);
    progressBarBg.fillRect(centerX - 150, centerY, 300, 30);

    // 로딩 바 진행률
    const progressBar = this.add.graphics();

    // 로딩 진행 이벤트
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x00ff00, 1);
      progressBar.fillRect(centerX - 145, centerY + 5, 290 * value, 20);
    });

    // 로딩 완료 이벤트
    this.load.on('complete', () => {
      progressBar.destroy();
      progressBarBg.destroy();
      loadingText.destroy();
    });

    // ========== 리소스 로드 ==========
    // 예시: 플레이어 이미지 (실제 에셋 경로에 맞게 수정)
    // this.load.image('player', '/assets/player.png');
    // this.load.image('enemy', '/assets/enemy.png');
    // this.load.spritesheet('explosion', '/assets/explosion.png', {
    //   frameWidth: 64,
    //   frameHeight: 64,
    // });
    // this.load.audio('bgm', '/assets/bgm.mp3');

    // 임시: 에셋 없이 테스트용 사각형 생성을 위한 플레이스홀더
    this.createPlaceholderTextures();
  }

  create() {
    // 리소스 로딩 완료 후 메인 씬으로 전환
    this.scene.start('MainScene');
  }

  // 에셋 없이 테스트할 때 사용할 플레이스홀더 텍스처 생성
  private createPlaceholderTextures() {
    // 플레이어용 32x32 녹색 사각형
    const playerGraphics = this.make.graphics({ x: 0, y: 0 });
    playerGraphics.fillStyle(0x00ff00, 1);
    playerGraphics.fillRect(0, 0, 32, 32);
    playerGraphics.generateTexture('player', 32, 32);
    playerGraphics.destroy();

    // 적용 32x32 빨간 사각형
    const enemyGraphics = this.make.graphics({ x: 0, y: 0 });
    enemyGraphics.fillStyle(0xff0000, 1);
    enemyGraphics.fillRect(0, 0, 32, 32);
    enemyGraphics.generateTexture('enemy', 32, 32);
    enemyGraphics.destroy();

    // 아이템용 16x16 노란 사각형
    const itemGraphics = this.make.graphics({ x: 0, y: 0 });
    itemGraphics.fillStyle(0xffff00, 1);
    itemGraphics.fillRect(0, 0, 16, 16);
    itemGraphics.generateTexture('item', 16, 16);
    itemGraphics.destroy();
  }
}