// app/(phaser)/_template/_lib/scenes/GameOverScene.ts

import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  private finalScore = 0;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  // MainScene에서 데이터 전달받기
  init(data: { score?: number }) {
    this.finalScore = data.score ?? 0;
  }

  create() {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;

    // 반투명 오버레이 배경
    const overlay = this.add.rectangle(
      centerX,
      centerY,
      width,
      height,
      0x000000,
      0.7
    );

    // GAME OVER 텍스트
    const gameOverText = this.add.text(centerX, centerY - 80, 'GAME OVER', {
      fontSize: '52px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    gameOverText.setOrigin(0.5);

    // 최종 점수 표시
    const scoreText = this.add.text(
      centerX,
      centerY - 10,
      `Score: ${this.finalScore}`,
      {
        fontSize: '28px',
        color: '#ffffff',
      }
    );
    scoreText.setOrigin(0.5);

    // 재시작 안내 텍스트
    const restartText = this.add.text(
      centerX,
      centerY + 50,
      'Press SPACE or Click to Restart',
      {
        fontSize: '20px',
        color: '#aaaaaa',
      }
    );
    restartText.setOrigin(0.5);

    // 깜빡임 애니메이션
    this.tweens.add({
      targets: restartText,
      alpha: 0.3,
      duration: 800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // 키보드 입력: SPACE 또는 R키로 재시작
    this.input.keyboard?.once('keydown-SPACE', () => {
      this.restartGame();
    });

    this.input.keyboard?.once('keydown-R', () => {
      this.restartGame();
    });

    // 마우스/터치 클릭으로 재시작
    this.input.once('pointerdown', () => {
      this.restartGame();
    });
  }

  private restartGame() {
    // MainScene으로 전환 (BootScene부터 다시 시작하려면 'BootScene'으로 변경)
    this.scene.start('MainScene');
  }
}