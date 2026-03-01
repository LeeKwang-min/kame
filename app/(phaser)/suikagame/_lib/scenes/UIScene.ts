import Phaser from 'phaser';
import { FRUIT_CONFIG, GAME_WIDTH } from '../config';

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private nextPreview!: Phaser.GameObjects.Arc;
  private nextEmoji!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    // Score display (top center)
    this.scoreText = this.add
      .text(GAME_WIDTH / 2, 20, 'Score: 0', {
        fontSize: '24px',
        color: '#5D4037',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    // "NEXT" label (top right area)
    this.add
      .text(GAME_WIDTH - 60, 15, 'NEXT', {
        fontSize: '14px',
        color: '#8D6E63',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    // Next fruit preview circle
    this.nextPreview = this.add.circle(GAME_WIDTH - 60, 55, 20, 0xffffff, 0.5).setDepth(10);

    // Next fruit emoji
    this.nextEmoji = this.add
      .text(GAME_WIDTH - 60, 55, '', {
        fontSize: '16px',
      })
      .setOrigin(0.5)
      .setDepth(10);

    // Listen for events from GameScene — shutdown 시 자동 해제
    const gameScene = this.scene.get('GameScene');

    const onUpdateScore = (score: number) => {
      if (this.scoreText?.active) {
        this.scoreText.setText(`Score: ${score}`);
      }
    };

    const onUpdateNext = (level: number) => {
      if (!this.nextPreview?.active) return;
      const fruit = FRUIT_CONFIG[level];
      this.nextPreview.setFillStyle(fruit.color, 0.5);
      this.nextPreview.setRadius(Math.min(fruit.radius, 25));
      this.nextEmoji.setText(fruit.emoji);
      this.nextEmoji.setFontSize(Math.min(fruit.radius * 0.8, 20));
    };

    gameScene.events.on('updateScore', onUpdateScore);
    gameScene.events.on('updateNext', onUpdateNext);

    // Scene 종료 시 이벤트 리스너 해제
    this.events.once('shutdown', () => {
      gameScene.events.off('updateScore', onUpdateScore);
      gameScene.events.off('updateNext', onUpdateNext);
    });
  }
}
