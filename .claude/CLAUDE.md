# 프로젝트 코딩 규칙

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

## 새 게임 생성 규칙

새로운 게임을 만들 때는 **반드시 기존 게임들의 구조를 동일하게 따라야** 합니다.

### 0. 시작하기 전 필수 단계 ⚠️

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
     - `update(dt)` → `render()` 순서로 호출

3. **파악한 패턴을 그대로 따라서 작성**
   - 추측하지 말고 기존 게임의 코드를 정확히 복사하여 수정

**❌ 절대 하지 말아야 할 것:**
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

### 2. 게임 등록 필수 수정 파일

새 게임을 추가할 때 다음 **6개 파일을 반드시 수정**:

1. **`@types/scores.ts`** - `TGameType`에 게임명 추가
2. **`lib/config.ts`** - `MENU_LIST`에 게임 메뉴 추가
3. **`components/common/GameCard.tsx`** - 게임 아이콘 추가
4. **`app/api/game-session/route.ts`** - `VALID_GAME_TYPES`에 추가
5. **`app/api/scores/route.ts`** - `VALID_GAME_TYPES`에 추가
6. **`lib/game-security/config.ts`** - 보안 설정 추가

### 3. 파일별 구현 패턴

#### **page.tsx**
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

#### **layout.tsx**
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

#### **_components/[게임명].tsx**
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

#### **_lib/game.ts**
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

#### **_lib/config.ts**
```typescript
// Canvas 설정
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// 게임 설정
export const GAME_DURATION = 30;
// 기타 게임별 상수들
```

#### **_lib/types.ts**
```typescript
// 게임 객체 타입 정의
export type TGameObject = {
  x: number;
  y: number;
  // 기타 속성들
};
```

### 4. 중요 규칙

- **구조 변경 금지**: 위 구조에서 벗어나지 않아야 함
- **파일명 규칙**: 모두 소문자, 단어 구분 없음 (예: `aimtrainer`, `fruitninja`)
- **컴포넌트명 규칙**: PascalCase (예: `AimTrainer`, `FruitNinja`)
- **키보드 이벤트**: 반드시 `e.code` 사용
- **cleanup 함수**: `setup[게임명]` 함수는 반드시 cleanup 함수를 반환해야 함
- **게임 등록**: 6개 파일 모두 수정해야 게임이 정상 작동함

### 5. 구조 변경 시 주의사항

**이 규칙은 프로젝트의 실제 게임 구조를 반영합니다.**
만약 게임 구조가 변경되면 **반드시 이 문서도 함께 업데이트**해야 합니다.
