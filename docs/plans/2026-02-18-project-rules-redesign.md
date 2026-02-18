# 프로젝트 규칙 재설계 디자인 문서

> 작성일: 2026-02-18
> 상태: 승인됨

## 배경

현재 프로젝트는 웹 Canvas 2D 기반 게임만 지원하고 있다. 테트리스, 무한의 계단, 길건너 친구들처럼 원래 모바일 게임이었던 게임들은 모바일에서도 플레이할 수 있어야 하고, Phaser.js 같은 게임 엔진을 사용하면 더 복잡한 게임도 만들 수 있다. 기존 46개 게임은 그대로 두고, 앞으로 만드는 게임에만 새 규칙을 적용한다.

## 핵심 결정 사항

| 항목 | 결정 |
|------|------|
| 모바일 지원 | PWA (홈 화면 추가, 전체 화면, 화면 방향, 기본 캐싱) |
| 엔진 | 선택적 Phaser.js + AI 추천 |
| 라우트 구조 | 3그룹: `(canvas)`, `(phaser)`, `(canvas-mobile)` |
| 메타데이터 | 각 config.ts에 `GAME_META` 객체 |
| 모바일 조작 | 게임별 커스텀 터치 UI |
| 모바일 레이아웃 | 게임 전체화면 + 햄버거 메뉴 |
| Phaser HUD | 별도 구현 (시각적 일관성 유지) |
| 난이도 | GAME_META에 difficulty 필드 |
| 사운드 | M키 음소거, 초기 음소거, 규격화된 파일 배치 |
| 디자인 철학 | 깔끔한 미니멀 디자인, 게임 로직과 스코어링에 집중 |
| 기존 게임 | 변경 없음 |

## 1. 디렉토리 구조

### 라우트 그룹 분리

```
app/
├── (canvas)/           # 기존 Canvas 2D 게임 (변경 없음)
│   ├── tetris/
│   ├── snake/
│   └── ...
│
├── (phaser)/           # Phaser.js 엔진 사용 게임
│   ├── layout.tsx      # Phaser 전용 공통 레이아웃
│   └── [게임명]/
│       ├── _lib/
│       │   ├── config.ts
│       │   ├── types.ts
│       │   └── scenes/
│       │       ├── BootScene.ts
│       │       ├── GameScene.ts
│       │       ├── GameOverScene.ts
│       │       └── UIScene.ts
│       ├── _components/
│       │   └── [게임명].tsx
│       ├── layout.tsx
│       └── page.tsx
│
├── (canvas-mobile)/    # Canvas 2D + 모바일 터치 지원 게임
│   ├── layout.tsx      # 모바일 반응형 공통 레이아웃
│   └── [게임명]/
│       ├── _lib/
│       │   ├── config.ts
│       │   ├── types.ts
│       │   └── game.ts
│       ├── _components/
│       │   └── [게임명].tsx
│       ├── layout.tsx
│       └── page.tsx
```

### 공통 라이브러리 추가

```
lib/
├── game/               # 기존 Canvas 2D HUD (변경 없음)
├── game-phaser/        # Phaser 전용 공통 라이브러리
│   ├── scenes/
│   │   ├── BaseGameOverScene.ts
│   │   ├── BaseUIScene.ts
│   │   └── BaseBootScene.ts
│   ├── utils/
│   │   ├── touchControls.ts
│   │   └── responsive.ts
│   └── index.ts
├── game/
│   └── touchControls.ts  # Canvas 2D 모바일용 터치 컨트롤
└── hooks/
    └── useMobileDetect.ts
```

## 2. GAME_META 키워드 시스템

각 게임의 `config.ts`에 메타데이터를 정의한다.

```typescript
export const GAME_META = {
  id: 'infinitestairs',
  title: '무한의 계단',
  engine: 'canvas' | 'phaser',
  platform: 'web' | 'mobile' | 'both',
  touchControls: 'swipe' | 'tap' | 'joystick' | 'drag' | 'none',
  orientation: 'portrait' | 'landscape' | 'any',
  category: 'arcade' | 'action' | 'puzzle' | 'reflex' | 'luck',
  difficulty: 'progressive' | 'fixed' | 'selectable',
} as const;
```

## 3. PWA 설정

### 포함 범위
- 홈 화면 추가 (Add to Home Screen)
- 전체 화면 모드 (`display: 'standalone'`)
- 화면 방향 잠금 (게임별 orientation 메타에 따라)
- 기본적인 오프라인 캐싱 (정적 에셋만)

### 제외 범위
- 오프라인 게임 플레이
- 푸시 알림
- 백그라운드 동기화

### 파일 구조
```
public/
├── manifest.json
├── sw.js
└── icons/
    ├── icon-192x192.png
    └── icon-512x512.png
```

## 4. 모바일 레이아웃

```
┌─────────────────────┐
│ ☰  게임 제목    ...  │  헤더 (햄버거 메뉴)
├─────────────────────┤
│                     │
│     게임 캔버스      │  전체 화면 활용 (자동 스케일링)
│                     │
├─────────────────────┤
│  [터치 컨트롤 영역]   │  게임별 커스텀 (선택적)
└─────────────────────┘

☰ 햄버거 메뉴:
├── 조작법 안내
├── 랭킹 보드
├── 홈으로 이동
└── 전체 화면 토글
```

데스크탑에서는 기존 3칼럼 레이아웃 유지.

## 5. 터치 컨트롤 타입

| 타입 | 설명 | 예시 게임 |
|------|------|----------|
| swipe | 상하좌우 스와이프 | 테트리스, 2048 |
| tap | 화면 탭 | 플래피버드, 점프 게임 |
| joystick | 가상 조이스틱 (원 안의 원) | Dodge, 이동 기반 게임 |
| drag | 드래그앤드롭 | 퍼즐, 슬라이딩 |
| none | 모바일 미지원 | 에임트레이너, 타이핑 |

## 6. Phaser 게임 구현 패턴

- Scene 분리: Boot, Game, UI, GameOver
- 공통 Base Scene 상속으로 점수 저장, HUD 로직 재사용
- `Phaser.Scale.FIT` + `CENTER_BOTH`로 자동 스케일링
- 터치 입력 캡처 활성화

시각적으로 기존 Canvas 2D HUD와 동일한 색상, 폰트, 레이아웃 패턴 유지.

## 7. AI 추천 시스템

### 엔진 선택 기준

Phaser 추천:
- 물리 엔진 필요 (중력, 반발, 가속도)
- 복잡한 충돌 감지 (다수 오브젝트 간)
- 스프라이트 애니메이션 다수
- 파티클 이펙트
- 타일맵 기반

Canvas 2D 추천:
- 그리드 기반 (2048, 지뢰찾기)
- 단순 타이머/반응 (타이핑)
- 카드/보드 게임
- 단순 움직임 (스네이크)

### 모바일 지원 기준

모바일 추천 (platform: 'both'):
- 원본이 모바일 게임
- 터치 조작이 자연스러운 게임 (탭, 스와이프)
- 가상 조이스틱으로 대체 가능한 게임 (방향 이동 기반)
- 세로 화면에 적합한 게임
- 간단한 입력 (1~2가지 조작)

웹 전용 추천 (platform: 'web'):
- 마우스 정밀 조작 필수 (정확한 좌표 클릭)
- 키보드 다중 동시 입력 + 마우스 병행
- 텍스트 입력 필요
- 가상 컨트롤러로 대체 불가능한 조작

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

## 8. 사운드 시스템

- 모든 게임에 음소거 토글 (M키) 포함
- 사운드 파일은 `public/sounds/[게임명]/`에 배치
- 초기 상태는 음소거 (사용자가 직접 켜도록)

## 9. 디자인 철학

- 깔끔하고 미니멀한 디자인 우선
- 화려한 그래픽보다 게임 로직과 스코어링 규칙에 집중
- 명확한 시각적 피드백 (점수 변화, 상태 전환)
- 일관된 색상 팔레트와 폰트 사용

## 10. 게임 등록 (기존과 동일)

새 게임 추가 시 6개 파일 수정 필수:
1. `@types/scores.ts` - TGameType 추가
2. `lib/config.ts` - MENU_LIST 추가
3. `components/common/GameCard.tsx` - 아이콘 추가
4. `app/api/game-session/route.ts` - VALID_GAME_TYPES 추가
5. `app/api/scores/route.ts` - VALID_GAME_TYPES 추가
6. `lib/game-security/config.ts` - 보안 설정 추가
