# Geometry Dash Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 자동 횡스크롤 무한 러너 게임. 점프 타이밍으로 장애물(스파이크/블록/핏)을 회피하며 최대한 멀리 진행.

**Architecture:** Canvas API 기반 60FPS 게임 루프. 장애물은 절차적으로 생성되며 시간에 따라 속도와 밀도가 증가. 기존 FruitNinja 패턴(setup함수, HUD 시스템, 콜백)을 그대로 따름.

**Tech Stack:** Canvas API, TypeScript, requestAnimationFrame

---

### Task 1: 게임 등록 (6개 파일 수정)

**Files:**
- Modify: `@types/scores.ts`
- Modify: `lib/config.ts`
- Modify: `components/common/GameCard.tsx`
- Modify: `app/api/game-session/route.ts`
- Modify: `app/api/scores/route.ts`
- Modify: `lib/game-security/config.ts`

**Step 1: TGameType에 'geometrydash' 추가**

`@types/scores.ts`의 TGameType 유니온 마지막에 추가:
```typescript
  | 'survivors'
  | 'geometrydash';
```

**Step 2: MENU_LIST에 게임 메뉴 추가**

`lib/config.ts`의 ACTION 카테고리에 추가:
```typescript
{
  name: { ko: '지오메트리 대시', eng: 'Geometry Dash' },
  href: '/geometrydash',
  category: 'action',
},
```

**Step 3: GameCard에 아이콘 추가**

`components/common/GameCard.tsx`의 GAME_ICONS에 추가:
```typescript
'/geometrydash': Triangle,
```
lucide-react에서 `Triangle` import 추가.

**Step 4: game-session route에 추가**

`app/api/game-session/route.ts`의 VALID_GAME_TYPES 배열에 `'geometrydash'` 추가.

**Step 5: scores route에 추가**

`app/api/scores/route.ts`의 VALID_GAME_TYPES 배열에 `'geometrydash'` 추가.

**Step 6: 보안 설정 추가**

`lib/game-security/config.ts`의 GAME_SECURITY_CONFIG에 추가:
```typescript
geometrydash: { maxScore: 100000, minPlayTimeSeconds: 5 },
```

**Step 7: Commit**
```bash
git add @types/scores.ts lib/config.ts components/common/GameCard.tsx app/api/game-session/route.ts app/api/scores/route.ts lib/game-security/config.ts
git commit -m "feat(geometrydash): register game in 6 config files"
```

---

### Task 2: 타입 및 설정 파일 생성

**Files:**
- Create: `app/(canvas)/geometrydash/_lib/types.ts`
- Create: `app/(canvas)/geometrydash/_lib/config.ts`

**Step 1: types.ts 생성**

```typescript
export type TObstacleType = 'spike' | 'block' | 'pit';

export type TObstacle = {
  x: number;
  y: number;
  width: number;
  height: number;
  type: TObstacleType;
};

export type TPlayer = {
  x: number;
  y: number;
  size: number;
  vy: number;
  rotation: number;
  isGrounded: boolean;
};

export type TParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
};

export type TGroundSegment = {
  x: number;
  width: number;
  hasPit: boolean;
};
```

**Step 2: config.ts 생성**

```typescript
// Canvas
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 400;

// Player
export const PLAYER_SIZE = 30;
export const PLAYER_X = 120;
export const PLAYER_GROUND_Y = CANVAS_HEIGHT - 80;
export const JUMP_VELOCITY = -550;
export const GRAVITY = 1800;

// Ground
export const GROUND_Y = CANVAS_HEIGHT - 50;
export const GROUND_HEIGHT = 50;

// Scrolling
export const BASE_SPEED = 300;
export const MAX_SPEED = 700;
export const SPEED_INCREASE_RATE = 5;

// Obstacles
export const SPIKE_WIDTH = 30;
export const SPIKE_HEIGHT = 35;
export const BLOCK_WIDTH = 40;
export const BLOCK_HEIGHT = 40;
export const BLOCK_Y_OFFSET = 80;
export const PIT_WIDTH_MIN = 60;
export const PIT_WIDTH_MAX = 100;

// Spawning
export const MIN_OBSTACLE_GAP = 200;
export const MAX_OBSTACLE_GAP = 450;
export const OBSTACLE_GAP_DECREASE_RATE = 3;
export const MIN_GAP_FLOOR = 140;

// Particles
export const PARTICLE_COUNT = 15;
export const PARTICLE_LIFE = 0.6;

// Grid lines
export const GRID_SPACING = 50;

// Colors
export const COLORS = {
  bg: '#1a1a2e',
  ground: '#16213e',
  groundLine: '#0f3460',
  player: '#e94560',
  playerGlow: 'rgba(233, 69, 96, 0.3)',
  spike: '#e94560',
  block: '#533483',
  blockBorder: '#7b5ea7',
  pit: '#0a0a15',
  grid: 'rgba(15, 52, 96, 0.3)',
  particle: '#e94560',
  scoreText: '#ffffff',
  neon: '#00d2ff',
};
```

**Step 3: Commit**
```bash
git add app/(canvas)/geometrydash/_lib/types.ts app/(canvas)/geometrydash/_lib/config.ts
git commit -m "feat(geometrydash): add type definitions and config constants"
```

---

### Task 3: 게임 로직 구현 (game.ts)

**Files:**
- Create: `app/(canvas)/geometrydash/_lib/game.ts`

**Step 1: game.ts 생성**

반드시 FruitNinja 패턴을 따름:
- `setupGeometryDash(canvas, callbacks)` 형태
- `TGeometryDashCallbacks` 타입 export
- `createGameOverHud`, `gameStartHud`, `gameLoadingHud`, `gamePauseHud` import 및 사용
- `e.code` 사용 (KeyS, KeyP, KeyR, Space, ArrowUp)
- `e.repeat` 체크
- cleanup 함수 반환

```typescript
import {
  createGameOverHud,
  gameLoadingHud,
  gameStartHud,
  gamePauseHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PLAYER_SIZE,
  PLAYER_X,
  PLAYER_GROUND_Y,
  JUMP_VELOCITY,
  GRAVITY,
  GROUND_Y,
  GROUND_HEIGHT,
  BASE_SPEED,
  MAX_SPEED,
  SPEED_INCREASE_RATE,
  SPIKE_WIDTH,
  SPIKE_HEIGHT,
  BLOCK_WIDTH,
  BLOCK_HEIGHT,
  BLOCK_Y_OFFSET,
  PIT_WIDTH_MIN,
  PIT_WIDTH_MAX,
  MIN_OBSTACLE_GAP,
  MAX_OBSTACLE_GAP,
  OBSTACLE_GAP_DECREASE_RATE,
  MIN_GAP_FLOOR,
  PARTICLE_COUNT,
  PARTICLE_LIFE,
  GRID_SPACING,
  COLORS,
} from './config';
import { TObstacle, TPlayer, TParticle, TGroundSegment } from './types';

export type TGeometryDashCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export const setupGeometryDash = (
  canvas: HTMLCanvasElement,
  callbacks?: TGeometryDashCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // --- State ---
  let player: TPlayer = {
    x: PLAYER_X,
    y: PLAYER_GROUND_Y,
    size: PLAYER_SIZE,
    vy: 0,
    rotation: 0,
    isGrounded: true,
  };

  let obstacles: TObstacle[] = [];
  let groundSegments: TGroundSegment[] = [];
  let particles: TParticle[] = [];
  let score = 0;
  let speed = BASE_SPEED;
  let elapsedTime = 0;
  let nextObstacleX = CANVAS_WIDTH + 200;
  let gridOffset = 0;

  let isStarted = false;
  let isLoading = false;
  let isGameOver = false;
  let isPaused = false;

  let lastTime = 0;
  let animationId = 0;

  // --- Game Over HUD ---
  const gameOverCallbacks: TGameOverCallbacks = {
    onScoreSave: async (finalScore) => {
      if (callbacks?.onScoreSave) {
        return callbacks.onScoreSave(finalScore);
      }
      return { saved: false };
    },
    onRestart: () => {
      resetGame();
    },
  };

  const gameOverHud = createGameOverHud(
    canvas,
    ctx,
    'geometrydash',
    gameOverCallbacks,
    {
      isLoggedIn: callbacks?.isLoggedIn ?? false,
    },
  );

  // --- Helpers ---
  const rand = (min: number, max: number) =>
    min + Math.random() * (max - min);

  // --- Reset ---
  const resetGame = () => {
    player = {
      x: PLAYER_X,
      y: PLAYER_GROUND_Y,
      size: PLAYER_SIZE,
      vy: 0,
      rotation: 0,
      isGrounded: true,
    };
    obstacles = [];
    groundSegments = [];
    particles = [];
    score = 0;
    speed = BASE_SPEED;
    elapsedTime = 0;
    nextObstacleX = CANVAS_WIDTH + 200;
    gridOffset = 0;
    isStarted = false;
    isLoading = false;
    isGameOver = false;
    isPaused = false;
    lastTime = 0;
    gameOverHud.reset();
  };

  // --- Initialize ground ---
  const initGround = () => {
    groundSegments = [];
    for (let x = 0; x < CANVAS_WIDTH + 200; x += 100) {
      groundSegments.push({ x, width: 100, hasPit: false });
    }
  };

  // --- Spawn obstacles ---
  const spawnObstacle = () => {
    const difficulty = Math.min(elapsedTime / 60, 1);
    const gap = Math.max(
      MIN_OBSTACLE_GAP + Math.random() * (MAX_OBSTACLE_GAP - MIN_OBSTACLE_GAP) -
        difficulty * OBSTACLE_GAP_DECREASE_RATE * elapsedTime,
      MIN_GAP_FLOOR,
    );

    const roll = Math.random();
    if (roll < 0.45) {
      // Spike
      obstacles.push({
        x: nextObstacleX,
        y: GROUND_Y - SPIKE_HEIGHT,
        width: SPIKE_WIDTH,
        height: SPIKE_HEIGHT,
        type: 'spike',
      });
    } else if (roll < 0.75) {
      // Block
      obstacles.push({
        x: nextObstacleX,
        y: GROUND_Y - BLOCK_HEIGHT - BLOCK_Y_OFFSET,
        width: BLOCK_WIDTH,
        height: BLOCK_HEIGHT,
        type: 'block',
      });
    } else {
      // Pit
      const pitWidth = rand(PIT_WIDTH_MIN, PIT_WIDTH_MAX);
      obstacles.push({
        x: nextObstacleX,
        y: GROUND_Y,
        width: pitWidth,
        height: GROUND_HEIGHT,
        type: 'pit',
      });
    }

    nextObstacleX += gap;
  };

  // --- Collision detection ---
  const checkCollision = (): boolean => {
    const px = player.x;
    const py = player.y;
    const ps = player.size;
    const margin = 4;

    for (const obs of obstacles) {
      if (obs.type === 'spike') {
        // Triangle collision (simplified as rectangle with margin)
        const spikeLeft = obs.x + margin;
        const spikeRight = obs.x + obs.width - margin;
        const spikeTop = obs.y + margin;
        const spikeBottom = obs.y + obs.height;

        if (
          px + ps > spikeLeft &&
          px < spikeRight &&
          py + ps > spikeTop &&
          py < spikeBottom
        ) {
          return true;
        }
      } else if (obs.type === 'block') {
        if (
          px + ps > obs.x + margin &&
          px < obs.x + obs.width - margin &&
          py + ps > obs.y + margin &&
          py < obs.y + obs.height - margin
        ) {
          return true;
        }
      } else if (obs.type === 'pit') {
        // Fall into pit
        if (
          px + ps > obs.x + 5 &&
          px < obs.x + obs.width - 5 &&
          py + ps >= GROUND_Y &&
          player.isGrounded
        ) {
          return true;
        }
      }
    }
    return false;
  };

  // --- Spawn death particles ---
  const spawnParticles = () => {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = rand(100, 350);
      particles.push({
        x: player.x + player.size / 2,
        y: player.y + player.size / 2,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: PARTICLE_LIFE,
        maxLife: PARTICLE_LIFE,
        size: rand(3, 8),
        color: COLORS.particle,
      });
    }
  };

  // --- Check if player is over a pit ---
  const isOverPit = (): boolean => {
    for (const obs of obstacles) {
      if (obs.type === 'pit') {
        if (
          player.x + player.size > obs.x + 5 &&
          player.x < obs.x + obs.width - 5
        ) {
          return true;
        }
      }
    }
    return false;
  };

  // --- Update ---
  const update = (dt: number) => {
    elapsedTime += dt;

    // Increase speed
    speed = Math.min(BASE_SPEED + elapsedTime * SPEED_INCREASE_RATE, MAX_SPEED);

    // Score
    score += speed * dt * 0.1;

    // Player physics
    if (!player.isGrounded) {
      player.vy += GRAVITY * dt;
      player.y += player.vy * dt;
      player.rotation += dt * 8;

      // Land on ground (only if not over a pit)
      if (player.y >= PLAYER_GROUND_Y && !isOverPit()) {
        player.y = PLAYER_GROUND_Y;
        player.vy = 0;
        player.isGrounded = true;
        // Snap rotation to nearest 90 degrees
        player.rotation = Math.round(player.rotation / (Math.PI / 2)) * (Math.PI / 2);
      }

      // Fall off screen (into pit)
      if (player.y > CANVAS_HEIGHT + 50) {
        triggerGameOver();
        return;
      }
    } else if (isOverPit()) {
      // Just walked over a pit edge, start falling
      player.isGrounded = false;
    }

    // Spawn obstacles
    while (nextObstacleX < CANVAS_WIDTH + 400) {
      spawnObstacle();
    }

    // Move obstacles
    for (const obs of obstacles) {
      obs.x -= speed * dt;
    }
    nextObstacleX -= speed * dt;

    // Remove off-screen obstacles
    obstacles = obstacles.filter((obs) => obs.x + obs.width > -50);

    // Grid scroll
    gridOffset = (gridOffset + speed * dt) % GRID_SPACING;

    // Collision
    if (checkCollision()) {
      triggerGameOver();
      return;
    }

    // Update particles
    particles = particles.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 400 * dt;
      p.life -= dt;
      return p.life > 0;
    });
  };

  // --- Trigger game over ---
  const triggerGameOver = () => {
    isGameOver = true;
    spawnParticles();
  };

  // --- Render ---
  const render = () => {
    // Background
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grid lines (scrolling)
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (let x = -gridOffset; x < CANVAS_WIDTH; x += GRID_SPACING) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, GROUND_Y);
      ctx.stroke();
    }
    for (let y = 0; y < GROUND_Y; y += GRID_SPACING) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Ground
    ctx.fillStyle = COLORS.ground;
    // Draw ground with pit gaps
    const pitObstacles = obstacles.filter((o) => o.type === 'pit');
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, GROUND_HEIGHT);

    // Cut out pits
    ctx.fillStyle = COLORS.pit;
    for (const pit of pitObstacles) {
      ctx.fillRect(pit.x, pit.y, pit.width, pit.height);
    }

    // Ground top line
    ctx.strokeStyle = COLORS.groundLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    // Draw ground line with gaps for pits
    let lineX = 0;
    for (const pit of pitObstacles.sort((a, b) => a.x - b.x)) {
      if (pit.x > lineX) {
        ctx.moveTo(lineX, GROUND_Y);
        ctx.lineTo(pit.x, GROUND_Y);
      }
      lineX = pit.x + pit.width;
    }
    if (lineX < CANVAS_WIDTH) {
      ctx.moveTo(lineX, GROUND_Y);
      ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
    }
    ctx.stroke();

    // Obstacles (spikes and blocks)
    for (const obs of obstacles) {
      if (obs.type === 'spike') {
        ctx.fillStyle = COLORS.spike;
        ctx.beginPath();
        ctx.moveTo(obs.x + obs.width / 2, obs.y);
        ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
        ctx.lineTo(obs.x, obs.y + obs.height);
        ctx.closePath();
        ctx.fill();
      } else if (obs.type === 'block') {
        ctx.fillStyle = COLORS.block;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeStyle = COLORS.blockBorder;
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
      }
    }

    // Player glow
    ctx.shadowColor = COLORS.playerGlow;
    ctx.shadowBlur = 15;

    // Player (rotating square)
    ctx.save();
    ctx.translate(
      player.x + player.size / 2,
      player.y + player.size / 2,
    );
    ctx.rotate(player.rotation);
    ctx.fillStyle = COLORS.player;
    ctx.fillRect(
      -player.size / 2,
      -player.size / 2,
      player.size,
      player.size,
    );
    ctx.restore();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Particles
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // Score
    ctx.fillStyle = COLORS.scoreText;
    ctx.font = 'bold 24px "Space Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.floor(score)}`, CANVAS_WIDTH - 20, 35);
    ctx.textAlign = 'left';
  };

  // --- Game Loop ---
  const gameLoop = (timestamp: number) => {
    if (lastTime === 0) lastTime = timestamp;
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    if (!isStarted) {
      gameStartHud(canvas, ctx);
      animationId = requestAnimationFrame(gameLoop);
      return;
    }

    if (isLoading) {
      gameLoadingHud(canvas, ctx);
      animationId = requestAnimationFrame(gameLoop);
      return;
    }

    if (isPaused) {
      render();
      gamePauseHud(canvas, ctx);
      animationId = requestAnimationFrame(gameLoop);
      return;
    }

    if (isGameOver) {
      render();
      gameOverHud.render(Math.floor(score));
      animationId = requestAnimationFrame(gameLoop);
      return;
    }

    update(dt);
    render();
    animationId = requestAnimationFrame(gameLoop);
  };

  // --- Keyboard ---
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    if (isGameOver) {
      gameOverHud.onKeyDown(e, Math.floor(score));
      return;
    }

    switch (e.code) {
      case 'KeyS':
        if (!isStarted) {
          isLoading = true;
          isStarted = true;
          initGround();
          if (callbacks?.onGameStart) {
            callbacks.onGameStart().then(() => {
              isLoading = false;
            });
          } else {
            isLoading = false;
          }
        } else if (isPaused) {
          isPaused = false;
        }
        break;
      case 'KeyP':
        if (isStarted && !isGameOver && !isLoading) {
          isPaused = !isPaused;
        }
        break;
      case 'KeyR':
        if (isStarted) {
          resetGame();
        }
        break;
      case 'Space':
      case 'ArrowUp':
        e.preventDefault();
        if (isStarted && !isPaused && !isGameOver && player.isGrounded) {
          player.vy = JUMP_VELOCITY;
          player.isGrounded = false;
        }
        break;
    }
  };

  // --- Init ---
  window.addEventListener('keydown', handleKeyDown);
  animationId = requestAnimationFrame(gameLoop);

  // --- Cleanup ---
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    cancelAnimationFrame(animationId);
  };
};
```

**Step 2: Commit**
```bash
git add app/(canvas)/geometrydash/_lib/game.ts
git commit -m "feat(geometrydash): implement game logic with obstacles, physics, and HUD"
```

---

### Task 4: 컴포넌트 및 페이지 생성

**Files:**
- Create: `app/(canvas)/geometrydash/_components/GeometryDash.tsx`
- Create: `app/(canvas)/geometrydash/page.tsx`
- Create: `app/(canvas)/geometrydash/layout.tsx`

**Step 1: GeometryDash.tsx 생성**

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  setupGeometryDash,
  TGeometryDashCallbacks,
} from '../_lib/game';
import { useCreateScore, useGameSession } from '@/service/scores';

function GeometryDash() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore('geometrydash');
  const { mutateAsync: createSession } = useGameSession('geometrydash');
  const isLoggedIn = !!session;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TGeometryDashCallbacks = {
      onGameStart: async () => {
        try {
          const gameSession = await createSession();
          sessionTokenRef.current = gameSession.token;
        } catch (error) {
          console.error('Failed to create game session:', error);
        }
      },
      onScoreSave: async (score) => {
        if (!sessionTokenRef.current) return { saved: false };
        const result = await saveScore({
          gameType: 'geometrydash',
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
      isLoggedIn,
    };

    return setupGeometryDash(canvas, callbacks);
  }, [saveScore, createSession, isLoggedIn]);

  return (
    <div className="w-full h-full flex justify-center">
      <canvas
        ref={canvasRef}
        className="w-[800px] h-[400px] border border-white/20 rounded-2xl shadow-lg"
      />
    </div>
  );
}

export default GeometryDash;
```

**Step 2: page.tsx 생성**

```typescript
'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import GeometryDash from './_components/GeometryDash';

const controls = [
  { key: 'S', action: '시작 / 재개' },
  { key: 'P', action: '일시 정지' },
  { key: 'R', action: '재시작' },
  { key: 'Space / ↑', action: '점프' },
];

function GeometryDashPage() {
  const { data: scores = [], isLoading } = useGetScores('geometrydash');

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-72">
        <ControlInfoTable controls={controls} />
      </aside>
      <div className="flex-1 h-full max-w-[800px]">
        <GeometryDash />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default GeometryDashPage;
```

**Step 3: layout.tsx 생성**

```typescript
import KameHeader from '@/components/common/KameHeader';

function GeometryDashLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-6 py-4 flex flex-col gap-10 items-center">
      <KameHeader title="Geometry Dash" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default GeometryDashLayout;
```

**Step 4: Commit**
```bash
git add app/(canvas)/geometrydash/
git commit -m "feat(geometrydash): add component, page, and layout"
```

---

### Task 5: 빌드 검증 및 플레이 테스트

**Step 1: TypeScript 빌드 확인**
```bash
yarn build
```
Expected: 빌드 성공, 에러 없음

**Step 2: 수동 플레이 테스트 (dev 서버)**
```bash
yarn dev
```
- `/geometrydash` 접속
- S 키로 시작
- Space/ArrowUp으로 점프
- 장애물 충돌 시 Game Over HUD 표시
- 점수 저장 확인
- P 키로 일시정지
- R 키로 재시작

**Step 3: 최종 Commit (필요 시)**
```bash
git add .
git commit -m "feat(geometrydash): geometry dash infinite runner game complete"
```
