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
        color: '#ffffff',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    // "NEXT" label (top right area)
    this.add
      .text(GAME_WIDTH - 60, 15, 'NEXT', {
        fontSize: '14px',
        color: '#aaaaaa',
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

    // Listen for events from GameScene
    const gameScene = this.scene.get('GameScene');

    gameScene.events.on('updateScore', (score: number) => {
      this.scoreText.setText(`Score: ${score}`);
    });

    gameScene.events.on('updateNext', (level: number) => {
      const fruit = FRUIT_CONFIG[level];
      this.nextPreview.setFillStyle(fruit.color, 0.5);
      this.nextPreview.setRadius(Math.min(fruit.radius, 25));
      this.nextEmoji.setText(fruit.emoji);
      this.nextEmoji.setFontSize(Math.min(fruit.radius * 0.8, 20));
    });
  }
}
