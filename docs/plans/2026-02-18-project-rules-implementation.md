# 프로젝트 규칙 재설계 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** CLAUDE.md 프로젝트 규칙을 재작성하여 PWA 모바일 지원, Phaser.js 엔진, AI 추천 시스템을 포함하는 새로운 게임 개발 규칙을 수립한다.

**Architecture:** 기존 Canvas 2D 게임 규칙을 유지하면서, (phaser)와 (canvas-mobile) 라우트 그룹에 대한 새 규칙을 추가한다. 각 게임의 config.ts에 GAME_META 메타데이터를 정의하고, AI가 새 게임 제작 시 엔진/플랫폼/터치 컨트롤을 추천하는 시스템을 규칙에 포함한다.

**Tech Stack:** Next.js, TypeScript, Phaser.js, Canvas 2D API, PWA (manifest.json, Service Worker)

**Design doc:** `docs/plans/2026-02-18-project-rules-redesign.md`

---

### Task 1: GAME_META 타입 정의 생성

**Files:**
- Create: `@types/game-meta.ts`

**Step 1: GAME_META 타입 파일 작성**

```typescript
// @types/game-meta.ts
export type TGameEngine = 'canvas' | 'phaser';

export type TGamePlatform = 'web' | 'mobile' | 'both';

export type TTouchControls = 'swipe' | 'tap' | 'joystick' | 'drag' | 'none';

export type TGameOrientation = 'portrait' | 'landscape' | 'any';

export type TGameCategory = 'arcade' | 'action' | 'puzzle' | 'reflex' | 'luck';

export type TGameDifficulty = 'progressive' | 'fixed' | 'selectable';

export type TGameMeta = {
  id: string;
  title: string;
  engine: TGameEngine;
  platform: TGamePlatform;
  touchControls: TTouchControls;
  orientation: TGameOrientation;
  category: TGameCategory;
  difficulty: TGameDifficulty;
};
```

**Step 2: 커밋**

```bash
git add @types/game-meta.ts
git commit -m "feat: add TGameMeta type definitions for game metadata system"
```

---

### Task 2: CLAUDE.md 재작성 - 공통 규칙 섹션

**Files:**
- Modify: `.claude/CLAUDE.md`

**Step 1: CLAUDE.md 전체를 새로운 구조로 재작성**

CLAUDE.md를 다음 구조로 완전히 재작성한다. 기존 내용(패키지 매니저, 키보드 이벤트) + 새로운 내용(디자인 철학, AI 추천, 게임 타입별 규칙)을 통합한다.

최상위 섹션 구조:
```
# 프로젝트 코딩 규칙
## 디자인 철학
## 패키지 매니저
## 키보드 이벤트 처리
## 네이밍 컨벤션
## 게임 타입 분류
## GAME_META 키워드 시스템
## 새 게임 생성 시 AI 추천 시스템
## 새 게임 생성 규칙 - Canvas 2D (기존)
## 새 게임 생성 규칙 - Canvas 2D + 모바일 (canvas-mobile)
## 새 게임 생성 규칙 - Phaser.js (phaser)
## 모바일 레이아웃
## 사운드 시스템
## PWA 설정
## 게임 등록 필수 수정 파일
```

**Step 2: 커밋**

```bash
git add .claude/CLAUDE.md
git commit -m "docs: rewrite CLAUDE.md with new project rules including mobile, phaser, and AI recommendation"
```

---

### Task 3: CLAUDE.md 작성 - 디자인 철학 + 공통 컨벤션

**Files:**
- Modify: `.claude/CLAUDE.md` (Task 2에서 이어서)

**내용:**

디자인 철학 섹션:
- 깔끔하고 미니멀한 디자인 우선
- 화려한 그래픽보다 게임 로직과 스코어링 규칙에 집중
- 명확한 시각적 피드백 (점수 변화, 상태 전환)
- 일관된 색상 팔레트와 폰트 사용

패키지 매니저: 기존 내용 유지 (Yarn 필수)
키보드 이벤트: 기존 내용 유지 (e.code 필수)
네이밍 컨벤션: 기존 내용 유지 (소문자 파일명, PascalCase 컴포넌트)

---

### Task 4: CLAUDE.md 작성 - 게임 타입 분류 + GAME_META

**내용:**

게임 타입 분류:

| 라우트 그룹 | 엔진 | 모바일 | 설명 |
|------------|------|--------|------|
| `(canvas)` | Canvas 2D | 미지원 | 기존 게임 (변경 없음) |
| `(canvas-mobile)` | Canvas 2D | 지원 | Canvas 2D + 터치 컨트롤 |
| `(phaser)` | Phaser.js | 지원/미지원 | Phaser 엔진 게임 |

GAME_META 시스템:
- `@types/game-meta.ts`의 TGameMeta 타입 참조
- 각 게임의 `_lib/config.ts` 상단에 `GAME_META` 정의 필수
- 모든 필드 필수 입력

---

### Task 5: CLAUDE.md 작성 - AI 추천 시스템

**내용:**

엔진 선택 기준:
- Phaser 추천: 물리 엔진, 복잡한 충돌, 스프라이트 애니메이션, 파티클, 타일맵
- Canvas 2D 추천: 그리드 기반, 타이머/반응, 카드/보드, 단순 움직임

모바일 지원 기준:
- 모바일 추천: 원본 모바일 게임, 터치 자연스러움, 가상 조이스틱 대체 가능, 세로 화면, 간단한 입력
- 웹 전용 추천: 마우스 정밀 조작, 키보드+마우스 병행, 텍스트 입력, 가상 컨트롤러 불가

추천 출력 형식 정의

---

### Task 6: CLAUDE.md 작성 - Canvas 2D 기존 게임 규칙

**내용:**

기존 `(canvas)` 규칙을 그대로 유지하되 "Canvas 2D (기존)" 섹션으로 명시:
- 디렉토리 구조
- 시작 전 필수 단계 (기존 게임 읽기)
- 파일별 구현 패턴 (page.tsx, layout.tsx, _components, _lib/game.ts, config.ts, types.ts)
- HUD 함수 사용법
- setup 함수 cleanup 반환 필수

---

### Task 7: CLAUDE.md 작성 - Canvas-Mobile 게임 규칙

**내용:**

`(canvas-mobile)` 라우트 그룹의 규칙:

디렉토리 구조:
```
app/(canvas-mobile)/[게임명]/
├── _lib/
│   ├── config.ts    # GAME_META + 게임 설정
│   ├── types.ts
│   └── game.ts      # 기존 Canvas 2D 패턴 + 터치 이벤트
├── _components/
│   └── [게임명].tsx  # useMobileDetect 사용, 조건부 레이아웃
├── layout.tsx
└── page.tsx          # 모바일: 햄버거 메뉴, 데스크탑: 3칼럼
```

Canvas 2D 기존 패턴과의 차이점:
- `GAME_META` 추가
- game.ts에 터치 이벤트 핸들러 추가
- page.tsx에 모바일 반응형 레이아웃
- 터치 컨트롤 타입별 구현 가이드 (swipe, tap, joystick, drag)

---

### Task 8: CLAUDE.md 작성 - Phaser 게임 규칙

**내용:**

`(phaser)` 라우트 그룹의 규칙:

디렉토리 구조:
```
app/(phaser)/[게임명]/
├── _lib/
│   ├── config.ts    # GAME_META + 게임 설정
│   ├── types.ts
│   └── scenes/
│       ├── BootScene.ts
│       ├── GameScene.ts
│       ├── GameOverScene.ts
│       └── UIScene.ts
├── _components/
│   └── [게임명].tsx  # Phaser.Game 인스턴스 관리
├── layout.tsx
└── page.tsx
```

시작 전 필수 단계:
- `lib/game-phaser/` 공통 라이브러리 읽기
- Base Scene 패턴 파악

Phaser 게임 컴포넌트 패턴:
- useRef로 Phaser.Game 관리
- useEffect에서 생성, cleanup에서 destroy
- Phaser.Scale.FIT + CENTER_BOTH
- touch input capture

Scene 구현 패턴:
- BootScene: 에셋 로딩 + 로딩 바
- GameScene: 메인 게임 로직
- UIScene: HUD (점수, 타이머)
- GameOverScene: 점수 저장 + 재시작

---

### Task 9: CLAUDE.md 작성 - 모바일 레이아웃 + 사운드 + PWA

**내용:**

모바일 레이아웃:
- 와이어프레임 (게임 전체화면 + 햄버거 메뉴)
- 데스크탑 3칼럼 유지
- 햄버거 메뉴 내용 (조작법, 랭킹, 홈, 전체화면 토글)

사운드 시스템:
- M키(KeyM) 음소거 토글
- `public/sounds/[게임명]/`에 배치
- 초기 상태 음소거

PWA 설정:
- manifest.json, sw.js, icons 구조
- 포함 범위 (홈 화면, 전체 화면, 화면 방향, 기본 캐싱)
- 제외 범위 (오프라인 플레이, 푸시 알림, 백그라운드 동기화)

---

### Task 10: CLAUDE.md 작성 - 게임 등록 + 최종 통합

**내용:**

게임 등록 필수 수정 파일 (기존 6개 동일):
1. `@types/scores.ts` - TGameType 추가
2. `lib/config.ts` - MENU_LIST 추가
3. `components/common/GameCard.tsx` - 아이콘 추가
4. `app/api/game-session/route.ts` - VALID_GAME_TYPES 추가
5. `app/api/scores/route.ts` - VALID_GAME_TYPES 추가
6. `lib/game-security/config.ts` - 보안 설정 추가

구조 변경 시 주의사항: 규칙 문서 동시 업데이트 필수

**Step: 최종 통합 후 전체 CLAUDE.md 재검토 및 커밋**

```bash
git add .claude/CLAUDE.md
git commit -m "docs: complete CLAUDE.md rewrite with mobile, phaser, and AI recommendation rules"
```

---

### Task 11: 최종 검증

**Step 1: CLAUDE.md 내용 검증**
- 모든 섹션이 빠짐없이 포함되었는지 확인
- 기존 Canvas 2D 규칙이 온전히 보존되었는지 확인
- 새로운 (phaser), (canvas-mobile) 규칙이 명확한지 확인
- AI 추천 시스템의 판단 기준이 모호하지 않은지 확인

**Step 2: 디자인 문서와 일치 검증**
- `docs/plans/2026-02-18-project-rules-redesign.md`의 결정 사항이 모두 반영되었는지 확인

**Step 3: 최종 커밋**

```bash
git add -A
git commit -m "docs: finalize project rules redesign"
```
