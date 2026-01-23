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

export const setupSpaceInvaders = (canvas: HTMLCanvasElement) => {
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

  // 시간
  let lastTime = 0;
  let sec = 0;

  // ==================== Game State ====================

  const initGame = () => {
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
    gameState = 'playing';
    lastTime = 0;
    sec = 0;
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
      initGame();
      return;
    }

    // 재시작 (모든 상태 초기화)
    if (e.code === 'KeyR') {
      gameState = 'ready';
      playerBullets = [];
      enemyBullets = [];
      enemies = [];
      enemyDirection = 1;
      enemySpeedMultiplier = 1;
      score = 0;
      lives = 3;
      lastTime = 0;
      sec = 0;
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
      gameState = 'won';
      return;
    }

    // 적이 줄어들수록 빨라짐
    enemySpeedMultiplier = 1 + (55 - aliveCount) * 0.03;

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

    // 적 발사
    enemyShootTimer -= dt;
    if (enemyShootTimer <= 0) {
      const shooter = getShootingEnemy(enemies);
      if (shooter) {
        enemyBullets.push({
          x: shooter.x + shooter.width / 2 - BULLET_WIDTH / 2,
          y: shooter.y + shooter.height,
          width: BULLET_WIDTH,
          height: BULLET_HEIGHT,
          speed: ENEMY_BULLET_SPEED,
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
      handleCollisions();
    }
  };

  // ==================== Render Functions ====================

  /**
   * 플레이어 렌더링 (간단한 삼각형 우주선)
   */
  const renderPlayer = () => {
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    // 삼각형 우주선
    ctx.moveTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x, player.y + player.height);
    ctx.lineTo(player.x + player.width, player.y + player.height);
    ctx.closePath();
    ctx.fill();
  };

  /**
   * 적 렌더링
   */
  const renderEnemies = () => {
    for (const enemy of enemies) {
      if (!enemy.alive) continue;

      ctx.fillStyle = COLORS.enemy[enemy.type];
      ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    }
  };

  /**
   * 총알 렌더링
   */
  const renderBullets = () => {
    // 플레이어 총알
    ctx.fillStyle = COLORS.playerBullet;
    for (const bullet of playerBullets) {
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    }

    // 적 총알
    ctx.fillStyle = COLORS.enemyBullet;
    for (const bullet of enemyBullets) {
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    }
  };

  /**
   * UI 렌더링 (점수, 목숨, 상태)
   */
  const renderUI = () => {
    ctx.fillStyle = COLORS.text;
    ctx.font = '20px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 10, 30);

    ctx.textAlign = 'right';
    ctx.fillText(`LIVES: ${lives}`, CANVAS_WIDTH - 10, 30);

    // 게임 상태 메시지
    ctx.textAlign = 'center';
    ctx.font = '30px monospace';

    if (gameState === 'ready') {
      ctx.fillText('Press S to Start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    } else if (gameState === 'gameover') {
      ctx.fillStyle = '#ff0000';
      ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.font = '20px monospace';
      ctx.fillStyle = COLORS.text;
      ctx.fillText(
        'Press R to Restart',
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 40,
      );
    } else if (gameState === 'won') {
      ctx.fillStyle = '#00ff00';
      ctx.fillText('YOU WIN!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.font = '20px monospace';
      ctx.fillStyle = COLORS.text;
      ctx.fillText(
        'Press R to Restart',
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 40,
      );
    }
  };

  const render = () => {
    // 배경
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (
      gameState === 'playing' ||
      gameState === 'gameover' ||
      gameState === 'won'
    ) {
      renderPlayer();
      renderEnemies();
      renderBullets();
    }

    renderUI();
  };

  // ==================== Game Loop ====================

  let raf = 0;
  const gameLoop = (t: number) => {
    update(t);
    render();
    raf = requestAnimationFrame(gameLoop);
  };

  // ==================== Init ====================

  resize();
  raf = requestAnimationFrame(gameLoop);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };
};
