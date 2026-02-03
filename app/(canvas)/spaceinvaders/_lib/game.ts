import { TPlayer, TBullet, TEnemy, TGameState } from './types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_SPEED,
  PLAYER_SHOOT_COOLDOWN,
  BULLET_WIDTH,
  BULLET_HEIGHT,
  PLAYER_BULLET_SPEED,
  ENEMY_BULLET_SPEED,
  ENEMY_MOVE_SPEED,
  ENEMY_DROP_DISTANCE,
  ENEMY_SHOOT_INTERVAL,
  SCORE_PER_ENEMY,
  COLORS,
} from './config';
import { createEnemies, getEnemyBounds, getShootingEnemy } from './utils';
import { rectRectHit } from '@/lib/utils';
import {
  createGameOverHud,
  gameStartHud,
  TGameOverCallbacks,
} from '@/lib/game';

export type TSpaceInvadersCallbacks = {
  onScoreSave: (initials: string, score: number) => Promise<void>;
};

export const setupSpaceInvaders = (
  canvas: HTMLCanvasElement,
  callbacks?: TSpaceInvadersCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // ==================== State ====================

  // 키 입력 상태
  const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    Space: false,
  };

  // 게임 상태
  let gameState: TGameState = 'ready';
  let score = 0;
  let lives = 3;

  // 웨이브 시스템
  let wave = 1;
  let waveSpeedBonus = 1; // 웨이브마다 속도 증가
  let waveShootBonus = 1; // 웨이브마다 발사 빈도 증가

  // 플레이어
  let player: TPlayer = {
    x: 0,
    y: 0,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    speed: PLAYER_SPEED,
  };

  // 총알 배열
  let playerBullets: TBullet[] = [];
  let enemyBullets: TBullet[] = [];

  // 적 배열
  let enemies: TEnemy[] = [];

  // 적 이동 관련
  let enemyDirection = 1; // 1 = 오른쪽, -1 = 왼쪽
  let enemySpeedMultiplier = 1; // 적이 줄어들면 빨라짐

  // 타이머
  let shootCooldown = 0; // 플레이어 발사 쿨타임
  let enemyShootTimer = 0; // 적 발사 타이머

  // 애니메이션
  let animFrame = 0;
  let animTimer = 0;
  const ANIM_SPEED = 0.5; // 프레임 전환 속도 (초)

  // 시간
  let lastTime = 0;
  let sec = 0;

  // 게임 오버 HUD
  const gameOverCallbacks: TGameOverCallbacks = {
    onScoreSave: async (initials, finalScore) => {
      if (callbacks?.onScoreSave) {
        await callbacks.onScoreSave(initials, finalScore);
      }
    },
    onRestart: () => {
      resetGame();
    },
  };

  const gameOverHud = createGameOverHud(canvas, ctx, 'spaceinvaders', gameOverCallbacks);

  // ==================== Game State ====================

  const startGame = () => {
    if (gameState !== 'ready') return;

    // 플레이어 초기 위치 (하단 중앙)
    player = {
      x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
      y: CANVAS_HEIGHT - PLAYER_HEIGHT - 20,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      speed: PLAYER_SPEED,
    };

    // 초기화
    playerBullets = [];
    enemyBullets = [];
    enemies = createEnemies();
    enemyDirection = 1;
    enemySpeedMultiplier = 1;
    shootCooldown = 0;
    enemyShootTimer = 0;
    score = 0;
    lives = 3;
    wave = 1;
    waveSpeedBonus = 1;
    waveShootBonus = 1;
    animFrame = 0;
    animTimer = 0;
    gameState = 'playing';
    lastTime = 0;
    sec = 0;
  };

  // 다음 웨이브 시작
  const startNextWave = () => {
    wave++;
    // 웨이브마다 난이도 증가
    waveSpeedBonus = 1 + (wave - 1) * 0.15; // 웨이브당 15% 속도 증가
    waveShootBonus = 1 + (wave - 1) * 0.2; // 웨이브당 20% 발사 빈도 증가

    // 적 재생성
    enemies = createEnemies();
    enemyBullets = [];
    enemyDirection = 1;
    enemySpeedMultiplier = 1;
    enemyShootTimer = 0;
  };

  const resetGame = () => {
    gameState = 'ready';
    playerBullets = [];
    enemyBullets = [];
    enemies = [];
    enemyDirection = 1;
    enemySpeedMultiplier = 1;
    score = 0;
    lives = 3;
    wave = 1;
    waveSpeedBonus = 1;
    waveShootBonus = 1;
    animFrame = 0;
    animTimer = 0;
    lastTime = 0;
    sec = 0;
    gameOverHud.reset();
  };

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(CANVAS_WIDTH * dpr);
    canvas.height = Math.round(CANVAS_HEIGHT * dpr);
    canvas.style.width = `${CANVAS_WIDTH}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  // ==================== Input Handlers ====================

  const onKeyDown = (e: KeyboardEvent) => {
    // 게임 시작
    if (e.code === 'KeyS' && gameState === 'ready') {
      startGame();
      return;
    }

    // 게임 오버 시 HUD 처리
    if (gameState === 'gameover') {
      const handled = gameOverHud.onKeyDown(e, score);
      if (handled) return;
    }

    // 재시작 (게임 오버가 아닐 때만)
    if (e.code === 'KeyR' && gameState !== 'gameover') {
      resetGame();
      return;
    }

    // 이동 및 발사 키
    if (e.code in keys) {
      keys[e.code as keyof typeof keys] = true;
      e.preventDefault();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code in keys) {
      keys[e.code as keyof typeof keys] = false;
      e.preventDefault();
    }
  };

  // ==================== Update Functions ====================

  /**
   * 플레이어 업데이트
   * - 좌우 이동
   * - 총알 발사
   */
  const updatePlayer = (dt: number) => {
    // 좌우 이동
    if (keys.ArrowLeft) {
      player.x -= player.speed * dt;
    }
    if (keys.ArrowRight) {
      player.x += player.speed * dt;
    }

    // 화면 경계 제한
    player.x = Math.max(0, Math.min(CANVAS_WIDTH - player.width, player.x));

    // 발사 쿨타임 감소
    shootCooldown -= dt;

    // 스페이스바로 발사
    if (keys.Space && shootCooldown <= 0) {
      playerBullets.push({
        x: player.x + player.width / 2 - BULLET_WIDTH / 2,
        y: player.y,
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT,
        speed: PLAYER_BULLET_SPEED,
      });
      shootCooldown = PLAYER_SHOOT_COOLDOWN;
    }
  };

  /**
   * 적 업데이트
   * - 좌우 이동
   * - 벽에 닿으면 방향 전환 + 아래로 이동
   * - 총알 발사
   */
  const updateEnemies = (dt: number) => {
    // 살아있는 적 수 계산 (속도 조절용)
    const aliveCount = enemies.filter((e) => e.alive).length;
    if (aliveCount === 0) {
      // 다음 웨이브 시작!
      startNextWave();
      return;
    }

    // 적이 줄어들수록 빨라짐 + 웨이브 보너스 적용
    enemySpeedMultiplier = (1 + (55 - aliveCount) * 0.03) * waveSpeedBonus;

    // 이동량 계산
    const moveAmount =
      ENEMY_MOVE_SPEED * enemySpeedMultiplier * dt * enemyDirection;

    // 모든 적 이동
    for (const enemy of enemies) {
      if (enemy.alive) {
        enemy.x += moveAmount;
      }
    }

    // 벽 충돌 체크
    const bounds = getEnemyBounds(enemies);
    let hitWall = false;
    let overAmount = 0;

    if (bounds.right >= CANVAS_WIDTH) {
      hitWall = true;
      overAmount = bounds.right - CANVAS_WIDTH;
    } else if (bounds.left <= 0) {
      hitWall = true;
      overAmount = bounds.left; // 음수
    }

    if (hitWall) {
      // 방향 전환
      enemyDirection *= -1;

      // 벽을 넘은 만큼 위치 보정 + 아래로 이동
      for (const enemy of enemies) {
        enemy.x -= overAmount;
        enemy.y += ENEMY_DROP_DISTANCE;
      }

      // 게임오버 체크 (적이 플레이어 위치까지 내려옴)
      const newBounds = getEnemyBounds(enemies);
      if (newBounds.bottom >= player.y) {
        gameState = 'gameover';
      }
    }

    // 적 발사 (웨이브 보너스 적용)
    enemyShootTimer -= dt * waveShootBonus;
    if (enemyShootTimer <= 0) {
      const shooter = getShootingEnemy(enemies);
      if (shooter) {
        enemyBullets.push({
          x: shooter.x + shooter.width / 2 - BULLET_WIDTH / 2,
          y: shooter.y + shooter.height,
          width: BULLET_WIDTH,
          height: BULLET_HEIGHT,
          speed: ENEMY_BULLET_SPEED * waveSpeedBonus,
        });
      }
      enemyShootTimer = ENEMY_SHOOT_INTERVAL;
    }
  };

  /**
   * 총알 업데이트
   * - 이동
   * - 화면 밖 제거
   */
  const updateBullets = (dt: number) => {
    // 플레이어 총알 이동
    for (const bullet of playerBullets) {
      bullet.y += bullet.speed * dt;
    }

    // 적 총알 이동
    for (const bullet of enemyBullets) {
      bullet.y += bullet.speed * dt;
    }

    // 화면 밖 총알 제거
    playerBullets = playerBullets.filter((b) => b.y + b.height > 0);
    enemyBullets = enemyBullets.filter((b) => b.y < CANVAS_HEIGHT);
  };

  /**
   * 충돌 처리
   * - 플레이어 총알 vs 적
   * - 적 총알 vs 플레이어
   */
  const handleCollisions = () => {
    // 플레이어 총알 vs 적
    for (let i = playerBullets.length - 1; i >= 0; i--) {
      const bullet = playerBullets[i];

      for (const enemy of enemies) {
        if (!enemy.alive) continue;

        if (
          rectRectHit(
            bullet.x,
            bullet.y,
            bullet.width,
            bullet.height,
            enemy.x,
            enemy.y,
            enemy.width,
            enemy.height,
          )
        ) {
          // 적 격파!
          enemy.alive = false;
          playerBullets.splice(i, 1);
          score += SCORE_PER_ENEMY[enemy.type];
          break;
        }
      }
    }

    // 적 총알 vs 플레이어
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const bullet = enemyBullets[i];

      if (
        rectRectHit(
          bullet.x,
          bullet.y,
          bullet.width,
          bullet.height,
          player.x,
          player.y,
          player.width,
          player.height,
        )
      ) {
        // 피격!
        enemyBullets.splice(i, 1);
        lives--;

        if (lives <= 0) {
          gameState = 'gameover';
        }
      }
    }
  };

  // 애니메이션 프레임 업데이트
  const updateAnimation = (dt: number) => {
    animTimer += dt;
    if (animTimer >= ANIM_SPEED) {
      animTimer = 0;
      animFrame = animFrame === 0 ? 1 : 0;
    }
  };

  const update = (t: number) => {
    if (!lastTime) lastTime = t;
    let dt = (t - lastTime) / 1000;
    lastTime = t;

    // 프레임 드랍 방지
    dt = Math.min(dt, 0.05);
    sec += dt;

    if (gameState === 'playing') {
      updatePlayer(dt);
      updateEnemies(dt);
      updateBullets(dt);
      updateAnimation(dt);
      handleCollisions();
    }
  };

  // ==================== Render Functions ====================

  /**
   * 플레이어 렌더링 (멋진 우주선)
   */
  const renderPlayer = () => {
    const cx = player.x + player.width / 2;
    const cy = player.y + player.height / 2;

    // 그림자/글로우 효과
    ctx.shadowColor = COLORS.player;
    ctx.shadowBlur = 10;

    // 메인 선체 (중앙)
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.moveTo(cx, player.y); // 상단 끝
    ctx.lineTo(cx - 8, player.y + 12);
    ctx.lineTo(cx - 6, player.y + player.height - 5);
    ctx.lineTo(cx + 6, player.y + player.height - 5);
    ctx.lineTo(cx + 8, player.y + 12);
    ctx.closePath();
    ctx.fill();

    // 좌측 날개
    ctx.beginPath();
    ctx.moveTo(cx - 8, player.y + 15);
    ctx.lineTo(player.x, player.y + player.height);
    ctx.lineTo(cx - 6, player.y + player.height - 5);
    ctx.closePath();
    ctx.fill();

    // 우측 날개
    ctx.beginPath();
    ctx.moveTo(cx + 8, player.y + 15);
    ctx.lineTo(player.x + player.width, player.y + player.height);
    ctx.lineTo(cx + 6, player.y + player.height - 5);
    ctx.closePath();
    ctx.fill();

    // 조종석 (밝은 색)
    ctx.fillStyle = '#aaffaa';
    ctx.beginPath();
    ctx.arc(cx, player.y + 10, 4, 0, Math.PI * 2);
    ctx.fill();

    // 엔진 불꽃
    ctx.shadowBlur = 5;
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.moveTo(cx - 4, player.y + player.height - 5);
    ctx.lineTo(cx, player.y + player.height + 5 + Math.random() * 5);
    ctx.lineTo(cx + 4, player.y + player.height - 5);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
  };

  /**
   * 적 렌더링 (클래식 인베이더 스타일)
   */
  const renderEnemies = () => {
    for (const enemy of enemies) {
      if (!enemy.alive) continue;

      const x = enemy.x;
      const y = enemy.y;
      const w = enemy.width;
      const h = enemy.height;

      ctx.fillStyle = COLORS.enemy[enemy.type];

      if (enemy.type === 0) {
        // 타입 0: 오징어 형태 (가장 위 행)
        ctx.beginPath();
        // 몸통
        ctx.fillRect(x + w * 0.3, y + h * 0.1, w * 0.4, h * 0.5);
        // 머리
        ctx.fillRect(x + w * 0.2, y, w * 0.6, h * 0.3);
        // 촉수
        if (animFrame === 0) {
          ctx.fillRect(x + w * 0.1, y + h * 0.5, w * 0.15, h * 0.4);
          ctx.fillRect(x + w * 0.75, y + h * 0.5, w * 0.15, h * 0.4);
          ctx.fillRect(x + w * 0.35, y + h * 0.6, w * 0.1, h * 0.35);
          ctx.fillRect(x + w * 0.55, y + h * 0.6, w * 0.1, h * 0.35);
        } else {
          ctx.fillRect(x, y + h * 0.4, w * 0.15, h * 0.5);
          ctx.fillRect(x + w * 0.85, y + h * 0.4, w * 0.15, h * 0.5);
          ctx.fillRect(x + w * 0.3, y + h * 0.6, w * 0.1, h * 0.35);
          ctx.fillRect(x + w * 0.6, y + h * 0.6, w * 0.1, h * 0.35);
        }
        // 눈
        ctx.fillStyle = '#000';
        ctx.fillRect(x + w * 0.3, y + h * 0.15, w * 0.12, h * 0.12);
        ctx.fillRect(x + w * 0.58, y + h * 0.15, w * 0.12, h * 0.12);
      } else if (enemy.type === 1) {
        // 타입 1: 게 형태 (중간 행)
        // 몸통
        ctx.fillRect(x + w * 0.15, y + h * 0.2, w * 0.7, h * 0.5);
        // 머리
        ctx.fillRect(x + w * 0.25, y, w * 0.5, h * 0.3);
        // 집게
        if (animFrame === 0) {
          ctx.fillRect(x, y + h * 0.3, w * 0.2, h * 0.3);
          ctx.fillRect(x + w * 0.8, y + h * 0.3, w * 0.2, h * 0.3);
        } else {
          ctx.fillRect(x, y + h * 0.15, w * 0.2, h * 0.3);
          ctx.fillRect(x + w * 0.8, y + h * 0.15, w * 0.2, h * 0.3);
        }
        // 다리
        ctx.fillRect(x + w * 0.2, y + h * 0.7, w * 0.15, h * 0.3);
        ctx.fillRect(x + w * 0.65, y + h * 0.7, w * 0.15, h * 0.3);
        // 눈
        ctx.fillStyle = '#000';
        ctx.fillRect(x + w * 0.3, y + h * 0.25, w * 0.15, h * 0.15);
        ctx.fillRect(x + w * 0.55, y + h * 0.25, w * 0.15, h * 0.15);
      } else {
        // 타입 2: 문어 형태 (가장 아래 행)
        // 몸통
        ctx.fillRect(x + w * 0.2, y, w * 0.6, h * 0.5);
        ctx.fillRect(x + w * 0.1, y + h * 0.15, w * 0.8, h * 0.35);
        // 다리 (애니메이션)
        if (animFrame === 0) {
          ctx.fillRect(x + w * 0.1, y + h * 0.5, w * 0.15, h * 0.35);
          ctx.fillRect(x + w * 0.3, y + h * 0.5, w * 0.1, h * 0.5);
          ctx.fillRect(x + w * 0.6, y + h * 0.5, w * 0.1, h * 0.5);
          ctx.fillRect(x + w * 0.75, y + h * 0.5, w * 0.15, h * 0.35);
        } else {
          ctx.fillRect(x, y + h * 0.5, w * 0.15, h * 0.5);
          ctx.fillRect(x + w * 0.25, y + h * 0.5, w * 0.1, h * 0.35);
          ctx.fillRect(x + w * 0.65, y + h * 0.5, w * 0.1, h * 0.35);
          ctx.fillRect(x + w * 0.85, y + h * 0.5, w * 0.15, h * 0.5);
        }
        // 눈
        ctx.fillStyle = '#000';
        ctx.fillRect(x + w * 0.3, y + h * 0.2, w * 0.12, h * 0.15);
        ctx.fillRect(x + w * 0.58, y + h * 0.2, w * 0.12, h * 0.15);
      }
    }
  };

  /**
   * 총알 렌더링
   */
  const renderBullets = () => {
    // 플레이어 총알 (레이저 스타일)
    for (const bullet of playerBullets) {
      // 글로우 효과
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(
        bullet.x - 1,
        bullet.y + 2,
        bullet.width + 2,
        bullet.height - 4,
      );
      ctx.shadowBlur = 0;
    }

    // 적 총알 (에너지볼 스타일)
    for (const bullet of enemyBullets) {
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.arc(
        bullet.x + bullet.width / 2,
        bullet.y + bullet.height / 2,
        bullet.width,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(
        bullet.x + bullet.width / 2,
        bullet.y + bullet.height / 2,
        bullet.width / 2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  };

  /**
   * UI 렌더링 (점수, 목숨, 웨이브, 상태)
   */
  const renderUI = () => {
    ctx.fillStyle = COLORS.text;
    ctx.font = '20px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 10, 30);

    ctx.textAlign = 'center';
    ctx.fillText(`WAVE ${wave}`, CANVAS_WIDTH / 2, 30);

    ctx.textAlign = 'right';
    // 목숨 표시 (하트 아이콘)
    ctx.fillText(`LIVES: `, CANVAS_WIDTH - 80, 30);
    for (let i = 0; i < lives; i++) {
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      const hx = CANVAS_WIDTH - 60 + i * 20;
      const hy = 24;
      ctx.moveTo(hx, hy + 3);
      ctx.bezierCurveTo(hx, hy, hx - 5, hy, hx - 5, hy + 3);
      ctx.bezierCurveTo(hx - 5, hy + 6, hx, hy + 10, hx, hy + 12);
      ctx.bezierCurveTo(hx, hy + 10, hx + 5, hy + 6, hx + 5, hy + 3);
      ctx.bezierCurveTo(hx + 5, hy, hx, hy, hx, hy + 3);
      ctx.fill();
    }

    // 게임 상태 메시지
    ctx.textAlign = 'center';
    ctx.font = '30px monospace';
    ctx.fillStyle = COLORS.text;

    if (gameState === 'ready') {
      // 시작 화면 배경
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(CANVAS_WIDTH / 2 - 150, CANVAS_HEIGHT / 2 - 60, 300, 120);

      ctx.fillStyle = '#00ff00';
      ctx.fillText('SPACE INVADERS', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
      ctx.font = '18px monospace';
      ctx.fillStyle = COLORS.text;
      ctx.fillText(
        '← → : Move   SPACE : Shoot',
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 15,
      );
      ctx.fillText(
        'Press S to Start',
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 40,
      );
    } else if (gameState === 'gameover') {
      gameOverHud.render(score);
    }
  };

  const render = () => {
    // 배경 (별 효과)
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 배경 별 (간단한 장식)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    for (let i = 0; i < 50; i++) {
      const sx = (i * 97 + sec * 10) % CANVAS_WIDTH;
      const sy = (i * 53) % CANVAS_HEIGHT;
      ctx.fillRect(sx, sy, 1, 1);
    }

    if (gameState === 'playing' || gameState === 'gameover') {
      renderPlayer();
      renderEnemies();
      renderBullets();
    }

    renderUI();
  };

  // ==================== Game Loop ====================

  let raf = 0;
  const draw = (t: number) => {
    update(t);
    render();
    raf = requestAnimationFrame(draw);
  };

  // ==================== Init ====================

  resize();
  raf = requestAnimationFrame(draw);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };
};
