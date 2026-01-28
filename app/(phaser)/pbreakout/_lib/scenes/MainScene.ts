import Phaser from 'phaser';
import { GAME_CONFIG } from '../config';

export class MainScene extends Phaser.Scene {
  // 게임 오브젝트들
  private ball!: Phaser.Physics.Arcade.Sprite;
  private paddle!: Phaser.Physics.Arcade.Sprite;
  private bricks!: Phaser.Physics.Arcade.StaticGroup;

  // 입력
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  // 게임 상태
  private score = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private isLaunched = false; // 공이 발사되었는지

  constructor() {
    super({ key: 'MainScene' });
  }

  // create: 게임 오브젝트 생성 및 초기화
  create() {
    this.score = 0;
    this.isLaunched = false;

    // 각 요소 생성
    this.createPaddle();
    this.createBall();
    this.createBricks();
    this.createUI();
    this.setupInput();
    this.setupCollisions();
  }

  // 패들 생성
  private createPaddle() {
    const { width, height } = this.cameras.main;

    // physics.add.sprite: 물리 엔진이 적용된 스프라이트 생성
    this.paddle = this.physics.add.sprite(
      width / 2, // x 좌표 (화면 중앙)
      height - GAME_CONFIG.PADDLE_Y_OFFSET, // y 좌표 (화면 하단)
      'paddle', // BootScene에서 만든 텍스처 키
    );

    // 패들이 화면 밖으로 나가지 않도록 설정
    this.paddle.setCollideWorldBounds(true);

    // 패들은 움직이지 않는 물체 (공이 부딪혀도 밀리면 안됨)
    this.paddle.setImmovable(true);

    // body 타입을 Arcade Body로 단언 (TypeScript용)
    const body = this.paddle.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;
  }

  // 공 생성
  private createBall() {
    // 공은 처음에 패들 위에 위치
    this.ball = this.physics.add.sprite(
      this.paddle.x,
      this.paddle.y -
        GAME_CONFIG.PADDLE_HEIGHT / 2 -
        GAME_CONFIG.BALL_RADIUS -
        5,
      'ball',
    );

    // 화면 경계와 충돌
    this.ball.setCollideWorldBounds(true);

    // 공이 벽에 부딪히면 튕기도록 설정 (핵심!)
    // Canvas 버전에서는 ball.vx *= -1 같은 코드를 직접 작성했지만
    // Phaser에서는 이 한 줄로 해결!
    this.ball.setBounce(1); // 1 = 에너지 손실 없이 완전 반사

    const body = this.ball.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;

    // 원형 충돌 영역 설정 (기본은 사각형)
    body.setCircle(GAME_CONFIG.BALL_RADIUS);
  }

  // 벽돌 생성
  private createBricks() {
    const { width } = this.cameras.main;
    const {
      BRICK_ROWS,
      BRICK_COLS,
      BRICK_WIDTH,
      BRICK_HEIGHT,
      BRICK_GAP,
      BRICK_TOP_OFFSET,
    } = GAME_CONFIG;

    // StaticGroup: 움직이지 않는 오브젝트들의 그룹
    // Canvas 버전에서 배열로 관리하던 것을 Phaser Group으로 대체
    this.bricks = this.physics.add.staticGroup();

    // 벽돌 전체 너비 계산 (중앙 정렬용)
    const totalWidth = BRICK_COLS * BRICK_WIDTH + (BRICK_COLS - 1) * BRICK_GAP;
    const startX = (width - totalWidth) / 2 + BRICK_WIDTH / 2;

    // 2중 루프로 벽돌 배치
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        const x = startX + col * (BRICK_WIDTH + BRICK_GAP);
        const y =
          BRICK_TOP_OFFSET +
          row * (BRICK_HEIGHT + BRICK_GAP) +
          BRICK_HEIGHT / 2;

        // 행(row)에 따라 다른 색상의 텍스처 사용
        const brick = this.bricks.create(
          x,
          y,
          `brick_${row % GAME_CONFIG.BRICK_COLORS.length}`,
        );

        // 충돌 영역을 실제 크기에 맞게 조정
        brick.refreshBody();
      }
    }
  }

  // UI 생성
  private createUI() {
    // 점수 텍스트
    this.scoreText = this.add.text(16, 16, 'Score: 0', {
      fontSize: '24px',
      color: '#ffffff',
    });

    // 시작 안내 텍스트
    const { width, height } = this.cameras.main;
    const startText = this.add.text(
      width / 2,
      height / 2 + 100,
      'Press SPACE to launch',
      {
        fontSize: '20px',
        color: '#ffffff',
      },
    );
    startText.setOrigin(0.5);
    startText.setName('startText'); // 나중에 찾아서 삭제하기 위해 이름 지정
  }

  // 입력 설정
  private setupInput() {
    // Phaser 내장 커서 키 (방향키 + Space + Shift)
    this.cursors = this.input.keyboard!.createCursorKeys();
  }

  // 충돌 설정 (Phaser의 핵심 기능!)
  private setupCollisions() {
    // 공 ↔ 패들 충돌
    // Canvas 버전의 handlePaddleCollision() 함수가 이 한 줄로 대체!
    this.physics.add.collider(
      this.ball,
      this.paddle,
      this.hitPaddle, // 충돌 시 콜백 함수
      undefined,
      this,
    );

    // 공 ↔ 벽돌 충돌
    // Canvas 버전의 handleBrickCollision() 루프가 이 한 줄로 대체!
    this.physics.add.collider(
      this.ball,
      this.bricks,
      this.hitBrick, // 충돌 시 콜백 함수
      undefined,
      this,
    );
  }

  // 공이 패들에 맞았을 때
  private hitPaddle: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    ball,
    paddle,
  ) => {
    const b = ball as Phaser.Physics.Arcade.Sprite;
    const p = paddle as Phaser.Physics.Arcade.Sprite;

    // 패들의 어느 위치에 맞았는지에 따라 반사 각도 조절
    // Canvas 버전에서 paddleVx를 계산하던 로직과 유사
    const diff = b.x - p.x;

    // diff를 패들 너비의 비율로 변환 (-1 ~ 1)
    const normalizedDiff = diff / (GAME_CONFIG.PADDLE_WIDTH / 2);

    // x 속도에 반영 (최대 ±200 정도 추가)
    const currentVelocity = b.body!.velocity;
    const newVx = currentVelocity.x + normalizedDiff * 200;

    // 속도 설정 후 정규화 (일정한 속도 유지)
    b.setVelocity(newVx, currentVelocity.y);

    // 전체 속도를 BALL_SPEED로 정규화
    // Canvas 버전의 normalizeBallSpeed() 함수가 이 메서드로 대체!
    (b.body as Phaser.Physics.Arcade.Body).velocity
      .normalize()
      .scale(GAME_CONFIG.BALL_SPEED);
  };

  // 공이 벽돌에 맞았을 때
  private hitBrick: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    ball,
    brick,
  ) => {
    const b = brick as Phaser.Physics.Arcade.Sprite;

    // 벽돌 비활성화 (화면에서 제거)
    b.disableBody(true, true);

    // 점수 증가
    this.score += GAME_CONFIG.BRICK_SCORE;
    this.scoreText.setText(`Score: ${this.score}`);

    // 모든 벽돌을 깼는지 확인
    if (this.bricks.countActive(true) === 0) {
      // 승리! 다음 레벨이나 게임 오버 처리
      this.scene.start('GameOverScene', { score: this.score, isWin: true });
    }
  };

  // 공 발사
  private launchBall() {
    if (this.isLaunched) return;

    this.isLaunched = true;

    // 위쪽 대각선 방향으로 발사 (약간의 랜덤)
    const angle = Phaser.Math.Between(-30, 30); // -30도 ~ 30도
    const vx = GAME_CONFIG.BALL_SPEED * Math.sin(Phaser.Math.DegToRad(angle));
    const vy = -GAME_CONFIG.BALL_SPEED * Math.cos(Phaser.Math.DegToRad(angle));

    this.ball.setVelocity(vx, vy);

    // 시작 안내 텍스트 제거
    const startText = this.children.getByName('startText');
    if (startText) startText.destroy();
  }

  // update: 매 프레임마다 호출 (게임 루프)
  // Canvas 버전의 requestAnimationFrame + update() 함수에 해당
  update() {
    // 게임 오버 체크: 공이 화면 아래로 떨어졌을 때
    if (this.ball.y > this.cameras.main.height) {
      this.scene.start('GameOverScene', { score: this.score, isWin: false });
      return;
    }

    // 패들 이동 처리
    // Canvas 버전의 keys.ArrowLeft/ArrowRight 체크와 동일
    if (this.cursors.left.isDown) {
      this.paddle.setVelocityX(-GAME_CONFIG.PADDLE_SPEED);
    } else if (this.cursors.right.isDown) {
      this.paddle.setVelocityX(GAME_CONFIG.PADDLE_SPEED);
    } else {
      this.paddle.setVelocityX(0);
    }

    // 공 발사 (스페이스바)
    if (this.cursors.space?.isDown) {
      this.launchBall();
    }

    // 공이 아직 발사 전이면 패들 따라다니기
    if (!this.isLaunched) {
      this.ball.x = this.paddle.x;
    }
  }
}
