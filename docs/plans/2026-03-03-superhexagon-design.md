# Super Hexagon Clone - Design Document

## Overview

Super Hexagon 클론 게임. 중앙 육각형 주위를 도는 플레이어가 좁아지는 벽 사이를 빠져나가며 생존하는 액션 게임.

## GAME_META

```typescript
{
  id: 'superhexagon',
  title: 'Super Hexagon',
  engine: 'canvas',
  platform: 'both',
  touchControls: 'tap',
  orientation: 'landscape',
  category: 'action',
  difficulty: 'progressive',
}
```

## Canvas & Layout

- **논리적 크기**: 800x500 (가로형, 기존 620x620과 다름)
- **데스크탑**: `scale(containerWidth / 800)` — 가로 방향 그대로
- **모바일**: `rotate(90deg) scale(...)` — 800px가 세로로, 500px가 가로로 → 가로모드 경험

### 모바일 CSS rotate 전략

```
데스크탑:                    모바일 (CSS rotate 90°):
┌──────────────────────┐    ┌──────────┐
│  ┌──800x500────────┐ │    │ ┌──────┐ │
│  │  Canvas          │ │    │ │Canvas│ │  ← 800px 세로
│  │  가로 그대로      │ │    │ │rotate│ │  ← 500px 가로
│  └─────────────────┘ │    │ │ 90°  │ │
└──────────────────────┘    │ └──────┘ │
                            └──────────┘
```

## Game Mechanics

### 좌표 시스템
모든 요소 극좌표(angle, distance) 기반:
- **플레이어**: `(playerAngle, PLAYER_DISTANCE=50)` — 각도만 변경
- **벽**: `(side, distance)` — 6면 중 위치 + 중심까지 거리 감소
- **중앙 헥사곤**: 고정 크기, 전체 맵과 함께 회전

### 벽 구조
```typescript
type TWall = {
  side: number;      // 0~5
  distance: number;  // 중심에서의 거리
  gap: number;       // 빈 공간
};
type TPattern = TWall[];
```

### 충돌 감지
플레이어 각도가 벽의 각도 범위에 있고 벽 distance ≈ PLAYER_DISTANCE이면 충돌 → 게임 오버

### Progressive 난이도

| 생존 시간 | 벽 속도 | 맵 회전 | 팔레트 |
|-----------|---------|---------|--------|
| 0~10초 | 150px/s | 0.5rad/s | Cyan |
| 10~20초 | 200px/s | 0.7rad/s | Magenta |
| 20~30초 | 250px/s | 0.9rad/s | Yellow |
| 30~45초 | 300px/s | 1.1rad/s | Green |
| 45초+ | 350px/s | 1.3rad/s | Red |

### 점수
생존 시간(초) × 100

## Controls

### 데스크탑
- **←/A**: 반시계 방향 회전
- **→/D**: 시계 방향 회전
- **S**: 시작/재개
- **P**: 일시정지
- **R**: 재시작

### 모바일
- **화면 왼쪽 터치**: 반시계 방향
- **화면 오른쪽 터치**: 시계 방향
- **터치로 시작/재개**

### 터치 좌표 변환
CSS rotate 90° 상태에서 getBoundingClientRect()가 반영하는 좌표를 이용하여 변환.

## Visual Style

- **네온/레트로**: 어두운 배경 + 네온 색상
- **배경**: 6등분 방사형 삼각형, 교차 색상
- **벽**: 밝은색/어두운색 교차 패턴
- **색상 순환**: 5단계 팔레트 (Cyan→Magenta→Yellow→Green→Red)
- **맵 회전**: 시계/반시계 주기적 전환
- **펄스**: 중앙 헥사곤 미세 맥동

## 벽 패턴

프리셋 10~15개를 랜덤 순서로 출현. 예시:
1. 한 면만 열린 단순 벽
2. 두 면 열린 반대편 벽
3. 나선형 (연속 회전 벽)
4. 좁은 통로 (인접 2면만 열림)
5. 지그재그 패턴

## Directory Structure

```
app/(canvas-mobile)/superhexagon/
├── _lib/
│   ├── config.ts
│   ├── types.ts
│   ├── patterns.ts
│   └── game.ts
├── _components/
│   └── SuperHexagon.tsx
├── layout.tsx
└── page.tsx
```

## 게임 등록 (6개 파일)

1. `@types/scores.ts` — TGameType에 'superhexagon' 추가
2. `lib/config.ts` — MENU_LIST에 메뉴 추가
3. `components/common/GameCard.tsx` — 아이콘 추가
4. `app/api/game-session/route.ts` — VALID_GAME_TYPES에 추가
5. `app/api/scores/route.ts` — VALID_GAME_TYPES에 추가
6. `lib/game-security/config.ts` — 보안 설정 추가
