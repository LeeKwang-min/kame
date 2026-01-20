import { drawHud } from "@/lib/game";
import { 
  SHIP_RADIUS, SHIP_ROTATION_SPEED, SHIP_THRUST, SHIP_FRICTION, SHIP_MAX_SPEED,
  BULLET_SPEED, BULLET_LIFE, BULLET_RADIUS, FIRE_COOLDOWN,
  ASTEROID_SPEED, ASTEROID_SIZE, INITIAL_ASTEROIDS
} from "./config";
import { TShip, TBullet, TAsteroid } from "./types";
import { circleCircleHit } from "@/lib/utils";

export const setupAsteroid = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // ==================== State ====================

  const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    Space: false,
  };

  let ship: TShip = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2, // -90도 -> 위쪽 바라봄봄
    radius: SHIP_RADIUS
  }
  let bullets: TBullet[] = [];
  let fireCooldown = 0; // 발사 쿨타임임

  let asteroids: TAsteroid[] = [];

  let wave = 1;

  let score = 0;
  let isStarted = false;
  let isGameOver = false;

  let lastTime = 0;
  let acc = 0;  // tick용 누적 시간 (snake 같은 고정 스텝 게임에서 사용)
  let sec = 0;  // 총 경과 시간

  // ==================== Game State ====================

  const startGame = () => {
    if (isStarted) return;
    isStarted = true;
    lastTime = 0;
    acc = 0;
    sec = 0;
  };

  const resetGame = () => {
    const rect = canvas.getBoundingClientRect();

    isStarted = false;
    isGameOver = false;
    score = 0;
    lastTime = 0;
    acc = 0;
    sec = 0;

    // TODO: 게임 오브젝트 초기화
    ship = {
      x: rect.width / 2,
      y: rect.height / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      radius: SHIP_RADIUS
    }

    bullets = [];
    fireCooldown = 0;

    wave = 1;

    asteroids = [];
    spawnInitialAsteroids();
  };

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    resetGame();
  };

  // ==================== Input Handlers ====================

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "KeyS") {
      startGame();
      return;
    }

    if (e.code === "KeyR") {
      resetGame();
      return;
    }

    if (e.code === "Space") {
      keys.Space = true;
      e.preventDefault();
      return;
    }

    if (e.key in keys) {
      keys[e.key as keyof typeof keys] = true;
      e.preventDefault();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      keys.Space = false;
      e.preventDefault();
      return;
    }

    if (e.key in keys) {
      keys[e.key as keyof typeof keys] = false;
      e.preventDefault();
    }
  };

  // ==================== Update Functions ====================

  // TODO: 각 오브젝트별 update 함수 작성
  const updateShip = (dt: number) => {
    const rect = canvas.getBoundingClientRect();

    // 회전
    if (keys.ArrowLeft) ship.angle -= SHIP_ROTATION_SPEED * dt;
    if (keys.ArrowRight) ship.angle += SHIP_ROTATION_SPEED * dt;

    // 가속
    if (keys.ArrowUp) {
      ship.vx += Math.cos(ship.angle) * SHIP_THRUST * dt;
      ship.vy += Math.sin(ship.angle) * SHIP_THRUST * dt;
    }

    // 최대 속도 제한
    const speed = Math.sqrt(ship.vx ** 2 + ship.vy ** 2);
    if (speed > SHIP_MAX_SPEED) {
      ship.vx = (ship.vx / speed) * SHIP_MAX_SPEED;
      ship.vy = (ship.vy / speed) * SHIP_MAX_SPEED;
    }

    // 마찰
    ship.vx *= SHIP_FRICTION;
    ship.vy *= SHIP_FRICTION;

    // 관성으로 이동
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;

    // 화면 랩어라운드 (한쪽 끝으로 가면 반대편으로 이동)
    if (ship.x < 0) ship.x = rect.width;
    if (ship.x > rect.width) ship.x = 0;
    if (ship.y < 0) ship.y = rect.height;
    if (ship.y > rect.height) ship.y = 0;
  }

  const fireBullet = () => {
    const bulletX = ship.x + Math.cos(ship.angle) * ship.radius;
    const bulletY = ship.y + Math.sin(ship.angle) * ship.radius;

    bullets.push({
      x: bulletX,
      y: bulletY,
      vx: Math.cos(ship.angle) * BULLET_SPEED + ship.vx,
      vy: Math.sin(ship.angle) * BULLET_SPEED + ship.vy,
      life: BULLET_LIFE
    })
  }

  const updateBullets = (dt: number) => {
    if (fireCooldown > 0) {
      fireCooldown -= dt;
    }

    if (keys.Space && fireCooldown <= 0) {
      fireBullet();
      fireCooldown = FIRE_COOLDOWN;
    }

    // 총알 이동 및 수명 감소
    for (const bullet of bullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
    }

    // 총알 삭제 (수명 초과)
    bullets = bullets.filter(b => b.life > 0);
  }

  const createAsteroid = (x: number, y: number, radius: number) => {
    // 랜덤 방향
    const angle = Math.random() * Math.PI * 2;
    const speed = ASTEROID_SPEED + Math.random() * ASTEROID_SPEED;

    // 불규칙한 모양 (8 ~ 12개 꼭짓점)
    const vertexCount = 8 + Math.floor(Math.random() * 5);
    const vertices: number[] = [];
    for(let i = 0; i < vertexCount; i++) {
      // 반지름에 +-30% 랜덤
      vertices.push(0.7 + Math.random() * 0.6);
    }
    
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius,
      vertices
    }
  }

  const spawnInitialAsteroids = () => {
    const rect = canvas.getBoundingClientRect();

    for (let i = 0; i < INITIAL_ASTEROIDS; i++) {
      // 우주선과 겹치지 않게 가장자리에서 생성
      let x: number, y: number;
      
      if (Math.random() < 0.5) {
        // 좌우 가장자리
        x = Math.random() < 0.5 ? 50 : rect.width - 50;
        y = Math.random() * rect.height;
      } else {
        // 상하 가장자리
        x = Math.random() * rect.width;
        y = Math.random() < 0.5 ? 50 : rect.height - 50;
      }
  
      asteroids.push(createAsteroid(x, y, ASTEROID_SIZE[0]));  // 큰 사이즈
    }
  }

  const updateAsteroids = (dt: number) => {
    const rect = canvas.getBoundingClientRect();
  
    for (const asteroid of asteroids) {
      // 이동
      asteroid.x += asteroid.vx * dt;
      asteroid.y += asteroid.vy * dt;
  
      // 화면 랩어라운드
      if (asteroid.x < -asteroid.radius) asteroid.x = rect.width + asteroid.radius;
      if (asteroid.x > rect.width + asteroid.radius) asteroid.x = -asteroid.radius;
      if (asteroid.y < -asteroid.radius) asteroid.y = rect.height + asteroid.radius;
      if (asteroid.y > rect.height + asteroid.radius) asteroid.y = -asteroid.radius;
    }
  };

  const startNextWave = () => {
    wave++;
    
    const rect = canvas.getBoundingClientRect();
    
    // 웨이브마다 소행성 수 증가 (기본 4개 + 웨이브당 1개)
    const asteroidCount = INITIAL_ASTEROIDS + (wave - 1);
    
    for (let i = 0; i < asteroidCount; i++) {
      let x: number, y: number;
      
      // do-while: 조건을 만족할 때까지 반복
      do {
        // 화면 가장자리에서 랜덤 위치 생성
        if (Math.random() < 0.5) {
          // 좌우 가장자리
          x = Math.random() < 0.5 ? 50 : rect.width - 50;
          y = Math.random() * rect.height;
        } else {
          // 상하 가장자리
          x = Math.random() * rect.width;
          y = Math.random() < 0.5 ? 50 : rect.height - 50;
        }
      } while (
        // 우주선과의 거리가 150 미만이면 다시 뽑기
        Math.sqrt((x - ship.x) ** 2 + (y - ship.y) ** 2) < 150
      );
    
      asteroids.push(createAsteroid(x, y, ASTEROID_SIZE[0]));
    }
  };

  const checkWaveComplete = () => {
    if (asteroids.length === 0) {
      startNextWave();
    }
  };

  // TODO: 충돌 처리 함수 작성
  const splitAsteroid = (asteroid: TAsteroid): TAsteroid[] => {
    // 현재 사이즈의 인덱스 찾기
    const currentSizeIndex = ASTEROID_SIZE.findIndex(size => size === asteroid.radius);
    
    // 가장 작은 사이즈면 분열 없음
    if (currentSizeIndex === -1 || currentSizeIndex >= ASTEROID_SIZE.length - 1) {
      return [];
    }
  
    // 다음 (더 작은) 사이즈
    const newRadius = ASTEROID_SIZE[currentSizeIndex + 1];
  
    // 2개로 분열, 서로 다른 방향으로
    const result: TAsteroid[] = [];
    for (let i = 0; i < 2; i++) {
      const newAsteroid = createAsteroid(asteroid.x, asteroid.y, newRadius);
      
      // 기존 속도에 랜덤 방향 추가 (더 빠르게)
      newAsteroid.vx = asteroid.vx + (Math.random() - 0.5) * 100;
      newAsteroid.vy = asteroid.vy + (Math.random() - 0.5) * 100;
      
      result.push(newAsteroid);
    }
  
    return result;
  };

  const handleBulletAsteroidCollision = () => {
    const bulletsToRemove: number[] = [];
    const asteroidsToRemove: number[] = [];
    const newAsteroids: TAsteroid[] = [];
  
    for (let i = 0; i < bullets.length; i++) {
      const bullet = bullets[i];
  
      for (let j = 0; j < asteroids.length; j++) {
        const asteroid = asteroids[j];
  
        if (circleCircleHit(
          bullet.x, bullet.y, BULLET_RADIUS,
          asteroid.x, asteroid.y, asteroid.radius
        )) {
          bulletsToRemove.push(i);
          asteroidsToRemove.push(j);
          
          // 사이즈에 따른 점수 (큰 것일수록 낮은 점수)
          const sizeIndex = ASTEROID_SIZE.findIndex(s => s === asteroid.radius);
          score += (sizeIndex + 1) * 20;  // 20, 40, 60점
  
          // 분열!
          const splits = splitAsteroid(asteroid);
          newAsteroids.push(...splits);
  
          break;
        }
      }
    }
  
    // 뒤에서부터 제거
    bulletsToRemove.sort((a, b) => b - a).forEach(i => bullets.splice(i, 1));
    asteroidsToRemove.sort((a, b) => b - a).forEach(j => asteroids.splice(j, 1));
  
    // 분열된 소행성 추가
    asteroids.push(...newAsteroids);
  };

  const handleShipAsteroidCollision = (): boolean => {
    for (const asteroid of asteroids) {
      if (circleCircleHit(
        ship.x, ship.y, ship.radius,
        asteroid.x, asteroid.y, asteroid.radius
      )) {
        return true;  // 충돌!
      }
    }
    return false;
  };

  const update = (t: number) => {
    if (!lastTime) lastTime = t;
    let dt = (t - lastTime) / 1000;
    lastTime = t;

    dt = Math.min(dt, 0.05);
    acc += dt;
    sec += dt;

    if (isStarted && !isGameOver) {
      // TODO: update 함수들 호출
      updateShip(dt);
      updateBullets(dt);
      updateAsteroids(dt);

      handleBulletAsteroidCollision();
      checkWaveComplete();

      if (handleShipAsteroidCollision()) {
        isGameOver = true;
        return;
      }
    }
  };

  // ==================== Render Functions ====================

  // TODO: 각 오브젝트별 render 함수 작성

  const renderShip = () => {
    ctx.save();

    ctx.translate(ship.x, ship.y); // 우주선 위치로 이동
    ctx.rotate(ship.angle); // 우주선 각도만큼 회전

    // 삼각형 우주선 그리기 (원점 기준)
    ctx.beginPath();
    ctx.moveTo(ship.radius, 0); // 앞쪽 (코)
    ctx.lineTo(-ship.radius * 0.7, -ship.radius * 0.7); // 왼쪽 뒤
    ctx.lineTo(-ship.radius * 0.4, 0);  // 뒤쪽 중앙 (오목하게)
    ctx.lineTo(-ship.radius * 0.7, ship.radius * 0.7);  // 오른쪽 뒤
    ctx.closePath();

    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  const renderBullets = () => {
    ctx.fillStyle = "limegreen";
    for (const bullet of bullets) {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, BULLET_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const renderAsteroids = () => {
    ctx.strokeStyle = "gray";
    ctx.lineWidth = 2;
  
    for (const asteroid of asteroids) {
      ctx.save();
      ctx.translate(asteroid.x, asteroid.y);
  
      ctx.beginPath();
      const vertexCount = asteroid.vertices.length;
      
      for (let i = 0; i <= vertexCount; i++) {
        const angle = (i / vertexCount) * Math.PI * 2;
        const vertexRadius = asteroid.radius * asteroid.vertices[i % vertexCount];
        const x = Math.cos(angle) * vertexRadius;
        const y = Math.sin(angle) * vertexRadius;
  
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
  
      ctx.closePath();
      ctx.stroke();
  
      ctx.restore();
    }
  };

  const render = () => {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    // TODO: render 함수들 호출
    renderAsteroids();
    renderBullets();
    renderShip();
  };

  // ==================== Game Loop ====================

  let raf = 0;
  const draw = (t: number) => {
    update(t);
    render();
    drawHud(canvas, ctx, score, sec, isStarted, isGameOver);

    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  };
};