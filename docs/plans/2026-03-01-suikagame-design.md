# 수박 게임 (Suika Game) 설계 문서

## 개요

수박 게임은 같은 종류의 과일 2개를 합쳐 한 단계 높은 과일을 만드는 물리 퍼즐 게임이다. 집게로 과일을 떨어뜨리면 중력에 의해 바구니에 쌓이고, 동일한 과일끼리 접촉하면 합성되어 더 큰 과일이 된다. 최종 목표는 수박을 만드는 것.

## 기술 스택

- **엔진**: Phaser.js 3.90 + Matter.js (Phaser 내장)
- **라우트 그룹**: `(phaser)` — Phaser 엔진 게임
- **플랫폼**: both (모바일 + 데스크탑)

## GAME_META

```typescript
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
```

## 과일 시스템

11단계 과일, 삼각수 점수 체계:

| 단계 | 과일 | 반지름 | 색상 | 합성 점수 | 드롭 가능 |
|------|------|--------|------|----------|----------|
| 0 | 체리 | 15 | #E74C3C | 1 | O |
| 1 | 딸기 | 20 | #FF6B6B | 3 | O |
| 2 | 포도 | 28 | #9B59B6 | 6 | O |
| 3 | 한라봉 | 35 | #F39C12 | 10 | O |
| 4 | 감 | 42 | #E67E22 | 15 | O |
| 5 | 사과 | 50 | #E74C3C | 21 | X |
| 6 | 배 | 58 | #F1C40F | 28 | X |
| 7 | 복숭아 | 66 | #FFB6C1 | 36 | X |
| 8 | 파인애플 | 75 | #F1C40F | 45 | X |
| 9 | 멜론 | 85 | #2ECC71 | 55 | X |
| 10 | 수박 | 95 | #27AE60 | 66 | X |

- 드롭 가능 과일: 0~4단계 (체리 ~ 감) 랜덤 선택
- 수박 + 수박 합성 시 66점 획득 후 소멸

## 그래픽 (확장 가능 설계)

- 1차: 단색 원 + 이모지/텍스트
- `FRUIT_CONFIG` 배열에 `texture` 필드를 두어, 에셋 추가 시 이미지로 교체 가능
- BootScene에서 에셋 유무를 확인하여 자동 전환

## 조작법

**데스크탑:**
- 마우스 좌우 이동: 집게 위치 설정
- 클릭: 과일 드롭
- 키보드 좌우 화살표: 집게 이동 (대체)
- Space: 드롭 (대체)

**모바일:**
- 터치 좌우 드래그: 집게 위치 설정
- 탭: 과일 드롭

**공통:**
- S: 게임 시작
- P: 일시정지
- R: 재시작
- M: 음소거 토글

## 게임 오버 조건

- 과일이 상단 경계선(데드라인)을 약 2초 이상 초과하면 게임 오버
- 합성 반동으로 순간적으로 넘는 것은 허용 (유예 시간)

## Scene 구조

```
BootScene → GameScene + UIScene → GameOverScene
```

- **BootScene**: 로딩 바, 에셋 로드
- **GameScene**: Matter.js 물리, 과일 드롭/합성/게임오버 로직
- **UIScene**: 점수 표시, 다음 과일 미리보기, 데드라인 표시
- **GameOverScene**: 최종 점수, SAVE/SKIP 선택, 재시작

## 게임 화면 레이아웃

```
┌──────────────────────┐
│  Score: 1234         │  UIScene (오버레이)
│  Next: [🍇]          │
├──────────────────────┤
│      ▼ (집게)        │  드롭 위치 가이드라인
│  - - - - - - - - - - │  데드라인
│                      │
│   🍒  🍇             │  바구니 영역
│  🍊 🍎 🍒 🍇         │  (Matter.js 물리)
│ 🍊 🍒 🍇 🍎 🍓       │
└──────────────────────┘
```

## 디렉토리 구조

```
app/(phaser)/suikagame/
├── _lib/
│   ├── config.ts          # GAME_META + FRUIT_CONFIG + 게임 상수
│   ├── types.ts           # 타입 정의
│   └── scenes/
│       ├── BootScene.ts
│       ├── GameScene.ts
│       ├── UIScene.ts
│       └── GameOverScene.ts
├── _components/
│   └── suikagame.tsx      # Phaser.Game 인스턴스 관리
├── layout.tsx
└── page.tsx               # 모바일 햄버거 메뉴 + 데스크탑 3칼럼
```

## 게임 등록 파일 수정 (6개)

1. `@types/scores.ts` — TGameType에 `'suikagame'` 추가
2. `lib/config.ts` — MENU_LIST puzzle 카테고리에 추가
3. `components/common/GameCard.tsx` — 아이콘 추가
4. `app/api/game-session/route.ts` — VALID_GAME_TYPES에 추가
5. `app/api/scores/route.ts` — VALID_GAME_TYPES에 추가
6. `lib/game-security/config.ts` — 보안 설정 추가

## 보안 설정

```typescript
suikagame: { maxScore: 10000, minPlayTimeSeconds: 10 }
```
