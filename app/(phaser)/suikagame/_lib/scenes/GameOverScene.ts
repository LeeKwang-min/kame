import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { TSuikaCallbacks } from '../types';

export class GameOverScene extends Phaser.Scene {
  private finalScore: number = 0;
  private isSaving: boolean = false;
  private hasSaved: boolean = false;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { score: number }) {
    this.finalScore = data.score || 0;
    this.isSaving = false;
    this.hasSaved = false;
  }

  create() {
    const callbacks = this.registry.get('callbacks') as TSuikaCallbacks | undefined;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // Semi-transparent overlay
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setDepth(20);

    // "GAME OVER" title
    this.add
      .text(cx, cy - 100, 'GAME OVER', {
        fontSize: '40px',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(21);

    // Final score
    this.add
      .text(cx, cy - 40, `Score: ${this.finalScore}`, {
        fontSize: '28px',
        color: '#f1c40f',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setDepth(21);

    // Save / Skip buttons (only if logged in)
    if (callbacks?.isLoggedIn) {
      const saveBtn = this.add
        .text(cx, cy + 30, '[ SAVE ]', {
          fontSize: '22px',
          color: '#2ecc71',
          fontFamily: 'monospace',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setDepth(21);

      saveBtn.on('pointerdown', async () => {
        if (this.isSaving || this.hasSaved) return;
        this.isSaving = true;
        saveBtn.setText('Saving...');
        saveBtn.setColor('#888888');
        try {
          await callbacks.onScoreSave(this.finalScore);
          this.hasSaved = true;
          saveBtn.setText('Saved!');
          saveBtn.setColor('#aaaaaa');
        } catch {
          saveBtn.setText('Failed - Tap to retry');
          saveBtn.setColor('#e74c3c');
          this.isSaving = false;
        }
      });

      const skipBtn = this.add
        .text(cx, cy + 70, '[ SKIP ]', {
          fontSize: '18px',
          color: '#aaaaaa',
          fontFamily: 'monospace',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setDepth(21);

      skipBtn.on('pointerdown', () => {
        this.restartGame();
      });
    }

    // Restart instructions
    this.add
      .text(cx, cy + 130, 'Press R to restart', {
        fontSize: '16px',
        color: '#888888',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setDepth(21);

    const restartLabel = this.add
      .text(cx, cy + 160, 'or tap here', {
        fontSize: '14px',
        color: '#666666',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(21);

    restartLabel.on('pointerdown', () => {
      this.restartGame();
    });

    // Keyboard: R to restart
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown', (e: KeyboardEvent) => {
        if (e.code === 'KeyR') {
          this.restartGame();
        }
      });
    }
  }

  private restartGame() {
    this.scene.stop('GameOverScene');
    this.scene.stop('UIScene');
    this.scene.start('GameScene');
    this.scene.launch('UIScene');
  }
}
