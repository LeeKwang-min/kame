import Phaser from 'phaser';

interface GameOverData {
  score: number;
  isWin: boolean;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  // init: 씬 시작 시 데이터를 받는 메서드
  // scene.start('GameOverScene', { score: 100 }) 에서 전달한 데이터
  init(data: GameOverData) {
    this.data.set('score', data.score || 0);
    this.data.set('isWin', data.isWin || false);
  }

  create() {
    const { width, height } = this.cameras.main;
    const score = this.data.get('score') as number;
    const isWin = this.data.get('isWin') as boolean;

    // 배경 어둡게
    this.cameras.main.setBackgroundColor('#000000');

    // 결과 텍스트
    const titleText = isWin ? 'YOU WIN!' : 'GAME OVER';
    const titleColor = isWin ? '#FFD700' : '#FF6B6B';

    this.add
      .text(width / 2, height / 2 - 60, titleText, {
        fontSize: '48px',
        color: titleColor,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // 점수 표시
    this.add
      .text(width / 2, height / 2, `Final Score: ${score}`, {
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
