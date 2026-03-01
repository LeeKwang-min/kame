import Phaser from 'phaser';
import { FRUIT_CONFIG, GAME_WIDTH, GAME_HEIGHT } from '../config';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    this.createLoadingUI();
  }

  create() {
    this.createFruitTextures();
    this.scene.start('GameScene');
    this.scene.launch('UIScene');
  }

  private createLoadingUI() {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;

    const loadingText = this.add.text(centerX, centerY - 50, 'Loading...', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'monospace',
    });
    loadingText.setOrigin(0.5);

    const progressBarBg = this.add.graphics();
    progressBarBg.fillStyle(0x222222, 1);
    progressBarBg.fillRect(centerX - 150, centerY, 300, 30);

    const progressBar = this.add.graphics();

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x2ecc71, 1);
      progressBar.fillRect(centerX - 145, centerY + 5, 290 * value, 20);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBarBg.destroy();
      loadingText.destroy();
    });
  }

  private createFruitTextures() {
    FRUIT_CONFIG.forEach((fruit, index) => {
      const key = fruit.texture || `fruit_${index}`;

      if (this.textures.exists(key)) return;

      const size = fruit.radius * 2 + 4;
      const center = size / 2;
      const graphics = this.make.graphics({ x: 0, y: 0 });

      // Fill circle
      graphics.fillStyle(fruit.color, 1);
      graphics.fillCircle(center, center, fruit.radius);

      // Subtle highlight for depth
      graphics.fillStyle(0xffffff, 0.15);
      graphics.fillCircle(
        center - fruit.radius * 0.25,
        center - fruit.radius * 0.25,
        fruit.radius * 0.5
      );

      // Border
      graphics.lineStyle(2, 0xffffff, 0.3);
      graphics.strokeCircle(center, center, fruit.radius - 1);

      graphics.generateTexture(key, size, size);
      graphics.destroy();
    });
  }
}
