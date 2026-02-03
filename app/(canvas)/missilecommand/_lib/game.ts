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
import { createCities, getRandomAliveCity, circleCircleHit } from './utils';
import {
  createGameOverHud,
  gameStartHud,
  TGameOverCallbacks,
} from '@/lib/game';

export type TMissileCommandCallbacks = {
  onScoreSave: (initials: string, score: number) => Promise<void>;
};

export const setupMissileCommand = (
  canvas: HTMLCanvasElement,
  callbacks?: TMissileCommandCallbacks,
) => {
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

  // 난이도 시스템
  let difficultyLevel = 1;
  let difficultyTimer = 0;
  const DIFFICULTY_INTERVAL = 15; // 15초마다 난이도 증가
  let currentEnemySpeed = ENEMY_MISSILE_SPEED;
  let currentSpawnInterval = ENEMY_SPAWN_INTERVAL;

  let lastTime = 0;
  let sec = 0;
  let spawnTimer = 0; // 적 스폰 타이머

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

  const gameOverHud = createGameOverHud(canvas, ctx, 'missilecommand', gameOverCallbacks);

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
    gameOverHud.reset();

    // 난이도 초기화
    difficultyLevel = 1;
    difficultyTimer = 0;
    currentEnemySpeed = ENEMY_MISSILE_SPEED;
    currentSpawnInterval = ENEMY_SPAWN_INTERVAL;

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
    if (e.code === 'KeyS' && !isStarted && !isGameOver) {
      startGame();
      return;
    }

    // 게임 오버 시 HUD 처리
    if (isGameOver) {
      const handled = gameOverHud.onKeyDown(e, score);
      if (handled) return;
    }

    // 재시작 (게임 오버가 아닐 때만)
    if (e.code === 'KeyR' && !isGameOver) {
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

  // 난이도 업데이트
  const updateDifficulty = (dt: number) => {
    difficultyTimer += dt;
    if (difficultyTimer >= DIFFICULTY_INTERVAL) {
      difficultyTimer = 0;
      difficultyLevel++;

      // 난이도에 따라 속도 증가, 스폰 간격 감소
      currentEnemySpeed =
        ENEMY_MISSILE_SPEED * (1 + (difficultyLevel - 1) * 0.2);
      currentSpawnInterval = Math.max(
        0.5,
        ENEMY_SPAWN_INTERVAL - (difficultyLevel - 1) * 0.25,
      );
    }
  };

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
      speed: currentEnemySpeed,
    });

    // 높은 난이도에서는 추가 미사일 스폰
    if (difficultyLevel >= 3 && Math.random() < 0.3) {
      const targetCity2 = getRandomAliveCity(cities);
      if (targetCity2) {
        const startX2 = Math.random() * CANVAS_WIDTH;
        enemyMissiles.push({
          x: startX2,
          y: 0,
          startX: startX2,
          startY: 0,
          targetX: targetCity2.x + targetCity2.width / 2,
          targetY: targetCity2.y,
          speed: currentEnemySpeed,
        });
      }
    }
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
      // 난이도 업데이트
      updateDifficulty(dt);

      // 적 스폰
      spawnTimer += dt;
      if (spawnTimer >= currentSpawnInterval) {
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

  // 도시 렌더링 (멋진 스카이라인)
  const renderCities = () => {
    for (const city of cities) {
      if (!city.alive) continue;

      const x = city.x;
      const y = city.y;
      const w = city.width;
      const h = city.height;

      // 건물들을 여러 개 그려서 스카이라인 효과
      ctx.fillStyle = '#1a1a3a';
      ctx.fillRect(x, y, w, h); // 베이스

      // 건물 1 (왼쪽 큰 건물)
      ctx.fillStyle = '#2a2a5a';
      ctx.fillRect(x + 2, y - 25, 15, 25 + h);
      // 창문
      ctx.fillStyle = '#ffff88';
      for (let wy = y - 20; wy < y + h - 5; wy += 8) {
        ctx.fillRect(x + 5, wy, 3, 4);
        ctx.fillRect(x + 11, wy, 3, 4);
      }

      // 건물 2 (중앙 작은 건물)
      ctx.fillStyle = '#3a3a6a';
      ctx.fillRect(x + 20, y - 15, 12, 15 + h);
      ctx.fillStyle = '#88ffff';
      for (let wy = y - 10; wy < y + h - 5; wy += 7) {
        ctx.fillRect(x + 23, wy, 6, 3);
      }

      // 건물 3 (오른쪽 높은 건물)
      ctx.fillStyle = '#2a4a5a';
      ctx.fillRect(x + 35, y - 35, 18, 35 + h);
      // 안테나
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(x + 43, y - 42, 2, 7);
      // 창문
      ctx.fillStyle = '#ffff44';
      for (let wy = y - 30; wy < y + h - 5; wy += 8) {
        ctx.fillRect(x + 38, wy, 4, 4);
        ctx.fillRect(x + 46, wy, 4, 4);
      }

      // 건물 4 (맨 오른쪽 중간 건물)
      ctx.fillStyle = '#4a3a5a';
      ctx.fillRect(x + w - 10, y - 20, 10, 20 + h);
      ctx.fillStyle = '#88ff88';
      for (let wy = y - 15; wy < y + h - 5; wy += 6) {
        ctx.fillRect(x + w - 7, wy, 4, 3);
      }
    }
  };

  // 포탑 렌더링 (멋진 발사대)
  const renderTurret = () => {
    const turretX = CANVAS_WIDTH / 2;

    // 포탑 베이스 (플랫폼)
    ctx.fillStyle = '#444466';
    ctx.fillRect(turretX - 40, TURRET_Y - 5, 80, 15);

    // 포탑 베이스 그라데이션 효과
    ctx.fillStyle = '#555588';
    ctx.fillRect(turretX - 35, TURRET_Y - 8, 70, 8);

    // 메인 포탑 바디
    ctx.fillStyle = '#6666aa';
    ctx.beginPath();
    ctx.moveTo(turretX - 20, TURRET_Y - 8);
    ctx.lineTo(turretX - 15, TURRET_Y - 25);
    ctx.lineTo(turretX + 15, TURRET_Y - 25);
    ctx.lineTo(turretX + 20, TURRET_Y - 8);
    ctx.closePath();
    ctx.fill();

    // 포신 (마우스 방향으로)
    const angle = Math.atan2(mouseY - (TURRET_Y - 20), mouseX - turretX);
    const barrelLength = 25;

    ctx.strokeStyle = '#8888cc';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(turretX, TURRET_Y - 20);
    ctx.lineTo(
      turretX + Math.cos(angle) * barrelLength,
      TURRET_Y - 20 + Math.sin(angle) * barrelLength,
    );
    ctx.stroke();

    // 포신 내부 (밝은 색)
    ctx.strokeStyle = '#aaaaee';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(turretX, TURRET_Y - 20);
    ctx.lineTo(
      turretX + Math.cos(angle) * barrelLength,
      TURRET_Y - 20 + Math.sin(angle) * barrelLength,
    );
    ctx.stroke();

    // 포탑 상단 장식
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(turretX, TURRET_Y - 25, 5, 0, Math.PI * 2);
    ctx.fill();
  };

  // 적 미사일 렌더링 (궤적 + 미사일)
  const renderEnemyMissiles = () => {
    for (const missile of enemyMissiles) {
      // 궤적 (시작점에서 현재 위치까지 - 그라데이션 효과)
      const gradient = ctx.createLinearGradient(
        missile.startX,
        missile.startY,
        missile.x,
        missile.y,
      );
      gradient.addColorStop(0, 'rgba(68, 0, 0, 0.3)');
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0.8)');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(missile.startX, missile.startY);
      ctx.lineTo(missile.x, missile.y);
      ctx.stroke();

      // 미사일 (글로우 효과)
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.arc(missile.x, missile.y, ENEMY_MISSILE_RADIUS + 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(missile.x, missile.y, ENEMY_MISSILE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  };

  // 플레이어 미사일 렌더링
  const renderPlayerMissiles = () => {
    const turretX = CANVAS_WIDTH / 2;

    for (const missile of playerMissiles) {
      // 궤적 (포탑에서 현재 위치까지 - 그라데이션)
      const gradient = ctx.createLinearGradient(
        turretX,
        TURRET_Y,
        missile.x,
        missile.y,
      );
      gradient.addColorStop(0, 'rgba(0, 68, 68, 0.3)');
      gradient.addColorStop(1, 'rgba(0, 255, 255, 0.8)');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(turretX, TURRET_Y - 20);
      ctx.lineTo(missile.x, missile.y);
      ctx.stroke();

      // 미사일 (글로우 효과)
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#00ffff';
      ctx.beginPath();
      ctx.arc(missile.x, missile.y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(missile.x, missile.y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  };

  // 폭발 렌더링 (다중 링 효과)
  const renderExplosions = () => {
    for (const explosion of explosions) {
      const progress = explosion.radius / explosion.maxRadius;

      // 외부 링 (빨강)
      ctx.strokeStyle = `rgba(255, 100, 0, ${0.5 * (1 - progress)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
      ctx.stroke();

      // 중간 (노랑)
      ctx.fillStyle = `rgba(255, 255, 0, ${0.6 * (1 - progress * 0.5)})`;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, explosion.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();

      // 내부 (흰색)
      ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * (1 - progress)})`;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, explosion.radius * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // 조준점 렌더링 (멋진 조준경)
  const renderCrosshair = () => {
    if (!isStarted || isGameOver) return;

    const size = 15;

    // 외부 원
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, size, 0, Math.PI * 2);
    ctx.stroke();

    // 십자선
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // 수평선 (가운데 비움)
    ctx.moveTo(mouseX - size - 5, mouseY);
    ctx.lineTo(mouseX - 5, mouseY);
    ctx.moveTo(mouseX + 5, mouseY);
    ctx.lineTo(mouseX + size + 5, mouseY);
    // 수직선 (가운데 비움)
    ctx.moveTo(mouseX, mouseY - size - 5);
    ctx.lineTo(mouseX, mouseY - 5);
    ctx.moveTo(mouseX, mouseY + 5);
    ctx.lineTo(mouseX, mouseY + size + 5);
    ctx.stroke();

    // 중앙 점
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, 2, 0, Math.PI * 2);
    ctx.fill();
  };

  // UI 렌더링 (점수, 난이도, 상태)
  const renderUI = () => {
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 20, 35);

    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${difficultyLevel}`, CANVAS_WIDTH / 2, 35);

    // 남은 도시 수
    const aliveCities = cities.filter((c) => c.alive).length;
    ctx.textAlign = 'right';
    ctx.fillText(`CITIES: ${aliveCities}`, CANVAS_WIDTH - 20, 35);

    // 시작 화면
    if (!isStarted && !isGameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(CANVAS_WIDTH / 2 - 180, CANVAS_HEIGHT / 2 - 80, 360, 160);

      ctx.fillStyle = '#ff4444';
      ctx.font = '36px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('MISSILE COMMAND', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px monospace';
      ctx.fillText(
        'Click to fire interceptors',
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 10,
      );
      ctx.fillText(
        'Protect your cities!',
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 35,
      );
      ctx.fillStyle = '#00ff00';
      ctx.fillText(
        'Press S to Start',
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 60,
      );
    }

    // 게임 오버 화면
    if (isGameOver) {
      gameOverHud.render(score);
    }
  };

  const render = () => {
    // 배경 (밤하늘 그라데이션)
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#000011');
    gradient.addColorStop(0.5, '#000033');
    gradient.addColorStop(1, '#000044');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 별 배경
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    for (let i = 0; i < 80; i++) {
      const sx = (i * 97) % CANVAS_WIDTH;
      const sy = (i * 53) % (CANVAS_HEIGHT - 100);
      const size = (i % 3) + 1;
      ctx.fillRect(sx, sy, size, size);
    }

    // 지면
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, CANVAS_HEIGHT - 20, CANVAS_WIDTH, 20);

    renderCities();
    renderTurret();
    renderEnemyMissiles();
    renderPlayerMissiles();
    renderExplosions();
    renderCrosshair();
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
  window.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('click', onClick);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('click', onClick);
  };
};
