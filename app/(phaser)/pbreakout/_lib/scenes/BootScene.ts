import Phaser from 'phaser';
import { GAME_CONFIG } from '../config';

export class BootScene extends Phaser.Scene {
  constructor() {
    // 씬의 고유 키 - 다른 씬에서 이 이름으로 호출 가능
    super({ key: 'BootScene' });
  }

  // preload: 게임 시작 전 리소스를 미리 로드하는 단계
  preload() {
    // 로딩 UI 생성
    this.createLoadingUI();

    // 이미지 에셋 대신 코드로 텍스처 생성
    // 실제 프로젝트에서는 this.load.image('ball', '/assets/ball.png') 식으로 로드
    this.createPlaceholderTextures();
  }

  // create: preload 완료 후 실행 - 다음 씬으로 전환
  create() {
    this.scene.start('MainScene');
  }

  // 로딩 바 UI 생성
  private createLoadingUI() {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;

    // 'Loading...' 텍스트
    const loadingText = this.add.text(centerX, centerY - 50, 'Loading...', {
      fontSize: '24px',
      color: '#ffffff',
    });
    loadingText.setOrigin(0.5); // 텍스트 중앙 정렬

    // 로딩 바 배경 (회색)
    const progressBarBg = this.add.graphics();
    progressBarBg.fillStyle(0x222222, 1);
    progressBarBg.fillRect(centerX - 150, centerY, 300, 30);

    // 로딩 바 (초록색)
    const progressBar = this.add.graphics();

    // 로딩 진행률 이벤트 - 파일 로드할 때마다 호출됨
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
  }

  // 이미지 파일 없이 코드로 텍스처 생성
  private createPlaceholderTextures() {
    const {
      BALL_RADIUS,
      BALL_COLOR,
      PADDLE_WIDTH,
      PADDLE_HEIGHT,
      PADDLE_COLOR,
    } = GAME_CONFIG;

    // 공 텍스처 (원형)
    const ballGraphics = this.make.graphics({ x: 0, y: 0 });
    ballGraphics.fillStyle(BALL_COLOR, 1);
    ballGraphics.fillCircle(BALL_RADIUS, BALL_RADIUS, BALL_RADIUS);
    ballGraphics.generateTexture('ball', BALL_RADIUS * 2, BALL_RADIUS * 2);
    ballGraphics.destroy();

    // 패들 텍스처 (사각형)
    const paddleGraphics = this.make.graphics({ x: 0, y: 0 });
    paddleGraphics.fillStyle(PADDLE_COLOR, 1);
    paddleGraphics.fillRect(0, 0, PADDLE_WIDTH, PADDLE_HEIGHT);
    paddleGraphics.generateTexture('paddle', PADDLE_WIDTH, PADDLE_HEIGHT);
    paddleGraphics.destroy();

    // 벽돌 텍스처 (각 색상별로 생성)
    GAME_CONFIG.BRICK_COLORS.forEach((color, index) => {
      const brickGraphics = this.make.graphics({ x: 0, y: 0 });
      brickGraphics.fillStyle(color, 1);
      brickGraphics.fillRect(
        0,
        0,
        GAME_CONFIG.BRICK_WIDTH,
        GAME_CONFIG.BRICK_HEIGHT,
      );
      brickGraphics.generateTexture(
        `brick_${index}`,
        GAME_CONFIG.BRICK_WIDTH,
        GAME_CONFIG.BRICK_HEIGHT,
      );
      brickGraphics.destroy();
    });
  }
}
