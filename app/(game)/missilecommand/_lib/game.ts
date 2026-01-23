import { drawHud } from '@/lib/game';
import { TPlayerMissile, TExplosion, TEnemyMissile, TCity } from './types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PLAYER_MISSILE_SPEED,
  EXPLOSION_MAX_RADIUS,
  EXPLOSION_DURATION,
  ENEMY_MISSILE_SPEED,
  ENEMY_MISSILE_RADIUS,
  ENEMY_SPAWN_INTERVAL,
  TURRET_Y,
  COLORS,
} from './config';
import { createCities, getRandomAliveCity, distance, circleCircleHit } from './utils';

export const setupMissileCommand = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // ==================== State ====================

  let playerMissiles: TPlayerMissile[] = [];
  let explosions: TExplosion[] = [];
  let enemyMissiles: TEnemyMissile[] = [];
  let cities: TCity[] = [];

  let mouseX = CANVAS_WIDTH / 2; // 마우스 위치 (조준점)
  let mouseY = CANVAS_HEIGHT / 2;

  let score = 0;
  let isStarted = false;
  let isGameOver = false;

  let lastTime = 0;
  let sec = 0;
  let spawnTimer = 0; // 적 스폰 타이머

  // ==================== Game State ====================

  const startGame = () => {
    if (isStarted) return;
    isStarted = true;
    lastTime = 0;
    sec = 0;
  };

  const resetGame = () => {
    isStarted = false;
    isGameOver = false;
    score = 0;
    lastTime = 0;
    sec = 0;
    spawnTimer = 0;

    playerMissiles = [];
    explosions = [];
    enemyMissiles = [];
    cities = createCities();
  };

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(CANVAS_WIDTH * dpr);
    canvas.height = Math.round(CANVAS_HEIGHT * dpr);
    canvas.style.width = `${CANVAS_WIDTH}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    resetGame();
  };

  // ==================== Input Handlers ====================

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'KeyS') {
      startGame();
      return;
    }

    if (e.code === 'KeyR') {
      resetGame();
      return;
    }
  };

  // 마우스 이동 - 조준점 업데이트
  const onMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  };

  // 마우스 클릭 - 요격 미사일 발사
  const onClick = (e: MouseEvent) => {
    if (!isStarted || isGameOver) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // 포탑 위치 (화면 하단 중앙)
    const turretX = CANVAS_WIDTH / 2;
    const turretY = TURRET_Y;

    // 요격 미사일 생성
    playerMissiles.push({
      x: turretX,
      y: turretY,
      targetX: clickX,
      targetY: clickY,
      speed: PLAYER_MISSILE_SPEED,
    });
  };

  // ==================== Update Functions ====================

  // 적 미사일 스폰
  const spawnEnemyMissile = () => {
    const targetCity = getRandomAliveCity(cities);
    if (!targetCity) return; // 모든 도시 파괴됨

    // 화면 상단 랜덤 위치에서 시작
    const startX = Math.random() * CANVAS_WIDTH;
    const startY = 0;

    // 도시 중앙을 목표로
    const targetX = targetCity.x + targetCity.width / 2;
    const targetY = targetCity.y;

    enemyMissiles.push({
      x: startX,
      y: startY,
      startX,
      startY,
      targetX,
      targetY,
      speed: ENEMY_MISSILE_SPEED,
    });
  };

  // 적 미사일 업데이트
  const updateEnemyMissiles = (dt: number) => {
    for (const missile of enemyMissiles) {
      // 목표를 향해 이동
      const dx = missile.targetX - missile.x;
      const dy = missile.targetY - missile.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        // 정규화된 방향 * 속도 * 시간
        missile.x += (dx / dist) * missile.speed * dt;
        missile.y += (dy / dist) * missile.speed * dt;
      }
    }
  };

  // 플레이어 미사일 업데이트
  const updatePlayerMissiles = (dt: number) => {
    for (let i = playerMissiles.length - 1; i >= 0; i--) {
      const missile = playerMissiles[i];

      // 목표를 향해 이동
      const dx = missile.targetX - missile.x;
      const dy = missile.targetY - missile.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // 목표 도달 체크 (이동할 거리보다 남은 거리가 작으면)
      const moveDistance = missile.speed * dt;
      if (dist <= moveDistance) {
        // 목표 도달! -> 폭발 생성
        explosions.push({
          x: missile.targetX,
          y: missile.targetY,
          radius: 0,
          maxRadius: EXPLOSION_MAX_RADIUS,
          phase: 'expanding',
        });
        playerMissiles.splice(i, 1);
      } else {
        // 이동
        missile.x += (dx / dist) * missile.speed * dt;
        missile.y += (dy / dist) * missile.speed * dt;
      }
    }
  };

  // 폭발 업데이트
  const updateExplosions = (dt: number) => {
    const expandSpeed = EXPLOSION_MAX_RADIUS / (EXPLOSION_DURATION / 2);

    for (let i = explosions.length - 1; i >= 0; i--) {
      const explosion = explosions[i];

      if (explosion.phase === 'expanding') {
        // 커지는 중
        explosion.radius += expandSpeed * dt;
        if (explosion.radius >= explosion.maxRadius) {
          explosion.radius = explosion.maxRadius;
          explosion.phase = 'shrinking';
        }
      } else {
        // 줄어드는 중
        explosion.radius -= expandSpeed * dt;
        if (explosion.radius <= 0) {
          explosions.splice(i, 1);
        }
      }
    }
  };

  // 폭발 vs 적 미사일 충돌
  const handleExplosionCollision = () => {
    for (const explosion of explosions) {
      for (let i = enemyMissiles.length - 1; i >= 0; i--) {
        const enemy = enemyMissiles[i];

        if (
          circleCircleHit(
            explosion.x,
            explosion.y,
            explosion.radius,
            enemy.x,
            enemy.y,
            ENEMY_MISSILE_RADIUS,
          )
        ) {
          // 적 미사일 파괴!
          enemyMissiles.splice(i, 1);
          score += 25;
        }
      }
    }
  };

  // 적 미사일 vs 도시 충돌
  const handleCityCollision = () => {
    for (let i = enemyMissiles.length - 1; i >= 0; i--) {
      const missile = enemyMissiles[i];

      // 목표 지점(도시)에 도달했는지 체크
      if (missile.y >= missile.targetY) {
        // 해당 도시 파괴
        for (const city of cities) {
          if (!city.alive) continue;

          const cityCenter = city.x + city.width / 2;
          if (Math.abs(missile.targetX - cityCenter) < city.width / 2) {
            city.alive = false;
            break;
          }
        }

        enemyMissiles.splice(i, 1);
      }
    }

    // 게임 오버 체크 (모든 도시 파괴)
    const aliveCities = cities.filter((c) => c.alive);
    if (aliveCities.length === 0) {
      isGameOver = true;
    }
  };

  const update = (t: number) => {
    if (!lastTime) lastTime = t;
    let dt = (t - lastTime) / 1000;
    lastTime = t;

    dt = Math.min(dt, 0.05);
    sec += dt;

    if (isStarted && !isGameOver) {
      // 적 스폰
      spawnTimer += dt;
      if (spawnTimer >= ENEMY_SPAWN_INTERVAL) {
        spawnTimer = 0;
        spawnEnemyMissile();
      }

      // 업데이트
      updateEnemyMissiles(dt);
      updatePlayerMissiles(dt);
      updateExplosions(dt);

      // 충돌 처리
      handleExplosionCollision();
      handleCityCollision();
    }
  };

  // ==================== Render Functions ====================

  // 도시 렌더링
  const renderCities = () => {
    ctx.fillStyle = COLORS.city;
    for (const city of cities) {
      if (!city.alive) continue;
      ctx.fillRect(city.x, city.y, city.width, city.height);
    }
  };

  // 포탑 렌더링
  const renderTurret = () => {
    ctx.fillStyle = COLORS.turret;
    const turretX = CANVAS_WIDTH / 2;

    // 간단한 삼각형 포탑
    ctx.beginPath();
    ctx.moveTo(turretX, TURRET_Y - 20);
    ctx.lineTo(turretX - 15, TURRET_Y);
    ctx.lineTo(turretX + 15, TURRET_Y);
    ctx.closePath();
    ctx.fill();
  };

  // 적 미사일 렌더링 (궤적 + 미사일)
  const renderEnemyMissiles = () => {
    for (const missile of enemyMissiles) {
      // 궤적 (시작점에서 현재 위치까지 선)
      ctx.strokeStyle = COLORS.enemyTrail;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(missile.startX, missile.startY);
      ctx.lineTo(missile.x, missile.y);
      ctx.stroke();

      // 미사일 (원)
      ctx.fillStyle = COLORS.enemyMissile;
      ctx.beginPath();
      ctx.arc(missile.x, missile.y, ENEMY_MISSILE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // 플레이어 미사일 렌더링
  const renderPlayerMissiles = () => {
    const turretX = CANVAS_WIDTH / 2;

    for (const missile of playerMissiles) {
      // 궤적 (포탑에서 현재 위치까지 선)
      ctx.strokeStyle = COLORS.playerTrail;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(turretX, TURRET_Y);
      ctx.lineTo(missile.x, missile.y);
      ctx.stroke();

      // 미사일 (작은 원)
      ctx.fillStyle = COLORS.playerMissile;
      ctx.beginPath();
      ctx.arc(missile.x, missile.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // 폭발 렌더링
  const renderExplosions = () => {
    for (const explosion of explosions) {
      ctx.fillStyle = COLORS.explosion;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
  };

  // 조준점 렌더링
  const renderCrosshair = () => {
    if (!isStarted || isGameOver) return;

    ctx.strokeStyle = COLORS.crosshair;
    ctx.lineWidth = 1;

    // 십자가 모양
    const size = 10;
    ctx.beginPath();
    ctx.moveTo(mouseX - size, mouseY);
    ctx.lineTo(mouseX + size, mouseY);
    ctx.moveTo(mouseX, mouseY - size);
    ctx.lineTo(mouseX, mouseY + size);
    ctx.stroke();
  };

  const render = () => {
    // 배경
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    renderCities();
    renderTurret();
    renderEnemyMissiles();
    renderPlayerMissiles();
    renderExplosions();
    renderCrosshair();
  };

  // ==================== Game Loop ====================

  let raf = 0;
  const draw = (t: number) => {
    update(t);
    render();
    drawHud(canvas, ctx, score, sec, isStarted, isGameOver);

    raf = requestAnimationFrame(draw);
  };

  // ==================== Init ====================

  resize();
  raf = requestAnimationFrame(draw);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('click', onClick);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('click', onClick);
  };
};
