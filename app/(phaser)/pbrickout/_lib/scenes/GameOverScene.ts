import Phaser from 'phaser';

interface GameOverData {
  score: number;
  isWin: boolean;
}

interface PBrickoutCallbacks {
  onGameOver?: (score: number) => void;
}

export class GameOverScene extends Phaser.Scene {
  private finalScore: number = 0;
  private isWin: boolean = false;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  // init: 씬 시작 시 데이터를 받는 메서드
  // scene.start('GameOverScene', { score: 100 }) 에서 전달한 데이터
  init(data: GameOverData) {
    this.finalScore = data.score || 0;
    this.isWin = data.isWin || false;
  }

  create() {
    const { width, height } = this.cameras.main;
    const callbacks = this.registry.get('callbacks') as PBrickoutCallbacks | undefined;

    // Notify ad system of game over
    callbacks?.onGameOver?.(this.finalScore);

    // If ad overlay should be shown, only draw a semi-transparent overlay and return early
    const shouldShowAdRef = this.registry.get('shouldShowAdRef') as { current: boolean } | undefined;
    if (shouldShowAdRef?.current) {
      this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7).setDepth(20);
      return;
    }

    // 배경 어둡게
    this.cameras.main.setBackgroundColor('#000000');

    // 결과 텍스트
    const titleText = this.isWin ? 'YOU WIN!' : 'GAME OVER';
    const titleColor = this.isWin ? '#FFD700' : '#FF6B6B';

    this.add
      .text(width / 2, height / 2 - 60, titleText, {
        fontSize: '48px',
        color: titleColor,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // 점수 표시
    this.add
      .text(width / 2, height / 2, `Final Score: ${this.finalScore}`, {
        fontSize: '32px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // 재시작 안내
    this.add
      .text(width / 2, height / 2 + 60, 'Press SPACE to restart', {
        fontSize: '20px',
        color: '#888888',
      })
      .setOrigin(0.5);

    // 스페이스바로 재시작
    this.input.keyboard!.once('keydown-SPACE', () => {
      this.scene.start('MainScene');
    });

    // R 키로도 재시작 가능
    this.input.keyboard!.once('keydown-R', () => {
      this.scene.start('MainScene');
    });
  }
}
