# Suika Game (수박 게임) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Phaser.js + Matter.js 기반 수박 게임을 구현하여 `(phaser)` 라우트 그룹에 추가한다.

**Architecture:** Phaser 3 Matter.js 물리 엔진으로 원형 과일의 중력/충돌/반발을 처리하고, 4개의 Scene(Boot/Game/UI/GameOver)으로 게임 흐름을 관리한다. 단색 원 + 텍스트로 과일을 그리되, FRUIT_CONFIG의 texture 필드로 에셋 확장이 가능한 구조로 설계한다.

**Tech Stack:** Next.js, Phaser 3.90, Matter.js (Phaser 내장), TypeScript, Tailwind CSS

**Design Doc:** `docs/plans/2026-03-01-suikagame-design.md`

---

### Task 1: 게임 등록 (6개 파일 수정)

**Files:**
- Modify: `@types/scores.ts` — TGameType에 `'suikagame'` 추가
- Modify: `lib/config.ts` — MENU_LIST puzzle 카테고리에 메뉴 추가
- Modify: `components/common/GameCard.tsx` — 게임 아이콘 추가
- Modify: `app/api/game-session/route.ts` — VALID_GAME_TYPES에 추가
- Modify: `app/api/scores/route.ts` — VALID_GAME_TYPES에 추가
- Modify: `lib/game-security/config.ts` — 보안 설정 추가

**Step 1: @types/scores.ts 수정**

`solitaire` 다음에 추가:
```typescript
  | 'suikagame';
```

**Step 2: lib/config.ts 수정**

puzzle 카테고리에서 solitaire 메뉴 항목 다음에 추가:
```typescript
  {
    name: {
      kor: '수박 게임',
      eng: 'Watermelon Game',
    },
    href: '/suikagame',
    category: 'Puzzle',
    platform: 'both',
  },
```

**Step 3: components/common/GameCard.tsx 수정**

GAME_ICONS에 추가 (lucide-react에서 Cherry 아이콘 import):
```typescript
  '/suikagame': Cherry,
```

**Step 4: app/api/game-session/route.ts 수정**

VALID_GAME_TYPES 배열에 추가:
```typescript
  'suikagame',
```

**Step 5: app/api/scores/route.ts 수정**

VALID_GAME_TYPES 배열에 추가:
```typescript
  'suikagame',
```

**Step 6: lib/game-security/config.ts 수정**

GAME_SECURITY_CONFIG에 추가:
```typescript
  suikagame: { maxScore: 50000, minPlayTimeSeconds: 10 },
```

**Step 7: Commit**

```bash
git add @types/scores.ts lib/config.ts components/common/GameCard.tsx app/api/game-session/route.ts app/api/scores/route.ts lib/game-security/config.ts
git commit -m "feat(suikagame): register game in 6 config files"
```

---

### Task 2: config.ts + types.ts 작성

**Files:**
- Create: `app/(phaser)/suikagame/_lib/config.ts`
- Create: `app/(phaser)/suikagame/_lib/types.ts`

**Step 1: config.ts 작성**

```typescript
import { TGameMeta } from '@/@types/game-meta';

export const GAME_META: TGameMeta = {
  id: 'suikagame',
  title: '수박 게임',
  engine: 'phaser',
  platform: 'both',
  touchControls: 'tap',
  orientation: 'portrait',
  category: 'puzzle',
  difficulty: 'progressive',
};

// 게임 캔버스 크기 (세로 비율)
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 720;

// 바구니(컨테이너) 벽
export const WALL_THICKNESS = 20;
export const CONTAINER_TOP = 180;     // 데드라인 위치 (위에서부터)
export const CONTAINER_LEFT = 40;
export const CONTAINER_RIGHT = GAME_WIDTH - 40;
export const CONTAINER_BOTTOM = GAME_HEIGHT - 20;

// 드롭 영역
export const DROP_Y = 80;             // 집게 Y 위치
export const DROP_MIN_X = CONTAINER_LEFT + 30;
export const DROP_MAX_X = CONTAINER_RIGHT - 30;

// 게임오버 유예 시간 (ms)
export const DEADLINE_GRACE_MS = 2000;

// 드롭 쿨다운 (ms) — 연속 드롭 방지
export const DROP_COOLDOWN_MS = 500;

// 과일 설정
// texture 필드: null이면 단색 원 + 텍스트, 문자열이면 해당 텍스처 키 사용
// 에셋 추가 방법:
// 1. public/images/suikagame/ 폴더에 과일 이미지 배치 (예: cherry.png)
// 2. BootScene.preload()에서 this.load.image('fruit_cherry', '/images/suikagame/cherry.png') 추가
// 3. 아래 FRUIT_CONFIG에서 해당 과일의 texture를 'fruit_cherry'로 변경
export const FRUIT_CONFIG = [
  { name: '체리',     emoji: '🍒', radius: 15, color: 0xe74c3c, score: 1,  texture: null },
  { name: '딸기',     emoji: '🍓', radius: 20, color: 0xff6b6b, score: 3,  texture: null },
  { name: '포도',     emoji: '🍇', radius: 28, color: 0x9b59b6, score: 6,  texture: null },
  { name: '한라봉',   emoji: '🍊', radius: 35, color: 0xf39c12, score: 10, texture: null },
  { name: '감',       emoji: '🍑', radius: 42, color: 0xe67e22, score: 15, texture: null },
  { name: '사과',     emoji: '🍎', radius: 50, color: 0xc0392b, score: 21, texture: null },
  { name: '배',       emoji: '🍐', radius: 58, color: 0xf1c40f, score: 28, texture: null },
  { name: '복숭아',   emoji: '🍑', radius: 66, color: 0xffb6c1, score: 36, texture: null },
  { name: '파인애플', emoji: '🍍', radius: 75, color: 0xf39c12, score: 45, texture: null },
  { name: '멜론',     emoji: '🍈', radius: 85, color: 0x2ecc71, score: 55, texture: null },
  { name: '수박',     emoji: '🍉', radius: 95, color: 0x27ae60, score: 66, texture: null },
] as const;

// 드롭 가능 과일 범위 (0 ~ MAX_DROP_LEVEL)
export const MAX_DROP_LEVEL = 4;

// Matter.js 물리 설정
export const PHYSICS_CONFIG = {
  gravity: { x: 0, y: 1.5 },
  restitution: 0.2,       // 반발 계수
  friction: 0.3,          // 마찰
  frictionStatic: 0.5,    // 정적 마찰
  density: 0.001,         // 밀도
};
```

**Step 2: types.ts 작성**

```typescript
import { TSaveResult } from '@/lib/game';

export type TSuikaCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn: boolean;
};

export type TFruitBody = {
  level: number;
  isFruit: true;
};
```

**Step 3: Commit**

```bash
git add app/(phaser)/suikagame/_lib/
git commit -m "feat(suikagame): add config and type definitions"
```

---

### Task 3: BootScene 구현

**Files:**
- Create: `app/(phaser)/suikagame/_lib/scenes/BootScene.ts`

**Step 1: BootScene 작성**

BootScene은 과일 텍스처를 코드로 생성하고, 로딩 바를 표시한다.

```typescript
import Phaser from 'phaser';
import { FRUIT_CONFIG, GAME_WIDTH, GAME_HEIGHT } from '../config';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // 로딩 바
    const { width, height } = this.cameras.main;
    const barBg = this.add.rectangle(width / 2, height / 2, width * 0.6, 20, 0x333333);
    const bar = this.add.rectangle(width / 2 - (width * 0.6) / 2, height / 2, 0, 16, 0xffffff);
    bar.setOrigin(0, 0.5);

    this.load.on('progress', (value: number) => {
      bar.width = width * 0.6 * value;
    });

    // 에셋 이미지 로드 (texture가 설정된 과일만)
    // 에셋 추가 시 아래 주석을 해제하고 경로를 설정:
    // FRUIT_CONFIG.forEach((fruit, i) => {
    //   if (fruit.texture) {
    //     this.load.image(fruit.texture, `/images/suikagame/${fruit.texture}.png`);
    //   }
    // });
  }

  create() {
    this.createFruitTextures();
    this.scene.start('GameScene');
    this.scene.launch('UIScene');
  }

  private createFruitTextures() {
    FRUIT_CONFIG.forEach((fruit, index) => {
      // 에셋 텍스처가 이미 로드되어 있으면 코드 생성 건너뜀
      if (fruit.texture && this.textures.exists(fruit.texture)) return;

      const key = `fruit_${index}`;
      const size = fruit.radius * 2;
      const graphics = this.make.graphics({ x: 0, y: 0 });

      // 원형 배경
      graphics.fillStyle(fruit.color, 1);
      graphics.fillCircle(fruit.radius, fruit.radius, fruit.radius);

      // 테두리
      graphics.lineStyle(2, 0xffffff, 0.3);
      graphics.strokeCircle(fruit.radius, fruit.radius, fruit.radius - 1);

      graphics.generateTexture(key, size, size);
      graphics.destroy();
    });
  }
}
```

**Step 2: Commit**

```bash
git add app/(phaser)/suikagame/_lib/scenes/BootScene.ts
git commit -m "feat(suikagame): add BootScene with fruit texture generation"
```

---

### Task 4: GameScene 구현 (핵심 — Matter.js 물리 + 과일 합성)

**Files:**
- Create: `app/(phaser)/suikagame/_lib/scenes/GameScene.ts`

**Step 1: GameScene 작성**

GameScene은 게임의 핵심 로직을 담당한다:
- Matter.js 물리 월드 구성 (바구니 벽, 바닥)
- 집게(드롭퍼) 좌우 이동 + 과일 드롭
- 과일 충돌 시 합성 로직 (동일 레벨 과일 → 다음 레벨)
- 데드라인 초과 감지 → 게임 오버

```typescript
import Phaser from 'phaser';
import {
  FRUIT_CONFIG,
  GAME_WIDTH,
  GAME_HEIGHT,
  WALL_THICKNESS,
  CONTAINER_TOP,
  CONTAINER_LEFT,
  CONTAINER_RIGHT,
  CONTAINER_BOTTOM,
  DROP_Y,
  DROP_MIN_X,
  DROP_MAX_X,
  DEADLINE_GRACE_MS,
  DROP_COOLDOWN_MS,
  MAX_DROP_LEVEL,
  PHYSICS_CONFIG,
} from '../config';
import { TFruitBody } from '../types';

export class GameScene extends Phaser.Scene {
  private dropX: number = GAME_WIDTH / 2;
  private currentLevel: number = 0;
  private nextLevel: number = 0;
  private score: number = 0;
  private isGameOver: boolean = false;
  private canDrop: boolean = true;
  private dropCooldownTimer: Phaser.Time.TimerEvent | null = null;
  private deadlineTimer: number = 0;
  private guideLine!: Phaser.GameObjects.Line;
  private dropPreview!: Phaser.GameObjects.Arc;
  private fruits: MatterJS.BodyType[] = [];
  private merging: Set<number> = new Set();

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.resetState();
    this.createWalls();
    this.setupInput();
    this.setupCollision();
    this.prepareNextDrop();
    this.drawGuide();

    // 게임 시작 콜백
    const callbacks = this.registry.get('callbacks');
    if (callbacks?.onGameStart) {
      callbacks.onGameStart();
    }
  }

  private resetState() {
    this.dropX = GAME_WIDTH / 2;
    this.score = 0;
    this.isGameOver = false;
    this.canDrop = true;
    this.deadlineTimer = 0;
    this.fruits = [];
    this.merging = new Set();
    this.currentLevel = Math.floor(Math.random() * (MAX_DROP_LEVEL + 1));
    this.nextLevel = Math.floor(Math.random() * (MAX_DROP_LEVEL + 1));
  }

  private createWalls() {
    const wallOptions: Phaser.Types.Physics.Matter.MatterBodyConfig = {
      isStatic: true,
      friction: 0.3,
      restitution: 0.1,
    };

    // 바닥
    this.matter.add.rectangle(
      GAME_WIDTH / 2,
      CONTAINER_BOTTOM + WALL_THICKNESS / 2,
      CONTAINER_RIGHT - CONTAINER_LEFT + WALL_THICKNESS * 2,
      WALL_THICKNESS,
      wallOptions,
    );

    // 왼쪽 벽
    this.matter.add.rectangle(
      CONTAINER_LEFT - WALL_THICKNESS / 2,
      (CONTAINER_TOP + CONTAINER_BOTTOM) / 2,
      WALL_THICKNESS,
      CONTAINER_BOTTOM - CONTAINER_TOP + WALL_THICKNESS,
      wallOptions,
    );

    // 오른쪽 벽
    this.matter.add.rectangle(
      CONTAINER_RIGHT + WALL_THICKNESS / 2,
      (CONTAINER_TOP + CONTAINER_BOTTOM) / 2,
      WALL_THICKNESS,
      CONTAINER_BOTTOM - CONTAINER_TOP + WALL_THICKNESS,
      wallOptions,
    );

    // 벽 시각화
    const wallGraphics = this.add.graphics();
    wallGraphics.fillStyle(0x4a4a4a, 1);
    // 바닥
    wallGraphics.fillRect(
      CONTAINER_LEFT - WALL_THICKNESS,
      CONTAINER_BOTTOM,
      CONTAINER_RIGHT - CONTAINER_LEFT + WALL_THICKNESS * 2,
      WALL_THICKNESS,
    );
    // 왼쪽
    wallGraphics.fillRect(
      CONTAINER_LEFT - WALL_THICKNESS,
      CONTAINER_TOP,
      WALL_THICKNESS,
      CONTAINER_BOTTOM - CONTAINER_TOP + WALL_THICKNESS,
    );
    // 오른쪽
    wallGraphics.fillRect(
      CONTAINER_RIGHT,
      CONTAINER_TOP,
      WALL_THICKNESS,
      CONTAINER_BOTTOM - CONTAINER_TOP + WALL_THICKNESS,
    );

    // 데드라인 점선
    const deadlineGraphics = this.add.graphics();
    deadlineGraphics.lineStyle(2, 0xff0000, 0.5);
    const dashLength = 10;
    for (let x = CONTAINER_LEFT; x < CONTAINER_RIGHT; x += dashLength * 2) {
      deadlineGraphics.lineBetween(x, CONTAINER_TOP, Math.min(x + dashLength, CONTAINER_RIGHT), CONTAINER_TOP);
    }
  }

  private drawGuide() {
    // 드롭 위치 가이드 라인 (세로 점선)
    this.guideLine = this.add.line(0, 0, this.dropX, DROP_Y + 20, this.dropX, CONTAINER_TOP, 0xffffff, 0.3);
    this.guideLine.setOrigin(0, 0);

    // 드롭 미리보기 원
    const fruit = FRUIT_CONFIG[this.currentLevel];
    this.dropPreview = this.add.circle(this.dropX, DROP_Y, fruit.radius, fruit.color, 0.7);
  }

  private updateGuide() {
    if (this.guideLine) {
      this.guideLine.setTo(this.dropX, DROP_Y + 20, this.dropX, CONTAINER_TOP);
    }
    if (this.dropPreview) {
      const fruit = FRUIT_CONFIG[this.currentLevel];
      this.dropPreview.setPosition(this.dropX, DROP_Y);
      this.dropPreview.setRadius(fruit.radius);
      this.dropPreview.setFillStyle(fruit.color, 0.7);
    }
  }

  private setupInput() {
    // 마우스/터치 이동 — 집게 위치
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver) return;
      this.dropX = Phaser.Math.Clamp(pointer.x, DROP_MIN_X, DROP_MAX_X);
      this.updateGuide();
    });

    // 클릭/탭 — 드롭
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver) return;
      if (!this.canDrop) return;
      this.dropX = Phaser.Math.Clamp(pointer.x, DROP_MIN_X, DROP_MAX_X);
      this.dropFruit();
    });

    // 키보드 — 좌우 이동 + Space 드롭
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown', (e: KeyboardEvent) => {
        if (this.isGameOver) return;
        if (e.code === 'ArrowLeft') {
          this.dropX = Phaser.Math.Clamp(this.dropX - 20, DROP_MIN_X, DROP_MAX_X);
          this.updateGuide();
        }
        if (e.code === 'ArrowRight') {
          this.dropX = Phaser.Math.Clamp(this.dropX + 20, DROP_MIN_X, DROP_MAX_X);
          this.updateGuide();
        }
        if (e.code === 'Space' && this.canDrop) {
          this.dropFruit();
        }
      });
    }
  }

  private setupCollision() {
    this.matter.world.on('collisionstart', (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
      for (const pair of event.pairs) {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        const dataA = bodyA.plugin as TFruitBody | undefined;
        const dataB = bodyB.plugin as TFruitBody | undefined;

        if (!dataA?.isFruit || !dataB?.isFruit) continue;
        if (dataA.level !== dataB.level) continue;
        if (this.merging.has(bodyA.id) || this.merging.has(bodyB.id)) continue;

        this.merging.add(bodyA.id);
        this.merging.add(bodyB.id);

        this.mergeFruits(bodyA, bodyB, dataA.level);
      }
    });
  }

  private dropFruit() {
    this.canDrop = false;
    this.spawnFruit(this.dropX, DROP_Y, this.currentLevel);
    this.currentLevel = this.nextLevel;
    this.nextLevel = Math.floor(Math.random() * (MAX_DROP_LEVEL + 1));

    // UI 업데이트
    this.events.emit('updateNext', this.nextLevel);

    // 드롭 쿨다운
    this.dropCooldownTimer = this.time.delayedCall(DROP_COOLDOWN_MS, () => {
      this.canDrop = true;
      this.updateGuide();
    });
  }

  private spawnFruit(x: number, y: number, level: number): MatterJS.BodyType {
    const fruit = FRUIT_CONFIG[level];
    const textureKey = fruit.texture || `fruit_${level}`;

    const body = this.matter.add.image(x, y, textureKey, undefined, {
      shape: { type: 'circle', radius: fruit.radius },
      restitution: PHYSICS_CONFIG.restitution,
      friction: PHYSICS_CONFIG.friction,
      frictionStatic: PHYSICS_CONFIG.frictionStatic,
      density: PHYSICS_CONFIG.density,
      plugin: { isFruit: true, level } as TFruitBody,
    } as Phaser.Types.Physics.Matter.MatterBodyConfig);

    body.setDisplaySize(fruit.radius * 2, fruit.radius * 2);
    body.setCircle(fruit.radius);

    // 이모지 텍스트 오버레이
    const text = this.add.text(x, y, fruit.emoji, {
      fontSize: `${Math.max(fruit.radius * 0.8, 12)}px`,
    }).setOrigin(0.5);

    // 과일 이미지와 텍스트를 연결
    (body.body as MatterJS.BodyType & { gameText?: Phaser.GameObjects.Text }).gameText = text;
    (body.body as MatterJS.BodyType & { gameImage?: Phaser.Physics.Matter.Image }).gameImage = body;

    this.fruits.push(body.body as MatterJS.BodyType);

    return body.body as MatterJS.BodyType;
  }

  private mergeFruits(bodyA: MatterJS.BodyType, bodyB: MatterJS.BodyType, level: number) {
    const midX = (bodyA.position.x + bodyB.position.x) / 2;
    const midY = (bodyA.position.y + bodyB.position.y) / 2;

    // 점수 추가
    const nextLevel = level + 1;
    if (nextLevel < FRUIT_CONFIG.length) {
      this.score += FRUIT_CONFIG[nextLevel].score;
    } else {
      // 수박 + 수박 = 소멸 + 66점
      this.score += FRUIT_CONFIG[level].score;
    }

    this.events.emit('updateScore', this.score);

    // 기존 과일 제거
    this.removeFruitBody(bodyA);
    this.removeFruitBody(bodyB);

    // 수박끼리 합쳐지면 소멸만 (다음 단계 없음)
    if (nextLevel < FRUIT_CONFIG.length) {
      // 다음 단계 과일 생성
      this.time.delayedCall(50, () => {
        this.spawnFruit(midX, midY, nextLevel);
        this.merging.delete(bodyA.id);
        this.merging.delete(bodyB.id);
      });
    } else {
      this.merging.delete(bodyA.id);
      this.merging.delete(bodyB.id);
    }
  }

  private removeFruitBody(body: MatterJS.BodyType) {
    const extended = body as MatterJS.BodyType & {
      gameText?: Phaser.GameObjects.Text;
      gameImage?: Phaser.Physics.Matter.Image;
    };
    if (extended.gameText) extended.gameText.destroy();
    if (extended.gameImage) extended.gameImage.destroy();
    this.fruits = this.fruits.filter((f) => f.id !== body.id);
    this.matter.world.remove(body);
  }

  update(_time: number, delta: number) {
    if (this.isGameOver) return;

    // 과일 텍스트 위치 업데이트
    for (const body of this.fruits) {
      const extended = body as MatterJS.BodyType & {
        gameText?: Phaser.GameObjects.Text;
      };
      if (extended.gameText) {
        extended.gameText.setPosition(body.position.x, body.position.y);
      }
    }

    // 데드라인 체크
    let anyAbove = false;
    for (const body of this.fruits) {
      if (body.position.y - ((body.plugin as TFruitBody)?.level !== undefined
        ? FRUIT_CONFIG[(body.plugin as TFruitBody).level].radius : 0) < CONTAINER_TOP) {
        // 방금 드롭한 과일은 제외 (낙하 중)
        if (body.speed < 0.5) {
          anyAbove = true;
          break;
        }
      }
    }

    if (anyAbove) {
      this.deadlineTimer += delta;
      if (this.deadlineTimer >= DEADLINE_GRACE_MS) {
        this.gameOver();
      }
    } else {
      this.deadlineTimer = 0;
    }
  }

  private gameOver() {
    this.isGameOver = true;
    if (this.dropPreview) this.dropPreview.setVisible(false);
    if (this.guideLine) this.guideLine.setVisible(false);

    this.scene.stop('UIScene');
    this.scene.start('GameOverScene', { score: this.score });
  }

  private prepareNextDrop() {
    this.events.emit('updateNext', this.nextLevel);
  }
}
```

**Step 2: Commit**

```bash
git add app/(phaser)/suikagame/_lib/scenes/GameScene.ts
git commit -m "feat(suikagame): add GameScene with Matter.js physics and fruit merging"
```

---

### Task 5: UIScene 구현

**Files:**
- Create: `app/(phaser)/suikagame/_lib/scenes/UIScene.ts`

**Step 1: UIScene 작성**

점수, 다음 과일 미리보기를 표시하는 HUD 오버레이 Scene.

```typescript
import Phaser from 'phaser';
import { FRUIT_CONFIG, GAME_WIDTH } from '../config';

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private nextPreview!: Phaser.GameObjects.Arc;
  private nextEmoji!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    // 점수
    this.scoreText = this.add.text(GAME_WIDTH / 2, 20, 'Score: 0', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0);

    // 다음 과일 라벨
    this.add.text(GAME_WIDTH - 70, 15, 'NEXT', {
      fontSize: '14px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0);

    // 다음 과일 미리보기
    this.nextPreview = this.add.circle(GAME_WIDTH - 70, 55, 20, 0xffffff, 0.5);
    this.nextEmoji = this.add.text(GAME_WIDTH - 70, 55, '', {
      fontSize: '16px',
    }).setOrigin(0.5);

    // GameScene 이벤트 리스닝
    const gameScene = this.scene.get('GameScene');
    gameScene.events.on('updateScore', (score: number) => {
      this.scoreText.setText(`Score: ${score}`);
    });
    gameScene.events.on('updateNext', (level: number) => {
      const fruit = FRUIT_CONFIG[level];
      this.nextPreview.setFillStyle(fruit.color, 0.5);
      this.nextPreview.setRadius(Math.min(fruit.radius, 25));
      this.nextEmoji.setText(fruit.emoji);
    });
  }
}
```

**Step 2: Commit**

```bash
git add app/(phaser)/suikagame/_lib/scenes/UIScene.ts
git commit -m "feat(suikagame): add UIScene with score and next fruit preview"
```

---

### Task 6: GameOverScene 구현

**Files:**
- Create: `app/(phaser)/suikagame/_lib/scenes/GameOverScene.ts`

**Step 1: GameOverScene 작성**

게임 오버 화면. 점수 표시 + 저장(SAVE) / 건너뛰기(SKIP) 선택 + 재시작.
기존 Canvas 2D HUD의 시각적 스타일(색상, 폰트, 레이아웃)을 Phaser Text로 재현한다.

```typescript
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GAME_META } from '../config';
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

    // 반투명 배경
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7);

    // GAME OVER 텍스트
    this.add.text(cx, GAME_HEIGHT / 2 - 100, 'GAME OVER', {
      fontSize: '40px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 점수
    this.add.text(cx, GAME_HEIGHT / 2 - 40, `Score: ${this.finalScore}`, {
      fontSize: '28px',
      color: '#f1c40f',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // SAVE / SKIP 버튼 (로그인 상태일 때만 SAVE 표시)
    if (callbacks?.isLoggedIn) {
      const saveBtn = this.add.text(cx, GAME_HEIGHT / 2 + 30, '[ SAVE ]', {
        fontSize: '22px',
        color: '#2ecc71',
        fontFamily: 'monospace',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      saveBtn.on('pointerdown', async () => {
        if (this.isSaving || this.hasSaved) return;
        this.isSaving = true;
        saveBtn.setText('Saving...');
        try {
          await callbacks.onScoreSave(this.finalScore);
          this.hasSaved = true;
          saveBtn.setText('Saved!');
          saveBtn.setColor('#aaaaaa');
        } catch {
          saveBtn.setText('Failed');
          this.isSaving = false;
        }
      });

      const skipBtn = this.add.text(cx, GAME_HEIGHT / 2 + 70, '[ SKIP ]', {
        fontSize: '18px',
        color: '#aaaaaa',
        fontFamily: 'monospace',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      skipBtn.on('pointerdown', () => {
        this.restartGame();
      });
    }

    // 재시작 안내
    this.add.text(cx, GAME_HEIGHT / 2 + 130, 'Press R to restart', {
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // 탭으로 재시작 (모바일)
    this.add.text(cx, GAME_HEIGHT / 2 + 160, 'or tap here', {
      fontSize: '14px',
      color: '#666666',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      this.restartGame();
    });

    // R 키로 재시작
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
    this.scene.start('GameScene');
    this.scene.launch('UIScene');
  }
}
```

**Step 2: Commit**

```bash
git add app/(phaser)/suikagame/_lib/scenes/GameOverScene.ts
git commit -m "feat(suikagame): add GameOverScene with score save and restart"
```

---

### Task 7: React 컴포넌트 + 페이지 + 레이아웃

**Files:**
- Create: `app/(phaser)/suikagame/_components/suikagame.tsx`
- Create: `app/(phaser)/suikagame/layout.tsx`
- Create: `app/(phaser)/suikagame/page.tsx`

**Step 1: suikagame.tsx 작성**

Phaser.Game 인스턴스를 생성하고 관리하는 컴포넌트. Matter.js 물리 엔진을 사용하고, Phaser.Scale.FIT으로 자동 스케일링한다.

```typescript
'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { useSession } from 'next-auth/react';
import { useCreateScore, useGameSession } from '@/service/scores';
import { GAME_META, GAME_WIDTH, GAME_HEIGHT, PHYSICS_CONFIG } from '../_lib/config';
import { TSuikaCallbacks } from '../_lib/types';
import { BootScene } from '../_lib/scenes/BootScene';
import { GameScene } from '../_lib/scenes/GameScene';
import { UIScene } from '../_lib/scenes/UIScene';
import { GameOverScene } from '../_lib/scenes/GameOverScene';

function SuikaGame() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore(GAME_META.id);
  const { mutateAsync: createSession } = useGameSession(GAME_META.id);
  const isLoggedIn = !!session;

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: '#1a1a2e',
      scene: [BootScene, GameScene, UIScene, GameOverScene],
      physics: {
        default: 'matter',
        matter: {
          gravity: PHYSICS_CONFIG.gravity,
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      input: {
        touch: { capture: true },
      },
    };

    gameRef.current = new Phaser.Game(config);

    const callbacks: TSuikaCallbacks = {
      onGameStart: async () => {
        try {
          const gameSession = await createSession();
          sessionTokenRef.current = gameSession.token;
        } catch (error) {
          console.error('Failed to create game session:', error);
        }
      },
      onScoreSave: async (score: number) => {
        if (!sessionTokenRef.current) return { saved: false };
        const result = await saveScore({
          gameType: GAME_META.id,
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
      isLoggedIn,
    };

    gameRef.current.registry.set('callbacks', callbacks);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [saveScore, createSession, isLoggedIn]);

  return (
    <div className="w-full h-full flex justify-center">
      <div
        ref={containerRef}
        className="w-full max-w-[480px] aspect-[480/720] border border-white/20 rounded-2xl shadow-lg overflow-hidden"
      />
    </div>
  );
}

export default SuikaGame;
```

**Step 2: layout.tsx 작성**

```typescript
import KameHeader from '@/components/common/KameHeader';

function SuikaGameLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-4 py-4 flex flex-col gap-6 items-center sm:px-6 sm:gap-10">
      <KameHeader title="수박 게임" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default SuikaGameLayout;
```

**Step 3: page.tsx 작성**

모바일: 햄버거 메뉴 (Sheet) + 게임. 데스크탑: 3칼럼 레이아웃.

```typescript
'use client';

import { Menu } from 'lucide-react';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';
import UserProfile from '@/components/auth/UserProfile';
import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useGetScores } from '@/service/scores';
import { GAME_META } from './_lib/config';

const SuikaGame = dynamic(() => import('./_components/suikagame'), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-[480/720] max-w-[480px] mx-auto flex items-center justify-center bg-[#1a1a2e] text-white rounded-2xl">
      Loading game...
    </div>
  ),
});

const controls = [
  { key: '← →', action: '집게 이동' },
  { key: 'SPACE / Click', action: '과일 드롭' },
  { key: 'R', action: '재시작' },
];

function SuikaGamePage() {
  const isMobile = useIsMobile();
  const { data: session } = useSession();
  const { data: scores = [], isLoading } = useGetScores(GAME_META.id);

  if (isMobile) {
    return (
      <section className="w-full h-full flex flex-col items-center">
        <div className="w-full flex justify-end px-2 pb-2">
          <Sheet>
            <SheetTrigger asChild>
              <button className="p-2 rounded-lg border border-arcade-border bg-arcade-surface text-arcade-text">
                <Menu size={20} />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="bg-arcade-bg border-arcade-border overflow-y-auto"
            >
              <SheetHeader>
                <SheetTitle className="text-arcade-text">Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-6 p-4">
                {session?.user ? (
                  <UserProfile user={session.user} />
                ) : (
                  <GoogleLoginButton />
                )}
                <ControlInfoTable controls={controls} />
                <RankBoard data={scores} isLoading={isLoading} showCountry />
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex-1 w-full">
          <SuikaGame />
        </div>
      </section>
    );
  }

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-72">
        <ControlInfoTable controls={controls} />
      </aside>
      <div className="flex-1 h-full max-w-[480px]">
        <SuikaGame />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default SuikaGamePage;
```

**Step 4: Commit**

```bash
git add app/(phaser)/suikagame/
git commit -m "feat(suikagame): add React component, page, and layout with mobile support"
```

---

### Task 8: 빌드 검증 및 플레이테스트

**Step 1: TypeScript 빌드 확인**

```bash
yarn build
```
Expected: 빌드 성공, 에러 없음

**Step 2: 개발 서버에서 플레이테스트**

```bash
yarn dev
```

브라우저에서 `/suikagame` 접속 후 확인:
- [ ] 과일 드롭이 정상 작동하는가
- [ ] 같은 과일끼리 합성이 되는가
- [ ] 점수가 올바르게 증가하는가
- [ ] 데드라인 초과 시 게임 오버가 되는가
- [ ] 게임 오버 후 R키/탭으로 재시작이 되는가
- [ ] 모바일 반응형이 작동하는가
- [ ] 메인 메뉴에서 수박 게임이 표시되는가

**Step 3: 문제가 발견되면 수정 후 커밋**

```bash
git add -A
git commit -m "fix(suikagame): [수정 내용]"
```

---

### Task 9: 최종 정리 및 커밋

**Step 1: 불필요한 console.log 제거, 코드 정리**

**Step 2: 최종 커밋**

```bash
git add -A
git commit -m "feat(suikagame): complete suika game implementation"
```
