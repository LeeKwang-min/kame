# 프로젝트 코딩 규칙

## 디자인 철학

- 깔끔하고 미니멀한 디자인 우선
- 화려한 그래픽보다 **게임 로직과 스코어링 규칙에 집중**
- 명확한 시각적 피드백 (점수 변화, 상태 전환)
- 일관된 색상 팔레트와 폰트 사용

---

## 패키지 매니저

### Yarn 사용 필수

이 프로젝트에서는 **패키지 매니저로 반드시 Yarn을 사용**해야 합니다.

**올바른 예:**
```bash
yarn install
yarn add [패키지명]
yarn remove [패키지명]
yarn dev
```

**잘못된 예:**
```bash
npm install        # ❌ npm 사용 금지
npm install [패키지명]  # ❌ npm 사용 금지
```

**이유:**
- 프로젝트의 일관성 유지
- `yarn.lock` 파일을 통한 정확한 의존성 버전 관리
- 팀원 간 동일한 패키지 버전 보장

---

## 키보드 이벤트 처리

### `e.code` 사용 필수

키보드 이벤트 핸들러(`onKeyDown`, `onKeyUp`, `keydown`, `keyup` 등)에서는 **반드시 `e.code`를 사용**해야 합니다.

**올바른 예:**
```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'KeyS') {
    startGame();
  }
  if (e.code === 'KeyP') {
    pauseGame();
  }
};
```

**잘못된 예:**
```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 's') {  // ❌ e.key 사용 금지
    startGame();
  }
};
```

**이유:**
- `e.key`: 입력된 문자 값으로, 키보드 레이아웃(한글/영어 등)에 따라 달라짐
- `e.code`: 물리적 키 위치로, 키보드 레이아웃과 무관하게 일관된 동작 보장
- 게임 컨트롤에서는 특정 키 위치를 사용하는 것이 중요하므로 `e.code`가 필수

**주요 키 코드:**
- 문자 키: `KeyA`, `KeyB`, ..., `KeyZ`
- 숫자 키: `Digit0`, `Digit1`, ..., `Digit9`
- 화살표 키: `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`
- 기타: `Space`, `Enter`, `Escape`, `Shift`, `Control`, `Alt`

---

## 네이밍 컨벤션

- **파일명**: 모두 소문자, 단어 구분 없음 (예: `aimtrainer`, `fruitninja`)
- **컴포넌트명**: PascalCase (예: `AimTrainer`, `FruitNinja`)
- **타입명**: `T` 접두사 + PascalCase (예: `TGameMeta`, `TFruit`)

---

## 게임 타입 분류

3가지 라우트 그룹으로 게임을 분류한다.

| 라우트 그룹 | 엔진 | 모바일 지원 | 설명 |
|------------|------|-----------|------|
| `(canvas)` | Canvas 2D | 미지원 | 기존 게임 (변경 없음) |
| `(canvas-mobile)` | Canvas 2D | 지원 | Canvas 2D + 터치 컨트롤 |
| `(phaser)` | Phaser.js | 지원/미지원 | Phaser 엔진 게임 |

각 게임이 어떤 라우트 그룹에 속하는지는 `GAME_META`의 `engine`과 `platform` 필드로 결정된다.

- `engine: 'canvas'` + `platform: 'web'` → `(canvas)`
- `engine: 'canvas'` + `platform: 'both'` → `(canvas-mobile)`
- `engine: 'phaser'` → `(phaser)`

---

## GAME_META 키워드 시스템

모든 새 게임의 `_lib/config.ts` 상단에 `GAME_META` 객체 정의 필수. 타입은 `@types/game-meta.ts`의 `TGameMeta`를 참조한다.

```typescript
import { TGameMeta } from '@/@types/game-meta';

export const GAME_META: TGameMeta = {
  id: 'infinitestairs',
  title: '무한의 계단',
  engine: 'canvas',
  platform: 'both',
  touchControls: 'tap',
  orientation: 'portrait',
  category: 'action',
  difficulty: 'progressive',
};
```

### 필드 설명

- `id`: 게임 식별자 (소문자, 단어구분없음, `TGameType`과 동일)
- `title`: 표시 이름
- `engine`: 렌더링 엔진 (`'canvas'` | `'phaser'`)
- `platform`: 지원 플랫폼 (`'web'` | `'mobile'` | `'both'`)
- `touchControls`: 모바일 터치 조작 방식 (`'swipe'` | `'tap'` | `'joystick'` | `'drag'` | `'none'`)
- `orientation`: 권장 화면 방향 (`'portrait'` | `'landscape'` | `'any'`)
- `category`: 게임 카테고리 (`'arcade'` | `'action'` | `'puzzle'` | `'reflex'` | `'luck'`)
- `difficulty`: 난이도 방식 (`'progressive'` | `'fixed'` | `'selectable'`)

### 터치 컨트롤 타입별 설명

| 타입 | 설명 | 예시 게임 |
|------|------|----------|
| `swipe` | 상하좌우 스와이프 | 테트리스, 2048 |
| `tap` | 화면 탭 | 플래피버드, 점프 게임 |
| `joystick` | 가상 조이스틱 (원 안의 원) | Dodge, 이동 기반 게임 |
| `drag` | 드래그앤드롭 | 퍼즐, 슬라이딩 |
| `none` | 모바일 미지원 | 에임트레이너, 타이핑 |

---

## 새 게임 생성 시 AI 추천 시스템

새 게임 요청 시 구현 전에 반드시 아래 형식으로 분석/추천을 제공해야 한다.

### 엔진 선택 기준

**Phaser 추천 조건** (하나 이상 해당 시):
- 물리 엔진 필요 (중력, 반발, 가속도)
- 복잡한 충돌 감지 (다수 오브젝트 간)
- 스프라이트 애니메이션 다수
- 파티클 이펙트
- 타일맵 기반

**Canvas 2D 추천 조건**:
- 그리드 기반 (2048, 지뢰찾기, 넌퍼즐)
- 단순 타이머/반응 (타이핑, 에임트레이너)
- 카드/보드 게임 (하이로우, 슬롯)
- 단순 움직임 (스네이크, 테트리스)

### 모바일 지원 기준

**모바일 지원 추천** (`platform: 'both'`):
- 원본이 모바일 게임
- 터치 조작이 자연스러운 게임 (탭, 스와이프)
- 가상 조이스틱으로 대체 가능한 게임 (방향 이동 기반)
- 세로 화면에 적합한 게임
- 간단한 입력 (1~2가지 조작만 필요)

**웹 전용 추천** (`platform: 'web'`):
- 마우스 정밀 조작 필수 (정확한 좌표 클릭)
- 키보드 다중 동시 입력 + 마우스 병행 (WASD + 마우스 등)
- 텍스트 입력 필요 (타이핑 게임)
- 가상 컨트롤러로도 대체 불가능한 조작

### 추천 출력 형식

```
## 게임 분석: [게임명]

**엔진 추천: [Canvas 2D / Phaser]**
- 근거: [구체적 이유 2-3개]

**플랫폼 추천: [web / both]**
- 근거: [구체적 이유 2-3개]

**터치 컨트롤: [swipe / tap / joystick / drag / none]**
- 근거: [조작 방식 설명]

**화면 방향: [portrait / landscape / any]**
- 근거: [게임 화면 구성 설명]

**난이도: [progressive / fixed / selectable]**
- 근거: [난이도 설명]
```

---

## 새 게임 생성 규칙 - Canvas 2D (기존)

### 적용 대상

`(canvas)` 라우트 그룹의 기존 게임들. 기존 게임은 변경하지 않는다.

### 0. 시작하기 전 필수 단계

**새 게임을 작성하기 전에 반드시 다음 단계를 수행해야 합니다:**

1. **기존 게임의 `_lib/game.ts` 파일을 완전히 읽기**
   - 추천 참조 게임: `fruitninja` 또는 `aimtrainer`
   - 예: `app/(canvas)/fruitninja/_lib/game.ts`

2. **다음 패턴들을 정확히 파악하기**
   - HUD 함수 사용법:
     - `gameStartHud(canvas, ctx)` - canvas와 ctx를 모두 전달
     - `gameLoadingHud(canvas, ctx)` - canvas와 ctx를 모두 전달
     - `gamePauseHud(canvas, ctx)` - canvas와 ctx를 모두 전달
   - Game Over HUD 초기화:
     - `createGameOverHud(canvas, ctx, gameType, callbacks, options)` 형태로 초기화
     - 반환된 객체의 `render(score)` 메서드로 렌더링
     - 반환된 객체의 `onKeyDown(e, score)` 메서드로 키 입력 처리
     - 반환된 객체의 `reset()` 메서드로 재시작 시 초기화
   - 키보드 이벤트 처리:
     - `e.repeat` 체크
     - Game Over 상태에서는 `gameOverHud.onKeyDown()` 먼저 호출
     - `switch`문 또는 `if`문으로 키 처리
   - 게임 루프:
     - `timestamp`를 받아서 `dt` 계산
     - `update(dt)` -> `render()` 순서로 호출

3. **파악한 패턴을 그대로 따라서 작성**
   - 추측하지 말고 기존 게임의 코드를 정확히 복사하여 수정

**절대 하지 말아야 할 것:**
- 기존 게임을 읽지 않고 추측으로 작성
- HUD 함수의 매개변수를 임의로 변경
- `createGameOverHud`의 사용법을 추측

**이 단계를 건너뛰면 오류가 발생합니다!**

### 1. 디렉토리 구조

```
app/(canvas)/[게임명]/
├── _lib/
│   ├── config.ts      # 게임 설정 상수 (캔버스 크기, 게임 규칙 등)
│   ├── types.ts       # 타입 정의 (게임 객체, 상태 등)
│   └── game.ts        # 게임 로직 (setupGame 함수, 게임 루프 등)
├── _components/
│   └── [게임명].tsx   # 게임 컴포넌트 (canvas ref, 세션 관리)
├── layout.tsx         # 레이아웃 (KameHeader 포함)
└── page.tsx          # 페이지 (ControlInfoTable, RankBoard 포함)
```

### 2. 파일별 구현 패턴

#### page.tsx
```typescript
'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import [게임명] from './_components/[게임명]';

const controls = [
  { key: 'S', action: '시작 / 재개' },
  { key: 'P', action: '일시 정지' },
  { key: 'R', action: '재시작' },
  // 게임별 컨트롤 추가
];

function [게임명]Page() {
  const { data: scores = [], isLoading } = useGetScores('[게임명소문자]');

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-72">
        <ControlInfoTable controls={controls} />
      </aside>
      <div className="flex-1 h-full max-w-[캔버스너비px]">
        <[게임명] />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default [게임명]Page;
```

#### layout.tsx
```typescript
import KameHeader from '@/components/common/KameHeader';

function [게임명]Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-6 py-4 flex flex-col gap-10 items-center">
      <KameHeader title="[게임 제목]" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default [게임명]Layout;
```

#### _components/[게임명].tsx
```typescript
'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setup[게임명], T[게임명]Callbacks } from '../_lib/game';
import { useCreateScore, useGameSession } from '@/service/scores';

function [게임명]() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore('[게임명소문자]');
  const { mutateAsync: createSession } = useGameSession('[게임명소문자]');
  const isLoggedIn = !!session;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: T[게임명]Callbacks = {
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
          gameType: '[게임명소문자]',
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
      isLoggedIn,
    };

    return setup[게임명](canvas, callbacks);
  }, [saveScore, createSession, isLoggedIn]);

  return (
    <div className="w-full h-full flex justify-center">
      <canvas
        ref={canvasRef}
        className="w-[너비px] h-[높이px] border border-white/20 rounded-2xl shadow-lg"
      />
    </div>
  );
}

export default [게임명];
```

#### _lib/game.ts
```typescript
import {
  createGameOverHud,
  gameLoadingHud,
  gameStartHud,
  gamePauseHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import { /* config 상수들 */ } from './config';
import { /* 타입들 */ } from './types';

export type T[게임명]Callbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn: boolean;
};

export function setup[게임명](
  canvas: HTMLCanvasElement,
  callbacks: T[게임명]Callbacks
): () => void {
  const ctx = canvas.getContext('2d')!;
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // 게임 상태 변수들
  let state = 'start'; // 'start' | 'loading' | 'playing' | 'paused' | 'gameover'
  let animationId: number;

  // 키보드 이벤트 핸들러 (e.code 사용 필수!)
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'KeyS') { /* 시작/재개 */ }
    if (e.code === 'KeyP') { /* 일시정지 */ }
    if (e.code === 'KeyR') { /* 재시작 */ }
  };

  // 게임 루프
  function gameLoop(currentTime: number) {
    // 게임 로직 및 렌더링
    animationId = requestAnimationFrame(gameLoop);
  }

  // 이벤트 리스너 등록
  window.addEventListener('keydown', handleKeyDown);
  animationId = requestAnimationFrame(gameLoop);

  // cleanup 함수 (반드시 반환)
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    cancelAnimationFrame(animationId);
  };
}
```

#### _lib/config.ts
```typescript
// Canvas 설정
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// 게임 설정
export const GAME_DURATION = 30;
// 기타 게임별 상수들
```

#### _lib/types.ts
```typescript
// 게임 객체 타입 정의
export type TGameObject = {
  x: number;
  y: number;
  // 기타 속성들
};
```

### 3. 중요 규칙

- **구조 변경 금지**: 위 구조에서 벗어나지 않아야 함
- **키보드 이벤트**: 반드시 `e.code` 사용
- **cleanup 함수**: `setup[게임명]` 함수는 반드시 cleanup 함수를 반환해야 함
- **게임 등록**: 6개 파일 모두 수정해야 게임이 정상 작동함

---

## 새 게임 생성 규칙 - Canvas 2D + 모바일 (canvas-mobile)

### 적용 대상

`(canvas-mobile)` 라우트 그룹. Canvas 2D 엔진을 사용하면서 모바일 터치 컨트롤을 지원하는 게임.

### 0. 시작하기 전 필수 단계

Canvas 2D (기존) 규칙의 필수 단계를 동일하게 수행한 후, 추가로:

1. `hooks/useMobileDetect.ts` 훅 읽기
2. `lib/game/touchControls.ts` 터치 컨트롤 유틸 읽기
3. 기존 `(canvas-mobile)` 게임이 있다면 해당 게임의 패턴 읽기

### 1. 디렉토리 구조

```
app/(canvas-mobile)/[게임명]/
├── _lib/
│   ├── config.ts      # GAME_META + 게임 설정 상수
│   ├── types.ts       # 타입 정의
│   └── game.ts        # 게임 로직 (키보드 + 터치 이벤트 모두 처리)
├── _components/
│   └── [게임명].tsx   # 게임 컴포넌트 (useMobileDetect로 조건부 렌더링)
├── layout.tsx         # 레이아웃 (KameHeader 포함)
└── page.tsx          # 페이지 (모바일: 햄버거 메뉴, 데스크탑: 3칼럼)
```

### 2. Canvas 2D (기존)과의 차이점

#### config.ts에 GAME_META 추가
```typescript
import { TGameMeta } from '@/@types/game-meta';

export const GAME_META: TGameMeta = {
  id: '[게임명소문자]',
  title: '[게임 제목]',
  engine: 'canvas',
  platform: 'both',
  touchControls: '[swipe|tap|joystick|drag]',
  orientation: '[portrait|landscape|any]',
  category: '[arcade|action|puzzle|reflex|luck]',
  difficulty: '[progressive|fixed|selectable]',
};

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
```

#### game.ts에 터치 이벤트 추가

기존 Canvas 2D 패턴을 따르되, 키보드 이벤트와 함께 터치 이벤트도 등록:
```typescript
// 키보드 이벤트 (기존 패턴 그대로)
window.addEventListener('keydown', handleKeyDown);

// 터치 이벤트 추가
canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd);

// cleanup에 터치 이벤트도 제거
return () => {
  window.removeEventListener('keydown', handleKeyDown);
  canvas.removeEventListener('touchstart', handleTouchStart);
  canvas.removeEventListener('touchmove', handleTouchMove);
  canvas.removeEventListener('touchend', handleTouchEnd);
  cancelAnimationFrame(animationId);
};
```

#### page.tsx에 모바일 반응형 레이아웃
```typescript
'use client';

import { useMobileDetect } from '@/hooks/useMobileDetect';
import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import [게임명] from './_components/[게임명]';

function [게임명]Page() {
  const isMobile = useMobileDetect();
  const { data: scores = [], isLoading } = useGetScores('[게임명소문자]');

  if (isMobile) {
    return (
      <section className="w-full h-full flex flex-col">
        {/* 햄버거 메뉴로 ControlInfoTable, RankBoard 접근 */}
        <div className="flex-1">
          <[게임명] />
        </div>
      </section>
    );
  }

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-72">
        <ControlInfoTable controls={controls} />
      </aside>
      <div className="flex-1 h-full max-w-[캔버스너비px]">
        <[게임명] />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}
```

### 3. 모바일 레이아웃 와이어프레임

```
┌─────────────────────┐
│ ☰  게임 제목    ...  │  간소화된 헤더 (햄버거 메뉴)
├─────────────────────┤
│                     │
│     게임 캔버스      │  전체 화면 활용 (자동 스케일링)
│                     │
├─────────────────────┤
│  [터치 컨트롤 영역]   │  게임별 커스텀 (선택적)
└─────────────────────┘

☰ 햄버거 메뉴 내용:
├── 조작법 안내
├── 랭킹 보드
├── 홈으로 이동
└── 전체 화면 토글
```

데스크탑에서는 기존 3칼럼 레이아웃 유지.

---

## 새 게임 생성 규칙 - Phaser.js (phaser)

### 적용 대상

`(phaser)` 라우트 그룹. Phaser.js 엔진을 사용하는 게임.

### 0. 시작하기 전 필수 단계

1. `lib/game-phaser/` 공통 라이브러리를 완전히 읽기
2. Base Scene 패턴 파악 (`BaseBootScene`, `BaseUIScene`, `BaseGameOverScene`)
3. 기존 `(phaser)` 게임이 있다면 해당 게임의 패턴 읽기
4. 기존 Canvas 2D HUD의 시각적 스타일 파악 (색상, 폰트, 레이아웃)

### 1. 디렉토리 구조

```
app/(phaser)/[게임명]/
├── _lib/
│   ├── config.ts      # GAME_META + 게임 설정 상수
│   ├── types.ts       # 타입 정의
│   └── scenes/        # Phaser Scene 파일들
│       ├── BootScene.ts      # 에셋 로딩 + 로딩 바
│       ├── GameScene.ts      # 메인 게임 로직
│       ├── GameOverScene.ts  # 게임 오버 + 점수 저장
│       └── UIScene.ts        # HUD (점수, 타이머 등)
├── _components/
│   └── [게임명].tsx   # Phaser.Game 인스턴스 관리
├── layout.tsx         # 레이아웃 (KameHeader 포함)
└── page.tsx          # 페이지 (모바일 지원 시 반응형)
```

### 2. 파일별 구현 패턴

#### config.ts
```typescript
import { TGameMeta } from '@/@types/game-meta';

export const GAME_META: TGameMeta = {
  id: '[게임명소문자]',
  title: '[게임 제목]',
  engine: 'phaser',
  platform: '[web|both]',
  touchControls: '[swipe|tap|joystick|drag|none]',
  orientation: '[portrait|landscape|any]',
  category: '[arcade|action|puzzle|reflex|luck]',
  difficulty: '[progressive|fixed|selectable]',
};

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;
```

#### _components/[게임명].tsx
```typescript
'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { useSession } from 'next-auth/react';
import { useCreateScore, useGameSession } from '@/service/scores';
import { GAME_META, GAME_WIDTH, GAME_HEIGHT } from '../_lib/config';
import { BootScene } from '../_lib/scenes/BootScene';
import { GameScene } from '../_lib/scenes/GameScene';
import { UIScene } from '../_lib/scenes/UIScene';
import { GameOverScene } from '../_lib/scenes/GameOverScene';

function [게임명]() {
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
      scene: [BootScene, GameScene, UIScene, GameOverScene],
      physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 300 }, debug: false },
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

    // 콜백을 Phaser 레지스트리에 전달
    gameRef.current.registry.set('callbacks', {
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
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [saveScore, createSession, isLoggedIn]);

  return (
    <div className="w-full h-full flex justify-center">
      <div
        ref={containerRef}
        className="w-[GAME_WIDTHpx] h-[GAME_HEIGHTpx] border border-white/20 rounded-2xl shadow-lg overflow-hidden"
      />
    </div>
  );
}

export default [게임명];
```

#### Scene 구현 패턴

**BootScene.ts** - 에셋 로딩:
```typescript
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // 로딩 바 표시
    const { width, height } = this.cameras.main;
    const bar = this.add.rectangle(width / 2, height / 2, 0, 20, 0xffffff);
    this.load.on('progress', (value: number) => {
      bar.width = width * 0.6 * value;
    });

    // 에셋 로드
    // this.load.image('key', 'path');
  }

  create() {
    this.scene.start('GameScene');
    this.scene.launch('UIScene');
  }
}
```

**GameScene.ts** - 메인 게임 로직
**UIScene.ts** - HUD (기존 Canvas 2D HUD와 시각적 일관성 유지)
**GameOverScene.ts** - 점수 저장 (registry에서 callbacks 가져와 사용)

### 3. 중요 규칙

- `Phaser.Game` 인스턴스는 반드시 `useEffect` cleanup에서 `destroy`
- 콜백은 Phaser registry를 통해 Scene에 전달
- `Phaser.Scale.FIT` + `CENTER_BOTH`로 자동 스케일링
- `input.touch.capture: true`로 터치 입력 캡처
- HUD는 기존 Canvas 2D HUD와 시각적으로 동일한 색상, 폰트, 레이아웃 유지
- 키보드 이벤트는 Phaser의 `this.input.keyboard` 사용 (e.code 대신 Phaser 키 상수)

### 4. 공통 라이브러리 구조

```
lib/game-phaser/
├── scenes/
│   ├── BaseGameOverScene.ts   # 공통 게임오버 씬 (점수 저장 로직)
│   ├── BaseUIScene.ts         # 공통 HUD 씬 (점수, 타이머)
│   └── BaseBootScene.ts       # 공통 부팅 씬 (로딩 바)
├── utils/
│   ├── touchControls.ts       # 터치 컨트롤 헬퍼
│   └── responsive.ts          # 반응형 스케일링 유틸
└── index.ts
```

---

## 사운드 시스템

- 모든 게임에 음소거 토글 포함 (키보드: `KeyM`)
- 사운드 파일은 `public/sounds/[게임명]/`에 배치
- 초기 상태는 음소거 (사용자가 직접 활성화)
- Canvas 2D: Web Audio API 또는 `HTMLAudioElement` 사용
- Phaser: Phaser 내장 사운드 시스템 사용

---

## PWA 설정

### 파일 구조
```
public/
├── manifest.json       # PWA 매니페스트
├── sw.js               # Service Worker
└── icons/
    ├── icon-192x192.png
    └── icon-512x512.png
```

### 포함 범위
- 홈 화면 추가 (Add to Home Screen)
- 전체 화면 모드 (`display: 'standalone'`)
- 화면 방향 잠금 (게임별 `GAME_META.orientation`에 따라)
- 기본적인 오프라인 캐싱 (정적 에셋만)

### 제외 범위
- 오프라인 게임 플레이 (점수 저장에 서버 필요)
- 푸시 알림
- 백그라운드 동기화

---

## 게임 등록 필수 수정 파일

새 게임을 추가할 때 다음 **6개 파일을 반드시 수정**:

1. **`@types/scores.ts`** - `TGameType`에 게임명 추가
2. **`lib/config.ts`** - `MENU_LIST`에 게임 메뉴 추가
3. **`components/common/GameCard.tsx`** - 게임 아이콘 추가
4. **`app/api/game-session/route.ts`** - `VALID_GAME_TYPES`에 추가
5. **`app/api/scores/route.ts`** - `VALID_GAME_TYPES`에 추가
6. **`lib/game-security/config.ts`** - 보안 설정 추가

---

## 구조 변경 시 주의사항

이 규칙은 프로젝트의 실제 게임 구조를 반영한다.
게임 구조가 변경되면 **반드시 이 문서도 함께 업데이트**해야 한다.
