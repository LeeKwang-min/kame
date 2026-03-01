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

    // Semi-transparent warm overlay
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x5D4037, 0.75).setDepth(20);

    // "GAME OVER" title
    this.add
      .text(cx, cy - 100, 'GAME OVER', {
        fontSize: '40px',
        color: '#FFF8E7',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(21);

    // Final score
    this.add
      .text(cx, cy - 40, `Score: ${this.finalScore}`, {
        fontSize: '28px',
        color: '#FFD54F',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setDepth(21);

    if (callbacks?.isLoggedIn) {
      // 로그인 유저: SAVE / SKIP 버튼
      const saveBtn = this.add
        .text(cx, cy + 20, '[ SAVE SCORE ]', {
          fontSize: '22px',
          color: '#81C784',
          fontFamily: 'monospace',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setDepth(21);

      saveBtn.on('pointerdown', async () => {
        if (this.isSaving || this.hasSaved) return;
        this.isSaving = true;
        saveBtn.setText('Saving...');
        saveBtn.setColor('#D7CCC8');
        try {
          await callbacks.onScoreSave(this.finalScore);
          this.hasSaved = true;
          saveBtn.setText('Saved!');
          saveBtn.setColor('#A5D6A7');
        } catch {
          saveBtn.setText('Failed - Tap to retry');
          saveBtn.setColor('#EF9A9A');
          this.isSaving = false;
        }
      });

      this.add
        .text(cx, cy + 65, '[ SKIP ]', {
          fontSize: '18px',
          color: '#BCAAA4',
          fontFamily: 'monospace',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setDepth(21)
        .on('pointerdown', () => this.restartGame());
    } else {
      // 비로그인 유저: 로그인 안내
      this.add
        .text(cx, cy + 20, 'Log in to save your score!', {
          fontSize: '16px',
          color: '#FFCC80',
          fontFamily: 'monospace',
        })
        .setOrigin(0.5)
        .setDepth(21);
    }

    // Restart instructions
    this.add
      .text(cx, cy + 130, 'Press R to restart', {
        fontSize: '16px',
        color: '#D7CCC8',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setDepth(21);

    const restartLabel = this.add
      .text(cx, cy + 160, 'or tap here', {
        fontSize: '14px',
        color: '#BCAAA4',
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
